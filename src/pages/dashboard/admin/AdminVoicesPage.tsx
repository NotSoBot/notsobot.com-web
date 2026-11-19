import { AudioLines, ChevronDown, Pencil, Server, X } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchParamState, useStepBackFromEmptyPage } from '@/hooks/useSearchParamState';
import { api, VoiceCloneTypes, type AdminVoice } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminVoicesQuery, usePatchAdminVoiceMutation } from '@/lib/api/dashboardQueries';
import { cn, formatMemory, formatNumber } from '@/lib/utils';

import { GuildIcon } from '../servers/GuildIcon';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { RenameVoiceDialog, voicePlatformLabel } from '../voices/RenameVoiceDialog';
import { ClipDownload, ClipPlayer, formatDuration } from '../voices/VoiceList';
import { adminServerPath, adminUserPath, Chip, CopyableValue, ExactDate, FilterButton, FiltersButton, Pagination, UserCell } from './adminUi';


const OWNER_FILTERS = [
  {value: 'any', label: 'Anyone'},
  {value: 'user', label: 'Users’ own'},
  {value: 'server', label: 'Servers’'},
] as const;

// the platforms the api has, listed even when the current filters leave none of one
const KNOWN_PLATFORMS: Array<number> = [VoiceCloneTypes.ZONOS3, VoiceCloneTypes.FISH_AUDIO, VoiceCloneTypes.ELEVENLABS];

const COLUMNS = 6;


