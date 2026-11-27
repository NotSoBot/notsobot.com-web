import { BookmarkPlus, Check, Eye, EyeOff, Link, Lock, Share2, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';
import type { EditorTemplate } from '../types';
import type { EditorDocumentState } from '../useEditorDocument';
import { AskForInputs, inputCandidates } from './TemplateInputs';


const MAX_NAME_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 64;


// a password box with show/hide, for locking a template and for unlocking one
export function PasswordInput({ id, value, onChange, autoComplete, placeholder, autoFocus }: {
  id: string,
  value: string,
  onChange: (value: string) => void,
  autoComplete: 'new-password' | 'current-password',
  placeholder?: string,
  autoFocus?: boolean,
}) {
  const { t } = useI18n();
  const [ shown, setShown ] = useState(false);
  return (
    <div className='flex gap-2'>
      <input
        id={id}
        type={(shown) ? 'text' : 'password'}
        value={value}
        maxLength={MAX_PASSWORD_LENGTH}
        autoComplete={autoComplete}
        placeholder={placeholder}
        // outside a modal too (a locked template's banner)
        autoFocus={autoFocus}
        data-autofocus={autoFocus || undefined}
        onChange={(event) => onChange(event.target.value)}
        className='input min-w-0 flex-1'
      />
      <button
        type='button'
        aria-label={(shown) ? t('editor.template.password_hide') : t('editor.template.password_show')}
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
        className='flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-muted hover:bg-surface-3 hover:text-fg'
      >
        {(shown) ? <EyeOff aria-hidden className='size-4'/> : <Eye aria-hidden className='size-4'/>}
      </button>
    </div>
  );
}


// Copy link and, where the host has it, Share in chat. The template's saved, these only pass its link on
export function TemplateShareActions({ host, template, exampleUrl }: {host: EditorHost, template: EditorTemplate, exampleUrl?: string | null}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ copyFailed, setCopyFailed ] = useState(false);
  const [ sharing, setSharing ] = useState(false);
  const [ shareError, setShareError ] = useState<string | null>(null);
  const [ posted, setPosted ] = useState(false);
  const url = host.templateUrl(template.code);
  const share = host.shareTemplate;
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <input readOnly value={url} onFocus={(event) => event.target.select()} aria-label={t('editor.template.link')} className='input min-w-0 flex-1 font-mono text-xs'/>
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
      {(share) ? (
        <button
          type='button'
          disabled={sharing}
          className='btn btn-secondary w-full'
          onClick={async () => {
            setSharing(true);
            setShareError(null);
            try {
              setPosted(await share(template, exampleUrl) === 'posted');
            } catch (error) {
              setShareError((error instanceof Error && error.message) ? error.message : t('editor.template.share_failed'));
            } finally {
              setSharing(false);
            }
          }}
        >
          {(sharing) ? <Spinner className='size-4'/> : <Share2 aria-hidden className='size-4'/>}
          {(host.shareTemplateInChat) ? t('editor.template.share') : t('editor.template.share_device')}
        </button>
      ) : null}
      {(shareError) ? <p role='alert' className='text-xs text-danger-text'>{shareError}</p> : null}
      {(posted) ? <p role='status' className='flex gap-1.5 text-xs text-success-text'><Check aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.template.posted')}</p> : null}
      {(template.locked) ? (
        <p className='flex gap-1.5 text-xs text-subtle'><Lock aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.template.locked_note')}</p>
      ) : null}
    </div>
  );
}


