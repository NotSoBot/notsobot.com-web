import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { useI18n } from '@/i18n';


export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className='mx-auto max-w-2xl px-6 py-20 text-center'>
      <AlertCircle className='mx-auto mb-6 size-20 text-danger-text'/>
      <h1 className='mb-4 text-4xl font-bold text-white'>{t('not_found.title')}</h1>
      <p className='mb-8 text-lg text-muted'>{t('not_found.description')}</p>
      <Link to={Routes.HOME} className='btn btn-discord btn-lg'>{t('not_found.home')}</Link>
    </div>
  );
}