export function AdminVoicesPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const query = searchParams.get('q') || '';
  const userId = searchParams.get('user_id') || '';
  const serverId = searchParams.get('server_id') || '';
  const ownerParam = searchParams.get('owner');
  const owner = (ownerParam === 'user' || ownerParam === 'server') ? ownerParam : null;
  const platformParam = searchParams.get('platform');
  const platformType = (platformParam && /^\d+$/.test(platformParam)) ? Number(platformParam) : null;
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminVoicesQuery({
    query: debouncedQuery,
    userId,
    serverId,
    owner,
    platformType,
    page,
  });
  const mutation = usePatchAdminVoiceMutation();
  const [ renaming, setRenaming ] = useState<AdminVoice | null>(null);
  const [ filtersOpen, setFiltersOpen ] = useState(() => !!(owner || platformType !== null));
  const [ expanded, setExpanded ] = useState<ReadonlySet<string>>(() => new Set());

  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const activeFilters = Number(!!owner) + Number(platformType !== null);
  const filtered = !!(debouncedQuery || userId || serverId || activeFilters);

  // the counts are for what the search matches, platforms within the chosen kind and kinds within the chosen platform
  const platforms = data?.platforms ?? {};
  const owners = data?.owners;
  const platformOptions = [...new Set([...KNOWN_PLATFORMS, ...Object.keys(platforms).map(Number), ...((platformType !== null) ? [platformType] : [])])];
  const counted = (label: string, count: number | undefined) => (count === undefined) ? label : `${label} (${formatNumber(count)})`;
  const ownersTotal = (owners) ? owners.user + owners.server : undefined;
  const platformsTotal = (data) ? Object.values(platforms).reduce((total, count) => total + count, 0) : undefined;

  const toggleClips = (voiceId: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(voiceId)) {
        next.add(voiceId);
      }
      return next;
    });
  };

  return (
    <>
      <DashboardHeader
        title='Voices'
        description='Every voice cloned with the bot, users’ own and servers’, with the clips each one is made from. Only the name can be changed here.'
      />

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by voice name, owner, server, or id...'
          aria-label='Search voices'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='admin-voice-filters'/>
      </div>

      <div id='admin-voice-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Platform</span>
          <select className='input' value={platformType ?? 'any'} onChange={(event) => update({platform: (event.target.value === 'any') ? null : event.target.value})}>
            <option value='any'>{counted('Any', platformsTotal)}</option>
            {platformOptions.map((type) => (
              <option key={type} value={type}>{counted(voicePlatformLabel(type), (data) ? (platforms[type] ?? 0) : undefined)}</option>
            ))}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Owner</span>
          <select className='input' value={owner ?? 'any'} onChange={(event) => update({owner: (event.target.value === 'any') ? null : event.target.value})}>
            {OWNER_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {counted(item.label, (!owners) ? undefined : (item.value === 'any') ? ownersTotal : owners[item.value])}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(userId || serverId) ? (
        <div className='mb-4 flex flex-wrap items-center gap-2 text-sm text-muted'>
          {(userId) ? <ClearChip label='Owner' value={userId} onClear={() => update({user_id: null})}/> : null}
          {(serverId) ? <ClearChip label='Server' value={serverId} onClear={() => update({server_id: null})}/> : null}
        </div>
      ) : null}

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load voices' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<AudioLines className='size-10'/>} title='No voices found'>
          {(filtered) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <div className={cn('card overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[980px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Voice</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Owner</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Platform</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Clips</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Cloned</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'><span className='sr-only'>Actions</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((voice) => (
                  <VoiceRows
                    key={voice.id}
                    voice={voice}
                    open={expanded.has(voice.id)}
                    onToggleClips={() => toggleClips(voice.id)}
                    onRename={() => setRenaming(voice)}
                    onFilterUser={(id) => update({user_id: id, server_id: null, q: null})}
                    onFilterServer={(id) => update({server_id: id, user_id: null, q: null})}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}

      {(renaming) ? <RenameVoiceDialog voice={renaming} mutation={mutation} onClose={() => setRenaming(null)}/> : null}
    </>
  );
}


function ClearChip({ label, value, onClear }: {label: string, value: string, onClear: () => void}) {
  return (
    <span className='inline-flex items-center gap-2'>
      {label}
      <button
        type='button'
        className='inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-fg hover:border-line-strong'
        onClick={onClear}
        title={`Clear the ${label.toLowerCase()} filter`}
      >
        {value}
        <X aria-label='Clear' className='size-3.5'/>
      </button>
    </span>
  );
}


// the voice's row, and its clips under it while they're shown
function VoiceRows({ voice, open, onToggleClips, onRename, onFilterUser, onFilterServer }: {
  voice: AdminVoice,
  open: boolean,
  onToggleClips: () => void,
  onRename: () => void,
  onFilterUser: (userId: string) => void,
  onFilterServer: (serverId: string) => void,
}) {
  const duration = voice.clips.reduce((total, clip) => total + clip.duration, 0);
  const size = voice.clips.reduce((total, clip) => total + clip.size, 0);
  // the voice can't speak without it (ZONOS3 keeps the speaker embedding with us, the others keep theirs themselves)
  const missingData = voice.platform_type === VoiceCloneTypes.ZONOS3 && !voice.has_platform_data;
  const { server_id: serverId, user } = voice;

  return (
    <Fragment>
      <tr className='align-top hover:bg-surface-2'>
        <td className='max-w-64 px-4 py-3'>
          <div className='truncate font-medium text-white' title={voice.name}>{voice.name}</div>
          <CopyableValue value={voice.id} truncate={0} className='mt-0.5'/>
          {(serverId) ? <div className='mt-1'><Chip tone='brand'>Server voice</Chip></div> : null}
        </td>
        <td className='px-4 py-3'>
          {(serverId) ? (
            <ServerOwner voice={voice} serverId={serverId} onFilter={() => onFilterServer(serverId)}/>
          ) : (
            <OwnerLine onFilter={(user) ? () => onFilterUser(user.id) : undefined} filterLabel='Show only this user’s voices'>
              <UserCell user={user} to={(user) ? adminUserPath(user.id) : undefined}/>
            </OwnerLine>
          )}
        </td>
        <td className='px-4 py-3'>
          <div className='flex flex-wrap items-center gap-1'>
            <Chip>{voicePlatformLabel(voice.platform_type)}</Chip>
            {(missingData) ? <Chip tone='danger' title='Its speaker embedding is missing, so tts with it fails'>No embedding</Chip> : null}
          </div>
          <div className='mt-1'><CopyableValue value={voice.platform_id} truncate={12}/></div>
        </td>
        <td className='px-4 py-3'>
          {(voice.clips.length) ? (
            <button
              type='button'
              className='-m-1 inline-flex cursor-pointer items-start gap-1 rounded-md p-1 text-left hover:bg-surface-3'
              aria-expanded={open}
              onClick={onToggleClips}
            >
              <span>
                <span className='block text-fg'>{formatNumber(voice.clips.length)} {(voice.clips.length === 1) ? 'clip' : 'clips'}</span>
                <span className='block text-xs whitespace-nowrap text-subtle tabular-nums'>{formatDuration(duration)} • {formatMemory(size, (size < 1024 * 1024) ? 0 : 1)}</span>
              </span>
              <ChevronDown aria-hidden className={cn('mt-0.5 size-3.5 shrink-0 text-subtle transition-transform', open && 'rotate-180')}/>
            </button>
          ) : (
            <span className='text-subtle' title='Cloned before clips were kept'>None kept</span>
          )}
        </td>
        <td className='px-4 py-3 whitespace-nowrap text-muted'>
          <ExactDate value={voice.created}/>
        </td>
        <td className='px-4 py-3 text-right'>
          <button type='button' className='btn btn-sm btn-ghost' onClick={onRename}>
            <Pencil className='size-4'/>
            Rename
          </button>
        </td>
      </tr>
      {(open && voice.clips.length) ? (
        <tr className='bg-deep'>
          <td colSpan={COLUMNS} className='px-4 py-2'>
            <ul className='divide-y divide-line'>
              {voice.clips.map((clip) => {
                const load = () => api.fetchAdminVoiceClipAudio(voice.id, clip.id);
                return (
                  <li key={clip.id} className='flex items-center gap-3 py-2'>
                    <ClipPlayer clip={clip} load={load}/>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm text-fg' title={clip.name}>{clip.name}</div>
                      <div className='mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-subtle'>
                        <span className='tabular-nums'>{formatDuration(clip.duration)}</span> •
                        <span>{formatMemory(clip.size, (clip.size < 1024 * 1024) ? 0 : 1)}</span> •
                        <ExactDate value={clip.created}/> •
                        <CopyableValue value={clip.id} truncate={0}/>
                      </div>
                    </div>
                    <ClipDownload clip={clip} load={load}/>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}


function OwnerLine({ children, onFilter, filterLabel }: {children: ReactNode, onFilter?: () => void, filterLabel: string}) {
  return (
    <div className='flex min-w-0 items-center gap-1'>
      <div className='min-w-0'>{children}</div>
      {(onFilter) ? <FilterButton label={filterLabel} onClick={onFilter}/> : null}
    </div>
  );
}


// the server it belongs to (a group dm or a server the api has no row for shows its id only) and who made it
function ServerOwner({ voice, serverId, onFilter }: {voice: AdminVoice, serverId: string, onFilter: () => void}) {
  return (
    <div className='space-y-2'>
      <OwnerLine onFilter={onFilter} filterLabel='Show only this server’s voices'>
        {(voice.server) ? (
          <span className='flex min-w-0 items-center gap-2'>
            <GuildIcon guild={voice.server} size={32} className='size-8 rounded-lg text-[10px]'/>
            <span className='min-w-0'>
              <Link to={adminServerPath(serverId)} title='Open this server' className='block truncate text-sm font-medium text-white underline-offset-2 hover:underline'>
                {voice.server.name}
              </Link>
              <CopyableValue value={serverId} truncate={0}/>
            </span>
          </span>
        ) : (
          <span className='flex min-w-0 items-center gap-2'>
            <span aria-hidden className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-subtle'><Server className='size-4'/></span>
            <span className='min-w-0'>
              <span className='block text-sm text-subtle'>Group DM or unknown server</span>
              <CopyableValue value={serverId} truncate={0}/>
            </span>
          </span>
        )}
      </OwnerLine>
      {(voice.created_by || voice.created_by_id) ? (
        <div className='flex items-center gap-2 text-xs text-subtle'>
          <span className='shrink-0'>Made by</span>
          <UserCell
            user={voice.created_by}
            fallbackId={voice.created_by_id}
            size='sm'
            to={(voice.created_by_id) ? adminUserPath(voice.created_by_id) : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <div className='flex-1'>
            <Skeleton className='h-4 w-36'/>
            <Skeleton className='mt-1.5 h-3 w-44 bg-surface-2'/>
          </div>
          <Skeleton className='size-8 rounded-full'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
          <Skeleton className='h-4 w-20 bg-surface-2'/>
          <Skeleton className='h-4 w-20 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
