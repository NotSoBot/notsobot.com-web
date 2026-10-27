import { Languages as LanguagesIcon } from 'lucide-react';
import { useId } from 'react';

import { LANGUAGE_NAMES, languageFromLocale, useI18n } from '@/i18n';


// the site's language, saved in this browser. until one is picked it follows the NotSoBot setting or the browser
export function LanguagePicker() {
  const { language, setLanguage, t } = useI18n();
  const id = useId();
  return (
    <div className='flex items-center gap-2'>
      <label htmlFor={id} className='text-muted'>
        <LanguagesIcon className='size-4'/>
        <span className='sr-only'>{t('footer.language')}</span>
      </label>
      <select
        id={id}
        className='input w-auto py-1.5'
        value={language}
        onChange={(event) => setLanguage(languageFromLocale(event.target.value))}
      >
        {Object.entries(LANGUAGE_NAMES).map(([ value, name ]) => <option key={value} value={value} lang={value}>{name}</option>)}
      </select>
    </div>
  );
}
