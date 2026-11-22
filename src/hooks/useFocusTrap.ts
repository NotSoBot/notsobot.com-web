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


// Keeps Tab and Shift+Tab inside `ref`'s element while it's mounted (a dialog or drawer over the page), so the keyboard
// can't reach the dimmed page behind it: they wrap around at its ends, and come back in when focus has left it (a click
// on the dimming). `isActive` is asked on every Tab, for stacked dialogs where only the top one may hold focus.
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
      // hidden ones (collapsed panels, `hidden sm:block`) have no boxes
      const focusable = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => item.getClientRects().length);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !element.contains(active);
      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ref]);
}
