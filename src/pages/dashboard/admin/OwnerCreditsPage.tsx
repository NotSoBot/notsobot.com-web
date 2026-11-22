// The NotSoCredits ledger: refills bought on Discord, the ones users gave to servers, what was taken back after a
// chargeback, and what staff granted for free. A refill can be taken back from here when Discord never sent its
// `ENTITLEMENT_DELETE`, and credits can be granted to (or with a negative amount taken from) a user. A grant's own Take
// back goes by its id, so the api only ever takes it back once (a second tab gets a 409).

import { useState } from 'react';
import { Coins } from 'lucide-react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchParamState, useStepBackFromEmptyPage } from '@/hooks/useSearchParamState';
import { ApiErrorCodes, ApiRequestError, CreditTransactionTypes, type AdminCreditTransaction } from '@/lib/api';
import {
  ADMIN_PAGE_SIZE, errorMessage, useAdminCreditTransactionsQuery, useAdminUserEntryQuery, useGrantAdminUserCreditsMutation,
  useReverseAdminCreditGrantMutation, useRevokeAdminEntitlementCreditsMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDateTime } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { adminUserPath, Chip, CopyableValue, ExactDate, FilterButton, Pagination, UserCell } from './adminUi';


const TYPES: ReadonlyArray<{value: CreditTransactionTypes, label: string, tone: 'success' | 'brand' | 'danger'}> = [
  {value: CreditTransactionTypes.REFILL, label: 'Bought', tone: 'success'},
  {value: CreditTransactionTypes.GIVE, label: 'Given', tone: 'brand'},
  {value: CreditTransactionTypes.REVOKE, label: 'Taken back', tone: 'danger'},
  {value: CreditTransactionTypes.GRANT, label: 'Granted', tone: 'brand'},
];

const ID = /^\d{1,20}$/;
// the api's limit either way
const GRANT_MAX = 10_000_000;


function parseType(value: string | null): number | null {
  const type = Number(value);
  return (value && TYPES.some((item) => item.value === type)) ? type : null;
}


