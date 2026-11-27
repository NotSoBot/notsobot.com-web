import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { SettingsPage } from '@/pages/dashboard/settings/SettingsPage';
import { YOUR_DATA_ANCHOR } from '@/pages/dashboard/settings/YourDataSection';

import { useActivitySettingsHost } from '../settings/context';


// The dashboard's Settings page without its Your data panel: the export is a file download Discord's iframe can't save,
// and deleting signs out the session the Activity runs on, so they get a link to the site's panel instead
export function ActivityUserSettingsPage() {
  const { rich } = useI18n();
  const { siteUrl } = useActivitySettingsHost();
  return (
    <SettingsPage
      data={(
        <p className='mt-6 text-sm text-muted'>
          {rich('activity.user.data_note', {
            // opened outside Discord by the screen's link handling
            link: (chunk) => <a href={`${siteUrl}${Routes.DASHBOARD_SETTINGS}#${YOUR_DATA_ANCHOR}`} target='_blank' rel='noopener noreferrer' className='text-code hover:underline'>{chunk}</a>,
          })}
        </p>
      )}
    />
  );
}
