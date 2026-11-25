import { FileUp, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { intlLocale, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorDocument, EditorDocumentSummary } from '../types';


// The web host's way in: a file (dropped or picked), a link, or one of their recent edits
export function StartScreen({ host, onOpen, initialUrl }: {
  host: EditorHost,
  onOpen: (document: EditorDocument | EditorDocumentSummary) => void,
  // `?url=`, from a link like the bot's "edit on the web", opened right away
  initialUrl?: string | null,
}) {
  const { t, plural, language } = useI18n();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ url, setUrl ] = useState(initialUrl ?? '');
  const [ uploading, setUploading ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ dragOver, setDragOver ] = useState(false);
  const [ recent, setRecent ] = useState<Array<EditorDocumentSummary> | null>(null);
  const [ deleting, setDeleting ] = useState<EditorDocumentSummary | null>(null);
  const [ deletePending, setDeletePending ] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    host.api.documents().then((result) => {
      if (alive) {
        setRecent(result.documents);
      }
    }).catch(() => {
      if (alive) {
        setRecent([]);
      }
    });
    return () => {
      alive = false;
    };
  }, [host]);

  const open = async (input: {file?: File, url?: string}) => {
    setUploading(true);
    setError(null);
    try {
      onOpen(await host.api.createDocument(input));
    } catch (failure) {
      setError(host.errorOf(failure)?.message || t('editor.start.upload_error'));
      setUploading(false);
    }
  };

  useEffect(() => {
    if (initialUrl && !startedRef.current) {
      startedRef.current = true;
      void open({url: initialUrl});
    }
    // only the first render's link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void open({file});
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (url.trim()) {
      void open({url: url.trim()});
    }
  };

  const dateFormat = new Intl.DateTimeFormat(intlLocale(language), {dateStyle: 'medium'});

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:py-14'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-bold text-white sm:text-4xl'>{t('editor.title')}</h1>
        <p className='text-muted'>{t('editor.start.description')}</p>
      </header>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          (dragOver) ? 'border-brand bg-brand/10' : 'border-line-strong bg-surface',
        )}
      >
        {(uploading) ? (
          <>
            <Spinner/>
            <p className='text-sm text-muted'>{t('editor.start.uploading')}</p>
          </>
        ) : (
          <>
            <FileUp aria-hidden className='size-8 text-brand-text'/>
            <p className='font-semibold text-white'>{t('editor.start.drop')}</p>
            <input
              ref={fileRef}
              type='file'
              accept='image/*,video/*,audio/*'
              className='sr-only'
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) {
                  void open({file});
                }
              }}
            />
            <button type='button' className='btn btn-primary' onClick={() => fileRef.current?.click()}>{t('editor.start.choose')}</button>
            <p className='text-xs text-subtle'>{t('editor.start.formats')}</p>
          </>
        )}
      </div>

      <form onSubmit={onSubmit} className='flex flex-col gap-1.5'>
        <label htmlFor={inputId} className='text-sm font-medium text-fg'>{t('editor.start.url_label')}</label>
        <div className='flex gap-2'>
          <input
            id={inputId}
            type='url'
            inputMode='url'
            value={url}
            disabled={uploading}
            placeholder={t('editor.start.url_placeholder')}
            onChange={(event) => setUrl(event.target.value)}
            className='h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface-3 px-3 text-fg placeholder:text-muted outline-none focus:border-brand'
          />
          <button type='submit' className='btn btn-secondary' disabled={uploading || !url.trim()}>{t('editor.start.open')}</button>
        </div>
      </form>
      {(error) ? <p role='alert' className='-mt-5 text-sm text-danger-text'>{error}</p> : null}

      <section className='flex flex-col gap-3'>
        <h2 className='font-display text-lg font-bold text-white'>{t('editor.start.recent')}</h2>
        {(recent === null) ? (
          <Spinner/>
        ) : (!recent.length) ? (
          <p className='text-sm text-muted'>{t('editor.start.recent_empty')}</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {recent.map((item) => (
              <li key={item.id} className='flex items-center gap-2 rounded-lg border border-line-strong bg-surface p-2'>
                <button type='button' onClick={() => onOpen(item)} className='flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left hover:bg-surface-3'>
                  {(item.proxy && item.proxy.mimetype.startsWith('image/')) ? (
                    <img src={item.proxy.url} alt='' className='size-12 shrink-0 rounded object-cover'/>
                  ) : (
                    <span aria-hidden className='flex size-12 shrink-0 items-center justify-center rounded bg-deep font-mono text-[10px] text-muted uppercase'>
                      {item.source_meta.mimetype.split('/')[1]}
                    </span>
                  )}
                  <span className='flex min-w-0 flex-col'>
                    <span className='truncate text-sm font-semibold text-white'>{item.source.filename}</span>
                    <span className='text-xs text-muted'>
                      {plural('editor.start.steps', item.steps.length)} · {t('editor.start.expires', {date: dateFormat.format(new Date(item.expires_at))})}
                    </span>
                  </span>
                </button>
                <button
                  type='button'
                  aria-label={t('editor.start.delete', {name: item.source.filename})}
                  onClick={() => setDeleting(item)}
                  className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger-text'
                >
                  <Trash2 aria-hidden className='size-4'/>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(deleting) ? (
        <ConfirmDialog
          title={t('editor.start.delete_confirm_title')}
          description={t('editor.start.delete_confirm_description')}
          confirmLabel={t('editor.start.delete', {name: deleting.source.filename})}
          pending={deletePending}
          onConfirm={async () => {
            setDeletePending(true);
            try {
              await host.api.deleteDocument(deleting.id);
              setRecent((items) => (items ?? []).filter((item) => item.id !== deleting.id));
              setDeleting(null);
            } finally {
              setDeletePending(false);
            }
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
