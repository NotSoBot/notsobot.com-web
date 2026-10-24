// Bot owners only: the music nodes (notsobot.voice) the bot plays music through. The bot gets all of them (with their
// passwords) from the api, disabled ones drain (no new servers, the ones on them move off between tracks). A password
// only shows here when a node is made, revealed or given a new one. One compact row per node with its live counts

import { Activity, Check, KeyRound, Pencil, Plus, RadioTower, Trash2, X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { VoiceNode, VoiceNodeStats, VoiceNodeStatsItem, VoiceNodeTest, VoiceNodeWithPassword } from '@/lib/api';
import {
  errorMessage,
  useAdminVoiceNodesQuery,
  useAdminVoiceNodesStatsQuery,
  useCreateVoiceNodeMutation,
  useDeleteVoiceNodeMutation,
  useEditVoiceNodeMutation,
  useResetVoiceNodePasswordMutation,
  useRevealVoiceNodeMutation,
  useTestVoiceNodeMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatUptime, NO_AUTOFILL } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Field, Skeleton, Toggle } from '../ui';
import { Chip, CopyButton, InfoTip } from './adminUi';


export function OwnerVoiceNodesPage() {
  const { data, isPending, isError, error, isRefetching, refetch } = useAdminVoiceNodesQuery();
  const toast = useToast();
  const remove = useDeleteVoiceNodeMutation();
  const [ adding, setAdding ] = useState(false);
  const [ editing, setEditing ] = useState<VoiceNode | null>(null);
  const [ deleting, setDeleting ] = useState<VoiceNode | null>(null);
  // a node's password: just made (shown as is), or one to reveal
  const [ password, setPassword ] = useState<{node: VoiceNode, created?: VoiceNodeWithPassword} | null>(null);
  // each node's last test, shown on its row until the page is left
  const test = useTestVoiceNodeMutation();
  const [ tests, setTests ] = useState<Record<string, NodeTestState>>({});
  const runTest = (node: VoiceNode) => {
    setTests((current) => ({...current, [node.id]: 'testing'}));
    // its own promise per node (`mutate`'s callbacks only fire for the latest call), several can be tested at once
    test.mutateAsync(node.id).then(
      (result) => setTests((current) => ({...current, [node.id]: result})),
      (error) => setTests((current) => ({...current, [node.id]: {failed: errorMessage(error, 'Couldn’t test the node.')}})),
    );
  };

  const nodes = data?.nodes ?? [];
  // live counts, every few seconds
  const { data: statsData } = useAdminVoiceNodesStatsQuery();
  const stats = new Map((statsData?.nodes ?? []).map((item) => [item.id, item]));
  const totals = (statsData?.nodes ?? []).reduce((total, item) => ({
    paused: total.paused + (item.stats?.paused ?? 0),
    players: total.players + (item.stats?.players ?? 0),
    playing: total.playing + (item.stats?.playing ?? 0),
  }), {paused: 0, players: 0, playing: 0});

  return (
    <>
      <DashboardHeader
        title='Voice Nodes'
        description={
          <span className='inline-flex flex-wrap items-center gap-x-1.5'>
            {(statsData) ?
              `${totals.playing.toLocaleString()} playing • ${totals.paused.toLocaleString()} paused • ${totals.players.toLocaleString()} players` :
              'The music nodes the bot plays music through.'}
            <InfoTip text='Each server’s music goes on the enabled node with the fewest servers. Disabling a node drains it: its servers move to an enabled node when their next song starts, delete it once it shows 0 players.'/>
          </span>
        }
      >
        <button type='button' className='btn btn-primary' onClick={() => setAdding(true)}>
          <Plus className='size-4'/>
          Add node
        </button>
      </DashboardHeader>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError && !nodes.length) ? (
        <ErrorPanel title='Couldn’t load the voice nodes' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!nodes.length) ? (
        <EmptyState icon={<RadioTower className='size-10'/>} title='No voice nodes yet'>
          Add one to play music. Its password goes in the node’s <code>VOICE_PASSWORD</code>.
        </EmptyState>
      ) : (
        <ul className='card divide-y divide-line'>
          {nodes.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              stats={stats.get(node.id)}
              test={tests[node.id]}
              onTest={() => runTest(node)}
              onPassword={() => setPassword({node})}
              onEdit={() => setEditing(node)}
              onDelete={() => setDeleting(node)}
            />
          ))}
        </ul>
      )}

      {(adding) ? (
        <NodeDialog
          onClose={() => setAdding(false)}
          onCreated={(created) => {
            setAdding(false);
            setPassword({node: created, created});
          }}
        />
      ) : null}
      {(editing) ? <NodeDialog node={editing} onClose={() => setEditing(null)}/> : null}
      {(password) ? <PasswordDialog node={password.node} created={password.created} onClose={() => setPassword(null)}/> : null}
      {(deleting) ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          description='The bot stops putting servers on it, the ones on it move to another node when their next song starts.'
          confirmLabel='Delete node'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the node.') : null}
          onConfirm={() => remove.mutate(deleting.id, {
            onSuccess: () => {
              toast(`Deleted ${deleting.name}`);
              remove.reset();
              setDeleting(null);
            },
          })}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}


