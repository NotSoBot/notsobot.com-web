// The Activity's "How to play" sheet: a guide's quick rules, then its sections folded up, read from the same content as
// notsobot.com/guides (src/content/guides). `guide:` links switch the sheet to that guide (and open the section they
// name), site paths and the "Full guide" button open notsobot.com outside the Activity through the host's
// `openExternal` (GuideLinksProvider: Discord's openExternalLink in the Activity, a new tab anywhere else), in the
// viewer's language (`/es/`, `/pt/`).
// HowToPlayButton is the entry point: a question mark icon button that opens the sheet. Nothing opens it on its own (it
// used to, the first time, and that got in the way of what people came to do): with `markUnseen` the button carries a
// dot until its guide's been opened once, and a game's lobby has its own folding card (HowToPlayCard)
import { ChevronDown, CircleHelp, ExternalLink, RotateCw } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { GUIDE_SLUGS, loadedGuides, loadGuides, parseGuideLink, type GuideBook, type GuideSlug } from '@/content/guides';
import { languagePath, useI18n, type Language } from '@/i18n';
import { useActivityPrefs } from '@/lib/activityPrefs';
import { cn } from '@/lib/utils';
import { guidePath } from '@/pages/guides/guideRoutes';

import { GuideBlocks, GuideInline, GuideQuickRules, type GuideLinkRenderer } from './GuideBlocks';


const SITE_URL = 'https://notsobot.com';
// the guides someone has opened, per guide (`<key><slug>`). The old key is from when a guide opened on its own the first
// time: someone it opened for has seen it
const OPENED_STORAGE_KEY = 'nsb.activity.guide_opened.';
const OLD_SEEN_STORAGE_KEY = 'nsb.activity.guide_seen.';
const LINK_CLASS = 'font-medium text-brand-text underline underline-offset-4 hover:no-underline';


type OpenExternal = (url: string) => void;

// outside the Activity (the dev mocks) a link opens in a new tab
const openInNewTab: OpenExternal = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const OpenExternalContext = createContext<OpenExternal>(openInNewTab);

// how the sheets under it open notsobot.com: the Activity passes Discord's openExternalLink, a plain link inside
// Discord's iframe goes nowhere
export function GuideLinksProvider({ openExternal, children }: {openExternal?: OpenExternal, children: ReactNode}) {
  return <OpenExternalContext.Provider value={openExternal ?? openInNewTab}>{children}</OpenExternalContext.Provider>;
}


function siteUrl(language: Language, path: string): string {
  return `${SITE_URL}${languagePath(language, path)}`;
}


// guides opened this session, so storage that's blocked still drops a dot once it's opened
const openedThisSession = new Set<GuideSlug>();
const openedListeners = new Set<() => void>();

// Whether someone's opened a guide before. Storage that throws (private windows, blocked site data) counts as opened:
// a dot that could never go away for good would be the nag the dot replaces
function guideOpened(slug: GuideSlug): boolean {
  if (openedThisSession.has(slug)) {
    return true;
  }
  try {
    return Boolean(window.localStorage.getItem(`${OPENED_STORAGE_KEY}${slug}`) || window.localStorage.getItem(`${OLD_SEEN_STORAGE_KEY}${slug}`));
  } catch {
    return true;
  }
}

function markGuideOpened(slug: GuideSlug): void {
  if (openedThisSession.has(slug)) {
    return;
  }
  openedThisSession.add(slug);
  try {
    window.localStorage.setItem(`${OPENED_STORAGE_KEY}${slug}`, '1');
  } catch {
    // remembered for this session only
  }
  openedListeners.forEach((listener) => listener());
}

function subscribeOpened(listener: () => void): () => void {
  openedListeners.add(listener);
  return () => {
    openedListeners.delete(listener);
  };
}

// Settings' "Show tips again": every guide's dot comes back
export function forgetOpenedGuides(): void {
  openedThisSession.clear();
  try {
    for (const slug of GUIDE_SLUGS) {
      window.localStorage.removeItem(`${OPENED_STORAGE_KEY}${slug}`);
      window.localStorage.removeItem(`${OLD_SEEN_STORAGE_KEY}${slug}`);
    }
  } catch {
    // nothing was stored
  }
  openedListeners.forEach((listener) => listener());
}

