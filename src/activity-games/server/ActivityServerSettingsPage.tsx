import { useI18n } from '@/i18n';
import { dashboardServerPath } from '@/pages/dashboard/servers/guildMeta';
import { useServer } from '@/pages/dashboard/servers/ServerPage';
import { LoggersSection, PrefixesSection } from '@/pages/dashboard/servers/ServerSections';
import { ServerSettingsForm } from '@/pages/dashboard/servers/ServerSettingsForm';

import { useActivitySettingsHost } from '../settings/context';


// The dashboard's Settings tab (src/pages/dashboard/servers/tabs/ServerSettingsPage.tsx) without its Server data panel:
// the export is a file download and Discord's iframe can't save files, so the owner gets a link to the site's instead
export function ActivityServerSettingsPage() {
  const { guild, setDirty } = useServer();
  const { rich } = useI18n();
  const { siteUrl } = useActivitySettingsHost();
  return (
    <>
      <PrefixesSection guild={guild}/>
      <ServerSettingsForm guild={guild} group='general' onDirtyChange={setDirty('general')}/>
      <ServerSettingsForm guild={guild} group='moderation' onDirtyChange={setDirty('moderation')}/>
      <LoggersSection guild={guild}/>
      {(guild.owner) ? (
        <p className='text-sm text-muted'>
          {rich('activity.server.data_note', {
            // opened outside Discord by the screen's link handling
            link: (chunk) => <a href={`${siteUrl}${dashboardServerPath(guild.id, 'settings')}`} target='_blank' rel='noopener noreferrer' className='text-code hover:underline'>{chunk}</a>,
          })}
        </p>
      ) : null}
    </>
  );
}
