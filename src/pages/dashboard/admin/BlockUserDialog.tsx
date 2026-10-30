import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { type AdminUserRef, UserFlags } from '@/lib/api';
import { errorMessage, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime } from '@/lib/utils';

import { ExactDate, UserCell } from './adminUi';


export const BLOCK_REASON_MAX = 2000;

// how long a block lasts, the api lifts a timed one on its own once it's past (0 is permanent)
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
export const BLOCK_DURATIONS: Array<{label: string, seconds: number}> = [
  {label: 'Permanent', seconds: 0},
  {label: '1 hour', seconds: HOUR},
  {label: '1 day', seconds: DAY},
  {label: '3 days', seconds: 3 * DAY},
  {label: '7 days', seconds: 7 * DAY},
  {label: '30 days', seconds: 30 * DAY},
  {label: '90 days', seconds: 90 * DAY},
  {label: '1 year', seconds: 365 * DAY},
];

// what to send as `blocked_until`, null for permanent
export function blockedUntilFromSeconds(seconds: number): string | null {
  return (seconds) ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

export function BlockDurationSelect({ value, onChange, disabled }: {value: number, onChange: (seconds: number) => void, disabled?: boolean}) {
  const id = useId();
  return (
    <div className='mt-3'>
      <label htmlFor={id} className='mb-1.5 block text-sm text-muted'>Length</label>
      <select id={id} className='input' value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>
        {BLOCK_DURATIONS.map((item) => <option key={item.seconds} value={item.seconds}>{item.label}</option>)}
      </select>
    </div>
  );
}

// "Ends in 3 days" under a timed block, "Permanent" otherwise
export function BlockedUntilLine({ until, className }: {until: string | number | null, className?: string}) {
  return (
    <p className={cn('text-sm break-words text-muted', className)}>
      <span className='text-subtle'>Ends: </span>
      {(until) ? <ExactDate value={until} format={formatDateTime}/> : 'Never (permanent)'}
    </p>
  );
}

// owners can't be blocked, and only owners can block moderators
export function canBlockUser(user: {flags: number}, viewerIsOwner: boolean): boolean {
  const owner = (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
  const moderator = (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
  return !owner && (viewerIsOwner || !moderator);
}


// Blocks (with a reason) or unblocks someone from NotSoBot. `blocked` is the user's current state, so the
// dialog does the opposite of it.
export function BlockUserDialog({ user, blocked, blockedReason, blockedUntil = null, defaultReason = '', onClose }: {
  user: AdminUserRef,
  blocked: boolean,
  blockedReason?: string | null,
  blockedUntil?: string | number | null,
  defaultReason?: string,
  onClose: () => void,
}) {
  const titleId = useId();
  const reasonId = useId();
  const toast = useToast();
  const mutation = usePatchAdminUserMutation();
  const [ reason, setReason ] = useState(defaultReason);
  const [ duration, setDuration ] = useState(0);

  const submit = () => {
    const patch = (blocked) ? {blocked: false, blocked_reason: null} : {
      blocked: true,
      blocked_reason: reason.trim() || null,
      blocked_until: blockedUntilFromSeconds(duration),
    };
    mutation.mutate({userId: user.id, patch}, {
      onSuccess: () => {
        toast((blocked) ? `Unblocked ${user.username}` : `Blocked ${user.username}`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>
          {(blocked) ? `Unblock ${user.username}?` : `Block ${user.username} from NotSoBot?`}
        </h2>
        <p className='mt-2 text-sm text-muted'>
          {(blocked) ? 'They’ll be able to use NotSoBot again.' : 'Stops them from using NotSoBot anywhere, and puts a warning on their record with the reason (DMed to them).'}
        </p>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user}/>
          {(blocked && blockedReason) ? (
            <p className='mt-2 text-sm break-words text-muted'><span className='text-subtle'>Blocked for: </span>{blockedReason}</p>
          ) : null}
          {(blocked) ? <BlockedUntilLine until={blockedUntil} className='mt-1'/> : null}
        </div>

        {(!blocked) ? (
          <div className='mt-4'>
            <label htmlFor={reasonId} className='mb-1.5 block text-sm text-muted'>Block reason</label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={BLOCK_REASON_MAX}
              rows={2}
              disabled={mutation.isPending}
              className='input'
              autoFocus
            />
            <BlockDurationSelect value={duration} onChange={setDuration} disabled={mutation.isPending}/>
          </div>
        ) : null}

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, (blocked) ? 'Couldn’t unblock the user.' : 'Couldn’t block the user.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className={cn('btn', (blocked) ? 'btn-primary' : 'btn-danger')} disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(blocked) ? 'Unblock' : 'Block'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
