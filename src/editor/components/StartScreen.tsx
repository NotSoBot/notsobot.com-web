import { ArrowLeft, FileUp, ImageIcon, Music, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { intlLocale, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorDocument, EditorDocumentSummary, EditorGenerator, EditorTemplate, EditorThumbnail } from '../types';
import { useCatalogue } from '../useCatalogue';
import { defaultParams, newStep } from '../stack';
import { GeneratorDialog, GeneratorGrid } from './Generators';
import { RoomSettingsFields, roomSettingsReady, type LobbyMode } from './RoomSettings';
import { MIN_PASSWORD_LENGTH } from './SaveTemplate';
import { TemplateBanner, TemplateList, templateNeedsPassword } from './Templates';
import { HubEntry } from '../hub/HubEntry';


export type { LobbyMode } from './RoomSettings';


// The way in: a file (dropped or picked), a link, something a generator makes, or one of their recent edits
// the Try it effect's look, its commands page preview (a still frame of a video)
function EffectThumb({ thumbnail }: {thumbnail: EditorThumbnail}) {
  if (thumbnail.mimetype.startsWith('video/')) {
    return <video src={thumbnail.url} muted autoPlay loop playsInline className='size-14 shrink-0 rounded-md bg-deep object-cover'/>;
  }
  if (thumbnail.mimetype.startsWith('audio/')) {
    return <Music aria-hidden className='size-6 shrink-0 text-brand-text'/>;
  }
  return <img src={thumbnail.url} alt='' className='size-14 shrink-0 rounded-md bg-deep object-cover'/>;
}


// what a launch's media looks like from its link (Discord's attachment and avatar links keep their extension)
function mediaKindOfUrl(url: string): 'image' | 'video' | 'audio' {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // not a url, its text then
  }
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes(extension)) {
    return 'video';
  }
  if (['mp3', 'ogg', 'wav', 'flac', 'm4a', 'opus', 'aac'].includes(extension)) {
    return 'audio';
  }
  return 'image';
}


// where a link's media may be shown before they say start: Discord's cdn and our own. A site link's `?url=` can be
// anyone's (someone else made the link), that file isn't loaded just by opening the page
const PREVIEW_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net', 'cdn.nsb.gg']);

function previewsBeforeStart(url: string): boolean {
  try {
    return PREVIEW_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}


function fileNameOfUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
  } catch {
    return '';
  }
}


// Opening something (a file, a link, the launch's media): one at a time. While it uploads every other way in, the way
// back and the room's settings are off: what was sent is what the new edit is made with
type StartState =
  | {status: 'idle'}
  | {status: 'uploading'}
  | {status: 'failed', message: string};

// what has to be filled in before anything can be opened: a locked template's password (a file picked before then
// would start without its steps), or a password room's password
type StartBlock = 'template_password' | 'lobby_password';


