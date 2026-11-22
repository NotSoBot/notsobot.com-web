import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn, formatNumber } from '@/lib/utils';


// With everything on one page it's only the count line ("1–7 of 7"): no "Page 1 of 1" between two buttons that can't
// do anything. Decided here so every list gets the same, whether or not its page shows this for a short list
export function Pagination({ page, count, pageSize, onChange, fetching = false, className }: {
  page: number,
  count: number,
  pageSize: number,
  onChange: (page: number) => void,
  fetching?: boolean,
  className?: string,
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const start = (count) ? page * pageSize + 1 : 0;
  const end = Math.min(count, (page + 1) * pageSize);
  const range = t('pagination.range', {start: formatNumber(start), end: formatNumber(end), count: formatNumber(count)});
  // a page past the only one (a stale `?page=`) keeps the controls, Previous is the way back
  if (pages <= 1 && page <= 0) {
    return <p className={cn('mt-4 text-sm text-subtle tabular-nums', className)}>{range}</p>;
  }
  return (
    <nav aria-label={t('pagination.label')} className={cn('mt-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <p className='text-sm text-subtle tabular-nums'>{range}</p>
      <div className='flex items-center gap-2'>
        <button type='button' className='btn btn-secondary btn-sm' disabled={page <= 0 || fetching} onClick={() => onChange(page - 1)}>
          <ChevronLeft aria-hidden className='size-4'/>
          {t('common.previous')}
        </button>
        <span className='text-sm text-muted tabular-nums'>{t('pagination.page', {page: formatNumber(page + 1), pages: formatNumber(pages)})}</span>
        <button type='button' className='btn btn-secondary btn-sm' disabled={pages <= page + 1 || fetching} onClick={() => onChange(page + 1)}>
          {t('common.next')}
          <ChevronRight aria-hidden className='size-4'/>
        </button>
      </div>
    </nav>
  );
}
