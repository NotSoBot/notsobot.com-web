import { ArrowRight, MessageSquareWarning } from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { useReportsUnreadQuery } from '@/lib/api/queries';
import { cn } from '@/lib/utils';


// On the homepage while a logged in user has reports with something from staff they haven't opened (a reply or a status
// change), linking to their reports. Nothing otherwise.
export function ReportUpdatesNotice({ className }: {className?: string}) {
  const { token } = useAuth();
  const { t, plural } = useI18n();
  const count = useReportsUnreadQuery(token).data?.count ?? 0;
  if (!count) {
    return null;
  }

  return (
    <Link
      to={Routes.DASHBOARD_REPORTS}
      className={cn('group flex items-center gap-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-left transition-colors hover:border-brand/70 hover:bg-brand/15', className)}
    >
      <span className='relative flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/20'>
        <MessageSquareWarning aria-hidden className='size-4 text-brand-text'/>
        <span aria-hidden className='absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-bg bg-brand'/>
      </span>
      <span className='min-w-0 flex-1 text-sm'>
        <span className='font-medium text-white'>
          {plural('ui.report_updates', count)}
        </span>
        <span className='text-muted'>{t('ui.report_updates_from')}</span>
      </span>
      <span className='flex shrink-0 items-center gap-1 text-sm font-medium text-brand-text'>
        {t('common.view')}
        <ArrowRight aria-hidden className='size-4 transition-transform group-hover:translate-x-0.5'/>
      </span>
    </Link>
  );
}