export function OwnerCreditsPage() {
  const toast = useToast();
  const { searchParams, page, update, setPage } = useSearchParamState();
  const userId = searchParams.get('user_id') || '';
  const serverId = searchParams.get('server_id') || '';
  const type = parseType(searchParams.get('type'));
  const debouncedUserId = useDebouncedValue(userId.trim(), 300);
  const debouncedServerId = useDebouncedValue(serverId.trim(), 300);
  // the api only takes ids here, so anything else isn't sent
  const validUserId = ID.test(debouncedUserId) ? debouncedUserId : '';
  const validServerId = ID.test(debouncedServerId) ? debouncedServerId : '';

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminCreditTransactionsQuery({
    userId: validUserId,
    serverId: validServerId,
    type,
    page,
  });
  const revoke = useRevokeAdminEntitlementCreditsMutation();
  const [ revoking, setRevoking ] = useState<AdminCreditTransaction | null>(null);
  const grant = useGrantAdminUserCreditsMutation();
  const [ grantUserId, setGrantUserId ] = useState('');
  const [ grantAmount, setGrantAmount ] = useState('');
  // the grant form above the list, emptied once it's done. `requestId` is made when the dialog opens and sent with every
  // Confirm, so a second click or a retry after a timeout that went through never grants twice
  const [ granting, setGranting ] = useState<{userId: string, amount: number, requestId: string} | null>(null);
  // a grant row's Take back, sent by the grant's id (the form above is left alone)
  const reverse = useReverseAdminCreditGrantMutation();
  const [ reversing, setReversing ] = useState<AdminCreditTransaction | null>(null);
  const parsedGrantAmount = (/^-?\d+$/.test(grantAmount.trim())) ? Number(grantAmount.trim()) : 0;
  const canGrant = ID.test(grantUserId.trim()) && parsedGrantAmount !== 0 && Math.abs(parsedGrantAmount) <= GRANT_MAX;

  const items = data?.items ?? [];
  // refills already taken back on this page (the api ignores a second revoke anyway, this just hides the button)
  const revoked = new Set(items.filter((item) => item.type === CreditTransactionTypes.REVOKE).map((item) => item.entitlement_id));
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const filtered = !!(validUserId || validServerId || type !== null);
  const badId = (debouncedUserId && !validUserId) || (debouncedServerId && !validServerId);

  const closeDialog = () => {
    setRevoking(null);
    revoke.reset();
  };
  const closeGrantDialog = () => {
    setGranting(null);
    grant.reset();
  };
  const closeReverseDialog = () => {
    setReversing(null);
    reverse.reset();
  };

  return (
    <>
      <DashboardHeader
        title='Credits'
        description='NotSoCredits refills bought on Discord, given to servers, taken back and granted by staff, newest first. Balances themselves live in Redis.'
      />

      <form
        className='card mb-4 flex flex-wrap items-end gap-3 p-4'
        onSubmit={(event) => {
          event.preventDefault();
          if (canGrant) {
            setGranting({userId: grantUserId.trim(), amount: parsedGrantAmount, requestId: crypto.randomUUID()});
          }
        }}
      >
        <label className='min-w-48 flex-1 text-xs text-muted'>
          Grant credits to user id
          <input
            className='input mt-1 w-full'
            inputMode='numeric'
            autoComplete='off'
            value={grantUserId}
            onChange={(event) => setGrantUserId(event.target.value)}
            placeholder='User id'
          />
        </label>
        <label className='min-w-40 flex-1 text-xs text-muted'>
          Credits (negative takes them away)
          <input
            className='input mt-1 w-full'
            inputMode='numeric'
            autoComplete='off'
            value={grantAmount}
            onChange={(event) => setGrantAmount(event.target.value)}
            placeholder='325000'
          />
        </label>
        <button type='submit' className='btn btn-primary' disabled={!canGrant}>Grant</button>
      </form>

      <div className='mb-4 space-y-3'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <SearchInput
            value={userId}
            onValueChange={(value) => update({user_id: value})}
            placeholder='Filter by user id...'
            aria-label='Filter by user id'
          />
          <SearchInput
            value={serverId}
            onValueChange={(value) => update({server_id: value})}
            placeholder='Filter by server id...'
            aria-label='Filter by server id'
          />
        </div>
        {(badId) ? <p className='text-xs text-warning'>Enter an id (numbers only).</p> : null}
        <label className='flex items-center gap-2 text-sm text-muted'>
          Type
          <select
            className='input w-36'
            value={(type === null) ? '' : String(type)}
            onChange={(event) => update({type: event.target.value})}
          >
            <option value=''>Any</option>
            {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <TableSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load credits' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Coins className='size-10'/>} title='Nothing yet'>
          {(filtered) ? 'Try different filters.' : 'Refills show up here once someone buys one, grants once you give some.'}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          {/* `relative`: the last column's sr-only heading is absolutely positioned, and without a positioned scroller it
              escapes the clipping and makes the whole page scroll sideways */}
          <div className={cn('card relative overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className='w-full min-w-[820px] text-left text-sm'>
              <thead className='border-b border-line text-xs text-subtle uppercase'>
                <tr>
                  <th scope='col' className='px-4 py-2.5 font-medium'>User</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Type</th>
                  <th scope='col' className='px-4 py-2.5 text-right font-medium'>Credits</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>Server</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'>When</th>
                  <th scope='col' className='px-4 py-2.5 font-medium'><span className='sr-only'>Actions</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-line'>
                {items.map((transaction) => {
                  const kind = TYPES.find((item) => item.value === transaction.type);
                  return (
                    <tr key={transaction.id} className='align-middle hover:bg-surface-2'>
                      <td className='px-4 py-3'>
                        {/* the name opens the user, the funnel narrows the list to them (like Voices and Reports) */}
                        <div className='flex min-w-0 items-center gap-1'>
                          <div className='min-w-0'><UserCell user={transaction.user} fallbackId={transaction.user_id} to={adminUserPath(transaction.user_id)}/></div>
                          <FilterButton label='Show only this user’s credits' onClick={() => update({user_id: transaction.user_id})}/>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <Chip tone={kind?.tone ?? 'neutral'}>{kind?.label ?? `Type ${transaction.type}`}</Chip>
                        {(transaction.entitlement_id) ? (
                          <div className='mt-1' title='Entitlement ID'>
                            <CopyableValue value={transaction.entitlement_id} truncate={0}/>
                          </div>
                        ) : null}
                      </td>
                      <td className={cn('px-4 py-3 text-right font-mono whitespace-nowrap', (transaction.amount < 0) ? 'text-[#ff8a8c]' : 'text-white')}>
                        {(0 < transaction.amount && transaction.type !== CreditTransactionTypes.GIVE) ? '+' : null}
                        {transaction.amount.toLocaleString()}
                      </td>
                      <td className='px-4 py-3'>
                        {(transaction.server_id) ? (
                          <button
                            type='button'
                            className='-m-1 cursor-pointer rounded-md p-1 text-left hover:bg-surface-3'
                            title='Show only this server’s credits'
                            onClick={() => update({server_id: transaction.server_id})}
                          >
                            <span className='font-mono text-xs text-muted'>{transaction.server_id}</span>
                          </button>
                        ) : <span className='text-subtle'>—</span>}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-muted'>
                        <ExactDate value={transaction.created} format={formatDateTime}/>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        {(transaction.type === CreditTransactionTypes.GRANT && 0 < transaction.amount) ? (
                          (transaction.reversed_by_id) ? (
                            <span className='text-xs whitespace-nowrap text-subtle'>Taken back</span>
                          ) : (
                            <button type='button' className='btn btn-ghost btn-sm whitespace-nowrap text-danger' onClick={() => setReversing(transaction)}>
                              Take back
                            </button>
                          )
                        ) : (transaction.type !== CreditTransactionTypes.REFILL || !transaction.entitlement_id) ? null : (revoked.has(transaction.entitlement_id)) ? (
                          <span className='text-xs whitespace-nowrap text-subtle'>Taken back</span>
                        ) : (
                          <button type='button' className='btn btn-ghost btn-sm whitespace-nowrap text-danger' onClick={() => setRevoking(transaction)}>
                            Take back
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination}/>
        </>
      )}

      {(revoking && revoking.entitlement_id) ? (
        <ConfirmDialog
          title={`Take back ${revoking.amount.toLocaleString()} credits?`}
          description='For a chargeback or refund. It takes them from the buyer’s refills first, then from the servers they gave credits to (newest first). Anything still missing is left owed on the buyer, their next refill pays it off.'
          confirmLabel='Take back'
          pending={revoke.isPending}
          error={(revoke.isError) ? errorMessage(revoke.error, 'Couldn’t take the credits back.') : null}
          onConfirm={() => revoke.mutate(revoking.entitlement_id!, {
            onSuccess: (result) => {
              if (result.already_revoked) {
                toast('That refill was already taken back');
              } else {
                const owed = (result.owed) ? `, ${result.owed.toLocaleString()} left owed` : '';
                toast(`Took back ${result.amount.toLocaleString()} credits${owed}`);
              }
              closeDialog();
            },
          })}
          onClose={closeDialog}
        />
      ) : null}

      {(reversing) ? (
        <ConfirmDialog
          title={`Take back ${reversing.amount.toLocaleString()} granted credits?`}
          description={`From user ${reversing.user_id}’s refill credits, up to what they have left. Nothing is left owed, and a grant can only be taken back once.`}
          confirmLabel='Take back'
          tone='danger'
          pending={reverse.isPending}
          error={(reverse.isError) ? errorMessage(reverse.error, 'Couldn’t take the credits back.') : null}
          onConfirm={() => reverse.mutate(reversing.id, {
            onSuccess: (result) => {
              toast(`Took back ${Math.abs(result.amount).toLocaleString()} credits, they have ${result.refill_left.toLocaleString()} now`);
              closeReverseDialog();
            },
            onError: (reverseError) => {
              // taken back from another tab meanwhile: nothing to retry, the list refetches and shows it
              if (reverseError instanceof ApiRequestError && reverseError.code === ApiErrorCodes.CREDIT_GRANT_ALREADY_REVERSED) {
                toast(errorMessage(reverseError, 'That grant was already taken back'), 'error');
                closeReverseDialog();
              }
            },
          })}
          onClose={closeReverseDialog}
        />
      ) : null}

      {(granting) ? (
        <ConfirmDialog
          title={(granting.amount < 0) ? `Take ${(-granting.amount).toLocaleString()} credits away?` : `Grant ${granting.amount.toLocaleString()} credits?`}
          description={(
            <>
              <GrantUser userId={granting.userId}/>
              {(granting.amount < 0)
                ? 'From their refill credits, up to what they have left. Nothing is left owed.'
                : 'As refill credits: they never expire, pay for NotSoAI and cloned voices, and can be given to servers.'}
            </>
          )}
          confirmLabel={(granting.amount < 0) ? 'Take away' : 'Grant'}
          tone={(granting.amount < 0) ? 'danger' : 'primary'}
          pending={grant.isPending}
          error={(grant.isError) ? errorMessage(grant.error, 'Couldn’t change their credits.') : null}
          onConfirm={() => grant.mutate({userId: granting.userId, amount: granting.amount, requestId: granting.requestId}, {
            onSuccess: (result) => {
              const verb = (result.amount < 0) ? 'Took away' : 'Granted';
              toast(`${verb} ${Math.abs(result.amount).toLocaleString()} credits, they have ${result.refill_left.toLocaleString()} now`);
              setGrantUserId('');
              setGrantAmount('');
              closeGrantDialog();
            },
          })}
          onClose={closeGrantDialog}
        />
      ) : null}
    </>
  );
}


// who a typed id is, in the grant's confirm: their name and avatar from the admin users list, so a mistyped id shows
// up as someone else (or as nobody NotSoBot knows) before the credits go out. A lookup that failed says so, it isn't
// the same as nobody having that id
function GrantUser({ userId }: {userId: string}) {
  const { data, isPending, isError } = useAdminUserEntryQuery(userId);
  return (
    <span className='mb-3 block rounded-md border border-line bg-deep p-3'>
      {(isPending) ? (
        <span className='text-sm text-subtle'>Looking up <span className='font-mono'>{userId}</span>…</span>
      ) : (isError && data === undefined) ? (
        <span className='text-sm text-warning'>Couldn’t check who <span className='font-mono'>{userId}</span> is</span>
      ) : (
        <UserCell user={data?.user ?? null} fallbackId={userId}/>
      )}
    </span>
  );
}


function TableSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-8 rounded-full'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-36'/>
            <Skeleton className='mt-1.5 h-3 w-24 bg-surface-2'/>
          </div>
          <Skeleton className='h-4 w-20 bg-surface-2'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
          <Skeleton className='h-4 w-28 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
