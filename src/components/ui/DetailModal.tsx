import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Children, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { useToastClearance } from './Toast';


// The pieces of an item's modal, laid out like the admin content flag modal: `DetailModalHeader`, a `DetailModalStrip`
// under it (who posted it, where it lives), the body, then `ModalFooter` with the item's actions.


// What it is and its name on the left with a line under them (when it was made), its states stacked in the middle, and
// its status in the top right, just left of `Modal`'s close button (its left edge is 48px in) and lined up with the
// title's line: the columns sit at the top, so that line is always the padding plus half of its 28px height. From sm up
// the outer columns are both 1fr, so the middle one is centred on the modal (the status and close button sit in the
// right column's empty space). On phones the states get their own centred line under the title, and the whole header
// sticks to the top of the window (`Modal`'s top padding, hence `-top-12`), so its modal wants `stickyClose`.
// `leading` is a type chip or an icon (28px tall at most), `status` a chip with a fixed width (w-20, or w-24 with
// `wideStatus`) so the title knows how much room to leave it on phones.
export function DetailModalHeader({ titleId, leading, title, titleTooltip, mono = false, meta, states, status, wideStatus = false }: {
  titleId: string,
  leading?: ReactNode,
  title: ReactNode,
  // for a title that can be cut off
  titleTooltip?: string,
  mono?: boolean,
  meta?: ReactNode,
  // left out when empty: pass an array (or null), a fragment always counts as something even with nothing in it
  states?: ReactNode,
  status?: ReactNode,
  wideStatus?: boolean,
}) {
  return (
    <div className='relative grid gap-x-4 gap-y-2 px-4 pt-4 pb-3 max-sm:sticky max-sm:-top-12 max-sm:z-10 max-sm:rounded-t-xl max-sm:border-b max-sm:border-line max-sm:bg-bg/95 max-sm:backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:px-6 sm:pt-5'>
      {/* clear of the status and close button on phones */}
      <div className={cn('min-w-0', (!status) ? 'max-sm:pr-10' : (wideStatus) ? 'max-sm:pr-36' : 'max-sm:pr-32')}>
        <div className='flex h-7 items-center gap-2.5'>
          {leading}
          <h2 id={titleId} title={titleTooltip} className={cn('min-w-0 truncate text-base leading-7 font-semibold text-white sm:text-lg', mono && 'font-mono')}>
            {title}
          </h2>
        </div>
        {(meta) ? <div className='mt-1 text-xs text-subtle'>{meta}</div> : null}
      </div>
      {(Children.toArray(states).length) ? (
        <div className='flex flex-wrap items-center justify-center gap-1 sm:flex-col sm:flex-nowrap'>{states}</div>
      ) : null}
      {(status) ? <div className='absolute top-[20px] right-16 flex sm:top-[24px]'>{status}</div> : null}
    </div>
  );
}


// The strip under `DetailModalHeader`, for who posted the item or where it lives (with actions on them at the end).
// No top border on phones, the sticky header above has its own.
export function DetailModalStrip({ className, children }: {className?: string, children: ReactNode}) {
  return (
    <div className={cn('border-b border-line bg-surface-2 px-4 py-2.5 sm:border-t sm:px-6', className)}>{children}</div>
  );
}


// Previous / Next (with `onNavigate`) and the item's actions between them. With actions (or `start`) the footer stays at the bottom
// of the window while scrolling, so they and the next item are always a click away; the negative `bottom` is `Modal`'s
// bottom padding, which sticky positioning would otherwise leave as a gap under it.
// `start` takes Previous' slot in a footer that doesn't browse (e.g. a "Back" button).
// Actions share the row on phones, so they go icon-less with short labels there (see the content flag modal's).
export function ModalFooter({ previousId = null, nextId = null, onNavigate, start, children }: {
  previousId?: string | null,
  nextId?: string | null,
  onNavigate?: (id: string) => void,
  start?: ReactNode,
  children?: ReactNode,
}) {
  const ref = useRef<HTMLElement>(null);
  // toasts (e.g. a status change's undo) would otherwise land on top of Next
  useToastClearance(ref);
  const actions = Children.toArray(children).length !== 0;
  if (!actions && !start && !previousId && !nextId) {
    return null;
  }
  // a footer that's only for browsing doesn't need to follow you down
  const sticky = actions || !!start;
  return (
    <footer
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3 border-t border-line',
        (sticky) ? 'sticky -bottom-6 z-10 rounded-b-xl bg-bg/95 px-3 py-3 backdrop-blur sm:-bottom-10 sm:px-4' : 'px-6 py-3',
      )}
    >
      {(onNavigate) ? (
        <button
          type='button'
          className='btn btn-ghost shrink-0 px-2'
          aria-label='Previous'
          title='Previous (←)'
          disabled={!previousId}
          onClick={() => previousId && onNavigate(previousId)}
        >
          <ChevronLeft className='size-4'/>
          <span className={cn(actions && 'hidden lg:inline')}>Previous</span>
        </button>
      ) : start}
      {(actions) ? (
        <div className='flex min-w-0 flex-1 justify-center gap-2'>{children}</div>
      ) : (onNavigate) ? (
        <span className='hidden text-xs text-subtle sm:block'>Use ← → to browse this page</span>
      ) : null}
      {(onNavigate) ? (
        <button
          type='button'
          className='btn btn-ghost shrink-0 px-2'
          aria-label='Next'
          title='Next (→)'
          disabled={!nextId}
          onClick={() => nextId && onNavigate(nextId)}
        >
          <span className={cn(actions && 'hidden lg:inline')}>Next</span>
          <ChevronRight className='size-4'/>
        </button>
      ) : null}
    </footer>
  );
}
