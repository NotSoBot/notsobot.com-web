import { Check, Layers, Link, Lock, LockOpen, Share2, Trash2, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';

import { EditorErrorCodes, type EditorHost } from '../api';
import type { EditorTemplate } from '../types';
import { MIN_PASSWORD_LENGTH, PasswordInput } from './SaveTemplate';
import { HubStatusBadge, PublishButton } from '../hub/Publish';


// true while a locked template's steps are still hidden from this viewer
export function templateNeedsPassword(template: EditorTemplate): boolean {
  return template.locked && !template.is_owner && !template.steps.length;
}


// A locked template's password, checked by the api (`/unlock`): its steps come back, and the password goes along with
// the document that starts from it
function UnlockForm({ host, template, onUnlocked }: {
  host: EditorHost,
  template: EditorTemplate,
  onUnlocked: (template: EditorTemplate, password: string) => void,
}) {
  const { t } = useI18n();
  const id = useId();
  const [ password, setPassword ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  return (
    <form
      className='flex flex-col gap-2'
      data-state={(pending) ? 'pending' : (error) ? 'error' : 'idle'}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!password || pending) {
          return;
        }
        setPending(true);
        setError(null);
        try {
          onUnlocked(await host.api.unlockTemplate(template.code, password), password);
        } catch (failure) {
          const apiError = host.errorOf(failure);
          setError((apiError?.code === EditorErrorCodes.EDITOR_TEMPLATE_PASSWORD_INVALID && apiError.status === 403) ? t('editor.template.unlock_wrong') : (apiError?.message || t('editor.template.unlock_error')));
        } finally {
          // (the form goes once it's unlocked, but only because the banner stops asking: it doesn't spin on that)
          setPending(false);
        }
      }}
    >
      <label htmlFor={id} className='text-sm text-muted'>{t('editor.template.unlock_label')}</label>
      <div className='flex gap-2'>
        <div className='min-w-0 flex-1'>
          <PasswordInput id={id} value={password} onChange={setPassword} autoComplete='current-password' autoFocus/>
        </div>
        <button type='submit' className='btn btn-primary shrink-0' disabled={!password || pending}>
          {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <LockOpen aria-hidden className='size-4'/>}
          {t('editor.template.unlock')}
        </button>
      </div>
      {(error) ? <p role='alert' className='text-xs text-danger-text'>{error}</p> : null}
    </form>
  );
}


// A shared template on the start screen: whose it is and its steps (effect names from the catalogue once it's in, the
// ids until then). Whatever file is picked next starts with these steps. A locked one asks for its password first
export function TemplateBanner({ host, template, effectNames, onUnlocked }: {
  host: EditorHost,
  template: EditorTemplate,
  effectNames?: Map<string, string>,
  onUnlocked: (template: EditorTemplate, password: string) => void,
}) {
  const { t } = useI18n();
  if (templateNeedsPassword(template)) {
    return (
      <section className='flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4'>
        <p className='flex flex-wrap items-baseline gap-x-2 text-white'>
          <Lock aria-hidden className='size-4 shrink-0 self-center text-warning'/>
          <span className='font-semibold'>{t('editor.template.locked_title', {name: template.name})}</span>
          <span className='text-sm text-muted'>{t('editor.template.by', {user: template.user.username})}</span>
        </p>
        <UnlockForm host={host} template={template} onUnlocked={onUnlocked}/>
      </section>
    );
  }
  return (
    <section className='flex flex-col gap-2 rounded-xl border border-brand/50 bg-brand/10 p-4'>
      <p className='flex flex-wrap items-baseline gap-x-2 text-white'>
        <Layers aria-hidden className='size-4 shrink-0 self-center text-brand-text'/>
        <span className='font-semibold'>{t('editor.template.using', {name: template.name})}</span>
        <span className='text-sm text-muted'>{t('editor.template.by', {user: template.user.username})}</span>
        {(template.locked) ? <Lock aria-label={t('editor.template.locked')} className='size-3.5 self-center text-muted'/> : null}
      </p>
      <ol className='flex flex-wrap gap-1.5'>
        {template.steps.map((step, index) => (
          <li key={step.id} className='rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-fg'>
            {index + 1}. {effectNames?.get(step.effect) ?? step.effect}
          </li>
        ))}
      </ol>
      {(template.inputs?.length) ? (
        <p className='text-sm text-fg'>{t('editor.inputs.banner', {list: template.inputs.map((item) => item.label).join(', ')})}</p>
      ) : null}
      <p className='text-sm text-muted'>{t('editor.template.pick')}</p>
    </section>
  );
}


