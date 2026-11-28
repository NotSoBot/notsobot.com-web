import { CheckCircle2, Clock, EyeOff, Globe, Lock, XCircle } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { Chip } from '@/components/ui/Chip';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorTemplate } from '../types';
import { hubLimitOf } from './api';
import type { HubStatus } from './types';


// the api's `hub_description` column
export const HUB_DESCRIPTION_MAX = 200;


export function hubStatusOf(template: EditorTemplate): HubStatus {
  return template.hub?.status ?? 'none';
}


// What each status is to its owner, in one place: one added to `HubStatus` doesn't compile until it has a row.
// `listed`: on the hub or held for it, it can be unpublished and its description saved. `button`: the globe's color
interface HubStatusView {
  tone: 'neutral' | 'danger' | 'warning' | 'success',
  listed: boolean,
  button: string,
}

const HUB_STATUS: Record<HubStatus, HubStatusView> = {
  none: {tone: 'neutral', listed: false, button: 'text-muted hover:text-fg'},
  review: {tone: 'warning', listed: true, button: 'text-warning-text'},
  published: {tone: 'success', listed: true, button: 'text-success-text'},
  hidden: {tone: 'neutral', listed: true, button: 'text-muted hover:text-fg'},
  rejected: {tone: 'danger', listed: false, button: 'text-danger-text'},
};

// (one this build doesn't know, from a newer api, is shown like an unlisted one rather than not at all)
function hubStatusView(status: HubStatus): HubStatusView {
  return HUB_STATUS[status] ?? HUB_STATUS.none;
}


// Where one of their templates stands on the hub, next to its name in their lists. Nothing while it's unlisted
export function HubStatusBadge({ template, className }: {template: EditorTemplate, className?: string}) {
  const { t } = useI18n();
  const status = hubStatusOf(template);
  if (status === 'none') {
    return null;
  }
  return <Chip tone={hubStatusView(status).tone} className={className}>{t(`hub.status.${status}`)}</Chip>;
}


// The result of the check (or where it stands now), what the owner reads after publishing
function StatusResult({ host, template }: {host: EditorHost, template: EditorTemplate}) {
  const { t } = useI18n();
  const status = hubStatusOf(template);
  const reason = template.hub?.reason?.trim();
  let icon: ReactNode;
  let text: string;
  let tone: string;
  switch (status) {
    case 'published':
      icon = <CheckCircle2 aria-hidden className='size-5 shrink-0'/>;
      text = t('hub.result.published');
      tone = 'border-success/40 bg-success/10 text-success-text';
      break;
    case 'review':
      icon = <Clock aria-hidden className='size-5 shrink-0'/>;
      text = t('hub.result.review');
      tone = 'border-warning/40 bg-warning/10 text-warning-text';
      break;
    case 'rejected':
      icon = <XCircle aria-hidden className='size-5 shrink-0'/>;
      text = (reason) ? t('hub.result.rejected', {reason}) : t('hub.result.rejected_plain');
      tone = 'border-danger/40 bg-danger/10 text-danger-text';
      break;
    case 'hidden':
      icon = <EyeOff aria-hidden className='size-5 shrink-0'/>;
      text = (reason) ? t('hub.result.hidden', {reason}) : t('hub.result.hidden_plain');
      tone = 'border-line-strong bg-surface text-muted';
      break;
    case 'none':
      return null;
    default: {
      // a status this build doesn't know says nothing. One added to `HubStatus` doesn't compile until it has a case
      const unknown: never = status;
      void unknown;
      return null;
    }
  }
  return (
    <div role='status' className={cn('flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm', tone)}>
      <p className='flex items-start gap-2'>{icon}<span className='break-words'>{text}</span></p>
      {(status === 'published' && host.openHub) ? (
        <button type='button' className='w-fit text-sm font-semibold text-brand-text underline-offset-2 hover:underline' onClick={() => host.openHub?.(template.code)}>
          {t('hub.result.view')}
        </button>
      ) : null}
    </div>
  );
}