// every button of a guide drops its dot together, wherever the guide was opened from
function useGuideOpened(slug: GuideSlug): boolean {
  return useSyncExternalStore(subscribeOpened, () => guideOpened(slug), () => true);
}


// the guides in a language: right away when they've loaded before, otherwise their chunk. Another language's chunk that
// fails gives the English guides (loadGuides), so this only fails when the English ones do
export function useGuideBook(language: Language) {
  const [ fetched, setFetched ] = useState<{language: Language, book: GuideBook} | null>(null);
  const [ failed, setFailed ] = useState(false);
  const [ attempt, setAttempt ] = useState(0);
  const book = loadedGuides(language) ?? ((fetched?.language === language) ? fetched.book : null);

  useEffect(() => {
    if (loadedGuides(language)) {
      return;
    }
    let alive = true;
    loadGuides(language).then((loaded) => {
      if (alive) {
        setFetched({language, book: loaded});
        setFailed(false);
      }
    }, () => {
      if (alive) {
        setFailed(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [language, attempt]);

  return {
    book,
    failed: failed && !book,
    retry: () => {
      setFailed(false);
      setAttempt((value) => value + 1);
    },
  };
}


function openLabel(slug: GuideSlug) {
  return (slug === 'media-editor') ? 'guides.sheet.open_editor' as const : 'guides.sheet.open_game' as const;
}


// a question mark that opens the guide's sheet. `markUnseen`: a dot on it until the guide's been opened once (per viewer),
// for the screens people land on before playing
export function HowToPlayButton({ guide, markUnseen = false, className }: {guide: GuideSlug, markUnseen?: boolean, className?: string}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  const opened = useGuideOpened(guide);
  // the dots can be turned off in the Activity's settings
  const { guideDots } = useActivityPrefs();
  const dot = markUnseen && guideDots && !opened;

  const label = t(openLabel(guide));
  return (
    <>
      <button
        type='button'
        aria-label={(dot) ? t('guides.sheet.unopened', {label}) : label}
        title={label}
        aria-haspopup='dialog'
        onClick={() => setOpen(true)}
        className={cn('relative flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg', className)}
      >
        <CircleHelp aria-hidden className='size-5'/>
        {(dot) ? <span aria-hidden className='absolute top-1.5 right-1.5 size-2.5 rounded-full bg-brand ring-2 ring-bg'/> : null}
      </button>
      {(open) ? <GuideSheet guide={guide} onClose={() => setOpen(false)}/> : null}
    </>
  );
}


// The sheet: held at the top of the window (it grows as sections open), scrolling inside the dialog's overlay on phones
export function GuideSheet({ guide: firstGuide, onClose }: {guide: GuideSlug, onClose: () => void}) {
  const { t, language } = useI18n();
  const openExternal = useContext(OpenExternalContext);
  const titleId = useId();
  const idPrefix = useId();
  const headerRef = useRef<HTMLElement>(null);
  const switcherRef = useRef<HTMLElement>(null);
  const { book, failed, retry } = useGuideBook(language);
  // the guide shown, and the section a `guide:<slug>#<section>` link asked for
  const [ shown, setShown ] = useState<{slug: GuideSlug, section: string | null, switched: boolean, link: boolean}>({slug: firstGuide, section: null, switched: false, link: false});
  // the sections unfolded, of the guide shown
  const [ expanded, setExpanded ] = useState<ReadonlySet<string>>(() => new Set());
  const guide = book?.guides[shown.slug] ?? null;

  // opened from anywhere (a ? button, a lobby's card, a chip in here): that guide's dots go
  useEffect(() => {
    markGuideOpened(shown.slug);
  }, [shown.slug]);

  // `link`: from a link in the text (it's gone once the guide changes), a chip keeps its focus
  const showGuide = (slug: GuideSlug, section: string | null, link: boolean) => {
    setShown({slug, section, switched: true, link});
    setExpanded(new Set((section) ? [section] : []));
  };

  // after a switch: the section asked for, or the new guide's top. focus follows a link's, the link that was pressed is gone
  useEffect(() => {
    if (!shown.switched || !guide) {
      return;
    }
    const section = (shown.section) ? document.getElementById(`${idPrefix}-${shown.section}`) : null;
    const target = section ?? headerRef.current;
    target?.scrollIntoView({block: 'start'});
    if (shown.link) {
      (section?.querySelector('button') ?? document.getElementById(titleId))?.focus({preventScroll: true});
    }
  }, [shown, guide, idPrefix, titleId]);

  // the guide shown's chip in view: the switcher scrolls sideways on phones, and the editor's is last
  const ready = Boolean(book);
  useEffect(() => {
    const switcher = switcherRef.current;
    const chip = switcher?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (switcher && chip && (chip.offsetLeft < switcher.scrollLeft || switcher.scrollLeft + switcher.clientWidth < chip.offsetLeft + chip.offsetWidth)) {
      switcher.scrollLeft = chip.offsetLeft - (switcher.clientWidth - chip.offsetWidth) / 2;
    }
  }, [shown.slug, ready]);

  const renderLink: GuideLinkRenderer = (href, children) => {
    const target = parseGuideLink(href);
    if (target) {
      return <button type='button' className={LINK_CLASS} onClick={() => showGuide(target.slug, target.section, true)}>{children}</button>;
    }
    const url = (href.startsWith('/')) ? siteUrl(language, href) : href;
    return (
      <a
        href={url}
        target='_blank'
        rel='noreferrer'
        className={LINK_CLASS}
        onClick={(event) => {
          event.preventDefault();
          openExternal(url);
        }}
      >
        {children}
      </a>
    );
  };

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Modal anchor='top' labelledBy={titleId} onClose={onClose} stickyClose className='max-w-lg'>
      <div className='flex flex-col gap-4 p-4 sm:p-6'>
        <header ref={headerRef} className='flex scroll-mt-12 flex-col gap-1 pr-10'>
          <p className='section-label'>{t('guides.sheet.guide')}</p>
          <h2 id={titleId} tabIndex={-1} className='font-display text-xl font-bold text-white outline-none'>{guide?.title ?? t(openLabel(shown.slug))}</h2>
          {/* a line's height kept while loading, so the switcher below doesn't move when it comes */}
          <p className='min-h-5 text-sm text-muted'>{guide?.summary ?? ' '}</p>
        </header>

        {(!book) ? (
          // as tall as a guide's first screen, so it doesn't jump when the guide comes
          <div aria-busy className='flex h-[28rem] flex-col gap-3' role='status'>
            <span className='sr-only'>{t('guides.sheet.loading')}</span>
            {(failed) ? (
              <div className='flex flex-col items-start gap-3'>
                <DialogError>{t('guides.sheet.failed')}</DialogError>
                <button type='button' className='btn btn-secondary' onClick={retry}>
                  <RotateCw aria-hidden className='size-4'/>{t('guides.sheet.retry')}
                </button>
              </div>
            ) : (
              <>
                <div aria-hidden className='flex gap-2'>
                  {[0, 1, 2].map((index) => <span key={index} className='h-9 w-28 animate-pulse rounded-full bg-surface'/>)}
                </div>
                <div aria-hidden className='h-56 animate-pulse rounded-lg bg-surface'/>
                <div aria-hidden className='flex-1 animate-pulse rounded-lg bg-surface'/>
              </>
            )}
          </div>
        ) : (
          <>
            <nav ref={switcherRef} aria-label={t('guides.list_label')} className='relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6'>
              {GUIDE_SLUGS.map((slug) => (
                <button
                  key={slug}
                  type='button'
                  aria-pressed={slug === shown.slug}
                  onClick={() => showGuide(slug, null, false)}
                  className={cn(
                    'min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                    (slug === shown.slug) ? 'border-brand bg-brand/20 text-white' : 'border-line-strong text-muted hover:bg-surface hover:text-fg',
                  )}
                >
                  {book.guides[slug].title}
                </button>
              ))}
            </nav>

            {(guide) ? (
              <>
                <GuideQuickRules rules={guide.quick} renderLink={renderLink} compact/>
                <section aria-labelledby={`${idPrefix}-details`} className='flex flex-col gap-2'>
                  <h3 id={`${idPrefix}-details`} className='section-label'>{t('guides.sheet.details')}</h3>
                  <ul className='overflow-hidden rounded-lg border border-line bg-surface'>
                    {guide.sections.map((section, index) => {
                      const open = expanded.has(section.id);
                      const bodyId = `${idPrefix}-${section.id}-body`;
                      return (
                        <li key={section.id} id={`${idPrefix}-${section.id}`} className={cn('scroll-mt-12', 0 < index && 'border-t border-line')}>
                          <h4>
                            <button
                              type='button'
                              aria-expanded={open}
                              aria-controls={bodyId}
                              onClick={() => toggle(section.id)}
                              className='flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-semibold text-white transition-colors hover:bg-surface-2'
                            >
                              <span className='min-w-0'>{section.title}</span>
                              <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}/>
                            </button>
                          </h4>
                          {(open) ? (
                            <div id={bodyId} className='border-t border-line bg-bg/40 px-4 py-4 text-sm'>
                              <GuideBlocks blocks={section.blocks} renderLink={renderLink}/>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            ) : null}

            <button type='button' className='btn btn-secondary w-full' onClick={() => openExternal(siteUrl(language, guidePath(shown.slug)))}>
              <ExternalLink aria-hidden className='size-4'/>{t('guides.sheet.full')}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}


// A game lobby's "How to play": a few of the guide's quick rules (`rules`, indexes into its `quick`) in a card that folds
// to one line, and a link to the whole sheet. In the lobby, where people wait for the host anyway, instead of a sheet
// over the room list. Whether it's open is the lobby's (it starts open until someone's finished a game of it)
export function HowToPlayCard({ guide: slug, rules, open, onToggle, className }: {
  guide: GuideSlug,
  rules: ReadonlyArray<number>,
  open: boolean,
  onToggle: () => void,
  className?: string,
}) {
  const { t, language } = useI18n();
  const openExternal = useContext(OpenExternalContext);
  const { book, failed, retry } = useGuideBook(language);
  const [ sheet, setSheet ] = useState<GuideSlug | null>(null);
  const bodyId = useId();
  const guide = book?.guides[slug] ?? null;
  const shown = (guide) ? rules.map((index) => guide.quick[index]).filter((rule): rule is string => Boolean(rule)) : [];

  const renderLink: GuideLinkRenderer = (href, children) => {
    const target = parseGuideLink(href);
    if (target) {
      return <button type='button' className={LINK_CLASS} onClick={() => setSheet(target.slug)}>{children}</button>;
    }
    const url = (href.startsWith('/')) ? siteUrl(language, href) : href;
    return (
      <a href={url} target='_blank' rel='noreferrer' className={LINK_CLASS} onClick={(event) => { event.preventDefault(); openExternal(url); }}>
        {children}
      </a>
    );
  };

  return (
    <section className={cn('rounded-xl border border-line-strong bg-surface', className)}>
      <h2>
        <button
          type='button'
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className='flex min-h-12 w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-surface-2'
        >
          <CircleHelp aria-hidden className='size-4 shrink-0 text-brand-text'/>
          <span className='min-w-0 flex-1'>{t(openLabel(slug))}</span>
          <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}/>
        </button>
      </h2>
      {(open) ? (
        <div id={bodyId} className='flex flex-col gap-3 border-t border-line px-4 pt-3 pb-4'>
          {(guide) ? (
            <ol className='flex flex-col gap-2 text-sm leading-relaxed text-fg'>
              {shown.map((rule, index) => (
                <li key={index} className='flex gap-2.5'>
                  <span aria-hidden className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[0.7rem] font-semibold text-brand-text tabular-nums'>{index + 1}</span>
                  <span className='min-w-0'><GuideInline text={rule} renderLink={renderLink}/></span>
                </li>
              ))}
            </ol>
          ) : (failed) ? (
            <div className='flex flex-wrap items-center gap-3'>
              <DialogError>{t('guides.sheet.failed')}</DialogError>
              <button type='button' className='btn btn-secondary btn-sm' onClick={retry}>
                <RotateCw aria-hidden className='size-4'/>{t('guides.sheet.retry')}
              </button>
            </div>
          ) : (
            // about the rules' height, so the lobby under it doesn't move when they come
            <div aria-busy role='status' className='flex flex-col gap-2'>
              <span className='sr-only'>{t('guides.sheet.loading')}</span>
              {rules.map((index) => <span key={index} aria-hidden className='h-5 animate-pulse rounded bg-surface-3'/>)}
            </div>
          )}
          <button type='button' className={cn(LINK_CLASS, 'self-start text-sm')} onClick={() => setSheet(slug)}>
            {t('guides.sheet.all_rules')}
          </button>
        </div>
      ) : null}
      {(sheet) ? <GuideSheet guide={sheet} onClose={() => setSheet(null)}/> : null}
    </section>
  );
}