// The Activity opened from Edit Media / Edit Avatar: that media, big, with who the edit is for and one button to start.
// "Pick something else" leaves the start screen as it is (the link stays in its box).
// The site's `/editor?url=` (`surface` 'link') asks the same way: the link is shown in full, and nothing is fetched or
// uploaded under their account until they press start
function LaunchMediaDialog({ url, surface, uploading, error, blocked, settings, onStart, onDismiss }: {
  url: string,
  surface: string | null,
  uploading: boolean,
  error: string | null,
  // a password room without its password yet, a locked template without its password
  blocked: boolean,
  settings: ReactNode,
  onStart: () => void,
  onDismiss: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ broken, setBroken ] = useState(false);
  const kind = mediaKindOfUrl(url);
  const avatar = surface === 'edit_avatar';
  const link = surface === 'link';
  const filename = fileNameOfUrl(url);
  const preview = !link || previewsBeforeStart(url);
  return (
    <Modal anchor='top' labelledBy={titleId} onClose={() => !uploading && onDismiss()} className='max-w-lg'>
      <div className='flex max-h-[90dvh] flex-col gap-4 overflow-y-auto p-5 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>
            {(avatar) ? t('editor.launch.avatar_title') : t(`editor.launch.${kind}_title`)}
          </h2>
          <p className='mt-1 text-sm text-muted'>{(avatar) ? t('editor.launch.avatar_description') : (link) ? t('editor.launch.link_description') : t('editor.launch.media_description')}</p>
          {(link) ? <p className='mt-2 rounded-md bg-deep px-2.5 py-1.5 font-mono text-xs break-all text-fg'>{url}</p> : null}
        </div>
        <div className={cn('flex items-center justify-center overflow-hidden rounded-xl border border-line-strong bg-deep', (avatar) ? 'mx-auto size-40 rounded-full' : 'max-h-[40dvh] min-h-32')}>
          {(broken || !preview || kind === 'audio') ? (
            <span className='flex flex-col items-center gap-2 p-6 text-subtle'>
              {(kind === 'audio') ? <Music aria-hidden className='size-10'/> : <ImageIcon aria-hidden className='size-10'/>}
              {(filename) ? <span className='max-w-full truncate font-mono text-xs'>{filename}</span> : null}
            </span>
          ) : (kind === 'video') ? (
            <video src={url} muted autoPlay loop playsInline onError={() => setBroken(true)} className='max-h-[40dvh] w-full object-contain'/>
          ) : (
            <img src={url} alt='' onError={() => setBroken(true)} className={cn('object-contain', (avatar) ? 'size-full object-cover' : 'max-h-[40dvh] w-full')}/>
          )}
        </div>
        {settings}
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onDismiss} disabled={uploading}>{t('editor.launch.other')}</button>
          <button type='button' className='btn btn-primary' onClick={onStart} disabled={uploading || blocked} data-autofocus>
            {(uploading) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Wand2 aria-hidden className='size-4'/>}
            {(uploading) ? t('editor.launch.starting') : t('editor.launch.start')}
          </button>
        </div>
      </div>
    </Modal>
  );
}


