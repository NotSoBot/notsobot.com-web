import { Ban, ChevronDown, ChevronRight, Clock, Flag, type LucideIcon, MessageSquareWarning, Pencil, ShieldCheck, SquareTerminal, Tags, Trash2, Users } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { DetailModalHeader } from '@/components/ui/DetailModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UserFlags, type AdminCopyrightStrike, type AdminCopyrightStrikes, type AdminUserEntry, type AdminUsersSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminUserCopyrightStrikesQuery, useAdminUserEntryQuery, useAdminUsersQuery } from '@/lib/api/dashboardQueries';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatCompact, formatDateTime, formatMemory, snowflakeTimestamp } from '@/lib/utils';

import { premiumLabel } from '../premium';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { adminTagsPath, adminUserPath, BLOCKED_FILTERS, Chip, ContentFlagTiles, CopyableValue, DateTile, ExactDate, FiltersButton, FLAGGED_WITHIN, Hint, Pagination, StatTile, useSearchParamState, useStepBackFromEmptyPage } from './adminUi';
import { AdminModalFooter, AdminTagModal, LinkedItemModal, useOpenListItem } from './AdminTagModal';
import { BlockUserDialog, canBlockUser } from './BlockUserDialog';
import { DeleteUserTagsDialog } from './DeleteUserTagsDialog';
import { EditUserDialog } from './EditUserDialog';


const SORTS: Array<{value: AdminUsersSortBy, label: string}> = [
  {value: 'flags', label: 'Most flagged'},
  {value: 'confirmed', label: 'Most confirmed'},
  {value: 'pending', label: 'Most pending'},
  {value: 'reported', label: 'Most reported'},
  {value: 'last_flagged', label: 'Last flagged'},
  {value: 'blocked', label: 'Recently blocked'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
  {value: 'username', label: 'Username'},
];



export function adminFlagsPath(params: Record<string, string>): string {
  return `${Routes.DASHBOARD_ADMIN_FLAGS}?${new URLSearchParams(params).toString()}`;
}

function adminReportsPath(params: Record<string, string>): string {
  return adminListPath(Routes.DASHBOARD_ADMIN_REPORTS, params);
}

function adminListPath(route: string, params: Record<string, string>): string {
  return `${route}?${new URLSearchParams(params).toString()}`;
}

// the modal's footer actions: they share the row on phones (short labels, no icons there, sized to their labels since four
// even slots are too narrow for them); destructive ones tinted red
const ACTION = 'btn min-w-0 flex-auto px-1.5 sm:flex-none sm:px-3';
const DANGER_TINT = 'border border-danger/40 bg-danger/10 text-danger-text hover:bg-danger/20';

const TITLE_ID = 'admin-user-modal-title';


export function AdminUsersPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'flags';
  const onlyFlagged = searchParams.get('flagged') === '1';
  const flaggedWithin = FLAGGED_WITHIN.find((item) => item.value === searchParams.get('within')) ?? FLAGGED_WITHIN[0];
  const blocked = BLOCKED_FILTERS.find((item) => item.value === searchParams.get('blocked')) ?? BLOCKED_FILTERS[0];
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  // the ones in the collapsible panel set to something other than their default
  const activeFilters = [ flaggedWithin.hours, onlyFlagged, blocked.blocked !== null, sortBy !== 'flags' ].filter(Boolean).length;

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminUsersQuery({
    query: debouncedQuery,
    sortBy,
    onlyFlagged,
    flaggedWithin: flaggedWithin.hours,
    blocked: blocked.blocked,
    page,
  });
  const items = data?.items ?? [];
  // `/dashboard/admin/users/<id>` opens the user over the list, ← / → step through this page's users
  const { openId, openItem: listedItem, previousId, nextId, open, close } = useOpenListItem(items, (entry) => entry.user.id, Routes.DASHBOARD_ADMIN_USERS);
  const linked = useAdminUserEntryQuery(openId, !listedItem);
  const openItem = listedItem ?? linked.data ?? null;
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader title='Users' description='Everyone NotSoBot knows about, with their content flag history.'/>

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by username or id...'
          aria-label='Search users'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='admin-user-filters'/>
      </div>

      {/* hidden until asked for, like the content flags page's: one labelled select each */}
      <div id='admin-user-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Last flagged</span>
          <select className='input' value={flaggedWithin.value} onChange={(event) => update({within: (event.target.value === 'any') ? null : event.target.value})}>
            {FLAGGED_WITHIN.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Content flags</span>
          <select className='input' value={(onlyFlagged) ? '1' : ''} onChange={(event) => update({flagged: event.target.value || null})}>
            <option value=''>Anyone</option>
            <option value='1'>Only flagged users</option>
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Blocked</span>
          <select className='input' value={blocked.value} onChange={(event) => update({blocked: (event.target.value === 'any') ? null : event.target.value})}>
            {BLOCKED_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Sort</span>
          <select className='input' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'flags') ? null : event.target.value})}>
            {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load users' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Users className='size-10'/>} title='No users found'>
          {(debouncedQuery || onlyFlagged || flaggedWithin.hours || blocked.blocked !== null) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((entry) => <UserRow key={entry.user.id} entry={entry} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <UserDetails key={openItem.user.id} entry={openItem} navigation={{previousId, nextId, onNavigate: open}}/>
        </AdminTagModal>
      ) : (openId) ? (
        <LinkedItemModal noun='user' notFoundMessage='NotSoBot doesn’t know anyone with this id.' query={linked} onClose={close}/>
      ) : null}
    </>
  );
}


