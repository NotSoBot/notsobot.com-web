import { AlertTriangle } from 'lucide-react';
import { Outlet, useMatch, useParams, type RouteObject } from 'react-router';

import { tokenStorage } from '@/auth/tokenStorage';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { ApiErrorCodes, ApiRequestError, type UserGuild } from '@/lib/api';
import { errorMessage, useMeGuildQuery } from '@/lib/api/dashboardQueries';
import { queryKeys } from '@/lib/api/queries';
import { GuildIcon } from '@/pages/dashboard/servers/GuildIcon';
import { dashboardServerPath, SERVER_TAB_GROUPS } from '@/pages/dashboard/servers/guildMeta';
import { HomeQueries, ServerNotices, YourStuffLinks, type ServerOutletContext } from '@/pages/dashboard/servers/ServerPage';
import { SERVER_TAB_ROUTES } from '@/pages/dashboard/servers/tabs/routes';
import { useDirtyGroups, type SettingsGroup } from '@/pages/dashboard/servers/useDirtyGroups';
import { PanelSkeleton, Skeleton, UnsavedChangesGuard } from '@/pages/dashboard/ui';

import { useActivitySettingsHost, type ActivitySettingsHost } from '../settings/context';
import { createSettingsRouter, settingsQueryClient, SettingsFrame, SettingsScreen, SettingsTabStrip, SettingsTitle } from '../settings/SettingsScreen';


// The server's dashboard pages inside the Discord Activity (the mode choice's Server settings), loaded only when it's
// opened (src/editor/hosts/activity.tsx imports it): the dashboard's own tab pages under a memory router
// (../settings/SettingsScreen), its server layout swapped for one that fits Discord's window


export function ServerSettingsScreen({ guildId, guild, ...host }: {
  guildId: string,
  // the mode choice's lookup, so the first page doesn't wait on the same request again
  guild?: UserGuild | null,
} & ActivitySettingsHost) {
  return (
    <SettingsScreen
      {...host}
      createRouter={() => {
        const key = queryKeys.meGuild(tokenStorage.get(), guildId);
        if (guild && !settingsQueryClient.getQueryData(key)) {
          settingsQueryClient.setQueryData(key, guild);
        }
        return createSettingsRouter('server_settings', {
          // the dashboard's server subtree (`/dashboard/servers/:guildId/<tab>`, the same tab routes), opening on Music.
          // Its Settings tab is the Activity's own (./ActivityServerSettingsPage)
          path: Routes.DASHBOARD_SERVER,
          element: <SettingsLayout/>,
          children: SERVER_TAB_ROUTES.map((route): RouteObject => {
            if (route.path === 'settings') {
              return {path: 'settings', lazy: async () => ({Component: (await import('./ActivityServerSettingsPage')).ActivityServerSettingsPage})};
            }
            return route;
          }),
        }, dashboardServerPath(guildId, 'music'));
      }}
    />
  );
}


// the dashboard's `ServerPage` for the Activity: the server's name, its pages as a strip of tabs, then the open page.
// Leaving a page (or the screen) with unsaved settings asks first
function SettingsLayout() {
  const { t } = useI18n();
  const { siteUrl } = useActivitySettingsHost();
  const { guildId = '' } = useParams();
  const { data: guild, isPending, error, refetch, isRefetching } = useMeGuildQuery(guildId);
  const { setter, any } = useDirtyGroups<SettingsGroup>();
  const home = !!useMatch({path: Routes.DASHBOARD_SERVER, end: true});

  return (
    <SettingsFrame screen='server_settings' state={(guild) ? 'ready' : (isPending) ? 'loading' : 'error'} dashboardUrl={`${siteUrl}${dashboardServerPath(guildId)}`}>
      {(home && (guild || isPending)) ? <HomeQueries guildId={guildId}/> : null}
      {(guild) ? (
        // keyed by the server like the dashboard's, nothing of one server's carries over onto another
        <SettingsBody key={guild.id} guild={guild} home={home} setDirty={setter}/>
      ) : (isPending) ? (
        <div aria-busy='true' className='space-y-4'>
          <h1 className='sr-only'>{t('server.loading')}</h1>
          <div className='flex items-center gap-3'>
            <Skeleton className='size-10 rounded-xl'/>
            <Skeleton className='h-7 w-48'/>
          </div>
          <Skeleton className='h-9 w-full rounded-full bg-surface-2'/>
          <PanelSkeleton rows={3}/>
        </div>
      ) : (
        <SettingsLoadError error={error} onRetry={() => refetch()} retrying={isRefetching}/>
      )}
      <UnsavedChangesGuard when={any}/>
    </SettingsFrame>
  );
}


function SettingsBody({ guild, home, setDirty }: {guild: UserGuild, home: boolean, setDirty: ServerOutletContext['setDirty']}) {
  const { t } = useI18n();
  return (
    <>
      <SettingsTitle
        media={<GuildIcon guild={guild} size={40} className='size-10 rounded-xl text-xs'/>}
        title={guild.name}
        subtitle={t('activity.server.title')}
        heading
      />
      <TabStrip guildId={guild.id}/>
      {/* the site's lists filtered to this server, opened in the browser */}
      {(home) ? <YourStuffLinks guildId={guild.id}/> : null}
      <div className='space-y-4'>
        {/* like the dashboard on a phone: what's view only is listed on Home, each panel still says when it's locked */}
        <ServerNotices guild={guild} viewOnlyClassName={(home) ? undefined : 'max-sm:hidden'}/>
        <Outlet context={{guild, setDirty} satisfies ServerOutletContext}/>
      </div>
    </>
  );
}


// Every one of the server's pages, grouped like the dashboard's sidebar (alphabetical in the language on screen, Home
// first)
function TabStrip({ guildId }: {guildId: string}) {
  const { t } = useI18n();
  return (
    <SettingsTabStrip
      label={t('activity.server.pages')}
      groups={SERVER_TAB_GROUPS.map((group) => [...group.tabs].sort((a, b) => {
        return Number(b.id === 'home') - Number(a.id === 'home') || t(`server_tab.${a.id}`).localeCompare(t(`server_tab.${b.id}`));
      }).map(({ id, icon, color }) => ({
        id,
        to: dashboardServerPath(guildId, id),
        label: t(`server_tab.${id}`),
        icon,
        color,
        // Home is the server's own url, every other page is under it
        end: id === 'home',
      })))}
    />
  );
}


// the server didn't load. The dashboard's own error can offer to log in again, which would take the iframe to Discord's
// login page: the Activity signs in by itself, so it's Retry (or the full dashboard's link above)
function SettingsLoadError({ error, onRetry, retrying }: {error: Error | null, onRetry: () => void, retrying: boolean}) {
  const { t } = useI18n();
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_SERVER);
  return (
    <div className='card px-6 py-12 text-center'>
      <AlertTriangle aria-hidden className='mx-auto mb-4 size-12 text-danger-text'/>
      <h1 className='mb-3 text-xl font-bold text-white'>{t((notFound) ? 'server.not_found' : 'server.load_error')}</h1>
      <p className='mb-6 text-muted'>{(notFound) ? t('server.not_found_description') : errorMessage(error)}</p>
      {(notFound) ? null : <button type='button' className='btn btn-secondary' disabled={retrying} onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}
