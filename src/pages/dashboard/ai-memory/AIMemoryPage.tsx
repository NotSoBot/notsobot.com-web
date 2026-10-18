import { Brain, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
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
import { formatDate, formatExactDateTime } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { EditMemoryDialog } from './EditMemoryDialog';


export function AIMemoryPage() {
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
      onSuccess: () => toast((value) ? 'NotSoAI’s memory is on' : 'NotSoAI’s memory is off'),
      onError: (mutationError) => toast(errorMessage(mutationError, 'Couldn’t change the setting.')),
    });
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast('Memory forgotten');
        setDeleting(null);
      },
    });
  };

  const confirmClear = () => {
    clear.mutate(undefined, {
      onSuccess: () => {
        toast('NotSoAI forgot everything');
        setClearing(false);
      },
    });
  };

  return (
    <>
      <DashboardHeader
        title='AI Memory'
        description={<>Things NotSoAI remembers about you because you asked it to. It sees these every time you use <code className='text-fg'>/ai</code>.</>}
      >
        {(items.length) ? (
          <button type='button' className='btn btn-secondary' onClick={() => setClearing(true)}>
            <Trash2 className='size-4'/>
            Forget everything
          </button>
        ) : null}
      </DashboardHeader>

      <div className='card mb-6 p-4'>
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          disabled={settings.isPending || patchSettings.isPending}
          label='Let NotSoAI remember things'
          description='When this is off NotSoAI won’t see or save memories. The ones below are kept until you delete them.'
        />
      </div>

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title='Couldn’t load your memories' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Brain className='size-10'/>} title='NotSoAI doesn’t remember anything yet'>
          Ask it in Discord, like <code className='text-fg'>/ai remember that my birthday is March 3rd</code>.
        </EmptyState>
      ) : (
        <>
          {/* the global ones have their own limit, and each server has its own on top */}
          <p className='mb-3 text-sm text-subtle'>
            {items.filter((memory) => !memory.guild_id).length.toLocaleString()} of {data.limits.global.toLocaleString()} global memories,
            and up to {data.limits.server.toLocaleString()} more for each server
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
          title='Forget this memory?'
          description='NotSoAI won’t know this about you anymore. This can’t be undone.'
          confirmLabel='Forget memory'
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, 'Couldn’t forget the memory.') : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}

      {(clearing) ? (
        <ConfirmDialog
          title='Forget everything?'
          description='NotSoAI will forget everything it remembers about you, in every server. This can’t be undone.'
          confirmLabel='Forget everything'
          pending={clear.isPending}
          error={(clear.isError) ? errorMessage(clear.error, 'Couldn’t forget your memories.') : null}
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
  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eb459e]/15'>
        <Brain className='size-5 text-[#eb459e]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <p className='whitespace-pre-wrap break-words text-fg'>{memory.content}</p>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
          {(memory.guild_id) ? (
            <Chip tone='brand' title='NotSoAI only remembers this in that server'>Only in {memory.guild?.name ?? 'a server'}</Chip>
          ) : (
            <Chip title='NotSoAI remembers this everywhere'>Everywhere</Chip>
          )}
          <span title={formatExactDateTime(memory.created)}>Saved {formatDate(memory.created)}</span>
        </div>
      </div>
      <div className='flex shrink-0 flex-col gap-1.5 sm:flex-row'>
        <button type='button' className='btn btn-sm btn-secondary' onClick={onEdit} aria-label='Edit memory'>
          <Pencil className='size-4'/>
          <span className='hidden sm:inline'>Edit</span>
        </button>
        <button type='button' className='btn btn-sm btn-secondary' onClick={onDelete} aria-label='Forget memory'>
          <Trash2 className='size-4'/>
          <span className='hidden sm:inline'>Forget</span>
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
