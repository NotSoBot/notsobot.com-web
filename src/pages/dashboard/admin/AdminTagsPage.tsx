import { Check, Clock, Music, Pencil, ShieldCheck, ShieldX, Trash2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { DetailModalHeader } from '@/components/ui/DetailModal';
import { Markdown, stripMarkdown } from '@/components/ui/Markdown';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ApiErrorCodes,
  ApiRequestError,
  TagDirectoryEditRequestThumbnailModes,
  TagDirectoryVerificationStates,
  type AdminTagDirectoryItem,
  type TagDirectoryEditRequest,
  type AdminTagDirectorySortBy,
  type TagAsset,
  type TagDirectoryAsset,
  type TagDirectoryCategory,
} from '@/lib/api';
import {
  ADMIN_TAGS_PAGE_SIZE,
  errorMessage,
  useAdminTagDirectoryEditRequestMutation,
  useAdminTagDirectoryItemQuery,
  useAdminTagDirectoryQuery,
  usePatchAdminTagDirectoryMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatMemory, NO_AUTOFILL } from '@/lib/utils';
import { TAG_NAME_MAX } from '@/pages/dashboard/tags/tagMeta';
import { CategoryBadge, categoryLabel, categoryOptionFromParam, CategorySelect, DescriptionEditor, NsfwBadge, TAG_DIRECTORY_CATEGORY_OPTIONS, VerificationBadge, verificationRequirement } from '@/pages/tags/tagDirectory';

import { CharCounter, DashboardHeader, EmptyState, ErrorPanel, Field, Skeleton, Toggle } from '../ui';
import { AdminModalFooter, AdminTagModal, LinkedItemModal, useOpenListItem } from './AdminTagModal';
import { adminUserPath, Chip, CopyableValue, CopyButton, DETAIL_LIST_STACKED, DetailList, ExactDate, FiltersButton, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { DeleteDirectoryTagFlow } from './DeleteDirectoryTagFlow';
import { TagOwnerStrip } from './DeleteUserTagsDialog';
import { AssetProvenanceLine } from './AssetProvenance';
import { TagAssetsPanel } from './TagAssetsPanel';
import { TagHistoryPanel } from './TagHistoryPanel';
import { TagStoragePanel } from './TagStoragePanel';


// same order and `status` param as the public directory, but defaults to the review queue
const FILTERS = [
  {value: 'all', label: 'All', verified: null, editRequest: null},
  {value: 'verified', label: 'Verified', verified: TagDirectoryVerificationStates.VERIFIED, editRequest: null},
  {value: 'pending', label: 'Pending', verified: TagDirectoryVerificationStates.PENDING_VERIFICATION, editRequest: null},
  {value: 'unverified', label: 'Unverified', verified: TagDirectoryVerificationStates.NOT_VERIFIED, editRequest: null},
  // verified listings whose owner asked for changes
  {value: 'changes', label: 'Change requests', verified: null, editRequest: true},
] as const;

const DEFAULT_FILTER = FILTERS.find((item) => item.value === 'pending')!;

const SORTS: Array<{value: AdminTagDirectorySortBy, label: string}> = [
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'uses', label: 'Most used'},
  {value: 'servers', label: 'Most servers'},
  {value: 'name', label: 'Name'},
  {value: 'title', label: 'Title'},
];

const TITLE_ID = 'admin-directory-tag-modal-title';


