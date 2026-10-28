// The Proxies tab of the owner Identities page: the proxies identities use (notsobot.api `identity_proxies`). Pasted in
// bulk, labeled (a proxy can have any number of labels), and assigned to services: a proxy is used by a service once it
// has an identity of it. Assigning to a service with accounts (youtube) makes identities waiting for their cookies,
// uploaded on the Identities tab. Passwords never come back unless revealed, which the api writes down.

import { Network, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import type { AdminIdentities, AdminProxiesBulkResult, IdentityProxy, IdentityProxyItem, IdentityService, ProxyScheme } from '@/lib/api';
import {
  errorMessage,
  useAssignIdentitiesMutation,
  useBulkAddProxiesMutation,
  useDeleteIdentityLabelMutation,
  useDeleteProxiesMutation,
  usePatchProxiesMutation,
  usePatchProxyMutation,
  useRenameIdentityLabelMutation,
  useUnassignIdentitiesMutation,
} from '@/lib/api/dashboardQueries';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { EmptyState, Field } from '../ui';
import { Chip, FiltersButton, Hint, useSearchParamState } from './adminUi';
import { LabelChips, ProxyCredentials, SortSelect, descending, proxyAddress, proxyLabel, useNow } from './identitiesUi';


const SCHEMES: Array<ProxyScheme> = ['http', 'https', 'socks5', 'socks5h'];

// `geo, eu` -> ['geo', 'eu']
function parseLabels(text: string): Array<string> {
  return [...new Set(text.split(',').map((label) => label.trim().toLowerCase()).filter(Boolean))];
}

// a service whose identities are accounts, assigning makes them wait for their cookies
function needsCookies(service: IdentityService | undefined): boolean {
  return service?.kind === 'cookies' && !service.secret_optional;
}


// `?sort=` on the proxies tab
type ProxySort = 'address' | 'newest' | 'oldest' | 'most_used' | 'least_used';
const PROXY_SORTS: Array<{value: ProxySort, label: string}> = [
  {value: 'address', label: 'Address'},
  {value: 'newest', label: 'Newest added'},
  {value: 'oldest', label: 'Oldest added'},
  {value: 'most_used', label: 'Most services'},
  {value: 'least_used', label: 'Fewest services'},
];

// numbers compared as numbers, so 10.0.0.2 comes before 10.0.0.10
export function compareAddresses(a: Pick<IdentityProxy, 'host' | 'port' | 'username' | 'id'>, b: Pick<IdentityProxy, 'host' | 'port' | 'username' | 'id'>): number {
  return a.host.localeCompare(b.host, undefined, {numeric: true}) || a.port - b.port || (a.username ?? '').localeCompare(b.username ?? '') || a.id - b.id;
}

function compareProxies(sort: ProxySort, a: IdentityProxyItem, b: IdentityProxyItem): number {
  const order = (sort === 'newest') ? descending(a.created, b.created) || b.id - a.id
    : (sort === 'oldest') ? descending(b.created, a.created) || a.id - b.id
    : (sort === 'most_used') ? b.identities.length - a.identities.length
    : (sort === 'least_used') ? a.identities.length - b.identities.length
    : 0;
  return order || compareAddresses(a, b);
}


export function ProxiesTab({ data }: {data: AdminIdentities}) {
  const { searchParams, update } = useSearchParamState();
  const [ selected, setSelected ] = useState<Set<number>>(new Set());
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const [ dialog, setDialog ] = useState<'add' | 'edit' | 'assign' | 'delete' | 'labels' | null>(null);
  const [ openId, setOpenId ] = useState<number | null>(null);

  const query = searchParams.get('q') || '';
  const label = searchParams.get('label') || '';
  const used = searchParams.get('used') || '';
  const status = searchParams.get('status') || '';
  const sort = PROXY_SORTS.find((item) => item.value === searchParams.get('sort'))?.value ?? 'address';
  const activeFilters = [label, used, status, sort !== 'address'].filter(Boolean).length;

  const proxies = useMemo(() => {
    const text = query.trim().toLowerCase();
    return data.proxies.filter((proxy) => (
      (!label || proxy.labels.includes(label)) &&
      (!status || ((status === 'down') ? proxy.down : proxy.status === status)) &&
      (!used || ((used === 'unused') ? !proxy.identities.length : proxy.identities.some((identity) => identity.service === used))) &&
      (!text || proxyLabel(proxy).toLowerCase().includes(text) || proxy.identities.some((identity) => identity.id.toLowerCase().includes(text)))
    )).sort((a, b) => compareProxies(sort, a, b));
  }, [data, query, label, used, status, sort]);

  // only what's still listed and still exists counts as selected
  const visibleIds = new Set(proxies.map((proxy) => proxy.id));
  const selectedIds = [...selected].filter((id) => visibleIds.has(id));
  const allSelected = !!proxies.length && proxies.every((proxy) => selected.has(proxy.id));
  const toggle = (id: number) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
  const open = data.proxies.find((proxy) => proxy.id === openId) ?? null;

  return (
    // the room the floating selection bar takes, so it never covers the last rows (and nothing moves when it shows)
    <div className='pb-20'>
          <div className='mb-4 flex gap-2'>
            <SearchInput
              className='min-w-0 flex-1'
              value={query}
              onValueChange={(value) => update({q: value})}
              placeholder='Search by ip, username or identity...'
              aria-label='Search proxies'
            />
            <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='proxy-filters'/>
            <button type='button' className='btn btn-primary shrink-0' onClick={() => setDialog('add')}>
              <Plus className='size-4'/>
              <span className='max-sm:sr-only'>Add proxies</span>
            </button>
          </div>

          <div id='proxy-filters' hidden={!filtersOpen} className='card mb-4 p-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <label className='flex items-center gap-2 text-sm text-muted'>
                Label
                <select className='input w-40' value={label} onChange={(event) => update({label: event.target.value})}>
                  <option value=''>Any</option>
                  {data.labels.map((item) => <option key={item.id} value={item.name}>{item.name} ({item.proxies})</option>)}
                </select>
              </label>
              <label className='flex items-center gap-2 text-sm text-muted'>
                Used by
                <select className='input w-40' value={used} onChange={(event) => update({used: event.target.value})}>
                  <option value=''>Anything</option>
                  <option value='unused'>Nothing (unused)</option>
                  {data.services.map((service) => <option key={service.service} value={service.service}>{service.service}</option>)}
                </select>
              </label>
              <label className='flex items-center gap-2 text-sm text-muted'>
                Status
                <select className='input w-32' value={status} onChange={(event) => update({status: event.target.value})}>
                  <option value=''>Any</option>
                  <option value='active'>Active</option>
                  <option value='disabled'>Disabled</option>
                  <option value='down'>Down</option>
                </select>
              </label>
              <SortSelect options={PROXY_SORTS} value={sort} defaultValue='address' onChange={(value) => update({sort: value})}/>
              <button type='button' className='btn btn-ghost btn-sm' onClick={() => setDialog('labels')} disabled={!data.labels.length}>
                <Tag className='size-4'/>
                Manage labels
              </button>
            </div>
          </div>

          {/* fixed to the bottom of the window, so selecting doesn't push the list down */}
          {(selectedIds.length) ? (
            <div className='fixed inset-x-0 bottom-4 z-30 flex justify-center px-4'>
              <div className='flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-surface-2 px-3 py-2 shadow-xl shadow-black/40'>
                <span className='text-sm text-fg tabular-nums'>{selectedIds.length.toLocaleString()} selected</span>
                <button type='button' className='btn btn-secondary btn-sm' onClick={() => setDialog('assign')}>
                  <Network className='size-4'/>
                  Assign to services
                </button>
                <button type='button' className='btn btn-secondary btn-sm' onClick={() => setDialog('edit')}>
                  <Pencil className='size-4'/>
                  Edit
                </button>
                <button type='button' className='btn btn-sm border border-danger/40 bg-danger/10 text-danger-text hover:bg-danger/20' onClick={() => setDialog('delete')}>
                  <Trash2 className='size-4'/>
                  Delete
                </button>
                <button type='button' className='btn btn-ghost btn-sm' onClick={() => setSelected(new Set())} aria-label='Clear the selection'>
                  <X className='size-4'/>
                </button>
              </div>
            </div>
          ) : null}

          {(!data.proxies.length) ? (
            <EmptyState icon={<Network className='size-10'/>} title='No proxies yet'>Paste a list with Add proxies.</EmptyState>
          ) : (!proxies.length) ? (
            <EmptyState icon={<Network className='size-10'/>} title='No proxies match'>Try a different search or filter.</EmptyState>
          ) : (
            <div className='card overflow-x-auto'>
              <table className='w-full min-w-[720px] text-left text-sm'>
                <thead className='border-b border-line text-xs text-subtle uppercase'>
                  <tr>
                    <th scope='col' className='w-10 px-4 py-2.5'>
                      <input
                        type='checkbox'
                        aria-label='Select every listed proxy'
                        checked={allSelected}
                        onChange={() => setSelected((allSelected) ? new Set() : new Set(proxies.map((proxy) => proxy.id)))}
                      />
                    </th>
                    <th scope='col' className='px-2 py-2.5 font-medium'>Proxy</th>
                    <th scope='col' className='px-2 py-2.5 font-medium'>Labels</th>
                    <th scope='col' className='px-2 py-2.5 font-medium'>Used by</th>
                    <th scope='col' className='px-4 py-2.5 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-line'>
                  {proxies.map((proxy) => (
                    <tr key={proxy.id} className={cn('align-middle hover:bg-surface-2', selected.has(proxy.id) && 'bg-brand/5')}>
                      <td className='px-4 py-2.5'>
                        <input type='checkbox' aria-label={`Select ${proxyLabel(proxy)}`} checked={selected.has(proxy.id)} onChange={() => toggle(proxy.id)}/>
                      </td>
                      <td className='px-2 py-2.5'>
                        <button type='button' className='cursor-pointer text-left font-mono text-sm text-white hover:underline' onClick={() => setOpenId(proxy.id)}>
                          {proxyLabel(proxy)}
                        </button>
                        {(proxy.scheme !== 'http') ? <span className='ml-2 text-xs text-subtle'>{proxy.scheme}</span> : null}
                      </td>
                      <td className='px-2 py-2.5'><LabelChips labels={proxy.labels}/></td>
                      <td className='px-2 py-2.5'>
                        <span className='inline-flex flex-wrap gap-1'>
                          {proxy.identities.map((identity) => (
                            <Hint key={identity.id} text={`${identity.id} (${identity.status})`}>
                              <Chip tone={(identity.status === 'active') ? 'success' : (identity.status === 'dead') ? 'danger' : (identity.status === 'pending') ? 'warning' : 'neutral'}>
                                {identity.service}
                              </Chip>
                            </Hint>
                          ))}
                          {(!proxy.identities.length) ? <span className='text-xs text-subtle'>unused</span> : null}
                        </span>
                      </td>
                      <td className='px-4 py-2.5'>
                        <span className='inline-flex gap-1'>
                          {(proxy.status === 'disabled') ? <Chip>Disabled</Chip> : <Chip tone='success'>Active</Chip>}
                          {(proxy.down) ? <Chip tone='warning'>Down</Chip> : null}
                          {(!proxy.has_password && proxy.username) ? <Hint text='A username without a password'><Chip tone='warning'>No password</Chip></Hint> : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

      {(dialog === 'add') ? <AddProxiesDialog data={data} onClose={() => setDialog(null)}/> : null}
      {(dialog === 'edit') ? <EditProxiesDialog data={data} proxyIds={selectedIds} onClose={() => setDialog(null)}/> : null}
      {(dialog === 'assign') ? <AssignDialog data={data} proxyIds={selectedIds} onClose={() => setDialog(null)}/> : null}
      {(dialog === 'delete') ? (
        <DeleteProxiesDialog proxyIds={selectedIds} onClose={() => setDialog(null)} onDeleted={(ids) => setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))))}/>
      ) : null}
      {(dialog === 'labels') ? <LabelsDialog data={data} onClose={() => setDialog(null)}/> : null}
      {(open) ? <ProxyModal key={open.id} proxy={open} onClose={() => setOpenId(null)}/> : null}
    </div>
  );
}


const BULK_OUTCOMES: Record<AdminProxiesBulkResult['results'][number]['outcome'], {label: string, tone: 'success' | 'neutral' | 'danger' | 'brand' | 'warning'}> = {
  would_add: {label: 'New', tone: 'brand'},
  added: {label: 'Added', tone: 'success'},
  would_update: {label: 'Update', tone: 'warning'},
  updated: {label: 'Updated', tone: 'success'},
  skipped: {label: 'Skipped', tone: 'neutral'},
  failed: {label: 'Can’t add', tone: 'danger'},
};


function AddProxiesDialog({ data, onClose }: {data: AdminIdentities, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const bulk = useBulkAddProxiesMutation();
  const [ text, setText ] = useState('');
  const [ labels, setLabels ] = useState('');
  const [ scheme, setScheme ] = useState<ProxyScheme>('http');
  const [ updateExisting, setUpdateExisting ] = useState(false);
  const [ preview, setPreview ] = useState<AdminProxiesBulkResult | null>(null);
  const lineCount = text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
  const changes = (preview) ? preview.added + preview.updated : 0;

  const send = (apply: boolean) => bulk.mutate({proxies: text, labels: parseLabels(labels), scheme, update_existing: updateExisting, apply}, {
    onSuccess: (result) => {
      setPreview(result);
      if (result.applied && !result.failed) {
        toast(`Added ${result.added.toLocaleString()}` + ((result.updated) ? `, updated ${result.updated.toLocaleString()}` : '') + ' proxies');
        onClose();
      }
    },
  });
  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPreview(null);
    bulk.reset();
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !bulk.isPending && onClose()} className='max-w-2xl'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!bulk.isPending && lineCount) {
            send(!!preview && !preview.applied && 0 < changes);
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Add proxies</h2>
        <p className='mt-2 text-sm text-muted'>One per line. Passwords are stored encrypted and never shown again unless revealed.</p>

        <Field
          className='mt-4'
          label='Proxies'
          hint={<>
            <code className='font-mono'>ip:port:user:pass</code>, <code className='font-mono'>http://user:pass@ip:port</code>,{' '}
            <code className='font-mono'>user:pass@ip:port</code> or <code className='font-mono'>ip:port</code>. IPv6 in brackets.
          </>}
        >
          {(props) => (
            <textarea
              {...props}
              {...NO_AUTOFILL}
              className='input h-44 resize-y font-mono text-xs'
              spellCheck={false}
              placeholder={'203.0.113.10:8000:user:pass\nhttp://user:pass@203.0.113.11:8000\n# lines starting with # are skipped'}
              value={text}
              disabled={bulk.isPending}
              onChange={(event) => change(setText)(event.target.value)}
            />
          )}
        </Field>

        <div className='mt-4 grid grid-cols-2 gap-3'>
          <Field label='Labels' hint={(data.labels.length) ? `Comma separated. Existing: ${data.labels.map((item) => item.name).join(', ')}` : 'Comma separated, like geo, eu'}>
            {(props) => <input {...props} {...NO_AUTOFILL} className='input' value={labels} placeholder='geo' onChange={(event) => change(setLabels)(event.target.value)} disabled={bulk.isPending}/>}
          </Field>
          <Field label='Scheme' hint='For lines without one'>
            {(props) => (
              <select {...props} className='input' value={scheme} onChange={(event) => change(setScheme)(event.target.value as ProxyScheme)} disabled={bulk.isPending}>
                {SCHEMES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}
          </Field>
        </div>

        <label className='mt-3 flex items-center gap-2 text-sm text-muted'>
          <input type='checkbox' checked={updateExisting} onChange={(event) => change(setUpdateExisting)(event.target.checked)} disabled={bulk.isPending}/>
          Ones that exist already get the pasted password and these labels
        </label>

        {(bulk.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{errorMessage(bulk.error, 'Couldn’t read the list.')}</p>
        ) : null}

        {(preview) ? <BulkResults result={preview}/> : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={bulk.isPending}>{(preview?.applied) ? 'Close' : 'Cancel'}</button>
          {(preview && !preview.applied && changes) ? (
            <button type='submit' className='btn btn-primary' disabled={bulk.isPending}>
              {(bulk.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {(preview.added) ? `Add ${preview.added.toLocaleString()}` : ''}{(preview.added && preview.updated) ? ', ' : ''}{(preview.updated) ? `update ${preview.updated.toLocaleString()}` : ''}
            </button>
          ) : (!preview?.applied) ? (
            <button type='submit' className='btn btn-primary' disabled={bulk.isPending || !lineCount}>
              {(bulk.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              Preview {(lineCount) ? lineCount.toLocaleString() : ''}
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}


function BulkResults({ result }: {result: AdminProxiesBulkResult}) {
  return (
    <div className='mt-4'>
      <p className='text-sm text-fg'>
        {(result.applied) ? 'Added' : 'Would add'} <span className='font-semibold'>{result.added.toLocaleString()}</span>
        {(result.updated) ? <>, {(result.applied) ? 'updated' : 'update'} {result.updated.toLocaleString()}</> : null}
        {(result.skipped) ? <>, {result.skipped.toLocaleString()} skipped</> : null}
        {(result.failed) ? <>, <span className='text-danger-text'>{result.failed.toLocaleString()} can’t be read</span></> : null}
      </p>
      <ul className='mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-md border border-line bg-deep text-xs'>
        {result.results.map((item) => (
          <li key={item.line} className='flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5'>
            <span className='w-12 shrink-0 text-subtle tabular-nums'>line {item.line}</span>
            <Chip tone={BULK_OUTCOMES[item.outcome].tone}>{BULK_OUTCOMES[item.outcome].label}</Chip>
            {(item.proxy) ? <span className='font-mono text-fg'>{item.proxy}</span> : null}
            {(item.proxy && !item.has_password) ? <span className='text-subtle'>no password</span> : null}
            {(item.error) ? <span className='text-subtle'>{item.error}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}


// the same change on all of the selected ones
function EditProxiesDialog({ data, proxyIds, onClose }: {data: AdminIdentities, proxyIds: Array<number>, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const patch = usePatchProxiesMutation();
  const [ status, setStatus ] = useState<'' | 'active' | 'disabled'>('');
  const [ addLabels, setAddLabels ] = useState('');
  const [ removeLabels, setRemoveLabels ] = useState<Set<string>>(new Set());
  const [ username, setUsername ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ clearPassword, setClearPassword ] = useState(false);
  const selectedLabels = [...new Set(data.proxies.filter((proxy) => proxyIds.includes(proxy.id)).flatMap((proxy) => proxy.labels))].sort();
  const anything = status || addLabels.trim() || removeLabels.size || username || password || clearPassword;

  return (
    <Modal labelledBy={titleId} onClose={() => !patch.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (anything && !patch.isPending) {
            patch.mutate({
              proxy_ids: proxyIds,
              status: status || undefined,
              add_labels: parseLabels(addLabels),
              remove_labels: [...removeLabels],
              username: username || undefined,
              password: (clearPassword) ? undefined : password || undefined,
              clear_password: clearPassword || undefined,
            }, {
              onSuccess: (result) => {
                toast(`Updated ${result.updated.length.toLocaleString()} proxies` + ((result.failed.length) ? `, ${result.failed.length} failed` : ''));
                if (!result.failed.length) {
                  onClose();
                }
              },
            });
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Edit {proxyIds.length.toLocaleString()} proxies</h2>
        <p className='mt-2 text-sm text-muted'>Only what you fill in changes. Identities on them pick it up right away.</p>

        <div className='mt-4 grid grid-cols-2 gap-3'>
          <Field label='Status'>
            {(props) => (
              <select {...props} className='input' value={status} onChange={(event) => setStatus(event.target.value as '' | 'active' | 'disabled')} disabled={patch.isPending}>
                <option value=''>Leave as is</option>
                <option value='active'>Active</option>
                <option value='disabled'>Disabled (out of rotation)</option>
              </select>
            )}
          </Field>
          <Field label='Add labels' hint='Comma separated'>
            {(props) => <input {...props} {...NO_AUTOFILL} className='input' value={addLabels} onChange={(event) => setAddLabels(event.target.value)} disabled={patch.isPending}/>}
          </Field>
        </div>

        {(selectedLabels.length) ? (
          <div className='mt-3'>
            <p className='mb-1.5 text-sm text-fg'>Take labels off</p>
            <div className='flex flex-wrap gap-1.5'>
              {selectedLabels.map((name) => (
                <button
                  key={name}
                  type='button'
                  aria-pressed={removeLabels.has(name)}
                  className={cn('btn btn-sm', (removeLabels.has(name)) ? 'border border-danger/40 bg-danger/10 text-danger-text line-through' : 'btn-secondary')}
                  onClick={() => setRemoveLabels((current) => {
                    const next = new Set(current);
                    if (next.has(name)) {
                      next.delete(name);
                    } else {
                      next.add(name);
                    }
                    return next;
                  })}
                  disabled={patch.isPending}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className='mt-4 grid grid-cols-2 gap-3'>
          <Field label='New username' hint='For all of them, like a provider’s new login'>
            {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' value={username} onChange={(event) => setUsername(event.target.value)} disabled={patch.isPending}/>}
          </Field>
          <Field label='New password'>
            {(props) => <input {...props} {...NO_AUTOFILL} type='password' className='input font-mono' value={password} onChange={(event) => setPassword(event.target.value)} disabled={patch.isPending || clearPassword}/>}
          </Field>
        </div>
        <label className='mt-3 flex items-center gap-2 text-sm text-muted'>
          <input type='checkbox' checked={clearPassword} onChange={(event) => setClearPassword(event.target.checked)} disabled={patch.isPending}/>
          Remove their passwords
        </label>

        {(patch.isError) ? <p role='alert' className='mt-4 text-sm text-danger-text'>{errorMessage(patch.error, 'Couldn’t update the proxies.')}</p> : null}
        {(patch.data?.failed.length) ? (
          <ul className='mt-3 text-xs text-danger-text'>
            {patch.data.failed.map((item) => <li key={item.id}>#{item.id}: {item.error}</li>)}
          </ul>
        ) : null}

        <div className='mt-6 flex justify-end gap-2'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={patch.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={patch.isPending || !anything}>
            {(patch.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}


// a service without accounts on each selected proxy, or off them again
function AssignDialog({ data, proxyIds, onClose }: {data: AdminIdentities, proxyIds: Array<number>, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const assign = useAssignIdentitiesMutation();
  const unassign = useUnassignIdentitiesMutation();
  const services = data.services;
  const [ service, setService ] = useState(services.find((item) => item.service === 'geopy')?.service ?? services[0]?.service ?? '');
  const accounts = needsCookies(services.find((item) => item.service === service));
  const [ startDisabled, setStartDisabled ] = useState(false);
  const pending = assign.isPending || unassign.isPending;
  const chosen = data.proxies.filter((proxy) => proxyIds.includes(proxy.id));
  const have = chosen.filter((proxy) => proxy.identities.some((identity) => identity.service === service)).length;

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Assign {proxyIds.length.toLocaleString()} proxies</h2>
        <p className='mt-2 text-sm text-muted'>
          Each gets an identity of the service, so it starts using them. A proxy can be in any number of services.
        </p>
        {(accounts) ? (
          <p className='mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-fg'>
            {service} identities are accounts. These wait for their cookies (pending) and aren’t used until they have them:
            use Upload cookies on the <Link className='text-brand-text hover:underline' to={Routes.DASHBOARD_OWNER_IDENTITIES}>Identities tab</Link>.
            Removing from {service} only removes the ones still waiting.
          </p>
        ) : null}

        <Field className='mt-4' label='Service' hint={`${have.toLocaleString()} of them already have one`}>
          {(props) => (
            <select {...props} className='input' value={service} onChange={(event) => setService(event.target.value)} disabled={pending}>
              {services.map((item) => (
                <option key={item.service} value={item.service}>
                  {item.service}{(item.shared) ? ' (shared, random pick)' : ''}
                </option>
              ))}
            </select>
          )}
        </Field>
        {(!accounts) ? (
          <label className='mt-3 flex items-center gap-2 text-sm text-muted'>
            <input type='checkbox' checked={startDisabled} onChange={(event) => setStartDisabled(event.target.checked)} disabled={pending}/>
            Add them disabled
          </label>
        ) : null}

        {(assign.isError || unassign.isError) ? (
          <p role='alert' className='mt-4 text-sm text-danger-text'>{errorMessage(assign.error ?? unassign.error, 'Couldn’t change the assignments.')}</p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>Cancel</button>
          <button
            type='button'
            className='btn btn-sm border border-danger/40 bg-danger/10 text-danger-text hover:bg-danger/20 sm:btn'
            disabled={pending || !have}
            onClick={() => unassign.mutate({service, proxyIds}, {
              onSuccess: (result) => {
                toast(`Took ${result.removed.length.toLocaleString()} off ${service}` + ((result.kept.length) ? `, kept ${result.kept.length} with cookies` : ''));
                onClose();
              },
            })}
          >
            Remove from {service}
          </button>
          <button
            type='button'
            className='btn btn-primary'
            disabled={pending || !service || have === chosen.length}
            onClick={() => assign.mutate({service, proxyIds, status: (startDisabled) ? 'disabled' : 'active'}, {
              onSuccess: (result) => {
                toast(`Added ${result.added.length.toLocaleString()} to ${service}` + ((accounts) ? ', waiting for cookies' : '') + ((result.skipped.length) ? `, ${result.skipped.length} had one` : ''));
                onClose();
              },
            })}
          >
            {(assign.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Assign to {service}
          </button>
        </div>
      </div>
    </Modal>
  );
}


function DeleteProxiesDialog({ proxyIds, onClose, onDeleted }: {proxyIds: Array<number>, onClose: () => void, onDeleted: (ids: Array<number>) => void}) {
  const toast = useToast();
  const remove = useDeleteProxiesMutation();
  return (
    <ConfirmDialog
      title={`Delete ${proxyIds.length.toLocaleString()} proxies?`}
      description='Only the ones no identity uses are deleted, with their passwords. Remove or move their identities first for the rest.'
      confirmLabel='Delete unused'
      pending={remove.isPending}
      error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the proxies.') : null}
      onConfirm={() => remove.mutate(proxyIds, {
        onSuccess: (result) => {
          toast(`Deleted ${result.deleted.length.toLocaleString()}` + ((result.in_use.length) ? `, ${result.in_use.length} still in use` : ''));
          onDeleted(result.deleted);
          onClose();
        },
      })}
      onClose={() => {
        remove.reset();
        onClose();
      }}
    />
  );
}


function LabelsDialog({ data, onClose }: {data: AdminIdentities, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const rename = useRenameIdentityLabelMutation();
  const remove = useDeleteIdentityLabelMutation();
  const [ editing, setEditing ] = useState<{id: number, name: string} | null>(null);

  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Labels</h2>
        <p className='mt-2 text-sm text-muted'>Deleting one only takes it off its proxies.</p>
        <ul className='mt-4 divide-y divide-line rounded-md border border-line'>
          {data.labels.map((item) => (
            <li key={item.id} className='flex items-center gap-2 px-3 py-2'>
              {(editing?.id === item.id) ? (
                <form
                  className='flex flex-1 gap-2'
                  onSubmit={(event) => {
                    event.preventDefault();
                    rename.mutate({labelId: item.id, name: editing.name}, {onSuccess: () => setEditing(null)});
                  }}
                >
                  <input {...NO_AUTOFILL} className='input flex-1' aria-label='Name' value={editing.name} onChange={(event) => setEditing({id: item.id, name: event.target.value})}/>
                  <button type='submit' className='btn btn-primary btn-sm' disabled={rename.isPending || !editing.name.trim()}>Save</button>
                </form>
              ) : (
                <>
                  <Chip tone='brand'>{item.name}</Chip>
                  <span className='text-xs text-subtle'>{item.proxies.toLocaleString()} proxies</span>
                  <button type='button' className='btn btn-ghost btn-sm ml-auto' onClick={() => setEditing({id: item.id, name: item.name})}>Rename</button>
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm text-danger-text'
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(item.id, {onSuccess: () => toast(`Deleted the ${item.name} label`)})}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {(rename.isError) ? <p role='alert' className='mt-3 text-sm text-danger-text'>{errorMessage(rename.error, 'Couldn’t rename it.')}</p> : null}
        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}


// one proxy: its credentials (password behind a reveal), what uses it, and editing it
function ProxyModal({ proxy, onClose }: {proxy: IdentityProxyItem, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const now = useNow();
  const patch = usePatchProxyMutation();
  const [ editing, setEditing ] = useState(false);
  const [ form, setForm ] = useState(() => ({
    scheme: proxy.scheme,
    host: proxy.host,
    port: String(proxy.port),
    username: proxy.username,
    password: '',
    clearPassword: false,
    labels: proxy.labels.join(', '),
    status: proxy.status,
  }));
  const set = (field: keyof typeof form) => (event: {target: {value: string}}) => setForm({...form, [field]: event.target.value});
  const port = Number(form.port);
  const valid = !!form.host.trim() && Number.isInteger(port) && 0 < port && port < 65536;
  const moved = form.host.trim() !== proxy.host || port !== proxy.port || form.scheme !== proxy.scheme || form.username !== proxy.username;

  return (
    <Modal labelledBy={titleId} onClose={() => !patch.isPending && onClose()} className='max-w-xl'>
      <div className='p-5 sm:p-6'>
        <div className='flex flex-wrap items-center gap-2 pr-10'>
          <h2 id={titleId} className='font-mono text-lg font-semibold text-white'>{proxyAddress(proxy)}</h2>
          {(proxy.status === 'disabled') ? <Chip>Disabled</Chip> : <Chip tone='success'>Active</Chip>}
          {(proxy.down) ? <Chip tone='warning'>Down</Chip> : null}
          <LabelChips labels={proxy.labels}/>
        </div>

        <div className='mt-4 rounded-md border border-line bg-deep p-4'>
          <ProxyCredentials proxy={proxy} now={now}/>
        </div>

        <div className='mt-4'>
          <p className='mb-1.5 text-sm font-medium text-fg'>Used by</p>
          {(proxy.identities.length) ? (
            <ul className='flex flex-wrap gap-1.5'>
              {proxy.identities.map((identity) => (
                <li key={identity.id}>
                  <Link className='font-mono text-xs text-brand-text hover:underline' to={`${Routes.DASHBOARD_OWNER_IDENTITIES}?${new URLSearchParams({q: identity.id})}`}>
                    {identity.id}
                  </Link>
                  {(identity.status !== 'active') ? <span className='ml-1 text-xs text-subtle'>({identity.status})</span> : null}
                </li>
              ))}
            </ul>
          ) : <p className='text-xs text-subtle'>Nothing yet. Select it on the list to assign it, or add an account on it on the Identities page.</p>}
        </div>

        {(editing) ? (
          <form
            className='mt-5 border-t border-line pt-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (valid && !patch.isPending) {
                patch.mutate({proxyId: proxy.id, body: {
                  scheme: form.scheme,
                  host: form.host.trim(),
                  port,
                  username: form.username,
                  password: (form.clearPassword) ? undefined : form.password || undefined,
                  clear_password: form.clearPassword || undefined,
                  labels: parseLabels(form.labels),
                  status: form.status,
                }}, {
                  onSuccess: () => {
                    toast(`Saved ${proxyAddress({host: form.host.trim(), port})}`);
                    setEditing(false);
                  },
                });
              }
            }}
          >
            <div className='grid grid-cols-3 gap-3'>
              <Field label='Scheme'>
                {(props) => (
                  <select {...props} className='input' value={form.scheme} onChange={set('scheme')} disabled={patch.isPending}>
                    {SCHEMES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                )}
              </Field>
              <Field label='Host'>
                {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' value={form.host} onChange={set('host')} disabled={patch.isPending}/>}
              </Field>
              <Field label='Port'>
                {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' inputMode='numeric' value={form.port} onChange={set('port')} disabled={patch.isPending}/>}
              </Field>
              <Field label='Username'>
                {(props) => <input {...props} {...NO_AUTOFILL} className='input font-mono' value={form.username} onChange={set('username')} disabled={patch.isPending}/>}
              </Field>
              <Field label='New password' hint='Empty keeps it'>
                {(props) => <input {...props} {...NO_AUTOFILL} type='password' className='input font-mono' value={form.password} onChange={set('password')} disabled={patch.isPending || form.clearPassword}/>}
              </Field>
              <Field label='Status'>
                {(props) => (
                  <select {...props} className='input' value={form.status} onChange={set('status')} disabled={patch.isPending}>
                    <option value='active'>Active</option>
                    <option value='disabled'>Disabled</option>
                  </select>
                )}
              </Field>
            </div>
            <Field className='mt-3' label='Labels' hint='Comma separated'>
              {(props) => <input {...props} {...NO_AUTOFILL} className='input' value={form.labels} onChange={set('labels')} disabled={patch.isPending}/>}
            </Field>
            <label className='mt-3 flex items-center gap-2 text-sm text-muted'>
              <input type='checkbox' checked={form.clearPassword} onChange={(event) => setForm({...form, clearPassword: event.target.checked})} disabled={patch.isPending}/>
              Remove its password
            </label>
            {(moved && proxy.identities.length) ? (
              <p className='mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-fg'>
                Its {proxy.identities.length} identit{(proxy.identities.length === 1) ? 'y moves' : 'ies move'} to the new address too, accounts on it
                then sign in from a different ip.
              </p>
            ) : null}
            {(patch.isError) ? <p role='alert' className='mt-3 text-sm text-danger-text'>{errorMessage(patch.error, 'Couldn’t save the proxy.')}</p> : null}
            <div className='mt-4 flex justify-end gap-2'>
              <button type='button' className='btn btn-secondary btn-sm' onClick={() => setEditing(false)} disabled={patch.isPending}>Cancel</button>
              <button type='submit' className='btn btn-primary btn-sm' disabled={patch.isPending || !valid}>
                {(patch.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className='mt-6 flex gap-2'>
            <button type='button' className='btn btn-secondary btn-sm' onClick={() => setEditing(true)}>
              <Pencil className='size-4'/>
              Edit
            </button>
            <span className='ml-auto self-center text-xs text-subtle'>#{proxy.id}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
