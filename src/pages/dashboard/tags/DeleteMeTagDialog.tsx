import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import type { Tag } from '@/lib/api';
import { errorMessage, useDeleteMeTagMutation } from '@/lib/api/dashboardQueries';


// deleting one of your own tags, from its editor or its card in the list
export function DeleteMeTagDialog({ tag, onDeleted, onClose }: {tag: Tag, onDeleted?: () => void, onClose: () => void}) {
  const { t } = useI18n();
  const toast = useToast();
  const remove = useDeleteMeTagMutation(tag.id);
  return (
    <ConfirmDialog
      title={t('dtags.delete.title', {name: tag.name})}
      description={t('dtags.delete.description')}
      confirmLabel={t('dtags.delete.confirm')}
      pending={remove.isPending}
      error={(remove.isError) ? errorMessage(remove.error, t('dtags.delete.error')) : null}
      onConfirm={() => remove.mutate(undefined, {
        onSuccess: () => {
          toast(t('dtags.delete.done', {name: tag.name}));
          (onDeleted ?? onClose)();
        },
      })}
      onClose={onClose}
    />
  );
}
