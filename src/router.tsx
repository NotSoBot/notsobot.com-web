import { createBrowserRouter, matchRoutes, Navigate, type HydrationState, type RouteObject } from 'react-router';

import { RequireAuth, RequireStaff } from '@/auth';
import { BotInviteRedirect, ExternalRedirect } from '@/components/ExternalRedirect';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { RequireEditorAccess } from '@/editor/hosts/access';
import { Routes, Urls } from '@/config';
import { loadGuides } from '@/content/guides/load';
import { GUIDE_SLUGS } from '@/content/guides/types';
import { loadTagDocs } from '@/content/tagDocs/load';
import type { TagDocsView } from '@/content/tagDocs/localize';
import { activeLanguage, loadDashboardText } from '@/i18n';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { BotAddedRedirectPage } from '@/pages/auth/BotAddedRedirectPage';
import { LoginCallbackPage } from '@/pages/auth/LoginCallbackPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { AdminUserPeek } from '@/pages/dashboard/admin/AdminUserPeek';
import { SERVER_TAB_ROUTES } from '@/pages/dashboard/servers/tabs/routes';
import { DASHBOARD_USER_ROUTES } from '@/pages/dashboard/userRoutes';
import { GUIDE_PAGE_KEYS } from '@/pages/guides/guideRoutes';
import { NOT_FOUND_PAGE, PAGES, type PageMeta } from '@/seo';


// `handle.title` is rendered into <title> by SiteLayout. the same metadata is what the worker serves to crawlers
export type RouteHandle = PageMeta;


// the browser's router (`createRouter` below), and whether it took over from another one: a language switch
let active: ReturnType<typeof createBrowserRouter> | null = null;
let swapped = false;

// A docs view's content is its own chunk per language (src/content/tagDocs/load.ts). Its route loads it, so a
// navigation waits for it like it does for a page's code: switching views keeps the one on screen up until the other
// has arrived, and opening the docs from another page doesn't show their spinner first. The exception is a router made
// for a language switch, which shows nothing until its first load is done: that one doesn't wait, the page mounts
// and shows its own spinner while the docs load (TagDocsPage). Nothing is loaded here in the worker (the routes
// load before it sets the language it renders in) or for a page it rendered (the router takes its state as loaded):
// src/lib/pagePreload.ts loads the view for both
function tagDocsLoader(view: TagDocsView) {
  return contentLoader(() => loadTagDocs(view, activeLanguage()));
}

// the same for the guides (src/content/guides/load.ts), a chunk per language
const guidesLoader = contentLoader(() => loadGuides(activeLanguage()));

function contentLoader(load: () => Promise<unknown>) {
  return async (): Promise<null> => {
    if (typeof window === 'undefined') {
      return null;
    }
    const content = load();
    if (swapped && !active?.state.initialized) {
      // the page's query asks again and reports it
      content.catch(() => undefined);
    } else {
      await content;
    }
    return null;
  };
}


