import { useI18n } from '@/i18n';

import { DashboardHeader } from '../ui';
import { VoiceList } from './VoiceList';


// the caller's own cloned voices, a server's are on its Voices page
export function VoicesPage() {
  const { t, rich } = useI18n();
  return (
    <>
      <DashboardHeader
        title={t('page.DASHBOARD_VOICES')}
        description={rich('voices.description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
      />
      <VoiceList guildId={null}/>
    </>
  );
}
