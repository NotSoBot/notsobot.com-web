// The servers the user gave their premium plus perks to (premium server slots). A server only gets premium this way,
// owning one doesn't give it anything. The dashboard can only add guilds, group dms are added with the bot. Max
// subscribers can stack more than one slot on a server, each raises its NotSoAI limit.

import { ExternalLink, Layers, Lock, MessagesSquare, Plus, Server, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ExactDate } from '@/components/ui/Tooltip';
import { Routes } from '@/config';
import { translate, useI18n } from '@/i18n';
import type { PremiumServer, UserGuildSummary } from '@/lib/api';
import {
  errorMessage,
  isDiscordGrantError,
  isScopeMismatch,
  useDeleteMePremiumServerMutation,
  useMeGuildListingQuery,
  useMeGuildsQuery,
  useMePremiumServersQuery,
  usePutMePremiumServerMutation,
} from '@/lib/api/dashboardQueries';
import { SERVER_AI_MESSAGES_PER_SLOT } from '@/lib/credits';
import { discordDmUrl, discordGuildUrl, formatDate, formatNumber, toDate } from '@/lib/utils';

import { hasPremiumMax } from './premium';
import { GuildIcon } from './servers/GuildIcon';
import { MissingServersNotice, ScopeMismatchCard } from './servers/ServersPage';
import { EmptyState, ErrorPanel, Skeleton } from './ui';


// the api's `PREMIUM_SERVER_SWAP_COOLDOWN`, only used to explain the lock before a server or another slot is added
const LOCK_HOURS = 24;
// the lock only lasts a day, so the time matters more than the year
const LOCK_FORMAT: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'};


function serverName(server: PremiumServer): string {
  return server.guild?.name || translate((server.guild) ? 'pservers.unknown' : 'pservers.unknown_dm');
}


