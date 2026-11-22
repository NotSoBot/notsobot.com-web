import { Info } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn, formatDate, formatExactDateTime, toDate } from '@/lib/utils';


// a date that shows the exact time, to the second, on hover or focus. A real popup rather than `title`, which
// takes a second to show up (or never does, e.g. on touch) and left only the help cursor
// a tooltip that shows right away on hover or focus (unlike `title`), for the element `handlers` are spread on
export function useFloatingTooltip() {
  const [ rect, setRect ] = useState<DOMRect | null>(null);
  const hide = () => setRect(null);

  useEffect(() => {
    if (!rect) {
      return;
    }
    // it's positioned once, so drop it instead of leaving it behind when the page scrolls
    window.addEventListener('scroll', hide, {capture: true, passive: true});
    return () => window.removeEventListener('scroll', hide, {capture: true});
  }, [rect]);

  const show = (event: { currentTarget: HTMLElement }) => setRect(event.currentTarget.getBoundingClientRect());
  return {rect, handlers: {onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide}};
}


export function ExactDate({ value, format = formatDate, className }: {
  value: string | number,
  format?: (value: string | number) => string,
  className?: string,
}) {
  const { rect, handlers } = useFloatingTooltip();
  const date = toDate(value);
  const valid = !Number.isNaN(date.getTime());

  return (
    <>
      <time
        dateTime={(valid) ? date.toISOString() : undefined}
        tabIndex={(valid) ? 0 : undefined}
        {...((valid) ? handlers : {})}
        className={cn(
          (valid) && 'cursor-default underline decoration-line-strong decoration-dotted underline-offset-2 hover:decoration-muted focus:outline-none focus-visible:decoration-brand',
          className,
        )}
      >
        {format(value)}
      </time>
      {(rect) ? createPortal(<FloatingTooltip rect={rect} text={formatExactDateTime(value)}/>, document.body) : null}
    </>
  );
}


// Says what something is on hover, like the dates' exact time (e.g. what an icon count counts). `text` is also read out
// to screen readers in place of what's shown.
export function Hint({ text, className, children }: {text: string, className?: string, children: ReactNode}) {
  const { rect, handlers } = useFloatingTooltip();
  return (
    <>
      <span {...handlers} className={className}>
        <span aria-hidden className='contents'>{children}</span>
        <span className='sr-only'>{text}</span>
      </span>
      {(rect) ? createPortal(<FloatingTooltip rect={rect} text={text}/>, document.body) : null}
    </>
  );
}


// an ⓘ next to a label that explains it, right away on hover, focus or a tap (unlike `title`, slow and never on touch)
export function InfoTip({ text, className }: {text: string, className?: string}) {
  const { rect, handlers } = useFloatingTooltip();
  return (
    <>
      <button
        type='button'
        aria-label={text}
        {...handlers}
        className={cn('inline-flex shrink-0 cursor-default rounded-full text-subtle transition-colors hover:text-fg focus-visible:text-fg', className)}
      >
        <Info aria-hidden className='size-3.5'/>
      </button>
      {(rect) ? createPortal(<FloatingTooltip rect={rect} text={text} wrap/>, document.body) : null}
    </>
  );
}


// `wrap`: a sentence instead of a short value, wrapped at a narrow width so it fits on a phone
export function FloatingTooltip({ rect, text, wrap = false }: {rect: DOMRect, text: string, wrap?: boolean}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ left, setLeft ] = useState<number | null>(null);
  // centered over what it's for but kept inside the viewport, which needs its own width; hidden until measured
  useLayoutEffect(() => {
    const width = ref.current?.offsetWidth ?? 0;
    const centered = rect.left + rect.width / 2 - width / 2;
    setLeft(Math.min(Math.max(centered, 8), window.innerWidth - width - 8));
  }, [rect]);
  // flipped below when there's no room above
  const above = 48 < rect.top;
  return (
    <div
      ref={ref}
      role='tooltip'
      style={{left: left ?? 0, top: (above) ? rect.top - 6 : rect.bottom + 6, visibility: (left === null) ? 'hidden' : undefined}}
      className={cn(
        'pointer-events-none fixed z-50 rounded-md border border-line-strong bg-deep px-2.5 py-1.5',
        'text-xs text-fg tabular-nums shadow-xl shadow-black/40',
        // pre-line: a chip's explanation can have line breaks (a block's reason, then when it ends)
        (wrap) ? 'max-w-64 whitespace-pre-line' : 'whitespace-nowrap',
        above && '-translate-y-full',
      )}
    >
      {text}
    </div>
  );
}
