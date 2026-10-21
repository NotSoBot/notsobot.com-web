// Shared by the owner Identities and Proxies pages: the clock for countdowns, proxy addresses, the proxy picker and
// revealing a proxy's credentials (audited by the api, kept on screen for 30s and never cached).

import { EyeOff, KeyRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth';
import { Spinner } from '@/components/ui/Spinner';
import type { IdentityAuditEntry, IdentityProxy, IdentityProxyItem } from '@/lib/api';
import { errorMessage, useRevealProxyMutation } from '@/lib/api/dashboardQueries';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { Chip, CopyButton, DetailList, ExactDate } from './adminUi';


// re-renders every `interval` ms, for the countdowns
export function useNow(interval = 1000): number {
  const [ now, setNow ] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

// 34s, 5m, 3h, 2d
export function formatSpan(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

export function ago(value: number | null, now: number): string {
  return (value) ? `${formatSpan(now - value)} ago` : 'never';
}


// `1.2.3.4:8000`, `[2001:db8::1]:8000`
export function proxyAddress(proxy: Pick<IdentityProxy, 'host' | 'port'>): string {
  return (proxy.host.includes(':')) ? `[${proxy.host}]:${proxy.port}` : `${proxy.host}:${proxy.port}`;
}

// with the username when it has one, never the password
export function proxyLabel(proxy: Pick<IdentityProxy, 'host' | 'port' | 'username'>): string {
  return (proxy.username) ? `${proxy.username}@${proxyAddress(proxy)}` : proxyAddress(proxy);
}


export function LabelChips({ labels, className }: {labels: Array<string>, className?: string}) {
  if (!labels.length) {
    return null;
  }
  return (
    <span className={cn('inline-flex flex-wrap gap-1', className)}>
      {labels.map((label) => <Chip key={label} tone='brand'>{label}</Chip>)}
    </span>
  );
}


export function SecretValue({ value }: {value: string}) {
  return (
    <span className='inline-flex max-w-full items-center gap-1.5'>
      <span className='min-w-0 font-mono break-all select-all'>{value}</span>
      <CopyButton value={value}/>
    </span>
  );
}


// how long a revealed login or proxy password stays on screen
export const REVEAL_MS = 30 * 1000;

export const AUDIT_ACTIONS: Record<IdentityAuditEntry['action'], string> = {
  login_reveal: 'Revealed',
  login_set: 'Saved',
  login_clear: 'Removed',
  proxy_reveal: 'Revealed',
};

export function useAuditWho(): (userId: string) => string {
  const { user } = useAuth();
  return (userId: string) => (userId === '0') ? 'the cli' : (userId === user?.id) ? 'you' : `user ${userId}`;
}

export function AuditHistory({ history, now }: {history: Array<IdentityAuditEntry>, now: number}) {
  const who = useAuditWho();
  if (!history.length) {
    return null;
  }
  return (
    <ul className='mt-2 space-y-0.5 text-xs text-subtle'>
      {history.map((entry, index) => (
        <li key={index}>
          {AUDIT_ACTIONS[entry.action] ?? entry.action} by {who(entry.user_id)}
          {(entry.created) ? <> · <ExactDate value={entry.created} format={() => ago(entry.created, now)}/></> : null}
        </li>
      ))}
    </ul>
  );
}


// a proxy's address and username, and its password behind an audited reveal that hides again after 30s
export function ProxyCredentials({ proxy, now }: {proxy: IdentityProxy, now: number}) {
  const reveal = useRevealProxyMutation();
  const [ shownUntil, setShownUntil ] = useState(0);
  const revealed = (reveal.data && now < shownUntil) ? reveal.data : null;
  const { reset } = reveal;
  useEffect(() => {
    if (reveal.data && shownUntil <= now) {
      reset();
    }
  }, [reveal.data, shownUntil, now, reset]);

  return (
    <div>
      <DetailList
        items={[
          ['Address', <span key='a' className='inline-flex items-center gap-1.5'><span className='font-mono'>{proxy.scheme}://{proxyAddress(proxy)}</span><CopyButton value={proxyAddress(proxy)}/></span>],
          ['Username', (proxy.username) ? <SecretValue key='u' value={proxy.username}/> : <span key='u' className='text-subtle'>none</span>],
          ['Password', (revealed) ? (
            (revealed.password) ? <SecretValue key='p' value={revealed.password}/> : <span key='p' className='text-subtle'>none</span>
          ) : (proxy.has_password) ? (
            <button
              key='p'
              type='button'
              className='btn btn-secondary btn-sm'
              disabled={reveal.isPending}
              onClick={() => reveal.mutate(proxy.id, {onSuccess: () => setShownUntil(Date.now() + REVEAL_MS)})}
            >
              {(reveal.isPending) ? <Spinner className='size-4'/> : <KeyRound className='size-4'/>}
              Reveal
            </button>
          ) : <span key='p' className='text-subtle'>none</span>],
          (!!revealed) && ['Url', <SecretValue key='url' value={revealed?.url ?? ''}/>],
        ]}
      />
      {(revealed) ? (
        <div className='mt-2 flex items-center gap-2'>
          <button type='button' className='btn btn-ghost btn-sm' onClick={() => { setShownUntil(0); reset(); }}>
            <EyeOff className='size-4'/>
            Hide ({formatSpan(Math.min(shownUntil - now, REVEAL_MS))})
          </button>
        </div>
      ) : null}
      {(revealed) ? <AuditHistory history={revealed.history} now={now}/> : null}
      {(reveal.isError) ? <p role='alert' className='mt-2 text-sm text-danger'>{errorMessage(reveal.error, 'Couldn’t reveal the proxy.')}</p> : null}
    </div>
  );
}


// picks one of the proxies for an identity of `service`: searchable, filterable by label, and the ones that already
// hold an identity of that service can't be picked (one account per ip per service)
export function ProxyPicker({ proxies, service, value, onChange, ignoreIdentityId, disabled }: {
  proxies: Array<IdentityProxyItem>,
  service: string,
  value: number | null,
  onChange: (proxyId: number | null) => void,
  ignoreIdentityId?: string,
  disabled?: boolean,
}) {
  const [ query, setQuery ] = useState('');
  const [ label, setLabel ] = useState('');
  const labels = useMemo(() => [...new Set(proxies.flatMap((proxy) => proxy.labels))].sort(), [proxies]);
  const text = query.trim().toLowerCase();

  const options = proxies
    .filter((proxy) => !label || proxy.labels.includes(label))
    .filter((proxy) => !text || proxyLabel(proxy).toLowerCase().includes(text) || proxy.labels.some((x) => x.includes(text)))
    .map((proxy) => ({
      proxy,
      holder: proxy.identities.find((identity) => identity.service === service && identity.id !== ignoreIdentityId),
    }))
    // the free ones first
    .sort((a, b) => Number(!!a.holder) - Number(!!b.holder));
  const selected = proxies.find((proxy) => proxy.id === value);

  return (
    <div className='space-y-2'>
      <div className='flex gap-2'>
        <input
          {...NO_AUTOFILL}
          className='input flex-1'
          placeholder='Search proxies...'
          aria-label='Search proxies'
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
        {(labels.length) ? (
          <select className='input w-36' aria-label='Label' value={label} disabled={disabled} onChange={(event) => setLabel(event.target.value)}>
            <option value=''>Any label</option>
            {labels.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        ) : null}
      </div>
      <select
        className='input font-mono text-xs'
        size={Math.min(Math.max(options.length, 3), 7)}
        aria-label='Proxy'
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange((event.target.value) ? Number(event.target.value) : null)}
      >
        {options.map(({ proxy, holder }) => (
          <option key={proxy.id} value={proxy.id} disabled={!!holder || proxy.status !== 'active'}>
            {proxyLabel(proxy)}
            {(proxy.labels.length) ? `  [${proxy.labels.join(', ')}]` : ''}
            {(holder) ? `  · has ${holder.id}` : (proxy.status !== 'active') ? '  · disabled' : ''}
          </option>
        ))}
      </select>
      {(!options.length) ? <p className='text-xs text-subtle'>No proxies match. Add them on the Proxies page.</p> : null}
      {(selected) ? <p className='text-xs text-muted'>Picked <span className='font-mono'>{proxyLabel(selected)}</span></p> : null}
    </div>
  );
}
