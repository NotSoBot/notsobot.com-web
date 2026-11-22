import { useQuery } from '@tanstack/react-query';
import { BookOpen, Check, ChevronDown, Copy, Link2 } from 'lucide-react';
import { Fragment, memo, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavigationType, useLocation, useMatch, useNavigate, useNavigationType, useSearchParams } from 'react-router';

import { Segmented } from '@/components/ui/Segmented';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { QuarantineNotice, useQuarantineNoticeDismissed } from '@/components/ui/QuarantineNotice';
import { Routes } from '@/config';
import {
  mediaScriptCommandAnchor,
  mediaScriptCommandSearchText,
  tagFunctionAnchor,
  tagFunctionSearchText,
  type TagDocExample,
  type TagDocFunction,
  type TagDocGuideSection,
  type TagDocMediaScriptCommand,
} from '@/content/tagDocs';
import { localizeTagDocs, tagDocsTranslationQuery, type TagDocs } from '@/content/tagDocs/localize';
import { useCopied } from '@/hooks/useCopied';
import { Languages, useI18n } from '@/i18n';
import { cn, decodeHash } from '@/lib/utils';


type DocsView = 'tagscript' | 'mediascript';

const VIEW_OPTIONS: Array<{value: DocsView, label: string}> = [
  {value: 'tagscript', label: 'TagScript'},
  {value: 'mediascript', label: 'MediaScript'},
];

const VIEW_PATHS: Readonly<Record<DocsView, string>> = {
  tagscript: Routes.TAG_DOCS,
  mediascript: Routes.TAG_DOCS_MEDIASCRIPT,
};

// MediaScript anchors are all prefixed with `ms-`, so they never collide with a TagScript one
const MEDIASCRIPT_ANCHOR_PREFIX = 'ms-';

const HASH_SCROLL_DELAY_MS = 250;

function guideAnchor(view: DocsView, section: TagDocGuideSection): string {
  return (view === 'mediascript') ? `${MEDIASCRIPT_ANCHOR_PREFIX}guide-${section.id}` : `guide-${section.id}`;
}

function categoryAnchor(view: DocsView, id: string): string {
  return (view === 'mediascript') ? `${MEDIASCRIPT_ANCHOR_PREFIX}ref-${id}` : `ref-${id}`;
}

function guideSearchText(section: TagDocGuideSection): string {
  return [section.title, section.body, ...(section.table?.rows.flat() ?? [])].join(' ').toLowerCase();
}

// exact name hits first, then anything mentioning the query
function search<T>(items: ReadonlyArray<T>, needle: string, text: (item: T) => string, names: (item: T) => Array<string>): ReadonlyArray<T> {
  if (!needle) {
    return items;
  }
  return items
    .filter((item) => text(item).includes(needle))
    .sort((a, b) => Number(!names(a).includes(needle)) - Number(!names(b).includes(needle)));
}


// The docs in the site's language: the translation overlay is its own chunk, only fetched for that language.
// Until it arrives (`ready` is false) the page shows a spinner instead of flashing the English text; if it
// fails to load, the English docs are shown.
function useTagDocs(): {docs: TagDocs, ready: boolean} {
  const { language } = useI18n();
  const translated = (language !== Languages.ENGLISH);
  const translation = useQuery({...tagDocsTranslationQuery(language), enabled: translated});
  const docs = useMemo(() => localizeTagDocs((translated) ? translation.data : null), [translated, translation.data]);
  return {docs, ready: !translated || !translation.isPending};
}