export function AdminTagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  // the dialog lives here, not in the card: deleting refetches the list, which unmounts the card (and used to lose
  // the dialog with the block request still running, so a failed block was never shown or retryable)
  const [ deletingItem, setDeletingItem ] = useState<AdminTagDirectoryItem | null>(null);
  const filter = FILTERS.find((item) => item.value === searchParams.get('status')) ?? DEFAULT_FILTER;
  // admins see NSFW tags unless they hide them
  const hideNsfw = searchParams.get('nsfw') === 'hide';
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  // same `category` param as the public directory
  const category = categoryOptionFromParam(searchParams.get('category'));
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  // the panel starts closed like the other admin pages', the button counts the ones not on their default
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [filter !== DEFAULT_FILTER, category, sortBy !== 'newest', hideNsfw].filter(Boolean).length;

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminTagDirectoryQuery({
    query: debouncedQuery,
    category: category?.value ?? null,
    sortBy,
    verified: filter.verified,
    nsfw: (hideNsfw) ? false : null,
    editRequest: filter.editRequest,
    page,
  });
  const items = data?.items ?? [];
  const { openId, openItem: listedItem, previousId, nextId, open, close } = useOpenListItem(items, (item) => item.id, Routes.DASHBOARD_ADMIN_TAG_DIRECTORY);
  // a linked listing that isn't on this page (or under this filter) is fetched on its own
  const linked = useAdminTagDirectoryItemQuery(openId ?? '', {enabled: !!openId && !listedItem});
  const openItem = listedItem ?? linked.data ?? null;
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
        title='Tag Directory'
        description='Review tags published to the tag directory. Verified tags are marked safe and can’t be edited by their owner.'
      />

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search title, name, description or content...'
          aria-label='Search directory tags'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='admin-tag-directory-filters'/>
      </div>

      <div id='admin-tag-directory-filters' hidden={!filtersOpen} className='card mb-4 p-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='overflow-x-auto'>
            <Segmented
              label='Verification'
              value={filter.value}
              options={FILTERS.map(({ value, label }) => ({value, label}))}
              onChange={(value) => update({status: (value === DEFAULT_FILTER.value) ? null : value})}
            />
          </div>
          <div className='flex flex-wrap items-center gap-3 sm:ml-auto'>
            <label className='flex items-center gap-2 text-sm text-muted'>
              Category
              <select className='input w-36' value={category?.param ?? ''} onChange={(event) => update({category: event.target.value || null})}>
                <option value=''>All</option>
                {TAG_DIRECTORY_CATEGORY_OPTIONS.map((option) => <option key={option.param} value={option.param}>{categoryLabel(option.value)}</option>)}
              </select>
            </label>
            <label className='flex items-center gap-2 text-sm text-muted'>
              Sort
              <select className='input w-36' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
                {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
              </select>
            </label>
            <div className='rounded-md border border-line bg-surface px-3 py-2'>
              <Toggle label='Show NSFW' checked={!hideNsfw} onChange={(value) => update({nsfw: (value) ? null : 'hide'})}/>
            </div>
          </div>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load directory tags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<ShieldCheck className='size-10'/>} title='Nothing here'>
          {(debouncedQuery) ? (
            (filter.verified === null) ? 'No directory tags match that search.' : (
              <>
                No {filter.label.toLowerCase()} directory tags match that search.{' '}
                <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => update({status: 'all'})}>Search all tags</button>
              </>
            )
          ) : `No ${filter.label.toLowerCase()} directory tags.`}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => <DirectoryTagCard key={item.id} item={item} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <DirectoryTagDetails
            key={openItem.id}
            item={openItem}
            navigation={{previousId, nextId, onNavigate: open}}
            onDelete={() => {
              // the delete flow is its own dialog, and the tag leaves the list once it's deleted
              close();
              setDeletingItem(openItem);
            }}
          />
        </AdminTagModal>
      ) : (openId) ? (
        <LinkedItemModal noun='listing' notFoundMessage='This tag isn’t on the directory. It may have been unpublished or deleted.' query={linked} onClose={close}/>
      ) : null}
      {(deletingItem) ? <DeleteDirectoryTagFlow item={deletingItem} onClose={() => setDeletingItem(null)}/> : null}
    </>
  );
}


