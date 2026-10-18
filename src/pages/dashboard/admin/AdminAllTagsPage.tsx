import { BookMarked, Replace, Search, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { DetailModalHeader } from '@/components/ui/DetailModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TagDirectoryVerificationStates, type AdminTagItem, type AdminTagsSortBy } from '@/lib/api';
import { ADMIN_TAGS_PAGE_SIZE, errorMessage, useAdminTagsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { TagCardDeleteButton, tagLocation, TagLocationChip, TagStatusBadges, type TagLocation, type TagLocationKind } from '@/pages/dashboard/tags/tagMeta';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { ServerFilterChip } from '../servers/ServerFilterChip';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { AdminModalFooter, AdminTagModal, useOpenListItem } from './AdminTagModal';
import { adminServerPath, adminTagDirectoryPath, adminUserPath, Chip, CopyableValue, CopyButton, DETAIL_LIST_STACKED, DetailList, ExactDate, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { TagOwnerStrip } from './DeleteUserTagsDialog';
import { DeleteTagDialog } from './DeleteTagDialog';
import { ReplaceTagDialog } from './ReplaceTagDialog';
import { TagStoragePanel } from './TagStoragePanel';


const SORTS: Array<{value: AdminTagsSortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'uses', label: 'Most used'},
  {value: 'last_used', label: 'Recently used'},
  {value: 'name', label: 'Name'},
];

// `id:<id>`, `user:<id>` or a bare id, the content toggle doesn't change those
const ID_SEARCH = /^((id|tag|user|owner):\s*)?\d+$/i;

const TITLE_ID = 'admin-tag-modal-title';


export function AdminAllTagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  // deleting from a card, without opening it
  const [ deleting, setDeleting ] = useState<AdminTagItem | null>(null);
  const hideNsfw = searchParams.get('nsfw') === 'hide';
  const searchContent = searchParams.get('content') === '1';
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  // `?server=<id>`: only tags made in that server (the admin server modal's "Tags")
  const serverId = (/^\d+$/.test(searchParams.get('server') || '')) ? searchParams.get('server')! : '';

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminTagsQuery({
    query: debouncedQuery,
    serverId,
    searchContent,
    sortBy,
    nsfw: (hideNsfw) ? false : null,
    page,
  });
  const items = data?.items ?? [];
  const { openItem, previousId, nextId, open, close } = useOpenListItem(items, (item) => item.tag.id);
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_TAGS_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_TAGS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader
        title='Tags'
        description={<>Every tag, personal, server and aliases. A bare id matches the tag, owner or server; <code className='text-code'>user:&lt;id&gt;</code> or <code className='text-code'>id:&lt;tag id&gt;</code> match only that.</>}
      />

      <div className='mb-4 space-y-3'>
        <SearchInput
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder={(searchContent) ? 'Search name, content or an id...' : 'Search name or an id...'}
          aria-label='Search tags'
        />
        <div className='flex flex-wrap items-center gap-3 sm:justify-end'>
          <label className='flex items-center gap-2 text-sm text-muted'>
            Sort
            <select className='input w-40' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
          <div className='rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Search content' checked={searchContent} onChange={(value) => update({content: (value) ? '1' : null})}/>
          </div>
          <div className='rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Show NSFW' checked={!hideNsfw} onChange={(value) => update({nsfw: (value) ? null : 'hide'})}/>
          </div>
        </div>
      </div>

      {(serverId) ? <ServerFilterChip guildId={serverId} name={null} to={adminServerPath(serverId)} onClear={() => update({server: null})}/> : null}

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load tags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Tags className='size-10'/>} title='No tags found'>
          {(debouncedQuery && !searchContent && !ID_SEARCH.test(debouncedQuery)) ? (
            <>
              No tag names match that search.{' '}
              <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => update({content: '1'})}>Search content too</button>
            </>
          ) : (debouncedQuery || hideNsfw || serverId) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => <TagCard key={item.tag.id} item={item} onOpen={open} onDelete={setDeleting}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <TagDetails
            key={openItem.tag.id}
            item={openItem}
            navigation={{previousId, nextId, onNavigate: open}}
            onSearch={(value) => {
              close();
              update({q: value});
            }}
            onReplaced={(targetId) => {
              close();
              // the tag that's left, with everything moved onto it
              update({q: `id:${targetId}`});
            }}
            onDeleted={close}
          />
        </AdminTagModal>
      ) : null}

      {(deleting) ? <DeleteTagDialog item={deleting} onDeleted={() => setDeleting(null)} onClose={() => setDeleting(null)}/> : null}
    </>
  );
}


function itemLocation(item: AdminTagItem): TagLocation {
  const ownerId = item.user?.id ?? item.tag.user_id ?? null;
  return tagLocation({server_id: item.tag.server_id, guild_id: item.tag.guild_id ?? null}, (ownerId) ? {id: ownerId, channel_id: item.user?.channel_id ?? null} : null);
}


