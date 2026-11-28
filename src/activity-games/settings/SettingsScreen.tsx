import { QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, type LucideIcon } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createMemoryRouter,
  matchRoutes,
  NavLink,
  RouterProvider,
  useLocation,
  useNavigate,
  useRouteError,
  type RouteObject,
} from 'react-router';

import { AuthProvider } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';
import { config } from '@/config';
import { useI18n } from '@/i18n';
import { isChunkLoadError } from '@/lib/chunkReload';
import { createQueryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

import { ActivitySettingsHostContext, useActivitySettingsHost, type ActivitySettingsHost } from './context';


// What the Activity's dashboard screens share (Server settings, src/activity-games/server, and Your settings,
// src/activity-games/user): the dashboard's own pages under a memory router, in a frame that fits Discord's window. The
// site's api client talks to the api through Discord's proxy and with the Activity's token (both set at sign-in), so the
// dashboard's queries and saves work as they are.
// Links to the site's other pages, and anything outside notsobot.com, open in the browser (`openExternal`): a link
// followed inside the iframe would leave the Activity for a page Discord's proxy doesn't serve


// one cache for as long as the Activity is open, both screens: going back to the mode choice and in again (or into the
// other one) shows what was loaded. A screen seeds it with what the mode choice already has
export const settingsQueryClient = createQueryClient();

// the site serves the api under `/api`, where its links (an api url the Activity built on its proxy path) go
const SITE_API_BASE = '/api';

// Back goes through this route so a page's unsaved edits ask first (`UnsavedChangesGuard` guards route changes)
const LEAVE_PATH = '/leave';


export type SettingsRouter = ReturnType<typeof createMemoryRouter>;

// which of the two screens a frame is (the Activity's own names for them), and where it is: its first page's code or
// whose settings these are still loading, there, or not loaded. On the frame's element as `data-screen` and
// `data-state`, for a test or an agent to read (a form's own state is on its save bar)
export type SettingsScreenName = 'server_settings' | 'user_settings';
export type SettingsFrameState = 'loading' | 'ready' | 'error';

const FRAME = 'mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-4xl flex-col gap-4 px-4 pt-3 pb-[calc(1.5rem+var(--saib,0px))]';
const BACK = '-ml-2 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg';


// `createRouter` makes the screen's router once (`createSettingsRouter`), it's where a screen seeds the cache too
export function SettingsScreen({ siteUrl, openExternal, onBack, createRouter }: ActivitySettingsHost & {createRouter: () => SettingsRouter}) {
  // the latest callbacks, for the router made once below
  const latest = useRef({openExternal, onBack});
  latest.current = {openExternal, onBack};
  const host = useMemo<ActivitySettingsHost>(() => ({
    siteUrl,
    openExternal: (url) => latest.current.openExternal(url),
    onBack: () => latest.current.onBack(),
  }), [siteUrl]);

  const [ router ] = useState(createRouter);
  useSiteLinks(router, host);

  return (
    <QueryClientProvider client={settingsQueryClient}>
      <AuthProvider>
        <ActivitySettingsHostContext.Provider value={host}>
          <ToastProvider>
            <RouterProvider router={router}/>
          </ToastProvider>
        </ActivitySettingsHostContext.Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}


// `layout`: the screen's own layout route over the dashboard's pages (their paths unchanged, so the pages' links to each
// other stay inside), opening on `initialPath`. Back's route and the site's other pages go next to it
export function createSettingsRouter(screen: SettingsScreenName, layout: RouteObject, initialPath: string): SettingsRouter {
  const routes: Array<RouteObject> = [
    {
      ...layout,
      errorElement: <SettingsRouteError/>,
      // while the first page's code loads
      HydrateFallback: () => <SettingsLoading screen={screen}/>,
    },
    {path: LEAVE_PATH, element: <Leave/>},
    // anywhere else is one of the site's pages, reached by a page's own navigate() (links never get here, see
    // `useSiteLinks`)
    {path: '*', element: <SitePage/>},
  ];
  return createMemoryRouter(routes, {initialEntries: [initialPath]});
}


// Where a link inside the Activity really goes: null for the memory router's own pages (and anything that isn't a web
// page), otherwise the url to open in the browser. The api's urls are built on the Activity's proxy path
function externalUrl(router: SettingsRouter, siteUrl: string, href: string): string | null {
  if (href.startsWith('#')) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  if (url.origin !== window.location.origin) {
    return url.href;
  }
  const rest = url.search + url.hash;
  if (url.pathname.startsWith(`${config.apiBase}/`)) {
    return `${siteUrl}${SITE_API_BASE}${url.pathname.slice(config.apiBase.length)}${rest}`;
  }
  const matches = matchRoutes(router.routes, url.pathname);
  if (matches?.length && !matches.some(({ route }) => route.path === '*')) {
    return null;
  }
  return `${siteUrl}${url.pathname}${rest}`;
}


// Clicks on links to anything but the screen's pages open them in the browser through the sdk instead. On the
// document, in the capture phase: before React's own handlers (a router `Link` doesn't navigate once the default is
// prevented), and for links in dialogs too, which are portals outside this screen's element. Only this screen is on the
// page while it's open. A middle click or one with a modifier on a page's own link stays in the memory router rather
// than opening the Activity in a new window
function useSiteLinks(router: SettingsRouter, host: ActivitySettingsHost) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || (event.type === 'click' && event.button !== 0) || (event.type === 'auxclick' && event.button !== 1)) {
        return;
      }
      const anchor = (event.target instanceof Element) ? event.target.closest('a[href]') : null;
      const href = anchor?.getAttribute('href');
      if (!anchor || !href || anchor.hasAttribute('download')) {
        return;
      }
      const url = externalUrl(router, host.siteUrl, href);
      if (url) {
        event.preventDefault();
        host.openExternal(url);
      } else if (!href.startsWith('#') && (event.type === 'auxclick' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        event.preventDefault();
        void router.navigate(href);
      }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
    };
  }, [router, host]);
}


