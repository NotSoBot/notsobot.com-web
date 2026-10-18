import { ArrowUpRight, Ban, Blocks, ChevronRight, CircleCheck, KeyRound, Pencil, Plus, RefreshCw, Search, Trash2, UserMinus } from 'lucide-react';
import { Link } from 'react-router';
import { useId, useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailModalHeader, DetailModalStrip } from '@/components/ui/DetailModal';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminApplication, ApplicationAccessItem } from '@/lib/api';
import {
  ADMIN_PAGE_SIZE,
  errorMessage,
  useAdminApplicationAccessQuery,
  useAdminApplicationQuery,
  useAdminApplicationsQuery,
  useDeleteAdminApplicationMutation,
  useGrantApplicationAccessMutation,
  usePatchAdminApplicationMutation,
  useRenameAdminApplicationMutation,
  useResetAdminApplicationTokenMutation,
  useRevokeApplicationAccessMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, NO_AUTOFILL } from '@/lib/utils';

import { ApplicationChips, ApplicationNameDialog, isApplicationDisabled, isNotSoBotApplication } from '../applications/ApplicationDialogs';
import { DashboardHeader, EmptyState, ErrorPanel, Field, Skeleton } from '../ui';
import { adminUserPath, Chip, CopyableValue, DateTile, ExactDate, FiltersButton, IdFilter, Pagination, StatTile, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';
import { AdminModalFooter, AdminTagModal, useOpenListItem } from './AdminTagModal';


type Tab = 'applications' | 'access';

const TABS: Array<{value: Tab, label: string}> = [
  {value: 'applications', label: 'Applications'},
  {value: 'access', label: 'API access'},
];

const STATUSES = [
  {value: '', label: 'Any'},
  {value: 'enabled', label: 'Enabled'},
  {value: 'disabled', label: 'Disabled'},
];


export function AdminApplicationsPage() {
  const state = useSearchParamState();
  const tab: Tab = (state.searchParams.get('tab') === 'access') ? 'access' : 'applications';

  return (
    <>
      <DashboardHeader
        title='Applications'
        description='Every API application, and who can make them. Staff never see tokens: resetting one only revokes the old token.'
      />
      <div className='mb-4 flex'>
        <Segmented
          label='Show'
          value={tab}
          options={TABS}
          onChange={(value) => state.update({tab: (value === 'access') ? 'access' : null, q: null, user_id: null, status: null})}
        />
      </div>
      {(tab === 'access') ? <AccessTab state={state}/> : <ApplicationsTab state={state}/>}
    </>
  );
}


type SearchParamState = ReturnType<typeof useSearchParamState>;

const TITLE_ID = 'admin-application-modal-title';


function ApplicationsTab({ state }: {state: SearchParamState}) {
  const { searchParams, page, update, setPage } = state;
  const query = searchParams.get('q') || '';
  const userId = searchParams.get('user_id') || '';
  const status = STATUSES.find((item) => item.value === searchParams.get('status'))?.value ?? '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  // the ones in the collapsible panel set to something other than their default
  const activeFilters = [ status, userId ].filter(Boolean).length;

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminApplicationsQuery({
    query: debouncedQuery,
    userId,
    disabled: (status === 'disabled') ? true : (status === 'enabled') ? false : null,
    page,
  });

  const items = data?.items ?? [];
  // ← / → step through this page's applications
  const { openItem, previousId, nextId, open, close } = useOpenListItem(items, (application) => application.id);
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
      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by name, owner, or id...'
          aria-label='Search applications'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='admin-application-filters'/>
      </div>

      {/* hidden until asked for, like the other admin pages' */}
      <div id='admin-application-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select className='input' value={status} onChange={(event) => update({status: event.target.value || null})}>
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <IdFilter label='Owner id' placeholder='Any owner' value={userId} onChange={(value) => update({user_id: value})}/>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load applications' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Blocks className='size-10'/>} title='No applications found'>
          {(debouncedQuery || userId || status) ? 'Try a different search or filter.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((application) => <ApplicationRow key={application.id} application={application} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <ApplicationDetails
            key={openItem.id}
            application={openItem}
            navigation={{previousId, nextId, onNavigate: open}}
            onFilterOwner={(ownerId) => {
              close();
              update({user_id: ownerId, q: null});
            }}
            onDeleted={close}
          />
        </AdminTagModal>
      ) : null}
    </>
  );
}