function CopyTemplateLink({ url }: {url: string}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ failed, setFailed ] = useState(false);
  return (
    <button
      type='button'
      aria-label={t('editor.template.copy')}
      title={t('editor.template.copy')}
      onClick={async () => setFailed(!(await copy(url)))}
      className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg'
    >
      {(failed) ? <X aria-hidden className='size-4 text-danger-text'/> : (copied) ? <Check aria-hidden className='size-4 text-success-text'/> : <Link aria-hidden className='size-4'/>}
    </button>
  );
}


// The web start screen's list of your templates: each one's link to copy, how often it's been used, and delete
// The owner's lock: a new password (locks it, or changes the one it has) or taking it off
function LockDialog({ host, template, onSaved, onClose }: {
  host: EditorHost,
  template: EditorTemplate,
  onSaved: (template: EditorTemplate) => void,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const passwordId = useId();
  const [ password, setPassword ] = useState('');
  const [ pending, setPending ] = useState<'lock' | 'remove' | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  const short = password.length < MIN_PASSWORD_LENGTH;

  const save = async (next: string | null) => {
    setPending((next === null) ? 'remove' : 'lock');
    setError(null);
    try {
      onSaved(await host.api.setTemplatePassword(template.code, next));
    } catch (failure) {
      setError(host.errorOf(failure)?.message || t('editor.template.error'));
      setPending(null);
    }
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        data-state={pending ?? ((error) ? 'error' : 'idle')}
        onSubmit={(event) => {
          event.preventDefault();
          if (!short && !pending) {
            void save(password);
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>
          {(template.locked) ? t('editor.template.lock_change_title', {name: template.name}) : t('editor.template.lock_title', {name: template.name})}
        </h2>
        <p className='-mt-2 text-sm text-muted'>{t('editor.template.lock_description')}</p>
        <div className='flex flex-col gap-1.5'>
          <label htmlFor={passwordId} className='text-sm text-muted'>{t('editor.template.password_new')}</label>
          <PasswordInput id={passwordId} value={password} onChange={setPassword} autoComplete='new-password' autoFocus/>
          <p className='text-xs text-subtle'>{t('editor.template.password_short', {count: MIN_PASSWORD_LENGTH})}</p>
        </div>
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:items-center'>
          {(template.locked) ? (
            <button type='button' className='btn btn-secondary text-danger-text sm:mr-auto' disabled={Boolean(pending)} onClick={() => void save(null)}>
              {(pending === 'remove') ? <Spinner className='size-4'/> : <LockOpen aria-hidden className='size-4'/>}
              {t('editor.template.lock_remove')}
            </button>
          ) : null}
          <button type='button' className='btn btn-secondary sm:ml-auto' onClick={onClose} disabled={Boolean(pending)}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={short || Boolean(pending)}>
            {(pending === 'lock') ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Lock aria-hidden className='size-4'/>}
            {(template.locked) ? t('editor.template.lock_change') : t('editor.template.lock')}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// the list itself: a load that failed isn't an empty list ("You have no templates yet" over a network error)
type TemplateListState =
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'ready', templates: Array<EditorTemplate>};

// the one dialog open over the list, on the template it was opened for
type TemplateListDialog =
  | {kind: 'lock', template: EditorTemplate}
  | {kind: 'delete', template: EditorTemplate, pending: boolean, error: string | null};


export function TemplateList({ host }: {host: EditorHost}) {
  const { t, plural } = useI18n();
  const [ list, setList ] = useState<TemplateListState>({status: 'loading'});
  const [ attempt, setAttempt ] = useState(0);
  const [ dialog, setDialog ] = useState<TemplateListDialog | null>(null);
  const share = host.shareTemplate;

  useEffect(() => {
    let alive = true;
    setList({status: 'loading'});
    host.api.templates().then((result) => {
      if (alive) {
        setList({status: 'ready', templates: result.templates});
      }
    }).catch(() => {
      if (alive) {
        setList({status: 'error'});
      }
    });
    return () => {
      alive = false;
    };
  }, [host, attempt]);

  const replace = (saved: EditorTemplate) => setList((current) => (current.status === 'ready')
    ? {...current, templates: current.templates.map((item) => (item.code === saved.code) ? saved : item)}
    : current);
  const templates = (list.status === 'ready') ? list.templates : [];

  return (
    <section data-state={list.status} className='flex flex-col gap-3'>
      <h2 className='font-display text-lg font-bold text-white'>{t('editor.template.yours')}</h2>
      {(list.status === 'loading') ? (
        <Spinner/>
      ) : (list.status === 'error') ? (
        <div role='alert' className='flex flex-wrap items-center gap-3'>
          <p className='text-sm text-danger-text'>{t('editor.templates.error')}</p>
          <button type='button' className='btn btn-secondary' onClick={() => setAttempt((value) => value + 1)}>{t('common.retry')}</button>
        </div>
      ) : (!templates.length) ? (
        <p className='text-sm text-muted'>{t('editor.template.yours_empty')}</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {templates.map((template) => (
            <li key={template.code} className='flex flex-wrap items-center gap-2 rounded-lg border border-line-strong bg-surface p-2 pl-3'>
              {(template.locked) ? (
                <Lock aria-label={t('editor.template.locked')} className='size-4 shrink-0 text-warning'/>
              ) : (
                <Layers aria-hidden className='size-4 shrink-0 text-brand-text'/>
              )}
              <span className='flex min-w-0 flex-1 flex-col max-sm:basis-[calc(100%-1.5rem)]'>
                <span className='flex min-w-0 items-center gap-2'>
                  <span className='truncate text-sm font-semibold text-white'>{template.name}</span>
                  <HubStatusBadge template={template} className='shrink-0'/>
                </span>
                <span className='text-xs text-muted'>
                  {plural('editor.start.steps', template.steps.length)} · {plural('editor.template.uses', template.uses)}
                </span>
              </span>
              <PublishButton host={host} template={template} className='max-sm:ml-4' onChange={replace}/>
              <CopyTemplateLink url={host.templateUrl(template.code)}/>
              {(share) ? (
                <button
                  type='button'
                  aria-label={(host.shareTemplateInChat) ? t('editor.template.share') : t('editor.template.share_device')}
                  title={(host.shareTemplateInChat) ? t('editor.template.share') : t('editor.template.share_device')}
                  onClick={() => void share(template).catch(() => undefined)}
                  className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg'
                >
                  <Share2 aria-hidden className='size-4'/>
                </button>
              ) : null}
              <button
                type='button'
                aria-label={(template.locked) ? t('editor.template.lock_change_title', {name: template.name}) : t('editor.template.lock_title', {name: template.name})}
                title={(template.locked) ? t('editor.template.lock_change') : t('editor.template.lock')}
                onClick={() => setDialog({kind: 'lock', template})}
                className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg'
              >
                {(template.locked) ? <Lock aria-hidden className='size-4'/> : <LockOpen aria-hidden className='size-4'/>}
              </button>
              <button
                type='button'
                aria-label={t('editor.template.delete', {name: template.name})}
                onClick={() => setDialog({kind: 'delete', template, pending: false, error: null})}
                className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger-text'
              >
                <Trash2 aria-hidden className='size-4'/>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(dialog?.kind === 'lock') ? (
        <LockDialog
          host={host}
          template={dialog.template}
          onSaved={(saved) => {
            replace(saved);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {(dialog?.kind === 'delete') ? (
        <ConfirmDialog
          title={t('editor.template.delete_title')}
          description={t('editor.template.delete_description')}
          confirmLabel={t('editor.template.delete', {name: dialog.template.name})}
          pending={dialog.pending}
          error={dialog.error}
          onConfirm={async () => {
            const { template } = dialog;
            setDialog({kind: 'delete', template, pending: true, error: null});
            try {
              await host.api.deleteTemplate(template.code);
              setList((current) => (current.status === 'ready') ? {...current, templates: current.templates.filter((item) => item.code !== template.code)} : current);
              setDialog(null);
            } catch (failure) {
              // (it used to stop spinning and say nothing)
              setDialog({kind: 'delete', template, pending: false, error: host.errorOf(failure)?.message || t('errors.generic')});
            }
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}