// the first page's code is on its way: the frame's Back where it'll be (straight out, nothing's open to ask about), so
// a slow load isn't a spinner with no way out
function SettingsLoading({ screen }: {screen: SettingsScreenName}) {
  const { t } = useI18n();
  const { onBack } = useActivitySettingsHost();
  return (
    <div data-screen={screen} data-state='loading' className={FRAME}>
      <div className='flex items-center'>
        <button type='button' onClick={onBack} className={BACK}>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
        </button>
      </div>
      <div aria-busy='true' className='flex flex-1 items-center justify-center'><Spinner/></div>
    </div>
  );
}


// A screen's layout around its pages: Back and the full dashboard's link (`dashboardUrl`) on top, then the screen's own
// header, tabs and page (`children`). `state`: whether whose settings these are (the server, the person) has loaded
export function SettingsFrame({ screen, state, dashboardUrl, children }: {
  screen: SettingsScreenName,
  state: SettingsFrameState,
  dashboardUrl: string,
  children: ReactNode,
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div data-screen={screen} data-state={state} className={FRAME}>
      <div className='flex items-center justify-between gap-2'>
        <button type='button' onClick={() => navigate(LEAVE_PATH)} className={BACK}>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
        </button>
        {/* opened in the browser by `useSiteLinks` */}
        <a
          href={dashboardUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='-mr-2 inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-surface hover:text-fg'
        >
          <span className='truncate'>{t('activity.server.open_dashboard')}</span>
          <ExternalLink aria-hidden className='size-3.5 shrink-0'/>
        </a>
      </div>
      {children}
    </div>
  );
}


// whose settings these are: a picture, their name and which screen this is. `heading`: the name is the page's <h1>,
// when the pages under it don't have their own
export function SettingsTitle({ media, title, subtitle, heading }: {media: ReactNode, title: string, subtitle: string, heading: boolean}) {
  const Title = (heading) ? 'h1' : 'p';
  return (
    <header className='flex min-w-0 items-center gap-3'>
      {media}
      <div className='min-w-0'>
        <Title className='truncate font-display text-2xl font-semibold text-white' title={title}>{title}</Title>
        <p className='text-sm text-muted'>{subtitle}</p>
      </div>
    </header>
  );
}


export interface SettingsTab {
  id: string,
  // a route of the screen's, or with `external` a page opened in the browser (by `useSiteLinks`)
  to: string,
  label: string,
  icon: LucideIcon,
  color: string,
  // only active on exactly its url, not the pages under it
  end?: boolean,
  external?: boolean,
}


// a tab, and one that isn't the open page (an external one never is)
const TAB = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors';
const TAB_IDLE = 'border-line-strong bg-surface text-muted hover:bg-surface-2 hover:text-fg';


// Every one of a screen's pages in a row that scrolls sideways, in the dashboard sidebar's groups (a line between
// them). `relative`: the offsets below are the strip's own
export function SettingsTabStrip({ label, groups }: {label: string, groups: ReadonlyArray<ReadonlyArray<SettingsTab>>}) {
  const strip = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // the open page's tab in the middle when it can be: the first page isn't always the strip's first tab, and it can be
  // past the edge on a phone. Set on the strip itself, `scrollIntoView` would scroll the page too
  useLayoutEffect(() => {
    const element = strip.current;
    const active = element?.querySelector<HTMLElement>('[aria-current="page"]');
    if (element && active) {
      element.scrollLeft = active.offsetLeft - (element.clientWidth - active.offsetWidth) / 2;
    }
  }, [pathname]);
  return (
    <nav ref={strip} aria-label={label} className='relative -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]'>
      {groups.map((tabs, index) => (
        <Fragment key={index}>
          {(index) ? <span aria-hidden className='mx-0.5 h-5 w-px shrink-0 bg-line-strong'/> : null}
          {tabs.map(({ id, to, label, icon: Icon, color, end, external }) => (external) ? (
            <a key={id} href={to} target='_blank' rel='noopener noreferrer' className={cn(TAB, TAB_IDLE)}>
              <Icon aria-hidden className='size-4 shrink-0' style={{color}}/>
              {label}
              <ExternalLink aria-hidden className='size-3.5 shrink-0 text-subtle'/>
            </a>
          ) : (
            <NavLink
              key={id}
              to={to}
              end={end}
              className={({ isActive }) => cn(TAB, (isActive) ? 'border-brand bg-brand/15 text-white' : TAB_IDLE)}
            >
              <Icon aria-hidden className='size-4 shrink-0' style={{color}}/>
              {label}
            </NavLink>
          ))}
        </Fragment>
      ))}
    </nav>
  );
}


// a page that broke while rendering (or whose code didn't load)
function SettingsRouteError() {
  const { t } = useI18n();
  const { onBack } = useActivitySettingsHost();
  const error = useRouteError();
  // production builds swallow this otherwise
  useEffect(() => console.error('[activity settings] route error', error), [error]);
  return (
    <FullPageMessage title={t('route_error.title')} description={t((isChunkLoadError(error)) ? 'route_error.chunk' : 'route_error.description')}>
      <div className='flex gap-2'>
        <button type='button' className='btn btn-secondary' onClick={onBack}>{t('games.choice.back')}</button>
        <button type='button' className='btn btn-primary' onClick={() => window.location.reload()}>{t('common.reload')}</button>
      </div>
    </FullPageMessage>
  );
}


// Back, once nothing unsaved stopped it
function Leave() {
  const { onBack } = useActivitySettingsHost();
  useEffect(() => {
    onBack();
  }, [onBack]);
  return null;
}


// one of the site's pages, from a page's own navigate(): opened in the browser, and back to where it came from. Once per
// navigation (`opened`), StrictMode runs the effect twice
function SitePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { siteUrl, openExternal } = useActivitySettingsHost();
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (opened.current === location.key) {
      return;
    }
    opened.current = location.key;
    openExternal(`${siteUrl}${location.pathname}${location.search}${location.hash}`);
    void navigate(-1);
  }, [location, navigate, openExternal, siteUrl]);
  return null;
}