function ApplicationIcon({ size = 'md' }: {size?: 'sm' | 'md'}) {
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center bg-surface-3 text-muted', (size === 'sm') ? 'size-7 rounded-lg' : 'size-10 rounded-xl')}>
      <Blocks className={(size === 'sm') ? 'size-4' : 'size-5'}/>
    </span>
  );
}


// One line per application, like the server and user rows: what it is, whether it's the bot's or disabled, who owns
// it and when it was made. The whole row opens it.
function ApplicationRow({ application, onOpen }: {application: AdminApplication, onOpen: (id: string) => void}) {
  const disabled = isApplicationDisabled(application);
  return (
    <li>
      <button
        type='button'
        onClick={() => onOpen(application.id)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:px-5',
          disabled && 'bg-danger/[0.04] shadow-[inset_3px_0_0_var(--color-danger)]',
        )}
      >
        <ApplicationIcon/>
        <div className='min-w-0 flex-1'>
          <div className='truncate font-medium text-white' title={application.name}>{application.name}</div>
          <div className='truncate font-mono text-xs text-subtle'>{application.id}</div>
          <div className='mt-0.5 truncate text-xs text-muted sm:hidden'>by {application.user?.username ?? application.owner_id}</div>
        </div>
        <div className='flex shrink-0 flex-wrap justify-end gap-1.5'><ApplicationChips application={application}/></div>
        <span className='hidden w-44 min-w-0 shrink-0 sm:block'><UserCell user={application.user} fallbackId={application.owner_id} size='sm'/></span>
        <span className='hidden w-24 shrink-0 text-right text-xs text-subtle md:block'>{formatDate(application.created)}</span>
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
      </button>
    </li>
  );
}


type ApplicationDialog = 'rename' | 'disable' | 'reset' | 'delete';

// footer actions, short labels and no icons on phones; destructive ones tinted red
const ACTION = 'btn min-w-0 flex-auto px-1.5 sm:flex-none sm:px-3';
const DANGER_TINT = 'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20';

