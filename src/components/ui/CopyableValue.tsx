import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import { CopyButton } from './CopyButton';


// Spread onto a read-only text block (url, hash, tag content) so it can take focus from a click and Ctrl/Cmd+A
// selects just its text instead of the whole page.
// The range runs from the first to the last text node rather than `selectNodeContents`: a selection that ends at
// the block's boundary makes Safari paint the gaps right of and below the text, filling the box unevenly.
export const selectAllScope = {
  tabIndex: 0,
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        const walker = document.createTreeWalker(event.currentTarget, NodeFilter.SHOW_TEXT);
        const first = walker.nextNode() as Text | null;
        let last = first;
        while (walker.nextNode()) {
          last = walker.currentNode as Text;
        }
        if (first && last) {
          range.setStart(first, 0);
          range.setEnd(last, last.length);
        } else {
          range.selectNodeContents(event.currentTarget);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  },
};


// Long values (hashes, ids) shown shortened with a copy button; the full value is in the title.
// With `to` the value itself is the link (to that server, tag or user's admin page), the copy button stays next to it.
export function CopyableValue({ value, truncate = 16, className, to, linkTitle }: {
  value: string,
  truncate?: number,
  className?: string,
  to?: string,
  linkTitle?: string,
}) {
  const shown = (truncate && truncate < value.length) ? `${value.slice(0, truncate)}…` : value;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      {(to) ? (
        <Link to={to} title={linkTitle ?? value} className='truncate font-mono text-xs text-code underline-offset-2 hover:underline'>{shown}</Link>
      ) : (
        <code title={value} className='truncate font-mono text-xs text-fg select-all focus:outline-none' {...selectAllScope}>{shown}</code>
      )}
      <CopyButton value={value}/>
    </span>
  );
}
