import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';


export function Spinner({ className, label }: {className?: string, label?: string}) {
  const { t } = useI18n();
  return (
    <span role='status' aria-label={label ?? t('ui.loading')} className={cn('inline-block size-6 animate-spin rounded-full border-2 border-line-strong border-t-brand', className)}/>
  );
}
