import { Link } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';


export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <FullPageMessage title={t('not_found.title')} description={t('not_found.description')}>
      <Link to={Routes.HOME} className='btn btn-discord btn-lg'>{t('not_found.home')}</Link>
    </FullPageMessage>
  );
}