export function TagDocsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, plural, rich } = useI18n();
  const { docs, ready } = useTagDocs();
  // the search is in `?q=` like the tag directory's, so a reload or a shared link keeps it. The input's text is its own
  // state: the router changes the url in a transition, and an input driven by one drops keystrokes on a page this long
  const [ searchParams, setSearchParams ] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [ query, setQueryText ] = useState(urlQuery);
  const setQuery = (value: string) => {
    setQueryText(value);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set('q', value);
      } else {
        next.delete('q');
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };
  // typing replaces the entry, so any other kind of navigation (a link to the docs, back/forward) is the url's search
  // changing under the input
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType !== NavigationType.Replace) {
      setQueryText(urlQuery);
    }
  }, [location.key, navigationType, urlQuery]);

  const hash = decodeHash(location.hash);
  const view: DocsView = (useMatch(Routes.TAG_DOCS_MEDIASCRIPT)) ? 'mediascript' : 'tagscript';
  const setView = (value: string) => {
    // the search carries over to the other one
    navigate({pathname: VIEW_PATHS[value as DocsView], search: location.search}, {replace: true});
    window.scrollTo({top: 0});
  };
  // the "On this page" menu below lg
  const mobileNav = useRef<HTMLDetailsElement>(null);
  // closed, the notice leaves a link under the description that brings it back, already open since they asked for it
  const [ quarantineDismissed, setQuarantineDismissed ] = useQuarantineNoticeDismissed();
  const [ quarantineReopened, setQuarantineReopened ] = useState(false);

  // the results follow the input a moment later, so typing isn't held up by filtering and rendering every card (they
  // are memo'd below, so the render that only updates the input skips them)
  const shownQuery = useDeferredValue(query).trim();
  const needle = shownQuery.toLowerCase();
  const guide = useMemo(() => {
    const sections = (view === 'mediascript') ? docs.mediaScriptGuide : docs.guide;
    return (needle) ? sections.filter((section) => guideSearchText(section).includes(needle)) : sections;
  }, [docs, view, needle]);

  const categories = useMemo(() => {
    if (view === 'mediascript') {
      const commands = search(docs.mediaScriptCommands, needle, mediaScriptCommandSearchText, (command) => [command.name, ...(command.aliases ?? [])]);
      return docs.mediaScriptCategories.map((category) => {
        const items = commands.filter((command) => command.category === category.id);
        return {...category, count: items.length, items: items.map((command) => <MediaScriptCard key={command.name} command={command} highlight={needle}/>)};
      }).filter((category) => category.count);
    }
    const functions = search(docs.functions, needle, tagFunctionSearchText, (fn) => fn.names);
    return docs.categories.map((category) => {
      const items = functions.filter((fn) => fn.category === category.id);
      return {...category, count: items.length, items: items.map((fn) => <FunctionCard key={fn.id} fn={fn} highlight={needle}/>)};
    }).filter((category) => category.count);
  }, [docs, view, needle]);
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  const code = (chunk: ReactNode) => <code className='font-mono text-code'>{chunk}</code>;

  // `/docs/tags#fn-upper` scrolls to that function. It waits for the router's own scroll handling
  // on load (which runs after this lazy page mounts), and for a translation to arrive, so it lands in the right place.
  useEffect(() => {
    if (!hash || !ready) {
      return;
    }
    const timer = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({block: 'start'}), HASH_SCROLL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hash, ready]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({block: 'start'});
    // keep react router's entry state (key/idx), or back/forward and its scroll restoration lose track
    window.history.replaceState(window.history.state, '', `${location.search}#${id}`);
  };

  // no ligatures: JetBrains Mono would otherwise draw `!=` and `>=` as single glyphs, which can't be typed
  return (
    <div className='[font-variant-ligatures:none]'>
      <div className='border-b border-line bg-surface'>
        <div className='container-page py-10 sm:py-12'>
          {(quarantineDismissed) ? null : (
            <QuarantineNotice className='mb-6 max-w-3xl' defaultOpen={quarantineReopened} onDismiss={() => setQuarantineDismissed(true)}/>
          )}
          <div className='mb-3 flex items-center gap-2 text-sm font-medium text-brand-text'>
            <BookOpen className='size-4'/>
            {t('tag_docs.badge')}
          </div>
          <h1 className='mb-2 text-3xl font-bold text-white sm:text-4xl'>{t('tag_docs.title')}</h1>
          <p className={cn('max-w-2xl text-muted', (quarantineDismissed) ? 'mb-2' : 'mb-6')}>
            {(view === 'mediascript') ? (
              rich('tag_docs.description_mediascript', {code}, {count: docs.mediaScriptCommands.length})
            ) : (
              t('tag_docs.description_tagscript', {count: docs.functions.length})
            )}
          </p>
          {(quarantineDismissed) ? (
            <button
              type='button'
              onClick={() => {
                setQuarantineReopened(true);
                setQuarantineDismissed(false);
              }}
              className='mb-6 block cursor-pointer text-sm text-code hover:underline'
            >
              {t('tag_docs.quarantine_link')}
            </button>
          ) : null}
          <div className='flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center'>
            <Segmented label={t('tag_docs.view_label')} value={view} options={VIEW_OPTIONS} onChange={setView}/>
            <SearchInput
              className='min-w-0 flex-1'
              value={query}
              onValueChange={setQuery}
              placeholder={(view === 'mediascript') ? t('tag_docs.search_placeholder_mediascript') : t('tag_docs.search_placeholder_tagscript')}
              aria-label={t('tag_docs.search_label')}
            />
          </div>
          {(needle && ready) ? (
            <p className='mt-2 text-sm text-muted' aria-live='polite'>
              {t('tag_docs.results', {
                items: plural((view === 'mediascript') ? 'tag_docs.commands' : 'tag_docs.functions', total),
                sections: plural('tag_docs.sections', guide.length),
                query: shownQuery,
              })}
            </p>
          ) : null}
          {(ready && (guide.length || categories.length)) ? (
            // below lg there's no sidebar, so the same links sit here, closed until asked for
            <details ref={mobileNav} className='group mt-3 max-w-3xl rounded-lg border border-line bg-deep lg:hidden'>
              <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden'>
                {t('tag_docs.on_this_page')}
                <ChevronDown aria-hidden className='size-4 shrink-0 text-subtle transition-transform group-open:rotate-180'/>
              </summary>
              <nav aria-label={t('tag_docs.nav_label')} className='max-h-[60vh] overflow-y-auto border-t border-line p-2'>
                <SectionLinks
                  view={view}
                  guide={guide}
                  categories={categories}
                  onNavigate={(id) => {
                    // closed first: it sits above the sections, so closing it after would move the one just scrolled to
                    if (mobileNav.current) {
                      mobileNav.current.open = false;
                    }
                    scrollTo(id);
                  }}
                />
              </nav>
            </details>
          ) : null}
        </div>
      </div>

      {(ready) ? (
        <div className='container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[230px_minmax(0,1fr)]'>
          <nav aria-label={t('tag_docs.nav_label')} className='hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto'>
            <SectionLinks view={view} guide={guide} categories={categories} onNavigate={scrollTo}/>
          </nav>

          <div className='min-w-0 space-y-12'>
            {(guide.length) ? (
              <div className='space-y-6'>
                {guide.map((section) => <GuideSection key={section.id} anchor={guideAnchor(view, section)} section={section} highlight={needle}/>)}
              </div>
            ) : null}

            {categories.map((category) => (
              <section key={category.id} id={categoryAnchor(view, category.id)} aria-labelledby={`${categoryAnchor(view, category.id)}-title`} className='scroll-mt-24'>
                <header className='mb-4'>
                  <h2 id={`${categoryAnchor(view, category.id)}-title`} className='text-xl font-semibold text-white'>{category.title}</h2>
                  <p className='text-sm text-muted'>{category.description}</p>
                </header>
                <div className='space-y-4'>{category.items}</div>
              </section>
            ))}

            {(!total && !guide.length) ? (
              <div className='card p-10 text-center'>
                <p className='mb-1 text-lg text-white'>{t('tag_docs.empty_title', {query: shownQuery})}</p>
                <p className='text-muted'>
                  {rich((view === 'mediascript') ? 'tag_docs.empty_mediascript' : 'tag_docs.empty_tagscript', {code})}
                </p>
              </div>
            ) : null}

            <aside className='flex flex-col items-start justify-between gap-4 rounded-lg border border-line border-l-[3px] border-l-brand bg-surface p-6 sm:flex-row sm:items-center'>
              <div>
                <h2 className='mb-1 text-lg font-semibold text-white'>{t('tag_docs.inspiration_title')}</h2>
                <p className='text-sm text-muted'>{t('tag_docs.inspiration_description')}</p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Link to={Routes.TAG_DIRECTORY} className='btn btn-secondary'>{t('tag_docs.tag_directory')}</Link>
                <a href={Routes.SUPPORT} className='btn btn-discord'>{t('tag_docs.join_support')}</a>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        // tall enough that the footer doesn't jump up and back down while the translation loads
        <div className='container-page flex min-h-[70vh] justify-center py-24'>
          <Spinner className='size-8' label={t('tag_docs.loading')}/>
        </div>
      )}
    </div>
  );
}


