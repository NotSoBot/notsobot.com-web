import { ArrowUpRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailModalStrip } from '@/components/ui/DetailModal';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { type AdminUserRef } from '@/lib/api';
import { errorMessage, useAdminTagsQuery, useAdminUserEntryQuery, useDeleteAdminUserTagsMutation } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { adminTagsPath, adminUserPath, Chip, UserCell } from './adminUi';
import { RemovalReasonFields, useRemovalReason } from './removalReason';
import { UserModerationButtons } from './UserModerationButtons';


// how many tags `userId` owns, from the same search the Tags tab's `user:<id>` uses
export function useUserTagCount(userId: string | null): number | null {
  const { data, isPlaceholderData } = useAdminTagsQuery({
    query: (userId) ? `user:${userId}` : '',
    searchContent: false,
    sortBy: 'newest',
    nsfw: null,
    page: 0,
  });
  return (userId && data && !isPlaceholderData) ? data.count : null;
}


export function tagCountLabel(count: number | null): string {
  return (count === null) ? 'all their tags' : `${count.toLocaleString()} ${(count === 1) ? 'tag' : 'tags'}`;
}


// The last step before deleting every tag someone owns, on top of whichever dialog asked for it. Typed, like deleting
// an identity: "delete" and how many tags go, or their name when the count hadn't loaded as it opened.
// What it asks for is picked once, as it opens: the count arriving (or changing) later would swap the phrase under a
// name already typed. The number is written the same way in the title, the button and the phrase, always with commas:
// a browser's own grouping can be a space nobody can type
export function ConfirmDeleteUserTags({ username, count, onConfirm, onClose }: {
  username: string,
  count: number | null,
  onConfirm: () => void,
  onClose: () => void,
}) {
  const [ opened ] = useState(count);
  const tags = (opened === null) ? null : `${opened.toLocaleString('en-US')} ${(opened === 1) ? 'tag' : 'tags'}`;
  return (
    <ConfirmDialog
      title={(tags === null) ? `Permanently delete all of ${username}’s tags?` : `Permanently delete ${username}’s ${tags}?`}
      description={
        <>
          Every tag <span className='text-white'>{username}</span> owns is deleted, in every server, their DMs and the
          directory, with their variables and everyone’s aliases of them. <span className='font-medium text-white'>This can’t be undone.</span>
        </>
      }
      confirmLabel={`Delete ${tags ?? 'all their tags'}`}
      confirmPhrase={(opened === null) ? username : `delete ${opened.toLocaleString('en-US')}`}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}


// Deletes every tag a user owns, everywhere, from the Users tab
export function DeleteUserTagsDialog({ user, onClose }: {user: AdminUserRef, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const mutation = useDeleteAdminUserTagsMutation();
  const count = useUserTagCount(user.id);
  const [ confirming, setConfirming ] = useState(false);
  const [ removal, setRemoval ] = useRemovalReason();

  const submit = () => {
    mutation.mutate({userId: user.id, removal}, {
      onSuccess: ({ count: deleted }) => {
        toast(`Deleted ${tagCountLabel(deleted)} by ${user.username}`);
        onClose();
      },
    });
  };

  return (
    <>
      <Modal labelledBy={titleId} onClose={() => !mutation.isPending && !confirming && onClose()} className='max-w-lg'>
        <form
          className='p-5 sm:p-6'
          onSubmit={(event) => {
            event.preventDefault();
            if (!mutation.isPending && count !== 0) {
              setConfirming(true);
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>Delete all of {user.username}’s tags?</h2>
          <p className='mt-2 text-sm text-muted'>
            {(count === 0) ? 'They don’t own any tags.' : (
              <>
                Every tag they own is deleted, in every server, their DMs and the directory, along with its variables and
                everyone else’s aliases of it. This can’t be undone.
              </>
            )}
          </p>

          <div className='mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-deep p-3'>
            <UserCell user={user}/>
            {/* inert while deleting: leaving mid-delete unmounted the dialog, so its result (or error) was never shown */}
            <Link
              to={adminTagsPath(`user:${user.id}`)}
              className={cn('text-sm text-brand-text hover:underline', mutation.isPending && 'pointer-events-none opacity-60')}
              aria-disabled={mutation.isPending || undefined}
              onClick={(event) => {
                if (mutation.isPending) {
                  event.preventDefault();
                } else {
                  onClose();
                }
              }}
            >
              {(count === null) ? 'Counting tags…' : `Review ${tagCountLabel(count)}`}
            </Link>
          </div>

          {(count !== 0) ? <RemovalReasonFields value={removal} onChange={setRemoval} disabled={mutation.isPending} className='mt-3'/> : null}

          {(mutation.isError) ? (
            <DialogError className='mt-4'>
              {errorMessage(mutation.error, 'Couldn’t delete their tags.')}
            </DialogError>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
            <button type='submit' className='btn btn-danger' disabled={mutation.isPending || count === 0}>
              {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              Delete {tagCountLabel(count)}
            </button>
          </div>
        </form>
      </Modal>
      {(confirming) ? (
        <ConfirmDeleteUserTags
          username={user.username}
          count={count}
          onConfirm={() => {
            setConfirming(false);
            submit();
          }}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}


// An admin tag modal's `DetailModalStrip`: the tag's owner (a link to their admin page), then `children` (e.g. "All their
// tags") and warning or blocking them at the end. The tag lists only send a name and avatar, so whether they're blocked
// comes from their admin users entry, and the buttons show up once that's loaded. `blockReason` is the warn and block
// dialogs' starting reason.
export function TagOwnerStrip({ user, fallbackId, blockReason, children }: {
  user: AdminUserRef | null,
  fallbackId: string | null,
  blockReason: string,
  children?: ReactNode,
}) {
  const ownerId = user?.id ?? fallbackId;
  const entry = useAdminUserEntryQuery(ownerId);
  const owner = entry.data?.user ?? null;

  return (
    <DetailModalStrip>
      <div className='flex items-center gap-2'>
        {(ownerId) ? (
          <Link
            to={adminUserPath(ownerId)}
            title='Open in users'
            className='group/user -ml-1.5 flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 transition-colors hover:bg-surface-3'
          >
            <UserCell user={user ?? owner} fallbackId={ownerId} size='sm'/>
            <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand-text'/>
          </Link>
        ) : (
          <UserCell user={null}/>
        )}
        {(owner?.blocked) ? <Chip tone='danger' title={owner.blocked_reason || undefined}>Blocked</Chip> : null}
        {(children || owner) ? (
          <div className='ml-auto flex shrink-0 items-center gap-1'>
            {children}
            {/* Warn and Block (or Unblock), like the reports modal's */}
            {(owner) ? <UserModerationButtons user={owner} defaultReason={blockReason}/> : null}
          </div>
        ) : null}
      </div>
      {(owner?.blocked && owner.blocked_reason) ? <p className='mt-1 text-xs break-words text-subtle'>Blocked for: {owner.blocked_reason}</p> : null}
    </DetailModalStrip>
  );
}
