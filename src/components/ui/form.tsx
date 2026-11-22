import { ChevronRight, CircleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { useI18n } from '@/i18n';
import { cn, formatNumber } from '@/lib/utils';

import { Spinner } from './Spinner';


// Label + control + hint/error, wired up with ids for screen readers.
export function Field({ label, hint, error, counter, children, className }: {
  label: ReactNode,
  hint?: ReactNode,
  error?: ReactNode,
  counter?: ReactNode,
  children: (props: {id: string, 'aria-describedby'?: string, 'aria-invalid'?: boolean}) => ReactNode,
  className?: string,
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = (hint || error) ? hintId : undefined;
  return (
    <div className={cn('min-w-0', className)}>
      <div className='mb-1.5 flex items-baseline justify-between gap-3'>
        <label htmlFor={id} className='text-sm font-medium text-fg'>{label}</label>
        {(counter) ? <span className='shrink-0 text-xs text-subtle tabular-nums'>{counter}</span> : null}
      </div>
      {children({id, 'aria-describedby': describedBy, 'aria-invalid': (error) ? true : undefined})}
      {(error) ? (
        <p id={hintId} className='mt-1.5 text-xs text-danger-text'>{error}</p>
      ) : (hint) ? (
        <p id={hintId} className='mt-1.5 text-xs text-subtle'>{hint}</p>
      ) : null}
    </div>
  );
}


export function CharCounter({ length, max }: {length: number, max: number}) {
  return (
    <span className={cn(max < length ? 'text-danger-text' : (max * 0.9 < length) ? 'text-warning' : undefined)}>
      {formatNumber(length)} / {formatNumber(max)}
    </span>
  );
}


export function Toggle({ checked, onChange, label, description, disabled = false, busy = false }: {
  checked: boolean,
  onChange: (value: boolean) => void,
  label: ReactNode,
  description?: ReactNode,
  disabled?: boolean,
  // a spinner next to the switch while its change is being saved
  busy?: boolean,
}) {
  const id = useId();
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='min-w-0'>
        <label htmlFor={id} className={cn('text-sm font-medium text-fg', !disabled && 'cursor-pointer')}>{label}</label>
        {(description) ? <p className='mt-0.5 text-xs text-subtle'>{description}</p> : null}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {(busy) ? <Spinner className='size-3.5'/> : null}
        <button
          id={id}
          type='button'
          role='switch'
          aria-checked={checked}
          aria-busy={(busy) ? true : undefined}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            checked ? 'bg-success' : 'bg-[#72767d]',
          )}
        >
          <span className={cn('inline-block size-[1.125rem] rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[1.375rem]' : 'translate-x-[0.1875rem]')}/>
        </button>
      </div>
    </div>
  );
}


// `onRetry` adds a Try again button, for something that failed to load
export function InlineError({ children, onRetry, retrying = false }: {children: ReactNode, onRetry?: () => void, retrying?: boolean}) {
  const { t } = useI18n();
  return (
    <p role='alert' className={cn('mt-2 flex gap-1.5 text-sm text-danger-text', (onRetry) ? 'flex-wrap items-center' : 'items-start')}>
      <CircleAlert aria-hidden className={cn('size-4 shrink-0', !onRetry && 'mt-0.5')}/>
      <span className='min-w-0 break-words'>{children}</span>
      {(onRetry) ? (
        <button type='button' className='btn btn-secondary btn-sm ml-1.5 shrink-0' disabled={retrying} onClick={onRetry}>{t('common.try_again')}</button>
      ) : null}
    </p>
  );
}


// Help that's too long to always show: only `summary` ("How it works", "Search tips") until it's opened. Not for inside a
// paragraph (a description or a hint), it goes under one.
export function HelpDisclosure({ summary, children, className }: {summary: ReactNode, children: ReactNode, className?: string}) {
  return (
    <details className={cn('group/help text-xs text-subtle', className)}>
      <summary className='inline-flex cursor-pointer list-none items-center gap-0.5 rounded text-code hover:underline [&::-webkit-details-marker]:hidden'>
        <ChevronRight aria-hidden className='size-3.5 shrink-0 transition-transform group-open/help:rotate-90'/>
        {summary}
      </summary>
      <div className='mt-1 space-y-1'>{children}</div>
    </details>
  );
}