// the guide and reference links: the sidebar on wide screens, the "On this page" menu under the search below that
function SectionLinks({ view, guide, categories, onNavigate }: {
  view: DocsView,
  guide: ReadonlyArray<TagDocGuideSection>,
  categories: ReadonlyArray<{id: string, title: string, count: number}>,
  onNavigate: (id: string) => void,
}) {
  const { t } = useI18n();
  return (
    <>
      {(guide.length) ? (
        <>
          <h2 className='section-label mb-2 px-1'>{t('tag_docs.guide')}</h2>
          <ul className='mb-6 space-y-0.5'>
            {guide.map((section) => (
              <li key={section.id}>
                <SidebarButton onClick={() => onNavigate(guideAnchor(view, section))}>{section.title.replaceAll('`', '')}</SidebarButton>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {(categories.length) ? (
        <>
          <h2 className='section-label mb-2 px-1'>{t('tag_docs.reference')}</h2>
          <ul className='space-y-0.5'>
            {categories.map((category) => (
              <li key={category.id}>
                <SidebarButton onClick={() => onNavigate(categoryAnchor(view, category.id))} count={category.count}>
                  {category.title}
                </SidebarButton>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}


function SidebarButton({ onClick, count, children }: {onClick: () => void, count?: number, children: ReactNode}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-white'
    >
      <span className='min-w-0 truncate'>{children}</span>
      {(count !== undefined) ? <span className='ml-auto shrink-0 pl-2 text-xs text-subtle tabular-nums'>{count}</span> : null}
    </button>
  );
}


// memo, like the two cards below: only a search that has caught up with the input (`highlight`) renders them again
const GuideSection = memo(function GuideSection({ anchor, section, highlight }: {anchor: string, section: TagDocGuideSection, highlight: string}) {
  return (
    <section id={anchor} className='scroll-mt-24 rounded-lg border border-line bg-surface p-5 sm:p-6'>
      <h2 className='group mb-3 flex items-center gap-2 text-xl font-semibold text-white'>
        <span><Inline text={section.title} highlight={highlight}/></span>
        <AnchorLink id={anchor}/>
      </h2>
      <Prose text={section.body} highlight={highlight}/>
      {(section.table) ? (
        <div className='mt-4 overflow-x-auto rounded-md border border-line'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-deep text-xs tracking-wide text-subtle uppercase'>
              <tr>{section.table.columns.map((column) => <th key={column} className='px-3 py-2 font-semibold'>{column}</th>)}</tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, i) => (
                <tr key={i} className='border-t border-line align-top'>
                  {row.map((cell, j) => (
                    <td key={j} className={cn('px-3 py-2', (j === 0) ? 'font-mono text-code whitespace-nowrap' : 'text-fg')}>
                      {(j === 0) ? <Highlight text={cell} query={highlight}/> : <Inline text={cell} highlight={highlight}/>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {(section.examples?.length) ? <Examples examples={section.examples}/> : null}
    </section>
  );
});


const FunctionCard = memo(function FunctionCard({ fn, highlight }: {fn: TagDocFunction, highlight: string}) {
  const { t } = useI18n();
  const anchor = tagFunctionAnchor(fn);
  const [ name, ...aliases ] = fn.names;
  return (
    <article id={anchor} className='scroll-mt-24 rounded-lg border border-line bg-surface p-5'>
      <header className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5'>
        <h3 className='group flex items-center gap-2 font-mono text-lg font-semibold text-white'>
          {/* a long name wraps instead of pushing the page wider than a phone */}
          <span className='min-w-0 wrap-anywhere'>{'{'}<Highlight text={name} query={highlight}/>{'}'}</span>
          <AnchorLink id={anchor}/>
        </h3>
        {(aliases.length) ? (
          <div className='flex flex-wrap gap-1.5'>
            {aliases.map((alias) => (
              <span key={alias} className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-muted'>
                <Highlight text={alias} query={highlight}/>
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <p className='mb-3 text-fg'><Inline text={fn.summary} highlight={highlight}/></p>

      <CodeBlock code={fn.syntax}/>

      {(fn.description) ? <div className='mt-3'><Prose text={fn.description} highlight={highlight}/></div> : null}

      {(fn.args?.length) ? (
        <dl className='mt-4 space-y-2 text-sm'>
          {fn.args.map((arg) => (
            <div key={arg.name} className='flex flex-col gap-0.5 sm:flex-row sm:gap-3'>
              <dt className='shrink-0 font-mono text-code sm:w-36'>
                {arg.name}
                {(arg.optional) ? <span className='ml-1.5 font-sans text-xs text-subtle'>{t('tag_docs.optional')}</span> : null}
              </dt>
              <dd className='text-muted'><Inline text={arg.description} highlight=''/></dd>
            </div>
          ))}
        </dl>
      ) : null}

      {(fn.examples?.length) ? <Examples examples={fn.examples}/> : null}

      {(fn.notes?.length) ? (
        <ul className='mt-4 space-y-1.5 text-sm text-muted'>
          {fn.notes.map((note, i) => (
            <li key={i} className='flex gap-2.5'>
              <span aria-hidden className='mt-2 size-1.5 shrink-0 rounded-full bg-warning'/>
              <span><Inline text={note} highlight=''/></span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
});


const MediaScriptCard = memo(function MediaScriptCard({ command, highlight }: {command: TagDocMediaScriptCommand, highlight: string}) {
  const anchor = mediaScriptCommandAnchor(command);
  return (
    <article id={anchor} className='scroll-mt-24 rounded-lg border border-line bg-surface p-5'>
      <header className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5'>
        <h3 className='group flex items-center gap-2 font-mono text-lg font-semibold text-white'>
          <span className='min-w-0 wrap-anywhere'><Highlight text={command.name} query={highlight}/></span>
          <AnchorLink id={anchor}/>
        </h3>
        {(command.aliases?.length) ? (
          <div className='flex flex-wrap gap-1.5'>
            {command.aliases.map((alias) => (
              <span key={alias} className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-muted'>
                <Highlight text={alias} query={highlight}/>
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <p className='mb-3 text-fg'><Inline text={command.summary} highlight={highlight}/></p>

      <CodeBlock code={command.syntax}/>

      {(command.args?.length) ? (
        <dl className='mt-4 space-y-2 text-sm'>
          {command.args.map((arg, i) => (
            <div key={i} className='flex flex-col gap-0.5 sm:flex-row sm:gap-3'>
              <dt className='shrink-0 font-mono text-code sm:w-40'>
                {(arg.rest) ? '...' : null}{arg.name}
                {(arg.default !== undefined) ? <span className='ml-1.5 text-xs text-subtle'>= {arg.default}</span> : null}
              </dt>
              <dd className='text-muted'>
                {(arg.description) ? <Inline text={arg.description} highlight=''/> : null}
                {(arg.range) ? (
                  <span className={cn('text-xs text-subtle', arg.description && 'ml-2')}>
                    <Inline text={`\`${arg.range}\``} highlight=''/>
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {(command.examples?.length) ? <Examples examples={command.examples}/> : null}

      {(command.notes?.length) ? (
        <ul className='mt-4 space-y-1.5 text-sm text-muted'>
          {command.notes.map((note, i) => (
            <li key={i} className='flex gap-2.5'>
              <span aria-hidden className='mt-2 size-1.5 shrink-0 rounded-full bg-warning'/>
              <span><Inline text={note} highlight=''/></span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
});


function Examples({ examples }: {examples: Array<TagDocExample>}) {
  const { t } = useI18n();
  return (
    <div className='mt-4 space-y-3'>
      <h4 className='section-label'>{(examples.length === 1) ? t('tag_docs.example') : t('tag_docs.examples')}</h4>
      {examples.map((example, i) => (
        <div key={i} className='overflow-hidden rounded-md border border-line'>
          <CodeBlock code={example.code} bare/>
          {(example.result) ? (
            <div className='border-t border-line bg-surface-2 px-3 py-2 text-sm text-muted'>
              <span className='mr-2 text-subtle select-none'>→</span>
              <Inline text={example.result} highlight=''/>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}


// the copy button and `AnchorLink` only show on hover with a mouse; a touch screen has no hover, so they're always there
function CodeBlock({ code, bare }: {code: string, bare?: boolean}) {
  const { t } = useI18n();
  // a blocked clipboard just doesn't show the check
  const { copied, copy } = useCopied();
  return (
    <div className={cn('group relative bg-deep', !bare && 'rounded-md')}>
      <pre className='overflow-x-auto px-3 py-2.5 pr-10 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-code'>{code}</pre>
      <button
        type='button'
        onClick={() => copy(code)}
        aria-label={t('tag_docs.copy_code')}
        className='absolute top-1.5 right-1.5 cursor-pointer rounded p-1.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-white focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
      >
        {(copied) ? <Check className='size-3.5 text-success-text'/> : <Copy className='size-3.5'/>}
      </button>
    </div>
  );
}


function AnchorLink({ id }: {id: string}) {
  const { t } = useI18n();
  return (
    <a
      href={`#${id}`}
      aria-label={t('tag_docs.anchor_link')}
      className='text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-white focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
    >
      <Link2 className='size-4'/>
    </a>
  );
}


// ---- tiny markup renderer: paragraphs split by blank lines, `- ` lists, and `inline code` ----

function Prose({ text, highlight }: {text: string, highlight: string}) {
  return (
    <div className='space-y-3 leading-relaxed text-fg'>
      {text.split('\n\n').map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((line) => line.startsWith('- '))) {
          return (
            <ul key={i} className='space-y-1.5 pl-1'>
              {lines.map((line, j) => (
                <li key={j} className='flex gap-2.5'>
                  <span aria-hidden className='mt-2.5 size-1.5 shrink-0 rounded-full bg-brand'/>
                  <span><Inline text={line.slice(2)} highlight={highlight}/></span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} className='whitespace-pre-line'><Inline text={block} highlight={highlight}/></p>;
      })}
    </div>
  );
}


const INLINE_PATTERN = /(`[^`]+`)/g;

function Inline({ text, highlight }: {text: string, highlight: string}) {
  return (
    <>
      {text.split(INLINE_PATTERN).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && 2 < part.length) {
          return <code key={i} className='rounded bg-deep box-decoration-clone px-1.5 py-0.5 font-mono text-[0.85em] wrap-anywhere text-code'>{part.slice(1, -1)}</code>;
        }
        return <Fragment key={i}><Highlight text={part} query={highlight}/></Fragment>;
      })}
    </>
  );
}


function Highlight({ text, query }: {text: string, query: string}) {
  if (!query) {
    return <>{text}</>;
  }
  const lower = text.toLowerCase();
  const parts: Array<ReactNode> = [];
  let index = 0;
  while (index < text.length) {
    const found = lower.indexOf(query, index);
    if (found === -1) {
      parts.push(text.slice(index));
      break;
    }
    if (index < found) {
      parts.push(text.slice(index, found));
    }
    parts.push(<mark key={found} className='rounded-sm bg-warning/30 px-0.5 text-white'>{text.slice(found, found + query.length)}</mark>);
    index = found + query.length;
  }
  return <>{parts}</>;
}
