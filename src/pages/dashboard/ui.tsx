import { CircleAlert, Lock, RefreshCw } from 'lucide-react';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useBlocker } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToastClearance } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

// the form pieces public pages use too live in src/components/ui/form, re-exported here for the dashboard's pages
export { CharCounter, Field, HelpDisclosure, InlineError, Toggle } from '@/components/ui/form';


// Section heading inside a dashboard page.
export function DashboardHeader({ title, description, children }: {title: ReactNode, description?: ReactNode, children?: ReactNode}) {
  return (
    <header className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
      <div className='min-w-0'>
        <h1 className='text-2xl font-semibold break-words text-white sm:text-3xl'>{title}</h1>
        {(description) ? <div className='mt-1.5 text-muted'>{description}</div> : null}
      </div>
      {(children) ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{children}</div> : null}
    </header>
  );
}


// A titled card. `accent` is a CSS color for the little bar next to the title (matches the commands page).
// `readOnly` (the reason) marks the whole card as view only: dashed border, a badge, the reason up top and the
// contents dimmed, so it's obvious at a glance which sections can't be changed. `help` goes right under the description,
// for a `HelpDisclosure` with the rest of a long one (the description itself is a paragraph, it can't hold one).
export function Panel({ title, description, help, accent, actions, className, children, headingLevel = 2, readOnly }: {
  title: ReactNode,
  description?: ReactNode,
  help?: ReactNode,
  accent?: string,
  actions?: ReactNode,
  className?: string,
  children: ReactNode,
  headingLevel?: 2 | 3,
  readOnly?: ReactNode,
}) {
  const { t } = useI18n();
  const Heading = (headingLevel === 2) ? 'h2' : 'h3';
  return (
    <section
      aria-readonly={(readOnly) ? true : undefined}
      className={cn('card p-4 sm:p-5', readOnly && 'border-dashed border-line-strong bg-surface/60', className)}
    >
      <div className='mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2'>
        <div className='min-w-0'>
          <Heading className='flex items-center gap-2 text-lg font-semibold text-white'>
            {(accent) ? <span aria-hidden className='h-4 w-1 shrink-0 rounded-full' style={{background: accent}}/> : null}
            {title}
            {(readOnly) ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-text'>
                <Lock aria-hidden className='size-3'/>
                {t('dash.view_only')}
              </span>
            ) : null}
          </Heading>
          {(description) ? <p className='mt-1 text-sm text-muted'>{description}</p> : null}
          {(help) ? <div className='mt-1'>{help}</div> : null}
        </div>
        {(actions) ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div> : null}
      </div>
      {(readOnly) ? <ReadOnlyNote>{readOnly}</ReadOnlyNote> : null}
      {(readOnly) ? <div className='opacity-70'>{children}</div> : children}
    </section>
  );
}


export function ReadOnlyNote({ children }: {children: ReactNode}) {
  return (
    <p className='mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
      <Lock aria-hidden className='mt-0.5 size-4 shrink-0 text-warning-text'/>
      <span>{children}</span>
    </p>
  );
}


