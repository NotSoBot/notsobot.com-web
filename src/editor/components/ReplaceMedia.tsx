import { FileUp, Link2, Replace } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import type { EditorDocumentState } from '../useEditorDocument';


// Replace media: a new file (an upload or a link) under the same effects. Positions and sizes are fractions of the
// media, so they follow the new one's shape. The api refuses a file one of the effects can't run on, naming it
function ReplaceMediaDialog({ state, onClose }: {state: EditorDocumentState, onClose: () => void}) {
  const { t, plural } = useI18n();
  const titleId = useId();
  const linkId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ link, setLink ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const count = state.steps.length;

  const replace = async (input: {file?: File, url?: string}) => {
    setPending(true);
    setError(null);
    try {
      await state.replaceSource(input);
      onClose();
    } catch (failure) {
      const apiError = state.errorOf(failure);
      const index = apiError?.body?.index;
      const step = (typeof index === 'number') ? state.steps[index] : undefined;
      const name = (step) ? state.effectsById.get(step.effect)?.name : undefined;
      setError((failure instanceof Error && failure.message === 'unsaved')
        ? t('editor.render.unsaved')
        : (name && apiError?.message) ? t('editor.replace.step_error', {index: (index as number) + 1, name, message: apiError.message})
        : apiError?.message || t('editor.replace.failed'));
      setPending(false);
    }
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <div data-state={(pending) ? 'pending' : (error) ? 'error' : 'idle'} className='flex flex-col gap-4 p-5 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.replace.title')}</h2>
          <p className='mt-2 text-sm text-muted'>
            {(count) ? plural('editor.replace.description', count) : t('editor.replace.description_none')}
            {(state.room) ? ` ${t('editor.replace.room')}` : ''}
          </p>
        </div>
        <input
          ref={fileRef}
          type='file'
          accept='image/*,video/*,audio/*'
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void replace({file});
            }
          }}
        />
        <button type='button' className='btn btn-primary w-full' disabled={pending} onClick={() => fileRef.current?.click()} data-autofocus>
          {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <FileUp aria-hidden className='size-4'/>}
          {(pending) ? t('editor.replace.replacing') : t('editor.replace.choose')}
        </button>
        <form
          className='flex gap-1.5'
          onSubmit={(event) => {
            event.preventDefault();
            if (link.trim() && !pending) {
              void replace({url: link.trim()});
            }
          }}
        >
          <label htmlFor={linkId} className='sr-only'>{t('editor.overlay.link')}</label>
          <input
            id={linkId}
            type='url'
            value={link}
            disabled={pending}
            placeholder={t('editor.overlay.link')}
            onChange={(event) => setLink(event.target.value)}
            className='h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand'
          />
          <button type='submit' aria-label={t('editor.replace.use_link')} title={t('editor.replace.use_link')} disabled={!link.trim() || pending} className='flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-muted hover:text-fg disabled:opacity-40'>
            <Link2 aria-hidden className='size-4'/>
          </button>
        </form>
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
        </div>
      </div>
    </Modal>
  );
}


export function ReplaceMediaButton({ state }: {state: EditorDocumentState}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        disabled={state.renderLocked}
        aria-label={t('editor.replace.button')}
        title={t('editor.replace.button')}
        onClick={() => setOpen(true)}
        className='inline-flex min-h-8 items-center gap-1 rounded-full border border-line-strong px-2.5 text-xs font-semibold whitespace-nowrap text-muted hover:border-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'
      >
        <Replace aria-hidden className='size-3.5'/>{t('editor.replace.button')}
      </button>
      {(open) ? <ReplaceMediaDialog state={state} onClose={() => setOpen(false)}/> : null}
    </>
  );
}
