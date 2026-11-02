import { Plus, Type } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { translate, useI18n } from '@/i18n';
import { api, type SavedFont } from '@/lib/api';
import { errorMessage, useGuildScope, useSavedFontsMutation, useSavedFontsQuery, type SavedFontAction } from '@/lib/api/dashboardQueries';
import { formatDate, formatMemory } from '@/lib/utils';

import { MEDIA_FONT_CHOICES, type Choice } from '../settings/settingsChoices';
import { Field, InlineError, Panel, Skeleton } from '../ui';
import { EditButton, RemoveButton } from '../servers/ServerSections';


// the API's limits, until the list has loaded
const DEFAULT_LIMIT = {guild: 25, user: 10};

// what the API takes (`FONT_SIGNATURES`), the file itself is checked there
const FONT_FILE_ACCEPT = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2';

// how the API stores a name (`normalize_saved_font_name`), shown as it's typed
function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

const NAME_PATTERN = /^[a-z0-9_]{1,32}$/;


// Saved fonts, the caller's own (`guildId` null, their premium) or a server's (any member sees them, Manage Server
// changes them, the server's premium). Used by name in caption, meme and recaption's font, as a Default Font and with
// MediaScript's `loadfont`. Without premium they're kept and can still be renamed or deleted, but not added to
export function SavedFontsPanel({ guildId, editable = true, readOnly }: {
  guildId: string | null,
  editable?: boolean,
  readOnly?: string,
}) {
  const { t, rich } = useI18n();
  const toast = useToast();
  const { data, isPending, error } = useSavedFontsQuery(guildId);
  const mutation = useSavedFontsMutation(guildId);
  const [ busyKey, setBusyKey ] = useState<string | null>(null);
  const [ renamingId, setRenamingId ] = useState<string | null>(null);
  const [ deleting, setDeleting ] = useState<SavedFont | null>(null);
  // what every font shows itself with, their own words or a sentence with most letters
  const [ previewText, setPreviewText ] = useState('');
  const sample = previewText.trim() || t('fonts.preview_default');

  const items = data?.items ?? [];
  const limit = data?.limit ?? ((guildId) ? DEFAULT_LIMIT.guild : DEFAULT_LIMIT.user);
  const premium = data?.premium ?? true;
  const full = limit <= items.length;

  const run = async (key: string, action: SavedFontAction, success: string): Promise<boolean> => {
    setBusyKey(key);
    try {
      await mutation.mutateAsync(action);
      toast(success);
      return true;
    } catch (error) {
      toast(errorMessage(error, translate('fonts.save_error')), 'error');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const premiumLink = (chunk: ReactNode) => <Link to={Routes.DASHBOARD_PREMIUM} className='text-code hover:underline'>{chunk}</Link>;

  return (
    <Panel
      title={t((guildId) ? 'fonts.server_title' : 'fonts.title')}
      accent='#3ba55d'
      description={rich('fonts.panel_description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
      readOnly={(editable) ? undefined : readOnly}
    >
      {(!isPending && !error && !premium) ? (
        <p className='mb-3 text-sm text-muted'>
          {rich((guildId) ? 'fonts.server_needs_premium' : 'fonts.needs_premium', {link: premiumLink})}
        </p>
      ) : null}

      {(isPending) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-12 w-full bg-surface-2'/>
          <Skeleton className='h-12 w-full bg-surface-2'/>
        </div>
      ) : (error) ? (
        <p role='alert' className='text-sm text-danger-text'>{errorMessage(error, t('fonts.load_error'))}</p>
      ) : (items.length) ? (
        <>
          <Field label={t('fonts.preview_label')} hint={t('fonts.preview_hint')} className='mb-3'>
            {(props) => (
              <input
                {...props}
                className='input'
                maxLength={100}
                placeholder={t('fonts.preview_default')}
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
              />
            )}
          </Field>
          <ul className='space-y-2'>
            {items.map((font) => (
              <li key={font.id} className='flex items-start gap-3 rounded-md border border-line bg-deep py-2.5 pr-1 pl-3'>
                {(renamingId === font.id) ? (
                  <RenameForm
                    font={font}
                    busy={busyKey === font.id}
                    disabled={mutation.isPending}
                    onCancel={() => setRenamingId(null)}
                    onSave={async (name) => {
                      if (await run(font.id, {kind: 'rename', fontId: font.id, name}, t('fonts.renamed'))) {
                        setRenamingId(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-xs text-subtle'>
                        <code className='text-fg'>{font.name}</code> • {formatMemory(font.size, (font.size < 1024 * 1024) ? 0 : 1)} • {t('fonts.added_on', {date: formatDate(font.created)})}
                      </div>
                      {(font.thumbnail && !previewText.trim()) ? (
                        <FontThumbnail guildId={guildId} font={font} fallbackText={sample}/>
                      ) : (
                        <FontPreview guildId={guildId} font={font} text={sample}/>
                      )}
                    </div>
                    {(editable) ? (
                      <div className='flex shrink-0'>
                        <EditButton label={t('fonts.rename_label', {name: font.name})} disabled={mutation.isPending} onClick={() => setRenamingId(font.id)}/>
                        <RemoveButton
                          label={t('fonts.delete_label', {name: font.name})}
                          busy={busyKey === font.id}
                          disabled={mutation.isPending}
                          onClick={() => {
                            mutation.reset();
                            setDeleting(font);
                          }}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className='flex items-center gap-2 text-sm text-muted'>
          <Type aria-hidden className='size-4'/>
          {t('fonts.empty')}
        </p>
      )}

      {(editable && premium && !isPending && !error) ? (
        <AddForm
          full={full}
          limit={limit}
          count={items.length}
          maxFileSize={data?.max_file_size ?? 24 * 1024 * 1024}
          busy={busyKey === '\u0000add'}
          disabled={mutation.isPending}
          onAdd={(name, file) => run('\u0000add', {kind: 'add', name, file}, t('fonts.added', {name: normalizeName(name)}))}
        />
      ) : null}

      {(deleting) ? (
        <ConfirmDialog
          title={t('fonts.delete_title', {name: deleting.name})}
          description={t((guildId) ? 'fonts.delete_description_server' : 'fonts.delete_description')}
          confirmLabel={t('common.delete')}
          pending={mutation.isPending}
          onConfirm={async () => {
            if (await run(deleting.id, {kind: 'remove', fontId: deleting.id}, t('fonts.deleted'))) {
              setDeleting(null);
            }
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </Panel>
  );
}


function AddForm({ full, limit, count, maxFileSize, busy, disabled, onAdd }: {
  full: boolean,
  limit: number,
  count: number,
  maxFileSize: number,
  busy: boolean,
  disabled: boolean,
  onAdd: (name: string, file: File) => Promise<boolean>,
}) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [ name, setName ] = useState('');
  const [ file, setFile ] = useState<File | null>(null);
  const normalized = normalizeName(name);
  const nameProblem = (name.trim() && !NAME_PATTERN.test(normalized)) ? t('fonts.name_invalid') : null;
  const sizeProblem = (file && maxFileSize < file.size) ? t('fonts.file_too_large', {size: formatMemory(maxFileSize)}) : null;
  const ready = !!normalized && !nameProblem && !!file && !sizeProblem && !full;

  return (
    <form
      className='mt-4 flex flex-col gap-3 border-t border-line pt-4'
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        if (!ready || disabled) {
          return;
        }
        if (await onAdd(name, file!)) {
          setName('');
          setFile(null);
        }
      }}
    >
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Field
          label={t('fonts.name')}
          error={nameProblem}
          hint={(full) ? t('fonts.full', {max: limit}) : t('fonts.hint', {count, max: limit})}
        >
          {(props) => (
            <input
              {...props}
              className='input'
              maxLength={32}
              placeholder={t('fonts.name_placeholder')}
              value={name}
              disabled={full}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <Field label={t('fonts.file')} error={sizeProblem} hint={t('fonts.file_hint')}>
          {(props) => (
            <div className='flex min-w-0 items-center gap-2'>
              <button {...props} type='button' className='btn btn-secondary shrink-0' disabled={full} onClick={() => fileInput.current?.click()}>
                {t('fonts.choose_file')}
              </button>
              <span className='min-w-0 truncate text-sm text-muted'>{file?.name ?? t('fonts.no_file')}</span>
              <input
                ref={fileInput}
                type='file'
                accept={FONT_FILE_ACCEPT}
                className='hidden'
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  // cleared so picking the same file again still fires
                  event.target.value = '';
                  setFile(picked);
                  // its file name is a good start for the name
                  if (picked && !name.trim()) {
                    setName(normalizeName(picked.name.replace(/\.[^.]+$/, '')).replace(/[^a-z0-9_]/g, '').slice(0, 32));
                  }
                }}
              />
            </div>
          )}
        </Field>
      </div>
      <button type='submit' className='btn btn-secondary self-start' disabled={!ready || disabled}>
        {(busy) ? <Spinner className='size-4'/> : <Plus aria-hidden className='size-4'/>}
        {t('common.add')}
      </button>
    </form>
  );
}


// a new name edited in place, Escape cancels
function RenameForm({ font, busy, disabled, onSave, onCancel }: {
  font: SavedFont,
  busy: boolean,
  disabled: boolean,
  onSave: (name: string) => void,
  onCancel: () => void,
}) {
  const { t } = useI18n();
  const [ value, setValue ] = useState(font.name);
  const normalized = normalizeName(value);
  const valid = NAME_PATTERN.test(normalized);
  return (
    <form
      className='flex min-w-0 flex-1 flex-wrap items-center gap-2 py-1 pr-2'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (disabled || !valid) {
          return;
        }
        if (normalized === font.name) {
          onCancel();
        } else {
          onSave(normalized);
        }
      }}
    >
      <input
        aria-label={t('fonts.rename_field')}
        aria-invalid={!valid}
        className='input min-w-0 flex-1 text-sm'
        maxLength={32}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        autoFocus
      />
      <button type='submit' className='btn btn-sm btn-secondary' disabled={disabled || !valid}>
        {(busy) ? <Spinner className='size-3.5'/> : null}
        {t('common.save')}
      </button>
      <button type='button' className='btn btn-sm btn-ghost' disabled={busy} onClick={onCancel}>{t('common.cancel')}</button>
      {(!valid) ? <InlineError>{t('fonts.name_invalid')}</InlineError> : null}
    </form>
  );
}


// `text` drawn in the font itself. The file is fetched with the token and handed to the browser, which runs its own
// font checks (OTS in Chrome and Firefox) before using it. One it won't load says so, the bot can still use fonts the
// browser is pickier about
function FontPreview({ guildId, font, text }: {guildId: string | null, font: SavedFont, text: string}) {
  const { t } = useI18n();
  const scope = useGuildScope();
  const [ family, setFamily ] = useState<string | null>(null);
  const [ failed, setFailed ] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let face: FontFace | null = null;
    setFamily(null);
    setFailed(false);
    void (async () => {
      try {
        const blob = await api.fetchSavedFontFile(scope, guildId, font.id, controller.signal);
        face = new FontFace(`nsb-saved-font-${font.id}`, await blob.arrayBuffer());
        await face.load();
        if (controller.signal.aborted) {
          return;
        }
        document.fonts.add(face);
        setFamily(face.family);
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      }
    })();
    return () => {
      controller.abort();
      if (face) {
        document.fonts.delete(face);
      }
    };
  }, [scope, guildId, font.id]);

  if (failed) {
    return <p className='mt-1 text-sm text-muted italic'>{t('fonts.preview_unavailable')}</p>;
  }
  if (!family) {
    return <Skeleton className='mt-1.5 h-6 w-1/2 bg-surface-2'/>;
  }
  // `font-size-adjust` gives every font the same x-height, their own metrics would make some look twice as big
  return (
    <p
      className='mt-1 line-clamp-2 text-lg leading-snug break-words text-white'
      // a string, react would add px to the number
      style={{fontFamily: `"${family}", sans-serif`, fontSizeAdjust: '0.5'}}
      title={text}
    >
      {text}
    </p>
  );
}


// the API's png of a sample line (`SavedFont.thumbnail`), drawn the way the bot draws the font and scaled so every font's
// glyphs are the same height. One that won't load shows the font drawn by the browser instead
function FontThumbnail({ guildId, font, fallbackText }: {guildId: string | null, font: SavedFont, fallbackText: string}) {
  const scope = useGuildScope();
  const [ url, setUrl ] = useState<string | null>(null);
  const [ failed, setFailed ] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);
    api.fetchSavedFontThumbnail(scope, guildId, font.id, controller.signal).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setFailed(true);
      }
    });
    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [scope, guildId, font.id]);

  if (failed) {
    return <FontPreview guildId={guildId} font={font} text={fallbackText}/>;
  }
  if (!url) {
    return <Skeleton className='mt-1.5 h-7 w-1/2 bg-surface-2'/>;
  }
  // drawn over three times as big as it's shown (28px tall), sharp on high density screens and shrinking with the row on phones
  return (
    <img
      src={url}
      alt={font.name}
      className='mt-1.5 max-h-7 w-auto max-w-full'
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}


// the Default Font choices: the caller's (or the server's) saved fonts first, by name, then the bundled ones. Only
// fonts that can be used are offered, a setting already on one that can't stays visible (`ChoiceSelect`)
export function useMediaFontChoices(guildId: string | null, enabled = true): ReadonlyArray<Choice> {
  const { t } = useI18n();
  const { data } = useSavedFontsQuery(guildId, enabled);
  return useMemo(() => {
    const saved = (data?.premium) ? data.items.map((font) => ({value: font.name, label: t('fonts.choice_saved', {name: font.name})})) : [];
    return [...saved, ...MEDIA_FONT_CHOICES];
  }, [data, t]);
}
