import { Bug, CheckCircle2, Flag, Info } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Turnstile } from '@/components/ui/Turnstile';
import { config } from '@/config';
import { ApiErrorCodes, ApiRequestError, ReportTypes, type MeReport, type Tag } from '@/lib/api';
import { errorMessage, useCreateReportMutation } from '@/lib/api/dashboardQueries';
import { Routes } from '@/routes';
import { CharCounter } from '@/pages/dashboard/ui';


// the api's limit on a report's content, the tag reason line included
const CONTENT_MAX = 2000;

// a tag report's first line, so staff can sort them at a glance (the bot's `/tag report` is free text only)
const TAG_REASONS = [
  'Harmful or malicious',
  'Broken or doesn’t work',
  'Spam or advertising',
  'Stolen content',
  'NSFW without the NSFW label',
  'Something else',
] as const;
type TagReason = (typeof TAG_REASONS)[number];

export type ReportSubject = {type: 'bug'} | {type: 'tag', tag: Pick<Tag, 'id' | 'name'>};


// the api's own message says which limit (hour or day) was hit, or why the captcha failed
function reportErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.body?.message) {
    if (error.code === ApiErrorCodes.MAX_REPORTS || error.code === ApiErrorCodes.CANNOT_REPORT_YOURSELF || error.code === ApiErrorCodes.CAPTCHA_INVALID) {
      return error.body.message;
    }
    if (error.code === ApiErrorCodes.SERVER_MISCONFIGURED) {
      return 'Reporting without logging in isn’t available right now. Log in to send it.';
    }
  }
  return errorMessage(error, 'Couldn’t send the report.');
}


// Who can report from here: logged in it's one of their reports (staff can reply), logged out it's anonymous behind
// the captcha when the site has one, otherwise they log in first. Null when there's no way to report at all.
function useReportMode(): 'account' | 'anonymous' | 'login' | null {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return 'account';
  }
  if (config.turnstileSiteKey) {
    return 'anonymous';
  }
  return (config.authEnabled) ? 'login' : null;
}


// A button that opens the report dialog (or logs in first when anonymous reports aren't set up). `children` is the
// button's content, the icon and label by default
export function ReportButton({ subject, className, children }: {subject: ReportSubject, className?: string, children?: ReactNode}) {
  const { login } = useAuth();
  const mode = useReportMode();
  const [ open, setOpen ] = useState(false);

  if (!mode) {
    return null;
  }
  const label = (subject.type === 'tag') ? 'Report tag' : 'Report a bug';
  return (
    <>
      <button
        type='button'
        onClick={() => (mode === 'login') ? login() : setOpen(true)}
        title={(mode === 'login') ? `Log in to ${label.toLowerCase()}` : (subject.type === 'tag') ? 'Report this tag to NotSoBot staff' : 'Tell NotSoBot staff about a bug'}
        className={className}
      >
        {children ?? (
          <>
            {(subject.type === 'tag') ? <Flag aria-hidden className='size-4'/> : <Bug aria-hidden className='size-4'/>}
            {label}
          </>
        )}
      </button>
      {(open) ? createPortal(<ReportDialog subject={subject} onClose={() => setOpen(false)}/>, document.body) : null}
    </>
  );
}


function ReportDialog({ subject, onClose }: {subject: ReportSubject, onClose: () => void}) {
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
            <CheckCircle2 aria-hidden className='size-5 text-success'/>
            Report sent
          </h2>
          {(sent) ? (
            <p className='mt-2 text-sm text-muted'>
              Thanks, NotSoBot staff will take a look. You’ll get a DM from NotSoBot when they reply or close it, and you can
              follow it in{' '}
              <Link to={Routes.DASHBOARD_REPORT.replace(':itemId', sent.id)} className='text-brand hover:underline'>your reports</Link>.
            </p>
          ) : (
            <p className='mt-2 text-sm text-muted'>
              Thanks, NotSoBot staff will take a look. It was sent anonymously, so they can’t reply to it.
            </p>
          )}
          <div className='mt-6 flex justify-end'>
            <button type='button' className='btn btn-primary' onClick={onClose}>Done</button>
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
            {(subject.type === 'tag') ? `Report “${subject.tag.name}”` : 'Report a bug'}
          </h2>
          <p className='mt-2 text-sm text-muted'>
            {(isTag) ?
              'Sends the tag to NotSoBot staff to review.' :
              'Tell NotSoBot staff about something that’s broken, on the bot or the website.'}
          </p>

          {(anonymous) ? (
            <p className='mt-4 flex gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted'>
              <Info aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>
              <span>
                You’re not logged in, so this is sent anonymously and staff can’t reply to it.{' '}
                {(config.authEnabled) ? (
                  <button type='button' className='cursor-pointer text-brand hover:underline' onClick={() => login()}>Log in</button>
                ) : null}
                {(config.authEnabled) ? ' to hear back.' : null}
              </span>
            </p>
          ) : null}

          <div className='mt-5 space-y-4'>
            {(isTag) ? (
              <div>
                <label htmlFor={reasonId} className='mb-1.5 block text-sm text-muted'>Reason</label>
                <select
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value as TagReason)}
                  disabled={create.isPending}
                  className='input'
                >
                  <option value='' disabled>Pick one…</option>
                  {TAG_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            ) : null}

            <div>
              <div className='mb-1.5 flex items-baseline justify-between gap-3'>
                <label htmlFor={detailsId} className='text-sm text-muted'>
                  {(isTag) ? 'Details' : 'What happened?'}
                  {(isTag && !needsDetails) ? <span className='text-subtle'> (optional)</span> : null}
                </label>
                <span className='shrink-0 text-xs text-subtle tabular-nums'><CharCounter length={content.length} max={CONTENT_MAX}/></span>
              </div>
              <textarea
                id={detailsId}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                disabled={create.isPending}
                rows={(isTag) ? 4 : 6}
                placeholder={(isTag) ?
                  'Anything that helps staff check it, like what it does or where it was copied from.' :
                  'Which command or page, what you expected to happen, and what happened instead (the error, if there was one).'}
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
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={create.isPending}>Cancel</button>
            <button type='submit' className='btn btn-danger' disabled={!canSend}>
              {(create.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              Send report
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
