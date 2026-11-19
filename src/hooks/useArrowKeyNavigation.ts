import { useEffect, useRef } from 'react';

import { openModalCount } from '@/components/ui/Modal';


// ← / → step to the previous / next item while a browsing modal is open (tag details, admin detail modals).
// Ignored with a modifier held, while typing in a field (selects too: arrows change their value), while another dialog
// is open over this one (a confirm, a report form: they'd otherwise keep their state and act on the item stepped to),
// and while `disabled` (editing, a save in flight).
// The latest options are read when a key is pressed, so callers can pass fresh closures every render.
export function useArrowKeyNavigation(options: {
  previousId?: string | null,
  nextId?: string | null,
  onNavigate: (id: string) => void,
  disabled?: boolean,
}): void {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !isArrowNavigationTarget(event.target)) {
        return;
      }
      const { previousId, nextId, onNavigate, disabled } = latest.current;
      if (disabled) {
        return;
      }
      if (event.key === 'ArrowLeft' && previousId) {
        onNavigate(previousId);
      } else if (event.key === 'ArrowRight' && nextId) {
        onNavigate(nextId);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}


// whether arrow keys landing on `target` may step between items: not from a field, and not under a nested dialog
// (the browsing modal itself counts as one open modal)
export function isArrowNavigationTarget(target: EventTarget | null): boolean {
  if (1 < openModalCount()) {
    return false;
  }
  return !(target instanceof Element && target.closest('input, textarea, select, [contenteditable]'));
}
