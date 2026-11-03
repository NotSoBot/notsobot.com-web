import { useI18n } from '@/i18n';

import { DashboardHeader } from '../ui';
import { SavedFontsPanel } from './SavedFontsPanel';


// the caller's own saved fonts, a server's are on its Fonts page
export function FontsPage() {
  const { t, rich } = useI18n();
  return (
    <>
      <DashboardHeader
        title={t('page.DASHBOARD_FONTS')}
        description={rich('fonts.description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
      />
      <SavedFontsPanel guildId={null}/>
    </>
  );
}
