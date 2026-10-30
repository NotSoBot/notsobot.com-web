import { MessageSquareWarning } from 'lucide-react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { useAcknowledgeMeWarningsMutation, useMeWarningsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatExactDateTime } from '@/lib/utils';


// warnings NotSoBot staff gave them that they haven't seen yet (the bot shows them in place of their next command too).
// Dismissing it marks them seen everywhere, so the bot won't show them again either
export function StaffWarningsNotice({ className }: {className?: string}) {
  const { t, rich, plural } = useI18n();
  const query = useMeWarningsQuery();
  const mutation = useAcknowledgeMeWarningsMutation();
  const pending = (query.data?.items ?? []).filter((x) => !x.acknowledged);
  if (!pending.length) {
    return null;
  }

  return (
    <div role='alert' className={cn('flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-left text-sm text-fg', className)}>
      <MessageSquareWarning aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
      <div className='min-w-0 flex-1'>
        <p className='font-semibold text-white'>{plural('ui.staff_warning', pending.length)}</p>
        <ul className='mt-2 space-y-2'>
          {pending.map((warning) => (
            <li key={warning.id}>
              <p className={cn('rounded border-l-2 border-warning/60 pl-2 whitespace-pre-wrap break-words', !warning.reason && 'text-subtle italic')}>{warning.reason || t('warnings.no_reason')}</p>
              <p className='mt-0.5 pl-2.5 text-xs text-subtle' title={formatExactDateTime(warning.created)}>{formatDateTime(warning.created)}</p>
            </li>
          ))}
        </ul>
        <p className='mt-2 text-muted'>
          {rich('ui.staff_warning.description', {link: (chunk) => <Link to={Routes.SUPPORT_INVITE} className='text-code hover:underline'>{chunk}</Link>})}
        </p>
      </div>
      <button
        type='button'
        className='btn btn-secondary btn-sm shrink-0'
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(pending.map((x) => x.id))}
      >
        {t('ui.staff_warning.dismiss')}
      </button>
    </div>
  );
}
