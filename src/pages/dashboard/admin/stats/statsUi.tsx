// The pieces the owner Stats page's sections are made of: a panel that loads (and fails) on its own, number tiles, a
// bar per day, and ranked lists.

import type { UseQueryResult } from '@tanstack/react-query';
import { Check, Link2, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/api/dashboardQueries';
import { cn, decodeHash, displayLocale, formatDate, formatMemory, formatNumber } from '@/lib/utils';

import { ErrorPanel, Panel, Skeleton } from '../../ui';
import { Hint, InfoTip } from '../adminUi';


// validated against the dark surface (dataviz palette check), each pair a chart uses is told apart by everyone.
// `bad` is the status color, only for errors and things going away
export const STAT_COLORS = {
  primary: '#7b84f5',
  secondary: '#16a3a0',
  bad: '#ed4245',
  neutral: '#72767d',
};


export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatNumber(count)} ${(count === 1) ? one : many}`;
}

// 13.1M, 626K; exact below 10,000
export function compact(value: number): string {
  return (value < 10000) ? formatNumber(value) : new Intl.NumberFormat(displayLocale(), {notation: 'compact', maximumFractionDigits: 1}).format(value);
}

export function bytes(value: number): string {
  return formatMemory(value, (value < 1024) ? 0 : 1);
}

export function percent(part: number, total: number): string {
  if (!total) {
    return '0%';
  }
  const value = part / total * 100;
  return `${(value < 10 && value !== 0) ? value.toFixed(1) : Math.round(value)}%`;
}

export function shortDate(value: string): string {
  return formatDate(value, {month: 'short', day: 'numeric'});
}

// a calendar date from the api (`2026-10-20`) is UTC midnight, read in the viewer's time zone it'd be the day before
export function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(displayLocale(), {month: 'short', day: 'numeric', timeZone: 'UTC'});
}


// A section of the page, with its own loading, error and refresh. `children` renders the data; while another window
// loads the old numbers stay, dimmed. `id` is its link (`/dashboard/owner/stats#growth`), scrolled to once it has loaded
export function StatsSection<T>({ id, title, accent, description, query, children }: {
  id: string,
  title: string,
  accent: string,
  description?: ReactNode,
  query: UseQueryResult<T>,
  children: (data: T) => ReactNode,
}) {
  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } = query;
  const location = useLocation();
  const loaded = data !== undefined;

  // after it loads, the skeleton is a different height; each navigation to the hash (the jump links too) scrolls again
  useEffect(() => {
    if (loaded && decodeHash(location.hash) === id) {
      document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [id, loaded, location.key]);

  return (
    <section id={id} aria-label={title} className='scroll-mt-24'>
      {(isPending) ? (
        <SectionSkeleton/>
      ) : (isError && !data) ? (
        <ErrorPanel title={`Couldn’t load ${title.toLowerCase()} stats`} message={errorMessage(error)} onRetry={() => refetch()} retrying={isFetching}/>
      ) : (data) ? (
        <Panel
          // the link shows on hover next to the title, like the docs' headings
          title={(
            <span className='group inline-flex items-center gap-2'>
              {title}
              <CopySectionLink id={id} title={title}/>
            </span>
          )}
          accent={accent}
          description={description}
          actions={(
            <button type='button' className='btn btn-secondary btn-sm' onClick={() => refetch()} disabled={isFetching}>
              {(isFetching && !isPlaceholderData) ? <Spinner className='size-4'/> : <RefreshCw aria-hidden className='size-4'/>}
              <span className='max-sm:sr-only'>Refresh</span>
            </button>
          )}
        >
          <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>{children(data)}</div>
        </Panel>
      ) : null}
    </section>
  );
}

// the page as it is now (window included) plus the section's hash, like the FAQ's links. Without clipboard access it
// puts the hash in the address bar instead, to copy from there
function CopySectionLink({ id, title }: {id: string, title: string}) {
  const [ copied, setCopied ] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.location.hash = id;
    }
  };
  return (
    <button
      type='button'
      className={cn(
        'cursor-pointer text-subtle transition-opacity hover:text-white focus-visible:opacity-100 group-hover:opacity-100',
        (copied) ? 'opacity-100' : 'opacity-0',
      )}
      title={(copied) ? 'Copied' : `Copy a link to ${title}`}
      aria-label={(copied) ? 'Link copied' : `Copy a link to ${title}`}
      onClick={copy}
    >
      {(copied) ? <Check aria-hidden className='size-4 text-success'/> : <Link2 aria-hidden className='size-4'/>}
    </button>
  );
}


