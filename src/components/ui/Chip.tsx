import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

import { FloatingTooltip, useFloatingTooltip } from './Tooltip';


// `title` explains the chip right away on hover, in a popup like `Hint`'s (the `title` attribute takes a second to show
// up), and stays its description for screen readers. No ⓘ to tap like `InfoTip`'s: chips sit inside rows that are
// links, where a button can't go
export function Chip({ children, className, tone = 'neutral', title }: {children: ReactNode, className?: string, tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'brand' | 'fuchsia', title?: string}) {
  const { rect, handlers } = useFloatingTooltip();
  return (
    <>
      <span
        aria-description={title}
        {...((title) ? handlers : {})}
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
          (tone === 'danger') ? 'bg-danger/20 text-[#ff8a8c]'
            : (tone === 'warning') ? 'bg-warning/20 text-warning'
            : (tone === 'success') ? 'bg-success/20 text-[#6fd391]'
            : (tone === 'brand') ? 'bg-brand/25 text-[#aab2ff]'
            : (tone === 'fuchsia') ? 'bg-[#eb459e]/20 text-[#f47fbf]'
            : 'bg-line-strong text-muted',
          className,
        )}
      >
        {children}
      </span>
      {(rect && title) ? createPortal(<FloatingTooltip rect={rect} text={title} wrap/>, document.body) : null}
    </>
  );
}
