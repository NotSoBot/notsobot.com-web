// Bot owners only: the download identities, an account on a site plus the one proxy it's always used through
// (notsobot.api `utilities/tools/identities`). Every identity at once (there are only around a hundred), refreshed every
// few seconds since leases and cooldowns change all the time. Cookies only ever go in, the api never sends them back.
// A saved login (for signing in again to export new cookies) and the proxy's password can be revealed, the api writes
// down every reveal. The proxies themselves are managed on the Proxies page (`OwnerProxiesPage`).

import { ArrowRightLeft, EyeOff, Fingerprint, KeyRound, Network, Pause, Pencil, Play, Plus, Power, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminIdentities, Identity, IdentityLogin, IdentityService, IdentityStatus } from '@/lib/api';
import {
  errorMessage,
  useAdminIdentitiesQuery,
  useClearIdentityLoginMutation,
  useCreateIdentityMutation,
  useDeleteIdentityMutation,
  usePatchIdentityMutation,
  useResumeIdentityServiceMutation,
  useRevealIdentityLoginMutation,
  useBulkIdentityCookiesMutation,
  useSetIdentityLoginMutation,
  useSyncIdentitiesMutation,
} from '@/lib/api/dashboardQueries';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Field, Skeleton } from '../ui';
import { Chip, DetailList, ExactDate, FiltersButton, Hint, InfoTip, StatTile, useSearchParamState } from './adminUi';
import { AuditHistory, LabelChips, ProxyCredentials, ProxyPicker, REVEAL_MS, SecretValue, ago, formatSpan, proxyLabel, useNow } from './identitiesUi';
import { ProxiesTab } from './ProxiesTab';


const TABS = [
  {id: 'identities', label: 'Identities'},
  {id: 'proxies', label: 'Proxies'},
] as const;
type TabId = (typeof TABS)[number]['id'];

const STATUS_TONES: Record<IdentityStatus, 'success' | 'danger' | 'neutral' | 'warning'> = {
  active: 'success',
  dead: 'danger',
  disabled: 'neutral',
  pending: 'warning',
};

const STATUS_LABELS: Record<IdentityStatus, string> = {
  active: 'Active',
  dead: 'Dead',
  disabled: 'Disabled',
  pending: 'Needs cookies',
};

// never leased or rate limited, every request picks one of their proxies at random
const SHARED_SERVICES = new Set(['global', 'strict']);

const SHARED_TEXT: Record<string, string> = {
  global: 'The general proxy: every request without an identity picks one of these at random, no cooldown or rate limit.',
  strict: 'For sites strict about ips (tiktok, reddit, facebook, instagram): their requests pick one of these at random, global when there are none.',
};

// a service whose identities are accounts, which need their own cookies
function needsCookies(service: IdentityService | undefined): boolean {
  return service?.kind === 'cookies' && !service.secret_optional;
}

// `global` (the general proxy) then `strict` first, then alphabetical, numbers in names compared as numbers
// (youtube:2 before youtube:10)
const SERVICE_ORDER: Record<string, number> = {global: 0, strict: 1};

function globalFirst(a: string, aService: string, b: string, bService: string): number {
  return (SERVICE_ORDER[aService] ?? 2) - (SERVICE_ORDER[bService] ?? 2) || a.localeCompare(b, undefined, {numeric: true});
}

// what a service's identities carry besides their ip, next to its name on the card
function kindLabel(service: IdentityService): string {
  if (service.shared) {
    return 'random ip';
  }
  if (service.kind === 'none') {
    return 'ip only';
  }
  return (service.secret_optional) ? 'earned cookies' : 'account cookies';
}

function kindText(service: IdentityService): string {
  if (service.shared) {
    return `No account and no cookies. ${SHARED_TEXT[service.service] ?? 'Requests pick one of these proxies at random.'}`;
  }
  if (service.kind === 'none') {
    return 'No account and no cookies, just the ip, rate limited per proxy.';
  }
  if (service.secret_optional) {
    return 'Each identity keeps the cookies a solved captcha earned on its ip and reuses them. A block drops them, the next solve earns new ones.';
  }
  return 'Each identity is a signed-in account: its cookies are uploaded, and it isn’t used until it has them.';
}

// where an identity's name came from, the names are made up by whatever added it
function nameOrigin(identity: Identity): string {
  const name = identity.id.split(':').slice(1).join(':');
  const manifest = name.match(/^(\d{3})\.(.+)$/);
  if (manifest) {
    return `Imported from the old cookie manifest: entry #${manifest[1]}, the file named after the account ${manifest[2]}.`;
  }
  if (/-\d+(-\d+)?$/.test(name)) {
    return 'Named after its proxy’s address (host-port), from assigning the proxy to the service.';
  }
  return 'The name it was given when it was added.';
}

// a stat tile with an instant tooltip (the native `title` is slow and gives a help cursor). the tiles in a row are as
// tall as the tallest, and a label stays on one line (cut off rather than making its tile taller)
function Tile({ text, children }: {text: string, children: ReactNode}) {
  return <Hint text={text} className='block h-full'>{children}</Hint>;
}

const TILE = 'h-full [&>p:first-child]:truncate';


interface IdentityState {
  label: string,
  tone: 'neutral' | 'danger' | 'warning' | 'success' | 'brand',
  title: string,
}

// what's stopping it from being used right now, if anything, in the order the api checks
function identityState(identity: Identity, now: number): IdentityState {
  if (identity.status === 'dead') {
    return {label: 'Dead', tone: 'danger', title: 'Out of rotation until it gets new cookies'};
  }
  if (identity.status === 'disabled') {
    return {label: 'Disabled', tone: 'neutral', title: 'Turned off by an owner'};
  }
  if (identity.status === 'pending') {
    return {label: 'Needs cookies', tone: 'warning', title: 'Assigned to the service, used once it gets an account’s cookies (Upload cookies)'};
  }
  if (identity.proxy.status === 'disabled') {
    return {label: 'Proxy off', tone: 'neutral', title: 'Its proxy is disabled'};
  }
  if (SHARED_SERVICES.has(identity.service)) {
    return {label: 'Shared', tone: 'success', title: 'Picked at random by any request, never rate limited'};
  }
  if (identity.leased_ms) {
    return {label: 'In use', tone: 'brand', title: `A download has it, for ${formatSpan(identity.leased_ms)} at most`};
  }
  if (!identity.in_pool) {
    return {label: 'Waiting for sync', tone: 'warning', title: 'Not in the rotation yet, the next sync (within a minute) adds it'};
  }
  if (identity.proxy.down) {
    return {label: 'Proxy down', tone: 'warning', title: 'Its proxy refused connections, everything on it waits a couple of minutes'};
  }
  if (identity.next_at && now < identity.next_at) {
    const left = formatSpan(identity.next_at - now);
    return (identity.streak)
      ? {label: `Benched ${left}`, tone: 'warning', title: `Flagged ${identity.streak} time${(identity.streak === 1) ? '' : 's'} in a row, each one benches it longer`}
      : {label: `Cooldown ${left}`, tone: 'neutral', title: 'Resting between uses'};
  }
  return {label: 'Ready', tone: 'success', title: 'Next in line when a download needs one'};
}


