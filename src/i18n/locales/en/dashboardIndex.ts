// The dashboard's strings, fetched when someone opens the dashboard (loadDashboardText in i18n/translate.ts) so the
// public pages don't carry them.
import { Dashboard } from './dashboard';
import { Settings } from './settings';
import { DashboardTags } from './dashboardTags';
import { DashboardContent } from './dashboardContent';
import { DashboardServers } from './dashboardServers';


export const EnglishDashboard = Object.freeze({
  ...Dashboard,
  ...Settings,
  ...DashboardTags,
  ...DashboardContent,
  ...DashboardServers,
});