// the worker renders some pages from these same routes (src/entry-server.tsx)
export const routes: Array<RouteObject> = [
  {
    element: <SiteLayout/>,
    errorElement: <RouteErrorPage/>,
    HydrateFallback: () => null,
    // only the home page ships with the site, every other page is fetched when someone opens it
    children: [
      {index: true, element: <HomePage/>},
      {
        path: Routes.COMMANDS,
        lazy: async () => ({Component: (await import('@/pages/commands/CommandsPage')).CommandsPage}),
        handle: PAGES.COMMANDS,
        // the command is a drawer over the list, so the list stays mounted underneath
        children: [
          {index: true},
          {path: ':commandId', handle: PAGES.COMMAND},
          {path: ':commandId/:commandType', handle: PAGES.COMMAND_TYPE},
        ],
      },
      {path: Routes.CHANGELOG, lazy: async () => ({Component: (await import('@/pages/ChangelogPage')).ChangelogPage}), handle: PAGES.CHANGELOG},
      // the editor's template hub, public (logged out can browse). A static segment, it outranks the editor's
      // `/editor/:documentId`. A template's view opens over the list, which stays mounted
      {
        path: Routes.EDITOR_HUB,
        lazy: async () => ({Component: (await import('@/pages/hub/HubPage')).HubPage}),
        handle: PAGES.EDITOR_HUB,
        children: [{index: true}, {path: ':templateCode', handle: PAGES.EDITOR_HUB_ITEM}],
      },
      {path: Routes.FAQ, lazy: async () => ({Component: (await import('@/pages/FaqPage')).FaqPage}), handle: PAGES.FAQ},
      {path: Routes.PREMIUM, lazy: async () => ({Component: (await import('@/pages/PremiumPage')).PremiumPage}), handle: PAGES.PREMIUM},
      {path: Routes.STATUS, lazy: async () => ({Component: (await import('@/pages/status/StatusPage')).StatusPage}), handle: PAGES.STATUS},
      {path: Routes.STATUS_VOICE, lazy: async () => ({Component: (await import('@/pages/status/VoiceStatusPage')).VoiceStatusPage}), handle: PAGES.STATUS_VOICE},
      {
        path: Routes.TAG_DIRECTORY,
        lazy: async () => ({Component: (await import('@/pages/tags/TagDirectoryPage')).TagDirectoryPage}),
        handle: PAGES.TAG_DIRECTORY,
        // the tag is a modal over the directory, so the directory stays mounted underneath
        children: [{index: true}, {path: ':tagId', handle: PAGES.TAG_DIRECTORY_ITEM}],
      },
      // the docs content is large, so it's only fetched when someone opens it, and only for the language opened
      // (TagScript or MediaScript, see `tagDocsLoader`). both share one page, so switching between them keeps the search
      {
        lazy: async () => ({Component: (await import('@/pages/docs/TagDocsPage')).TagDocsPage}),
        children: [
          // the page reads which one matched, they render nothing themselves (null keeps the router from warning).
          // a view's content never changes while it stays matched, so typing in the search doesn't run its loader
          {path: Routes.TAG_DOCS, element: null, handle: PAGES.TAG_DOCS, loader: tagDocsLoader('tagscript'), shouldRevalidate: () => false},
          {path: Routes.TAG_DOCS_MEDIASCRIPT, element: null, handle: PAGES.TAG_DOCS_MEDIASCRIPT, loader: tagDocsLoader('mediascript'), shouldRevalidate: () => false},
        ],
      },
      {path: '/docs', element: <Navigate to={Routes.TAG_DOCS} replace/>},
      // the guides' content is a chunk per language, loaded before a guide page shows like the docs' view. Every guide
      // is one page (GuidePage reads which from the matched handle), so moving between them keeps it mounted
      {path: Routes.GUIDES, lazy: async () => ({Component: (await import('@/pages/guides/GuidesPage')).GuidesPage}), handle: PAGES.GUIDES, loader: guidesLoader, shouldRevalidate: () => false},
      {
        lazy: async () => ({Component: (await import('@/pages/guides/GuidePage')).GuidePage}),
        loader: guidesLoader,
        shouldRevalidate: () => false,
        children: GUIDE_SLUGS.map((slug) => {
          const key = GUIDE_PAGE_KEYS[slug];
          return {path: Routes[key], element: null, handle: PAGES[key]};
        }),
      },
      {path: Routes.LEGAL_PRIVACY, lazy: async () => ({Component: (await import('@/pages/legal/PrivacyPage')).PrivacyPage}), handle: PAGES.LEGAL_PRIVACY},
      {path: Routes.LEGAL_TERMS_OF_SERVICE, lazy: async () => ({Component: (await import('@/pages/legal/TermsPage')).TermsPage}), handle: PAGES.LEGAL_TERMS_OF_SERVICE},

      // auth (Discord OAuth via notsobot.api)
      {path: Routes.AUTH_LOGIN, element: <LoginPage/>, handle: PAGES.AUTH_LOGIN},
      {path: Routes.AUTH_LOGIN_CALLBACK, element: <LoginCallbackPage/>, handle: PAGES.AUTH_LOGIN_CALLBACK},
      {path: Routes.AUTH_REDIRECT, element: <BotAddedRedirectPage/>},

      // short legal paths (used by the new design)
      {path: '/privacy', element: <Navigate to={Routes.LEGAL_PRIVACY} replace/>},
      {path: '/terms', element: <Navigate to={Routes.LEGAL_TERMS_OF_SERVICE} replace/>},

      // vanity redirects
      {path: Routes.INVITE, element: <BotInviteRedirect/>},
      {path: Routes.SUPPORT, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} label='redirect.support'/>},
      {path: Routes.SUPPORT_INVITE, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} label='redirect.support'/>},
      {path: Routes.FOXBOT, element: <ExternalRedirect to={Urls.FOXBOT}/>},

      // authenticated pages (the dashboard is code-split: only fetched when someone opens it)
      {
        element: <RequireAuth/>,
        children: [
          // the media editor (src/editor), full width under the navbar. its strings come with the dashboard's.
          // whoever the api says it's open to (owners until its EDITOR_PUBLIC)
          {
            element: <RequireEditorAccess/>,
            children: [
              {
                path: Routes.EDITOR,
                lazy: async () => {
                  const [ editor ] = await Promise.all([ import('@/editor/hosts/web'), loadDashboardText() ]);
                  return {Component: editor.WebEditorPage};
                },
                handle: PAGES.EDITOR,
              },
              {
                path: Routes.EDITOR_TEMPLATE,
                lazy: async () => {
                  const [ editor ] = await Promise.all([ import('@/editor/hosts/web'), loadDashboardText() ]);
                  return {Component: editor.WebEditorPage};
                },
                handle: PAGES.EDITOR_TEMPLATE,
              },
              {
                path: Routes.EDITOR_DOCUMENT,
                lazy: async () => {
                  const [ editor ] = await Promise.all([ import('@/editor/hosts/web'), loadDashboardText() ]);
                  return {Component: editor.WebEditorPage};
                },
                handle: PAGES.EDITOR_DOCUMENT,
              },
            ],
          },
          {
            path: Routes.DASHBOARD,
            // the dashboard's own strings come with it, every page under it renders after both are in
            lazy: async () => {
              const [ layout ] = await Promise.all([ import('@/pages/dashboard/DashboardLayout'), loadDashboardText() ]);
              return {Component: layout.DashboardLayout};
            },
            handle: PAGES.DASHBOARD,
            children: [
              // your own pages, shared with the Discord Activity's Your settings
              ...DASHBOARD_USER_ROUTES,
              {path: Routes.DASHBOARD_SERVERS, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServersPage')).ServersPage}), handle: PAGES.DASHBOARD_SERVERS},
              // a server's pages share the server it loads (Home is the server's own url), each is its own module so
              // opening one doesn't download the rest
              {
                path: Routes.DASHBOARD_SERVER,
                lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerPage}),
                handle: PAGES.DASHBOARD_SERVER,
                children: SERVER_TAB_ROUTES,
              },
              // NotSoBot staff only (owners and moderators). `AdminUserPeek` opens a linked user over whichever page it's on
              {
                element: <RequireStaff><AdminUserPeek/></RequireStaff>,
                children: [
                  {path: '/dashboard/admin', element: <Navigate to={Routes.DASHBOARD_ADMIN_TAGS} replace/>},
                  {path: `${Routes.DASHBOARD_ADMIN_APPLICATIONS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminApplicationsPage')).AdminApplicationsPage}), handle: PAGES.DASHBOARD_ADMIN_APPLICATIONS},
                  // `/dashboard/admin/tags/directory` still goes to the directory below, a static segment outranks `:itemId`
                  {path: `${Routes.DASHBOARD_ADMIN_TAGS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminAllTagsPage')).AdminAllTagsPage}), handle: PAGES.DASHBOARD_ADMIN_TAGS},
                  {path: `${Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminTagsPage')).AdminTagsPage}), handle: PAGES.DASHBOARD_ADMIN_TAG_DIRECTORY},
                  {path: `${Routes.DASHBOARD_ADMIN_USERS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminUsersPage')).AdminUsersPage}), handle: PAGES.DASHBOARD_ADMIN_USERS},
                  {path: `${Routes.DASHBOARD_ADMIN_FLAGS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminContentFlagsPage')).AdminContentFlagsPage}), handle: PAGES.DASHBOARD_ADMIN_FLAGS},
                  {path: `${Routes.DASHBOARD_ADMIN_REPORTS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminReportsPage')).AdminReportsPage}), handle: PAGES.DASHBOARD_ADMIN_REPORTS},
                  {path: `${Routes.DASHBOARD_ADMIN_SERVERS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminServersPage')).AdminServersPage}), handle: PAGES.DASHBOARD_ADMIN_SERVERS},
                  {path: Routes.DASHBOARD_ADMIN_VOICES, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminVoicesPage')).AdminVoicesPage}), handle: PAGES.DASHBOARD_ADMIN_VOICES},
                ],
              },
              // NotSoBot owners only: everyone's purchase history, who can make API applications, the download identities, api-wide stats and the music nodes
              {
                element: <RequireStaff owner><AdminUserPeek/></RequireStaff>,
                children: [
                  {path: Routes.DASHBOARD_OWNER_API_ACCESS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/OwnerApiAccessPage')).OwnerApiAccessPage}), handle: PAGES.DASHBOARD_OWNER_API_ACCESS},
                  {path: Routes.DASHBOARD_OWNER_CREDITS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/OwnerCreditsPage')).OwnerCreditsPage}), handle: PAGES.DASHBOARD_OWNER_CREDITS},
                  {path: Routes.DASHBOARD_OWNER_ENTITLEMENTS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminEntitlementsPage')).AdminEntitlementsPage}), handle: PAGES.DASHBOARD_OWNER_ENTITLEMENTS},
                  {path: Routes.DASHBOARD_OWNER_IDENTITIES, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/OwnerIdentitiesPage')).OwnerIdentitiesPage}), handle: PAGES.DASHBOARD_OWNER_IDENTITIES},
                  {path: Routes.DASHBOARD_OWNER_STATS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/OwnerStatsPage')).OwnerStatsPage}), handle: PAGES.DASHBOARD_OWNER_STATS},
                  {path: Routes.DASHBOARD_OWNER_VOICE_NODES, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/OwnerVoiceNodesPage')).OwnerVoiceNodesPage}), handle: PAGES.DASHBOARD_OWNER_VOICE_NODES},
                ],
              },
            ],
          },
        ],
      },

      {path: '*', element: <NotFoundPage/>, handle: NOT_FOUND_PAGE},
    ],
  },
];


// the <script type="application/json"> after #root with the router's state, on pages the worker rendered
export const HYDRATION_DATA_ID = 'router-hydration';


// one per language, `basename` is its url prefix ('' for English). src/i18n/I18nProvider.tsx swaps them.
// `hydrationData` is the worker's, for the router that takes over a page it rendered
export function createRouter(basename: string, hydrationData?: HydrationState) {
  swapped = Boolean(active);
  // cleared first, the new router's first load can start (and reach `tagDocsLoader`) before it's returned
  active = null;
  active = createBrowserRouter(routes, {basename: basename || undefined, hydrationData});
  return active;
}


// A page the worker rendered hydrates with its lazy route modules already loaded, or the router would render the
// HydrateFallback (nothing) over the server's markup until they arrive. Gives back the matched routes' handles
export async function loadRouteModules(basename: string): Promise<Array<unknown>> {
  const matches = matchRoutes(routes, window.location, basename || undefined) ?? [];
  await Promise.all(matches.map(async ({ route }) => {
    if (typeof route.lazy === 'function') {
      Object.assign(route, {...await route.lazy(), lazy: undefined});
    }
  }));
  return matches.map(({ route }) => route.handle);
}
