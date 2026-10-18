import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { Tag } from '@/lib/api';
import { errorMessage, useDeleteMeTagMutation } from '@/lib/api/dashboardQueries';


// deleting one of your own tags, from its editor or its card in the list
export function DeleteMeTagDialog({ tag, onDeleted, onClose }: {tag: Tag, onDeleted?: () => void, onClose: () => void}) {
  const toast = useToast();
  const remove = useDeleteMeTagMutation(tag.id);
  return (
    <ConfirmDialog
      title={`Delete “${tag.name}”?`}
      description='This deletes the tag along with its variables and blobs. It can’t be undone.'
      confirmLabel='Delete tag'
      pending={remove.isPending}
      error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t delete the tag.') : null}
      onConfirm={() => remove.mutate(undefined, {
        onSuccess: () => {
          toast(`Deleted “${tag.name}”`);
          (onDeleted ?? onClose)();
        },
      })}
      onClose={onClose}
    />
  );
}
