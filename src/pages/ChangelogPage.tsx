import { History } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Markdown } from '@/components/ui/Markdown';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { CHANGE_KIND_LABELS, CHANGELOG, type ChangeKind } from '@/content/changelog';
import { cn, decodeHash } from '@/lib/utils';


type KindFilter = ChangeKind | 'all';

const KIND_ORDER: Array<ChangeKind> = ['new', 'improved', 'fixed', 'removed'];

const FILTER_OPTIONS: Array<{value: KindFilter, label: string}> = [
  {value: 'all', label: 'All'},
  ...KIND_ORDER.map((kind) => ({value: kind, label: CHANGE_KIND_LABELS[kind]})),
];

const KIND_CLASSES: Record<ChangeKind, string> = {
  new: 'bg-brand/15 text-brand',
  improved: 'bg-success/15 text-success',
  fixed: 'bg-warning/15 text-warning',
  removed: 'bg-danger/15 text-danger',
};

// the dates are calendar days, so format them in UTC to keep them from shifting a day in western timezones
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', {weekday: 'long', timeZone: 'UTC'});
const YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {year: 'numeric', timeZone: 'UTC'});
const FULL_DAY_FORMAT = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});

function parseDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}


export function ChangelogPage() {
  const location = useLocation();
  const [ filter, setFilter ] = useState<KindFilter>('all');
  // only show that day and older ones, '' shows every day
  const [ until, setUntil ] = useState('');

  // within a day, new things first, then improvements, fixes and removals
  const days = useMemo(() => {
    // YYYY-MM-DD compares in date order as a string
    return CHANGELOG.filter((day) => !until || day.date <= until).map((day) => ({
      ...day,
      items: day.items
        .filter((item) => filter === 'all' || item.kind === filter)
        .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)),
    })).filter((day) => day.items.length);
  }, [filter, until]);

  // `/changelog#2026-10-17` jumps to that day
  useEffect(() => {
    const id = decodeHash(location.hash);
    if (id) {
      document.getElementById(id)?.scrollIntoView({block: 'start'});
    }
  }, [location.hash]);

  return (
    <>
      <div className='border-b border-line bg-surface'>
        <div className='container-page py-10 sm:py-12'>
          <div className='mb-3 flex items-center gap-2 text-sm font-medium text-brand'>
            <History className='size-4'/>
            What's new
          </div>
          <h1 className='mb-2 text-3xl font-bold text-white sm:text-4xl'>Changelog</h1>
          <p className='mb-6 max-w-2xl text-muted'>
            New commands, improvements and fixes to NotSoBot and notsobot.com, day by day.
          </p>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0'>
              <div className='w-max'>
                <Segmented label='Show changes' value={filter} options={FILTER_OPTIONS} onChange={(value) => setFilter(value as KindFilter)}/>
              </div>
            </div>
            <label className='flex items-center gap-2 text-sm text-muted'>
              Up to
              <select value={until} onChange={(event) => setUntil(event.target.value)} className='input w-auto py-2.5'>
                <option value=''>All dates</option>
                {CHANGELOG.map((day) => (
                  <option key={day.date} value={day.date}>{FULL_DAY_FORMAT.format(parseDay(day.date))}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className='container-page py-10'>
        <ol className='space-y-10'>
          {days.map((day) => {
            const date = parseDay(day.date);
            return (
              <li key={day.date} id={day.date} className='grid scroll-mt-24 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:gap-8'>
                <div className='md:sticky md:top-24 md:self-start md:pt-5'>
                  <a href={`#${day.date}`} className='group inline-flex items-baseline gap-2 md:flex-col md:gap-0.5'>
                    <time dateTime={day.date} className='text-lg font-semibold text-white group-hover:text-brand'>{DAY_FORMAT.format(date)}</time>
                    <span className='text-sm text-muted'>{WEEKDAY_FORMAT.format(date)}, {YEAR_FORMAT.format(date)}</span>
                  </a>
                </div>
                <article className='card p-5 sm:p-6'>
                  <h2 className='mb-4 text-xl font-semibold text-white'>{day.title}</h2>
                  <ul className='space-y-3'>
                    {day.items.map((item, i) => (
                      <li key={i} className='flex flex-col gap-1.5 sm:flex-row sm:gap-3'>
                        <span className={cn('h-fit w-fit shrink-0 rounded px-2 py-0.5 text-xs font-semibold sm:mt-0.5 sm:w-20 sm:text-center', KIND_CLASSES[item.kind])}>
                          {CHANGE_KIND_LABELS[item.kind]}
                        </span>
                        <Markdown text={item.text} className='leading-relaxed text-fg'/>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            );
          })}
        </ol>

        {(!days.length) ? (
          <div className='card p-10 text-center'>
            <p className='mb-1 text-lg text-white'>No changes match these filters.</p>
            <p className='text-muted'>Try another type or a later date.</p>
          </div>
        ) : null}

        <aside className='mt-12 flex flex-col items-start justify-between gap-4 rounded-lg border border-brand/30 bg-gradient-to-r from-brand/20 to-brand/5 p-6 sm:flex-row sm:items-center'>
          <div>
            <h2 className='mb-1 text-lg font-semibold text-white'>Found a bug or have an idea?</h2>
            <p className='text-sm text-muted'>Use <code className='rounded bg-deep px-1.5 py-0.5 font-mono text-[0.85em] text-code'>.report bug</code> or tell us in the support server.</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <a href={Routes.SUPPORT} className='btn btn-discord'>Join the support server</a>
            <Link to={Routes.COMMANDS} className='btn btn-secondary'>Browse commands</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