// one page, two tabs (`?tab=proxies`), both from the same `GET /admin/identities`
export function OwnerIdentitiesPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const toast = useToast();
  const now = useNow();
  const tabsId = useId();
  const { data, isPending, isError, error, refetch, isRefetching } = useAdminIdentitiesQuery();
  const sync = useSyncIdentitiesMutation();
  const tabParam = searchParams.get('tab');
  const tab: TabId = (TABS.some((item) => item.id === tabParam)) ? tabParam as TabId : 'identities';

  // each tab has its own filters, switching starts the other one clean
  const setTab = (value: TabId) => setSearchParams((value === 'identities') ? {} : {tab: value}, {replace: true, preventScrollReset: true});
  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = TABS[(TABS.findIndex((item) => item.id === tab) + 1) % TABS.length].id;
      setTab(next);
      document.getElementById(`${tabsId}-${next}`)?.focus();
    }
  };

  return (
    <>
      <DashboardHeader
        title='Identities'
        description='The accounts the api signs in with and the proxies they’re used through. A proxy can be in any number of services.'
      >
        <button
          type='button'
          className='btn btn-secondary'
          disabled={sync.isPending}
          title='Saves what downloads changed and reloads everything from the database, instead of within a minute'
          onClick={() => sync.mutate(undefined, {
            onSuccess: (result) => toast(`Synced ${result.identities.toLocaleString()} identities`),
            onError: (syncError) => toast(errorMessage(syncError, 'Couldn’t sync.')),
          })}
        >
          {(sync.isPending) ? <Spinner className='size-4'/> : <RefreshCw className='size-4'/>}
          Sync now
        </button>
      </DashboardHeader>

      <div role='tablist' aria-label='Identities sections' onKeyDown={onTabKeyDown} className='mb-5 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-line)]'>
        {TABS.map((item) => {
          const count = (item.id === 'identities') ? data?.identities.length : data?.proxies.length;
          return (
            <button
              key={item.id}
              id={`${tabsId}-${item.id}`}
              type='button'
              role='tab'
              aria-selected={tab === item.id}
              aria-controls={`${tabsId}-${item.id}-panel`}
              tabIndex={(tab === item.id) ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
                (tab === item.id) ? 'border-brand text-white' : 'border-transparent text-muted hover:text-white',
              )}
            >
              {item.label}
              {(count !== undefined) ? <span className='text-xs text-subtle tabular-nums'>{count.toLocaleString()}</span> : null}
            </button>
          );
        })}
      </div>

      <div id={`${tabsId}-${tab}-panel`} role='tabpanel' aria-labelledby={`${tabsId}-${tab}`}>
        {(isPending) ? (
          <PageSkeleton/>
        ) : (isError && !data) ? (
          <ErrorPanel title='Couldn’t load identities' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
        ) : (!data) ? null : (tab === 'proxies') ? (
          <ProxiesTab data={data}/>
        ) : (
          <IdentitiesTab data={data} now={now} onShowProxies={() => setTab('proxies')}/>
        )}
      </div>
    </>
  );
}