function userRoles(user: AdminUserEntry['user']) {
  const owner = (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
  const moderator = (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
  return {owner, moderator};
}


// One line per user, like the server rows: who they are, their roles and whether they're blocked, then a few counts to
// spot busy or troublesome users without opening each one (under the name on phones).
function UserRow({ entry, onOpen }: {entry: AdminUserEntry, onOpen: (userId: string) => void}) {
  const { user } = entry;
  const { owner, moderator } = userRoles(user);
  return (
    <li>
      <Link
        to={adminUserPath(user.id)}
        onClick={(event) => {
          // a plain click opens it over the list (keeping the filters), new tabs and copied links still get the url
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
            event.preventDefault();
            onOpen(user.id);
          }
        }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:px-5',
          user.blocked && 'bg-danger/[0.04] shadow-[inset_3px_0_0_var(--color-danger)]',
        )}
      >
        <UserAvatar user={user} size={80} className='size-10 shrink-0 rounded-full bg-surface-3'/>
        <div className='min-w-0 flex-1'>
          <div className='truncate font-medium text-white' title={userDisplayTag(user)}>{userDisplayTag(user)}</div>
          <div className='truncate font-mono text-xs text-subtle'>{user.id}</div>
          <UserCounts entry={entry} className='mt-1 sm:hidden'/>
        </div>
        <div className='flex shrink-0 flex-wrap justify-end gap-1.5'>
          {(user.blocked) ? (
            <Chip tone='danger' title={user.blocked_reason || 'No reason given'}>
              <Ban aria-hidden className='mr-1 size-3'/>
              Blocked
            </Chip>
          ) : null}
          {(owner) ? <Chip tone='brand'>Owner</Chip> : null}
          {(moderator) ? <Chip tone='brand'>Moderator</Chip> : null}
          {(user.premium_type) ? <Chip>{premiumLabel(user.premium_type)}</Chip> : null}
        </div>
        <UserCounts entry={entry} className='hidden sm:flex'/>
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
      </Link>
    </li>
  );
}


// a user row's counts, like the server rows': commands they've run, the scanner's hard flags, the flags still waiting on
// staff, and reports about them
const COUNTS: Array<{icon: LucideIcon, label: string, value: (entry: AdminUserEntry) => number, alert?: boolean}> = [
  {icon: SquareTerminal, label: 'commands run', value: (entry) => entry.commands},
  {icon: Flag, label: 'flagged', value: (entry) => entry.content_flags.flagged, alert: true},
  {icon: Clock, label: 'flags to review', value: (entry) => entry.content_flags.pending, alert: true},
  {icon: MessageSquareWarning, label: 'reports about them', value: (entry) => entry.reports, alert: true},
];

