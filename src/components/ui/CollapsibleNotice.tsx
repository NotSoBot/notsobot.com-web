import { ChevronDown, CircleCheck, TriangleAlert, X } from 'lucide-react';
import { useSyncExternalStore, type ReactNode } from 'react';

import { usePersistentState } from '@/hooks/usePersistentState';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';


const TONES = {
  success: {box: 'border-success/40 bg-success/10', icon: CircleCheck, iconColor: 'text-success-text'},
  warning: {box: 'border-warning/40 bg-warning/10', icon: TriangleAlert, iconColor: 'text-warning'},
};

const subscribeToNothing = () => () => undefined;

// Whether this browser dismissed a notice, `key` being where that's remembered. The worker can't know, so it always
// renders the notice: a hydrating render does the same to match its html, and the stored answer applies right after.
export function useNoticeDismissed(key: string) {
  const [ dismissed, setDismissed ] = usePersistentState(key, false);
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  return [ dismissed && hydrated, setDismissed ] as const;
}


// banner that only shows its title until clicked. with `onDismiss` it has an X to close it for good
export function CollapsibleNotice({ children, className, defaultOpen, onDismiss, title, tone = 'warning' }: {
  children: ReactNode,
  className?: string,
  defaultOpen?: boolean,
  onDismiss?: () => void,
  title: ReactNode,
  tone?: keyof typeof TONES,
}) {
  const { t } = useI18n();
  const { box, icon: Icon, iconColor } = TONES[tone];
  // the role is on a box around the <details>: on the <details> itself it would replace its own role, and a screen
  // reader would no longer say it can be opened
  return (
    <div role={(tone === 'warning') ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm text-fg', box, className)}>
      <details className='group min-w-0 flex-1' open={defaultOpen}>
        <summary className='flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden'>
          <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', iconColor)}/>
          <span className='min-w-0 flex-1 font-semibold text-white'>{title}</span>
          <ChevronDown aria-hidden className='mt-0.5 size-4 shrink-0 text-fg transition-transform group-open:rotate-180'/>
        </summary>
        <div className='mt-1 pl-8'>
          {children}
        </div>
      </details>
      {(onDismiss) ? (
        // outside the <details>, a button inside its summary would also open and close it
        <button type='button' aria-label={t('ui.dismiss')} onClick={onDismiss} className='-my-0.5 -mr-1 shrink-0 cursor-pointer rounded p-1 text-fg transition-colors hover:text-white'>
          <X aria-hidden className='size-4'/>
        </button>
      ) : null}
    </div>
  );
}
