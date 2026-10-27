import type { UseMutationResult } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { translate, useI18n } from '@/i18n';
import { VoiceCloneTypes, type Voice } from '@/lib/api';
import { errorMessage, type VoiceRename } from '@/lib/api/dashboardQueries';

import { CharCounter, Field } from '../ui';


export const VOICE_NAME_MAX_LENGTH = 128;


// Renames a cloned voice; `mutation` is the caller's own (`usePatchMeVoiceMutation`) or the admin one
export function RenameVoiceDialog({ voice, mutation, onClose }: {
  voice: Voice,
  mutation: UseMutationResult<Voice, Error, VoiceRename>,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const toast = useToast();
  const [ name, setName ] = useState(voice.name);

  // the mutation belongs to the page, so drop an error left over from the last voice renamed
  useEffect(() => {
    mutation.reset();
    // only when the dialog opens
  }, []);

  const trimmed = name.trim();
  const tooLong = VOICE_NAME_MAX_LENGTH < trimmed.length;
  const valid = !!trimmed && !tooLong;
  const changed = trimmed !== voice.name;

  const submit = () => {
    mutation.mutate({voiceId: voice.id, name: trimmed}, {
      onSuccess: (updated) => {
        toast(t('voices.renamed', {name: updated.name}));
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending && valid && changed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>{t('voices.rename_title', {name: voice.name})}</h2>
        <p className='mt-2 text-sm text-muted'>{t('voices.rename_description')}</p>

        <Field
          className='mt-4'
          label={t('voices.name')}
          error={(tooLong) ? t('voices.name_too_long', {max: VOICE_NAME_MAX_LENGTH}) : undefined}
          counter={<CharCounter length={trimmed.length} max={VOICE_NAME_MAX_LENGTH}/>}
        >
          {(props) => (
            <input
              {...props}
              className='input'
              value={name}
              autoComplete='off'
              spellCheck={false}
              disabled={mutation.isPending}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, t('voices.rename_error'))}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || !valid || !changed}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}


export function voicePlatformLabel(platformType: number): string {
  switch (platformType) {
    case VoiceCloneTypes.ELEVENLABS: return 'ElevenLabs';
    case VoiceCloneTypes.FISH_AUDIO: return 'fish.audio';
  }
  return translate('voices.platform_unknown', {type: platformType});
}