function UserCounts({ entry, className }: {entry: AdminUserEntry, className?: string}) {
  return (
    <div className={cn('flex shrink-0 items-center gap-3 text-xs tabular-nums', className)}>
      {COUNTS.map(({ icon: Icon, label, value: getValue, alert }) => {
        const value = getValue(entry);
        const text = `${value.toLocaleString()} ${label}`;
        return (
          <Hint
            key={label}
            text={text}
            className={cn(
              'inline-flex items-center gap-1 sm:min-w-12',
              (!value) ? 'text-subtle/60' : (alert) ? 'text-warning' : 'text-muted',
            )}
          >
            <Icon className='size-3.5 shrink-0'/>
            <span>{formatCompact(value)}</span>
          </Hint>
        );
      })}
    </div>
  );
}


// The user's modal, laid out like the content flag one: who they are with their roles and whether they're blocked up
// top, their flag/report numbers (each a link to the list behind it), and everything staff can do to them in the
// footer between Previous / Next, so it's always a click away. `navigation` is the modal's Previous / Next
function UserDetails({ entry, navigation }: {
  entry: AdminUserEntry,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
}) {
  const { user, content_flags: flags } = entry;
  const { user: me } = useAuth();
  const viewerIsOwner = isOwner(me);
  const { owner, moderator } = userRoles(user);
  const canBlock = canBlockUser(user, viewerIsOwner);
  const cantBlockReason = (canBlock) ? null : (owner) ? 'Owners can’t be blocked.' : 'Only owners can block moderators.';
  // deleting everything they made can't be undone, so owners only (moderators delete tags one at a time)
  const canDeleteTags = canBlock && viewerIsOwner;
  const cantDeleteTagsReason = (canDeleteTags) ? null : cantBlockReason ?? 'Only bot owners can delete all of a user’s tags.';
  const [ blocking, setBlocking ] = useState(false);
  const [ deletingTags, setDeletingTags ] = useState(false);
  const [ editing, setEditing ] = useState(false);
  const name = userDisplayTag(user);
  const created = snowflakeTimestamp(user.id);

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<UserAvatar user={user} size={64} className='size-7 shrink-0 rounded-full bg-surface-3'/>}
        title={name}
        titleTooltip={name}
        meta={(
          // the id, with when it was made always on its own line under it
          <span className='flex flex-col items-start gap-0.5'>
            <CopyableValue value={user.id} truncate={0}/>
            {(created) ? <span>Created <ExactDate value={created}/></span> : null}
          </span>
        )}
        states={[
          (owner) ? <Chip key='owner' tone='brand'>Owner</Chip> : null,
          (moderator) ? <Chip key='moderator' tone='brand'>Moderator</Chip> : null,
          (user.premium_type) ? <Chip key='premium'>{premiumLabel(user.premium_type)}</Chip> : null,
        ]}
        status={(
          <Chip
            tone={(user.blocked) ? 'danger' : 'neutral'}
            title={(user.blocked) ? 'Blocked from using NotSoBot anywhere' : 'Can use NotSoBot'}
            className='w-24 justify-center'
          >
            {(user.blocked) ? 'Blocked' : 'Not blocked'}
          </Chip>
        )}
        wideStatus
      />

      <div className='px-4 pt-4 pb-5 sm:border-t sm:border-line sm:px-6'>
        {(user.blocked) ? <div className='mb-5 [&>div]:w-full'><BlockedNotice reason={user.blocked_reason}/></div> : null}

        {/* side by side from sm up so both fill two rows of tiles: the flag counts by status on the left, commands and
            reports on the right once there's room, then what they have across the bottom. Stacked below that */}
        <div className='grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:gap-4'>
          <ContentFlagTiles flags={flags} flagsPath={(status) => adminFlagsPath({user_id: user.id, status})}/>
          <section>
            <h3 className='section-label mb-2'>Activity</h3>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2'>
              <StatTile label='Commands run' value={entry.commands.toLocaleString()} title='Commands they’ve run, ever'/>
              <DateTile label='First seen' value={entry.first_seen} empty='Never' title='When they ran their first command'/>
              <StatTile label='Reports about' to={adminReportsPath({q: `target:${user.id}`, status: 'all'})} value={entry.reports.toLocaleString()} tone='text-warning'/>
              <StatTile label='Reports sent' to={adminReportsPath({q: `user:${user.id}`, status: 'all'})} value={entry.reports_sent.toLocaleString()}/>
            </div>
          </section>
        </div>

        <section className='mt-5 lg:mt-4'>
          <h3 className='section-label mb-2'>Has</h3>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
            <StatTile label='Applications' to={adminListPath(Routes.DASHBOARD_ADMIN_APPLICATIONS, {user_id: user.id})} value={entry.owned.applications.toLocaleString()}/>
            <StatTile
              label='Files'
              // an api from before the size was added leaves it out
              value={(entry.owned.files && entry.files_size) ? `${entry.owned.files.toLocaleString()} · ${formatMemory(entry.files_size, (entry.files_size < 1024 * 1024) ? 0 : 1)}` : entry.owned.files.toLocaleString()}
              title='Files they’ve uploaded that haven’t expired, and the storage they take up (the same file uploaded twice is stored once)'
            />
            {/* a count only: reminders are people's private notes, so staff don't get to read them */}
            <StatTile label='Reminders' value={entry.owned.reminders.toLocaleString()} title='Reminders they’ve set. Their contents are private.'/>
            <StatTile label='Tags' to={adminTagsPath(`user:${user.id}`)} value={entry.owned.tags.toLocaleString()}/>
            <StatTile label='Voices' to={adminListPath(Routes.DASHBOARD_ADMIN_VOICES, {user_id: user.id})} value={entry.owned.voices.toLocaleString()}/>
          </div>
        </section>

        <CopyrightStrikes userId={user.id}/>

        {(cantBlockReason) ? <p className='mt-4 text-xs text-subtle'>{cantBlockReason}</p> : null}
      </div>

      {/* what they can see on the left, blocking and deleting set apart after a divider. The block slot turns into
          "Unblock" and the ones this viewer can't use are disabled rather than left out, so the buttons never move around */}
      <AdminModalFooter {...navigation}>
        {(viewerIsOwner) ? (
          <button type='button' className={cn(ACTION, 'btn-secondary')} onClick={() => setEditing(true)}>
            <Pencil aria-hidden className='hidden size-4 shrink-0 sm:block'/>
            <span className='truncate sm:hidden'>Edit</span>
            <span className='hidden sm:inline'>Edit flags & premium</span>
          </button>
        ) : null}
        <Link to={adminTagsPath(`user:${user.id}`)} className={cn(ACTION, 'btn-secondary')}>
          <Tags aria-hidden className='hidden size-4 shrink-0 sm:block'/>
          <span className='truncate sm:hidden'>Tags</span>
          <span className='hidden sm:inline'>View tags</span>
        </Link>
        <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/>
        <button
          type='button'
          className={cn(ACTION, (user.blocked) ? 'btn-secondary' : 'btn-danger')}
          disabled={!canBlock}
          title={cantBlockReason ?? undefined}
          onClick={() => setBlocking(true)}
        >
          {(user.blocked) ? <ShieldCheck aria-hidden className='hidden size-4 shrink-0 sm:block'/> : <Ban aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
          <span className='truncate'>{(user.blocked) ? 'Unblock' : 'Block'}</span>
        </button>
        <button type='button' className={cn(ACTION, DANGER_TINT)} disabled={!canDeleteTags} title={cantDeleteTagsReason ?? undefined} onClick={() => setDeletingTags(true)}>
          <Trash2 aria-hidden className='hidden size-4 shrink-0 sm:block'/>
          <span className='truncate sm:hidden'>Delete</span>
          <span className='hidden sm:inline'>Delete tags</span>
        </button>
      </AdminModalFooter>

      {(blocking) ? (
        <BlockUserDialog user={user} blocked={user.blocked} blockedReason={user.blocked_reason} onClose={() => setBlocking(false)}/>
      ) : null}
      {(editing) ? <EditUserDialog user={user} onClose={() => setEditing(false)}/> : null}
      {(deletingTags) ? <DeleteUserTagsDialog user={user} onClose={() => setDeletingTags(false)}/> : null}
    </div>
  );
}