// Publish: a description (up to 200), one line on what the check does, then its verdict (Published, In review, or
// Rejected with why). Published, in review or hidden ones can be unpublished, a rejected one published again
export function PublishDialog({ host, template, onChange, onClose }: {
  host: EditorHost,
  template: EditorTemplate,
  onChange: (template: EditorTemplate) => void,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const countId = useId();
  const [ description, setDescription ] = useState(template.hub?.description ?? '');
  const [ pending, setPending ] = useState<'publish' | 'unpublish' | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  const [ unpublished, setUnpublished ] = useState(false);
  const status = hubStatusOf(template);
  const listed = hubStatusView(status).listed;
  const unchanged = listed && description.trim() === (template.hub?.description ?? '').trim();

  const publish = async () => {
    setPending('publish');
    setError(null);
    setUnpublished(false);
    try {
      onChange(await host.api.publishTemplate(template.code, description.trim()));
    } catch (failure) {
      const apiError = host.errorOf(failure);
      const limit = hubLimitOf(apiError);
      setError((limit !== null) ? t('hub.publish.limit', {limit}) : (apiError?.message || t('hub.publish.error')));
    } finally {
      setPending(null);
    }
  };

  const unpublish = async () => {
    setPending('unpublish');
    setError(null);
    try {
      onChange(await host.api.unpublishTemplate(template.code));
      setUnpublished(true);
    } catch (failure) {
      setError(host.errorOf(failure)?.message || t('hub.publish.unpublish_error'));
    } finally {
      setPending(null);
    }
  };

  const submitLabel = (status === 'rejected' || (status === 'none' && unpublished)) ? t('hub.publish.again') : (listed) ? t('hub.publish.save') : t('hub.publish.submit');
  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-lg'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        data-state={pending ?? ((error) ? 'error' : 'idle')}
        data-hub-status={status}
        aria-busy={pending === 'publish'}
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending && !template.locked && !unchanged) {
            void publish();
          }
        }}
      >
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>
            {(status === 'none') ? t('hub.publish.title', {name: template.name}) : t('hub.publish.manage_title', {name: template.name})}
          </h2>
          <p className='mt-2 text-sm text-muted'>{t('hub.publish.intro')}</p>
        </div>

        {(pending !== 'publish') ? <StatusResult host={host} template={template}/> : null}
        {(unpublished && status === 'none') ? <p role='status' className='text-sm text-muted'>{t('hub.publish.unpublished')}</p> : null}

        {(template.locked) ? (
          <p className='flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning-text'>
            <Lock aria-hidden className='mt-0.5 size-4 shrink-0'/>{t('hub.publish.locked')}
          </p>
        ) : (
          <div className='flex flex-col gap-1.5'>
            <label htmlFor={descriptionId} className='text-sm font-medium text-fg'>{t('hub.publish.description_label')}</label>
            <textarea
              id={descriptionId}
              value={description}
              maxLength={HUB_DESCRIPTION_MAX}
              rows={3}
              disabled={Boolean(pending)}
              placeholder={t('hub.publish.description_placeholder')}
              aria-describedby={countId}
              onChange={(event) => setDescription(event.target.value)}
              data-autofocus
              className='input min-h-20 resize-y'
            />
            <div className='flex items-start justify-between gap-3 text-xs'>
              <p className='text-muted'>{t('hub.publish.check')}</p>
              <span id={countId} className={cn('shrink-0 tabular-nums', (description.length >= HUB_DESCRIPTION_MAX) ? 'text-warning-text' : 'text-subtle')}>
                {t('hub.publish.description_count', {count: description.length, max: HUB_DESCRIPTION_MAX})}
              </span>
            </div>
          </div>
        )}

        {(pending === 'publish') ? (
          <p role='status' className='flex items-center gap-2 text-sm text-muted'>
            <Spinner className='size-4'/>{t('hub.publish.checking')}
          </p>
        ) : null}
        {(error) ? <DialogError>{error}</DialogError> : null}

        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:items-center'>
          {(listed) ? (
            <button type='button' className='btn btn-secondary text-danger-text sm:mr-auto' disabled={Boolean(pending)} onClick={() => void unpublish()}>
              {(pending === 'unpublish') ? <Spinner className='size-4'/> : <EyeOff aria-hidden className='size-4'/>}
              {t('hub.publish.unpublish')}
            </button>
          ) : null}
          <button type='button' className='btn btn-secondary sm:ml-auto' onClick={onClose} disabled={Boolean(pending)}>{t('common.close')}</button>
          {(!template.locked) ? (
            <button type='submit' className='btn btn-primary' disabled={Boolean(pending) || unchanged}>
              {(pending === 'publish') ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Globe aria-hidden className='size-4'/>}
              {submitLabel}
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}


// The Publish button beside one of their templates: a globe that opens the dialog above (its label says where it stands)
export function PublishButton({ host, template, onChange, className }: {
  host: EditorHost,
  template: EditorTemplate,
  onChange: (template: EditorTemplate) => void,
  className?: string,
}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  const status = hubStatusOf(template);
  const label = (status === 'none') ? t('hub.publish.button_named', {name: template.name}) : t('hub.publish.manage_named', {name: template.name});
  return (
    <>
      <button
        type='button'
        aria-label={label}
        title={label}
        data-hub-status={status}
        onClick={() => setOpen(true)}
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-surface-3',
          hubStatusView(status).button,
          className,
        )}
      >
        <Globe aria-hidden className='size-4'/>
      </button>
      {(open) ? <PublishDialog host={host} template={template} onChange={onChange} onClose={() => setOpen(false)}/> : null}
    </>
  );
}