type NodeTestState = VoiceNodeTest | 'testing' | {failed: string};

// one node: a status dot, its name and url, the live counts and icon actions on one line, the details under it
function NodeRow({ node, stats: item, test, onTest, onPassword, onEdit, onDelete }: {
  node: VoiceNode,
  stats?: VoiceNodeStatsItem,
  test?: NodeTestState,
  onTest: () => void,
  onPassword: () => void,
  onEdit: () => void,
  onDelete: () => void,
}) {
  const stats = item?.stats ?? null;
  const offline = !!item && !stats;
  const draining = !node.enabled && !!stats && 0 < stats.players;
  const status = (offline) ? 'Offline' : (!stats) ? 'Checking…' : (draining) ? 'Draining' : (node.enabled) ? 'Online' : 'Disabled';
  // phones show the last test on the Test button, there's no room for its chip
  const tested = describeTest(test);
  const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024)).toLocaleString()} MB`;
  // the full url is its tooltip
  const host = node.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const workersTitle = (stats) ?
    `${stats.workers.length} workers (players each: ${stats.workers.map((worker) => worker.players).join(', ')}), load across ${stats.cpu.cores} cores` :
    undefined;

  return (
    <li className='px-4 py-2.5 first:rounded-t-[inherit] last:rounded-b-[inherit]'>
      <div className='flex items-center gap-3'>
        <span
          role='img'
          aria-label={status}
          title={status}
          className={cn('size-2 shrink-0 rounded-full', {
            'bg-danger': offline,
            'bg-subtle': !offline && (!stats || (!node.enabled && !draining)),
            'bg-success': !offline && !!stats && node.enabled,
            'bg-warning': draining,
          })}
        />
        <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
          <span className={cn('shrink-0 font-medium', (node.enabled) ? 'text-fg' : 'text-subtle')}>{node.name}</span>
          {(!node.enabled) ? <Chip className='shrink-0' tone={(draining) ? 'warning' : 'neutral'}>{(draining) ? 'Draining' : 'Disabled'}</Chip> : null}
          <span className='min-w-0 truncate font-mono text-xs text-muted' title={node.url}>{host}</span>
        </div>
        <div className='flex shrink-0 items-center'>
          <TestChip result={test}/>
          <IconButton label='Test' onClick={onTest} disabled={test === 'testing'}>
            {(test === 'testing') ? (
              <Spinner className='size-4'/>
            ) : (tested) ? (
              <>
                <Activity aria-hidden className='size-4 max-sm:hidden'/>
                {(tested.failed) ?
                  <X aria-hidden className='size-4 text-danger sm:hidden'/> :
                  <Check aria-hidden className='size-4 text-success sm:hidden'/>}
              </>
            ) : (
              <Activity aria-hidden className='size-4'/>
            )}
          </IconButton>
          <IconButton label='Password' onClick={onPassword}><KeyRound aria-hidden className='size-4'/></IconButton>
          <IconButton label='Edit' onClick={onEdit}><Pencil aria-hidden className='size-4'/></IconButton>
          <IconButton label='Delete' onClick={onDelete} className='text-danger hover:bg-danger/10'><Trash2 aria-hidden className='size-4'/></IconButton>
        </div>
      </div>
      {/* the counts under the name, centered in the row */}
      {(stats) ? <Counts className='mt-0.5 block truncate text-center text-sm text-muted' stats={stats}/> : null}
      {/* one line, most useful first (how loaded it is, then how reachable), cut off with … when it doesn't fit (phones
          skip sessions/workers). uptime and the date stay whole on the right */}
      <div className='mt-0.5 flex items-baseline gap-3 pl-5 text-xs tabular-nums text-subtle'>
        <p className='min-w-0 flex-1 truncate' title={(offline) ? item?.error ?? undefined : workersTitle}>
          {(offline) ? (
            <span className='text-danger'>{item?.error}</span>
          ) : (stats) ? (
            <>
              <span>{Math.round(stats.cpu.load * 100)}% cpu</span>
              <span>{' • '}{megabytes(stats.memory.rss)}</span>
              {(item?.latency != null) ? <span>{' • '}{item.latency.toLocaleString()} ms</span> : null}
              <span className='max-sm:hidden'>{' • '}{stats.sessions.toLocaleString()} {(stats.sessions === 1) ? 'session' : 'sessions'}</span>
              <span className='max-sm:hidden'>{' • '}{stats.workers.length.toLocaleString()} {(stats.workers.length === 1) ? 'worker' : 'workers'}</span>
            </>
          ) : null}
        </p>
        <span className='ml-auto shrink-0'>
          {(stats) ? `up ${formatUptime(stats.uptime)} • ` : null}added {formatDate(node.created)}
        </span>
      </div>
    </li>
  );
}

function Counts({ stats, className }: {stats: VoiceNodeStats, className?: string}) {
  return (
    <span className={cn('tabular-nums', className)}>
      <strong className='text-fg'>{stats.playing.toLocaleString()}</strong> playing
      {' • '}{stats.paused.toLocaleString()} paused
      {' • '}{stats.players.toLocaleString()} {(stats.players === 1) ? 'player' : 'players'}
    </span>
  );
}

function IconButton({ label, onClick, disabled, className, children }: {
  label: string,
  onClick: () => void,
  disabled?: boolean,
  className?: string,
  children: ReactNode,
}) {
  return (
    <button type='button' className={cn('btn btn-ghost btn-sm px-2', className)} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

// a finished test, short (how long it took, or that it failed) and whole (its version, or why not)
function describeTest(result?: NodeTestState): {failed: boolean, short: string, message: string} | null {
  if (!result || result === 'testing') {
    return null;
  }
  if ('failed' in result) {
    return {failed: true, short: 'Failed', message: `Test failed: ${result.failed}`};
  }
  if (!result.ok) {
    const latency = (result.latency !== null) ? ` (${result.latency.toLocaleString()} ms)` : '';
    return {failed: true, short: 'Failed', message: `Test failed: ${result.error ?? 'Unknown error'}${latency}`};
  }
  const latency = `${(result.latency ?? 0).toLocaleString()} ms`;
  return {failed: false, short: latency, message: `Test ok, ${result.version} in ${latency}`};
}

// a node's last test as a chip next to its Test button (until the page is left), the whole message is its tooltip and
// what screen readers hear. Phones don't have the room (it would cut off the Draining chip), the button's icon shows
// it there instead. Nothing while testing, the button's spinner says so
function TestChip({ result }: {result?: NodeTestState}) {
  const test = describeTest(result);
  if (!test) {
    return null;
  }
  return (
    <span role={(test.failed) ? 'alert' : 'status'}>
      <span className='sr-only'>{test.message}</span>
      <Chip className='mr-1 gap-1 tabular-nums max-sm:hidden' tone={(test.failed) ? 'danger' : 'success'} title={test.message}>
        {(test.failed) ? <X aria-hidden className='size-3'/> : <Check aria-hidden className='size-3'/>}
        <span aria-hidden>{test.short}</span>
      </Chip>
    </span>
  );
}


// adding a node, or editing one (`node`): a new password there is optional, it keeps the old one without
function NodeDialog({ node, onClose, onCreated }: {
  node?: VoiceNode,
  onClose: () => void,
  onCreated?: (node: VoiceNodeWithPassword) => void,
}) {
  const titleId = useId();
  const toast = useToast();
  const create = useCreateVoiceNodeMutation();
  const edit = useEditVoiceNodeMutation();
  const mutation = (node) ? edit : create;
  const [ form, setForm ] = useState(() => ({
    enabled: node?.enabled ?? true,
    name: node?.name ?? '',
    password: '',
    url: node?.url ?? '',
  }));

  const name = form.name.trim();
  const url = form.url.trim();
  const urlValid = /^https?:\/\/[^\s/]+/.test(url);
  const passwordValid = !form.password || 8 <= form.password.length;
  const valid = !!name && urlValid && passwordValid;

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || mutation.isPending) {
            return;
          }
          const body = {enabled: form.enabled, name, password: form.password || undefined, url};
          if (node) {
            edit.mutate({nodeId: node.id, body}, {
              onSuccess: () => {
                toast(`Saved ${name}`);
                onClose();
              },
            });
          } else {
            create.mutate(body, {onSuccess: (created) => onCreated?.(created)});
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{(node) ? `Edit ${node.name}` : 'Add a voice node'}</h2>

        <Field className='mt-4' label='Name' hint='Shown here and in the bot’s logs, like a region.'>
          {(props) => (
            <input
              {...props}
              {...NO_AUTOFILL}
              className='input'
              maxLength={64}
              value={form.name}
              disabled={mutation.isPending}
              onChange={(event) => setForm({...form, name: event.target.value})}
            />
          )}
        </Field>

        <Field
          className='mt-4'
          label='Url'
          hint='Where the bot reaches it, like http://10.0.0.5:2333.'
          error={(url && !urlValid) ? 'That has to start with http:// or https://.' : undefined}
        >
          {(props) => (
            <input
              {...props}
              {...NO_AUTOFILL}
              className='input font-mono'
              inputMode='url'
              value={form.url}
              disabled={mutation.isPending}
              onChange={(event) => setForm({...form, url: event.target.value})}
            />
          )}
        </Field>

        <Field
          className='mt-4'
          label={(node) ? 'New password' : 'Password'}
          hint={(node) ? 'Leave it empty to keep the current one.' : 'Leave it empty for a random one.'}
          error={(!passwordValid) ? 'At least 8 characters.' : undefined}
        >
          {(props) => (
            <input
              {...props}
              {...NO_AUTOFILL}
              className='input font-mono'
              type='password'
              autoComplete='new-password'
              value={form.password}
              disabled={mutation.isPending}
              onChange={(event) => setForm({...form, password: event.target.value})}
            />
          )}
        </Field>

        <div className='mt-4'>
          <Toggle
            checked={form.enabled}
            onChange={(enabled) => setForm({...form, enabled})}
            label='Enabled'
            description='Disabled nodes get no new servers, and the ones on them move off between songs.'
            disabled={mutation.isPending}
          />
        </div>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, (node) ? 'Couldn’t save the node.' : 'Couldn’t add the node.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || !valid}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(node) ? 'Save' : 'Add node'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// a node's password: the one it was just made with, or revealed when this opens. Giving it a new one replaces it
function PasswordDialog({ node, created, onClose }: {node: VoiceNode, created?: VoiceNodeWithPassword, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const reveal = useRevealVoiceNodeMutation();
  const reset = useResetVoiceNodePasswordMutation();
  const [ confirmingReset, setConfirmingReset ] = useState(false);

  useEffect(() => {
    if (!created) {
      reveal.mutate(node.id);
    }
    // only once, when it opens
  }, []);

  const password = reset.data?.password ?? created?.password ?? reveal.data?.password;
  const pending = reveal.isPending || reset.isPending;
  const failed = (reset.isError) ? errorMessage(reset.error, 'Couldn’t give it a new password.') :
    (reveal.isError) ? errorMessage(reveal.error, 'Couldn’t reveal the password.') : null;

  return (
    <Modal labelledBy={titleId} onClose={() => !reset.isPending && onClose()} className='max-w-md'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{node.name}’s password</h2>
        <p className='mt-2 text-sm text-muted'>
          {(created || reset.data) ?
            'Set it as the node’s VOICE_PASSWORD, the bot can’t connect to it until it matches.' :
            'The node’s VOICE_PASSWORD, the bot uses it to connect.'}
        </p>

        <div className='mt-4 flex min-h-11 items-center gap-2 rounded-md border border-line bg-deep px-3 py-2'>
          {(password) ? (
            <>
              <code className='min-w-0 flex-1 break-all font-mono text-sm text-fg select-all'>{password}</code>
              <CopyButton value={password}/>
            </>
          ) : (pending) ? <Spinner className='size-4'/> : <span className='text-sm text-subtle'>Not shown</span>}
        </div>

        {(failed) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{failed}</p>
        ) : null}

        {(confirmingReset) ? (
          <div className='mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
            The bot can’t connect to {node.name} until it has the new one. Servers already playing on it stop when the
            bot next reconnects.
          </div>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
          {(confirmingReset) ? (
            <button
              type='button'
              className='btn btn-sm border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
              disabled={reset.isPending}
              onClick={() => reset.mutate(node.id, {
                onSuccess: () => {
                  toast(`Gave ${node.name} a new password`);
                  setConfirmingReset(false);
                },
              })}
            >
              {(reset.isPending) ? <Spinner className='size-4'/> : null}
              Yes, make a new one
            </button>
          ) : (
            <button type='button' className='btn btn-ghost btn-sm' disabled={pending} onClick={() => setConfirmingReset(true)}>
              New password
            </button>
          )}
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={reset.isPending}>Done</button>
        </div>
      </div>
    </Modal>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 3}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-32'/>
            <Skeleton className='h-3 w-56'/>
          </div>
          <Skeleton className='h-7 w-48 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
