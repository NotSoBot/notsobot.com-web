import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';


export type ToastTone = 'success' | 'error';

// a button on the toast, e.g. undo; clicking it also dismisses the toast
export interface ToastAction {
  label: string,
  onClick: () => void,
}

interface ToastItem {
  id: number,
  tone: ToastTone,
  message: string,
  action?: ToastAction,
}

type ShowToast = (message: string, tone?: ToastTone, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast | null>(null);
// sets how far up the toasts sit for one bar (null once it's gone), see `useToastClearance`
const ToastLiftContext = createContext<((owner: symbol, height: number | null) => void) | null>(null);


export function useToast(): ShowToast {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return value;
}


// Keeps the toasts above `ref`'s element while it's mounted, for a bar along the bottom of the window they'd otherwise
// cover (e.g. a modal's sticky footer, whose Next button sits right under them)
export function useToastClearance(ref: RefObject<HTMLElement | null>): void {
  const setLift = useContext(ToastLiftContext);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !setLift) {
      return;
    }
    // several bars can ask at once (two stuck save bars, a modal's footer over one): each has its own entry, so one
    // leaving doesn't drop the toasts onto the others
    const owner = Symbol('toast-clearance');
    const observer = new ResizeObserver(() => setLift(owner, element.offsetHeight));
    observer.observe(element);
    return () => {
      observer.disconnect();
      setLift(owner, null);
    };
  }, [ref, setLift]);
}


// Small stack of transient messages in the bottom corner. Announced politely to screen readers
// (errors assertively); each one dismisses itself after a few seconds (longer with an action, so there's time to
// reach it) or on click. The countdown waits while the pointer is on a toast or something in it has focus.
export function ToastProvider({ children }: {children: ReactNode}) {
  const [ toasts, setToasts ] = useState<Array<ToastItem>>([]);
  const [ lift, setLiftHeight ] = useState(0);
  const lifts = useRef(new Map<symbol, number>());
  const nextId = useRef(1);

  // the tallest bar wins
  const setLift = useCallback((owner: symbol, height: number | null) => {
    if (height === null) {
      lifts.current.delete(owner);
    } else {
      lifts.current.set(owner, height);
    }
    setLiftHeight(Math.max(0, ...lifts.current.values()));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback<ShowToast>((message, tone = 'success', action) => {
    const id = nextId.current++;
    setToasts((items) => [...items.slice(-3), {id, tone, message, action}]);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      <ToastLiftContext.Provider value={setLift}>
        {children}
      </ToastLiftContext.Provider>
      <div
        data-toast-region
        // the bottom padding clears the home indicator in the Discord Activity on phones (--saib is 0 on the site)
        className='pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+var(--saib,0px))] sm:items-end'
        style={(lift) ? {bottom: lift} : undefined}
      >
        {toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={dismiss}/>)}
      </div>
    </ToastContext.Provider>
  );
}


function Toast({ toast, onDismiss }: {toast: ToastItem, onDismiss: (id: number) => void}) {
  const { t } = useI18n();
  // an Undo shouldn't vanish as the pointer gets to it, or while it's the focused button. the countdown starts over
  // once both are gone
  const [ hovered, setHovered ] = useState(false);
  const [ focused, setFocused ] = useState(false);
  const paused = hovered || focused;
  useEffect(() => {
    if (paused) {
      return;
    }
    const timer = window.setTimeout(() => onDismiss(toast.id), (toast.tone === 'error' || toast.action) ? 7000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss, paused]);

  const Icon = (toast.tone === 'error') ? CircleAlert : CheckCircle2;
  return (
    <div
      role={(toast.tone === 'error') ? 'alert' : 'status'}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm shadow-2xl shadow-black/50',
        (toast.tone === 'error') ? 'border-danger/60' : 'border-success/60',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', (toast.tone === 'error') ? 'text-danger-text' : 'text-success-text')}/>
      <span className='min-w-0 flex-1 break-words text-fg'>{toast.message}</span>
      {(toast.action) ? (
        <button
          type='button'
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className='-my-1 shrink-0 cursor-pointer rounded px-1.5 py-1 font-semibold text-brand-text hover:bg-surface-3 hover:text-fg'
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type='button'
        aria-label={t('ui.dismiss')}
        onClick={() => onDismiss(toast.id)}
        className='-m-1 cursor-pointer rounded p-1 text-subtle hover:text-fg'
      >
        <X className='size-4'/>
      </button>
    </div>
  );
}
