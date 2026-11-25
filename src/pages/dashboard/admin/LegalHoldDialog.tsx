import { Lock } from 'lucide-react';
import { useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { type AdminLegalHold, type AdminUserRef, UserFlags } from '@/lib/api';
import { errorMessage, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime } from '@/lib/utils';

import { ExactDate, UserCell } from './adminUi';


export const LEGAL_HOLD_REASON_MAX = 2000;

// anyone on staff can place a hold (not on owners), only owners lift one. Same as the api
export function canToggleLegalHold(user: {flags: number} & AdminLegalHold, viewerIsOwner: boolean): boolean {
  if (user.legal_hold) {
    return viewerIsOwner;
  }
  return (user.flags & UserFlags.OWNER) !== UserFlags.OWNER;
}

export function legalHoldTitle(user: {flags: number} & AdminLegalHold, viewerIsOwner: boolean): string {
  if (user.legal_hold) {
    return (viewerIsOwner) ? 'Lift the legal hold' : 'Only bot owners can lift legal holds.';
  }
  if ((user.flags & UserFlags.OWNER) === UserFlags.OWNER) {
    return 'Owners can’t be put on hold.';
  }
  return 'Legal hold: keep everything of theirs while an investigation is open (they aren’t told)';
}


// "On legal hold" with the staff reason and when, for a user's admin page
export function LegalHoldNotice({ hold }: {hold: AdminLegalHold}) {
  return (
    <div className='w-72 rounded-md border border-warning/40 bg-warning/15 px-3 py-2'>
      <p className='flex items-center gap-1.5 text-xs font-bold tracking-wide text-warning uppercase'>
        <Lock aria-hidden className='size-3.5 shrink-0'/>
        Legal hold
      </p>
      {(hold.legal_hold_reason) ? (
        <p className='mt-1 text-xs break-words whitespace-pre-wrap text-fg'>{hold.legal_hold_reason}</p>
      ) : (
        <p className='mt-1 text-xs text-muted italic'>No reason given</p>
      )}
      {(hold.legal_hold_on) ? (
        <p className='mt-1 text-xs text-muted'>
          <span className='text-subtle'>Since: </span>
          <ExactDate value={hold.legal_hold_on} format={formatDateTime}/>
        </p>
      ) : null}
    </div>
  );
}


// Places (with a staff-only reason) or lifts a legal hold. `hold` is the user's state when it opens, so the dialog
// does the opposite of it. Never DMed, unlike a block
export function LegalHoldDialog({ user, hold: holdNow, onClose }: {
  user: AdminUserRef,
  hold: AdminLegalHold,
  onClose: () => void,
}) {
  const titleId = useId();
  const reasonId = useId();
  const toast = useToast();
  const mutation = usePatchAdminUserMutation();
  // kept from when it opened, a save updates the user before the dialog closes
  const [ hold ] = useState(holdNow);
  const held = !!hold.legal_hold;
  const [ reason, setReason ] = useState('');

  const submit = () => {
    const patch = (held) ? {legal_hold: false} : {legal_hold: true, legal_hold_reason: reason.trim() || null};
    // `mutateAsync` like `BlockUserDialog`: a list refetch can unmount what opened this
    mutation.mutateAsync({userId: user.id, patch}).then(() => {
      toast((held) ? `Lifted the legal hold on ${user.username}` : `Put ${user.username} on legal hold`);
      onClose();
    }, () => {});
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        data-state={(mutation.isPending) ? 'saving' : (mutation.isError) ? 'error' : 'idle'}
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>
          {(held) ? `Lift the legal hold on ${user.username}?` : `Put ${user.username} on legal hold?`}
        </h2>
        {(held) ? (
          <p className='mt-2 text-sm text-muted'>
            They’ll be able to delete their data again, and their kept frames start expiring (7 days). Only lift it once
            the investigation no longer needs anything of theirs.
          </p>
        ) : (
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-muted'>
            <li>Nothing of theirs can be deleted: “Delete my data”, deletes from their dashboard, and the 14 and 30 day cleanups all skip them.</li>
            <li>Their content flags’ kept frames stop expiring.</li>
            <li>They aren’t told. Block them separately to stop them using NotSoBot.</li>
          </ul>
        )}

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user}/>
          {(held && hold.legal_hold_reason) ? (
            <p className='mt-2 text-sm break-words text-muted'><span className='text-subtle'>Held for: </span>{hold.legal_hold_reason}</p>
          ) : null}
        </div>

        {(!held) ? (
          <div className='mt-4'>
            <label htmlFor={reasonId} className='mb-1.5 block text-sm text-muted'>Reason (staff only, like a case or NCMEC report number)</label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={LEGAL_HOLD_REASON_MAX}
              rows={2}
              disabled={mutation.isPending}
              className='input'
              autoFocus
            />
          </div>
        ) : null}

        {(mutation.isError) ? (
          <DialogError className='mt-4'>
            {errorMessage(mutation.error, (held) ? 'Couldn’t lift the legal hold.' : 'Couldn’t place the legal hold.')}
          </DialogError>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className={cn('btn', (held) ? 'btn-secondary' : 'btn-primary')} disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(held) ? 'Lift hold' : 'Place hold'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
