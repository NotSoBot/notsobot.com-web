import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth, RequireStaff } from '@/auth';
import { ExternalRedirect } from '@/components/ExternalRedirect';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Routes, Urls } from '@/config';
import { loadDashboardText } from '@/i18n';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { BotAddedRedirectPage } from '@/pages/auth/BotAddedRedirectPage';
import { LoginCallbackPage } from '@/pages/auth/LoginCallbackPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { NOT_FOUND_PAGE, PAGES, type PageMeta } from '@/seo';


// `handle.title` is rendered into <title> by SiteLayout. the same metadata is what the worker serves to crawlers
export type RouteHandle = PageMeta;


const routes: Array<RouteObject> = [
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
      {path: Routes.FAQ, lazy: async () => ({Component: (await import('@/pages/FaqPage')).FaqPage}), handle: PAGES.FAQ},
      // not in the navbar or footer yet
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
      // the docs content is large, so it's only fetched when someone opens it. both languages share one page, so
      // switching between them keeps the search
      {
        lazy: async () => ({Component: (await import('@/pages/docs/TagDocsPage')).TagDocsPage}),
        children: [
          {path: Routes.TAG_DOCS, handle: PAGES.TAG_DOCS},
          {path: Routes.TAG_DOCS_MEDIASCRIPT, handle: PAGES.TAG_DOCS_MEDIASCRIPT},
        ],
      },
      {path: '/docs', element: <Navigate to={Routes.TAG_DOCS} replace/>},
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
      {path: Routes.INVITE, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_BOT)} label='redirect.discord'/>},
      {path: Routes.SUPPORT, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} label='redirect.support'/>},
      {path: Routes.SUPPORT_INVITE, element: <ExternalRedirect to={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)} label='redirect.support'/>},
      {path: Routes.FOXBOT, element: <ExternalRedirect to={Urls.FOXBOT}/>},

      // authenticated pages (the dashboard is code-split: only fetched when someone opens it)
      {
        element: <RequireAuth/>,
        children: [
          {
            path: Routes.DASHBOARD,
            // the dashboard's own strings come with it, every page under it renders after both are in
            lazy: async () => {
              const [ layout ] = await Promise.all([ import('@/pages/dashboard/DashboardLayout'), loadDashboardText() ]);
              return {Component: layout.DashboardLayout};
            },
            handle: PAGES.DASHBOARD,
            children: [
              {index: true, lazy: async () => ({Component: (await import('@/pages/dashboard/OverviewPage')).OverviewPage})},
              // a tag's details and editor open over the list (`TagsPage` reads the child match), so the list stays mounted under them
              {
                path: Routes.DASHBOARD_TAGS,
                lazy: async () => ({Component: (await import('@/pages/dashboard/tags/TagsPage')).TagsPage}),
                handle: PAGES.DASHBOARD_TAGS,
                children: [
                  {path: Routes.DASHBOARD_TAG, element: null, handle: PAGES.DASHBOARD_TAG},
                  {path: Routes.DASHBOARD_TAG_EDIT, element: null, handle: PAGES.DASHBOARD_TAG_EDIT},
                ],
              },
              {path: Routes.DASHBOARD_APPLICATIONS, lazy: async () => ({Component: (await import('@/pages/dashboard/applications/ApplicationsPage')).ApplicationsPage}), handle: PAGES.DASHBOARD_APPLICATIONS},
              {path: Routes.DASHBOARD_COMMANDS, lazy: async () => ({Component: (await import('@/pages/dashboard/commands/CommandHistoryPage')).CommandHistoryPage}), handle: PAGES.DASHBOARD_COMMANDS},
              {path: Routes.DASHBOARD_SERVERS, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServersPage')).ServersPage}), handle: PAGES.DASHBOARD_SERVERS},
              // a server's pages share the server it loads (Home is the server's own url)
              {
                path: Routes.DASHBOARD_SERVER,
                lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerPage}),
                handle: PAGES.DASHBOARD_SERVER,
                children: [
                  {index: true, lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerHomePage})},
                  {path: 'commands', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerCommandsPage})},
                  {path: 'music', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerMusicPage})},
                  {path: 'notsoai', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerNotSoAIPage})},
                  {path: 'reminders', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerRemindersPage})},
                  {path: 'tags', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerTagsPage})},
                  {path: 'reports', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerReportsPage})},
                  {path: 'rules', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerRulesPage})},
                  {path: 'warnings', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerWarningsPage})},
                  {path: 'settings', lazy: async () => ({Component: (await import('@/pages/dashboard/servers/ServerPage')).ServerSettingsPage})},
                ],
              },
              {path: Routes.DASHBOARD_PREMIUM, lazy: async () => ({Component: (await import('@/pages/dashboard/PremiumPage')).PremiumPage}), handle: PAGES.DASHBOARD_PREMIUM},
              {path: Routes.DASHBOARD_SETTINGS, lazy: async () => ({Component: (await import('@/pages/dashboard/settings/SettingsPage')).SettingsPage}), handle: PAGES.DASHBOARD_SETTINGS},
              {path: Routes.DASHBOARD_FILES, lazy: async () => ({Component: (await import('@/pages/dashboard/files/FilesPage')).FilesPage}), handle: PAGES.DASHBOARD_FILES},
              {path: Routes.DASHBOARD_AI_MEMORY, lazy: async () => ({Component: (await import('@/pages/dashboard/ai-memory/AIMemoryPage')).AIMemoryPage}), handle: PAGES.DASHBOARD_AI_MEMORY},
              {path: Routes.DASHBOARD_REMINDERS, lazy: async () => ({Component: (await import('@/pages/dashboard/reminders/RemindersPage')).RemindersPage}), handle: PAGES.DASHBOARD_REMINDERS},
              {path: `${Routes.DASHBOARD_REPORTS}/:itemId?`, lazy: async () => ({Component: (await import('@/pages/dashboard/reports/ReportsPage')).ReportsPage}), handle: PAGES.DASHBOARD_REPORTS},
              {path: Routes.DASHBOARD_VOICES, lazy: async () => ({Component: (await import('@/pages/dashboard/voices/VoicesPage')).VoicesPage}), handle: PAGES.DASHBOARD_VOICES},
              // NotSoBot staff only (owners and moderators)
              {
                element: <RequireStaff/>,
                children: [
                  {path: '/dashboard/admin', element: <Navigate to={Routes.DASHBOARD_ADMIN_TAGS} replace/>},
                  {path: Routes.DASHBOARD_ADMIN_APPLICATIONS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminApplicationsPage')).AdminApplicationsPage}), handle: PAGES.DASHBOARD_ADMIN_APPLICATIONS},
                  {path: Routes.DASHBOARD_ADMIN_TAGS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/AdminAllTagsPage')).AdminAllTagsPage}), handle: PAGES.DASHBOARD_ADMIN_TAGS},
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
                element: <RequireStaff owner/>,
                children: [
                  {path: Routes.DASHBOARD_OWNER_API_ACCESS, lazy: async () => ({Component: (await import('@/pages/dashboard/admin/OwnerApiAccessPage')).OwnerApiAccessPage}), handle: PAGES.DASHBOARD_OWNER_API_ACCESS},
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


// one per language, `basename` is its url prefix ('' for English). src/i18n/I18nProvider.tsx swaps them
export function createRouter(basename: string) {
  return createBrowserRouter(routes, {basename: basename || undefined});
}
