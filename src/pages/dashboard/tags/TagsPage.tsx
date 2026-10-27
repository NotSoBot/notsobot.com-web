import { BookOpen, Tags as TagsIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { isStaff, useAuth } from '@/auth';
import { translate, useI18n, type TranslationKey } from '@/i18n';
import { errorMessage, ME_TAGS_PAGE_SIZE, useMeGuildsQuery, useMeTagsQuery } from '@/lib/api/dashboardQueries';
import { TagDirectoryVerificationStates, type MeTagsDirectoryFilter, type MeTagsSortBy, type Tag, type UserMe } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { NsfwBadge, tagDirectoryItemPath } from '@/pages/tags/tagDirectory';

import { FiltersButton, Pagination, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { ServerFilterChip } from '../servers/ServerFilterChip';
import { DeleteMeTagDialog } from './DeleteMeTagDialog';
import { TagDetailsModal } from './TagDetailsModal';
import { TagEditorModal } from './TagEditorModal';
import { readTagListState, writeTagListState } from './tagListState';
import { dashboardTagEditPath, dashboardTagPath, TagCardDeleteButton, tagLocation, TagLocationChip, tagServerPath, TagStatusBadges } from './tagMeta';


// labels are `dtags.sort.<value>`
const SORTS: Array<{value: MeTagsSortBy}> = [
  {value: 'newest'},
  {value: 'oldest'},
  {value: 'uses'},
  {value: 'uses_week'},
  {value: 'uses_month'},
  {value: 'uses_year'},
  {value: 'last_used'},
  {value: 'name'},
];

const findSort = (value: string | null | undefined) => SORTS.find((sort) => sort.value === value)?.value;

// the window a `uses_<period>` sort counts over, cards then show `dtags.recent_<period>`
type RecentPeriod = 'week' | 'month' | 'year';
const recentPeriod = (sortBy: MeTagsSortBy): RecentPeriod | null => (sortBy.startsWith('uses_')) ? sortBy.slice('uses_'.length) as RecentPeriod : null;

// the `directory` param, `all` is left out of the url. The label is `dtags.filter.<value>`, and the description
// (`dtags.filter.<value>_description`, a getter) finishes "N tags ..." in the header
const DIRECTORY_FILTERS: Array<{value: string, filter: MeTagsDirectoryFilter, description: string}> = [
  {value: 'all', filter: null, description: ''},
  {value: 'listed', filter: {listed: true, verified: null}, get description() { return translate('dtags.filter.listed_description'); }},
  {value: 'verified', filter: {listed: true, verified: TagDirectoryVerificationStates.VERIFIED}, get description() { return translate('dtags.filter.verified_description'); }},
  {value: 'pending', filter: {listed: true, verified: TagDirectoryVerificationStates.PENDING_VERIFICATION}, get description() { return translate('dtags.filter.pending_description'); }},
  {value: 'unverified', filter: {listed: true, verified: TagDirectoryVerificationStates.NOT_VERIFIED}, get description() { return translate('dtags.filter.unverified_description'); }},
  {value: 'unlisted', filter: {listed: false}, get description() { return translate('dtags.filter.unlisted_description'); }},
];

const findDirectoryFilter = (value: string | null | undefined) => DIRECTORY_FILTERS.find((filter) => filter.value === value);


export function TagsPage() {
  const { t, plural } = useI18n();
  const [ searchParams, setSearchParams ] = useSearchParams();
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const sortBy = findSort(searchParams.get('sort')) ?? 'newest';
  const directoryFilter = findDirectoryFilter(searchParams.get('directory')) ?? DIRECTORY_FILTERS[0];
  // `?server=<id>`: only the tags in that server (a server page's "Your tags")
  const serverId = searchParams.get('server') || null;
  const filtered = !!debouncedQuery || directoryFilter.filter !== null || !!serverId;
  // the panel starts closed like the admin pages', the button counts the ones not on their default
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [directoryFilter.filter !== null, sortBy !== 'newest'].filter(Boolean).length;

  // `?page=` is 1-based, left out for the first
  const page = Math.max(0, (Number(searchParams.get('page')) || 1) - 1);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeTagsQuery(debouncedQuery, sortBy, directoryFilter.filter, serverId, page);
  const items = useMemo(() => data?.items ?? [], [data]);
  const count = data?.count ?? 0;

  // server names for the picker, when the dashboard can see the caller's servers (it's fine if it can't)
  const { user } = useAuth();
  const [ deleting, setDeleting ] = useState<Tag | null>(null);
  const { data: guilds } = useMeGuildsQuery();
  const guildNames = useMemo(() => new Map((guilds ?? []).map((guild) => [guild.id, guild.name])), [guilds]);

  // ---- leave off where you were ----
  // arriving without a search, sort or filter (sidebar, "All tags", after a delete): bring back the last ones
  useLayoutEffect(() => {
    // a server's tags start from a clean slate
    if (searchParams.has('server')) {
      return;
    }
    const saved = readTagListState();
    const restore = {
      q: (!searchParams.has('q') && saved?.search) || null,
      sort: (!searchParams.has('sort') && findSort(saved?.sort) !== 'newest' && findSort(saved?.sort)) || null,
      directory: (!searchParams.has('directory') && findDirectoryFilter(saved?.directory)?.filter && saved?.directory) || null,
    };
    if (restore.q || restore.sort || restore.directory) {
      updateParams(restore);
    }
    // only on arrival
  }, []);

  // remember the search, sort and filter on the way out (the scroll position is remembered by the router, see SiteLayout)
  const listStateRef = useRef({search: query, sort: sortBy, directory: directoryFilter.value});
  listStateRef.current = {search: query, sort: sortBy, directory: directoryFilter.value};
  useLayoutEffect(() => {
    return () => writeTagListState(listStateRef.current);
  }, []);

  // a new search, sort or filter starts back on the first page
  function updateParams(changes: Record<string, string | null>) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [ key, value ] of Object.entries(changes)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      if (!('page' in changes)) {
        next.delete('page');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  }

  function setPage(value: number) {
    updateParams({page: (value <= 0) ? null : String(value + 1)});
    window.scrollTo({top: 0});
  }
  // deleting the last tag of the last page leaves an empty page behind
  useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_TAGS_PAGE_SIZE});

  // `/dashboard/tags/:tagId` opens the tag's details over the list and `/dashboard/tags/:tagId/edit` its editor, both keeping
  // the list's search, sort and filter in the url
  const tagId = useMatch(Routes.DASHBOARD_TAG)?.params.tagId ?? null;
  const editingId = useMatch(Routes.DASHBOARD_TAG_EDIT)?.params.tagId ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const openedHere = (location.state as {tagOpenedHere?: boolean} | null)?.tagOpenedHere === true;
  const editOpenedHere = (location.state as {editOpenedHere?: boolean} | null)?.editOpenedHere === true;
  const listSearch = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('tag');
    next.delete('tab');
    const search = next.toString();
    return (search) ? `?${search}` : '';
  }, [searchParams]);

  // links from before the details had their own path (`?tag=<id>`)
  const legacyTagId = searchParams.get('tag');
  useLayoutEffect(() => {
    if (legacyTagId && !tagId && !editingId) {
      navigate({pathname: dashboardTagPath(legacyTagId), search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [legacyTagId, tagId, editingId, navigate, listSearch]);

  const openTag = useCallback((id: string) => {
    navigate({pathname: dashboardTagPath(id), search: listSearch()}, {
      preventScrollReset: true,
      // stepping between tags replaces, so Back still closes the modal in one go
      replace: !!tagId,
      state: {tagOpenedHere: openedHere || !tagId},
    });
  }, [navigate, listSearch, tagId, openedHere]);

  const editTag = useCallback((id: string) => {
    navigate({pathname: dashboardTagEditPath(id), search: listSearch()}, {preventScrollReset: true, state: {editOpenedHere: true}});
  }, [navigate, listSearch]);

  const closeEditor = useCallback(() => {
    if (editOpenedHere) {
      // back to wherever it was opened from, usually the tag's details
      navigate(-1);
    } else {
      navigate({pathname: Routes.DASHBOARD_TAGS, search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, editOpenedHere, listSearch]);

  // from the editor back to the tag's details
  const backToTag = useCallback((id: string) => {
    if (editOpenedHere) {
      // opened from the details, so they're the previous entry
      navigate(-1);
    } else {
      navigate({pathname: dashboardTagPath(id), search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, editOpenedHere, listSearch]);

  const closeTag = useCallback(() => {
    if (openedHere) {
      navigate(-1);
    } else {
      // arrived on the tag's link, there's no list entry to go back to
      navigate({pathname: Routes.DASHBOARD_TAGS, search: listSearch()}, {replace: true, preventScrollReset: true});
    }
  }, [navigate, openedHere, listSearch]);

  const tagIndex = (tagId) ? items.findIndex((item) => item.id === tagId) : -1;

  const setQuery = (value: string) => updateParams({q: value});
  const setSortBy = (value: string) => updateParams({sort: (value === 'newest') ? null : value});
  const setDirectoryFilter = (value: string) => updateParams({directory: (value === 'all') ? null : value});

  return (
    <>
      <DashboardHeader
        title={t('dtags.title')}
        description={
          (data) ? (
            (debouncedQuery)
              ? plural('dtags.matches', count, {query: debouncedQuery})
              : (serverId && !directoryFilter.filter)
              ? plural('dtags.own_in', count, {server: guildNames.get(serverId) ?? t('dtags.this_server')})
              : (directoryFilter.filter)
              ? plural('dtags.filtered', count, {description: directoryFilter.description})
              : plural('dtags.own', count)
          ) : t('dtags.loading_description')
        }
      />

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={setQuery}
          placeholder={t('dtags.search_placeholder')}
          aria-label={t('dtags.search_label')}
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='tag-filters'/>
      </div>

      <div id='tag-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('dtags.directory')}</span>
          <select className='input' value={directoryFilter.value} onChange={(event) => setDirectoryFilter(event.target.value)}>
            {DIRECTORY_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{t(`dtags.filter.${filter.value}` as TranslationKey)}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('dtags.sort')}</span>
          <select className='input' value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{t(`dtags.sort.${sort.value}`)}</option>)}
          </select>
        </label>
      </div>

      {(serverId) ? <ServerFilterChip guildId={serverId} name={guildNames.get(serverId)} onClear={() => updateParams({server: null})}/> : null}

      {(isPending) ? (
        <TagListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title={t('dtags.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<TagsIcon className='size-10'/>} title={t((filtered) ? 'dtags.empty_filtered' : 'dtags.empty')}>
          {(debouncedQuery) ? t('dtags.empty_search') : (directoryFilter.value === 'listed') ? (
            t('dtags.empty_listed')
          ) : (directoryFilter.value === 'unlisted') ? (
            t('dtags.empty_unlisted')
          ) : (directoryFilter.filter) ? (
            t('dtags.empty_filter', {description: directoryFilter.description})
          ) : t('dtags.empty_none')}
        </EmptyState>
      ) : (
        <>
          <ul className={cn('grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3', isPlaceholderData && 'opacity-60')}>
            {items.map((tag) => <TagCard key={tag.id} tag={tag} user={user} guildNames={guildNames} period={recentPeriod(sortBy)} onOpen={openTag} onDelete={setDeleting}/>)}
          </ul>
          <Pagination page={page} count={count} pageSize={ME_TAGS_PAGE_SIZE} onChange={setPage} fetching={isFetching && isPlaceholderData}/>
        </>
      )}

      {(tagId) ? (
        <TagDetailsModal
          key={tagId}
          tagId={tagId}
          guildNames={guildNames}
          previousId={(0 < tagIndex) ? items[tagIndex - 1].id : null}
          nextId={(tagIndex !== -1 && tagIndex + 1 < items.length) ? items[tagIndex + 1].id : null}
          onNavigate={openTag}
          onEdit={editTag}
          onClose={closeTag}
        />
      ) : null}

      {(editingId) ? <TagEditorModal tagId={editingId} onBack={backToTag} onClose={closeEditor}/> : null}

      {(deleting) ? <DeleteMeTagDialog tag={deleting} onClose={() => setDeleting(null)}/> : null}
    </>
  );
}


// laid out like the directory's cards: NSFW by the name, the states stacked top-right, aliases as a subtitle, the location pinned above the footer.
// Just enough to spot the tag, the content and the rest of its details are a click away (`TagDetailsModal`)
function TagCard({ tag, user, guildNames, period, onOpen, onDelete }: {
  tag: Tag,
  user: UserMe | null,
  guildNames: Map<string, string>,
  period: RecentPeriod | null,
  onOpen: (id: string) => void,
  onDelete: (tag: Tag) => void,
}) {
  const { t, plural } = useI18n();
  const location = tagLocation(tag, user, guildNames);
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
          {(tag.reference_tag) ? <AliasOf reference={tag.reference_tag} user={user} onOpen={onOpen}/> : null}
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <TagStatusBadges tag={tag}/>
        </div>
      </div>
      {/* pinned above the footer, so it sits in the same spot on every card whether or not there's an alias line */}
      <div className='mt-auto mb-3 flex min-w-0'>
        {/* servers in the caller's list (the named ones) link to their dashboard page */}
        <TagLocationChip location={location} to={tagServerPath(location)}/>
      </div>
      <div className='flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-subtle'>
        <span className='flex items-center gap-3 tabular-nums'>
          {/* sorted by recent uses: the window's count first */}
          {(period && tag.recent_uses !== undefined) ? <span className='whitespace-nowrap text-fg'>{plural(`dtags.recent_${period}`, tag.recent_uses)}</span> : null}
          <span className='whitespace-nowrap'>{plural('dtags.uses', tag.uses)}</span>
        </span>
        <span className='flex items-center gap-1'>
          {(tag.edited) ? t('dtags.edited', {date: formatDate(tag.edited)}) : t('dtags.created', {date: formatDate(tag.created)})}
          {/* like the editor's: locked tags (pending/verified in the directory) are staff only */}
          {(!tag.locked || isStaff(user)) ? <TagCardDeleteButton name={tag.name} onClick={() => onDelete(tag)}/> : null}
        </span>
      </div>
    </li>
  );
}


// the alias' source tag: one of the caller's own opens over the list, someone else's directory tag links to its listing.
// The links sit above the card's stretched button so they stay clickable
function AliasOf({ reference, user, onOpen }: {reference: Tag, user: UserMe | null, onOpen: (id: string) => void}) {
  const { t } = useI18n();
  const own = !!user && reference.user?.id === user.id;
  const linkClassName = 'relative z-10 inline-flex min-w-0 cursor-pointer items-center gap-1 text-brand hover:underline';
  const name = <span className='truncate'>{reference.name}</span>;
  return (
    <p className='mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted'>
      <span className='shrink-0'>{t('dtags.alias_of')}</span>
      {(own) ? (
        <button type='button' className={linkClassName} title={t('dtags.open_yours')} onClick={() => onOpen(reference.id)}>
          {name}
        </button>
      ) : (reference.is_on_directory) ? (
        <Link to={tagDirectoryItemPath(reference.id)} className={linkClassName} title={t('dtags.open_directory')}>
          {name}
        </Link>
      ) : <span className='min-w-0 truncate'>{reference.name}</span>}
      {(reference.is_on_directory) ? (
        <span className='inline-flex shrink-0 items-center gap-1 text-subtle'>
          <BookOpen aria-hidden className='size-3.5'/>
          {t('dtags.from_directory')}
        </span>
      ) : null}
    </p>
  );
}


function TagListSkeleton() {
  return (
    <ul aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='rounded-lg border border-line bg-surface p-4'>
          <Skeleton className='h-4 w-32'/>
          <Skeleton className='mt-3 h-3 w-1/2 bg-surface-2'/>
          <Skeleton className='mt-6 h-3 w-full bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
