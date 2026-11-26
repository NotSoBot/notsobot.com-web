import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';


// open modals, innermost last: Escape only closes the top one, so a confirm dialog over a modal doesn't close both
const openModals: Array<symbol> = [];
// the page's own styles from before the first modal opened, put back once the last one closes. each modal saving and
// restoring its own breaks when they close together in another order (deleting from a confirm over a modal closes
// both, the outer one first): the inner one would put back the `hidden` it found and the page would stay unscrollable
let pageStyles: {overflow: string, position: string} | null = null;

// for keyboard shortcuts of a modal that shouldn't fire while another one is open over it
export function openModalCount(): number {
  return openModals.length;
}


// Centered dialog over the current page: Escape / backdrop click close it, focus moves in, stays in (Tab wraps around
// inside the top dialog) and is handed back to whatever opened it, and the page underneath doesn't scroll while it's open.
// Rendered at the end of `body`, so it's never inside a transformed ancestor and a modal opened from another one stacks
// over it (each one's dimming included).
// A field marked `data-autofocus` gets the focus on open, on devices with a keyboard (see below).
// `stickyClose` keeps the close button at the top of the window while scrolling on phones, for a modal whose header
// sticks there too (at `-top-12`, this window's top padding on phones).
export function Modal({ labelledBy, onClose, className, stickyClose = false, anchor = 'center', children }: {
  labelledBy: string,
  onClose: () => void,
  className?: string,
  stickyClose?: boolean,
  // `top`: held at the top of the window, for a dialog whose content grows and shrinks while it's open (a choice that
  // shows more fields): centred, every change would move the whole thing under the finger. It only grows downward
  anchor?: 'center' | 'top',
  children: ReactNode,
}) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const self = useRef(Symbol('modal')).current;
  // what had focus before the dialog rendered. read here and not in the effect: by then an autofocused field inside the
  // dialog has taken it, and closing would hand focus back to that removed field instead of the button that opened it
  const openerRef = useRef<HTMLElement | null | undefined>(undefined);
  if (openerRef.current === undefined) {
    openerRef.current = document.activeElement as HTMLElement | null;
  }
  useFocusTrap(dialogRef, () => openModals.at(-1) === self);

  useEffect(() => {
    // when this dialog replaces another in the same render, the element read above was inside the old one. by now the
    // old one has handed focus back to whatever opened it, which is the better place to return to
    const focusedNow = document.activeElement as HTMLElement | null;
    const fallback = (focusedNow && focusedNow !== document.body && !dialogRef.current?.contains(focusedNow)) ? focusedNow : null;
    const previouslyFocused = openerRef.current;
    // a dialog built around one field marks it `data-autofocus`: with a keyboard and mouse it gets the focus (its text
    // selected, for a rename), so typing works right away. on touch devices focus stays on the close button, focusing a
    // field there opens the on-screen keyboard over half the dialog
    const field = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    if (field && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      field.focus({preventScroll: true});
      if (field instanceof HTMLInputElement) {
        field.select();
      }
    } else {
      closeRef.current?.focus({preventScroll: true});
    }
    if (!openModals.length) {
      pageStyles = {overflow: document.body.style.overflow, position: document.documentElement.style.position};
      document.body.style.overflow = 'hidden';
      // so the dimming can cover the whole page, see below
      document.documentElement.style.position = 'relative';
    }
    openModals.push(self);
    const onKeyDown = (event: KeyboardEvent) => {
      // an Escape something inside already used (leaving the tag editor's code field, cancelling an inline edit)
      // calls preventDefault, and doesn't close the dialog too
      if (event.key === 'Escape' && !event.defaultPrevented && openModals.at(-1) === self) {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(self), 1);
      if (!openModals.length && pageStyles) {
        document.body.style.overflow = pageStyles.overflow;
        document.documentElement.style.position = pageStyles.position;
        pageStyles = null;
      }
      ((previouslyFocused?.isConnected) ? previouslyFocused : fallback)?.focus?.({preventScroll: true});
    };
  }, [self]);

  return createPortal(
    <>
      {/* The dimming is part of the page (absolute over the whole document) rather than fixed to the window: iOS
          Safari's floating toolbar sits below where the window's `bottom: 0` ends, the page shows through there, and
          it clips fixed elements to the window, however far past the bottom they run */}
      <div aria-hidden className='absolute inset-0 z-50 min-h-lvh animate-fade-in bg-black/70'/>
      {/* `my-auto` instead of `items-center`: centered when it fits, and when it's taller than the window it starts
          below the top padding instead of being cut off above it */}
      <div className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 pt-12 pb-6 sm:px-6 sm:pt-20 sm:pb-10'>
        {/* the blur only needs to cover what's in the window, a blur the size of the whole page is slow */}
        <div aria-hidden className='fixed inset-0 animate-fade-in backdrop-blur-sm' onClick={onClose}/>
        <div
          ref={dialogRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby={labelledBy}
          className={cn(
            'relative w-full max-w-4xl animate-modal-in rounded-xl border border-line-strong bg-bg shadow-2xl shadow-black/60',
            (anchor === 'center') && 'my-auto',
            className,
          )}
        >
          {/* a zero-height wrapper, so when it sticks it carries the button along without taking up any room */}
          <div className={cn(stickyClose && 'max-sm:sticky max-sm:-top-12 max-sm:z-20 max-sm:h-0')}>
            <button
              ref={closeRef}
              type='button'
              aria-label={t('ui.close')}
              onClick={onClose}
              className={cn(
                'absolute top-3 right-3 z-10 cursor-pointer rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-white',
                // stuck over scrolled content on phones (a modal whose header doesn't stick with it), it needs its own backing
                stickyClose && 'max-sm:bg-bg/90 max-sm:backdrop-blur',
              )}
            >
              <X className='size-5'/>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