// The repeat infringer policy's numbers: copyright removals of their tags and files, one per staff action. The count
// opens the list of them, each with who took it down, the notice and the tags it hit
function CopyrightStrikes({ userId }: {userId: string}) {
  const query = useAdminUserCopyrightStrikesQuery(userId);
  const [ open, setOpen ] = useState(false);
  const strikes = query.data?.strikes ?? [];
  const value = (query.isPending) ? '…' : (query.isError) ? '—' : query.data.count.toLocaleString();

  return (
    <section className='mt-5 lg:mt-4'>
      <h3 className='section-label mb-2'>Copyright</h3>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <StatTile
          label='Strikes'
          value={value}
          tone='text-danger-text'
          title={(query.isError) ? errorMessage(query.error, 'Couldn’t load their strikes.') : (strikes.length) ? `${(open) ? 'Hide' : 'Show'} their strikes` : 'Copyright removals of their tags, one per staff action'}
          onClick={(strikes.length) ? () => setOpen(!open) : undefined}
        />
        <DateTile label='Last strike' value={strikes[0]?.created ?? null} empty='Never'/>
      </div>
      {(open && strikes.length) ? (
        <ol className='mt-2 space-y-2'>
          {strikes.map((strike) => <StrikeCard key={strike.action_id} strike={strike} users={query.data!.users}/>)}
        </ol>
      ) : null}
    </section>
  );
}


