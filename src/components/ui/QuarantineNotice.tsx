import { Link } from 'react-router';

import { CollapsibleNotice } from '@/components/ui/CollapsibleNotice';
import { Routes } from '@/config';
import { useI18n, type TranslationKey } from '@/i18n';


// `quarantine.date_<n>` / `quarantine.text_<n>` and `quarantine.change_<n>`, n from 1
const TIMELINE_COUNT = 9;
const CHANGE_COUNT = 13;

function numbered(count: number): Array<number> {
  return Array.from({length: count}, (_, index) => index + 1);
}


export function QuarantineNotice({ className }: {className?: string}) {
  const { t, rich } = useI18n();
  return (
    <CollapsibleNotice className={className} title={t('quarantine.title')} tone='success'>
      <p>
        {rich('quarantine.intro', {
          code: (chunk) => <code className='font-mono text-code'>{chunk}</code>,
          docs: (chunk) => <Link to={Routes.TAG_DOCS} className='text-code hover:underline'>{chunk}</Link>,
          directory: (chunk) => <Link to={Routes.TAG_DIRECTORY} className='text-code hover:underline'>{chunk}</Link>,
          support: (chunk) => <Link to={Routes.SUPPORT_INVITE} className='text-code hover:underline'>{chunk}</Link>,
        })}
      </p>
      <p className='mt-3 font-medium text-white'>{t('quarantine.what_happened')}</p>
      <ol className='mt-1 space-y-1.5'>
        {numbered(TIMELINE_COUNT).map((number) => (
          <li key={number}>
            <span className='font-semibold text-white'>{t(`quarantine.date_${number}` as TranslationKey)}:</span> {t(`quarantine.text_${number}` as TranslationKey)}
          </li>
        ))}
      </ol>
      <p className='mt-3 font-medium text-white'>{t('quarantine.what_changed')}</p>
      <ul className='mt-1 list-disc space-y-1 pl-5'>
        {numbered(CHANGE_COUNT).map((number) => (
          <li key={number}>{t(`quarantine.change_${number}` as TranslationKey)}</li>
        ))}
      </ul>
    </CollapsibleNotice>
  );
}
