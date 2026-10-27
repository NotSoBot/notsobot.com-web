import { ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Filter, Info, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useI18n } from '@/i18n';
import type { AdminUserContentFlags, AdminUserRef } from '@/lib/api';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDate, formatExactDateTime, formatNumber, NO_AUTOFILL, toDate } from '@/lib/utils';

export { FiltersButton } from '@/components/ui/FiltersButton';


// the Tags tab searching `query`, like `user:<id>`
export function adminTagsPath(query: string): string {
  return `${Routes.DASHBOARD_ADMIN_TAGS}?${new URLSearchParams({q: query}).toString()}`;
}

// the admin directory list with that listing open over it
export function adminTagDirectoryPath(tagId: string): string {
  return `${Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}/${tagId}`;
}

// the admin server list with that server open over it
export function adminServerPath(guildId: string): string {
  return `${Routes.DASHBOARD_ADMIN_SERVERS}/${guildId}`;
}

// the admin user list with that user open over it
export function adminUserPath(userId: string): string {
  return `${Routes.DASHBOARD_ADMIN_USERS}/${userId}`;
}


// Filters live in the URL so a filtered view can be linked/bookmarked; every change resets to page 1.
// `?within=` → `flagged_within` in hours, by how long ago the last content flag was (users and servers)
export const FLAGGED_WITHIN = [
  {value: 'any', label: 'Any time', hours: null},
  {value: '1d', label: '24h', hours: 24},
  {value: '7d', label: '7 days', hours: 24 * 7},
  {value: '30d', label: '30 days', hours: 24 * 30},
] as const;

// `?blocked=`: only blocked users/servers, or only ones that aren't (users and servers)
export const BLOCKED_FILTERS = [
  {value: 'any', label: 'Any', blocked: null},
  {value: 'blocked', label: 'Blocked', blocked: true},
  {value: 'not', label: 'Not blocked', blocked: false},
] as const;