export function PremiumServers() {
  const { data, isPending, isError, error, isRefetching, refetch } = useMePremiumServersQuery();
  const { user } = useAuth();
  const { t, rich, plural } = useI18n();
  const toast = useToast();
  const remove = useDeleteMePremiumServerMutation();
  const stack = usePutMePremiumServerMutation();
  const [ adding, setAdding ] = useState(false);
  const [ removing, setRemoving ] = useState<PremiumServer | null>(null);
  // the server another slot is about to go on: it's asked first, a slot is locked in for a day once it's added
  const [ stacking, setStacking ] = useState<PremiumServer | null>(null);

  const items = data?.items ?? [];
  const full = !!data && data.limit !== null && data.limit <= data.used;
  // only Max makes a second slot on a server worth anything (more NotSoAI messages)
  const canStack = !!data?.active && !full && hasPremiumMax(user);

  const confirmRemove = () => {
    if (!removing) {
      return;
    }
    remove.mutate(removing.server_id, {
      onSuccess: () => {
        toast(t((1 < removing.slots) ? 'pservers.slot_removed' : 'pservers.removed'));
        setRemoving(null);
      },
    });
  };

  const confirmStack = () => {
    if (!stacking) {
      return;
    }
    stack.mutate(stacking.server_id, {
      onSuccess: () => {
        toast(t('pservers.stacked', {name: serverName(stacking), count: stacking.slots + 1}));
        setStacking(null);
      },
    });
  };

  return (
    <section className='mt-8'>
      <div className='mb-3 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 className='section-label'>{t('pservers.title')}</h2>
          <p className='mt-1 text-sm text-subtle'>
            {(data?.limit === null) ? (
              t('pservers.owner')
            ) : (data) ? (
              t('pservers.slots', {count: formatNumber(data.limit)})
            ) : t('pservers.slots_unknown')}
            {' '}{t('pservers.explain', {messages: SERVER_AI_MESSAGES_PER_SLOT})}
            {' '}
            <Link to={`${Routes.PREMIUM}#premium-compare-servers`} className='text-brand-text hover:underline'>{t('pservers.see_what')}</Link>
          </p>
        </div>
        {(data?.active) ? (
          <div className='flex flex-col items-start gap-1 sm:items-end'>
            <button
              type='button'
              className='btn btn-sm btn-primary'
              disabled={full}
              title={(full) ? t('pservers.full') : undefined}
              onClick={() => setAdding(true)}
            >
              <Plus className='size-4'/>
              {t('pservers.add')}
            </button>
            {/* why it's disabled, a tooltip doesn't show on touch */}
            {(full) ? <p className='text-xs text-subtle'>{t('pservers.full')}</p> : null}
          </div>
        ) : null}
      </div>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title={t('pservers.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <>
          {(!data.active) ? (
            <p className='mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
              {t((items.length) ? 'pservers.inactive' : 'pservers.needs_plus')}
            </p>
          ) : null}
          {(!items.length) ? (
            <EmptyState icon={<Server className='size-10'/>} title={t('pservers.empty')}>
              {(data.active) ? (
                rich('pservers.empty_active', {code: (chunk) => <code className='text-fg'>{chunk}</code>})
              ) : (
                t('pservers.empty_inactive')
              )}
            </EmptyState>
          ) : (
            <>
              <p className='mb-3 text-sm text-subtle'>{(data.limit === null) ? t('pservers.used', {used: formatNumber(data.used)}) : t('pservers.used_of', {used: formatNumber(data.used), limit: formatNumber(data.limit)})}</p>
              <ul className='card divide-y divide-line'>
                {items.map((server) => (
                  <ServerRow
                    key={server.server_id}
                    server={server}
                    active={data.active}
                    // the dashboard can only add guilds, a group dm's extra slot is added with the bot
                    onStack={(canStack && server.guild) ? () => setStacking(server) : null}
                    onRemove={() => setRemoving(server)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {(adding && data) ? (
        <AddServerDialog taken={items.map((server) => server.server_id)} onClose={() => setAdding(false)}/>
      ) : null}

      {(stacking) ? (
        <ConfirmDialog
          title={t('pservers.stack_confirm_title', {name: serverName(stacking)})}
          description={t('pservers.stack_confirm_description', {messages: SERVER_AI_MESSAGES_PER_SLOT, hours: LOCK_HOURS})}
          confirmLabel={t('pservers.add_slot')}
          tone='primary'
          pending={stack.isPending}
          error={(stack.isError) ? errorMessage(stack.error, t('pservers.stack_error')) : null}
          onConfirm={confirmStack}
          onClose={() => {
            stack.reset();
            setStacking(null);
          }}
        />
      ) : null}

      {(removing) ? (
        <ConfirmDialog
          title={t((1 < removing.slots) ? 'pservers.remove_slot_title' : 'pservers.remove_title', {name: serverName(removing)})}
          description={(1 < removing.slots) ? (
            plural('pservers.remove_slot_description', removing.slots - 1, {messages: SERVER_AI_MESSAGES_PER_SLOT})
          ) : (
            t('pservers.remove_description')
          )}
          confirmLabel={t('common.remove')}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, t('pservers.remove_error')) : null}
          onConfirm={confirmRemove}
          onClose={() => {
            remove.reset();
            setRemoving(null);
          }}
        />
      ) : null}
    </section>
  );
}


function ServerRow({ server, active, onStack, onRemove }: {
  server: PremiumServer,
  active: boolean,
  onStack: (() => void) | null,
  onRemove: () => void,
}) {
  const { t } = useI18n();
  const name = serverName(server);
  // the lock only matters while they have premium plus, the api lets them remove it any time otherwise
  const removableAt = toDate(server.removable_at).getTime();
  const locked = active && Date.now() < removableAt;
  // drawn again when the lock runs out, so Remove turns on without a reload (the lock is at most a day, well under
  // setTimeout's ~24.8 day limit)
  const [ , redraw ] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const wait = removableAt - Date.now();
    if (!active || wait <= 0 || 0x7fffffff < wait) {
      return;
    }
    const timer = window.setTimeout(redraw, wait + 500);
    return () => window.clearTimeout(timer);
  }, [active, removableAt]);

  return (
    <li className='flex items-center gap-3 px-4 py-3'>
      {(server.guild?.name) ? (
        <GuildIcon guild={{id: server.guild.id, icon: server.guild.icon, name: server.guild.name}} size={36} className='size-9 rounded-lg'/>
      ) : (
        <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-subtle'>
          <MessagesSquare className='size-5'/>
        </span>
      )}
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate font-medium text-white'>{name}</span>
          {(1 < server.slots) ? (
            <Chip tone='brand' className='gap-1' title={t('pservers.slot_messages', {messages: server.slots * SERVER_AI_MESSAGES_PER_SLOT})}>
              <Layers aria-hidden className='size-3'/>
              {t('pservers.slot_count', {count: server.slots})}
            </Chip>
          ) : null}
          {(locked) ? (
            <Chip className='gap-1' title={t('pservers.locked_title', {hours: LOCK_HOURS})}>
              <Lock aria-hidden className='size-3'/>
              {t('pservers.locked', {date: formatDate(server.removable_at, LOCK_FORMAT)})}
            </Chip>
          ) : null}
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          <ExactDate value={server.created} format={(value) => t('pservers.added', {date: formatDate(value)})}/>
          <span className='font-mono'>{server.server_id}</span>
          {/* no guild row is almost always a group dm, the bot knows every guild it's in */}
          <a
            href={(server.guild) ? discordGuildUrl(server.server_id) : discordDmUrl(server.server_id)}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-code hover:underline'
          >
            {t('common.open_discord')}
            <ExternalLink aria-hidden className='size-3'/>
          </a>
        </div>
      </div>
      {(onStack) ? (
        <button
          type='button'
          className='btn btn-sm btn-secondary shrink-0'
          title={t('pservers.stack_title', {messages: SERVER_AI_MESSAGES_PER_SLOT})}
          onClick={onStack}
          aria-label={t('pservers.stack_label', {name})}
        >
          <Layers className='size-4'/>
          <span className='hidden sm:inline'>{t('pservers.add_slot')}</span>
        </button>
      ) : null}
      <button
        type='button'
        className='btn btn-sm btn-secondary shrink-0'
        disabled={locked}
        title={(locked) ? t('pservers.removable', {date: formatDate(server.removable_at)}) : undefined}
        onClick={onRemove}
        aria-label={t('pservers.remove_label', {name})}
      >
        <Trash2 className='size-4'/>
        <span className='hidden sm:inline'>{t('common.remove')}</span>
      </button>
    </li>
  );
}


function AddServerDialog({ taken, onClose }: {taken: Array<string>, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const toast = useToast();
  const guilds = useMeGuildsQuery();
  // the same query, for whether it's every server they're in
  const listing = useMeGuildListingQuery();
  const put = usePutMePremiumServerMutation();
  const [ query, setQuery ] = useState('');

  const available = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (guilds.data ?? [])
      .filter((guild) => !taken.includes(guild.id))
      .filter((guild) => !search || guild.name.toLowerCase().includes(search) || guild.id === search);
  }, [guilds.data, taken, query]);

  const add = (guild: UserGuildSummary) => {
    put.mutate(guild.id, {
      onSuccess: () => {
        toast(t('pservers.given', {name: guild.name}));
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !put.isPending && onClose()} className='max-w-lg'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('pservers.dialog_title')}</h2>
        <p className='mt-2 text-sm text-muted'>
          {t('pservers.dialog_description', {hours: LOCK_HOURS})}
        </p>

        {(put.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(put.error, t('pservers.give_error'))}
          </p>
        ) : null}

        <div className='mt-4'>
          {(guilds.isPending) ? (
            <div aria-hidden className='space-y-2'>
              {Array.from({length: 4}, (_, i) => <Skeleton key={i} className='h-12 w-full bg-surface-2'/>)}
            </div>
          ) : (isScopeMismatch(guilds.error)) ? (
            <ScopeMismatchCard/>
          ) : (isDiscordGrantError(guilds.error)) ? (
            <ScopeMismatchCard reason='grant'/>
          ) : (guilds.isError) ? (
            <ErrorPanel title={t('pservers.load_error')} message={errorMessage(guilds.error)} onRetry={() => guilds.refetch()} retrying={guilds.isRefetching}/>
          ) : (
            <>
              <SearchInput value={query} onValueChange={setQuery} placeholder={t('pservers.search')} size='sm' aria-label={t('pservers.search')}/>
              {(listing.data && !listing.data.complete) ? <MissingServersNotice compact className='mt-2'/> : null}
              {(!available.length) ? (
                <p className='mt-4 text-center text-sm text-subtle'>
                  {t((query) ? 'pservers.no_match' : 'pservers.all_have')}
                </p>
              ) : (
                <ul className='mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line'>
                  {available.map((guild) => (
                    <li key={guild.id} className='flex items-center gap-3 px-3 py-2'>
                      <GuildIcon guild={guild} size={32} className='size-8 rounded-lg'/>
                      <span className='min-w-0 flex-1 truncate text-fg'>{guild.name}</span>
                      <button
                        type='button'
                        className='btn btn-sm btn-secondary shrink-0'
                        disabled={put.isPending}
                        onClick={() => add(guild)}
                      >
                        {(put.isPending && put.variables === guild.id) ? <Spinner className='size-4'/> : null}
                        {t('pservers.give')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-lg'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-56 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
