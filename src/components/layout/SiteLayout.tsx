import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useMatches } from 'react-router';

import { Routes } from '@/config';
import { hasTranslation, useI18n } from '@/i18n';
import type { RouteHandle } from '@/router';
import { NOT_FOUND_PAGE, PAGES, pageTitle, type PageMeta } from '@/seo';

import { Footer } from './Footer';
import { Navbar } from './Navbar';


const SCROLL_BY_PATH: ReadonlySet<string> = new Set([Routes.DASHBOARD_TAGS]);

// where the skip link sends focus
const MAIN_ID = 'main';


// handles are the PAGES entries themselves, so the entry's key finds its translated title
const PAGE_KEYS: ReadonlyMap<PageMeta, string> = new Map([
  ...Object.entries(PAGES).map(([ key, page ]) => [page, key] as const),
  [NOT_FOUND_PAGE, 'NOT_FOUND'],
]);


function usePageTitle(): string {
  const { t } = useI18n();
  const matches = useMatches();
  for (let i = matches.length - 1; 0 <= i; i--) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (handle?.title) {
      // a server's pages are child routes of its page, and take their tab's name ("Music", "Warnings") so several open
      // at once can be told apart
      if (handle === PAGES.DASHBOARD_SERVER && i < matches.length - 1) {
        const tab = `server_tab.${matches[matches.length - 1].pathname.replace(/\/+$/, '').split('/').pop()}`;
        if (hasTranslation(tab)) {
          return pageTitle({...handle, title: t(tab)});
        }
      }
      // pages without a translation (the staff ones) keep their English title
      const key = `page.${PAGE_KEYS.get(handle)}`;
      return pageTitle((hasTranslation(key)) ? {...handle, title: t(key)} : handle);
    }
  }
  return pageTitle(undefined);
}


export function SiteLayout() {
  const { t } = useI18n();
  const mainRef = useRef<HTMLElement>(null);
  const title = usePageTitle();
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className='flex min-h-dvh flex-col'>
      {/* the first thing Tab reaches, kept above the screen until it's focused: keyboard and screen reader users get
          past the navbar without tabbing through it. focus is moved by hand so the url keeps its own hash (changelog
          and legal anchors), the href is what works before the app has loaded */}
      <a
        href={`#${MAIN_ID}`}
        className='btn btn-primary fixed top-3 left-3 z-50 -translate-y-16 focus:translate-y-0'
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t('nav.skip')}
      </a>
      <Navbar/>
      {/* focusable only from the link above, so no outline around the whole page */}
      <main ref={mainRef} id={MAIN_ID} tabIndex={-1} className='flex-1 outline-none'>
        <Outlet/>
      </main>
      <Footer/>
      {/* Normally each history entry keeps its own scroll position. Pages listed here keep one position per
          path instead, so coming back to them any way (link, sidebar, back button) lands where you left off. */}
      <ScrollRestoration getKey={(location) => (SCROLL_BY_PATH.has(location.pathname)) ? location.pathname : location.key}/>
    </div>
  );
}
