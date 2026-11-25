import type { DashboardTranslations } from '../../translate';

import { Dashboard } from './dashboard';
import { Settings } from './settings';
import { DashboardTags } from './dashboardTags';
import { DashboardContent } from './dashboardContent';
import { DashboardServers } from './dashboardServers';
import { Editor } from './editor';


export const PortugueseDashboard: DashboardTranslations = Object.freeze({
  ...Dashboard,
  ...Settings,
  ...DashboardTags,
  ...DashboardContent,
  ...DashboardServers,
  ...Editor,
});
