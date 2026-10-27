import { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';

import { sanitizeReturnTo, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { config, Routes } from '@/config';
import { useI18n } from '@/i18n';


// `/auth/login?next=/some/page` — linkable entry point that bounces to Discord OAuth,
// or straight to `next` if the visitor is already logged in.
export function LoginPage() {
  const { status, login } = useAuth();
  const { t } = useI18n();
  const [ searchParams ] = useSearchParams();
  const next = sanitizeReturnTo(searchParams.get('next')) || Routes.HOME;

  const shouldRedirect = config.authEnabled && (status === 'anonymous' || status === 'error');
  useEffect(() => {
    if (shouldRedirect) {
      login(next);
    }
  }, [shouldRedirect, login, next]);

  if (status === 'authenticated') {
    return <Navigate to={next} replace/>;
  }

  if (!config.authEnabled) {
    return <LoginDisabledMessage/>;
  }

  return (
    <FullPageMessage title={t(status === 'loading' ? 'login.checking' : 'login.redirecting')}>
      <Spinner/>
    </FullPageMessage>
  );
}


// shown on the login and callback routes when this build has auth turned off (VITE_AUTH_ENABLED)
export function LoginDisabledMessage() {
  const { t } = useI18n();
  return (
    <FullPageMessage title={t('login.disabled_title')} description={t('login.disabled_description')}>
      <Link to={Routes.HOME} className='btn btn-secondary'>{t('common.go_home')}</Link>
    </FullPageMessage>
  );
}
