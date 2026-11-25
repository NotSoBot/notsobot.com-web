import { BookmarkPlus, Check, Link, X } from 'lucide-react';
import { useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';
import type { EditorTemplate } from '../types';


const MAX_NAME_LENGTH = 64;


// "Save as template": the document's saved steps under a name, then its share link. Unlisted, only people with the link
// find it
function SaveTemplateDialog({ host, documentId, onClose }: {host: EditorHost, documentId: string, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const inputId = useId();
  const [ name, setName ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ saved, setSaved ] = useState<EditorTemplate | null>(null);
  const { copied, copy } = useCopied();
  const [ copyFailed, setCopyFailed ] = useState(false);

  const url = (saved) ? host.templateUrl(saved.code) : '';

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      setSaved(await host.api.createTemplate(documentId, name.trim()));
    } catch (failure) {
      setError(host.errorOf(failure)?.message || t('editor.template.error'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (saved) {
            onClose();
          } else if (name.trim() && !pending) {
            void save();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.template.save_title')}</h2>
        {(saved) ? (
          <div className='mt-3 flex flex-col gap-2'>
            <p className='text-sm text-muted'>{t('editor.template.saved')}</p>
            <div className='flex gap-2'>
              <input readOnly value={url} onFocus={(event) => event.target.select()} className='input min-w-0 flex-1 font-mono text-xs'/>
              <button
                type='button'
                className='btn btn-secondary shrink-0'
                onClick={async () => {
                  const worked = await copy(url);
                  setCopyFailed(!worked);
                }}
              >
                {(copyFailed) ? <X aria-hidden className='size-4 text-danger-text'/> : (copied) ? <Check aria-hidden className='size-4 text-success-text'/> : <Link aria-hidden className='size-4'/>}
                {(copyFailed) ? t('editor.template.copy_failed') : (copied) ? t('editor.template.copied') : t('editor.template.copy')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className='mt-2 text-sm text-muted'>{t('editor.template.save_description')}</p>
            <div className='mt-4'>
              <label htmlFor={inputId} className='mb-1.5 block text-sm text-muted'>{t('editor.template.name')}</label>
              <input
                id={inputId}
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('editor.template.name_placeholder')}
                autoComplete='off'
                data-autofocus
                className='input'
              />
            </div>
          </>
        )}

        {(error) ? <DialogError className='mt-4'>{error}</DialogError> : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          {(saved) ? (
            <button type='submit' className='btn btn-primary'>{t('editor.template.done')}</button>
          ) : (
            <>
              <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
              <button type='submit' className='btn btn-primary' disabled={!name.trim() || pending}>
                {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
                {t('editor.template.create')}
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}


export function SaveTemplateButton({ host, documentId, disabled }: {host: EditorHost, documentId: string, disabled: boolean}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        disabled={disabled}
        aria-label={t('editor.template.save')}
        title={t('editor.template.save')}
        onClick={() => setOpen(true)}
        className='inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'
      >
        <BookmarkPlus aria-hidden className='size-4'/>
        <span className='hidden sm:inline'>{t('editor.template.save')}</span>
      </button>
      {(open) ? <SaveTemplateDialog host={host} documentId={documentId} onClose={() => setOpen(false)}/> : null}
    </>
  );
}
