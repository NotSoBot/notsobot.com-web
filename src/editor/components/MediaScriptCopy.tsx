import { Check, Code2, Copy, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';


type MediaScriptView = 'tag' | 'lines';


// "Copy as MediaScript": the steps as the api compiles them, a whole tag (runs on what the tag's used on) or just the
// lines (on the key `media`, to paste into a script of your own)
function MediaScriptDialog({ host, documentId, onClose }: {host: EditorHost, documentId: string, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ view, setView ] = useState<MediaScriptView>('tag');
  const [ result, setResult ] = useState<Awaited<ReturnType<EditorHost['api']['mediascript']>> | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  const { copied, copy } = useCopied();
  const [ copyFailed, setCopyFailed ] = useState(false);

  useEffect(() => {
    let alive = true;
    host.api.mediascript(documentId).then((value) => {
      if (alive) {
        setResult(value);
      }
    }).catch((failure) => {
      if (alive) {
        setError(host.errorOf(failure)?.message || t('editor.mediascript.error'));
      }
    });
    return () => {
      alive = false;
    };
  }, [documentId, host, t]);

  const text = (!result) ? '' : (view === 'tag') ? result.tag : result.lines.join('\n');
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-2xl'>
      <div className='flex flex-col gap-4 p-5 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.mediascript.title')}</h2>
          <p className='mt-2 text-sm text-muted'>{(view === 'tag') ? t('editor.mediascript.tag_description') : t('editor.mediascript.lines_description')}</p>
        </div>
        <Segmented
          label={t('editor.mediascript.view')}
          value={view}
          options={[{value: 'tag', label: t('editor.mediascript.view_tag')}, {value: 'lines', label: t('editor.mediascript.view_lines')}]}
          onChange={(value) => setView(value as MediaScriptView)}
        />
        {(error) ? <DialogError>{error}</DialogError> : (!result) ? (
          <div className='flex justify-center py-8'><Spinner/></div>
        ) : (
          <>
            <textarea
              readOnly
              value={text}
              aria-label={t('editor.mediascript.title')}
              spellCheck={false}
              onFocus={(event) => event.target.select()}
              className='input h-64 resize-y font-mono text-xs leading-relaxed whitespace-pre'
            />
            <p className={(result.max_lines < result.line_count) ? 'text-xs text-danger-text' : 'text-xs text-subtle'}>
              {t('editor.mediascript.lines', {count: result.line_count, max: result.max_lines})}
            </p>
          </>
        )}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('editor.template.done')}</button>
          <button
            type='button'
            className='btn btn-primary'
            disabled={!result}
            onClick={async () => {
              setCopyFailed(!await copy(text));
            }}
          >
            {(copyFailed) ? <X aria-hidden className='size-4'/> : (copied) ? <Check aria-hidden className='size-4'/> : <Copy aria-hidden className='size-4'/>}
            {(copyFailed) ? t('editor.template.copy_failed') : (copied) ? t('editor.template.copied') : t('editor.mediascript.copy')}
          </button>
        </div>
      </div>
    </Modal>
  );
}


export function MediaScriptButton({ host, documentId, disabled }: {host: EditorHost, documentId: string, disabled: boolean}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        disabled={disabled}
        aria-label={t('editor.mediascript.button')}
        title={t('editor.mediascript.button')}
        onClick={() => setOpen(true)}
        className='inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'
      >
        <Code2 aria-hidden className='size-4'/>
        <span className='hidden sm:inline'>{t('editor.mediascript.button')}</span>
      </button>
      {(open) ? <MediaScriptDialog host={host} documentId={documentId} onClose={() => setOpen(false)}/> : null}
    </>
  );
}
