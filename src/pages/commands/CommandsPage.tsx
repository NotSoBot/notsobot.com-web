import { Check, Flame, LayoutGrid } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import { FiltersButton } from '@/components/ui/FiltersButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { Routes } from '@/config';
import { Segmented } from '@/components/ui/Segmented';
import { readStored, writeStored } from '@/hooks/usePersistentState';
import { useI18n } from '@/i18n';
import type { CommandType } from '@/lib/api';
import { useCommandsQuery, useCommandStatsQuery } from '@/lib/api/queries';
import { cn, formatCompact, formatNumber } from '@/lib/utils';

import { CommandCard, TrendingCard } from './CommandCards';
import { CommandDrawer } from './CommandDrawer';
import {
  ACCESS_OPTIONS,
  accessFromParam,
  buildEntries,
  categoryMeta,
  categoryOrder,
  commandPath,
  compareByName,
  compareByUses,
  entryFromPath,
  matchesAccess,
  TYPE_OPTIONS,
  typeOptionFromParam,
  type Entry,
} from './commandMeta';


// Filters live in the URL (shareable) and the last-used set is remembered, so coming back to a
// plain /commands (e.g. from the navbar) restores them. An explicit filter in the URL wins.
const FILTER_PARAMS = ['type', 'category', 'in', 'access', 'q', 'sort'] as const;
const STORAGE_FILTERS = 'commands:filters';

const PAGE_SIZE = 60;
const TRENDING_COUNT = 8;


type Sort = 'popular' | 'az';


