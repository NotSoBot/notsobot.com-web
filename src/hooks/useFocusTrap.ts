import { useEffect, useRef, type RefObject } from 'react';


const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');


// the toast stack (`ToastProvider`), which sits outside every dialog
const TOAST_REGION = '[data-toast-region]';


// what Tab really stops on: not a roving-tabindex option that's out of the order, a control a disabled fieldset turns
// off, or something hidden (collapsed panels and `hidden sm:block` have no boxes, `invisible` keeps them)
function isTabStop(item: HTMLElement): boolean {
  return item.tabIndex >= 0 && !item.matches(':disabled') && item.getClientRects().length > 0
    && getComputedStyle(item).visibility !== 'hidden';
}


// Keeps Tab and Shift+Tab inside `ref`'s element while it's mounted (a dialog or drawer over the page), so the keyboard
// can't reach the dimmed page behind it: they wrap around at its ends, and come back in when focus has left it (a click
// on the dimming). `isActive` is asked on every Tab, for stacked dialogs where only the top one may hold focus.
// Toasts shown meanwhile join the end of the cycle, or an Undo for something done in the dialog could only be clicked.
// A Tab something inside already handled (the tag editor indents with it) is left alone
export function useFocusTrap(ref: RefObject<HTMLElement | null>, isActive?: () => boolean): void {
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = ref.current;
      if (event.key !== 'Tab' || event.defaultPrevented || !element || isActiveRef.current?.() === false) {
        return;
      }
      const toasts = document.querySelector<HTMLElement>(TOAST_REGION);
      const focusable = [
        ...Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)),
        ...Array.from(toasts?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
      ].filter(isTabStop);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const index = (active) ? focusable.indexOf(active) : -1;
      const step = (event.shiftKey) ? -1 : 1;
      const outside = !element.contains(active) && !toasts?.contains(active);
      // from outside, Tab comes in at the start and Shift+Tab at the end
      if (outside) {
        event.preventDefault();
        focusable[(event.shiftKey) ? focusable.length - 1 : 0].focus();
        return;
      }
      // focus on something inside that isn't a stop itself (a clicked roving-tabindex option): the browser knows what's next
      if (index === -1) {
        return;
      }
      // inside one region the browser's own order is right. this only steps in where it would leave: past either end,
      // and between the dialog and the toasts, which aren't next to each other in the page
      const next = focusable[(index + step + focusable.length) % focusable.length];
      const wraps = index + step < 0 || index + step >= focusable.length;
      if (wraps || element.contains(active) !== element.contains(next)) {
        event.preventDefault();
        next.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ref]);
}
