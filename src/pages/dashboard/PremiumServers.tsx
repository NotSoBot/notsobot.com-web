// The servers the user gave their premium plus perks to (premium server slots). A server only gets premium this way,
// owning one doesn't give it anything. The dashboard can only add guilds, group dms are added with the bot. Plus AI
// subscribers can stack more than one slot on a server, each raises its NotSoAI limit.

import { Layers, Lock, MessagesSquare, Plus, Server, Trash2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import type { PremiumServer, UserGuildSummary } from '@/lib/api';
import {
  errorMessage,
  isDiscordGrantError,
  isScopeMismatch,
  useDeleteMePremiumServerMutation,
  useMeGuildsQuery,
  useMePremiumServersQuery,
  usePutMePremiumServerMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatExactDateTime, toDate } from '@/lib/utils';

import { Chip } from './admin/adminUi';
import { hasPremiumPlusAI } from './premium';
import { GuildIcon } from './servers/GuildIcon';
import { ScopeMismatchCard } from './servers/ServersPage';
import { EmptyState, ErrorPanel, Skeleton } from './ui';


// the api's `PREMIUM_SERVER_SWAP_COOLDOWN`, only used to explain the lock before a server is added
const LOCK_HOURS = 24;
// the lock only lasts a day, so the time matters more than the year
const LOCK_FORMAT: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'};
// the api's `MAX_SERVER_AI_MESSAGES`, NotSoAI messages every 12 hours each Plus AI slot gives a server
const SERVER_AI_MESSAGES_PER_SLOT = 50;


function serverName(server: PremiumServer): string {
  return server.guild?.name || ((server.guild) ? 'Unknown server' : 'Group DM or unknown server');
}


export function PremiumServers() {
  const { data, isPending, isError, error, isRefetching, refetch } = useMePremiumServersQuery();
  const { user } = useAuth();
  const toast = useToast();
  const remove = useDeleteMePremiumServerMutation();
  const stack = usePutMePremiumServerMutation();
  const [ adding, setAdding ] = useState(false);
  const [ removing, setRemoving ] = useState<PremiumServer | null>(null);

  const items = data?.items ?? [];
  const full = !!data && data.limit !== null && data.limit <= data.used;
  // only Plus AI makes a second slot on a server worth anything (more NotSoAI messages)
  const canStack = !!data?.active && !full && hasPremiumPlusAI(user);

  const confirmRemove = () => {
    if (!removing) {
      return;
    }
    remove.mutate(removing.server_id, {
      onSuccess: () => {
        toast((1 < removing.slots) ? 'Took one of your slots off of that server' : 'Premium taken off of that server');
        setRemoving(null);
      },
    });
  };

  const addSlot = (server: PremiumServer) => {
    stack.mutate(server.server_id, {
      onSuccess: () => toast(`${serverName(server)} has ${server.slots + 1} of your slots now`),
      onError: (stackError) => toast(errorMessage(stackError, 'Couldn’t add another slot.'), 'error'),
    });
  };

  return (
    <section className='mt-8'>
      <div className='mb-3 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 className='section-label'>Servers with your premium</h2>
          <p className='mt-1 text-sm text-subtle'>
            {(data?.limit === null) ? (
              'As an owner, you can give as many servers as you want your premium perks.'
            ) : (
              `NotSoPremium Plus gives you ${(data) ? data.limit.toLocaleString() : 'a couple of'} premium server slots.`
            )}
            {' '}Owning a server doesn’t give it premium, so give it one of yours. With Plus AI you can stack slots on one server,
            each adds {SERVER_AI_MESSAGES_PER_SLOT} NotSoAI messages every 12 hours.
            {' '}
            <Link to={`${Routes.PREMIUM}#premium-servers`} className='text-brand hover:underline'>See what a server gets</Link>
          </p>
        </div>
        {(data?.active) ? (
          <button
            type='button'
            className='btn btn-sm btn-primary'
            disabled={full}
            title={(full) ? 'All of your slots are in use, remove one first' : undefined}
            onClick={() => setAdding(true)}
          >
            <Plus className='size-4'/>
            Add server
          </button>
        ) : null}
      </div>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your servers' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <>
          {(!data.active) ? (
            <p className='mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
              {(items.length) ? (
                'You don’t have NotSoPremium Plus right now, so these servers aren’t getting anything until you do.'
              ) : (
                'Server slots come with NotSoPremium Plus and Plus AI.'
              )}
            </p>
          ) : null}
          {(!items.length) ? (
            <EmptyState icon={<Server className='size-10'/>} title='No servers yet'>
              {(data.active) ? (
                <>Add one here, or use <code className='text-fg'>/settings premium-servers add</code> in the server (or group DM).</>
              ) : (
                'Subscribe in Discord to give servers your premium.'
              )}
            </EmptyState>
          ) : (
            <>
              <p className='mb-3 text-sm text-subtle'>{data.used.toLocaleString()} {(data.limit === null) ? '' : `of ${data.limit.toLocaleString()} `}slots used</p>
              <ul className='card divide-y divide-line'>
                {items.map((server) => (
                  <ServerRow
                    key={server.server_id}
                    server={server}
                    active={data.active}
                    // the dashboard can only add guilds, a group dm's extra slot is added with the bot
                    onStack={(canStack && server.guild) ? () => addSlot(server) : null}
                    stacking={stack.isPending && stack.variables === server.server_id}
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

      {(removing) ? (
        <ConfirmDialog
          title={(1 < removing.slots) ? `Take one of your slots off of ${serverName(removing)}?` : `Take your premium off of ${serverName(removing)}?`}
          description={(1 < removing.slots) ? (
            `It keeps your other ${(removing.slots === 2) ? 'slot' : 'slots'}, but gets ${SERVER_AI_MESSAGES_PER_SLOT} fewer NotSoAI messages every 12 hours.`
          ) : (
            'It loses your premium perks right away. You can give your slot to another server after.'
          )}
          confirmLabel='Remove'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t remove the server.') : null}
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


function ServerRow({ server, active, onStack, stacking, onRemove }: {
  server: PremiumServer,
  active: boolean,
  onStack: (() => void) | null,
  stacking: boolean,
  onRemove: () => void,
}) {
  const name = serverName(server);
  // the lock only matters while they have premium plus, the api lets them remove it any time otherwise
  const locked = active && Date.now() < toDate(server.removable_at).getTime();

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
            <Chip tone='brand' className='gap-1' title={`${server.slots * SERVER_AI_MESSAGES_PER_SLOT} NotSoAI messages every 12 hours from your slots`}>
              <Layers aria-hidden className='size-3'/>
              {server.slots} slots
            </Chip>
          ) : null}
          {(locked) ? (
            <Chip className='gap-1' title={`Servers are locked in for ${LOCK_HOURS} hours after getting your premium`}>
              <Lock aria-hidden className='size-3'/>
              Locked until {formatDate(server.removable_at, LOCK_FORMAT)}
            </Chip>
          ) : null}
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          <span title={formatExactDateTime(server.created)}>Added {formatDate(server.created)}</span>
          <span className='font-mono'>{server.server_id}</span>
        </div>
      </div>
      {(onStack) ? (
        <button
          type='button'
          className='btn btn-sm btn-secondary shrink-0'
          disabled={stacking}
          title={`Stack another slot here for ${SERVER_AI_MESSAGES_PER_SLOT} more NotSoAI messages every 12 hours`}
          onClick={onStack}
          aria-label={`Add another slot to ${name}`}
        >
          {(stacking) ? <Spinner className='size-4'/> : <Layers className='size-4'/>}
          <span className='hidden sm:inline'>Add slot</span>
        </button>
      ) : null}
      <button
        type='button'
        className='btn btn-sm btn-secondary shrink-0'
        disabled={locked}
        title={(locked) ? `Can be removed ${formatDate(server.removable_at)}` : undefined}
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        <Trash2 className='size-4'/>
        <span className='hidden sm:inline'>Remove</span>
      </button>
    </li>
  );
}


function AddServerDialog({ taken, onClose }: {taken: Array<string>, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const guilds = useMeGuildsQuery();
  const put = usePutMePremiumServerMutation();
  const [ query, setQuery ] = useState('');
  const [ pendingId, setPendingId ] = useState<string | null>(null);

  const available = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (guilds.data ?? [])
      .filter((guild) => !taken.includes(guild.id))
      .filter((guild) => !search || guild.name.toLowerCase().includes(search) || guild.id === search);
  }, [guilds.data, taken, query]);

  const add = (guild: UserGuildSummary) => {
    setPendingId(guild.id);
    put.mutate(guild.id, {
      onSuccess: () => {
        toast(`${guild.name} has your premium now`);
        onClose();
      },
      onSettled: () => setPendingId(null),
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !put.isPending && onClose()} className='max-w-lg'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Give a server your premium</h2>
        <p className='mt-2 text-sm text-muted'>
          Servers you share with NotSoBot. Once added, a server can’t be removed for {LOCK_HOURS} hours.
        </p>

        {(put.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(put.error, 'Couldn’t give that server your premium.')}
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
            <ErrorPanel title='Couldn’t load your servers' message={errorMessage(guilds.error)} onRetry={() => guilds.refetch()} retrying={guilds.isRefetching}/>
          ) : (
            <>
              <SearchInput value={query} onValueChange={setQuery} placeholder='Search your servers' size='sm' aria-label='Search your servers'/>
              {(!available.length) ? (
                <p className='mt-4 text-center text-sm text-subtle'>
                  {(query) ? 'No servers match that.' : 'Every server you share with NotSoBot already has your premium.'}
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
                        {(pendingId === guild.id) ? <Spinner className='size-4'/> : null}
                        Give premium
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
