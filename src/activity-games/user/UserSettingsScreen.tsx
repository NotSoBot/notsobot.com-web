import { Outlet, type RouteObject } from 'react-router';

import { useAuth } from '@/auth';
import { BlockedNotice } from '@/components/ui/BlockedNotice';
import { StaffWarningsNotice } from '@/components/ui/StaffWarningsNotice';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { maybeTranslate, useI18n } from '@/i18n';
import { CONTENT_SECTIONS, DASHBOARD_SECTIONS, sortedByLabel } from '@/pages/dashboard/DashboardLayout';
import { Skeleton } from '@/pages/dashboard/ui';
import { DASHBOARD_USER_ROUTES } from '@/pages/dashboard/userRoutes';

import { useActivitySettingsHost, type ActivitySettingsHost } from '../settings/context';
import { createSettingsRouter, SettingsFrame, SettingsScreen, SettingsTabStrip, SettingsTitle, type SettingsTab } from '../settings/SettingsScreen';


// Your own dashboard pages inside the Discord Activity (the mode choice's Your settings), loaded only when it's opened
// (src/editor/hosts/activity.tsx imports it): the dashboard's pages under a memory router (../settings/SettingsScreen),
// opening on Settings. Left out: Premium, which sells something (its tab and every link to it open the site's in the
// browser), and Servers, which is the mode choice's Server settings here. Settings is the Activity's own
// (./ActivityUserSettingsPage), without the data export and delete


export function UserSettingsScreen(host: ActivitySettingsHost) {
  return (
    <SettingsScreen
      {...host}
      createRouter={() => createSettingsRouter('user_settings', {
        path: Routes.DASHBOARD,
        element: <UserSettingsLayout/>,
        children: DASHBOARD_USER_ROUTES.flatMap((route): Array<RouteObject> => {
          if (route.path === Routes.DASHBOARD_PREMIUM) {
            return [];
          }
          if (route.path === Routes.DASHBOARD_SETTINGS) {
            return [{path: route.path, handle: route.handle, lazy: async () => ({Component: (await import('./ActivityUserSettingsPage')).ActivityUserSettingsPage})}];
          }
          return [route];
        }),
      }, Routes.DASHBOARD_SETTINGS)}
    />
  );
}


// the dashboard's `DashboardLayout` for the Activity: who's signed in, the pages as a strip of tabs, then the open page.
// The pages have their own headings and ask before leaving unsaved edits themselves
function UserSettingsLayout() {
  const { t } = useI18n();
  const { siteUrl } = useActivitySettingsHost();
  const { user, status } = useAuth();
  return (
    <SettingsFrame screen='user_settings' state={(user) ? 'ready' : (status === 'loading') ? 'loading' : 'error'} dashboardUrl={`${siteUrl}${Routes.DASHBOARD}`}>
      {(user) ? (
        <SettingsTitle
          media={<UserAvatar user={user} size={64} className='size-10 shrink-0 rounded-full bg-surface-3'/>}
          title={user.username}
          subtitle={t('activity.user.title')}
          heading={false}
        />
      ) : (status === 'loading') ? (
        <div aria-hidden className='flex items-center gap-3'>
          <Skeleton className='size-10 rounded-full'/>
          <Skeleton className='h-7 w-40'/>
        </div>
      ) : null}
      {(user?.blocked) ? <BlockedNotice user={user}/> : null}
      <StaffWarningsNotice/>
      <SettingsTabStrip label={t('activity.user.pages')} groups={userTabs(siteUrl)}/>
      <div className='min-w-0'>
        <Outlet/>
      </div>
    </SettingsFrame>
  );
}


// the dashboard sidebar's two groups in its order (Overview first, the rest alphabetical in the language on screen).
// Premium opens the site's page in the browser
function userTabs(siteUrl: string): Array<Array<SettingsTab>> {
  return [ DASHBOARD_SECTIONS, CONTENT_SECTIONS ].map((sections) => sortedByLabel(sections)
    .filter((section) => section.to !== Routes.DASHBOARD_SERVERS)
    .map((section) => {
      const external = section.to === Routes.DASHBOARD_PREMIUM;
      return {
        id: section.to,
        to: (external) ? `${siteUrl}${section.to}` : section.to,
        label: maybeTranslate(section.label),
        icon: section.icon,
        color: section.color,
        end: section.end,
        external,
      };
    }));
}