function SectionSkeleton() {
  return (
    <div aria-hidden className='card p-4 sm:p-5'>
      <Skeleton className='h-5 w-28'/>
      <div className='mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4'>
        {Array.from({length: 4}, (_, i) => <Skeleton key={i} className='h-20 bg-surface-2'/>)}
      </div>
      <Skeleton className='mt-4 h-36 w-full bg-surface-2'/>
    </div>
  );
}


export function MetricGrid({ className, children }: {className?: string, children: ReactNode}) {
  return <div className={cn('grid grid-cols-2 gap-2 lg:grid-cols-4', className)}>{children}</div>;
}

// a number with what it is above it and more about it below. `to` links the whole tile to the list behind it, `title`
// explains it in an ⓘ next to the label (above the link, a button can't go inside one)
export function Metric({ className, label, value, detail, color, title, to, tone }: {
  className?: string,
  label: string,
  value: ReactNode,
  detail?: ReactNode,
  color?: string,
  title?: string,
  to?: string,
  tone?: 'warning' | 'danger',
}) {
  return (
    <div className={cn('relative min-w-0 rounded-md border border-line bg-deep px-3 py-2.5', to && 'group/metric transition-colors hover:border-brand', className)}>
      {(to) ? <Link to={to} aria-label={label} className='absolute inset-0 rounded-md'/> : null}
      <p className='flex items-center gap-1.5 text-xs text-subtle'>
        {(color) ? <span aria-hidden className='size-2 shrink-0 rounded-full' style={{background: color}}/> : null}
        {label}
        {(title) ? <InfoTip text={title} className='relative z-10'/> : null}
      </p>
      <p className={cn(
        'mt-1 text-xl font-semibold tabular-nums',
        (tone === 'warning') ? 'text-warning' : (tone === 'danger') ? 'text-danger' : 'text-white',
        to && 'group-hover/metric:underline',
      )}>
        {value}
      </p>
      {(detail) ? <p className='text-xs text-muted tabular-nums'>{detail}</p> : null}
    </div>
  );
}


export function SubHeading({ children, actions }: {children: ReactNode, actions?: ReactNode}) {
  return (
    <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
      <h3 className='text-sm font-semibold text-white'>{children}</h3>
      {actions}
    </div>
  );
}


export interface BarSeries<T> {
  label: string,
  color: string,
  value: (item: T) => number,
}