export function StartScreen({ host, onOpen, suggestedUrl, launchSurface = null, onSuggestedDismiss, tryEffectId = null, tryGeneratorId = null, onBack, headerAside, activityInstanceId: instanceId, template: templateProp, effectNames, mode }: {
  host: EditorHost,
  // `opened.template`: it starts from a template (its questions are asked once it's open)
  onOpen: (document: EditorDocument | EditorDocumentSummary, opened?: {template: boolean}) => void,
  // filled in but not opened: the Activity's Edit Media launch, or the site's `?url=` (a link like the bot's "edit on
  // the web"), shown in its own dialog until they start or dismiss it. Never opened by itself: a link someone else made
  // would upload whatever it names under the account of whoever opens it
  suggestedUrl?: string | null,
  // how the Activity was launched (`edit_media`, `edit_avatar`, ...) or `link` for the site's `?url=`, the dialog's wording
  launchSurface?: string | null,
  // "Pick something else": the dialog doesn't come back (the start screen remounts when Just me is picked)
  onSuggestedDismiss?: () => void,
  // the commands page's Try it: an effect that goes on whatever's picked (`?effect=`), or a generator opened right
  // away (`?generator=`)
  tryEffectId?: string | null,
  tryGeneratorId?: string | null,
  // back to where they came from (the Activity's lobby list)
  onBack?: {label: string, run: () => void},
  // at the end of the back button's row (the Activity's How to play)
  headerAside?: ReactNode,
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
  // one tried from the hub's panel (the Activity) wins over the launch's, until it's dropped
  const [ hubTemplate, setHubTemplate ] = useState<EditorTemplate | null>(null);
  const template = hubTemplate ?? templateProp ?? null;
  // just me: made like on the web, without the instance (its room never sees it)
  const activityInstanceId = (mode?.value === 'solo') ? undefined : instanceId;
  const [ lobbyPassword, setLobbyPassword ] = useState('');
  const needsLobbyPassword = mode?.value === 'password';
  const lobbyPasswordShort = !roomSettingsReady(mode?.value ?? 'solo', lobbyPassword);
  // sent only for a password lobby
  const lobbyPasswordSent = (needsLobbyPassword && activityInstanceId) ? lobbyPassword : undefined;
  // a room's name (the api safety scans it), the file's name stands in when it's empty
  const [ lobbyName, setLobbyName ] = useState('');
  const [ lobbyWatchOnly, setLobbyWatchOnly ] = useState(false);
  const lobbyWatchOnlySent = Boolean(activityInstanceId && mode && mode.value !== 'solo' && lobbyWatchOnly);
  const lobbyNameSent = (activityInstanceId && lobbyName.trim()) ? lobbyName.trim() : undefined;
  // a locked template once its password's checked: its steps, and the password the new document is made with
  const [ unlocked, setUnlocked ] = useState<{template: EditorTemplate, password: string} | null>(null);
  const shownTemplate = (unlocked && unlocked.template.code === template?.code) ? unlocked.template : (template ?? null);
  const templatePassword = (unlocked && unlocked.template.code === template?.code) ? unlocked.password : undefined;
  // a locked one has to be unlocked first, a file picked before then would start without its steps
  const waitingForPassword = Boolean(shownTemplate && templateNeedsPassword(shownTemplate));
  // the one gate for every way in: the drop zone, the link, the launch's dialog and the generators (which only looked
  // at the template's, a password room with no password yet could be made from one, without it)
  const blockedBy: StartBlock | null = (waitingForPassword) ? 'template_password' : (lobbyPasswordShort) ? 'lobby_password' : null;
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ url, setUrl ] = useState(suggestedUrl ?? '');
  const [ start, setStart ] = useState<StartState>({status: 'idle'});
  const uploading = start.status === 'uploading';
  const error = (start.status === 'failed') ? start.message : null;
  // the same as `uploading`, for a second drop in the same tick (the state's a render behind)
  const openingRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  const [ dragOver, setDragOver ] = useState(false);
  const [ recent, setRecent ] = useState<Array<EditorDocumentSummary> | null>(null);
  // the edit asked about, as it was when its bin was pressed
  const [ deleting, setDeleting ] = useState<{item: EditorDocumentSummary, pending: boolean, error: string | null} | null>(null);
  // the catalogue's generators, fetched once per page load (the editor reuses it)
  const { catalogue } = useCatalogue(host);
  const generators = catalogue?.generators ?? [];
  // the effects' names for the template banner when the host doesn't pass them (the Activity)
  const catalogueNames = useMemo(() => new Map((catalogue?.effects ?? []).map((effect) => [effect.id, effect.name])), [catalogue]);
  const [ generating, setGenerating ] = useState<EditorGenerator | null>(null);
  const [ launchDialog, setLaunchDialog ] = useState(Boolean(suggestedUrl));
  const tryEffect = (tryEffectId) ? catalogue?.effects.find((effect) => effect.id === tryEffectId) ?? null : null;
  // Try it on a generator: its dialog, once the catalogue's here
  const triedGeneratorRef = useRef(false);
  useEffect(() => {
    if (!tryGeneratorId || triedGeneratorRef.current || !catalogue) {
      return;
    }
    triedGeneratorRef.current = true;
    const generator = catalogue.generators?.find((item) => item.id === tryGeneratorId);
    if (generator) {
      setGenerating(generator);
    }
  }, [catalogue, tryGeneratorId]);

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
    // one at a time (a file dropped on the zone mid-upload used to make a second document, in the Activity a second
    // room), and never past the gate
    if (openingRef.current || blockedBy) {
      return;
    }
    openingRef.current = true;
    setStart({status: 'uploading'});
    let document: EditorDocument;
    try {
      document = await host.api.createDocument({...input, activityInstanceId, templateCode: template?.code, templatePassword, lobbyPassword: lobbyPasswordSent, lobbyName: lobbyNameSent, lobbyWatchOnly: lobbyWatchOnlySent});
    } catch (failure) {
      openingRef.current = false;
      setStart({status: 'failed', message: host.errorOf(failure)?.message || t('editor.start.upload_error')});
      return;
    }
    // they left the page meanwhile (the site's own links, nothing on this screen leaves mid-upload): it's among their
    // recent edits, opening it now would pull them off wherever they went
    if (!aliveRef.current) {
      return;
    }
    // (still `uploading`: the host is opening it, this screen goes with that)
    onOpen(document, {template: Boolean(template)});
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (uploading) {
      return;
    }
    const file = event.dataTransfer.files[0];
    if (file) {
      void open({file});
    }
  };

  // why Make can't go ahead, in the dialog's own error line (the grid is off then, this is for a dialog opened by
  // `?generator=` over a locked template)
  const blockedMessage = (): string | null => (blockedBy === 'template_password') ? t('editor.template.unlock_first')
    : (blockedBy === 'lobby_password') ? t('editor.template.password_short', {count: MIN_PASSWORD_LENGTH})
    : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (url.trim()) {
      void open({url: url.trim()});
    }
  };

  const dateFormat = new Intl.DateTimeFormat(intlLocale(language), {dateStyle: 'medium'});
  const roomSettings = (mode) ? (
    <RoomSettingsFields
      mode={mode.value}
      onModeChange={mode.onChange}
      name={lobbyName}
      onNameChange={setLobbyName}
      password={lobbyPassword}
      onPasswordChange={setLobbyPassword}
      watchOnly={lobbyWatchOnly}
      onWatchOnlyChange={setLobbyWatchOnly}
      disabled={uploading}
    />
  ) : null;

  return (
    <div
      data-state={(uploading) ? 'uploading' : (dragOver) ? 'dragging' : start.status}
      data-blocked={blockedBy ?? 'none'}
      className='mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:py-14'
    >
      <header className='flex flex-col gap-2'>
        {(onBack || headerAside) ? (
          <div className='flex items-center justify-between gap-2'>
            {(onBack) ? (
              <button type='button' onClick={onBack.run} disabled={uploading} className='-ml-2 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'>
                <ArrowLeft aria-hidden className='size-4'/>{onBack.label}
              </button>
            ) : <span/>}
            {headerAside}
          </div>
        ) : null}
        <h1 className='font-display text-3xl font-semibold text-white sm:text-4xl'>{t('editor.title')}</h1>
        <p className='text-muted'>{t('editor.start.description')}</p>
      </header>

      {(mode && !launchDialog) ? roomSettings : null}

      {(launchDialog && suggestedUrl) ? (
        <LaunchMediaDialog
          url={suggestedUrl}
          surface={launchSurface}
          uploading={uploading}
          error={error}
          blocked={blockedBy !== null}
          settings={(mode) ? roomSettings : null}
          onStart={() => void open({url: suggestedUrl})}
          onDismiss={() => {
            setLaunchDialog(false);
            setStart((current) => (current.status === 'failed') ? {status: 'idle'} : current);
            onSuggestedDismiss?.();
          }}
        />
      ) : null}

      {(tryEffect) ? (
        <div className='flex items-center gap-3 rounded-xl border border-brand/40 bg-brand/10 p-3'>
          {(tryEffect.thumbnail) ? <EffectThumb thumbnail={tryEffect.thumbnail}/> : <Wand2 aria-hidden className='size-6 shrink-0 text-brand-text'/>}
          <p className='text-sm text-fg'>{t('editor.start.try_effect', {name: tryEffect.name})}</p>
        </div>
      ) : null}

      {(shownTemplate) ? (
        <TemplateBanner host={host} template={shownTemplate} effectNames={effectNames ?? catalogueNames} onUnlocked={(next, password) => setUnlocked({template: next, password})}/>
      ) : null}

      {/* a locked template waits for its password, a file picked before then would start without its steps */}
      {(waitingForPassword) ? <p className='-mt-4 text-sm text-warning-text'>{t('editor.template.unlock_first')}</p> : null}
      <fieldset disabled={blockedBy !== null} className={cn('flex flex-col gap-8', blockedBy && 'pointer-events-none opacity-50')}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          // (nothing lights up for a drop that won't be taken)
          setDragOver(!uploading);
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
            <FileUp aria-hidden className='size-8 text-muted'/>
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
      {/* (the launch's dialog shows its own, this one would be a second copy under it) */}
      {(error && !(launchDialog && suggestedUrl)) ? <p role='alert' className='-mt-5 text-sm text-danger-text'>{error}</p> : null}

      {/* the template hub: its page on the site, a panel in the Activity whose Try puts the template here */}
      <HubEntry host={host} picked={hubTemplate} onPick={setHubTemplate} onUnpick={() => setHubTemplate(null)} disabled={uploading}/>

      {(generators.length) ? (
        <section className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <h2 className='font-display text-lg font-semibold text-white'>{t('editor.generate.title')}</h2>
            <p className='text-sm text-muted'>{t('editor.generate.description')}</p>
          </div>
          <GeneratorGrid generators={generators} disabled={uploading || blockedBy !== null} onPick={setGenerating}/>
        </section>
      ) : null}
      {(generating) ? (
        <GeneratorDialog
          generator={generating}
          onClose={() => setGenerating(null)}
          onMake={async (params, portrait) => {
            const blocked = blockedMessage();
            if (blocked) {
              return blocked;
            }
            try {
              const shared = {activityInstanceId, templateCode: template?.code, templatePassword, lobbyPassword: lobbyPasswordSent, lobbyName: lobbyNameSent, lobbyWatchOnly: lobbyWatchOnlySent};
              const effect = (portrait && generating.portrait_effect) ? catalogue?.effects.find((item) => item.id === generating.portrait_effect) : undefined;
              let document: EditorDocument;
              if (portrait && effect) {
                // the portrait is the source (an upload, scanned like one), the card is its first step: effects can go
                // on the picture before it or on the whole card after it
                const created = await host.api.createDocument({...portrait, ...shared});
                const card = {...newStep(effect), params: {...defaultParams(effect), ...params}};
                try {
                  document = await host.api.saveSteps(created.id, [card, ...created.steps], created.version);
                } catch (failure) {
                  // only the portrait, without its card: not what was asked for, and in the Activity a room in everyone's
                  // list already, one more for every try
                  await host.api.deleteDocument(created.id).catch(() => undefined);
                  throw failure;
                }
              } else {
                document = await host.api.generateDocument({generator: generating.id, params, ...shared});
              }
              setGenerating(null);
              onOpen(document, {template: Boolean(template)});
              return null;
            } catch (failure) {
              return host.errorOf(failure)?.message || t('editor.generate.error');
            }
          }}
        />
      ) : null}

      {(!instanceId) ? (
      <section className='flex flex-col gap-3'>
        <h2 className='font-display text-lg font-semibold text-white'>{t('editor.start.recent')}</h2>
        {(recent === null) ? (
          <Spinner/>
        ) : (!recent.length) ? (
          <p className='text-sm text-muted'>{t('editor.start.recent_empty')}</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {recent.map((item) => (
              <li key={item.id} className='flex items-center gap-2 rounded-lg border border-line-strong bg-surface p-2'>
                <button type='button' onClick={() => onOpen(item)} disabled={uploading} className='flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60'>
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
                  onClick={() => setDeleting({item, pending: false, error: null})}
                  disabled={uploading}
                  className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-40'
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
          confirmLabel={t('editor.start.delete', {name: deleting.item.source.filename})}
          pending={deleting.pending}
          error={deleting.error}
          onConfirm={async () => {
            const { item } = deleting;
            setDeleting({item, pending: true, error: null});
            try {
              await host.api.deleteDocument(item.id);
              setRecent((items) => (items ?? []).filter((other) => other.id !== item.id));
              setDeleting(null);
            } catch (failure) {
              // (it used to stop spinning and say nothing)
              setDeleting({item, pending: false, error: host.errorOf(failure)?.message || t('editor.session.failed')});
            }
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
