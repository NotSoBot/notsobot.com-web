import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';


// for a modal's two `DetailList`s side by side from sm up, in a `grid grid-cols-[max-content_minmax(0,1fr)] sm:grid-cols-2`
// parent: stacked below sm, each spans both columns of the parent and reuses them, so the labels of both lists share one
// width. max-sm so these don't fight the list's own grid-cols once side by side
export const DETAIL_LIST_STACKED = 'max-sm:col-span-2 max-sm:grid-cols-subgrid';

// label/value pairs in a compact grid
// an item's optional third value is a class for both its label and value (e.g. `sm:hidden` for a phones-only row)
export function DetailList({ className, items }: {className?: string, items: Array<[ReactNode, ReactNode, string?] | null | false>}) {
  return (
    // content-start: next to a taller list (side by side) its rows stay packed at the top instead of spreading out
    <dl className={cn('grid grid-cols-[max-content_minmax(0,1fr)] content-start gap-x-4 gap-y-1.5 text-sm', className)}>
      {items.filter((item): item is [ReactNode, ReactNode, string?] => !!item).map(([ label, value, className ], i) => (
        <div key={i} className='contents'>
          <dt className={cn('text-subtle', className)}>{label}</dt>
          <dd className={cn('min-w-0 break-words text-fg', className)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