function StrikeCard({ strike, users }: {strike: AdminCopyrightStrike, users: AdminCopyrightStrikes['users']}) {
  const actor = (strike.actor_id) ? users[strike.actor_id] : null;
  return (
    <li className='rounded-md border border-line bg-deep p-2.5 text-sm'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
        {(strike.actor_id) ? (
          <span className='inline-flex min-w-0 items-center gap-1'>
            {(actor) ? <span className='truncate font-medium text-fg'>{actor.username}</span> : null}
            <CopyableValue value={strike.actor_id} truncate={0} to={adminUserPath(strike.actor_id)} linkTitle='Open in users'/>
          </span>
        ) : <span>Unknown staff member</span>}
        <span aria-hidden>·</span>
        <ExactDate value={strike.created} format={formatDateTime}/>
        {(strike.asset_ids.length) ? <Chip>{strike.asset_ids.length.toLocaleString()} {(strike.asset_ids.length === 1) ? 'file' : 'files'}</Chip> : null}
      </div>
      {(strike.notice) ? (
        <p className='mt-1.5 rounded border-l-2 border-line-strong pl-2 text-xs break-words whitespace-pre-wrap text-muted'>{strike.notice}</p>
      ) : (
        <p className='mt-1.5 text-xs text-subtle italic'>No notice given</p>
      )}
      {(strike.tag_ids.length) ? (
        <p className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
          {(strike.tag_ids.length === 1) ? 'Tag' : 'Tags'}
          {strike.tag_ids.map((tagId) => (
            <Link key={tagId} to={adminTagsPath(`id:${tagId}`)} className='font-mono text-fg hover:underline'>{tagId}</Link>
          ))}
        </p>
      ) : null}
    </li>
  );
}


// a red callout with the block reason, two lines at most until "Show full reason" opens the rest
function BlockedNotice({ reason }: {reason: string | null}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [ expanded, setExpanded ] = useState(false);
  const [ overflowing, setOverflowing ] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) {
      return;
    }
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [reason, expanded]);

  return (
    <div className='w-72 rounded-md border border-danger/40 bg-danger/15 px-3 py-2'>
      <p className='flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#ff8a8c] uppercase'>
        <Ban aria-hidden className='size-3.5 shrink-0'/>
        Blocked
      </p>
      {(reason) ? (
        <p ref={ref} className={cn('mt-1 text-xs break-words whitespace-pre-wrap text-fg', !expanded && 'line-clamp-2')}>{reason}</p>
      ) : (
        <p className='mt-1 text-xs text-muted italic'>No reason given</p>
      )}
      {(reason && (overflowing || expanded)) ? (
        <button
          type='button'
          className='mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded text-xs font-semibold text-[#ff8a8c] hover:text-white'
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {(expanded) ? 'Show less' : 'Show full reason'}
          <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}/>
        </button>
      ) : null}
    </div>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 8}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-8 rounded-full'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-32'/>
            <Skeleton className='mt-1.5 h-3 w-40 bg-surface-2'/>
          </div>
          <Skeleton className='hidden h-4 w-48 bg-surface-2 sm:block'/>
          <Skeleton className='h-3 w-24 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
