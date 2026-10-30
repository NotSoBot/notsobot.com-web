import { MessageSquareWarning, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminUserRef, AdminUserWarning, AdminUserWarnings } from '@/lib/api';
import {
  errorMessage,
  useAdminUserWarningsQuery,
  useCreateAdminUserWarningMutation,
  useDeleteAdminUserWarningMutation,
} from '@/lib/api/dashboardQueries';
import { formatDateTime } from '@/lib/utils';

import { adminUserPath, Chip, CopyableValue, DateTile, ExactDate, StatTile, UserCell } from './adminUi';


export const WARNING_REASON_MAX = 1000;


// Warnings from NotSoBot staff: they're DMed, see it in place of their next command and get a dashboard banner until
// they dismiss it. Nothing happens on its own at any count, it's for staff to see before deciding on a block. Same
// rules as blocking (`cantWarnReason`), and only owners can delete one
export function UserWarningsSection({ user, cantWarnReason, viewerIsOwner }: {
  user: AdminUserRef,
  cantWarnReason: string | null,
  viewerIsOwner: boolean,
}) {
  const query = useAdminUserWarningsQuery(user.id);
  const [ open, setOpen ] = useState(false);
  const [ warning, setWarning ] = useState(false);
  const items = query.data?.items ?? [];
  const value = (query.isPending) ? '…' : (query.isError) ? '—' : items.length.toLocaleString();
  const pending = items.filter((x) => !x.acknowledged).length;

  return (
    <section className='mt-5 lg:mt-4'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <h3 className='section-label'>Staff warnings</h3>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          disabled={!!cantWarnReason}
          title={cantWarnReason ?? 'DM them a warning, also shown in place of their next command'}
          onClick={() => setWarning(true)}
        >
          <MessageSquareWarning aria-hidden className='size-4'/>
          Warn
        </button>
      </div>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <StatTile
          label='Warnings'
          value={value}
          tone='text-warning'
          title={(query.isError) ? errorMessage(query.error, 'Couldn’t load their warnings.') : (items.length) ? `${(open) ? 'Hide' : 'Show'} their warnings` : 'Warnings NotSoBot staff gave them'}
          onClick={(items.length) ? () => setOpen(!open) : undefined}
        />
        <DateTile label='Last warning' value={items[0]?.created ?? null} empty='Never'/>
        <StatTile label='Not seen yet' value={(query.isPending || query.isError) ? value : pending.toLocaleString()} title='Waiting to be shown on their next command (or dismissed on the dashboard)'/>
      </div>
      {(open && items.length) ? (
        <ol className='mt-2 space-y-2'>
          {items.map((item) => <WarningCard key={item.id} warning={item} users={query.data!.users} userId={user.id} canDelete={viewerIsOwner}/>)}
        </ol>
      ) : null}
      {(warning) ? <WarnUserDialog user={user} onClose={() => setWarning(false)}/> : null}
    </section>
  );
}


function WarningCard({ warning, users, userId, canDelete }: {
  warning: AdminUserWarning,
  users: AdminUserWarnings['users'],
  userId: string,
  canDelete: boolean,
}) {
  const moderator = users[warning.moderator_id];
  const toast = useToast();
  const mutation = useDeleteAdminUserWarningMutation(userId);
  const [ deleting, setDeleting ] = useState(false);

  return (
    <li className='rounded-md border border-line bg-deep p-2.5 text-sm'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
        <span className='inline-flex min-w-0 items-center gap-1'>
          {(moderator) ? <span className='truncate font-medium text-fg'>{moderator.username}</span> : null}
          <CopyableValue value={warning.moderator_id} truncate={0} to={adminUserPath(warning.moderator_id)} linkTitle='Open in users'/>
        </span>
        <span aria-hidden>·</span>
        <ExactDate value={warning.created} format={formatDateTime}/>
        {(warning.acknowledged) ? (
          <Chip tone='success' title={`Seen ${formatDateTime(warning.acknowledged)}`}>Seen</Chip>
        ) : (
          <Chip tone='warning' title='Shown in place of their next command, or until they dismiss it on the dashboard'>Not seen yet</Chip>
        )}
        {(warning.block) ? <Chip tone='danger' title='Made by blocking them, with the block’s reason'>Block</Chip> : null}
        {(!warning.dm_sent) ? <Chip title='Their DMs were closed'>No DM</Chip> : null}
        {(canDelete) ? (
          <button
            type='button'
            className='ml-auto inline-flex cursor-pointer items-center rounded p-1 text-subtle hover:text-danger-text disabled:opacity-50'
            aria-label='Delete warning'
            title='Delete warning'
            disabled={mutation.isPending}
            onClick={() => setDeleting(true)}
          >
            <Trash2 aria-hidden className='size-3.5'/>
          </button>
        ) : null}
      </div>
      {(warning.reason) ? (
        <p className='mt-1.5 rounded border-l-2 border-line-strong pl-2 text-xs break-words whitespace-pre-wrap text-muted'>{warning.reason}</p>
      ) : (
        <p className='mt-1.5 text-xs text-subtle italic'>No reason given</p>
      )}
      {(deleting) ? (
        <ConfirmDialog
          title='Delete this warning?'
          description='It’s removed from their record and their dashboard. If they haven’t seen it, the bot won’t show it either.'
          confirmLabel='Delete'
          pending={mutation.isPending}
          error={(mutation.isError) ? errorMessage(mutation.error, 'Couldn’t delete the warning.') : null}
          onConfirm={() => mutation.mutate(warning.id, {
            onSuccess: () => {
              toast('Deleted the warning');
              setDeleting(false);
            },
          })}
          onClose={() => !mutation.isPending && setDeleting(false)}
        />
      ) : null}
    </li>
  );
}


export function WarnUserDialog({ user, defaultReason = '', onClose }: {user: AdminUserRef, defaultReason?: string, onClose: () => void}) {
  const titleId = useId();
  const reasonId = useId();
  const toast = useToast();
  const mutation = useCreateAdminUserWarningMutation(user.id);
  const [ reason, setReason ] = useState(defaultReason);
  const text = reason.trim();

  const submit = () => {
    mutation.mutate(text, {
      onSuccess: ({ warning }) => {
        toast((warning.dm_sent) ? `Warned ${user.username}` : `Warned ${user.username}, their DMs are closed so they’ll see it on their next command`);
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
          if (text && !mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>{`Warn ${user.username}?`}</h2>
        <p className='mt-2 text-sm text-muted'>
          They get a DM with the reason, and see it in place of their next command and on their dashboard. It doesn’t block them.
        </p>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user}/>
        </div>

        <div className='mt-4'>
          <label htmlFor={reasonId} className='mb-1.5 block text-sm text-muted'>Reason (sent to them)</label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={WARNING_REASON_MAX}
            rows={3}
            disabled={mutation.isPending}
            className='input'
            required
            autoFocus
          />
        </div>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, 'Couldn’t warn the user.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-danger' disabled={!text || mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Warn
          </button>
        </div>
      </form>
    </Modal>
  );
}
