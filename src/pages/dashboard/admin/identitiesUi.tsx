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

// a service id as a title, `google_images` is "Google Images" (css capitalize only does the first letter of a word)
export function serviceTitle(service: string): string {
  return service.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// with the username when it has one, never the password
export function proxyLabel(proxy: Pick<IdentityProxy, 'host' | 'port' | 'username'>): string {
  return (proxy.username) ? `${proxy.username}@${proxyAddress(proxy)}` : proxyAddress(proxy);
}


// for sorting by a time or a count, biggest first, and the ones without any last (never succeeded, never added)
export function descending(a: number | null | undefined, b: number | null | undefined): number {
  return (b ?? -Infinity) - (a ?? -Infinity) || 0;
}

// `?sort=` in a tab's filters, the default one isn't kept in the url
export function SortSelect<T extends string>({ options, value, defaultValue, onChange }: {
  options: Array<{value: T, label: string}>,
  value: T,
  defaultValue: T,
  onChange: (sort: string | null) => void,
}) {
  return (
    <label className='flex items-center gap-2 text-sm text-muted'>
      Sort
      <select className='input w-52' value={value} onChange={(event) => onChange((event.target.value === defaultValue) ? null : event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
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


// an authenticator secret as apps take it (base32, spaces and padding allowed), null for anything else (backup codes)
export function base32Bytes(value: string): Uint8Array<ArrayBuffer> | null {
  const text = value.replace(/[\s=-]/g, '').toUpperCase();
  if (text.length < 16 || !/^[A-Z2-7]+$/.test(text)) {
    return null;
  }
  const bytes: Array<number> = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    buffer = (buffer << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);
    bits += 5;
    if (8 <= bits) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

const TOTP_PERIOD_MS = 30 * 1000;

// the 6 digit code an authenticator app shows right now (RFC 6238: HMAC-SHA1 of the 30 second step), worked out here
// so the secret never goes anywhere else
export async function totpCode(key: Uint8Array<ArrayBuffer>, step: number): Promise<string> {
  const counter = new DataView(new ArrayBuffer(8));
  counter.setUint32(0, Math.floor(step / 2 ** 32));
  counter.setUint32(4, step % 2 ** 32);
  const hmacKey = await crypto.subtle.importKey('raw', key, {name: 'HMAC', hash: 'SHA-1'}, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, counter.buffer));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

// a saved 2fa value: the secret itself, and when it's an authenticator secret the current code with how long it lasts
export function TwoFactorValue({ value, now }: {value: string, now: number}) {
  const key = useMemo(() => base32Bytes(value), [value]);
  const step = Math.floor(now / TOTP_PERIOD_MS);
  const [ code, setCode ] = useState<{step: number, code: string} | null>(null);
  useEffect(() => {
    if (!key) {
      return;
    }
    let cancelled = false;
    void totpCode(key, step).then((next) => {
      if (!cancelled) {
        setCode({step, code: next});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, step]);

  return (
    <span className='flex flex-col gap-1'>
      <SecretValue value={value}/>
      {(key && code?.step === step) ? (
        <span className='inline-flex items-center gap-1.5 text-xs text-muted'>
          Code now
          <span className='font-mono text-sm text-white tabular-nums'>{code.code.slice(0, 3)} {code.code.slice(3)}</span>
          <CopyButton value={code.code}/>
          <span className='text-subtle tabular-nums'>{formatSpan(TOTP_PERIOD_MS - (now % TOTP_PERIOD_MS))}</span>
        </span>
      ) : null}
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
      {(reveal.isError) ? <p role='alert' className='mt-2 text-sm text-danger-text'>{errorMessage(reveal.error, 'Couldn’t reveal the proxy.')}</p> : null}
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
        {/* what nothing picked matches: without it react selects the first proxy (shown picked, and clicking it does
            nothing since it already is) */}
        <option value='' hidden disabled/>
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
