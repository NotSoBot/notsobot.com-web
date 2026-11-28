import { LayoutTemplate } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { FiltersButton } from '@/components/ui/FiltersButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorGroup } from '../types';
import { useCatalogue } from '../useCatalogue';
import { isHubCode } from './api';
import { HubCard, HubCardSkeleton } from './HubCard';
import { HubDetailDialog } from './HubDetail';
import { HubLoginDialog, HubReportDialog, type HubLoginIntent } from './HubDialogs';
import { HUB_KINDS, HUB_SORTS, type HubKind, type HubSort, type HubTemplate } from './types';


// typing settles for this long before it's searched
const SEARCH_DELAY = 300;
const SKELETONS = 6;
// the tabs the api's `EffectGroups` has, the catalogue's own order wins once it's loaded
const GROUPS: ReadonlyArray<EditorGroup> = ['style', 'distort', 'animate', 'text', 'faces', 'scenes', 'adjust', 'edit', 'draw', 'audio'];


// the next page's own load, under the ones already shown
type MoreState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'error', message: string};

type ListState =
  | {status: 'loading'}
  | {status: 'error', message: string}
  | {status: 'ready', templates: Array<HubTemplate>, next: string | null, more: MoreState};

// the dialog over the list (besides a template's own view): never two of them
type HubOverlay =
  | {kind: 'report', template: HubTemplate}
  | {kind: 'login', template: HubTemplate, intent: HubLoginIntent};

// the one Try that's running, or the last one that failed, by its template's code. One at a time: a second one started
// meanwhile used to win or lose by which answer came last, and take the first one's spinner away
type TryState =
  | {code: string, status: 'loading'}
  | {code: string, status: 'error', message: string};

// the open one when it isn't in the list (a shared link, or past the loaded pages), by its code
type FetchedState =
  | {code: string, status: 'loading'}
  | {code: string, status: 'ready', template: HubTemplate}
  // the api says it isn't on the hub (a 404)
  | {code: string, status: 'missing'}
  // anything else: it can be asked again
  | {code: string, status: 'error'};


