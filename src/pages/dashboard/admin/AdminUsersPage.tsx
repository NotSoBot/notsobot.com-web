import { Ban, ChevronRight, Clock, Flag, type LucideIcon, MessageSquareWarning, SquareTerminal, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchParamState, useStepBackFromEmptyPage } from '@/hooks/useSearchParamState';
import type { AdminUserEntry, AdminUsersSortBy } from '@/lib/api';
import { ADMIN_PAGE_SIZE, errorMessage, useAdminUsersQuery } from '@/lib/api/dashboardQueries';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatCompact, formatDateTime } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { adminUserPath, BLOCKED_FILTERS, Chip, FiltersButton, FLAGGED_WITHIN, Hint, Pagination } from './adminUi';
import { useOpenListItem } from './AdminTagModal';
import { AdminUserModal, userChips } from './AdminUserModal';


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

      {/* a linked user that isn't on this page is fetched by id */}
      {(openId) ? <AdminUserModal userId={openId} entry={listedItem} navigation={{previousId, nextId, onNavigate: open}} onClose={close}/> : null}
    </>
  );
}



// One line per user, like the server rows: who they are, their roles and whether they're blocked, then a few counts to
// spot busy or troublesome users without opening each one (under the name on phones).
function UserRow({ entry, onOpen }: {entry: AdminUserEntry, onOpen: (userId: string) => void}) {
  const { user } = entry;
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
            <Chip tone='danger' title={[user.blocked_reason || 'No reason given', (user.blocked_until) ? `Until ${formatDateTime(user.blocked_until)}` : null].filter(Boolean).join('\n')}>
              <Ban aria-hidden className='mr-1 size-3'/>
              Blocked
            </Chip>
          ) : null}
          {userChips(user)}
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
