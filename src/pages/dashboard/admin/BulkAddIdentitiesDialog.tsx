// many accounts at once from a pasted list of logins, one per line. each gets the next free proxy (one no identity of
// the service is on yet, in address order, optionally only ones with a label), which can be changed per row before
// anything is added. without cookies they wait for them (`pending`), Upload cookies gives them theirs after

import { Eye, EyeOff } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminIdentities, IdentityLogin, IdentityProxyItem } from '@/lib/api';
import { errorMessage, useBulkCreateIdentitiesMutation } from '@/lib/api/dashboardQueries';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { Field } from '../ui';
import { proxyLabel, serviceTitle } from './identitiesUi';
import { LOGIN_LINE_FORMATS, LOGIN_LINE_LABELS, loginLineFormatLabel, nameFromUsername, parseLoginLine, type ParsedLoginLine } from './loginLine';
import { compareAddresses } from './ProxiesTab';


const NAME = /^[^:\s]{1,48}$/;
// what one request takes, the api's own limit
const CHUNK = 100;

interface Row {
  // the username lowercased, what the picks and typed names are kept by (stays the same as the text around it changes)
  key: string,
  line: number,
  login: ParsedLoginLine | null,
  name: string,
  proxy: IdentityProxyItem | null,
  // picked by hand, not the next free one
  picked: boolean,
  error: string | null,
}

