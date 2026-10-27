import { useEffect } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n, type TranslationKey } from '@/i18n';


// Replaces the current history entry with an external URL (e.g. bot invite, support server).
export function ExternalRedirect({ to, label = 'redirect.default' }: {to: string, label?: TranslationKey}) {
  const { t } = useI18n();
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <FullPageMessage title={`${t(label)}…`}>
      <Spinner/>
      <a href={to} className='text-sm text-muted underline underline-offset-4 hover:text-fg'>
        {t('redirect.fallback')}
      </a>
    </FullPageMessage>
  );
}
