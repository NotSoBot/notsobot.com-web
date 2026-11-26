import { ArrowLeft, FileUp, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { intlLocale, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorDocument, EditorDocumentSummary, EditorGenerator, EditorTemplate } from '../types';
import { useCatalogue } from '../useCatalogue';
import { GeneratorDialog, GeneratorGrid } from './Generators';
import { RoomSettingsFields, roomSettingsReady, type LobbyMode } from './RoomSettings';
import { TemplateBanner, TemplateList, templateNeedsPassword } from './Templates';


export type { LobbyMode } from './RoomSettings';


// The way in: a file (dropped or picked), a link, something a generator makes, or one of their recent edits
export function StartScreen({ host, onOpen, initialUrl, suggestedUrl, onBack, activityInstanceId: instanceId, template, effectNames, mode }: {
  host: EditorHost,
  onOpen: (document: EditorDocument | EditorDocumentSummary) => void,
  // `?url=`, from a link like the bot's "edit on the web", opened right away
  initialUrl?: string | null,
  // filled in but not opened: the Activity's Edit Media launch, opened once they've picked who it's for
  suggestedUrl?: string | null,
  // back to where they came from (the Activity's lobby list)
  onBack?: {label: string, run: () => void},
  // the Activity: the document is the instance's (shared with everyone in it), and personal recents aren't shown
  activityInstanceId?: string,
  // a shared template (`/editor/template/<code>`, or the Activity's launch): the picked file starts with its steps
  template?: EditorTemplate | null,
  effectNames?: Map<string, string>,
  // the Activity: who the new edit is for. Just me (a document of their own, nobody else sees it), everyone (a new lobby
  // anyone in the activity can join) or everyone with the password. Absent on the web, where every document is your own
  mode?: {value: LobbyMode, onChange: (value: LobbyMode) => void},
}) {
  const { t, plural, language } = useI18n();
  // just me: made like on the web, without the instance (its room never sees it)
  const activityInstanceId = (mode?.value === 'solo') ? undefined : instanceId;
  const [ lobbyPassword, setLobbyPassword ] = useState('');
  const needsLobbyPassword = mode?.value === 'password';
  const lobbyPasswordShort = !roomSettingsReady(mode?.value ?? 'solo', lobbyPassword);
  // sent only for a password lobby
  const lobbyPasswordSent = (needsLobbyPassword && activityInstanceId) ? lobbyPassword : undefined;
  // a room's name (the api safety scans it), the file's name stands in when it's empty
  const [ lobbyName, setLobbyName ] = useState('');
  const lobbyNameSent = (activityInstanceId && lobbyName.trim()) ? lobbyName.trim() : undefined;
  // a locked template once its password's checked: its steps, and the password the new document is made with
  const [ unlocked, setUnlocked ] = useState<{template: EditorTemplate, password: string} | null>(null);
  const shownTemplate = (unlocked && unlocked.template.code === template?.code) ? unlocked.template : (template ?? null);
  const templatePassword = (unlocked && unlocked.template.code === template?.code) ? unlocked.password : undefined;
  // a locked one has to be unlocked first, a file picked before then would start without its steps
  const waitingForPassword = Boolean(shownTemplate && templateNeedsPassword(shownTemplate));
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ url, setUrl ] = useState(initialUrl ?? suggestedUrl ?? '');
  const [ uploading, setUploading ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ dragOver, setDragOver ] = useState(false);
  const [ recent, setRecent ] = useState<Array<EditorDocumentSummary> | null>(null);
  const [ deleting, setDeleting ] = useState<EditorDocumentSummary | null>(null);
  const [ deletePending, setDeletePending ] = useState(false);
  const startedRef = useRef(false);
  // the catalogue's generators, fetched once per page load (the editor reuses it)
  const { catalogue } = useCatalogue(host);
  const generators = catalogue?.generators ?? [];
  const [ generating, setGenerating ] = useState<EditorGenerator | null>(null);

  useEffect(() => {
    if (instanceId) {
      return;
    }
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
  }, [instanceId, host]);

  const open = async (input: {file?: File, url?: string}) => {
    setUploading(true);
    setError(null);
    try {
      onOpen(await host.api.createDocument({...input, activityInstanceId, templateCode: template?.code, templatePassword, lobbyPassword: lobbyPasswordSent, lobbyName: lobbyNameSent}));
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
        {(onBack) ? (
          <button type='button' onClick={onBack.run} className='-ml-2 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
            <ArrowLeft aria-hidden className='size-4'/>{onBack.label}
          </button>
        ) : null}
        <h1 className='font-display text-3xl font-bold text-white sm:text-4xl'>{t('editor.title')}</h1>
        <p className='text-muted'>{t('editor.start.description')}</p>
      </header>

      {(mode) ? (
        <RoomSettingsFields
          mode={mode.value}
          onModeChange={mode.onChange}
          name={lobbyName}
          onNameChange={setLobbyName}
          password={lobbyPassword}
          onPasswordChange={setLobbyPassword}
        />
      ) : null}

      {(shownTemplate) ? (
        <TemplateBanner host={host} template={shownTemplate} effectNames={effectNames} onUnlocked={(next, password) => setUnlocked({template: next, password})}/>
      ) : null}

      {/* a locked template waits for its password, a file picked before then would start without its steps */}
      {(waitingForPassword) ? <p className='-mt-4 text-sm text-warning'>{t('editor.template.unlock_first')}</p> : null}
      <fieldset disabled={waitingForPassword || lobbyPasswordShort} className={cn('flex flex-col gap-8', (waitingForPassword || lobbyPasswordShort) && 'pointer-events-none opacity-50')}>
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
      </fieldset>
      {(error) ? <p role='alert' className='-mt-5 text-sm text-danger-text'>{error}</p> : null}

      {(generators.length) ? (
        <section className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <h2 className='font-display text-lg font-bold text-white'>{t('editor.generate.title')}</h2>
            <p className='text-sm text-muted'>{t('editor.generate.description')}</p>
          </div>
          <GeneratorGrid generators={generators} disabled={uploading || waitingForPassword} onPick={setGenerating}/>
        </section>
      ) : null}
      {(generating) ? (
        <GeneratorDialog
          generator={generating}
          onClose={() => setGenerating(null)}
          onMake={async (params) => {
            try {
              const document = await host.api.generateDocument({generator: generating.id, params, activityInstanceId, templateCode: template?.code, templatePassword, lobbyPassword: lobbyPasswordSent, lobbyName: lobbyNameSent});
              setGenerating(null);
              onOpen(document);
              return null;
            } catch (failure) {
              return host.errorOf(failure)?.message || t('editor.generate.error');
            }
          }}
        />
      ) : null}

      {(!instanceId) ? (
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
      ) : null}

      {(!instanceId) ? <TemplateList host={host}/> : null}

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
