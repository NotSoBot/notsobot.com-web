import { History } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { FiltersButton } from '@/components/ui/FiltersButton';
import { Markdown } from '@/components/ui/Markdown';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { CHANGELOG, type ChangeKind } from '@/content/changelog';
import { DEFAULT_LANGUAGE, useI18n, type TranslationKey } from '@/i18n';
import { cn, decodeHash, displayLocale } from '@/lib/utils';


type KindFilter = ChangeKind | 'all';

const KIND_ORDER: Array<ChangeKind> = ['new', 'improved', 'fixed', 'removed'];

const FILTER_OPTIONS: Array<{value: KindFilter, label: TranslationKey}> = [
  {value: 'all', label: 'common.all'},
  ...KIND_ORDER.map((kind) => ({value: kind, label: `changelog.kind.${kind}` as const})),
];

const KIND_CLASSES: Record<ChangeKind, string> = {
  new: 'bg-brand/15 text-brand-text',
  improved: 'bg-success/15 text-success-text',
  fixed: 'bg-warning/15 text-warning',
  removed: 'bg-danger/15 text-danger-text',
};

// the dates are calendar days, so format them in UTC to keep them from shifting a day in western timezones
function dayFormats(locale: string) {
  return {
    day: new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric', timeZone: 'UTC'}),
    weekday: new Intl.DateTimeFormat(locale, {weekday: 'long', timeZone: 'UTC'}),
    year: new Intl.DateTimeFormat(locale, {year: 'numeric', timeZone: 'UTC'}),
    fullDay: new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}),
  };
}

function parseDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}


export function ChangelogPage() {
  const { t, plural, rich, language } = useI18n();
  // English keeps its US dates (Oct 17), other languages use their own
  const formats = useMemo(() => dayFormats((language === DEFAULT_LANGUAGE) ? 'en-US' : displayLocale()), [language]);
  const location = useLocation();
  const [ filter, setFilter ] = useState<KindFilter>('all');
  // only show that day and older ones, '' shows every day
  const [ until, setUntil ] = useState('');
  const [ query, setQuery ] = useState('');
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const needle = query.trim().toLowerCase();

  // within a day, new things first, then improvements, fixes and removals
  const days = useMemo(() => {
    // YYYY-MM-DD compares in date order as a string
    return CHANGELOG.filter((day) => !until || day.date <= until).map((day) => {
      // a search matching the day's title keeps all of that day's changes
      const titleMatches = !needle || day.title.toLowerCase().includes(needle);
      return {
        ...day,
        items: day.items
          .filter((item) => filter === 'all' || item.kind === filter)
          .filter((item) => titleMatches || item.text.toLowerCase().includes(needle))
          .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)),
      };
    }).filter((day) => day.items.length);
  }, [filter, until, needle]);

  const matchCount = days.reduce((count, day) => count + day.items.length, 0);
  const activeFilters = Number(filter !== 'all') + Number(!!until);

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
          <div className='mb-3 flex items-center gap-2 text-sm font-medium text-brand-text'>
            <History className='size-4'/>
            {t('changelog.badge')}
          </div>
          <h1 className='mb-2 text-3xl font-bold text-white sm:text-4xl'>{t('page.CHANGELOG')}</h1>
          <p className='mb-6 max-w-2xl text-muted'>
            {t('changelog.description')}
            {(language === DEFAULT_LANGUAGE) ? null : <> {t('changelog.english_only')}</>}
          </p>
          <div className='flex max-w-2xl gap-2'>
            <SearchInput
              className='min-w-0 flex-1'
              value={query}
              onValueChange={setQuery}
              placeholder={t('changelog.search_placeholder')}
              aria-label={t('changelog.search_label')}
            />
            <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='changelog-filters'/>
          </div>
          <div id='changelog-filters' hidden={!filtersOpen} className='mt-3 max-w-2xl rounded-lg border border-line bg-deep/60 p-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0'>
                <div className='w-max'>
                  <Segmented label={t('changelog.show_changes')} value={filter} options={FILTER_OPTIONS.map((option) => ({value: option.value, label: t(option.label)}))} onChange={(value) => setFilter(value as KindFilter)}/>
                </div>
              </div>
              <label className='flex items-center gap-2 text-sm text-muted'>
                {t('changelog.up_to')}
                <select value={until} onChange={(event) => setUntil(event.target.value)} className='input w-auto py-2.5'>
                  <option value=''>{t('changelog.all_dates')}</option>
                  {CHANGELOG.map((day) => (
                    <option key={day.date} value={day.date}>{formats.fullDay.format(parseDay(day.date))}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {(needle) ? (
            <p className='mt-3 text-sm text-muted' aria-live='polite'>
              {plural('changelog.results', matchCount, {query: query.trim()})}
            </p>
          ) : null}
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
                    <time dateTime={day.date} className='text-lg font-semibold text-white group-hover:text-brand-text'>{formats.day.format(date)}</time>
                    <span className='text-sm text-muted'>{formats.weekday.format(date)}, {formats.year.format(date)}</span>
                  </a>
                </div>
                <article className='card p-5 sm:p-6'>
                  <h2 className='mb-4 text-xl font-semibold text-white'>{day.title}</h2>
                  <ul className='space-y-3'>
                    {day.items.map((item, i) => (
                      <li key={i} className='flex flex-col gap-1.5 sm:flex-row sm:gap-3'>
                        <span className={cn('h-fit w-fit shrink-0 rounded px-2 py-0.5 text-xs font-semibold sm:mt-0.5 sm:w-20 sm:text-center', KIND_CLASSES[item.kind])}>
                          {t(`changelog.kind.${item.kind}`)}
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
            <p className='mb-1 text-lg text-white'>{t('changelog.empty_title')}</p>
            <p className='text-muted'>{t('changelog.empty_description')}</p>
          </div>
        ) : null}

        <aside className='mt-12 flex flex-col items-start justify-between gap-4 rounded-lg border border-line border-l-[3px] border-l-brand bg-surface p-6 sm:flex-row sm:items-center'>
          <div>
            <h2 className='mb-1 text-lg font-semibold text-white'>{t('changelog.idea_title')}</h2>
            <p className='text-sm text-muted'>{rich('changelog.idea_description', {code: (chunk) => <code className='rounded bg-deep px-1.5 py-0.5 font-mono text-[0.85em] text-code'>{chunk}</code>})}</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <a href={Routes.SUPPORT} className='btn btn-discord'>{t('faq.join_support')}</a>
            <Link to={Routes.COMMANDS} className='btn btn-secondary'>{t('faq.browse_commands')}</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
