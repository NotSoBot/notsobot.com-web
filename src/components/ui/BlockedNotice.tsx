import { Ban } from 'lucide-react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import type { UserMe } from '@/lib/api';
import { cn, formatDate, formatExactDateTime } from '@/lib/utils';


// shown to a user NotSoBot staff blocked; the site still works for them, but the bot ignores their commands
export function BlockedNotice({ className, user }: {className?: string, user: UserMe}) {
  const { t, rich } = useI18n();
  return (
    <div role='alert' className={cn('flex items-start gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-left text-sm text-fg', className)}>
      <Ban aria-hidden className='mt-0.5 size-5 shrink-0 text-danger'/>
      <div className='min-w-0 flex-1'>
        <p className='font-semibold text-white'>
          {t('ui.blocked.title')}
          {(user.blocked_on) ? (
            <span className='font-normal text-subtle' title={formatExactDateTime(user.blocked_on)}>{t('ui.blocked.since', {date: formatDate(user.blocked_on)})}</span>
          ) : null}
        </p>
        <p className='mt-1'>
          {rich('ui.blocked.description', {link: (chunk) => <Link to={Routes.SUPPORT_INVITE} className='text-code hover:underline'>{chunk}</Link>})}
        </p>
        {(user.blocked_reason) ? (
          <p className='mt-2 whitespace-pre-wrap break-words'>
            <span className='font-medium text-white'>{t('ui.blocked.reason')}</span> {user.blocked_reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}
