// The Activity's "How to play" sheet: a guide's quick rules, then its sections folded up, read from the same content as
// notsobot.com/guides (src/content/guides). `guide:` links switch the sheet to that guide (and open the section they
// name), site paths and the "Full guide" button open notsobot.com outside the Activity through the host's
// `openExternal` (GuideLinksProvider: Discord's openExternalLink in the Activity, a new tab anywhere else), in the
// viewer's language (`/es/`, `/pt/`).
// HowToPlayButton is the entry point: a question mark icon button that opens the sheet, and with `autoOpen` opens it on
// its own the first time someone gets there (once per guide per viewer, see `firstVisit`)
import { ChevronDown, CircleHelp, ExternalLink, RotateCw } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { GUIDE_SLUGS, loadedGuides, loadGuides, parseGuideLink, type GuideBook, type GuideSlug } from '@/content/guides';
import { languagePath, useI18n, type Language } from '@/i18n';
import { cn } from '@/lib/utils';
import { guidePath } from '@/pages/guides/guideRoutes';

import { GuideBlocks, GuideQuickRules, type GuideLinkRenderer } from './GuideBlocks';


const SITE_URL = 'https://notsobot.com';
// the guides someone has seen open on their own, per guide (`<key><slug>`)
const SEEN_STORAGE_KEY = 'nsb.activity.guide_seen.';
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


// guides already opened on their own this session, so blocked storage still opens each one at most once
const seenThisSession = new Set<GuideSlug>();

// Whether this is someone's first time at a guide's screen, remembered in local storage. Storage that throws (private
// windows, blocked site data) doesn't nag on every visit: once a session, from memory
function firstVisit(slug: GuideSlug): boolean {
  if (seenThisSession.has(slug)) {
    return false;
  }
  seenThisSession.add(slug);
  try {
    if (window.localStorage.getItem(`${SEEN_STORAGE_KEY}${slug}`)) {
      return false;
    }
    window.localStorage.setItem(`${SEEN_STORAGE_KEY}${slug}`, '1');
    return true;
  } catch {
    return true;
  }
}


// the guides in a language: right away when they've loaded before, otherwise their chunk. Another language's chunk that
// fails gives the English guides (loadGuides), so this only fails when the English ones do
function useGuideBook(language: Language) {
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


// a question mark that opens the guide's sheet. `autoOpen`: opens it as it first shows, the first time ever (per viewer
// and guide), for a screen people land on before playing
export function HowToPlayButton({ guide, autoOpen = false, className }: {guide: GuideSlug, autoOpen?: boolean, className?: string}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);

  useEffect(() => {
    if (autoOpen && firstVisit(guide)) {
      setOpen(true);
    }
  }, [autoOpen, guide]);

  const label = t(openLabel(guide));
  return (
    <>
      <button
        type='button'
        aria-label={label}
        title={label}
        aria-haspopup='dialog'
        onClick={() => setOpen(true)}
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg', className)}
      >
        <CircleHelp aria-hidden className='size-5'/>
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
