import type { UseMutationResult } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import type { LLMMemory } from '@/lib/api';
import { errorMessage, type LLMMemoryEdit } from '@/lib/api/dashboardQueries';

import { CharCounter, Field } from '../ui';


// the api's `MAX_LLM_MEMORY_LENGTH`
export const MEMORY_CONTENT_MAX_LENGTH = 200;


// Rewrites something NotSoAI remembers, it shows up in the user's prompts exactly as written here
export function EditMemoryDialog({ memory, mutation, onClose }: {
  memory: LLMMemory,
  mutation: UseMutationResult<LLMMemory, Error, LLMMemoryEdit>,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const toast = useToast();
  const [ content, setContent ] = useState(memory.content);

  // the mutation belongs to the page, so drop an error left over from the last memory edited
  useEffect(() => {
    mutation.reset();
    // only when the dialog opens
  }, []);

  const trimmed = content.trim();
  const tooLong = MEMORY_CONTENT_MAX_LENGTH < trimmed.length;
  const changed = !!trimmed && trimmed !== memory.content;

  const submit = () => {
    mutation.mutate({memoryId: memory.id, content: trimmed}, {
      onSuccess: () => {
        toast(t('memory.saved'));
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
          if (!mutation.isPending && !tooLong && changed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('memory.edit_label')}</h2>
        <p className='mt-2 text-sm text-muted'>{t('memory.edit_description')}</p>

        <Field
          className='mt-4'
          label={t('memory.field')}
          hint={t('memory.field_hint')}
          error={(tooLong) ? t('memory.too_long', {max: MEMORY_CONTENT_MAX_LENGTH}) : undefined}
          counter={<CharCounter length={trimmed.length} max={MEMORY_CONTENT_MAX_LENGTH}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input min-h-24 resize-y'
              value={content}
              disabled={mutation.isPending}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </Field>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, t('memory.save_error'))}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || tooLong || !changed}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
