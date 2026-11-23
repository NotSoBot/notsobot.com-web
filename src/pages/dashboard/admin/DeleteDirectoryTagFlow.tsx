import { Ban, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { DialogError } from '@/components/ui/DialogError';
import { Markdown } from '@/components/ui/Markdown';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { AdminTagDirectoryItem } from '@/lib/api';
import { errorMessage, useAdminUserEntryQuery, useDeleteAdminTagDirectoryMutation, useDeleteAdminUserTagsMutation, usePatchAdminUserMutation } from '@/lib/api/dashboardQueries';
import { NsfwBadge, VerificationBadge } from '@/pages/tags/tagDirectory';

import { selectAllScope, UserCell } from './adminUi';
import { BLOCK_REASON_MAX, BlockDurationSelect, blockedUntilFromSeconds, canBlockUser } from './BlockUserDialog';
import { ConfirmDeleteUserTags, tagCountLabel, useUserTagCount } from './DeleteUserTagsDialog';
import { RemovalReasonFields, useRemovalReason } from './removalReason';


// One dialog for deleting a directory listing and (optionally) all of its owner's tags and blocking them, decided
// while the tag is still on screen. `item` is the page's copy, so the details stay here even after the listing leaves the list
// (e.g. the delete worked but the block didn't and needs a retry).
export function DeleteDirectoryTagFlow({ item, onClose }: {item: AdminTagDirectoryItem, onClose: () => void}) {
  const titleId = useId();
  const deleteTagId = useId();
  const deleteAllId = useId();
  const blockId = useId();
  const reasonId = useId();
  const toast = useToast();
  const remove = useDeleteAdminTagDirectoryMutation();
  const removeAll = useDeleteAdminUserTagsMutation();
  const { user: me } = useAuth();
  // deleting everything they made can't be undone, so owners only
  const canDeleteAll = isOwner(me);
  const block = usePatchAdminUserMutation();

  const { tag, user } = item;
  const name = item.title || tag.name;
  // The listing only has their name and avatar, whether they're blocked (or a moderator) comes from their admin users
  // entry. Blocking is only offered once that says this viewer can: it used to be offered for anyone, and failed after
  // the delete had already happened
  const owner = useAdminUserEntryQuery(user?.id ?? null).data?.user ?? null;
  const blockable = !!owner && !owner.blocked && canBlockUser(owner, isOwner(me));
  const [ deleteTag, setDeleteTag ] = useState(false);
  const [ deleteAll, setDeleteAll ] = useState(false);
  const [ blockUser, setBlockUser ] = useState(false);
  // why it's coming down, recorded with the listing (and their tags) in the audit log
  const [ removal, setRemoval ] = useRemovalReason();
  const tagCount = useUserTagCount(user?.id ?? tag.user_id ?? null);
  // e.g. Tag directory: `cat` #1282656576297242646
  const [ reason, setReason ] = useState(`Tag directory: \`${tag.name}\` #${tag.id}`);
  // seconds, 0 for a permanent block (like the block dialog's Length)
  const [ duration, setDuration ] = useState(0);
  // how far it got: the listing, then (with `deleteAll`) their tags. A failed later step is retried from where it
  // stopped, without redoing the earlier ones
  const [ done, setDone ] = useState<'none' | 'listing' | 'tags'>('none');
  const deleted = done !== 'none';
  // deleting all of their tags asks once more before anything runs
  const [ confirmingAll, setConfirmingAll ] = useState(false);

  const pending = remove.isPending || removeAll.isPending || block.isPending;
  // what submitting does next: the first go, or the step that failed after the listing was deleted
  const nextStep: 'delete' | 'deleteAll' | 'block' = (done === 'none') ? 'delete' : (deleteAll && done === 'listing') ? 'deleteAll' : 'block';

  const runBlock = () => {
    if (!user) {
      return;
    }
    block.mutate({userId: user.id, patch: {blocked: true, blocked_reason: reason.trim() || null, blocked_until: blockedUntilFromSeconds(duration)}}, {
      onSuccess: () => {
        toast(`Blocked ${user.username}`);
        onClose();
      },
    });
  };

  const afterTags = () => {
    if (blockUser && user) {
      runBlock();
    } else {
      onClose();
    }
  };

  const runDeleteAll = () => {
    const ownerId = user?.id ?? tag.user_id;
    if (!ownerId) {
      afterTags();
      return;
    }
    removeAll.mutate({userId: ownerId, removal}, {
      onSuccess: ({ count }) => {
        setDone('tags');
        toast(`Deleted ${tagCountLabel(count)} by ${user?.username ?? ownerId}`);
        afterTags();
      },
    });
  };

  const submit = () => {
    if (nextStep === 'deleteAll') {
      runDeleteAll();
      return;
    }
    if (nextStep === 'block') {
      runBlock();
      return;
    }
    // deleting all of their tags takes this one with it, so the listing goes with the tag either way
    remove.mutate({tagId: item.id, deleteTag: deleteTag || deleteAll, removal}, {
      onSuccess: () => {
        setDone('listing');
        toast((deleteTag || deleteAll) ? `Deleted ${name}` : `Removed ${name} from the directory`);
        if (deleteAll) {
          runDeleteAll();
        } else {
          afterTags();
        }
      },
    });
  };

  const content = tag.content ?? '';
  const error = (remove.isError) ?
    errorMessage(remove.error, 'Couldn’t delete the listing.') :
    (removeAll.isError) ? `The listing was deleted, but deleting their other tags failed: ${errorMessage(removeAll.error, 'Couldn’t delete their tags.')}` :
    (block.isError) ? `The listing was deleted, but blocking failed: ${errorMessage(block.error, 'Couldn’t block the user.')}` : null;
  const retryLabel = (nextStep === 'deleteAll') ? 'Retry deleting their tags' : 'Retry block';

  return (
    <>
      <Modal labelledBy={titleId} onClose={() => !pending && !confirmingAll && onClose()} className='max-w-lg'>
        <form
          className='p-5 sm:p-6'
          data-state={(pending) ? 'working' : (deleted) ? `retry-${nextStep}` : 'choosing'}
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) {
              return;
            }
            if (deleteAll && !deleted) {
              setConfirmingAll(true);
            } else {
              submit();
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>Delete “{name}” from the directory?</h2>
          <p className='mt-2 text-sm text-muted'>
            {(deleteTag || deleteAll) ? (
              <>The listing is removed and <span className='font-mono text-white'>{tag.name}</span> is deleted.</>
            ) : (
              <>The listing is removed and <span className='font-mono text-white'>{tag.name}</span> goes back to being a normal tag its owner can edit.</>
            )}
          </p>

          {/* what's being deleted, so the block reason can be decided with it in front of you */}
          <section aria-label='Tag' className='mt-3 rounded-md border border-line bg-deep p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='min-w-0 font-semibold break-words text-white'>{item.title || <span className='text-subtle italic'>Untitled</span>}</span>
              <VerificationBadge verified={item.verified}/>
              {(tag.nsfw) ? <NsfwBadge/> : null}
            </div>
            <p className='mt-0.5 truncate font-mono text-sm text-code'>{tag.name}</p>
            <div className='mt-2'>
              <UserCell user={user} fallbackId={tag.user_id ?? null} size='sm'/>
            </div>
            {(item.description) ? <Markdown text={item.description} className='mt-2 text-sm text-muted'/> : null}
            <pre className='mt-2 max-h-48 overflow-auto rounded border border-line bg-surface p-2 font-mono text-xs whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>
              {content || <span className='text-subtle italic'>(empty)</span>}
            </pre>
          </section>

          <label htmlFor={deleteTagId} className='mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-line p-3 text-sm'>
            <input
              id={deleteTagId}
              type='checkbox'
              checked={deleteTag || deleteAll}
              onChange={(event) => setDeleteTag(event.target.checked)}
              disabled={pending || deleted || deleteAll}
              className='mt-0.5'
            />
            <span>
              <span className='font-medium text-white'>Also delete the tag itself</span>
              <span className='mt-0.5 block text-muted'>Every alias of it, in every server, is deleted too. This can’t be undone.</span>
            </span>
          </label>

          {((user ?? tag.user_id) && canDeleteAll) ? (
            <label htmlFor={deleteAllId} className='mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-line p-3 text-sm'>
              <input
                id={deleteAllId}
                type='checkbox'
                checked={deleteAll}
                onChange={(event) => setDeleteAll(event.target.checked)}
                disabled={pending || deleted}
                className='mt-0.5'
              />
              <span>
                <span className='flex items-center gap-1.5 font-medium text-white'>
                  <Trash2 aria-hidden className='size-4 text-danger-text'/>
                  Delete all of {user?.username ?? 'the owner'}’s tags{(tagCount !== null) ? ` (${tagCount.toLocaleString()})` : ''}
                </span>
                <span className='mt-0.5 block text-muted'>Every tag they own, in every server, their DMs and the directory, and everyone’s aliases of them. This can’t be undone.</span>
              </span>
            </label>
          ) : null}

          <RemovalReasonFields value={removal} onChange={setRemoval} disabled={pending || deleted} className='mt-3'/>

          {/* still shown while a failed block waits for its retry (the entry refetches after the delete) */}
          {(user && (blockable || blockUser)) ? (
            <div className='mt-3 rounded-md border border-line p-3 text-sm'>
              <label htmlFor={blockId} className='flex cursor-pointer items-start gap-2'>
                <input
                  id={blockId}
                  type='checkbox'
                  checked={blockUser}
                  onChange={(event) => setBlockUser(event.target.checked)}
                  disabled={pending || deleted}
                  className='mt-0.5'
                />
                <span>
                  <span className='flex items-center gap-1.5 font-medium text-white'>
                    <Ban aria-hidden className='size-4 text-danger-text'/>
                    Block {user.username} from NotSoBot
                  </span>
                  <span className='mt-0.5 block text-muted'>Stops them from using NotSoBot anywhere.</span>
                </span>
              </label>
              {(blockUser) ? (
                <div className='mt-3'>
                  <label htmlFor={reasonId} className='mb-1.5 block text-muted'>Block reason</label>
                  <textarea
                    id={reasonId}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={BLOCK_REASON_MAX}
                    rows={2}
                    disabled={pending}
                    className='input'
                  />
                  <BlockDurationSelect value={duration} onChange={setDuration} disabled={pending}/>
                </div>
              ) : null}
            </div>
          ) : (user && owner) ? (
            <p className='mt-3 text-xs text-subtle'>
              {(owner.blocked) ? `${user.username} is already blocked.` : `You can’t block ${user.username} (owners can’t be blocked, moderators only by owners).`}
            </p>
          ) : null}

          {(error) ? (
            <DialogError className='mt-4'>{error}</DialogError>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>
              {(deleted) ? 'Close' : 'Cancel'}
            </button>
            <button type='submit' className='btn btn-danger' disabled={pending}>
              {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {(deleted) ? retryLabel : `${(deleteAll) ? `Delete ${tagCountLabel(tagCount)}` : (deleteTag) ? 'Delete tag' : 'Remove listing'}${(blockUser && user) ? ' and block' : ''}`}
            </button>
          </div>
        </form>
      </Modal>
      {(confirmingAll) ? (
        <ConfirmDeleteUserTags
          username={user?.username ?? tag.user_id ?? 'the owner'}
          count={tagCount}
          onConfirm={() => {
            setConfirmingAll(false);
            submit();
          }}
          onClose={() => setConfirmingAll(false)}
        />
      ) : null}
    </>
  );
}
