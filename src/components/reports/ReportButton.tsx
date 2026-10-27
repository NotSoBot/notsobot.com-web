import { Bug, Flag } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/auth';
import { config } from '@/config';
import { useI18n } from '@/i18n';
import type { Tag } from '@/lib/api';


export type ReportSubject = {type: 'bug'} | {type: 'tag', tag: Pick<Tag, 'id' | 'name'>};

// the dialog brings the report mutation (and with it the dashboard's queries), so it's only fetched once opened. the
// footer shows this button on every page
const ReportDialog = lazy(async () => ({default: (await import('./ReportDialog')).ReportDialog}));


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
  const { t } = useI18n();
  const mode = useReportMode();
  const [ open, setOpen ] = useState(false);

  if (!mode) {
    return null;
  }
  const label = t((subject.type === 'tag') ? 'report.tag' : 'report.bug');
  return (
    <>
      <button
        type='button'
        onClick={() => (mode === 'login') ? login() : setOpen(true)}
        title={t((mode === 'login') ? ((subject.type === 'tag') ? 'report.login_tag' : 'report.login_bug') : (subject.type === 'tag') ? 'report.tag_title' : 'report.bug_title')}
        className={className}
      >
        {children ?? (
          <>
            {(subject.type === 'tag') ? <Flag aria-hidden className='size-4'/> : <Bug aria-hidden className='size-4'/>}
            {label}
          </>
        )}
      </button>
      {(open) ? createPortal(
        <Suspense fallback={null}>
          <ReportDialog subject={subject} onClose={() => setOpen(false)}/>
        </Suspense>,
        document.body,
      ) : null}
    </>
  );
}
