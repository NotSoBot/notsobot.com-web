import { Brain, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import type { LLMMemory } from '@/lib/api';
import {
  errorMessage,
  useDeleteMeLLMMemoriesMutation,
  useDeleteMeLLMMemoryMutation,
  useMeLLMMemoriesQuery,
  useMeSettingsQuery,
  usePatchMeLLMMemoryMutation,
  usePatchMeSettingsMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatExactDateTime, formatNumber } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { EditMemoryDialog } from './EditMemoryDialog';


export function AIMemoryPage() {
  const { t, rich } = useI18n();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeLLMMemoriesQuery();
  const settings = useMeSettingsQuery();
  const patchSettings = usePatchMeSettingsMutation();

  const toast = useToast();
  const patch = usePatchMeLLMMemoryMutation();
  const remove = useDeleteMeLLMMemoryMutation();
  const clear = useDeleteMeLLMMemoriesMutation();
  const [ editing, setEditing ] = useState<LLMMemory | null>(null);
  const [ deleting, setDeleting ] = useState<LLMMemory | null>(null);
  const [ clearing, setClearing ] = useState(false);

  const items = data?.items ?? [];
  const enabled = !settings.data?.ml_llm_memory_disabled;

  const setEnabled = (value: boolean) => {
    patchSettings.mutate({ml_llm_memory_disabled: !value}, {
      onSuccess: () => toast(t((value) ? 'memory.on' : 'memory.off')),
      onError: (mutationError) => toast(errorMessage(mutationError, t('memory.setting_error'))),
    });
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast(t('memory.forgotten'));
        setDeleting(null);
      },
    });
  };

  const confirmClear = () => {
    clear.mutate(undefined, {
      onSuccess: () => {
        toast(t('memory.forgot_all'));
        setClearing(false);
      },
    });
  };

  return (
    <>
      <DashboardHeader
        title={t('dash.nav.ai_memory')}
        description={rich('memory.description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
      >
        {(items.length) ? (
          <button type='button' className='btn btn-secondary' onClick={() => setClearing(true)}>
            <Trash2 className='size-4'/>
            {t('memory.forget_all')}
          </button>
        ) : null}
      </DashboardHeader>

      <div className='card mb-6 p-4'>
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          disabled={settings.isPending || patchSettings.isPending}
          label={t('memory.toggle')}
          description={t('memory.toggle_description')}
        />
      </div>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title={t('memory.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Brain className='size-10'/>} title={t('memory.empty')}>
          {rich('memory.empty_description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
        </EmptyState>
      ) : (
        <>
          {/* the global ones have their own limit, and each server has its own on top */}
          <p className='mb-3 text-sm text-subtle'>
            {t('memory.count', {used: formatNumber(items.filter((memory) => !memory.guild_id).length), limit: formatNumber(data.limits.global), server: formatNumber(data.limits.server)})}
          </p>
          <ul className='card divide-y divide-line'>
            {items.map((memory) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                onEdit={() => setEditing(memory)}
                onDelete={() => setDeleting(memory)}
              />
            ))}
          </ul>
        </>
      )}

      {(editing) ? (
        <EditMemoryDialog memory={editing} mutation={patch} onClose={() => setEditing(null)}/>
      ) : null}

      {(deleting) ? (
        <ConfirmDialog
          title={t('memory.delete_title')}
          description={t('memory.delete_description')}
          confirmLabel={t('memory.delete')}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, t('memory.delete_error')) : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}

      {(clearing) ? (
        <ConfirmDialog
          title={t('memory.clear_title')}
          description={t('memory.clear_description')}
          confirmLabel={t('memory.forget_all')}
          pending={clear.isPending}
          error={(clear.isError) ? errorMessage(clear.error, t('memory.clear_error')) : null}
          onConfirm={confirmClear}
          onClose={() => {
            clear.reset();
            setClearing(false);
          }}
        />
      ) : null}
    </>
  );
}


function MemoryRow({ memory, onEdit, onDelete }: {
  memory: LLMMemory,
  onEdit: () => void,
  onDelete: () => void,
}) {
  const { t } = useI18n();
  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eb459e]/15'>
        <Brain className='size-5 text-[#eb459e]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <p className='whitespace-pre-wrap break-words text-fg'>{memory.content}</p>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
          {(memory.guild_id) ? (
            <Chip tone='brand' title={t('memory.server_title')}>{t('memory.only_in', {server: memory.guild?.name ?? t('memory.a_server')})}</Chip>
          ) : (
            <Chip title={t('memory.everywhere_title')}>{t('memory.everywhere')}</Chip>
          )}
          <span title={formatExactDateTime(memory.created)}>{t('memory.saved_on', {date: formatDate(memory.created)})}</span>
        </div>
      </div>
      <div className='flex shrink-0 flex-col gap-1.5 sm:flex-row'>
        <button type='button' className='btn btn-sm btn-secondary' onClick={onEdit} aria-label={t('memory.edit_label')}>
          <Pencil className='size-4'/>
          <span className='hidden sm:inline'>{t('common.edit')}</span>
        </button>
        <button type='button' className='btn btn-sm btn-secondary' onClick={onDelete} aria-label={t('memory.delete')}>
          <Trash2 className='size-4'/>
          <span className='hidden sm:inline'>{t('memory.forget')}</span>
        </button>
      </div>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 3}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-64'/>
            <Skeleton className='mt-1.5 h-3 w-32 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
