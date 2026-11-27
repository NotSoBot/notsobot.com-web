import type { RouteObject } from 'react-router';

import { Routes } from '@/config';
import { PAGES } from '@/seo';


// Your own pages under DASHBOARD (Overview is its own url), each its own module so opening one doesn't download the
// rest. The site's router (src/router.tsx) mounts them under `DashboardLayout`, the Discord Activity's Your settings
// (src/activity-games/user) under its own layout, without Premium and with its own Settings
export const DASHBOARD_USER_ROUTES: Array<RouteObject> = [
  {index: true, lazy: async () => ({Component: (await import('./OverviewPage')).OverviewPage})},
  // a tag's details and editor open over the list (`TagsPage` reads the child match), so the list stays mounted under them
  {
    path: Routes.DASHBOARD_TAGS,
    lazy: async () => ({Component: (await import('./tags/TagsPage')).TagsPage}),
    handle: PAGES.DASHBOARD_TAGS,
    children: [
      {path: Routes.DASHBOARD_TAG, element: null, handle: PAGES.DASHBOARD_TAG},
      {path: Routes.DASHBOARD_TAG_EDIT, element: null, handle: PAGES.DASHBOARD_TAG_EDIT},
    ],
  },
  {path: Routes.DASHBOARD_APPLICATIONS, lazy: async () => ({Component: (await import('./applications/ApplicationsPage')).ApplicationsPage}), handle: PAGES.DASHBOARD_APPLICATIONS},
  {path: Routes.DASHBOARD_COMMANDS, lazy: async () => ({Component: (await import('./commands/CommandHistoryPage')).CommandHistoryPage}), handle: PAGES.DASHBOARD_COMMANDS},
  {path: Routes.DASHBOARD_PREMIUM, lazy: async () => ({Component: (await import('./PremiumPage')).PremiumPage}), handle: PAGES.DASHBOARD_PREMIUM},
  {path: Routes.DASHBOARD_SETTINGS, lazy: async () => ({Component: (await import('./settings/SettingsPage')).SettingsPage}), handle: PAGES.DASHBOARD_SETTINGS},
  {path: Routes.DASHBOARD_FILES, lazy: async () => ({Component: (await import('./files/FilesPage')).FilesPage}), handle: PAGES.DASHBOARD_FILES},
  {path: Routes.DASHBOARD_FONTS, lazy: async () => ({Component: (await import('./fonts/FontsPage')).FontsPage}), handle: PAGES.DASHBOARD_FONTS},
  {path: Routes.DASHBOARD_AI_MEMORY, lazy: async () => ({Component: (await import('./ai-memory/AIMemoryPage')).AIMemoryPage}), handle: PAGES.DASHBOARD_AI_MEMORY},
  {path: Routes.DASHBOARD_REMINDERS, lazy: async () => ({Component: (await import('./reminders/RemindersPage')).RemindersPage}), handle: PAGES.DASHBOARD_REMINDERS},
  {path: `${Routes.DASHBOARD_REPORTS}/:itemId?`, lazy: async () => ({Component: (await import('./reports/ReportsPage')).ReportsPage}), handle: PAGES.DASHBOARD_REPORTS},
  {path: Routes.DASHBOARD_VOICES, lazy: async () => ({Component: (await import('./voices/VoicesPage')).VoicesPage}), handle: PAGES.DASHBOARD_VOICES},
];
