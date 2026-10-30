import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Turnstile } from '@/components/ui/Turnstile';
import { config } from '@/config';
import { translate, useI18n, type TranslationKey } from '@/i18n';
import { ApiErrorCodes, ApiRequestError, ReportTypes, type MeReport } from '@/lib/api';
import { errorMessage, useCreateReportMutation } from '@/lib/api/dashboardQueries';
import { Routes } from '@/routes';
import { CharCounter } from '@/pages/dashboard/ui';

import type { ReportSubject } from './ReportButton';


// the api's limit on a report's content, the tag reason line included
const CONTENT_MAX = 2000;

// a tag report's first line, so staff can sort them at a glance (the bot's `/tag report` is free text only). The
// English text is what's sent, whatever language the site is in, `label` is what's shown
const TAG_REASONS = [
  {value: 'Harmful or malicious', label: 'report.reason.harmful'},
  {value: 'Broken or doesn’t work', label: 'report.reason.broken'},
  {value: 'Spam or advertising', label: 'report.reason.spam'},
  {value: 'Stolen content', label: 'report.reason.stolen'},
  {value: 'NSFW without the NSFW label', label: 'report.reason.nsfw'},
  {value: 'Something else', label: 'report.reason.other'},
] as const satisfies ReadonlyArray<{value: string, label: TranslationKey}>;
type TagReason = (typeof TAG_REASONS)[number]['value'];

// the api's own message says which limit (hour or day) was hit, or why the captcha failed
function reportErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.body?.message) {
    if (error.code === ApiErrorCodes.MAX_REPORTS || error.code === ApiErrorCodes.CANNOT_REPORT_YOURSELF || error.code === ApiErrorCodes.CAPTCHA_INVALID) {
      return error.body.message;
    }
    if (error.code === ApiErrorCodes.SERVER_MISCONFIGURED) {
      return translate('report.anonymous_unavailable');
    }
  }
  return errorMessage(error, translate('report.send_error'));
}


// opened by ReportButton (ReportButton.tsx), fetched the first time someone opens it
export function ReportDialog({ subject, onClose }: {subject: ReportSubject, onClose: () => void}) {
  const { t, rich } = useI18n();
  const titleId = useId();
  const reasonId = useId();
  const detailsId = useId();

  const { isAuthenticated, login } = useAuth();
  const create = useCreateReportMutation();
  const [ reason, setReason ] = useState<TagReason | ''>('');
  const [ details, setDetails ] = useState('');
  const [ turnstileToken, setTurnstileToken ] = useState<string | null>(null);
  // tokens are one use, a failed send needs a fresh one
  const [ turnstileReset, setTurnstileReset ] = useState(0);
  // the report, or null for an anonymous one; undefined until it's sent
  const [ sent, setSent ] = useState<MeReport | null | undefined>(undefined);

  const anonymous = !isAuthenticated;
  const isTag = subject.type === 'tag';
  const trimmed = details.trim();
  const content = (isTag) ? [`Reason: ${reason}`, trimmed].filter(Boolean).join('\n\n') : trimmed;
  // "something else" and bugs need words, the other tag reasons say enough on their own
  const needsDetails = !isTag || reason === 'Something else';
  const valid = ((isTag) ? !!reason : true) && (!needsDetails || !!trimmed) && content.length <= CONTENT_MAX;
  const canSend = valid && (!anonymous || !!turnstileToken) && !create.isPending;

  const submit = () => {
    create.mutate({
      content,
      target_id: (subject.type === 'tag') ? subject.tag.id : undefined,
      type: (isTag) ? ReportTypes.TAG : ReportTypes.BUG,
      turnstileToken,
    }, {
      onSuccess: ({ report }) => setSent(report),
      onError: () => anonymous && setTurnstileReset((value) => value + 1),
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !create.isPending && onClose()} className='max-w-md'>
      {(sent !== undefined) ? (
        <div className='p-5 sm:p-6'>
          <h2 id={titleId} className='flex items-center gap-2 pr-10 text-lg font-semibold text-white'>
            <CheckCircle2 aria-hidden className='size-5 text-success-text'/>
            {t('report.sent')}
          </h2>
          {(sent) ? (
            <p className='mt-2 text-sm text-muted'>
              {rich('report.sent_account', {link: (chunk) => <Link to={Routes.DASHBOARD_REPORT.replace(':itemId', sent.id)} className='text-brand-text hover:underline'>{chunk}</Link>})}
            </p>
          ) : (
            <p className='mt-2 text-sm text-muted'>
              {t('report.sent_anonymous')}
            </p>
          )}
          <div className='mt-6 flex justify-end'>
            <button type='button' className='btn btn-primary' onClick={onClose}>{t('report.done')}</button>
          </div>
        </div>
      ) : (
        <form
          className='p-5 sm:p-6'
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) {
              submit();
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>
            {(subject.type === 'tag') ? t('report.tag_heading', {name: subject.tag.name}) : t('report.bug')}
          </h2>
          <p className='mt-2 text-sm text-muted'>
            {t((isTag) ? 'report.tag_description' : 'report.bug_description')}
          </p>

          {/* reports are for NotSoBot being abused, spamming them gets you blocked */}
          <p className='mt-4 flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
            <TriangleAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
            <span>{t('report.spam_warning')}</span>
          </p>

          {(anonymous) ? (
            <p className='mt-4 flex gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted'>
              <Info aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>
              <span>
                {t('report.anonymous')}{' '}
                {(config.authEnabled) ? (
                  <button type='button' className='cursor-pointer text-brand-text hover:underline' onClick={() => login()}>{t('common.log_in')}</button>
                ) : null}
                {(config.authEnabled) ? t('report.hear_back') : null}
              </span>
            </p>
          ) : null}

          <div className='mt-5 space-y-4'>
            {(isTag) ? (
              <div>
                <label htmlFor={reasonId} className='mb-1.5 block text-sm text-muted'>{t('report.reason')}</label>
                <select
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value as TagReason)}
                  disabled={create.isPending}
                  className='input'
                >
                  <option value='' disabled>{t('report.pick')}</option>
                  {TAG_REASONS.map((item) => <option key={item.value} value={item.value}>{t(item.label)}</option>)}
                </select>
              </div>
            ) : null}

            <div>
              <div className='mb-1.5 flex items-baseline justify-between gap-3'>
                <label htmlFor={detailsId} className='text-sm text-muted'>
                  {t((isTag) ? 'report.details' : 'report.what_happened')}
                  {(isTag && !needsDetails) ? <span className='text-subtle'>{t('report.optional')}</span> : null}
                </label>
                <span className='shrink-0 text-xs text-subtle tabular-nums'><CharCounter length={content.length} max={CONTENT_MAX}/></span>
              </div>
              <textarea
                id={detailsId}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                disabled={create.isPending}
                rows={(isTag) ? 4 : 6}
                placeholder={t((isTag) ? 'report.tag_placeholder' : 'report.bug_placeholder')}
                className='input resize-y'
                autoFocus={!isTag}
              />
            </div>

            {(anonymous && config.turnstileSiteKey) ? (
              <Turnstile siteKey={config.turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset}/>
            ) : null}
          </div>

          {(create.isError) ? (
            <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{reportErrorMessage(create.error)}</p>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={create.isPending}>{t('common.cancel')}</button>
            <button type='submit' className='btn btn-danger' disabled={!canSend}>
              {(create.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {t('report.send')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
