import type { RouteObject } from 'react-router';


// A server's pages under DASHBOARD_SERVER (Home is the server's own url), each its own module so opening one doesn't
// download the rest. The site's router (src/router.tsx) and the Discord Activity's server settings
// (src/activity-games/server) both mount them, under their own layout that provides `useServer()`'s context
export const SERVER_TAB_ROUTES: Array<RouteObject> = [
  {index: true, lazy: async () => ({Component: (await import('./ServerHomePage')).ServerHomePage})},
  {path: 'commands', lazy: async () => ({Component: (await import('./ServerCommandsPage')).ServerCommandsPage})},
  {path: 'music', lazy: async () => ({Component: (await import('./ServerMusicPage')).ServerMusicPage})},
  {path: 'notsoai', lazy: async () => ({Component: (await import('./ServerNotSoAIPage')).ServerNotSoAIPage})},
  {path: 'reminders', lazy: async () => ({Component: (await import('./ServerRemindersPage')).ServerRemindersPage})},
  {path: 'tags', lazy: async () => ({Component: (await import('./ServerTagsPage')).ServerTagsPage})},
  {path: 'voices', lazy: async () => ({Component: (await import('./ServerVoicesPage')).ServerVoicesPage})},
  {path: 'fonts', lazy: async () => ({Component: (await import('./ServerFontsPage')).ServerFontsPage})},
  {path: 'reports', lazy: async () => ({Component: (await import('./ServerReportsPage')).ServerReportsPage})},
  {path: 'rules', lazy: async () => ({Component: (await import('./ServerRulesPage')).ServerRulesPage})},
  {path: 'warnings', lazy: async () => ({Component: (await import('./ServerWarningsPage')).ServerWarningsPage})},
  {path: 'credits', lazy: async () => ({Component: (await import('./ServerCreditsPage')).ServerCreditsPage})},
  {path: 'settings', lazy: async () => ({Component: (await import('./ServerSettingsPage')).ServerSettingsPage})},
];
