import { Check, LogIn } from 'lucide-react';
import { useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import { HUB_REPORT_REASONS, type HubReportReason, type HubTemplate } from './types';


const REPORT_TEXT_MAX = 500;


export type HubLoginIntent = 'try' | 'report';


// Logged out: browsing is open, trying a template (it runs in the editor) and reporting one need a Discord login
export function HubLoginDialog({ intent, onLogin, onClose }: {intent: HubLoginIntent, onLogin: () => void, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <div className='flex flex-col gap-4 p-5 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t(`hub.login.${intent}_title`)}</h2>
          <p className='mt-2 text-sm text-muted'>{t(`hub.login.${intent}_description`)}</p>
        </div>
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
          <button type='button' className='btn btn-primary' onClick={onLogin} data-autofocus>
            <LogIn aria-hidden className='size-4'/>{t('hub.login.button')}
          </button>
        </div>
      </div>
    </Modal>
  );
}


// A reason (one of the api's choices) and anything else they want to say. Staff get it as a content flag, and three
// open reports from different people take the template off the hub until it's looked at
export function HubReportDialog({ host, template, onClose }: {host: Pick<EditorHost, 'api' | 'errorOf'>, template: Pick<HubTemplate, 'code' | 'name'>, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const textId = useId();
  const [ reason, setReason ] = useState<HubReportReason | null>(null);
  const [ text, setText ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ sent, setSent ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      {(sent) ? (
        <div data-state='sent' className='flex flex-col gap-4 p-5 sm:p-6'>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('hub.report.title', {name: template.name})}</h2>
          <p role='status' className='flex items-center gap-2 text-sm text-success-text'>
            <Check aria-hidden className='size-4 shrink-0'/>{t('hub.report.sent')}
          </p>
          <div className='flex justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} data-autofocus>{t('common.close')}</button>
          </div>
        </div>
      ) : (
        <form
          className='flex flex-col gap-4 p-5 sm:p-6'
          data-state={(pending) ? 'pending' : (error) ? 'error' : 'idle'}
          onSubmit={async (event) => {
            event.preventDefault();
            if (!reason || pending) {
              return;
            }
            setPending(true);
            setError(null);
            try {
              await host.api.reportTemplate(template.code, reason, text.trim());
              setSent(true);
            } catch (failure) {
              setError(host.errorOf(failure)?.message || t('hub.report.error'));
            } finally {
              setPending(false);
            }
          }}
        >
          <div>
            <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('hub.report.title', {name: template.name})}</h2>
            <p className='mt-2 text-sm text-muted'>{t('hub.report.description')}</p>
          </div>
          <fieldset className='flex flex-col gap-1.5'>
            <legend className='mb-1.5 text-sm font-medium text-fg'>{t('hub.report.reason')}</legend>
            {HUB_REPORT_REASONS.map((value) => (
              <label
                key={value}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                  (reason === value) ? 'border-brand bg-brand/10 text-white' : 'border-line-strong text-fg hover:border-line-strong hover:bg-surface',
                )}
              >
                <input
                  type='radio'
                  name='hub-report-reason'
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className='size-4 accent-brand'
                />
                {t(`hub.report.reason.${value}`)}
              </label>
            ))}
          </fieldset>
          <div className='flex flex-col gap-1.5'>
            <label htmlFor={textId} className='text-sm font-medium text-fg'>
              {t('hub.report.text')} <span className='font-normal text-subtle'>({t('common.optional')})</span>
            </label>
            <textarea
              id={textId}
              value={text}
              maxLength={REPORT_TEXT_MAX}
              rows={3}
              onChange={(event) => setText(event.target.value)}
              className='input min-h-20 resize-y'
            />
          </div>
          {(error) ? <DialogError>{error}</DialogError> : null}
          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
            <button type='submit' className='btn btn-primary' disabled={!reason || pending}>
              {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {t('hub.report.send')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