export function useSearchParamState() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const page = Math.max(0, (Number(searchParams.get('page')) || 1) - 1);

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [ key, value ] of Object.entries(changes)) {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (resetPage && !('page' in changes)) {
        next.delete('page');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  const setPage = (value: number) => {
    update({page: (value <= 0) ? null : String(value + 1)}, false);
    window.scrollTo({top: 0});
  };

  return {searchParams, page, update, setPage};
}


// Acting on the last item of the last page (or a refetch shrinking the list) can leave you on a page that's now
// empty, which would show the empty state with no pagination to go back. Jump to the last page that has items
// instead; returns true while that's happening so the caller can keep showing its skeleton.
export function useStepBackFromEmptyPage({ page, setPage, data, isPlaceholderData, pageSize }: {
  page: number,
  setPage: (page: number) => void,
  data: {items: Array<unknown>, count: number} | undefined,
  isPlaceholderData: boolean,
  pageSize: number,
}): boolean {
  const stepBack = 0 < page && !!data && !isPlaceholderData && !data.items.length;
  const lastPage = (data) ? Math.max(0, Math.ceil(data.count / pageSize) - 1) : 0;
  useEffect(() => {
    if (stepBack) {
      setPage(Math.min(page - 1, lastPage));
    }
    // setPage is recreated every render
  }, [stepBack, page, lastPage]);
  return stepBack;
}


export function Pagination({ page, count, pageSize, onChange, fetching = false, className }: {
  page: number,
  count: number,
  pageSize: number,
  onChange: (page: number) => void,
  fetching?: boolean,
  className?: string,
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const start = (count) ? page * pageSize + 1 : 0;
  const end = Math.min(count, (page + 1) * pageSize);
  return (
    <nav aria-label={t('pagination.label')} className={cn('mt-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <p className='text-sm text-subtle tabular-nums'>
        {t('pagination.range', {start: formatNumber(start), end: formatNumber(end), count: formatNumber(count)})}
      </p>
      <div className='flex items-center gap-2'>
        <button type='button' className='btn btn-secondary btn-sm' disabled={page <= 0 || fetching} onClick={() => onChange(page - 1)}>
          <ChevronLeft aria-hidden className='size-4'/>
          {t('common.previous')}
        </button>
        <span className='text-sm text-muted tabular-nums'>{t('pagination.page', {page: formatNumber(page + 1), pages: formatNumber(pages)})}</span>
        <button type='button' className='btn btn-secondary btn-sm' disabled={pages <= page + 1 || fetching} onClick={() => onChange(page + 1)}>
          {t('common.next')}
          <ChevronRight aria-hidden className='size-4'/>
        </button>
      </div>
    </nav>
  );
}


// a date that shows the exact time, to the second, on hover or focus. A real popup rather than `title`, which
// takes a second to show up (or never does, e.g. on touch) and left only the help cursor
// a tooltip that shows right away on hover or focus (unlike `title`), for the element `handlers` are spread on
function useFloatingTooltip() {
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
function FloatingTooltip({ rect, text, wrap = false }: {rect: DOMRect, text: string, wrap?: boolean}) {
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
        (wrap) ? 'max-w-64 whitespace-normal' : 'whitespace-nowrap',
        above && '-translate-y-full',
      )}
    >
      {text}
    </div>
  );
}


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


// avatar + name + id; avatars come from Discord's CDN (never from user-submitted content).
// With `to` the avatar and name link to that user's admin page and the id gets a copy button.
export function UserCell({ user, fallbackId, size = 'md', to }: {user: AdminUserRef | null, fallbackId?: string | null, size?: 'sm' | 'md', to?: string}) {
  if (!user) {
    return (
      <span className='text-sm text-subtle'>
        Unknown user{(fallbackId) ? (
          <> · {(to) ? <CopyableValue value={fallbackId} truncate={0} to={to} linkTitle='Open in users' className='relative z-10'/> : <span className='font-mono'>{fallbackId}</span>}</>
        ) : null}
      </span>
    );
  }
  const name = userDisplayTag(user);
  const avatar = (
    <UserAvatar
      user={user}
      size={64}
      loading='lazy'
      className={cn('shrink-0 rounded-full bg-surface-3', (size === 'sm') ? 'size-6' : 'size-8')}
    />
  );
  if (to) {
    return (
      <span className='flex min-w-0 items-center gap-2'>
        <Link to={to} tabIndex={-1} aria-hidden className='relative z-10 shrink-0'>{avatar}</Link>
        <span className='min-w-0'>
          <Link to={to} title='Open in users' className='group/user relative z-10 flex min-w-0 items-center gap-1 text-sm font-medium text-white underline-offset-2 hover:underline'>
            <span className='truncate'>{name}</span>
            <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand'/>
          </Link>
          <CopyableValue value={user.id} truncate={0} className='relative z-10 max-w-full'/>
        </span>
      </span>
    );
  }
  return (
    <span className='flex min-w-0 items-center gap-2'>
      {avatar}
      <span className='min-w-0'>
        <span className='block truncate text-sm font-medium text-white'>{name}</span>
        <span className='block truncate font-mono text-xs text-subtle'>{user.id}</span>
      </span>
    </span>
  );
}


// small funnel icon that narrows the list to whatever it sits next to
export function FilterButton({ label, onClick }: {label: string, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      className='shrink-0 cursor-pointer rounded p-1 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      <Filter className='size-3.5'/>
    </button>
  );
}


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


// Copies `value` and shows a check for a moment. Icon only by default; with `label` it's a small ghost button
// sized for section headers (tag content, flagged urls).
export function CopyButton({ value, label }: {value: string, label?: string}) {
  const { t } = useI18n();
  const [ copied, setCopied ] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  if (label) {
    return (
      <button type='button' className='btn btn-ghost btn-sm' onClick={copy}>
        {(copied) ? <Check className='size-4 text-success'/> : <Copy className='size-4'/>}
        {(copied) ? t('common.copied') : label}
      </button>
    );
  }
  return (
    <button
      type='button'
      aria-label={t('common.copy')}
      title={t('common.copy')}
      className='shrink-0 cursor-pointer rounded p-0.5 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={copy}
    >
      {(copied) ? <Check className='size-3.5 text-success'/> : <Copy className='size-3.5'/>}
    </button>
  );
}


export function Chip({ children, className, tone = 'neutral', title }: {children: ReactNode, className?: string, tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'brand' | 'fuchsia', title?: string}) {
  return (
    <span
      title={title}
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
  );
}


// A reviewed report or flag folded down to one line; clicking anywhere on it opens the full card again.
// Plain content only inside (no buttons, links or focusable dates), since the whole row is a button.
export function CollapsedCard({ children, onExpand }: {children: ReactNode, onExpand: () => void}) {
  return (
    <li className='card'>
      <button
        type='button'
        aria-expanded={false}
        className='flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[inherit] px-4 py-2.5 text-left hover:bg-surface-2 sm:px-5'
        onClick={onExpand}
      >
        <ChevronRight aria-hidden className='size-4 shrink-0 text-subtle'/>
        {children}
      </button>
    </li>
  );
}


// folds an expanded reviewed card back into its CollapsedCard
export function CollapseButton({ onClick }: {onClick: () => void}) {
  const { t } = useI18n();
  return (
    <button
      type='button'
      aria-expanded
      aria-label={t('ui.collapse')}
      title={t('ui.collapse')}
      className='shrink-0 cursor-pointer rounded p-1 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      <ChevronDown className='size-4'/>
    </button>
  );
}


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


// A count tile in an item's modal (a user's, a server's), linking to the list behind it when there is one (`to`), or
// doing something else on click (`onClick`, e.g. switching tabs). Muted when it's 0; `title` explains it on hover.
export function StatTile({ className, label, value, to, onClick, tone = 'text-white', title }: {
  className?: string,
  label: string,
  value: string,
  to?: string,
  onClick?: () => void,
  tone?: string,
  title?: string,
}) {
  const content = (
    <>
      <p className='text-xs text-subtle'>{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', (to || onClick) && 'group-hover/stat:underline', (value === '0') ? 'text-subtle' : tone)}>{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button
        type='button'
        title={title}
        onClick={onClick}
        className={cn('group/stat cursor-pointer rounded-md border border-line bg-deep px-3 py-2 text-left transition-colors hover:border-brand', className)}
      >
        {content}
      </button>
    );
  }
  if (to) {
    return (
      <Link to={to} title={title} className={cn('group/stat rounded-md border border-line bg-deep px-3 py-2 transition-colors hover:border-brand', className)}>
        {content}
      </Link>
    );
  }
  return <div title={title} className={cn('rounded-md border border-line bg-deep px-3 py-2', title && 'cursor-help', className)}>{content}</div>;
}

// a date tile next to `StatTile`s (exact time on hover)
export function DateTile({ className, label, value, empty = '—', title }: {
  className?: string,
  label: string,
  value: string | number | null,
  empty?: string,
  title?: string,
}) {
  return (
    <div title={title} className={cn('rounded-md border border-line bg-deep px-3 py-2', title && 'cursor-help', className)}>
      <p className='text-xs text-subtle'>{label}</p>
      <p className='mt-0.5 text-sm text-fg'>{(value) ? <ExactDate value={value}/> : <span className='text-subtle'>{empty}</span>}</p>
    </div>
  );
}


// what the safety scan found (`flagged` is hits it was sure about, the rest of `total` only asked for a human to look)
export const FLAGGED_TITLE = 'Scanner hits it was sure about (like nudity or child safety)';
export const BORDERLINE_TITLE = 'Scanner hits that weren’t flagged outright, only sent for a human to look at';
// how staff reviewed those hits, by content flag status
export const FLAG_STATUS_TITLES: Record<string, string> = {
  '0': 'Not reviewed by staff yet',
  '1': 'Staff agreed it was bad content',
  '2': 'Staff decided it was fine (a false positive)',
  '3': 'Reported outside NotSoBot (like Discord Trust & Safety or NCMEC). Only a marker, it counts as confirmed.',
  '4': 'A reviewer wasn’t sure and left it for someone else',
};

// The "Content flags" tiles of a user's or server's modal: what the safety scan found on the first row, how staff
// reviewed it on the second. `flagsPath` is the content flags list for a status (`all` for every one).
export function ContentFlagTiles({ flags, flagsPath }: {flags: AdminUserContentFlags, flagsPath: (status: string) => string}) {
  return (
    <section>
      <h3 className='section-label mb-2'>Content flags</h3>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <StatTile label='Flagged' to={flagsPath('all')} value={flags.flagged.toLocaleString()} title={FLAGGED_TITLE}/>
        <StatTile label='Borderline' value={(flags.total - flags.flagged).toLocaleString()} title={BORDERLINE_TITLE}/>
        <DateTile className='col-span-2 sm:col-span-3' label='Last flagged' value={flags.last_flagged_at}/>
        <StatTile label='To review' to={flagsPath('0')} value={flags.pending.toLocaleString()} tone='text-warning' title={FLAG_STATUS_TITLES['0']}/>
        <StatTile label='Unsure' to={flagsPath('4')} value={flags.unsure.toLocaleString()} tone='text-[#f47fbf]' title={FLAG_STATUS_TITLES['4']}/>
        <StatTile label='Confirmed' to={flagsPath('1')} value={flags.confirmed.toLocaleString()} tone='text-danger' title={FLAG_STATUS_TITLES['1']}/>
        <StatTile label='Cleared' to={flagsPath('2')} value={flags.dismissed.toLocaleString()} tone='text-muted' title={FLAG_STATUS_TITLES['2']}/>
        <StatTile className='col-span-2 sm:col-span-1' label='Reported' to={flagsPath('3')} value={flags.reported.toLocaleString()} tone='text-[#aab2ff]' title={FLAG_STATUS_TITLES['3']}/>
      </div>
    </section>
  );
}


// edits locally and lands in the URL once typing stops (and only when it's a snowflake)
export function IdFilter({ className, label, placeholder, value, onChange }: {
  className?: string,
  label: string,
  placeholder: string,
  value: string,
  onChange: (value: string | null) => void,
}) {
  const { t } = useI18n();
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && (!debounced || /^\d+$/.test(debounced))) {
      onChange(debounced);
    }
    // only when the typed value settles
  }, [debounced]);

  return (
    <label className={cn('text-sm', className)}>
      <span className='mb-1 block text-subtle'>{label}</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          inputMode='numeric'
          autoComplete='off'
          {...NO_AUTOFILL}
          placeholder={placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        {(input) ? (
          <button
            type='button'
            aria-label={t('ui.clear_filter', {label: label.toLowerCase()})}
            className='absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-subtle hover:text-fg'
            onClick={() => {
              setInput('');
              onChange(null);
            }}
          >
            <X className='size-4'/>
          </button>
        ) : null}
      </span>
    </label>
  );
}