export function BulkAddIdentitiesDialog({ data, onClose }: {data: AdminIdentities, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const create = useBulkCreateIdentitiesMutation();
  const services = data.services.filter((item) => item.kind === 'cookies');
  const [ service, setService ] = useState(services.find((item) => item.service === 'youtube')?.service ?? services[0]?.service ?? '');
  const [ text, setText ] = useState('');
  const [ shown, setShown ] = useState(false);
  const [ format, setFormat ] = useState(LOGIN_LINE_FORMATS[0].value);
  const [ label, setLabel ] = useState('');
  const [ picks, setPicks ] = useState<Record<string, number>>({});
  const [ names, setNames ] = useState<Record<string, string>>({});
  // what the last add couldn't, by row key, until the list changes
  const [ failed, setFailed ] = useState<Record<string, string>>({});
  const [ sending, setSending ] = useState(false);

  const labels = useMemo(() => [...new Set(data.proxies.flatMap((proxy) => proxy.labels))].sort(), [data.proxies]);
  const fields = LOGIN_LINE_FORMATS.find((item) => item.value === format)?.fields ?? null;

  // proxies no identity of the service is on yet, the auto picks only from the label's
  const free = useMemo(() => {
    const taken = new Set(data.identities.filter((identity) => identity.service === service).map((identity) => identity.proxy.id));
    return data.proxies.filter((proxy) => proxy.status === 'active' && !taken.has(proxy.id)).sort(compareAddresses);
  }, [data, service]);

  const rows = useMemo(() => {
    const existing = new Set(data.identities.map((identity) => identity.id));
    const seen = new Set<string>();
    const usedNames = new Set<string>();
    const freeIds = new Set(free.map((proxy) => proxy.id));

    const parsed: Array<Row> = text.split(/\r?\n/).flatMap((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) {
        return [];
      }
      const login = parseLoginLine(line, fields);
      const key = (login) ? login.username.toLowerCase() : `line-${index}`;
      const error = (!login) ? `Not ${loginLineFormatLabel(fields ?? [])}${(fields) ? '' : ' at least'}`
        : (seen.has(key)) ? 'The same username as a line above'
        : null;
      seen.add(key);
      return [{key, line: index + 1, login: (error) ? null : login, name: '', proxy: null, picked: false, error}];
    });

    for (const row of parsed) {
      if (!row.login) {
        continue;
      }
      if (names[row.key] !== undefined) {
        row.name = names[row.key].trim();
        row.error = (!NAME.test(row.name)) ? 'The name can’t be empty or have spaces or “:”'
          : (existing.has(`${service}:${row.name}`) || usedNames.has(row.name)) ? `${service}:${row.name} is taken`
          : null;
      } else {
        // the username's, with -2, -3... after it when that's taken
        const base = nameFromUsername(row.login.username) || 'account';
        let name = base;
        for (let count = 2; existing.has(`${service}:${name}`) || usedNames.has(name); count++) {
          name = `${base.slice(0, 44)}-${count}`;
        }
        row.name = name;
      }
      usedNames.add(row.name);
    }

    // the ones picked by hand first, the rest get the next free one in order
    const handPicked = new Set<number>();
    for (const row of parsed) {
      const pick = picks[row.key];
      if (row.login && pick !== undefined && freeIds.has(pick) && !handPicked.has(pick)) {
        row.proxy = free.find((proxy) => proxy.id === pick) ?? null;
        row.picked = true;
        handPicked.add(pick);
      }
    }
    const queue = free.filter((proxy) => !handPicked.has(proxy.id) && (!label || proxy.labels.includes(label)));
    for (const row of parsed) {
      if (row.login && !row.proxy) {
        row.proxy = queue.shift() ?? null;
        if (!row.proxy && !row.error) {
          row.error = (label) ? `No free proxy with the ${label} label left` : 'No free proxy left';
        }
      }
    }
    for (const row of parsed) {
      row.error = failed[row.key] ?? row.error;
    }
    return parsed;
  }, [text, fields, data, service, names, picks, free, label, failed]);

  const ready = rows.filter((row) => !row.error && row.login && row.proxy);
  // a proxy another row was given by hand can't be picked again, one it only got as the next free one can (that row
  // then moves on to the next)
  const pickedBy = new Map(rows.filter((row) => row.picked && row.proxy).map((row) => [row.proxy?.id, row.key]));

  const submit = async () => {
    setSending(true);
    const errors: Record<string, string> = {};
    let added = 0;
    try {
      for (let start = 0; start < ready.length; start += CHUNK) {
        const chunk = ready.slice(start, start + CHUNK);
        const result = await create.mutateAsync({
          service,
          items: chunk.map((row) => ({name: row.name, proxy_id: row.proxy?.id ?? 0, login: toLogin(row.login)})),
        });
        result.results.forEach((item, index) => {
          if (item.error) {
            errors[chunk[index].key] = item.error;
          } else {
            added += 1;
          }
        });
      }
    } catch (error) {
      toast(errorMessage(error, 'Couldn’t add the identities.'));
    } finally {
      setSending(false);
      await create.invalidate();
    }
    if (!added && !Object.keys(errors).length) {
      return;
    }
    toast(`Added ${added.toLocaleString()} identit${(added === 1) ? 'y' : 'ies'}` + ((Object.keys(errors).length) ? `, ${Object.keys(errors).length} couldn’t be` : ''));
    if (!Object.keys(errors).length) {
      onClose();
      return;
    }
    // only the lines that weren't added stay, with why
    const keep = new Set(Object.keys(errors));
    setText(text.split(/\r?\n/).filter((raw) => {
      const login = parseLoginLine(raw.trim(), fields);
      return login && keep.has(login.username.toLowerCase());
    }).join('\n'));
    setFailed(errors);
  };

  const edit = (change: () => void) => {
    change();
    setFailed({});
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !sending && onClose()} className='max-w-4xl'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Add from logins</h2>
        <p className='mt-2 text-sm text-muted'>
          One login per line. Each gets the next free proxy, change any of them below before adding. They wait for their
          cookies (Needs cookies) until Upload cookies gives them theirs.
        </p>

        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <Field label='Service'>
            {(props) => (
              <select {...props} className='input' value={service} onChange={(event) => edit(() => { setService(event.target.value); setPicks({}); })} disabled={sending}>
                {services.map((item) => <option key={item.service} value={item.service}>{serviceTitle(item.service)}</option>)}
              </select>
            )}
          </Field>
          <Field label='Format'>
            {(props) => (
              <select {...props} className='input font-mono text-xs' value={format} onChange={(event) => edit(() => setFormat(event.target.value))} disabled={sending}>
                {LOGIN_LINE_FORMATS.map((item) => <option key={item.value} value={item.value}>{loginLineFormatLabel(item.fields, true)}</option>)}
              </select>
            )}
          </Field>
          <Field label='Pick proxies from' hint={`${free.filter((proxy) => !label || proxy.labels.includes(label)).length.toLocaleString()} free`}>
            {(props) => (
              <select {...props} className='input' value={label} onChange={(event) => edit(() => setLabel(event.target.value))} disabled={sending}>
                <option value=''>Any label</option>
                {labels.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            )}
          </Field>
        </div>

        <Field
          className='mt-4'
          label='Logins'
          counter={(
            <button type='button' className='inline-flex cursor-pointer items-center gap-1 hover:text-fg' onClick={() => setShown((value) => !value)}>
              {(shown) ? <EyeOff className='size-3.5'/> : <Eye className='size-3.5'/>}
              {(shown) ? 'Hide' : 'Show'}
            </button>
          )}
        >
          {(props) => (
            <textarea
              {...props}
              {...NO_AUTOFILL}
              // masked like a password field until shown (where the browser supports it)
              className={cn('input min-h-32 font-mono text-xs', !shown && '[-webkit-text-security:disc]')}
              placeholder={'a@gmail.com:password:recovery@gmail.com\nb@gmail.com:password'}
              value={text}
              onChange={(event) => edit(() => setText(event.target.value))}
              disabled={sending}
            />
          )}
        </Field>

        {(rows.length) ? (
          <div className='mt-4 max-h-80 overflow-auto rounded-md border border-line bg-deep'>
            <table className='w-full min-w-[640px] text-left text-xs'>
              <thead className='sticky top-0 border-b border-line bg-deep text-subtle'>
                <tr>
                  <th scope='col' className='w-10 px-3 py-2 font-medium'>Line</th>
                  <th scope='col' className='px-2 py-2 font-medium'>Username</th>
                  <th scope='col' className='w-40 px-2 py-2 font-medium'>Name</th>
                  <th scope='col' className='w-60 px-3 py-2 font-medium'>Proxy</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {rows.map((row) => (
                  <tr key={`${row.key}-${row.line}`} className={cn('align-top', row.error && 'bg-danger/5')}>
                    <td className='px-3 py-2 text-subtle tabular-nums'>{row.line}</td>
                    <td className='min-w-0 px-2 py-2'>
                      {(row.login) ? (
                        <>
                          <span className='block truncate font-mono text-fg'>{row.login.username}</span>
                          <span className='block text-subtle'>{extrasText(row.login)}</span>
                        </>
                      ) : null}
                      {(row.error) ? <span className='block text-danger-text'>{row.error}</span> : null}
                    </td>
                    <td className='px-2 py-1.5'>
                      {(row.login) ? (
                        <input
                          {...NO_AUTOFILL}
                          aria-label={`Name for line ${row.line}`}
                          className='input h-8 py-1 font-mono text-xs'
                          value={row.name}
                          onChange={(event) => edit(() => setNames((current) => ({...current, [row.key]: event.target.value})))}
                          disabled={sending}
                        />
                      ) : null}
                    </td>
                    <td className='px-3 py-1.5'>
                      {(row.login) ? (
                        <select
                          aria-label={`Proxy for line ${row.line}`}
                          className={cn('input h-8 py-1 font-mono text-xs', !row.picked && 'text-muted')}
                          value={row.proxy?.id ?? ''}
                          onChange={(event) => edit(() => setPicks((current) => ({...current, [row.key]: Number(event.target.value)})))}
                          disabled={sending}
                        >
                          {(!row.proxy) ? <option value='' hidden disabled/> : null}
                          {free.filter((proxy) => (pickedBy.get(proxy.id) ?? row.key) === row.key).map((proxy) => (
                            <option key={proxy.id} value={proxy.id}>
                              {proxyLabel(proxy)}{(proxy.labels.length) ? ` [${proxy.labels.join(', ')}]` : ''}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end'>
          {(rows.length) ? (
            <p className='mr-auto text-sm text-muted'>
              {ready.length.toLocaleString()} ready
              {(rows.length - ready.length) ? <span className='text-danger-text'>, {(rows.length - ready.length).toLocaleString()} with a problem (left out)</span> : null}
            </p>
          ) : null}
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={sending}>Cancel</button>
          <button type='button' className='btn btn-primary' disabled={sending || !ready.length} onClick={() => void submit()}>
            {(sending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Add {(ready.length) ? ready.length.toLocaleString() : ''} identit{(ready.length === 1) ? 'y' : 'ies'}
          </button>
        </div>
      </div>
    </Modal>
  );
}


// what came with the login besides the username and password
function extrasText(login: ParsedLoginLine): string {
  const extras = (Object.keys(login) as Array<keyof IdentityLogin>).filter((field) => field !== 'username' && field !== 'password' && login[field]);
  return (extras.length) ? `+ ${extras.map((field) => LOGIN_LINE_LABELS[field]).join(', ')}` : 'username and password';
}

function toLogin(login: ParsedLoginLine | null): IdentityLogin | undefined {
  return (login) ? {...login} : undefined;
}