// Laid out like the user and server modals: the application, its id and when it was made on the left, whether it's the
// bot's in the middle and whether it works in the top right. Then who owns it, what it's been used for recently, and
// everything staff can do to it in the footer. `navigation` is the modal's Previous / Next.
function ApplicationDetails({ application, navigation, onFilterOwner, onDeleted }: {
  application: AdminApplication,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
  onFilterOwner: (ownerId: string) => void,
  onDeleted: () => void,
}) {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data: detail, isPending, isError } = useAdminApplicationQuery(application.id);
  const patch = usePatchAdminApplicationMutation();
  const rename = useRenameAdminApplicationMutation();
  const reset = useResetAdminApplicationTokenMutation();
  const remove = useDeleteAdminApplicationMutation();
  const [ dialog, setDialog ] = useState<ApplicationDialog | null>(null);

  const notsobot = isNotSoBotApplication(application);
  const disabled = isApplicationDisabled(application);
  // the bot's own applications are owners only, and can only be renamed from here
  const locked = notsobot && !isOwner(me);
  const ownerId = application.user?.id ?? application.owner_id;
  const usage = detail?.usage;

  const closeDialog = () => {
    patch.reset();
    rename.reset();
    reset.reset();
    remove.reset();
    setDialog(null);
  };
  const setDisabled = (value: boolean) => {
    patch.mutate({applicationId: application.id, patch: {disabled: value}}, {
      onSuccess: () => {
        toast((value) ? `Disabled ${application.name}` : `Enabled ${application.name}`);
        closeDialog();
      },
      onError: (patchError) => {
        if (!value) {
          toast(errorMessage(patchError, 'Couldn’t enable the application.'), 'error');
        }
      },
    });
  };

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<ApplicationIcon size='sm'/>}
        title={application.name}
        titleTooltip={application.name}
        meta={(
          // the id, with when it was made always on its own line under it
          <span className='flex flex-col items-start gap-0.5'>
            <CopyableValue value={application.id} truncate={0}/>
            <span>Created <ExactDate value={application.created}/></span>
          </span>
        )}
        states={(notsobot) ? [<Chip key='notsobot' tone='brand' title='The bot’s own application'>NotSoBot</Chip>] : null}
        status={(
          <Chip
            tone={(disabled) ? 'danger' : 'success'}
            title={(disabled) ? 'Its token doesn’t work until staff turn it back on' : 'Its token works'}
            className='w-20 justify-center'
          >
            {(disabled) ? 'Disabled' : 'Enabled'}
          </Chip>
        )}
      />

      {/* who owns it, a link to their admin page */}
      <DetailModalStrip>
        <div className='flex items-center gap-2'>
          {(ownerId) ? (
            <Link
              to={adminUserPath(ownerId)}
              title='Open in users'
              className='group/user -ml-1.5 flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 transition-colors hover:bg-surface-3'
            >
              <UserCell user={application.user} fallbackId={ownerId} size='sm'/>
              <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand'/>
            </Link>
          ) : <UserCell user={null}/>}
          {(ownerId) ? (
            <button type='button' className='btn btn-ghost btn-sm ml-auto shrink-0' title='Show every application this user owns' onClick={() => onFilterOwner(ownerId)}>
              <Search aria-hidden className='size-4 shrink-0'/>
              {/* icon only on phones */}
              <span className='sr-only sm:not-sr-only'>All their applications</span>
            </button>
          ) : null}
        </div>
      </DetailModalStrip>

      <div className='space-y-5 px-4 pt-4 pb-5 sm:px-6'>
        <section>
          <h3 className='section-label mb-2'>
            Activity <span className='normal-case tracking-normal text-subtle'>(last {usage?.days ?? 30} days)</span>
          </h3>
          {(isError) ? (
            <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm text-subtle'>Couldn’t load its usage.</p>
          ) : (isPending || !usage) ? (
            <div aria-hidden className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              {Array.from({length: 4}, (_, i) => <Skeleton key={i} className='h-[54px] rounded-md'/>)}
            </div>
          ) : (
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              <StatTile label='Requests' value={usage.requests.toLocaleString()} title='Requests made with its token'/>
              <StatTile
                label='Errors'
                value={usage.errors.toLocaleString()}
                tone='text-warning'
                title={(usage.requests) ? `${((usage.errors / usage.requests) * 100).toFixed(1)}% of its requests failed (status 400 or above)` : 'Requests that failed (status 400 or above)'}
              />
              <DateTile label='First request' value={usage.first_request_at} empty='None' title='Its first request in that time'/>
              <DateTile label='Last request' value={usage.last_request_at} empty='None' title='Its most recent request'/>
            </div>
          )}
        </section>

        {(usage?.endpoints.length) ? (
          <section>
            <h3 className='section-label mb-2'>Most used endpoints</h3>
            <ul className='divide-y divide-line rounded-md border border-line bg-deep text-sm'>
              {usage.endpoints.map((item) => (
                <li key={item.endpoint} className='flex items-center justify-between gap-3 px-3 py-2'>
                  <span className='min-w-0 truncate font-mono text-xs text-fg' title={item.endpoint}>{item.endpoint}</span>
                  <span className='shrink-0 text-xs text-muted tabular-nums'>{item.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(locked) ? <p className='text-xs text-subtle'>Only bot owners can change NotSoBot’s own applications.</p> : null}
        {(notsobot && !locked) ? <p className='text-xs text-subtle'>NotSoBot’s own applications can only be renamed from here.</p> : null}
      </div>

      {/* renaming on the left, then turning it off and resetting its token, deleting set apart after a divider. The
          bot's own applications can only be renamed (owners), and the slots never move around */}
      <AdminModalFooter {...navigation}>
        <button type='button' className={cn(ACTION, 'btn-secondary')} disabled={locked} onClick={() => setDialog('rename')}>
          <Pencil aria-hidden className='hidden size-4 shrink-0 sm:block'/>
          Rename
        </button>
        {(!notsobot) ? (
          <>
            {(disabled) ? (
              <button type='button' className={cn(ACTION, 'btn-secondary')} disabled={patch.isPending} onClick={() => setDisabled(false)}>
                {(patch.isPending) ? <Spinner className='size-4'/> : <CircleCheck aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
                Enable
              </button>
            ) : (
              <button type='button' className={cn(ACTION, 'btn-secondary')} onClick={() => setDialog('disable')}>
                <Ban aria-hidden className='hidden size-4 shrink-0 sm:block'/>
                Disable
              </button>
            )}
            <button type='button' className={cn(ACTION, 'btn-secondary')} onClick={() => setDialog('reset')}>
              <RefreshCw aria-hidden className='hidden size-4 shrink-0 sm:block'/>
              <span className='truncate sm:hidden'>Reset</span>
              <span className='hidden sm:inline'>Reset token</span>
            </button>
            <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/>
            <button type='button' className={cn(ACTION, DANGER_TINT)} onClick={() => setDialog('delete')}>
              <Trash2 aria-hidden className='hidden size-4 shrink-0 sm:block'/>
              Delete
            </button>
          </>
        ) : null}
      </AdminModalFooter>

      {(dialog === 'rename') ? (
        <ApplicationNameDialog
          title={`Rename ${application.name}`}
          initialName={application.name}
          submitLabel='Save'
          pending={rename.isPending}
          error={(rename.isError) ? errorMessage(rename.error, 'Couldn’t rename the application.') : null}
          onSubmit={(name) => rename.mutate({applicationId: application.id, name}, {
            onSuccess: (updated) => {
              toast(`Renamed to ${updated.name}`);
              closeDialog();
            },
          })}
          onClose={closeDialog}
        />
      ) : (dialog === 'disable') ? (
        <ConfirmDialog
          title={`Disable ${application.name}?`}
          description='Its token stops working until it’s enabled again. The owner can still see it, but can’t turn it back on.'
          confirmLabel='Disable application'
          pending={patch.isPending}
          error={(patch.isError) ? errorMessage(patch.error, 'Couldn’t disable the application.') : null}
          onConfirm={() => setDisabled(true)}
          onClose={closeDialog}
        />
      ) : (dialog === 'reset') ? (
        <ConfirmDialog
          title={`Reset ${application.name}’s token?`}
          description='The current token stops working right away. You won’t see the new one; the owner can get it from their dashboard.'
          confirmLabel='Reset token'
          pending={reset.isPending}
          error={(reset.isError) ? errorMessage(reset.error, 'Couldn’t reset the token.') : null}
          onConfirm={() => reset.mutate(application.id, {
            onSuccess: () => {
              toast(`Reset ${application.name}’s token`);
              closeDialog();
            },
          })}
          onClose={closeDialog}
        />
      ) : (dialog === 'delete') ? (
        <ConfirmDialog
          title={`Delete ${application.name}?`}
          description='Its token stops working and the owner loses the application. This can’t be undone.'
          confirmLabel='Delete application'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the application.') : null}
          onConfirm={() => remove.mutate(application.id, {
            onSuccess: () => {
              toast(`Deleted ${application.name}`);
              closeDialog();
              onDeleted();
            },
          })}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}


function AccessTab({ state }: {state: SearchParamState}) {
  const { searchParams, page, update, setPage } = state;
  const { user: me } = useAuth();
  // moderators can see who has API access, only owners can give or take it
  const canEdit = isOwner(me);
  const toast = useToast();
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminApplicationAccessQuery({
    query: debouncedQuery,
    page,
  });
  const revoke = useRevokeApplicationAccessMutation();
  const [ granting, setGranting ] = useState(false);
  const [ revoking, setRevoking ] = useState<ApplicationAccessItem | null>(null);

  const items = data?.items ?? [];
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
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchInput
          className='flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by username or id...'
          aria-label='Search users with API access'
        />
        {(canEdit) ? (
          <button type='button' className='btn btn-primary shrink-0' onClick={() => setGranting(true)}>
            <Plus className='size-4'/>
            Grant access
          </button>
        ) : null}
      </div>
      <p className='mb-4 text-sm text-muted'>
        Users here can create applications, and their applications’ tokens work. Taking access away pauses their
        applications until it’s given back. Bot owners always have it, so they aren’t listed.
        {(!canEdit) ? ' Only bot owners can give or take API access.' : null}
      </p>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load users with API access' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<KeyRound className='size-10'/>} title={(debouncedQuery) ? 'No users found' : 'Nobody has API access yet'}>
          {(debouncedQuery) ? 'Try a different search.' : (canEdit) ? 'Grant it to a user by their id.' : null}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          {/* one line per user, like the other admin lists: who, how many applications they have (opening those), and
              taking access away */}
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((item) => (
              <li key={item.user.id} className='flex items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit] sm:px-5'>
                <div className='min-w-0 flex-1'><UserCell user={item.user} to={adminUserPath(item.user.id)}/></div>
                {(item.applications) ? (
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm shrink-0 tabular-nums'
                    title='Show their applications'
                    onClick={() => update({tab: null, q: null, user_id: item.user.id})}
                  >
                    <Blocks aria-hidden className='size-4 shrink-0'/>
                    {item.applications.toLocaleString()}
                    <span className='max-sm:sr-only'>{(item.applications === 1) ? 'application' : 'applications'}</span>
                  </button>
                ) : <span className='shrink-0 text-xs text-subtle'>No applications</span>}
                {(canEdit) ? (
                  <button type='button' className='btn btn-sm shrink-0 border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20' onClick={() => setRevoking(item)}>
                    <UserMinus aria-hidden className='size-4 shrink-0'/>
                    <span className='max-sm:sr-only'>Revoke</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(granting) ? <GrantAccessDialog onClose={() => setGranting(false)}/> : null}
      {(revoking) ? (
        <ConfirmDialog
          title={`Revoke ${revoking.user.username}’s API access?`}
          description={
            <>
              They won’t be able to create applications or see tokens.
              {(revoking.applications) ? ` Their ${revoking.applications.toLocaleString()} application${(revoking.applications === 1) ? '' : 's'} stop${(revoking.applications === 1) ? 's' : ''} working until access is given back.` : null}
            </>
          }
          confirmLabel='Revoke access'
          pending={revoke.isPending}
          error={(revoke.isError) ? errorMessage(revoke.error, 'Couldn’t revoke API access.') : null}
          onConfirm={() => revoke.mutate(revoking.user.id, {
            onSuccess: () => {
              toast(`Revoked ${revoking.user.username}’s API access`);
              revoke.reset();
              setRevoking(null);
            },
          })}
          onClose={() => {
            revoke.reset();
            setRevoking(null);
          }}
        />
      ) : null}
    </>
  );
}


function GrantAccessDialog({ onClose }: {onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const grant = useGrantApplicationAccessMutation();
  const [ userId, setUserId ] = useState('');

  const trimmed = userId.trim();
  const valid = /^\d{15,21}$/.test(trimmed);

  return (
    <Modal labelledBy={titleId} onClose={() => !grant.isPending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!grant.isPending && valid) {
            grant.mutate(trimmed, {
              onSuccess: (item) => {
                toast(`Gave ${item.user.username} API access`);
                onClose();
              },
            });
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Grant API access</h2>
        <p className='mt-2 text-sm text-muted'>They’ll be able to create applications from their dashboard.</p>

        <Field
          className='mt-4'
          label='User id'
          hint='They need to have used NotSoBot or logged in to the site before.'
          error={(trimmed && !valid) ? 'That doesn’t look like a Discord user id.' : undefined}
        >
          {(props) => (
            <input
              {...props}
              {...NO_AUTOFILL}
              className='input font-mono'
              inputMode='numeric'
              autoComplete='off'
              value={userId}
              disabled={grant.isPending}
              onChange={(event) => setUserId(event.target.value)}
            />
          )}
        </Field>

        {(grant.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(grant.error, 'Couldn’t grant API access.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={grant.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={grant.isPending || !valid}>
            {(grant.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Grant access
          </button>
        </div>
      </form>
    </Modal>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-10 rounded-xl'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-36'/>
            <Skeleton className='mt-1.5 h-3 w-44 bg-surface-2'/>
          </div>
          <Skeleton className='hidden h-6 w-32 bg-surface-2 sm:block'/>
          <Skeleton className='h-4 w-20 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