// A bar per day. `series` stack up from the axis (in order), `below` hangs down from it on the same scale (like
// servers left under servers joined). The legend shows once there's more than one series; hover gives the day's
// numbers (`describe`). `axis` labels the first and last bar, the day by default
export function DailyBars<T extends {date: string}>({ items, series, below, describe, format = formatNumber, axis = (item) => dayLabel(item.date) }: {
  items: Array<T>,
  series: Array<BarSeries<T>>,
  below?: BarSeries<T>,
  describe: (item: T) => string,
  format?: (value: number) => string,
  axis?: (item: T, index: number) => string,
}) {
  const totals = items.map((item) => series.reduce((sum, part) => sum + part.value(item), 0));
  const maxAbove = Math.max(0, ...totals);
  const maxBelow = (below) ? Math.max(0, ...items.map(below.value)) : 0;
  const legend = [...series, ...((below) ? [below] : [])];
  // one scale for both sides: the chart's height is split between them by their biggest day, so neither gets cut off
  const grow = {above: (maxAbove || !maxBelow) ? maxAbove || 1 : 0, below: maxBelow};
  // a day's bar stays at least this tall when it's not 0, so a quiet day still shows up
  const height = (value: number, max: number) => (max && value) ? `max(2px, ${(value / max) * 100}%)` : 0;
  const dense = 45 < items.length;

  return (
    <div className='rounded-md border border-line bg-deep p-3'>
      <div className='flex items-start justify-between gap-3 text-xs text-subtle'>
        <span className='tabular-nums'>{format(maxAbove)}</span>
        {(1 < legend.length) ? (
          <ul className='flex flex-wrap justify-end gap-x-3 gap-y-1'>
            {legend.map((part) => (
              <li key={part.label} className='flex items-center gap-1.5'>
                <span aria-hidden className='size-2 rounded-full' style={{background: part.color}}/>
                {part.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <ol className={cn('mt-1 flex h-32', dense ? 'gap-px' : 'gap-0.5')}>
        {items.map((item) => (
          <li key={item.date} className='h-full min-w-0 flex-1'>
            <Hint text={describe(item)} className='group flex h-full flex-col'>
              {/* stacked from the axis up with 2px between the parts, the top one rounded */}
              <span className='flex min-h-0 flex-col-reverse gap-0.5 border-b border-line-strong' style={{flexGrow: grow.above, flexBasis: 0}}>
                {series.filter((part) => part.value(item)).map((part, i, shown) => (
                  <span
                    key={part.label}
                    className={cn('block w-full shrink-0 transition-opacity group-hover:opacity-80', i === shown.length - 1 && 'rounded-t-[4px]')}
                    style={{height: height(part.value(item), maxAbove), background: part.color}}
                  />
                ))}
              </span>
              {(below && grow.below) ? (
                <span className='flex min-h-0 flex-col' style={{flexGrow: grow.below, flexBasis: 0}}>
                  <span
                    className='block w-full shrink-0 rounded-b-[4px] transition-opacity group-hover:opacity-80'
                    style={{height: height(below.value(item), maxBelow), background: below.color}}
                  />
                </span>
              ) : null}
            </Hint>
          </li>
        ))}
      </ol>
      <div className='mt-1 flex justify-between text-xs text-subtle'>
        <span>{(items.length) ? axis(items[0], 0) : null}</span>
        <span>{(items.length) ? axis(items[items.length - 1], items.length - 1) : null}</span>
      </div>
    </div>
  );
}


export interface RankedItem {
  key: string,
  label: ReactNode,
  value: number,
  display: string,
  detail?: ReactNode,
}

// a top-N list, each row with a bar behind it by its share of the biggest
export function RankedList({ items, empty = 'Nothing yet.' }: {items: Array<RankedItem>, empty?: string}) {
  const max = Math.max(0, ...items.map((item) => item.value));
  if (!items.length) {
    return <p className='rounded-md border border-line bg-deep px-3 py-4 text-center text-sm text-subtle'>{empty}</p>;
  }
  return (
    <ol className='divide-y divide-line overflow-hidden rounded-md border border-line bg-deep'>
      {items.map((item) => (
        <li key={item.key} className='relative px-3 py-2'>
          <span
            aria-hidden
            className='absolute inset-y-0 left-0 bg-surface-3/60'
            style={{width: (max) ? `${(item.value / max) * 100}%` : 0}}
          />
          <span className='relative flex items-center gap-3'>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-sm text-fg'>{item.label}</span>
              {(item.detail) ? <span className='block truncate text-xs text-subtle tabular-nums'>{item.detail}</span> : null}
            </span>
            <span className='shrink-0 text-sm font-semibold text-white tabular-nums'>{item.display}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