// the dashboard's own tag card (`TagsPage`) plus the owner: just enough to spot the tag, the rest is in `TagDetails` a click away
function TagCard({ item, onOpen, onDelete }: {item: AdminTagItem, onOpen: (id: string) => void, onDelete: (item: AdminTagItem) => void}) {
  const { tag, directory } = item;
  const ownerId = item.user?.id ?? tag.user_id ?? null;
  const reference = tag.reference_tag as {id: string, name: string} | null | undefined;
  const location = itemLocation(item);
  // staff wording, and directory tags live under their owner's id so that id isn't shown
  const chipLocation = (location.kind === 'personal')
    ? {...location, icon: BookMarked, label: LOCATION_LABELS.personal, id: null}
    : {...location, label: LOCATION_LABELS[location.kind]};

  return (
    <li className='group relative flex min-w-0 flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-brand'>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h2 className='truncate font-medium text-white transition-colors group-hover:text-brand'>
              {/* stretched: the whole card opens the tag */}
              <button
                type='button'
                className='cursor-pointer text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand'
                onClick={() => onOpen(tag.id)}
              >
                {tag.name}
              </button>
            </h2>
            {(tag.nsfw) ? <NsfwBadge/> : null}
          </div>
          {(reference) ? (
            <p className='mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted'>
              <span className='shrink-0'>Alias of</span>
              <span className='min-w-0 truncate'>{reference.name}</span>
            </p>
          ) : null}
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <TagStatusBadges tag={{directory, is_on_directory: !!directory, is_command: !!tag.is_command, locked: tag.locked}}/>
        </div>
      </div>
      {/* pinned above the footer, so it sits in the same spot on every card whether or not there's an alias line */}
      <div className='mt-auto mb-3 flex min-w-0 flex-col gap-2'>
        <UserCell user={item.user} fallbackId={ownerId} size='sm' to={(ownerId) ? adminUserPath(ownerId) : undefined}/>
        {/* a guild opens that server in the admin servers page */}
        <TagLocationChip location={chipLocation} to={(location.kind === 'server' && location.id) ? adminServerPath(location.id) : undefined}/>
      </div>
      <div className='flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-subtle'>
        <span className='tabular-nums'>{(tag.uses ?? 0).toLocaleString()} uses</span>
        <span className='flex items-center gap-1'>
          {(tag.edited) ? `Edited ${formatDate(tag.edited)}` : `Created ${formatDate(tag.created)}`}
          <TagCardDeleteButton name={tag.name} onClick={() => onDelete(item)}/>
        </span>
      </div>
    </li>
  );
}