function FilterToggle({ pressed, onChange, label }: {pressed: boolean, onChange: (value: boolean) => void, label: string}) {
  return (
    <button
      type='button'
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(
        'min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors',
        (pressed) ? 'border-brand bg-brand/20 text-white' : 'border-line-strong text-muted hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}


// The hub: search, filters (behind the Filters button like the room list), sort, and the published templates 24 at a
// time with Load more. Each card tries, copies its MediaScript line or reports. A template's own view (`openCode`) is a
// dialog over the list, its code kept by whoever shows this (the site's url, the Activity's state).
// Logged out, Try and Report ask them to log in first (`onLogin`)
export function HubBrowser({ host, loggedIn, onTry, onLogin, openCode, onOpenCode, className }: {
  host: EditorHost,
  loggedIn: boolean,
  // the site goes to the template's link, the Activity puts it on its start screen. One that fails rejects, the reason
  // is said beside the Try that was pressed
  onTry: (template: HubTemplate) => void | Promise<void>,
  onLogin?: (template: HubTemplate, intent: HubLoginIntent) => void,
  openCode: string | null,
  onOpenCode: (code: string | null) => void,
  className?: string,
}) {
  const { t } = useI18n();
  // (effects read `t` from here: it changes with the language, which is no reason to load the list again)
  const tRef = useRef(t);
  tRef.current = t;
  const filtersId = useId();
  const { catalogue } = useCatalogue(host);
  const effectNames = useMemo(() => new Map((catalogue?.effects ?? []).map((effect) => [effect.id, effect.name])), [catalogue]);
  const groups = (catalogue?.groups?.length) ? catalogue.groups : GROUPS;

  const [ query, setQuery ] = useState('');
  const [ search, setSearch ] = useState('');
  const [ kind, setKind ] = useState<HubKind | 'all'>('all');
  const [ group, setGroup ] = useState<EditorGroup | 'all'>('all');
  const [ asks, setAsks ] = useState(false);
  const [ sort, setSort ] = useState<HubSort>('popular');
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const [ list, setList ] = useState<ListState>({status: 'loading'});
  const [ attempt, setAttempt ] = useState(0);
  const [ tryState, setTryState ] = useState<TryState | null>(null);
  const [ overlay, setOverlay ] = useState<HubOverlay | null>(null);
  const [ fetched, setFetched ] = useState<FetchedState | null>(null);
  const fetchedRef = useRef(fetched);
  fetchedRef.current = fetched;
  const [ fetchAttempt, setFetchAttempt ] = useState(0);
  const moreAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(() => ({
    query: search || undefined,
    kind: (kind === 'all') ? undefined : kind,
    group: (group === 'all') ? undefined : group,
    asks,
    sort,
  }), [search, kind, group, asks, sort]);

  useEffect(() => {
    const controller = new AbortController();
    moreAbort.current?.abort();
    setList({status: 'loading'});
    host.api.hub(filters, controller.signal).then((page) => {
      // (an aborted request rejects in both hosts today, this doesn't lean on that)
      if (!controller.signal.aborted) {
        setList({status: 'ready', templates: page.templates, next: page.next, more: {status: 'idle'}});
      }
    }).catch((failure) => {
      if (!controller.signal.aborted) {
        setList({status: 'error', message: host.errorOf(failure)?.message || tRef.current('hub.error')});
      }
    });
    return () => controller.abort();
  }, [host, filters, attempt]);

  const loadMore = async () => {
    if (list.status !== 'ready' || !list.next || list.more.status === 'loading') {
      return;
    }
    const controller = new AbortController();
    moreAbort.current = controller;
    // (a list that's loading again for other filters has no `more`, this page isn't its)
    const setMore = (more: MoreState) => setList((current) => (current.status === 'ready' && !controller.signal.aborted) ? {...current, more} : current);
    setMore({status: 'loading'});
    try {
      const page = await host.api.hub({...filters, before: list.next}, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setList((current) => {
        if (current.status !== 'ready') {
          return current;
        }
        // a template that moved up between pages (ranked lists change) isn't shown twice
        const seen = new Set(current.templates.map((item) => item.code));
        return {status: 'ready', templates: [...current.templates, ...page.templates.filter((item) => !seen.has(item.code))], next: page.next, more: {status: 'idle'}};
      });
    } catch (failure) {
      setMore({status: 'error', message: host.errorOf(failure)?.message || t('hub.error')});
    }
  };

  const listed = (list.status === 'ready' && openCode) ? list.templates.find((item) => item.code === openCode) ?? null : null;
  useEffect(() => {
    if (!openCode || listed || list.status === 'loading') {
      return;
    }
    // already asked for and answered (the state as of the last render: this effect doesn't run again for it)
    const known = fetchedRef.current;
    if (known?.code === openCode && (known.status === 'ready' || known.status === 'missing')) {
      return;
    }
    // a code that can't be one isn't asked for (the request would throw before there's a promise): not there
    if (!isHubCode(openCode)) {
      setFetched({code: openCode, status: 'missing'});
      return;
    }
    const controller = new AbortController();
    setFetched({code: openCode, status: 'loading'});
    host.api.hubTemplate(openCode, controller.signal).then((template) => {
      if (!controller.signal.aborted) {
        setFetched({code: openCode, status: 'ready', template});
      }
    }).catch((failure) => {
      if (!controller.signal.aborted) {
        // only the api's own "not there" is that: a busy api or a dropped connection used to read "not on the hub"
        setFetched({code: openCode, status: (host.errorOf(failure)?.status === 404) ? 'missing' : 'error'});
      }
    });
    return () => {
      controller.abort();
      // closed before it answered: it's asked again when it's opened again. Left as loading, the next time found it
      // "already asked for" and spun until a reload
      setFetched((current) => (current?.code === openCode && current.status === 'loading') ? null : current);
    };
  }, [host, openCode, listed, list.status, fetchAttempt]);
  const opened = listed ?? ((fetched?.code === openCode && fetched.status === 'ready') ? fetched.template : null);
  const openedState = (opened || fetched?.code !== openCode) ? null : fetched.status;

  const trying = (tryState?.status === 'loading') ? tryState.code : null;
  const tryError = (code: string) => (tryState?.status === 'error' && tryState.code === code) ? tryState.message : null;
  const tryTemplate = async (template: HubTemplate) => {
    if (!loggedIn) {
      setOverlay({kind: 'login', template, intent: 'try'});
      return;
    }
    if (trying) {
      return;
    }
    setTryState({code: template.code, status: 'loading'});
    try {
      await onTry(template);
      setTryState(null);
    } catch (failure) {
      setTryState({code: template.code, status: 'error', message: host.errorOf(failure)?.message || t('hub.entry.error')});
    }
  };
  const report = (template: HubTemplate) => {
    setOverlay((loggedIn) ? {kind: 'report', template} : {kind: 'login', template, intent: 'report'});
  };

  const activeFilters = [kind !== 'all', group !== 'all', asks, sort !== 'popular'].filter(Boolean).length;
  const filtering = Boolean(search) || kind !== 'all' || group !== 'all' || asks;
  const clear = () => {
    setQuery('');
    setSearch('');
    setKind('all');
    setGroup('all');
    setAsks(false);
  };

  return (
    <div data-state={list.status} data-more={(list.status === 'ready') ? list.more.status : undefined} className={cn('flex flex-col gap-5', className)}>
      <div>
        <div className='flex gap-2'>
          <SearchInput className='min-w-0 flex-1' value={query} onValueChange={setQuery} placeholder={t('hub.search')} aria-label={t('hub.search')}/>
          <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls={filtersId}/>
        </div>
        <div id={filtersId} hidden={!filtersOpen} className='mt-3 rounded-lg border border-line bg-deep/60 p-4'>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1.5'>
              <span className='text-sm font-medium text-subtle'>{t('hub.sort')}</span>
              <div className='w-fit max-w-full overflow-x-auto'>
                <Segmented
                  label={t('hub.sort')}
                  value={sort}
                  options={HUB_SORTS.map((value) => ({value, label: t(`hub.sort.${value}`)}))}
                  onChange={(value) => setSort(value as HubSort)}
                />
              </div>
            </div>
            <div className='flex flex-col gap-1.5'>
              <span className='text-sm font-medium text-subtle'>{t('hub.filter_kind')}</span>
              {/* chips that wrap: five kinds don't fit a phone's width as one bar */}
              <div role='group' aria-label={t('hub.filter_kind')} className='flex flex-wrap gap-2'>
                {(['all', ...HUB_KINDS] as const).map((value) => (
                  <FilterToggle key={value} pressed={kind === value} onChange={() => setKind(value)} label={t(`hub.kind.${value}`)}/>
                ))}
              </div>
            </div>
            <div className='flex flex-wrap items-end gap-3'>
              <label className='flex flex-col gap-1.5'>
                <span className='text-sm font-medium text-subtle'>{t('hub.filter_group')}</span>
                <select value={group} onChange={(event) => setGroup(event.target.value as EditorGroup | 'all')} className='input w-auto py-2'>
                  <option value='all'>{t('hub.group.all')}</option>
                  {groups.map((value) => <option key={value} value={value}>{t(`hub.group.${value}`)}</option>)}
                </select>
              </label>
              <FilterToggle pressed={asks} onChange={setAsks} label={t('hub.filter_asks')}/>
            </div>
          </div>
        </div>
      </div>

      {(list.status === 'loading') ? (
        <div role='status' aria-label={t('hub.results_loading')} className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({length: SKELETONS}, (_, index) => <HubCardSkeleton key={index}/>)}
        </div>
      ) : (list.status === 'error') ? (
        <div role='alert' className='flex flex-col items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-6 py-10 text-center'>
          <p className='text-fg'>{list.message}</p>
          <button type='button' className='btn btn-secondary' onClick={() => setAttempt((value) => value + 1)}>{t('common.retry')}</button>
        </div>
      ) : (!list.templates.length) ? (
        <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center'>
          <LayoutTemplate aria-hidden className='size-8 text-subtle'/>
          <p className='max-w-md text-muted'>{(filtering) ? t('hub.empty_filtered') : t('hub.empty')}</p>
          {(filtering) ? <button type='button' className='btn btn-secondary' onClick={clear}>{t('hub.clear_filters')}</button> : null}
        </div>
      ) : (
        <>
          <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {list.templates.map((template) => (
              <li key={template.code} className='flex min-w-0'>
                <HubCard
                  template={template}
                  effectNames={effectNames}
                  trying={trying === template.code}
                  tryDisabled={Boolean(trying)}
                  tryError={tryError(template.code)}
                  onOpen={() => onOpenCode(template.code)}
                  onTry={() => void tryTemplate(template)}
                  onReport={() => report(template)}
                />
              </li>
            ))}
          </ul>
          {(list.next) ? (
            <div className='flex flex-col items-center gap-2'>
              <button type='button' className='btn btn-secondary' onClick={() => void loadMore()} disabled={list.more.status === 'loading'}>
                {(list.more.status === 'loading') ? <Spinner className='size-4'/> : null}
                {t('common.load_more')}
              </button>
              {(list.more.status === 'error') ? <p role='alert' className='text-sm text-danger-text'>{list.more.message}</p> : null}
            </div>
          ) : null}
        </>
      )}

      {(openCode) ? (
        <HubDetailDialog
          template={opened}
          missing={openedState === 'missing'}
          failed={openedState === 'error'}
          onRetry={() => setFetchAttempt((value) => value + 1)}
          effectNames={effectNames}
          trying={trying === openCode}
          tryDisabled={Boolean(trying)}
          tryError={tryError(openCode)}
          onTry={() => opened && void tryTemplate(opened)}
          onReport={() => opened && report(opened)}
          onClose={() => onOpenCode(null)}
        />
      ) : null}
      {(overlay?.kind === 'report') ? <HubReportDialog host={host} template={overlay.template} onClose={() => setOverlay(null)}/> : null}
      {(overlay?.kind === 'login') ? (
        <HubLoginDialog
          intent={overlay.intent}
          onLogin={() => onLogin?.(overlay.template, overlay.intent)}
          onClose={() => setOverlay(null)}
        />
      ) : null}
    </div>
  );
}
