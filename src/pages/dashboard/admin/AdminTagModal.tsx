import { Keyboard } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';

import { SlideNavigation } from '@/components/ui/ItemModal';
import { isArrowNavigationTarget } from '@/hooks/useArrowKeyNavigation';
import { usePersistentState } from '@/hooks/usePersistentState';
import { cn } from '@/lib/utils';

// the item modal itself (stepping, swiping, holds) is the whole dashboard's, in src/components/ui: re-exported here for
// the admin pages, with the review shortcuts only they have below
export { AdminModalFooter, AdminTagModal, LinkedItemModal, useHoldModalNavigation, useOpenListItem } from '@/components/ui/ItemModal';


// the verdicts' keys, the same letter in every review queue that has the action
export const REVIEW_KEYS = {confirm: 'c', dismiss: 'd', resolve: 'r', verify: 'v', unverify: 'u'} as const;

// how long the verdict keys do nothing after the modal goes to another item
const REVIEW_KEY_PAUSE = 400;

// Single keys for a review modal's verdicts (content flags, reports, the tag directory), off unless turned on with
// `ReviewShortcutsToggle`, per browser. `keys` maps a letter to its verdict, left out while the modal doesn't offer it.
// Ignored like ← / → are (with a modifier held, from a field, under another dialog), and also with Shift, while the
// key repeats (holding one down would go through the whole queue), while `pending` (a request in flight, the
// buttons are disabled then too) and for a moment after the modal went to another item (`REVIEW_KEY_PAUSE`): a quick
// answer opens the next one at once, and a second press of the same key meant for the last one would land on an
// item nobody has read yet.
// With shortcuts on, a verdict given with a key that went through calls `advance()` (a button click doesn't, the item
// stays open) and the modal steps to the next item: once its request is done, and only if nothing holds the modal on
// this one by then (`held`, what the item passes to `useHoldModalNavigation`; a note saved along with the verdict no
// longer does).
export function useReviewShortcuts({ keys, pending, held }: {
  keys: Record<string, (() => void) | undefined>,
  pending: boolean,
  held: boolean,
}) {
  const [ enabled, setEnabled ] = usePersistentState('admin:review-shortcuts', false);
  const navigation = useContext(SlideNavigation);
  const [ advancing, setAdvancing ] = useState(false);
  const latest = useRef({keys, pending, enabled, steppedAt: navigation?.steppedAt});
  latest.current = {keys, pending, enabled, steppedAt: navigation?.steppedAt};

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { keys, pending, enabled, steppedAt } = latest.current;
      if (!enabled || pending || event.repeat || event.defaultPrevented) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isArrowNavigationTarget(event.target)) {
        return;
      }
      const run = keys[event.key.toLowerCase()];
      if (run) {
        event.preventDefault();
        if (REVIEW_KEY_PAUSE <= performance.now() - (steppedAt?.current ?? 0)) {
          run();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!advancing || pending) {
      return;
    }
    setAdvancing(false);
    if (!held) {
      navigation?.advance();
    }
  }, [advancing, pending, held]);

  return {
    enabled,
    setEnabled,
    advance: () => {
      if (latest.current.enabled) {
        setAdvancing(true);
      }
    },
    // a verdict button's title, with its key while shortcuts are on
    title: (label: string, key: string) => (enabled) ? `${label} (${key.toUpperCase()})` : undefined,
  };
}


// The "Shortcuts" switch of a review modal, in its header's `status` just before the status chip (the footer has no
// room left beside a flag's four actions). `legend` is that queue's keys, like "C confirm • D dismiss". Only the icon
// until lg, the title needs the room. It's there at every width, a small bare icon below sm (with the header's
// `wideStatus` it fits beside a w-20 chip): shortcuts left on still fire in a narrow window, which needs the way to
// turn them off too.
export function ReviewShortcutsToggle({ enabled, onChange, legend }: {enabled: boolean, onChange: (enabled: boolean) => void, legend: string}) {
  return (
    <button
      type='button'
      aria-pressed={enabled}
      title={(enabled)
        ? `Shortcuts are on: ${legend}, then the next one opens. Click to turn them off.`
        : `Shortcuts are off. Click for single-key verdicts (${legend}), each then opens the next one.`}
      className={cn(
        'relative mr-0.5 inline-flex cursor-pointer items-center gap-1 rounded text-xs font-medium whitespace-nowrap transition-colors sm:mr-2 sm:px-1',
        // easier to hit on a touch screen than its 14px
        'max-sm:after:absolute max-sm:after:-inset-2',
        (enabled) ? 'bg-brand/25 text-[#aab2ff] hover:bg-brand/35' : 'text-subtle hover:bg-surface-2 hover:text-fg',
      )}
      onClick={() => onChange(!enabled)}
    >
      <Keyboard aria-hidden className='size-3.5 shrink-0 sm:size-4'/>
      <span className='sr-only lg:not-sr-only'>Shortcuts</span>
    </button>
  );
}