function IdentitiesTab({ data, now, onShowProxies }: {data: AdminIdentities, now: number, onShowProxies: () => void}) {
  const { searchParams, update } = useSearchParamState();
  const status = searchParams.get('status') || '';
  const query = searchParams.get('q') || '';
  const service = searchParams.get('service') || '';
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const [ dialog, setDialog ] = useState<'add' | 'cookies' | null>(null);
  const [ openId, setOpenId ] = useState<string | null>(null);
  const activeFilters = [status, service].filter(Boolean).length;
  const pendingCount = data.identities.filter((identity) => identity.status === 'pending').length;

  const identities = useMemo(() => {
    const text = query.trim().toLowerCase();
    return data.identities.filter((identity) => (
      (!status || identity.status === status) &&
      (!service || identity.service === service) &&
      (!text || identity.id.toLowerCase().includes(text) || proxyLabel(identity.proxy).toLowerCase().includes(text))
    )).sort((a, b) => globalFirst(a.id, a.service, b.id, b.service));
  }, [data, status, service, query]);
  const services = useMemo(() => [...data.services].sort((a, b) => globalFirst(a.service, a.service, b.service, b.service)), [data.services]);
  const open = data.identities.find((identity) => identity.id === openId) ?? null;

  return (
    <>
      <div className='mb-6 grid gap-4 md:grid-cols-2'>
        {services.map((item) => (
          <ServiceCard
            key={item.service}
            service={item}
            selected={service === item.service}
            // the same card again clears it
            onSelect={() => update({service: (service === item.service) ? null : item.service})}
          />
        ))}
      </div>

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by name, ip or username...'
          aria-label='Search identities'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='identity-filters'/>
        <button type='button' className='btn btn-secondary shrink-0' onClick={() => setDialog('cookies')} title='Cookie files for many identities at once, like the ones waiting for theirs'>
          <Upload className='size-4'/>
          <span className='max-sm:sr-only'>Upload cookies</span>
          {(pendingCount) ? <span className='rounded bg-warning/20 px-1.5 text-xs text-warning tabular-nums'>{pendingCount}</span> : null}
        </button>
        <button type='button' className='btn btn-primary shrink-0' onClick={() => setDialog('add')}>
          <Plus className='size-4'/>
          <span className='max-sm:sr-only'>Add identity</span>
        </button>
      </div>

      <div id='identity-filters' hidden={!filtersOpen} className='card mb-4 p-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Service
            <select className='input w-36' value={service} onChange={(event) => update({service: event.target.value})}>
              <option value=''>Any</option>
              {data.services.map((item) => <option key={item.service} value={item.service}>{item.service}</option>)}
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Status
            <select className='input w-40' value={status} onChange={(event) => update({status: event.target.value})}>
              <option value=''>Any</option>
              {(Object.keys(STATUS_LABELS) as Array<IdentityStatus>).map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
          </label>
        </div>
      </div>

      {(!data.identities.length) ? (
        <EmptyState icon={<Fingerprint className='size-10'/>} title='No identities yet'>
          Add proxies on the <button type='button' className='cursor-pointer text-brand hover:underline' onClick={onShowProxies}>Proxies tab</button> and
          assign them to services, or add an account on one of them here.
        </EmptyState>
      ) : (!identities.length) ? (
        <EmptyState icon={<Fingerprint className='size-10'/>} title='No identities match'>Try a different search or filter.</EmptyState>
      ) : (
        <ul className='card divide-y divide-line'>
          {identities.map((identity) => (
            <IdentityRow key={identity.id} identity={identity} now={now} onOpen={() => setOpenId(identity.id)}/>
          ))}
        </ul>
      )}

      {(dialog === 'add') ? <AddIdentityDialog data={data} onShowProxies={onShowProxies} onClose={() => setDialog(null)} onAdded={(identity) => setOpenId(identity.id)}/> : null}
      {(dialog === 'cookies') ? <UploadCookiesDialog data={data} onClose={() => setDialog(null)}/> : null}
      {(open) ? <IdentityModal identity={open} data={data} now={now} onClose={() => setOpenId(null)}/> : null}
    </>
  );
}


// clicking anywhere on it filters the list to its identities (the name is the keyboard way)
function ServiceCard({ service, selected, onSelect }: {service: IdentityService, selected: boolean, onSelect: () => void}) {
  const toast = useToast();
  const resume = useResumeIdentityServiceMutation();
  const total = service.counts.active + service.counts.dead + service.counts.disabled + service.counts.pending;
  const totalText = (Object.keys(STATUS_LABELS) as Array<IdentityStatus>)
    .map((status) => `${service.counts[status].toLocaleString()} ${STATUS_LABELS[status].toLowerCase()}`)
    .join(', ');

  return (
    <section
      className={cn(
        'card cursor-pointer p-4 transition-colors hover:border-brand/60 sm:p-5',
        selected && 'border-brand ring-1 ring-brand',
      )}
      aria-label={`${service.service} identities`}
      onClick={onSelect}
    >
      <div className='flex items-center gap-2'>
        <h2 className='text-base font-semibold text-white capitalize'>
          <button
            type='button'
            aria-pressed={selected}
            className='cursor-pointer rounded capitalize hover:underline focus-visible:outline-2 focus-visible:outline-brand'
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            {service.service}
          </button>
        </h2>
        <Hint text={kindText(service)}><span className='text-xs text-subtle'>{kindLabel(service)}</span></Hint>
        {(service.paused_for) ? <Chip tone='danger' className='ml-auto'>Paused</Chip> : null}
      </div>

      {(service.paused_for) ? (
        <div className='mt-3 flex items-center gap-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
          <Pause aria-hidden className='size-4 shrink-0 text-danger'/>
          <p className='flex-1'>
            {service.flagged_recently.toLocaleString()} got flagged within a few minutes, so nothing uses {service.service} for
            another {formatSpan(service.paused_for * 1000)}. It’s usually the proxy provider being flagged, not each account.
          </p>
          <button
            type='button'
            className='btn btn-secondary btn-sm shrink-0'
            disabled={resume.isPending}
            onClick={(event) => {
              // the card behind it filters the list
              event.stopPropagation();
              resume.mutate(service.service, {
                onSuccess: () => toast(`Resumed ${service.service}`),
                onError: (resumeError) => toast(errorMessage(resumeError, 'Couldn’t resume.')),
              });
            }}
          >
            <Play className='size-4'/>
            Resume
          </button>
        </div>
      ) : null}

      {(service.shared) ? (
        <>
          <div className='mt-3 grid grid-cols-2 gap-2'>
            <Tile text='Active proxies requests pick from at random'><StatTile className={TILE} label='In use' value={service.pool.toLocaleString()} tone='text-[#6fd391]'/></Tile>
            <Tile text={totalText}><StatTile className={TILE} label='Total' value={total.toLocaleString()}/></Tile>
          </div>
          <p className='mt-3 text-xs text-subtle'>
            {SHARED_TEXT[service.service] ?? 'Every request for it picks one of these at random, no cooldown or rate limit.'}
            {(!service.pool) ? <span className='text-warning'> {(service.service === 'strict') ? 'Empty, so those sites use global.' : 'Empty, so those requests are refused.'}</span> : null}
          </p>
        </>
      ) : (
      <>
      <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <Tile text='Can be used this second: in the rotation, not in use and not resting'><StatTile className={TILE} label='Ready' value={service.available.toLocaleString()} tone='text-[#6fd391]'/></Tile>
        <Tile text='Active identities on a working proxy, ready or resting between uses'><StatTile className={TILE} label='In rotation' value={service.pool.toLocaleString()}/></Tile>
        {(needsCookies(service)) ? (
          <Tile text='Waiting for an account’s cookies: assigned to the service but not used until Upload cookies gives them theirs'><StatTile className={TILE} label='No cookies' value={service.counts.pending.toLocaleString()} tone='text-warning'/></Tile>
        ) : (
          <Tile text='Flagged too often to be used, they need new cookies'><StatTile className={TILE} label='Dead' value={service.counts.dead.toLocaleString()} tone='text-[#ff8a8c]'/></Tile>
        )}
        <Tile text={totalText}><StatTile className={TILE} label='Total' value={total.toLocaleString()}/></Tile>
      </div>
      <p className='mt-3 text-xs text-subtle'>
        Each one rests {formatSpan(service.cooldown * 1000)} between uses. A flag benches it for{' '}
        {service.backoff.map((seconds) => formatSpan(seconds * 1000)).join(', then ')}
        {(service.kind === 'none') ? '. There’s no account, just the ip.' : (service.secret_optional) ? (
          '. Its cookies come from captcha solves on that ip, a flag drops them.'
        ) : <>; {service.cookie_strikes} account failures in a row kill it.</>}
      </p>
      </>
      )}
    </section>
  );
}


function IdentityRow({ identity, now, onOpen }: {identity: Identity, now: number, onOpen: () => void}) {
  const state = identityState(identity, now);
  return (
    <li>
      <button
        type='button'
        className='flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:px-5'
        onClick={onOpen}
      >
        <span className='min-w-0 flex-1 basis-48 truncate font-mono text-sm text-white'>{identity.id}</span>
        <Hint text={state.title}><Chip tone={state.tone}>{state.label}</Chip></Hint>
        <span className='w-36 shrink-0 truncate font-mono text-xs text-muted tabular-nums'>{proxyLabel(identity.proxy)}</span>
        <span className='w-32 shrink-0 text-xs text-subtle max-sm:hidden'>ok {ago(identity.last_ok, now)}</span>
        <span className='min-w-0 basis-full truncate text-xs text-subtle sm:basis-64 sm:flex-1'>
          {(identity.last_error) ? <>{ago(identity.last_error_at, now)}: {identity.last_error}</> : null}
        </span>
      </button>
    </li>
  );
}


function IdentityModal({ identity, data, now, onClose }: {identity: Identity, data: AdminIdentities, now: number, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const patch = usePatchIdentityMutation();
  const remove = useDeleteIdentityMutation();
  const [ panel, setPanel ] = useState<'cookies' | 'move' | null>(null);
  const [ deleting, setDeleting ] = useState(false);
  const state = identityState(identity, now);
  const policy = data.services.find((item) => item.service === identity.service);
  const busy = patch.isPending || remove.isPending;

  const setStatus = (status: IdentityStatus, message: string) => patch.mutate({identityId: identity.id, body: {status}}, {
    onSuccess: () => toast(message),
  });

  return (
    <Modal labelledBy={titleId} onClose={() => !busy && onClose()} className='max-w-xl'>
      <div className='p-5 sm:p-6'>
        <div className='flex flex-wrap items-center gap-2 pr-10'>
          <h2 id={titleId} className='font-mono text-lg font-semibold text-white'>{identity.id}</h2>
          <Chip tone={STATUS_TONES[identity.status]}>{STATUS_LABELS[identity.status]}</Chip>
          {(identity.status === 'active') ? <Hint text={state.title}><Chip tone={state.tone}>{state.label}</Chip></Hint> : null}
        </div>

        <DetailList
          className='mt-4'
          items={[
            ['Proxy', (
              <span className='inline-flex flex-wrap items-center gap-1.5'>
                <span className='font-mono'>{proxyLabel(identity.proxy)}</span>
                {(identity.proxy.exit_ip) ? <span className='text-subtle'>({identity.proxy.exit_ip})</span> : null}
                {(identity.proxy.down) ? <Chip tone='warning'>Down</Chip> : null}
                {(identity.proxy.status === 'disabled') ? <Chip>Disabled</Chip> : null}
                <LabelChips labels={identity.proxy.labels}/>
              </span>
            )],
            ['Last success', (identity.last_ok) ? <ExactDate value={identity.last_ok} format={() => ago(identity.last_ok, now)}/> : 'never'],
            ['Last error', (identity.last_error) ? (
              <span>
                <span className='break-words'>{identity.last_error}</span>
                {(identity.last_error_at) ? <span className='text-subtle'> · <ExactDate value={identity.last_error_at} format={() => ago(identity.last_error_at, now)}/></span> : null}
              </span>
            ) : '—'],
            ['Name', (
              <span className='inline-flex items-center gap-1.5'>
                <span className='font-mono'>{identity.id.split(':').slice(1).join(':')}</span>
                <InfoTip text={nameOrigin(identity)}/>
              </span>
            )],
            (identity.service !== 'global') && ['IP flags in a row', (
              <span className='inline-flex items-center gap-1.5'>
                <span className={cn('tabular-nums', (identity.streak) ? 'text-warning' : '')}>{identity.streak.toLocaleString()}</span>
                <span className='text-subtle'>
                  {(policy && identity.streak) ? `benched ${formatSpan(policy.backoff[Math.min(identity.streak - 1, policy.backoff.length - 1)] * 1000)} last time` : 'none since its last success'}
                </span>
                <InfoTip text={`Times in a row the site blocked its ip (a bot check, 429 or 403). Each one benches it longer${(policy) ? `: ${policy.backoff.map((seconds) => formatSpan(seconds * 1000)).join(', then ')}` : ''}. A success resets it.`}/>
              </span>
            )],
            (needsCookies(policy)) && ['Account failures', (
              <span className='inline-flex items-center gap-1.5'>
                <span className={cn('tabular-nums', (identity.strikes) ? 'text-warning' : '')}>{identity.strikes.toLocaleString()} of {(policy?.cookie_strikes ?? 3).toLocaleString()}</span>
                <InfoTip text={`Times in a row the account itself looked signed out (no formats, “content isn’t available”). At ${policy?.cookie_strikes ?? 3} it’s marked dead and needs new cookies. A success resets it.`}/>
              </span>
            )],
            (identity.kind !== 'none') && ['Cookies', (identity.has_secret) ? (
              <span>
                Saved{(identity.secret_updated) ? <> · refreshed <ExactDate value={identity.secret_updated} format={() => ago(identity.secret_updated, now)}/></> : null}
              </span>
            ) : 'None'],
            (identity.kind !== 'none') && ['Login', (identity.has_login) ? (
              <span>
                Saved{(identity.login_updated) ? <> · <ExactDate value={identity.login_updated} format={() => ago(identity.login_updated, now)}/></> : null}
              </span>
            ) : 'None'],
            ['Added', (identity.created) ? <ExactDate value={identity.created}/> : '—'],
          ]}
        />

        <section className='mt-5 rounded-md border border-line bg-deep p-4' aria-label='Proxy'>
          <div className='mb-2 flex items-center gap-2'>
            <Network aria-hidden className='size-4 text-subtle'/>
            <h3 className='text-sm font-semibold text-white'>Proxy</h3>
            <InfoTip text='The ip this identity always uses. Revealing the password is written down like a login reveal.'/>
          </div>
          <ProxyCredentials key={identity.proxy.id} proxy={identity.proxy} now={now}/>
        </section>

        {(identity.kind !== 'none') ? <LoginSection key={identity.id} identity={identity} now={now}/> : null}

        {(panel === 'cookies') ? (
          <ReplaceCookiesForm identity={identity} onDone={() => setPanel(null)}/>
        ) : (panel === 'move') ? (
          <MoveIdentityForm identity={identity} data={data} onDone={() => setPanel(null)}/>
        ) : null}

        {(patch.isError && !panel) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(patch.error, 'Couldn’t update the identity.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-wrap gap-2'>
          {(identity.kind !== 'none') ? (
            <button type='button' className='btn btn-secondary btn-sm' disabled={busy} onClick={() => setPanel((panel === 'cookies') ? null : 'cookies')}>
              <Upload className='size-4'/>
              {(identity.status === 'dead') ? 'New cookies (revive)' : 'Replace cookies'}
            </button>
          ) : null}
          {(identity.status === 'disabled') ? (
            <button type='button' className='btn btn-secondary btn-sm' disabled={busy} onClick={() => setStatus('active', `Enabled ${identity.id}`)}>
              <Power className='size-4'/>
              Enable
            </button>
          ) : (identity.status === 'active') ? (
            <button type='button' className='btn btn-secondary btn-sm' disabled={busy} onClick={() => setStatus('disabled', `Disabled ${identity.id}`)}>
              <Power className='size-4'/>
              Disable
            </button>
          ) : null}
          <button type='button' className='btn btn-secondary btn-sm' disabled={busy} onClick={() => setPanel((panel === 'move') ? null : 'move')}>
            <ArrowRightLeft className='size-4'/>
            Move to another proxy
          </button>
          <button
            type='button'
            className='btn btn-sm ml-auto border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
            disabled={busy}
            onClick={() => setDeleting(true)}
          >
            <Trash2 className='size-4'/>
            Delete
          </button>
        </div>
      </div>

      {(deleting) ? (
        <ConfirmDialog
          title={`Delete ${identity.id}?`}
          description='Its cookies are deleted too, there’s no way to get them back. Its proxy stays, free for another account.'
          confirmLabel='Delete identity'
          confirmPhrase={identity.id}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the identity.') : null}
          onConfirm={() => remove.mutate(identity.id, {
            onSuccess: () => {
              toast(`Deleted ${identity.id}`);
              setDeleting(false);
              onClose();
            },
          })}
          onClose={() => {
            remove.reset();
            setDeleting(false);
          }}
        />
      ) : null}
    </Modal>
  );
}


// the identity's saved login: reveal it (audited, hidden again after 30s), save a new one or remove it
function LoginSection({ identity, now }: {identity: Identity, now: number}) {
  const toast = useToast();
  const reveal = useRevealIdentityLoginMutation();
  const clear = useClearIdentityLoginMutation();
  const [ editing, setEditing ] = useState(false);
  const [ removing, setRemoving ] = useState(false);
  const [ shownUntil, setShownUntil ] = useState(0);
  const revealed = (reveal.data && now < shownUntil) ? reveal.data : null;

  // forget it once it's hidden, the password shouldn't sit around in memory
  const { reset } = reveal;
  useEffect(() => {
    if (reveal.data && shownUntil <= now) {
      reset();
    }
  }, [reveal.data, shownUntil, now, reset]);

  const hide = () => {
    setShownUntil(0);
    reset();
  };

  return (
    <section className='mt-5 rounded-md border border-line bg-deep p-4' aria-label='Saved login'>
      <div className='flex flex-wrap items-center gap-2'>
        <KeyRound aria-hidden className='size-4 text-subtle'/>
        <h3 className='text-sm font-semibold text-white'>Login</h3>
        <InfoTip text='The account’s login, for signing in again (through this identity’s proxy) to export new cookies. Only owners can reveal it, and every reveal is written down.'/>
        <div className='ml-auto flex flex-wrap gap-2'>
          {(identity.has_login && !revealed) ? (
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              disabled={reveal.isPending}
              onClick={() => reveal.mutate(identity.id, {onSuccess: () => setShownUntil(Date.now() + REVEAL_MS)})}
            >
              {(reveal.isPending) ? <Spinner className='size-4'/> : <KeyRound className='size-4'/>}
              Reveal
            </button>
          ) : null}
          {(revealed) ? (
            <button type='button' className='btn btn-secondary btn-sm' onClick={hide}>
              <EyeOff className='size-4'/>
              Hide ({formatSpan(Math.min(shownUntil - now, REVEAL_MS))})
            </button>
          ) : null}
          {(!editing) ? (
            <button type='button' className='btn btn-secondary btn-sm' onClick={() => setEditing(true)}>
              {(identity.has_login) ? <Pencil className='size-4'/> : <Plus className='size-4'/>}
              {(identity.has_login) ? 'Replace' : 'Add login'}
            </button>
          ) : null}
          {(identity.has_login) ? (
            <button type='button' className='btn btn-ghost btn-sm text-danger' onClick={() => setRemoving(true)}>Remove</button>
          ) : null}
        </div>
      </div>

      {(reveal.isError) ? <p role='alert' className='mt-3 text-sm text-danger'>{errorMessage(reveal.error, 'Couldn’t reveal the login.')}</p> : null}

      {(revealed) ? (
        <div className='mt-3'>
          <DetailList
            items={[
              ['Username', <SecretValue key='u' value={revealed.login.username}/>],
              ['Password', <SecretValue key='p' value={revealed.login.password}/>],
              (!!revealed.login.recovery_email) && ['Recovery email', <SecretValue key='r' value={revealed.login.recovery_email ?? ''}/>],
              (!!revealed.login.channel_email) && ['Channel email', <SecretValue key='ce' value={revealed.login.channel_email ?? ''}/>],
              (!!revealed.login.channel_url) && ['Channel', (
                <a key='c' className='break-all text-brand hover:underline' href={revealed.login.channel_url ?? undefined} target='_blank' rel='noreferrer noopener'>
                  {revealed.login.channel_url}
                </a>
              )],
              (!!revealed.login.notes) && ['Notes', revealed.login.notes],
            ]}
          />
          <p className='mt-3 text-xs text-subtle'>
            Sign in through {proxyLabel(identity.proxy)}, the same ip the cookies are used from.
          </p>
          <AuditHistory history={revealed.history} now={now}/>
        </div>
      ) : (!identity.has_login && !editing) ? (
        <p className='mt-2 text-xs text-subtle'>No login saved. Add one so new cookies can be exported without looking it up elsewhere.</p>
      ) : null}

      {(editing) ? (
        <LoginForm
          identity={identity}
          initial={revealed?.login ?? null}
          onDone={(saved) => {
            setEditing(false);
            if (saved) {
              hide();
            }
          }}
        />
      ) : null}

      {(removing) ? (
        <ConfirmDialog
          title={`Remove ${identity.id}’s login?`}
          description='The saved username and password are deleted. The cookies and the identity stay as they are.'
          confirmLabel='Remove login'
          pending={clear.isPending}
          error={(clear.isError) ? errorMessage(clear.error, 'Couldn’t remove the login.') : null}
          onConfirm={() => clear.mutate(identity.id, {
            onSuccess: () => {
              toast(`Removed ${identity.id}’s login`);
              hide();
              setRemoving(false);
            },
          })}
          onClose={() => {
            clear.reset();
            setRemoving(false);
          }}
        />
      ) : null}
    </section>
  );
}


export const EMPTY_LOGIN: IdentityLogin = {username: '', password: '', recovery_email: '', channel_email: '', channel_url: '', notes: ''};

// trimmed, empty optional fields left out (null), the password as typed
function cleanLogin(login: IdentityLogin): IdentityLogin {
  return {
    username: login.username.trim(),
    password: login.password,
    recovery_email: login.recovery_email?.trim() || null,
    channel_email: login.channel_email?.trim() || null,
    channel_url: login.channel_url?.trim() || null,
    notes: login.notes?.trim() || null,
  };
}

function LoginFields({ login, onChange, disabled }: {login: IdentityLogin, onChange: (login: IdentityLogin) => void, disabled?: boolean}) {
  const update = (field: keyof IdentityLogin) => (event: {target: {value: string}}) => onChange({...login, [field]: event.target.value});
  return (
    <>
      <div className='grid gap-3 sm:grid-cols-2'>
        <Field label='Username'>
          {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' value={login.username} onChange={update('username')} disabled={disabled}/>}
        </Field>
        <Field label='Password'>
          {(props) => <input {...props} {...NO_AUTOFILL} type='password' className='input font-mono' value={login.password} onChange={update('password')} disabled={disabled}/>}
        </Field>
        <Field label={<>Recovery email <span className='font-normal text-subtle'>(optional)</span></>}>
          {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' value={login.recovery_email ?? ''} onChange={update('recovery_email')} disabled={disabled}/>}
        </Field>
        <Field label={<>Channel email <span className='font-normal text-subtle'>(optional)</span></>}>
          {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' value={login.channel_email ?? ''} onChange={update('channel_email')} disabled={disabled}/>}
        </Field>
        <Field label={<>Channel link <span className='font-normal text-subtle'>(optional)</span></>}>
          {(props) => <input {...props} {...NO_AUTOFILL} className='input' placeholder='https://www.youtube.com/channel/…' value={login.channel_url ?? ''} onChange={update('channel_url')} disabled={disabled}/>}
        </Field>
      </div>
      <Field className='mt-3' label={<>Notes <span className='font-normal text-subtle'>(optional)</span></>}>
        {(props) => <input {...props} {...NO_AUTOFILL} className='input' value={login.notes ?? ''} onChange={update('notes')} disabled={disabled}/>}
      </Field>
    </>
  );
}


function LoginForm({ identity, initial, onDone }: {identity: Identity, initial: IdentityLogin | null, onDone: (saved: boolean) => void}) {
  const toast = useToast();
  const save = useSetIdentityLoginMutation();
  const [ login, setLogin ] = useState<IdentityLogin>(() => ({...EMPTY_LOGIN, ...initial}));
  const valid = !!login.username.trim() && !!login.password;

  return (
    <form
      className='mt-4 border-t border-line pt-4'
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !save.isPending) {
          save.mutate({identityId: identity.id, login: cleanLogin(login)}, {
            onSuccess: () => {
              toast(`Saved ${identity.id}’s login`);
              onDone(true);
            },
          });
        }
      }}
    >
      <LoginFields login={login} onChange={setLogin} disabled={save.isPending}/>
      {(save.isError) ? <p role='alert' className='mt-3 text-sm text-danger'>{errorMessage(save.error, 'Couldn’t save the login.')}</p> : null}
      <div className='mt-4 flex justify-end gap-2'>
        <button type='button' className='btn btn-secondary btn-sm' onClick={() => onDone(false)} disabled={save.isPending}>Cancel</button>
        <button type='submit' className='btn btn-primary btn-sm' disabled={save.isPending || !valid}>
          {(save.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
          Save login
        </button>
      </div>
    </form>
  );
}


// a cookies.txt or a json export, from a file or pasted. the api converts json and checks there are cookies for the service
function CookiesField({ value, onChange, disabled, hint, optional }: {
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
  hint?: ReactNode,
  optional?: boolean,
}) {
  const input = useRef<HTMLInputElement>(null);
  const [ fileName, setFileName ] = useState<string | null>(null);
  return (
    <Field
      className='mt-4'
      label={(optional) ? <>Cookies <span className='font-normal text-subtle'>(optional)</span></> : 'Cookies'}
      hint={hint ?? 'A cookies.txt or a cookie JSON export (Cookie-Editor, EditThisCookie), from a browser signed in through this identity’s proxy.'}
    >
      {(props) => (
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <button type='button' className='btn btn-secondary btn-sm' disabled={disabled} onClick={() => input.current?.click()}>
              <Upload className='size-4'/>
              Choose file
            </button>
            <span className='min-w-0 truncate text-xs text-subtle'>{fileName ?? 'or paste it below'}</span>
            <input
              ref={input}
              type='file'
              accept='.txt,.json,text/plain,application/json'
              className='hidden'
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) {
                  setFileName(file.name);
                  onChange(await file.text());
                }
              }}
            />
          </div>
          <textarea
            {...props}
            {...NO_AUTOFILL}
            className='input h-28 resize-y font-mono text-xs'
            spellCheck={false}
            placeholder='# Netscape HTTP Cookie File, or [{"domain": ".youtube.com", "name": …}]'
            value={value}
            disabled={disabled}
            onChange={(event) => {
              setFileName(null);
              onChange(event.target.value);
            }}
          />
        </div>
      )}
    </Field>
  );
}


function ReplaceCookiesForm({ identity, onDone }: {identity: Identity, onDone: () => void}) {
  const toast = useToast();
  const patch = usePatchIdentityMutation();
  const [ cookies, setCookies ] = useState('');
  return (
    <form
      className='mt-5 rounded-md border border-line bg-deep p-4'
      onSubmit={(event) => {
        event.preventDefault();
        if (cookies.trim() && !patch.isPending) {
          patch.mutate({identityId: identity.id, body: {cookies}}, {
            onSuccess: (updated) => {
              toast((identity.status === 'dead' && updated.status === 'active') ? `Revived ${identity.id}` : `Replaced ${identity.id}’s cookies`);
              onDone();
            },
          });
        }
      }}
    >
      <h3 className='text-sm font-semibold text-white'>{(identity.status === 'dead') ? 'Revive with new cookies' : 'Replace cookies'}</h3>
      <CookiesField value={cookies} onChange={setCookies} disabled={patch.isPending}/>
      {(patch.isError) ? <p role='alert' className='mt-3 text-sm text-danger'>{errorMessage(patch.error, 'Couldn’t replace the cookies.')}</p> : null}
      <div className='mt-4 flex justify-end gap-2'>
        <button type='button' className='btn btn-secondary btn-sm' onClick={onDone} disabled={patch.isPending}>Cancel</button>
        <button type='submit' className='btn btn-primary btn-sm' disabled={patch.isPending || !cookies.trim()}>
          {(patch.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
          Save cookies
        </button>
      </div>
    </form>
  );
}


function MoveIdentityForm({ identity, data, onDone }: {identity: Identity, data: AdminIdentities, onDone: () => void}) {
  const toast = useToast();
  const patch = usePatchIdentityMutation();
  const [ proxyId, setProxyId ] = useState<number | null>(null);
  const target = data.proxies.find((proxy) => proxy.id === proxyId);
  const valid = !!target && target.id !== identity.proxy.id;

  return (
    <form
      className='mt-5 rounded-md border border-warning/40 bg-warning/5 p-4'
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && target && !patch.isPending) {
          patch.mutate({identityId: identity.id, body: {proxy_id: target.id}}, {
            onSuccess: () => {
              toast(`Moved ${identity.id} to ${proxyLabel(target)}`);
              onDone();
            },
          });
        }
      }}
    >
      <h3 className='text-sm font-semibold text-white'>Move to another proxy</h3>
      <p className='mt-1 mb-3 text-xs text-muted'>
        Only for a proxy that’s gone for good. The account then signs in from a new ip, which sites can flag; new cookies
        exported through the new proxy are safest.
      </p>
      <ProxyPicker
        proxies={data.proxies.filter((proxy) => proxy.id !== identity.proxy.id)}
        service={identity.service}
        ignoreIdentityId={identity.id}
        value={proxyId}
        onChange={setProxyId}
        disabled={patch.isPending}
      />
      {(patch.isError) ? <p role='alert' className='mt-3 text-sm text-danger'>{errorMessage(patch.error, 'Couldn’t move the identity.')}</p> : null}
      <div className='mt-4 flex justify-end gap-2'>
        <button type='button' className='btn btn-secondary btn-sm' onClick={onDone} disabled={patch.isPending}>Cancel</button>
        <button type='submit' className='btn btn-primary btn-sm' disabled={patch.isPending || !valid}>
          {(patch.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
          Move
        </button>
      </div>
    </form>
  );
}


// one account on one of the proxies, with its cookies and (optionally) its login. a service without accounts (global,
// geopy) works here too, though assigning on the Proxies page does many at once
function AddIdentityDialog({ data, onShowProxies, onClose, onAdded }: {
  data: AdminIdentities,
  onShowProxies: () => void,
  onClose: () => void,
  onAdded: (identity: Identity) => void,
}) {
  const titleId = useId();
  const toast = useToast();
  const create = useCreateIdentityMutation();
  const [ service, setService ] = useState(data.services.find((item) => item.service === 'youtube')?.service ?? data.services[0]?.service ?? '');
  const [ name, setName ] = useState('');
  const [ proxyId, setProxyId ] = useState<number | null>(null);
  const [ cookies, setCookies ] = useState('');
  const [ withLogin, setWithLogin ] = useState(false);
  const [ login, setLogin ] = useState<IdentityLogin>(EMPTY_LOGIN);
  const [ startDisabled, setStartDisabled ] = useState(false);

  const policy = data.services.find((item) => item.service === service);
  const validName = /^[^:\s]{1,48}$/.test(name.trim());
  const exists = data.identities.some((other) => other.id === `${service}:${name.trim()}`);
  const proxy = data.proxies.find((item) => item.id === proxyId);
  const taken = proxy?.identities.find((identity) => identity.service === service);
  // kind none has no secret, and google's jar is earned from captcha solves, so it's only optional there
  const takesCookies = policy?.kind === 'cookies';
  const needsCookies = takesCookies && !policy?.secret_optional;
  const validLogin = !withLogin || (!!login.username.trim() && !!login.password);
  const valid = !!service && validName && !!proxy && !taken && !exists && (!needsCookies || !!cookies.trim()) && validLogin;

  return (
    <Modal labelledBy={titleId} onClose={() => !create.isPending && onClose()} className='max-w-xl'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && proxy && !create.isPending) {
            create.mutate({
              service,
              name: name.trim(),
              proxy_id: proxy.id,
              cookies: (takesCookies && cookies.trim()) ? cookies : undefined,
              status: (startDisabled) ? 'disabled' : 'active',
              login: (withLogin && takesCookies) ? cleanLogin(login) : undefined,
            }, {
              onSuccess: (identity) => {
                toast(`Added ${identity.id}`);
                onClose();
                onAdded(identity);
              },
            });
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Add identity</h2>
        <p className='mt-2 text-sm text-muted'>One account, always used through the proxy you pick. Only one account per service on a proxy.</p>

        {(!data.proxies.length) ? (
          <p role='alert' className='mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
            There are no proxies yet, add them on the <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => { onClose(); onShowProxies(); }}>Proxies tab</button> first.
          </p>
        ) : null}

        <div className='mt-4 grid grid-cols-2 gap-3'>
          <Field label='Service'>
            {(props) => (
              <select {...props} className='input capitalize' value={service} onChange={(event) => setService(event.target.value)} disabled={create.isPending}>
                {data.services.map((item) => <option key={item.service} value={item.service}>{item.service}</option>)}
              </select>
            )}
          </Field>
          <Field label='Name' hint={(service) ? `Saved as ${service}:${name.trim() || '…'}` : undefined} error={(name && !validName) ? 'No spaces or “:”, at most 48.' : (exists) ? 'That one exists already.' : undefined}>
            {(props) => (
              <input {...props} {...NO_AUTOFILL} className='input font-mono' value={name} placeholder='101' onChange={(event) => setName(event.target.value)} disabled={create.isPending}/>
            )}
          </Field>
        </div>

        <div className='mt-4'>
          <p className='mb-1.5 text-sm font-medium text-fg'>Proxy</p>
          <ProxyPicker proxies={data.proxies} service={service} value={proxyId} onChange={setProxyId} disabled={create.isPending}/>
        </div>

        {(takesCookies) ? (
          <CookiesField
            value={cookies}
            onChange={setCookies}
            disabled={create.isPending}
            optional={!needsCookies}
            hint={(needsCookies) ? undefined : 'It earns its own from captcha solves on this proxy, leave it empty unless you have a jar from this ip.'}
          />
        ) : null}

        {(takesCookies) ? (
          <div className='mt-4 rounded-md border border-line bg-deep p-4'>
            <label className='flex items-center gap-2 text-sm text-fg'>
              <input type='checkbox' checked={withLogin} onChange={(event) => setWithLogin(event.target.checked)} disabled={create.isPending}/>
              Save the account’s login too
            </label>
            {(withLogin) ? <div className='mt-3'><LoginFields login={login} onChange={setLogin} disabled={create.isPending}/></div> : null}
          </div>
        ) : null}

        <label className='mt-4 flex items-center gap-2 text-sm text-muted'>
          <input type='checkbox' checked={startDisabled} onChange={(event) => setStartDisabled(event.target.checked)} disabled={create.isPending}/>
          Add it disabled (a spare, turned on later)
        </label>

        {(create.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(create.error, 'Couldn’t add the identity.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={create.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={create.isPending || !valid}>
            {(create.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Add identity
          </button>
        </div>
      </form>
    </Modal>
  );
}


// cookie files for many identities at once: they go to the ones waiting for cookies (or any of a service) in order,
// files sorted by name, so naming them 001.txt, 002.txt... decides which goes where. previewed before anything is sent
function UploadCookiesDialog({ data, onClose }: {data: AdminIdentities, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const upload = useBulkIdentityCookiesMutation();
  const input = useRef<HTMLInputElement>(null);
  const services = data.services.filter((item) => item.kind === 'cookies');
  const [ service, setService ] = useState(services.find((item) => needsCookies(item))?.service ?? services[0]?.service ?? '');
  const [ onlyPending, setOnlyPending ] = useState(true);
  const [ files, setFiles ] = useState<Array<{name: string, text: string}>>([]);

  const targets = data.identities
    .filter((identity) => identity.service === service && (!onlyPending || identity.status === 'pending'))
    .sort((a, b) => a.id.localeCompare(b.id));
  const pairs = files.slice(0, targets.length).map((file, index) => ({file, identity: targets[index]}));
  const results = new Map((upload.data ?? []).map((result) => [result.identity_id, result]));

  return (
    <Modal labelledBy={titleId} onClose={() => !upload.isPending && onClose()} className='max-w-2xl'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Upload cookies</h2>
        <p className='mt-2 text-sm text-muted'>
          Pick the cookie files (cookies.txt or json exports). Sorted by file name, the first goes to the first identity
          below and so on. Each must be exported from a browser signed in through that identity’s proxy.
        </p>

        <div className='mt-4 flex flex-wrap items-end gap-3'>
          <Field label='Service'>
            {(props) => (
              <select {...props} className='input w-36' value={service} onChange={(event) => { setService(event.target.value); upload.reset(); }} disabled={upload.isPending}>
                {services.map((item) => <option key={item.service} value={item.service}>{item.service}</option>)}
              </select>
            )}
          </Field>
          <label className='mb-2 flex items-center gap-2 text-sm text-muted'>
            <input type='checkbox' checked={onlyPending} onChange={(event) => { setOnlyPending(event.target.checked); upload.reset(); }} disabled={upload.isPending}/>
            Only the ones waiting for cookies ({data.identities.filter((identity) => identity.service === service && identity.status === 'pending').length})
          </label>
          <button type='button' className='btn btn-secondary ml-auto' onClick={() => input.current?.click()} disabled={upload.isPending}>
            <Upload className='size-4'/>
            Choose files
          </button>
          <input
            ref={input}
            type='file'
            multiple
            accept='.txt,.json,text/plain,application/json'
            className='hidden'
            onChange={async (event) => {
              const picked = [...(event.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
              event.target.value = '';
              setFiles(await Promise.all(picked.map(async (file) => ({name: file.name, text: await file.text()}))));
              upload.reset();
            }}
          />
        </div>

        {(files.length) ? (
          <>
            <p className='mt-4 text-sm text-fg'>
              {pairs.length.toLocaleString()} file{(pairs.length === 1) ? '' : 's'} to {pairs.length.toLocaleString()} identit{(pairs.length === 1) ? 'y' : 'ies'}
              {(targets.length < files.length) ? <span className='text-warning'>, {(files.length - targets.length).toLocaleString()} more files than identities (left out)</span> : null}
              {(files.length < targets.length) ? <span className='text-subtle'>, {(targets.length - files.length).toLocaleString()} identities get none</span> : null}
            </p>
            <ul className='mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-md border border-line bg-deep text-xs'>
              {pairs.map(({ file, identity }) => {
                const result = results.get(identity.id);
                return (
                  <li key={identity.id} className='flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5'>
                    <span className='min-w-0 flex-1 truncate font-mono text-fg'>{file.name}</span>
                    <span className='text-subtle'>→</span>
                    <span className='min-w-0 flex-1 truncate font-mono text-fg'>{identity.id}</span>
                    <span className='text-subtle'>{proxyLabel(identity.proxy)}</span>
                    {(result?.error) ? <Chip tone='danger'>{result.error}</Chip> : (result) ? <Chip tone='success'>Saved</Chip> : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (!targets.length) ? (
          <p className='mt-4 text-sm text-subtle'>No {service} identities {(onlyPending) ? 'are waiting for cookies' : 'yet'}. Assign proxies to {service} on the Proxies tab first.</p>
        ) : null}

        {(upload.isError) ? <p role='alert' className='mt-4 text-sm text-danger'>{errorMessage(upload.error, 'Couldn’t upload the cookies.')}</p> : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={upload.isPending}>{(upload.data) ? 'Close' : 'Cancel'}</button>
          <button
            type='button'
            className='btn btn-primary'
            disabled={upload.isPending || !pairs.length || !!upload.data}
            onClick={() => upload.mutate(pairs.map(({ file, identity }) => ({identity_id: identity.id, cookies: file.text})), {
              onSuccess: (saved) => {
                const failed = saved.filter((result) => result.error).length;
                toast(`Saved cookies for ${(saved.length - failed).toLocaleString()}` + ((failed) ? `, ${failed} failed` : ''));
                if (!failed) {
                  onClose();
                }
              },
            })}
          >
            {(upload.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Save {pairs.length.toLocaleString()}
          </button>
        </div>
      </div>
    </Modal>
  );
}


function PageSkeleton() {
  return (
    <div aria-hidden>
      <div className='mb-6 grid gap-4 md:grid-cols-2'>
        <Skeleton className='h-44'/>
      </div>
      <div className='card divide-y divide-line'>
        {Array.from({length: 8}, (_, i) => (
          <div key={i} className={cn('flex items-center gap-3 px-4 py-3')}>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='h-5 w-16 bg-surface-2'/>
            <Skeleton className='ml-auto h-4 w-24'/>
          </div>
        ))}
      </div>
    </div>
  );
}