// laid out like the dashboard's own tag cards: just enough to triage, the review tools are in `DirectoryTagDetails`
function DirectoryTagCard({ item, onOpen }: {item: AdminTagDirectoryItem, onOpen: (id: string) => void}) {
  const { tag } = item;
  const ownerId = item.user?.id ?? tag.user_id ?? null;
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
                onClick={() => onOpen(item.id)}
              >
                {item.title || <span className='text-subtle italic'>Untitled</span>}
              </button>
            </h2>
            {(tag.nsfw) ? <NsfwBadge/> : null}
          </div>
          <p className='mt-0.5 truncate font-mono text-sm text-code'>{tag.name}</p>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <VerificationBadge verified={item.verified}/>
          <CategoryBadge category={item.category}/>
          {(tag.locked) ? <Chip tone='warning'>Locked</Chip> : null}
          {(item.edit_request) ? <Chip tone='brand'>Change request</Chip> : null}
        </div>
      </div>
      {(item.description) ? (
        <p className='mb-3 line-clamp-2 text-sm break-words text-muted'>{stripMarkdown(item.description)}</p>
      ) : (
        <p className='mb-3 text-sm text-subtle italic'>No description</p>
      )}
      <div className='mb-3'>
        <UserCell user={item.user} fallbackId={ownerId} size='sm' to={(ownerId) ? adminUserPath(ownerId) : undefined}/>
      </div>
      <div className='mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-subtle'>
        <span className='tabular-nums'>
          {(tag.uses ?? 0).toLocaleString()} uses · {(item.server_count ?? 0).toLocaleString()} {(item.server_count === 1) ? 'server' : 'servers'}
        </span>
        <span>{(item.created) ? `Listed ${formatDate(item.created)}` : `Created ${formatDate(tag.created)}`}</span>
      </div>
    </li>
  );
}


// `Tag.content` is varchar(2000)
const CONTENT_MAX = 2000;
// same limits as the api's directory listing validators
const TITLE_MAX = 128;
const DESCRIPTION_MAX = 2000;

