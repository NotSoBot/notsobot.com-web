import { useId, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { AdminTagItem } from '@/lib/api';
import { errorMessage, useAdminTagDuplicatesQuery, useDeleteAdminTagMutation } from '@/lib/api/dashboardQueries';


function tagsLabel(count: number): string {
  return `${count.toLocaleString()} ${(count === 1) ? 'tag' : 'tags'}`;
}


// Deletes one tag from the admin Tags page, optionally with the owner's (or everyone's) other tags with the exact same
// content. The global set includes the owner's, so checking it checks theirs too
export function DeleteTagDialog({ item, onDeleted, onClose }: {item: AdminTagItem, onDeleted: () => void, onClose: () => void}) {
  const userId = useId();
  const globalId = useId();
  const toast = useToast();
  const { tag } = item;
  const username = item.user?.username ?? 'this user';
  const duplicates = useAdminTagDuplicatesQuery(tag.id);
  const remove = useDeleteAdminTagMutation();
  const [ userDuplicates, setUserDuplicates ] = useState(false);
  const [ globalDuplicates, setGlobalDuplicates ] = useState(false);

  const counts = duplicates.data;
  const globalDeletable = (counts) ? counts.global - counts.global_protected : 0;
  const total = 1 + ((globalDuplicates) ? globalDeletable : (userDuplicates && counts) ? counts.user : 0);

  const checkbox = (id: string, checked: boolean, onChange: (value: boolean) => void, disabled: boolean, label: string, hint?: string | null) => (
    <label htmlFor={id} className='mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-line p-3 text-sm'>
      <input
        id={id}
        type='checkbox'
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={remove.isPending || disabled}
        className='mt-0.5 accent-brand'
      />
      <span>
        <span className='font-medium text-white'>{label}</span>
        {(hint) ? <span className='mt-0.5 block text-muted'>{hint}</span> : null}
      </span>
    </label>
  );

  return (
    <ConfirmDialog
      title={`Delete “${tag.name}”?`}
      description={
        <>
          The tag is deleted wherever it lives, with its variables, its directory listing and everyone’s aliases of
          it. <span className='font-medium text-white'>This can’t be undone.</span>

          {(duplicates.isPending) ? (
            <p className='mt-3 text-subtle'>Looking for tags with the same content…</p>
          ) : (duplicates.isError) ? (
            <p className='mt-3 text-subtle'>{errorMessage(duplicates.error, 'Couldn’t look for tags with the same content.')}</p>
          ) : null}

          {/* each only shows once more than 1 tag has this content, counting this one (so a single duplicate gets one) */}
          {(counts && counts.user > 0) ? checkbox(
            userId,
            userDuplicates || globalDuplicates,
            setUserDuplicates,
            globalDuplicates,
            `${counts.user.toLocaleString()} other ${(counts.user === 1) ? 'tag' : 'tags'} by ${username} with the same content`,
            'Their other tags with this exact content, in any server.',
          ) : null}

          {(counts && counts.global > 0) ? checkbox(
            globalId,
            globalDuplicates,
            setGlobalDuplicates,
            globalDeletable === 0,
            `${tagsLabel(counts.global)} globally with the same content`,
            [
              (counts.user) ? `Includes ${username}’s ${counts.user.toLocaleString()}.` : null,
              (counts.global_protected) ? `${tagsLabel(counts.global_protected)} by bot owners or other moderators can’t be deleted and are skipped.` : null,
            ].filter(Boolean).join(' ') || null,
          ) : null}
        </>
      }
      confirmLabel={(total === 1) ? 'Delete tag' : `Delete ${tagsLabel(total)}`}
      pending={remove.isPending}
      error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the tag.') : null}
      onConfirm={() => remove.mutate({tagId: tag.id, userDuplicates, globalDuplicates}, {
        onSuccess: ({ count, skipped }) => {
          const deleted = (count === 1) ? `Deleted “${tag.name}”` : `Deleted ${tagsLabel(count)}`;
          toast((skipped) ? `${deleted}, skipped ${tagsLabel(skipped)} you can’t delete` : deleted);
          onDeleted();
        },
      })}
      onClose={onClose}
    />
  );
}