export function ErrorPanel({ title, message, onRetry, retrying = false }: {
  title?: ReactNode,
  message?: ReactNode,
  onRetry?: () => void,
  retrying?: boolean,
}) {
  const { t } = useI18n();
  return (
    <div role='alert' className='card flex flex-col items-center gap-3 p-8 text-center sm:p-10'>
      <CircleAlert aria-hidden className='size-8 text-danger-text'/>
      <div>
        <p className='font-medium text-white'>{title ?? t('dash.load_error')}</p>
        {(message) ? <p className='mt-1 text-sm text-muted'>{message}</p> : null}
      </div>
      {(onRetry) ? (
        <button type='button' className='btn btn-secondary' onClick={onRetry} disabled={retrying}>
          {(retrying) ? <Spinner className='size-4'/> : <RefreshCw className='size-4'/>}
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}


export function Skeleton({ className }: {className?: string}) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-surface-3', className)}/>;
}


export function PanelSkeleton({ rows = 3 }: {rows?: number}) {
  return (
    <div aria-hidden className='card p-5'>
      <Skeleton className='h-5 w-40'/>
      <Skeleton className='mt-2 h-3 w-64 max-w-full bg-surface-2'/>
      <div className='mt-5 space-y-3'>
        {Array.from({length: rows}, (_, i) => <Skeleton key={i} className='h-9 w-full bg-surface-2'/>)}
      </div>
    </div>
  );
}


// Save/discard row shown under a form; `dirty` drives the "Unsaved changes" hint.
export function SaveBar({ dirty, pending, onDiscard, saveLabel, disabled = false, status, standalone = false, sticky = false }: {
  dirty: boolean,
  pending: boolean,
  onDiscard?: () => void,
  saveLabel?: string,
  disabled?: boolean,
  status?: ReactNode,
  // its own card instead of a divider at the bottom of one
  standalone?: boolean,
  // while there are unsaved edits it stays at the bottom of the window (as far as the form it's in reaches), for a long
  // form whose end is usually off screen. Toasts sit above it meanwhile
  sticky?: boolean,
}) {
  const { t } = useI18n();
  const bar = useRef<HTMLDivElement>(null);
  const stuck = sticky && dirty;
  // readable form state for tests/agents; `invalid` = edits that can't be saved yet
  const state = (pending) ? 'saving' : (!dirty) ? 'clean' : (disabled) ? 'invalid' : 'dirty';
  return (
    <>
      <div
        ref={bar}
        data-state={state}
        className={cn(
          'flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between',
          // above the home indicator in the Discord Activity on phones (--saib is 0 on the site)
          (standalone) ? cn('card p-4', dirty && 'sticky bottom-[calc(0.75rem+var(--saib,0px))] z-10 shadow-xl shadow-black/40')
            : (stuck) ? 'sticky bottom-[calc(0.75rem+var(--saib,0px))] z-10 mt-5 rounded-lg border border-line-strong bg-surface p-3 shadow-xl shadow-black/40'
              : 'mt-5 border-t border-line pt-4',
        )}
      >
        <div aria-live='polite' className='min-h-5 text-sm'>
          {(status) ? status : (dirty) ? <span className='text-warning-text'>{t('dash.unsaved')}</span> : null}
        </div>
        <div className='flex flex-wrap gap-2 sm:justify-end'>
          {(onDiscard) ? (
            <button type='button' className='btn btn-ghost' onClick={onDiscard} disabled={!dirty || pending}>{t('common.discard')}</button>
          ) : null}
          <button type='submit' className='btn btn-primary' disabled={!dirty || pending || disabled}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(pending) ? t('common.saving') : (saveLabel ?? t('common.save_changes'))}
          </button>
        </div>
      </div>
      {/* after the bar, so its element is there by the time this looks for it */}
      {(stuck) ? <ToastClearance target={bar}/> : null}
    </>
  );
}


// the toasts' corner is where a stuck save bar's buttons are
function ToastClearance({ target }: {target: RefObject<HTMLElement | null>}) {
  useToastClearance(target);
  return null;
}


// Warns before leaving with unsaved edits: in-app navigation gets a dialog, closing the tab the
// browser's own prompt. Navigations that pass `state: {skipUnsavedGuard: true}` (e.g. after a delete) go through.
export function UnsavedChangesGuard({ when }: {when: boolean}) {
  const { t } = useI18n();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const skip = (nextLocation.state as {skipUnsavedGuard?: boolean} | null)?.skipUnsavedGuard;
    return when && !skip && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (!when) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  // the edits were saved (or dropped) while the dialog was up, e.g. Save then a link before the save finished: nothing is
  // left to lose, so the navigation they started goes through instead of asking to discard what's already saved
  const stale = blocker.state === 'blocked' && !when;
  useEffect(() => {
    if (blocker.state === 'blocked' && !when) {
      blocker.proceed();
    }
  }, [blocker, when]);

  if (blocker.state !== 'blocked' || stale) {
    return null;
  }
  return (
    <ConfirmDialog
      title={t('dash.discard_title')}
      description={t('dash.discard_description')}
      confirmLabel={t('dash.discard_leave')}
      onConfirm={() => blocker.proceed()}
      onClose={() => blocker.reset()}
    />
  );
}


export function EmptyState({ icon, title, children }: {icon?: ReactNode, title: ReactNode, children?: ReactNode}) {
  return (
    <div className='rounded-lg border border-dashed border-line-strong p-8 text-center'>
      {(icon) ? <div className='mx-auto mb-3 flex justify-center text-subtle'>{icon}</div> : null}
      <p className='font-medium text-white'>{title}</p>
      {(children) ? <div className='mt-1 text-sm text-muted'>{children}</div> : null}
    </div>
  );
}