// `navigation` is the modal's Previous / Next, the tag's actions go between them. Its directory listing is the status
function TagDetails({ item, navigation, onSearch, onReplaced, onDeleted }: {
  item: AdminTagItem,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
  onSearch: (query: string) => void,
  onReplaced: (targetId: string) => void,
  onDeleted: () => void,
}) {
  const { tag, directory } = item;
  const { user: me } = useAuth();
  // replacing a tag with another is owners only
  const owner = isOwner(me);
  const [ replacing, setReplacing ] = useState(false);
  const [ deleting, setDeleting ] = useState(false);
  const ownerId = item.user?.id ?? tag.user_id ?? null;
  const reference = tag.reference_tag as {id: string, name: string, content?: string} | null | undefined;
  // aliases have no content of their own, they show their source's
  const content = (reference) ? (reference.content ?? '') : (tag.content ?? '');
  const location = itemLocation(item);
  const states = [
    (tag.nsfw) ? <NsfwBadge key='nsfw'/> : null,
    (tag.locked) ? <Chip key='locked' tone='warning'>Locked</Chip> : null,
    (tag.is_command) ? <Chip key='command' tone='brand'>Command</Chip> : null,
    (reference) ? (
      <button key='alias' type='button' className='max-w-full cursor-pointer hover:opacity-80' title='Show the source tag' onClick={() => onSearch(`id:${reference.id}`)}>
        <Chip className='max-w-56'><span className='truncate'>Alias of {reference.name}</span></Chip>
      </button>
    ) : null,
  ].filter(Boolean);

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip className='min-w-16 shrink-0 justify-center'>{LOCATION_LABELS[location.kind]}</Chip>}
        // can be cut off on phones, so there it's in the details below with a copy button too
        title={<><span className='sr-only'>Tag </span>{tag.name}</>}
        mono
        meta={<>Created <ExactDate value={tag.created} format={formatDateTime}/></>}
        states={states}
        status={(directory) ? (
          <Link
            to={adminTagDirectoryPath(tag.id)}
            className='hover:opacity-80'
            title={`Open its directory listing${(directory.title) ? ` “${directory.title}”` : ''}`}
          >
            {(directory.verified === TagDirectoryVerificationStates.NOT_VERIFIED) ? <Chip tone='success'>Listed</Chip> : <VerificationBadge verified={directory.verified}/>}
          </Link>
        ) : null}
      />

      <TagOwnerStrip user={item.user} fallbackId={ownerId} blockReason={`Tag: \`${tag.name}\` #${tag.id}`}>
        {(ownerId) ? (
          <button type='button' className='btn btn-ghost btn-sm' title='Show every tag by this user' onClick={() => onSearch(`user:${ownerId}`)}>
            <Search aria-hidden className='size-4 shrink-0'/>
            {/* icon only on phones, there's the block button beside it */}
            <span className='sr-only sm:not-sr-only'>All their tags</span>
          </button>
        ) : null}
      </TagOwnerStrip>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* side by side once there's room, stacked on phones with one shared label column (subgrid) */}
        <div className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-2'>
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              // phones only, the title's can be cut off there
              ['Name', <CopyableValue value={tag.name} truncate={0}/>, 'sm:hidden'],
              ['Tag', <CopyableValue value={tag.id} truncate={0}/>],
              ['Uses', <span className='tabular-nums'>{(tag.uses ?? 0).toLocaleString()}</span>],
              ['Last used', (tag.last_used) ? <ExactDate value={tag.last_used}/> : '—'],
            ]}
          />
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              ['Edited', (tag.edited) ? <ExactDate value={tag.edited}/> : '—'],
              // a guild opens that server in the admin servers page
              (location.id) ? [LOCATION_LABELS[location.kind], (location.kind === 'server') ? (
                <CopyableValue value={location.id} truncate={0} to={adminServerPath(location.id)} linkTitle='Open this server'/>
              ) : (
                <CopyableValue value={location.id} truncate={0}/>
              )] : null,
              (reference) ? ['Alias of', <CopyableValue value={reference.id} truncate={0}/>] : null,
              (directory) ? ['Listing', (
                <Link to={adminTagDirectoryPath(tag.id)} className='text-code underline-offset-2 hover:underline'>
                  {directory.title || <span className='italic'>Untitled</span>}
                </Link>
              )] : null,
            ]}
          />
        </div>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>
              {(reference) ? 'Source content' : 'Content'}{' '}
              <span className='normal-case tracking-normal text-subtle'>({content.length.toLocaleString()} chars)</span>
            </h3>
            <div className='flex items-center gap-1'>
              {(content) ? <CopyButton value={content} label='Copy'/> : null}
            </div>
          </div>
          <pre
            className='max-h-96 overflow-auto rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none'
            {...selectAllScope}
          >
            {content || <span className='text-subtle italic'>(empty)</span>}
          </pre>
        </div>

        <TagStoragePanel tagId={tag.id} className='mt-4'/>
      </div>

      {/* both take the tag away, so no divider between them. Replace is owners only, so for everyone else Delete is
          the one slot */}
      <AdminModalFooter {...navigation}>
        {(owner) ? (
          <button
            type='button'
            className='btn btn-secondary min-w-0 flex-1 px-2 sm:flex-none sm:px-3'
            title='Move everything to another tag, then delete this one'
            onClick={() => setReplacing(true)}
          >
            <Replace aria-hidden className='hidden size-4 shrink-0 sm:block'/>
            <span className='truncate sm:hidden'>Replace</span>
            <span className='hidden sm:inline'>Replace with another tag</span>
          </button>
        ) : null}
        <button
          type='button'
          className='btn btn-danger min-w-0 flex-1 px-2 sm:flex-none sm:px-3'
          onClick={() => setDeleting(true)}
        >
          <Trash2 aria-hidden className='hidden size-4 shrink-0 sm:block'/>
          <span className='truncate'>Delete</span>
        </button>
      </AdminModalFooter>

      {(replacing) ? (
        <ReplaceTagDialog
          tag={tag}
          onReplaced={(targetId) => {
            setReplacing(false);
            onReplaced(targetId);
          }}
          onClose={() => setReplacing(false)}
        />
      ) : null}
      {(deleting) ? (
        <DeleteTagDialog
          item={item}
          onDeleted={() => {
            setDeleting(false);
            onDeleted();
          }}
          onClose={() => setDeleting(false)}
        />
      ) : null}
    </div>
  );
}


// staff wording for where a tag lives; directory tags live under their owner's id, so that id isn't shown
const LOCATION_LABELS: Record<TagLocationKind, string> = {
  server: 'Guild',
  dm: 'DM',
  group_dm: 'Group DM',
  personal: 'Directory',
  global: 'Global',
};

function ListSkeleton() {
  return (
    <ul aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='rounded-lg border border-line bg-surface p-4'>
          <Skeleton className='h-4 w-32'/>
          <Skeleton className='mt-4 h-6 w-40 bg-surface-2'/>
          <Skeleton className='mt-3 h-3 w-1/2 bg-surface-2'/>
          <Skeleton className='mt-6 h-3 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