// "Save as template": the document's saved steps under a name, optionally locked with a password, then its share link.
// Unlisted, only people with the link find it (and with a lock, only those who also have the password see its steps)
function SaveTemplateDialog({ host, state, documentId, exampleUrl, onClose }: {
  host: EditorHost,
  state?: EditorDocumentState,
  documentId: string,
  exampleUrl?: string | null,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const inputId = useId();
  const passwordId = useId();
  const [ name, setName ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const [ saved, setSaved ] = useState<EditorTemplate | null>(null);
  // what the template asks people for, as the steps ask now (candidate id -> question)
  const candidates = useMemo(() => (state) ? inputCandidates(state.steps, state.effectsById) : [], [state]);
  const [ asks, setAsks ] = useState<Record<string, string>>(() => Object.fromEntries(
    candidates.filter((item) => item.step.inputs?.[item.param.name]).map((item) => [item.id, item.step.inputs![item.param.name]]),
  ));
  // the ones whose step and setting are still there: in a room a step can go while this is open, and its question (an
  // empty one kept Create off with nothing to fill in) goes with it
  const asked = useMemo(() => {
    const ids = new Set(candidates.map((item) => item.id));
    return Object.fromEntries(Object.entries(asks).filter(([ id ]) => ids.has(id)));
  }, [asks, candidates]);
  const emptyQuestion = Object.values(asked).some((question) => !question.trim());
  // heavy AI effects can't be in a template yet (the api refuses them too)
  const blocked = (state) ? state.steps.map((step) => state.effectsById.get(step.effect)).find((effect) => effect?.template_blocked) : undefined;

  const passwordShort = Boolean(password) && password.length < MIN_PASSWORD_LENGTH;

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      if (state) {
        // the questions go on the steps first (they're what the template copies), then every edit has to be saved
        const byStep: Record<string, Record<string, string> | undefined> = {};
        for (const step of state.steps) {
          byStep[step.id] = undefined;
        }
        for (const item of candidates) {
          if (item.id in asked) {
            byStep[item.step.id] = {...(byStep[item.step.id] ?? {}), [item.param.name]: asked[item.id].trim()};
          }
        }
        const changed = state.steps.some((step) => JSON.stringify(step.inputs ?? null) !== JSON.stringify(byStep[step.id] ?? null));
        if (changed) {
          state.setStepInputs(byStep);
        }
        if (!await state.whenSaved()) {
          throw new Error(t('editor.render.unsaved'));
        }
      }
      setSaved(await host.api.createTemplate(documentId, name.trim(), password || undefined));
    } catch (failure) {
      setError(host.errorOf(failure)?.message || ((failure instanceof Error && failure.message) ? failure.message : t('editor.template.error')));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        data-state={(saved) ? 'saved' : (pending) ? 'pending' : (error) ? 'error' : 'idle'}
        onSubmit={(event) => {
          event.preventDefault();
          if (saved) {
            onClose();
          } else if (name.trim() && !passwordShort && !emptyQuestion && !blocked && !pending) {
            void save();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.template.save_title')}</h2>
        {(saved) ? (
          <div className='mt-3 flex flex-col gap-2'>
            <p className='text-sm text-muted'>{(saved.locked) ? t('editor.template.saved_locked') : t('editor.template.saved')}</p>
            <TemplateShareActions host={host} template={saved} exampleUrl={exampleUrl}/>
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
            <div className='mt-4'>
              <label htmlFor={passwordId} className='mb-1.5 flex items-center gap-1.5 text-sm text-muted'>
                <Lock aria-hidden className='size-3.5'/>{t('editor.template.password')}
              </label>
              <PasswordInput id={passwordId} value={password} onChange={setPassword} autoComplete='new-password' placeholder={t('editor.template.password_placeholder')}/>
              <p className={(passwordShort) ? 'mt-1.5 text-xs text-danger-text' : 'mt-1.5 text-xs text-subtle'}>
                {(passwordShort) ? t('editor.template.password_short', {count: MIN_PASSWORD_LENGTH}) : t('editor.template.password_hint')}
              </p>
            </div>
            <div className='mt-4'>
              <AskForInputs candidates={candidates} value={asked} onChange={setAsks}/>
            </div>
            {(blocked) ? <p role='alert' className='mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning'>{t('editor.template.heavy_ai', {name: blocked.name})}</p> : null}
          </>
        )}

        {(error) ? <DialogError className='mt-4'>{error}</DialogError> : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          {(saved) ? (
            <button type='submit' className='btn btn-primary'>{t('editor.template.done')}</button>
          ) : (
            <>
              <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
              <button type='submit' className='btn btn-primary' disabled={!name.trim() || passwordShort || emptyQuestion || Boolean(blocked) || pending}>
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


// `exampleUrl`: the current preview, the bot's post of the template shows it
export function SaveTemplateButton({ host, state, documentId, exampleUrl, disabled }: {
  host: EditorHost,
  state?: EditorDocumentState,
  documentId: string,
  exampleUrl?: string | null,
  disabled: boolean,
}) {
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
      {(open) ? <SaveTemplateDialog host={host} state={state} documentId={documentId} exampleUrl={exampleUrl} onClose={() => setOpen(false)}/> : null}
    </>
  );
}