// `navigation` is the modal's Previous / Next, the review actions go between them
function DirectoryTagDetails({ item, navigation, onDelete }: {
  item: AdminTagDirectoryItem,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
  onDelete: () => void,
}) {
  const { tag } = item;
  const ownerId = item.user?.id ?? tag.user_id ?? null;
  const toast = useToast();
  const mutation = usePatchAdminTagDirectoryMutation();
  // separate instance so saving content doesn't show up as a pending verification change
  const contentMutation = usePatchAdminTagDirectoryMutation();
  const listingMutation = usePatchAdminTagDirectoryMutation();
  // null when not editing
  const [ draft, setDraft ] = useState<string | null>(null);
  const [ listingDraft, setListingDraft ] = useState<{name: string, title: string, description: string, category: TagDirectoryCategory} | null>(null);

  const content = tag.content ?? '';

  const saveContent = () => {
    if (draft === null) {
      return;
    }
    contentMutation.mutate({tagId: item.id, content: draft}, {
      onSuccess: () => {
        setDraft(null);
        toast(`${item.title || tag.name}: content saved`);
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  // names are saved lowercased, without newlines
  const draftName = listingDraft?.name.trim().toLowerCase() ?? '';
  const nameChanged = listingDraft !== null && draftName !== tag.name;
  const listingChanged = listingDraft !== null && (
    nameChanged || listingDraft.title !== item.title || listingDraft.description !== item.description || listingDraft.category !== item.category
  );
  const listingInvalid = listingDraft !== null && (
    !draftName || TAG_NAME_MAX < draftName.length || TITLE_MAX < listingDraft.title.length || DESCRIPTION_MAX < listingDraft.description.length
  );
  const nameTaken = listingMutation.error instanceof ApiRequestError && listingMutation.error.code === ApiErrorCodes.TAG_NAME_TAKEN;

  const saveListing = () => {
    if (listingDraft === null) {
      return;
    }
    // only send what changed, the api skips undefined fields
    listingMutation.mutate({
      tagId: item.id,
      name: (nameChanged) ? draftName : undefined,
      title: (listingDraft.title !== item.title) ? listingDraft.title : undefined,
      description: (listingDraft.description !== item.description) ? listingDraft.description : undefined,
      category: (listingDraft.category !== item.category) ? listingDraft.category : undefined,
    }, {
      onSuccess: (updated) => {
        setListingDraft(null);
        toast(`${updated.title || updated.tag.name}: listing saved`);
      },
      onError: (error) => {
        if (!(error instanceof ApiRequestError && error.code === ApiErrorCodes.TAG_NAME_TAKEN)) {
          toast(errorMessage(error), 'error');
        }
      },
    });
  };

  // archiving a url that's in the content swaps it in the editor, staff still review and save it themselves
  const onArchived = (asset: TagAsset, sourceUrl: string | null) => {
    const current = draft ?? content;
    if (sourceUrl && current.includes(sourceUrl)) {
      setDraft(current.replaceAll(sourceUrl, asset.urls.cdn));
      toast('Archived, the url was replaced in the editor. Review and save it.');
    } else {
      toast('Archived, copy its url into the content.');
    }
  };

  const setVerified = (verified: number, label: string) => {
    mutation.mutate({tagId: item.id, verified}, {
      onSuccess: () => toast(`${item.title || tag.name}: ${label}`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const pendingTarget = (mutation.isPending) ? mutation.variables?.verified : undefined;
  const missing = verificationRequirement(item);

  return (
    <>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip className='min-w-16 shrink-0 justify-center'>{categoryLabel(item.category)}</Chip>}
        // can be cut off on phones, so there the name's in the details below with a copy button too
        title={item.title || <span className='text-subtle italic'>Untitled</span>}
        meta={
          <div className='flex min-w-0 items-center gap-1.5'>
            <span className='min-w-0 truncate font-mono text-code'>{tag.name}</span>
            <span aria-hidden>·</span>
            <span className='shrink-0 whitespace-nowrap'>
              {(item.created) ? <>Listed <ExactDate value={item.created} format={formatDateTime}/></> : <>Created <ExactDate value={tag.created} format={formatDateTime}/></>}
            </span>
          </div>
        }
        states={[
          (tag.nsfw) ? <NsfwBadge key='nsfw'/> : null,
          (tag.locked) ? <Chip key='locked' tone='warning'>Locked</Chip> : null,
          (item.edit_request) ? <Chip key='request' tone='brand'>Change request</Chip> : null,
        ]}
        status={<VerificationBadge verified={item.verified}/>}
      />

      <TagOwnerStrip user={item.user} fallbackId={ownerId} blockReason={`Tag directory: \`${tag.name}\` #${tag.id}`}/>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* side by side once there's room, stacked on phones with one shared label column (subgrid) */}
        <div className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-2'>
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              // phones only, the header's can be cut off there
              ['Name', <CopyableValue value={tag.name} truncate={0}/>, 'sm:hidden'],
              ['Tag', <CopyableValue value={tag.id} truncate={0}/>],
              ['Uses', <span className='tabular-nums'>{(tag.uses ?? 0).toLocaleString()}</span>],
              ['Servers', <span className='tabular-nums'>{(item.server_count ?? 0).toLocaleString()}</span>],
            ]}
          />
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              // the header has the listed date, or the created one when there isn't one
              (item.created) ? ['Created', <ExactDate value={tag.created}/>] : null,
              ['Edited', (tag.edited) ? <ExactDate value={tag.edited}/> : '—'],
              (tag.server_id) ? ['Server', <CopyableValue value={tag.server_id} truncate={0}/>] : null,
            ]}
          />
        </div>

        {(item.edit_request) ? <EditRequestReview item={item} request={item.edit_request}/> : null}

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Listing</h3>
            {(listingDraft === null) ? (
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => setListingDraft({name: tag.name, title: item.title ?? '', description: item.description ?? '', category: item.category ?? 0})}
              >
                <Pencil className='size-4'/>
                Edit listing
              </button>
            ) : null}
          </div>
          {(listingDraft !== null) ? (
            <div className='space-y-3'>
              <Field
                label='Tag name'
                counter={<CharCounter length={draftName.length} max={TAG_NAME_MAX}/>}
                error={(!draftName) ? 'A tag needs a name.' : (nameTaken) ? 'The owner already has a tag with this name there.' : null}
              >
                {(props) => (
                  <input
                    {...props}
                    className='input font-mono'
                    value={listingDraft.name}
                    disabled={listingMutation.isPending}
                    autoComplete='off'
                    {...NO_AUTOFILL}
                    spellCheck={false}
                    onChange={(event) => {
                      listingMutation.reset();
                      setListingDraft({...listingDraft, name: event.target.value.replace(/[\r\n]/g, '')});
                    }}
                  />
                )}
              </Field>
              <Field label='Title' counter={<CharCounter length={listingDraft.title.length} max={TITLE_MAX}/>}>
                {(props) => (
                  <input
                    {...props}
                    className='input'
                    value={listingDraft.title}
                    disabled={listingMutation.isPending}
                    autoComplete='off'
                    {...NO_AUTOFILL}
                    onChange={(event) => setListingDraft({...listingDraft, title: event.target.value})}
                  />
                )}
              </Field>
              <Field label='Description' counter={<CharCounter length={listingDraft.description.length} max={DESCRIPTION_MAX}/>}>
                {(props) => (
                  <DescriptionEditor
                    {...props}
                    className='input resize-y leading-relaxed'
                    rows={Math.min(12, Math.max(3, listingDraft.description.split('\n').length + 1))}
                    value={listingDraft.description}
                    disabled={listingMutation.isPending}
                    onChange={(value) => setListingDraft({...listingDraft, description: value})}
                  />
                )}
              </Field>
              <Field label='Category'>
                {(props) => (
                  <CategorySelect
                    {...props}
                    value={listingDraft.category}
                    disabled={listingMutation.isPending}
                    onChange={(value) => setListingDraft({...listingDraft, category: value})}
                  />
                )}
              </Field>
              <div className='flex flex-wrap items-center gap-2'>
                <ActionButton
                  label='Save listing'
                  icon={<Pencil className='size-4'/>}
                  className='btn-primary'
                  disabled={listingMutation.isPending || !listingChanged || listingInvalid}
                  pending={listingMutation.isPending}
                  onClick={saveListing}
                />
                <button type='button' className='btn btn-sm btn-ghost' disabled={listingMutation.isPending} onClick={() => {
                  listingMutation.reset();
                  setListingDraft(null);
                }}>Cancel</button>
                <span className='text-xs text-subtle'>Works on locked, pending and verified tags too, the owner isn’t notified.</span>
              </div>
            </div>
          ) : (item.description) ? (
            <Markdown text={item.description} className='text-sm text-muted'/>
          ) : (
            <p className='text-sm text-subtle italic'>No description</p>
          )}

        </div>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Content</h3>
            <div className='flex items-center gap-1'>
              <span className='mr-1 text-xs text-subtle tabular-nums'><CharCounter length={(draft ?? content).length} max={CONTENT_MAX}/></span>
              {(draft === null && content) ? <CopyButton value={content} label='Copy'/> : null}
              {(draft === null) ? (
                <button type='button' className='btn btn-ghost btn-sm' onClick={() => setDraft(content)}>
                  <Pencil className='size-4'/>
                  Edit
                </button>
              ) : null}
            </div>
          </div>
          {(draft !== null) ? (
            <div>
              <textarea
                className='input resize-y font-mono leading-relaxed'
                rows={Math.min(24, Math.max(6, draft.split('\n').length + 1))}
                aria-label='Tag content'
                value={draft}
                disabled={contentMutation.isPending}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <ActionButton
                  label='Save content'
                  icon={<Pencil className='size-4'/>}
                  className='btn-primary'
                  disabled={contentMutation.isPending || !draft.trim() || CONTENT_MAX < draft.length || draft === content}
                  pending={contentMutation.isPending}
                  onClick={saveContent}
                />
                <button type='button' className='btn btn-sm btn-ghost' disabled={contentMutation.isPending} onClick={() => setDraft(null)}>Cancel</button>
                <span className='text-xs text-subtle'>Saving bypasses the lock, the owner isn’t notified and the edited date stays the same.</span>
              </div>
            </div>
          ) : (
            <pre
              className='max-h-96 overflow-auto rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none'
              {...selectAllScope}
            >
              {content || <span className='text-subtle italic'>(empty)</span>}
            </pre>
          )}
        </div>

        <TagAssetsPanel tagId={item.id} assets={tag.assets ?? []} ownerId={ownerId} onArchived={onArchived}/>

        <TagStoragePanel tagId={item.id} className='mt-4'/>

        {(item.thumbnail) ? (
          <div className='mt-4'>
            <h3 className='section-label mb-1'>Listing thumbnail</h3>
            <a href={item.thumbnail.urls.cdn} target='_blank' rel='noreferrer noopener' className='inline-block'>
              <img src={item.thumbnail.urls.cdn} alt='' loading='lazy' className='size-16 rounded-md border border-line object-cover'/>
            </a>
          </div>
        ) : null}

        {(item.assets?.length) ? (
          <div className='mt-4'>
            <h3 className='section-label mb-1'>Listing assets</h3>
            <ul className='space-y-1.5'>
              {item.assets.map((asset) => <AssetRow key={asset.id} asset={asset} ownerId={ownerId}/>)}
            </ul>
          </div>
        ) : null}

        <TagHistoryPanel tagId={item.id} ownerId={ownerId}/>

      </div>

      {/* verify on the left, reject on the right, delete set apart after a divider (an outline, like the content flags
          modal's reporting, so it doesn't read as a second reject). The current status' slot turns into "Mark pending",
          like the content flags modal, so nothing sits greyed out and the buttons never move around */}
      <AdminModalFooter {...navigation}>
        {VERIFY_SLOTS.map((slot) => {
          const value = (item.verified === slot) ? TagDirectoryVerificationStates.PENDING_VERIFICATION : slot;
          const action = VERIFY_ACTIONS[value];
          const blocked = value === TagDirectoryVerificationStates.VERIFIED && !!missing;
          return (
            <FooterButton
              key={slot}
              label={action.label}
              short={action.short}
              icon={action.icon}
              className={action.className}
              disabled={mutation.isPending || blocked}
              title={(blocked) ? (missing ?? undefined) : undefined}
              pending={pendingTarget === value}
              onClick={() => setVerified(value, action.toast)}
            />
          );
        })}
        <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/>
        <FooterButton
          label='Delete'
          short='Delete'
          icon={Trash2}
          className='border border-danger/50 bg-transparent text-danger hover:bg-danger/15'
          disabled={mutation.isPending}
          pending={false}
          onClick={onDelete}
        />
      </AdminModalFooter>
    </>
  );
}


function AssetRow({ asset, ownerId }: {asset: TagDirectoryAsset, ownerId: string | null}) {
  const meta = asset.metadata;
  const details = [
    meta?.mimetype,
    (meta?.width && meta?.height) ? `${meta.width}×${meta.height}` : null,
    (meta?.size) ? formatMemory(meta.size, 1) : null,
    (meta?.duration) ? `${meta.duration}s` : null,
  ].filter(Boolean).join(' · ');
  return (
    <li className='text-sm'>
      <div className='flex flex-wrap items-baseline gap-x-2'>
        {(asset.urls?.cdn) ? (
          <a href={asset.urls.cdn} target='_blank' rel='noreferrer noopener' className='font-mono text-brand hover:underline'>{asset.filename}</a>
        ) : (
          <span className='font-mono text-fg'>{asset.filename}</span>
        )}
        {(details) ? <span className='text-xs text-subtle'>{details}</span> : null}
      </div>
      <AssetProvenanceLine provenance={asset.provenance} ownerId={ownerId}/>
    </li>
  );
}


// The owner's change request for a verified listing: what it changes next to what's live, approve or reject it
function EditRequestReview({ item, request }: {item: AdminTagDirectoryItem, request: TagDirectoryEditRequest}) {
  const toast = useToast();
  const mutation = useAdminTagDirectoryEditRequestMutation();
  const [ rejecting, setRejecting ] = useState(false);
  const [ reason, setReason ] = useState('');
  const name = item.title || item.tag.name;

  const liveIds = item.assets.map((asset) => asset.id);
  const proposedIds = request.assets.map((asset) => asset.id);
  const mediaChanged = liveIds.join() !== proposedIds.join();
  const removed = item.assets.filter((asset) => !proposedIds.includes(asset.id));
  const contentChanged = request.content !== null && request.content !== item.tag.content;

  const approve = () => mutation.mutate({tagId: item.id, approve: true}, {
    onSuccess: () => toast(`${name}: change request approved`),
  });
  const reject = () => mutation.mutate({tagId: item.id, reject: reason.trim()}, {
    onSuccess: () => {
      setRejecting(false);
      toast(`${name}: change request rejected`);
    },
  });

  return (
    <section className='mt-4 rounded-lg border border-brand/40 bg-brand/5 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-semibold text-white'>Change request</h3>
          <p className='text-xs text-subtle'>
            {(request.submitted) ? `Submitted ${formatDate(request.submitted)}. ` : ''}Approving applies it, the listing stays verified.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <ActionButton
            label='Approve changes'
            icon={<Check className='size-4'/>}
            className='btn-primary'
            disabled={mutation.isPending}
            pending={mutation.isPending && !!mutation.variables && 'approve' in mutation.variables}
            onClick={approve}
          />
          <ActionButton
            label='Reject'
            icon={<X className='size-4'/>}
            className='btn-danger'
            disabled={mutation.isPending || rejecting}
            pending={false}
            onClick={() => setRejecting(true)}
          />
        </div>
      </div>

      <div className='mt-3 space-y-4 text-sm'>
        <div>
          <h4 className='section-label mb-1'>Note from the owner</h4>
          <p className='whitespace-pre-wrap text-fg'>{request.note || <span className='text-subtle italic'>(none)</span>}</p>
        </div>

        <div>
          <h4 className='section-label mb-1'>Content</h4>
          {(contentChanged) ? (
            <div className='grid gap-2 md:grid-cols-2'>
              <div>
                <p className='mb-1 text-xs text-subtle'>Now</p>
                <pre className='max-h-64 overflow-auto rounded-md border border-line bg-deep p-2 font-mono text-xs whitespace-pre-wrap break-words text-muted'>{item.tag.content}</pre>
              </div>
              <div>
                <p className='mb-1 text-xs text-subtle'>Proposed</p>
                <pre className='max-h-64 overflow-auto rounded-md border border-brand/40 bg-deep p-2 font-mono text-xs whitespace-pre-wrap break-words text-fg'>{request.content}</pre>
              </div>
            </div>
          ) : <p className='text-subtle'>Unchanged</p>}
        </div>

        <div>
          <h4 className='section-label mb-1'>Thumbnail</h4>
          {(request.thumbnail_mode === TagDirectoryEditRequestThumbnailModes.KEEP) ? (
            <p className='text-subtle'>Unchanged</p>
          ) : (
            <div className='flex items-center gap-3'>
              <MiniMedia url={item.thumbnail?.urls.cdn ?? null} mimetype='image/png' label='Now'/>
              <span aria-hidden className='text-subtle'>→</span>
              {(request.thumbnail_mode === TagDirectoryEditRequestThumbnailModes.REMOVE) ? (
                <span className='text-muted'>Removed, the card uses the cover</span>
              ) : (
                <MiniMedia url={request.thumbnail?.urls.cdn ?? null} mimetype='image/png' label='Proposed'/>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className='section-label mb-1'>Media</h4>
          {(mediaChanged) ? (
            <div className='space-y-2'>
              <ul className='flex flex-wrap gap-2'>
                {request.assets.map((asset, index) => (
                  <li key={asset.id}>
                    <MiniMedia
                      url={asset.urls.cdn}
                      mimetype={asset.metadata.mimetype}
                      label={(index === 0) ? 'Cover' : `#${index + 1}`}
                      badge={(asset.is_new) ? 'New' : undefined}
                    />
                  </li>
                ))}
                {(!request.assets.length) ? <li className='text-muted'>No media</li> : null}
              </ul>
              {(removed.length) ? (
                <div>
                  <p className='mb-1 text-xs text-subtle'>Removed</p>
                  <ul className='flex flex-wrap gap-2 opacity-60'>
                    {removed.map((asset) => (
                      <li key={asset.id}><MiniMedia url={asset.urls.cdn} mimetype={asset.metadata.mimetype}/></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : <p className='text-subtle'>Unchanged</p>}
        </div>
      </div>

      {(rejecting) ? (
        <div className='mt-4 space-y-2 border-t border-line pt-4'>
          <Field label='Reason' hint='Shown to the owner. Optional.' counter={<CharCounter length={reason.length} max={DESCRIPTION_MAX}/>}>
            {(props) => (
              <textarea
                {...props}
                className='input min-h-20 resize-y'
                maxLength={DESCRIPTION_MAX}
                value={reason}
                disabled={mutation.isPending}
                onChange={(event) => setReason(event.target.value)}
              />
            )}
          </Field>
          <div className='flex flex-wrap justify-end gap-2'>
            <button type='button' className='btn btn-ghost btn-sm' disabled={mutation.isPending} onClick={() => setRejecting(false)}>Back</button>
            <ActionButton
              label='Reject change request'
              icon={<ShieldX className='size-4'/>}
              className='btn-danger'
              disabled={mutation.isPending}
              pending={mutation.isPending && !!mutation.variables && 'reject' in mutation.variables}
              onClick={reject}
            />
          </div>
        </div>
      ) : null}
      {(mutation.isError) ? (
        <p role='alert' className='mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
          {errorMessage(mutation.error, 'Couldn’t update the change request.')}
        </p>
      ) : null}
    </section>
  );
}


function MiniMedia({ url, mimetype, label, badge }: {url: string | null, mimetype: string, label?: string, badge?: string}) {
  const kind = (mimetype.startsWith('video/')) ? 'video' : (mimetype.startsWith('audio/')) ? 'audio' : 'image';
  return (
    <div className='flex flex-col items-center gap-1'>
      <a
        href={url ?? undefined}
        target='_blank'
        rel='noreferrer noopener'
        className='relative flex size-16 items-center justify-center overflow-hidden rounded-md border border-line bg-deep text-subtle'
      >
        {(!url) ? (
          <span className='text-[10px]'>None</span>
        ) : (kind === 'audio') ? (
          <Music aria-hidden className='size-5'/>
        ) : (kind === 'video') ? (
          <video src={url} muted playsInline preload='metadata' aria-hidden className='size-full object-cover'/>
        ) : (
          <img src={url} alt='' loading='lazy' className='size-full object-cover'/>
        )}
        {(badge) ? <span className='absolute top-0.5 right-0.5 rounded bg-brand px-1 text-[10px] font-medium text-white'>{badge}</span> : null}
      </a>
      {(label) ? <span className='text-[10px] text-subtle'>{label}</span> : null}
    </div>
  );
}


const VERIFY_SLOTS = [ TagDirectoryVerificationStates.VERIFIED, TagDirectoryVerificationStates.NOT_VERIFIED ] as const;

const VERIFY_ACTIONS: Record<number, {label: string, short: string, toast: string, icon: typeof ShieldCheck, className: string}> = {
  [TagDirectoryVerificationStates.VERIFIED]: {label: 'Verify', short: 'Verify', toast: 'verified', icon: ShieldCheck, className: 'btn-primary'},
  [TagDirectoryVerificationStates.PENDING_VERIFICATION]: {label: 'Mark pending', short: 'Pending', toast: 'marked pending', icon: Clock, className: 'btn-secondary'},
  [TagDirectoryVerificationStates.NOT_VERIFIED]: {label: 'Reject', short: 'Reject', toast: 'set to unverified', icon: ShieldX, className: 'btn-danger'},
};


// `AdminModalFooter`'s buttons, sized like the content flags modal's: they share the width on phones (with the short
// label and no icon) and are their natural size from sm up
function FooterButton({ label, short, icon: Icon, className, disabled, title, pending, onClick }: {
  label: string,
  short: string,
  icon: typeof ShieldCheck,
  className: string,
  disabled: boolean,
  title?: string,
  pending: boolean,
  onClick: () => void,
}) {
  return (
    <button type='button' className={cn('btn min-w-0 flex-1 px-2 sm:flex-none sm:px-3', className)} disabled={disabled} title={title} onClick={onClick}>
      {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Icon aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
      <span className='truncate sm:hidden'>{short}</span>
      <span className='hidden sm:inline'>{label}</span>
    </button>
  );
}


function ActionButton({ label, icon, className, disabled, title, pending, onClick }: {
  label: string,
  icon: ReactNode,
  className: string,
  disabled: boolean,
  title?: string,
  pending: boolean,
  onClick: () => void,
}) {
  return (
    <button type='button' className={cn('btn btn-sm', className)} disabled={disabled} title={title} onClick={onClick}>
      {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : icon}
      {label}
    </button>
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='rounded-lg border border-line bg-surface p-4'>
          <Skeleton className='h-4 w-40'/>
          <Skeleton className='mt-2 h-3 w-24 bg-surface-2'/>
          <Skeleton className='mt-4 h-8 w-full bg-surface-2'/>
          <Skeleton className='mt-6 h-3 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
