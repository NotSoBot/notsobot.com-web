import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { ADMIN_REMOVAL_NOTICE_MAX, type AdminRemoval, type AdminRemovalReason } from '@/lib/api';
import { cn } from '@/lib/utils';


export const NO_REMOVAL_REASON: AdminRemoval = {reason: null, notice: ''};

const REASON_OPTIONS = [
  // short, all three have to fit a phone-width dialog
  {value: 'none', label: 'None'},
  {value: 'copyright', label: 'Copyright'},
  {value: 'rules', label: 'Rules'},
];

const REASON_HINTS: Record<AdminRemovalReason | 'none', string> = {
  none: 'Recorded in the tag’s history as a plain delete.',
  copyright: 'Counts as a copyright strike against the owner. Note who sent the notice and where to find it.',
  rules: 'Recorded in the tag’s history as breaking the rules.',
};


// Why staff are removing something, for the tag audit log (the api's `reason`/`notice`). The notice only shows once
// there's a reason, a plain delete has nothing to note
export function RemovalReasonFields({ value, onChange, disabled = false, className }: {
  value: AdminRemoval,
  onChange: (value: AdminRemoval) => void,
  disabled?: boolean,
  className?: string,
}) {
  const noticeId = useId();
  const key = value.reason ?? 'none';
  return (
    <div className={cn('rounded-md border border-line p-3 text-sm', className)}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <span className='font-medium text-white'>Reason</span>
        <Segmented
          label='Why it’s being removed'
          value={key}
          options={REASON_OPTIONS}
          disabled={disabled}
          onChange={(next) => onChange({...value, reason: (next === 'none') ? null : next as AdminRemovalReason})}
        />
      </div>
      <p className='mt-1.5 text-xs text-subtle'>{REASON_HINTS[key]}</p>
      {(value.reason) ? (
        <div className='mt-3'>
          <label htmlFor={noticeId} className='mb-1.5 block text-muted'>
            {(value.reason === 'copyright') ? 'Notice' : 'Note'} <span className='text-subtle'>(optional)</span>
          </label>
          <textarea
            id={noticeId}
            value={value.notice}
            onChange={(event) => onChange({...value, notice: event.target.value})}
            maxLength={ADMIN_REMOVAL_NOTICE_MAX}
            rows={2}
            disabled={disabled}
            placeholder={(value.reason === 'copyright') ? 'Who sent it, and where it is (a ticket, an email)' : 'Which rule, and anything else worth knowing later'}
            className='input'
          />
        </div>
      ) : null}
    </div>
  );
}


// The removal state a dialog keeps, reset whenever it opens
export function useRemovalReason() {
  return useState<AdminRemoval>(NO_REMOVAL_REASON);
}


// An inline "remove this?" for a single file (an archived asset, a listing's media or thumbnail): the reason, then
// confirm or cancel. `onConfirm` gets the reason to send
export function RemovalConfirm({ label, pending, onConfirm, onCancel, className }: {
  label: string,
  pending: boolean,
  onConfirm: (removal: AdminRemoval) => void,
  onCancel: () => void,
  className?: string,
}) {
  const [ removal, setRemoval ] = useRemovalReason();
  return (
    <div className={cn('mt-2', className)}>
      <RemovalReasonFields value={removal} onChange={setRemoval} disabled={pending}/>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <button type='button' className='btn btn-sm btn-danger' disabled={pending} onClick={() => onConfirm(removal)}>
          {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Trash2 className='size-4'/>}
          {label}
        </button>
        <button type='button' className='btn btn-sm btn-ghost' disabled={pending} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
