// Bot owners only: who can create API applications (`UserFlags.API_ACCESS`), giving it and taking it away. Owners always
// have it, so they aren't listed. Was a tab on the admin Applications page.

import { Blocks, KeyRound, Plus, UserMinus } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ApplicationAccessItem } from '@/lib/api';
import {
  ADMIN_PAGE_SIZE,
  errorMessage,
  useAdminApplicationAccessQuery,
  useGrantApplicationAccessMutation,
  useRevokeApplicationAccessMutation,
} from '@/lib/api/dashboardQueries';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Field, Skeleton } from '../ui';
import { adminUserPath, Pagination, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


export function OwnerApiAccessPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
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
      <DashboardHeader
        title='API Access'
        description='Who can create API applications.'
      />
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchInput
          className='flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by username or id...'
          aria-label='Search users with API access'
        />
        <button type='button' className='btn btn-primary shrink-0' onClick={() => setGranting(true)}>
          <Plus className='size-4'/>
          Grant access
        </button>
      </div>
      <p className='mb-4 text-sm text-muted'>
        Users here can create applications, and their applications’ tokens work. Taking access away pauses their
        applications until it’s given back. Bot owners always have it, so they aren’t listed.
      </p>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load users with API access' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<KeyRound className='size-10'/>} title={(debouncedQuery) ? 'No users found' : 'Nobody has API access yet'}>
          {(debouncedQuery) ? 'Try a different search.' : 'Grant it to a user by their id.'}
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
                  <Link
                    className='btn btn-ghost btn-sm shrink-0 tabular-nums'
                    title='Show their applications'
                    to={`${Routes.DASHBOARD_ADMIN_APPLICATIONS}?${new URLSearchParams({user_id: item.user.id})}`}
                  >
                    <Blocks aria-hidden className='size-4 shrink-0'/>
                    {item.applications.toLocaleString()}
                    <span className='max-sm:sr-only'>{(item.applications === 1) ? 'application' : 'applications'}</span>
                  </Link>
                ) : <span className='shrink-0 text-xs text-subtle'>No applications</span>}
                <button type='button' className='btn btn-sm shrink-0 border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20' onClick={() => setRevoking(item)}>
                  <UserMinus aria-hidden className='size-4 shrink-0'/>
                  <span className='max-sm:sr-only'>Revoke</span>
                </button>
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
          <Skeleton className='size-8 rounded-full'/>
          <Skeleton className='h-4 w-40'/>
          <Skeleton className='ml-auto h-7 w-28 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