export function CommandsPage() {
  const { t, plural, rich, language } = useI18n();
  const [ searchParams, setSearchParams ] = useSearchParams();
  // the type/access/dm/sort panel starts closed, the button shows how many are set meanwhile
  const [ filtersOpen, setFiltersOpen ] = useState(false);

  const typeOption = typeOptionFromParam(searchParams.get('type'));
  const category = (searchParams.get('category') || '').toUpperCase() || null;
  const dmOnly = searchParams.get('in') === 'dms';
  const access = accessFromParam(searchParams.get('access'));
  const sort: Sort = (searchParams.get('sort') === 'az') ? 'az' : 'popular';
  const query = searchParams.get('q') || '';
  // the open command is the path, /commands/:commandId(/:commandType)
  const { commandId, commandType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const deferredQuery = useDeferredValue(query);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  }, [setSearchParams]);

  useLayoutEffect(() => {
    if (FILTER_PARAMS.some((key) => searchParams.has(key))) {
      return;
    }
    const stored = readStored<Record<string, string>>(STORAGE_FILTERS, {});
    const restored = Object.fromEntries(
      Object.entries(stored).filter(([key, value]) => (FILTER_PARAMS as ReadonlyArray<string>).includes(key) && value),
    );
    if (Object.keys(restored).length) {
      updateParams(restored);
    }
    // only on arrival; later changes are the user's own edits
  }, []);

  useEffect(() => {
    const filters: Record<string, string> = {};
    for (const key of FILTER_PARAMS) {
      const value = searchParams.get(key);
      if (value) {
        filters[key] = value;
      }
    }
    writeStored(STORAGE_FILTERS, filters);
  }, [searchParams]);

  const { data: commands, isPending, isError, refetch } = useCommandsQuery(language);
  const { data: stats } = useCommandStatsQuery(7);

  // every command, for the header and the drawer (which shows all of a command's variants whatever the filters)
  const entries = useMemo(() => buildEntries(commands || [], stats), [commands, stats]);
  const weekTotal = useMemo(() => entries.reduce((sum, entry) => sum + entry.uses, 0), [entries]);
  const totalRanked = useMemo(() => entries.filter((entry) => entry.rank).length, [entries]);

  // Type, DM and free/premium narrow everything (counts, trending, list) and pick the variants first, so the Slash
  // filter shows slash names and slash uses; category and search only narrow the list.
  const scoped = useMemo(() => buildEntries(commands || [], stats, (metadata) => {
    return (!typeOption.types || typeOption.types.includes(metadata.type)) && (!dmOnly || metadata.dmable) && matchesAccess(metadata, access);
  }), [commands, stats, typeOption, dmOnly, access]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of scoped) {
      counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    }
    return counts;
  }, [scoped]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const result = scoped.filter(({ variants, category: entryCategory }) => {
      if (category && entryCategory !== category) {
        return false;
      }
      // any of the card's variants, so the slash name finds the merged card too. the english name as well, a translated
      // slash command can still be searched for by what it's called in english
      if (needle) {
        return variants.some(({ metadata }) => {
          return metadata.name.toLowerCase().includes(needle)
            || !!metadata.default_name?.toLowerCase().includes(needle)
            || !!metadata.description?.toLowerCase().includes(needle)
            || metadata.aliases.some((alias) => alias.toLowerCase().includes(needle));
        });
      }
      return true;
    });
    return result.sort((sort === 'popular') ? compareByUses : compareByName);
  }, [scoped, category, deferredQuery, sort]);

  // Always shown (hiding it made the page jump); follows type/DM/category but not the search box.
  const trending = useMemo(() => {
    return scoped
      .filter((entry) => entry.uses && (!category || entry.category === category))
      .sort(compareByUses)
      .slice(0, TRENDING_COUNT);
  }, [scoped, category]);

  // render in pages; the full list is ~760 cards
  const [ visible, setVisible ] = useState(PAGE_SIZE);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    setVisible(PAGE_SIZE);
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    // Stay where you are, unless you were scrolled past the top of the results (then a shorter
    // list could leave you staring at the footer): bring the results' top into view, nothing more.
    const results = resultsRef.current;
    if (results && results.getBoundingClientRect().top < 0) {
      results.scrollIntoView({block: 'start'});
    }
  }, [typeOption.param, category, dmOnly, access, deferredQuery, sort]);

  const selected = (commandId) ? entryFromPath(entries, commandId, commandType) : undefined;
  const siblings = (selected) ? entries.filter((entry) => entry.command.id === selected.entry.command.id && entry.key !== selected.entry.key) : [];
  // the filters stay in the query string either way
  const goTo = useCallback((pathname: string, search: string) => {
    navigate({pathname, search}, {replace: true, preventScrollReset: true});
  }, [navigate]);
  // a card opens on the variant it shows
  const openCommand = useCallback((entry: Entry, type: CommandType = entry.metadata.type) => {
    goTo(commandPath(entry.command, type), location.search);
  }, [goTo, location.search]);
  const closeCommand = useCallback(() => goTo(Routes.COMMANDS, location.search), [goTo, location.search]);

  const categories = useMemo(() => categoryOrder(t), [t]);

  const activeFilterCount = Number(typeOption.types !== null) + Number(!!category) + Number(dmOnly) + Number(access !== 'all');
  // the ones in the toolbar's panel, the category is picked in the sidebar and stays visible
  const panelFilterCount = Number(typeOption.types !== null) + Number(dmOnly) + Number(access !== 'all') + Number(sort !== 'popular');

  return (
    <>
      <div className='border-b border-line bg-surface'>
        <div className='container-page flex flex-col gap-1 py-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='mb-2 text-3xl text-white'>{t('nav.commands')}</h1>
            <p className='text-muted'>{t('commands.description')}</p>
          </div>
          {(entries.length) ? (
            <p className='text-sm text-subtle tabular-nums'>
              {plural('commands.total', entries.length)}
              {(weekTotal) ? <> · {rich('commands.week_uses', {b: (chunk) => <span className='text-muted'>{chunk}</span>}, {count: formatCompact(weekTotal)})}</> : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className='container-page py-8'>
        {(entries.length) ? (
          <section aria-labelledby='trending-heading' className='mb-10'>
            <h2 id='trending-heading' className='mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xl text-white'>
              <Flame className='size-5 text-warning'/>
              {t('commands.trending')}
              {(category || typeOption.types) ? (
                <span className='text-sm text-subtle'>
                  · {[category && t(categoryMeta(category).label), typeOption.types && t(typeOption.label)].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </h2>
            {/* one row that only scrolls sideways (cards are a constant height), so switching filters never shifts the page */}
            {(trending.length) ? (
              <div className='-mx-4 sm:mx-0'>
                <ul
                  key={`${typeOption.param}:${category}:${dmOnly}:${access}`}
                  className={cn(
                    'grid animate-fade-in auto-cols-[15.5rem] grid-flow-col gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-2 sm:px-0',
                    'snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 [&>li]:snap-start',
                  )}
                >
                  {trending.map((entry) => (
                    <TrendingCard key={entry.key} entry={entry} max={trending[0].uses} onOpen={() => openCommand(entry)}/>
                  ))}
                </ul>
              </div>
            ) : (
              // same height as the row above, so an empty category doesn't shift the page either
              <div className='flex h-[12rem] animate-fade-in items-center justify-center rounded-lg border border-dashed border-line-strong pb-2 text-sm text-muted'>
                {t('commands.trending_empty')}
              </div>
            )}
          </section>
        ) : null}

        <div className='grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[260px_minmax(0,1fr)]'>
          <aside aria-label={t('commands.categories')} className='lg:sticky lg:top-24 lg:self-start'>
            <h2 className='section-label mb-2 hidden px-1 lg:block'>{t('commands.categories')}</h2>
            <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0'>
              <li>
                <CategoryButton active={!category} count={scoped.length} onClick={() => updateParams({category: null})}>
                  <LayoutGrid className='size-4 text-muted'/>
                  <span className='min-w-0 truncate'>{t('commands.all')}</span>
                </CategoryButton>
              </li>
              {categories.filter((value) => categoryCounts.get(value)).map((value) => {
                const meta = categoryMeta(value);
                const Icon = meta.icon;
                return (
                  <li key={value}>
                    <CategoryButton
                      active={category === value}
                      count={categoryCounts.get(value) || 0}
                      color={meta.color}
                      onClick={() => updateParams({category: (category === value) ? null : value.toLowerCase()})}
                    >
                      <Icon className='size-4 text-[var(--cat)]'/>
                      <span className='min-w-0 truncate' title={t(meta.label)}>{t(meta.label)}</span>
                    </CategoryButton>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div ref={resultsRef} className='min-w-0 scroll-mt-20'>
            <div className='mb-4'>
              <div className='flex gap-2'>
                <SearchInput
                  className='min-w-0 flex-1'
                  value={query}
                  onValueChange={(value) => updateParams({q: value || null})}
                  placeholder={t('commands.search_placeholder')}
                  aria-label={t('commands.search_label')}
                />
                <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={panelFilterCount} controls='commands-filters'/>
              </div>
              <div id='commands-filters' hidden={!filtersOpen} className='mt-3 flex flex-wrap items-center gap-2'>
                <Segmented
                  label={t('commands.type_label')}
                  value={typeOption.param}
                  options={TYPE_OPTIONS.map((option) => ({value: option.param, label: t(option.label)}))}
                  onChange={(value) => updateParams({type: (value === 'all') ? null : value})}
                />
                <Segmented
                  label={t('commands.access_label')}
                  value={access}
                  options={ACCESS_OPTIONS.map((option) => ({value: option.value, label: t(option.label)}))}
                  onChange={(value) => updateParams({access: (value === 'all') ? null : value})}
                />
                <DmToggle checked={dmOnly} onChange={(value) => updateParams({in: value ? 'dms' : null})}/>
                <Segmented
                  label={t('commands.sort_label')}
                  value={sort}
                  options={[{value: 'popular', label: t('commands.sort_popular')}, {value: 'az', label: t('commands.sort_az')}]}
                  onChange={(value) => updateParams({sort: (value === 'popular') ? null : value})}
                />
              </div>
            </div>

            <div className='mb-4 flex items-center justify-between gap-3 text-sm'>
              <span className='text-muted tabular-nums'>
                {(isPending) ? t('commands.loading') : plural('commands.total', filtered.length)}
                {(category) ? <> {rich('commands.in_category', {b: (chunk) => <span className='text-white'>{chunk}</span>}, {category: t(categoryMeta(category).label)})}</> : null}
              </span>
              {(activeFilterCount) ? (
                <button
                  type='button'
                  onClick={() => updateParams({type: null, category: null, in: null, access: null})}
                  className='cursor-pointer text-muted transition-colors hover:text-white'
                >
                  {t('commands.clear_filters')}
                </button>
              ) : null}
            </div>

            {(isPending) ? (
              <CardGridSkeleton/>
            ) : (isError) ? (
              <div className='card flex flex-col items-center gap-3 p-10 text-center'>
                <p className='text-muted'>{t('commands.load_error')}</p>
                <button type='button' className='btn btn-secondary' onClick={() => refetch()}>{t('common.retry')}</button>
              </div>
            ) : (filtered.length) ? (
              <>
                <ul className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3'>
                  {filtered.slice(0, visible).map((entry) => (
                    <CommandCard key={entry.key} entry={entry} onOpen={() => openCommand(entry)}/>
                  ))}
                </ul>
                {(visible < filtered.length) ? (
                  <div className='mt-6 flex justify-center'>
                    <button type='button' className='btn btn-secondary' onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                      {t('commands.show_more', {count: formatNumber(filtered.length - visible)})}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className='card p-12 text-center text-muted'>{t('commands.empty')}</div>
            )}
          </div>
        </div>
      </div>

      {(selected) ? (
        <CommandDrawer
          entry={selected.entry}
          type={selected.type}
          siblings={siblings}
          totalRanked={totalRanked}
          onSelect={openCommand}
          onClose={closeCommand}
        />
      ) : null}
    </>
  );
}


function CategoryButton({ active, count, color, onClick, children }: {
  active: boolean,
  count: number,
  color?: string,
  onClick: () => void,
  children: ReactNode,
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      style={(color) ? {'--cat': color} as CSSProperties : undefined}
      className={cn(
        'flex w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm whitespace-nowrap transition-colors [&>svg]:shrink-0',
        'lg:border-transparent',
        active
          ? 'border-line-strong bg-surface-3 text-white'
          : 'border-line text-muted hover:bg-surface-2 hover:text-white',
      )}
    >
      {children}
      <span className='ml-auto shrink-0 pl-2 text-xs text-subtle tabular-nums'>{count}</span>
    </button>
  );
}


// sits in the toolbar next to the type/sort controls, sized to match their height
function DmToggle({ checked, onChange }: {checked: boolean, onChange: (value: boolean) => void}) {
  const { t } = useI18n();
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg border bg-deep px-3 py-2.5 text-sm whitespace-nowrap transition-colors',
        checked ? 'border-brand/60 text-white' : 'border-line text-muted hover:text-white',
      )}
    >
      <input type='checkbox' className='peer sr-only' checked={checked} onChange={(event) => onChange(event.target.checked)}/>
      <span
        aria-hidden
        className={cn(
          'flex size-5 items-center justify-center rounded border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-brand',
          checked ? 'border-brand bg-brand' : 'border-[#4e5058] bg-surface-3 group-hover:border-brand',
        )}
      >
        {checked ? <Check className='size-3.5 text-white'/> : null}
      </span>
      {t('commands.dms')}
    </label>
  );
}


function CardGridSkeleton() {
  return (
    <ul className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3' aria-hidden>
      {Array.from({length: 9}, (_, i) => (
        <li key={i} className='card h-32 animate-pulse p-4'>
          <div className='h-4 w-32 rounded bg-surface-3'/>
          <div className='mt-3 h-3 w-3/4 rounded bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}

