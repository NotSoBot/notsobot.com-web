import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

import { useI18n } from '@/i18n';


// Shows and hides a page's filter panel (`controls` is the panel's id), next to its search box. `active` is how many of
// the panel's filters aren't on their default, so they're noticed while it's closed.
export function FiltersButton({ open, onToggle, active, controls }: {open: boolean, onToggle: () => void, active: number, controls: string}) {
  const { t } = useI18n();
  return (
    <button
      type='button'
      className='btn btn-secondary h-12 shrink-0 px-3 sm:px-4'
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      <SlidersHorizontal aria-hidden className='size-4'/>
      <span className='max-sm:sr-only'>{t('common.filters')}</span>
      {(active) ? (
        <span className='rounded-full bg-brand px-1.5 text-xs leading-5 text-white' aria-label={t('ui.filters_active', {count: active})}>{active}</span>
      ) : null}
      {(open) ? <ChevronUp aria-hidden className='size-4'/> : <ChevronDown aria-hidden className='size-4'/>}
    </button>
  );
}
