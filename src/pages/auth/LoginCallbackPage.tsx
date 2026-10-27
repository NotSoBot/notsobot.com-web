import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { clearReturnTo, consumeLoginPending, peekReturnTo, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { config, Routes } from '@/config';
import { splitLanguagePath, useI18n } from '@/i18n';

import { LoginDisabledMessage } from './LoginPage';


// notsobot.api finishes the Discord OAuth exchange at `/api/auth/login/callback`, then redirects
// here with the session token in the URL fragment: `/auth/login/callback#<token>`.
// The fragment never reaches any server, and we strip it from history as soon as we've read it.
export function LoginCallbackPage() {
  const { completeLogin } = useAuth();
  const { language, switchLanguage, t } = useI18n();
  const navigate = useNavigate();

  // read once during the first render, so StrictMode's double effects can't lose them
  const [ token ] = useState(() => {
    const raw = window.location.hash.slice(1);
    try {
      return decodeURIComponent(raw) || null;
    } catch {
      return raw || null;
    }
  });
  const [ returnTo ] = useState(peekReturnTo);
  // only accept a token for a login this tab started (read once, StrictMode renders twice)
  const [ started ] = useState(consumeLoginPending);

  useEffect(() => {
    // never leave the token in the address bar / history
    window.history.replaceState(window.history.state, '', window.location.pathname);

    // with auth off a token that still arrives here (from the API directly) is never used
    if (!token || !started || !config.authEnabled) {
      return;
    }
    completeLogin(token);
    clearReturnTo();
    // the page to go back to keeps its language prefix. one without a prefix stays in whatever language this page
    // opened in (picked automatically, like any url without one)
    const target = splitLanguagePath(returnTo);
    if (target.language && target.language !== language) {
      switchLanguage(target.language, target.path);
    } else {
      navigate(target.path, {replace: true});
    }
  }, [completeLogin, language, navigate, returnTo, started, switchLanguage, token]);

  if (!config.authEnabled) {
    return <LoginDisabledMessage/>;
  }

  if (token && !started) {
    return (
      <FullPageMessage title={t('login.not_started_title')} description={t('login.not_started_description')}>
        <div className='flex gap-2'>
          <Link to={Routes.AUTH_LOGIN} className='btn btn-discord'>{t('common.log_in')}</Link>
          <Link to={Routes.HOME} className='btn btn-secondary'>{t('common.go_home')}</Link>
        </div>
      </FullPageMessage>
    );
  }

  if (!token) {
    return (
      <FullPageMessage title={t('login.failed_title')} description={t('login.failed_description')}>
        <div className='flex gap-2'>
          <Link to={Routes.AUTH_LOGIN} className='btn btn-discord'>{t('common.try_again')}</Link>
          <Link to={Routes.HOME} className='btn btn-secondary'>{t('common.go_home')}</Link>
        </div>
      </FullPageMessage>
    );
  }

  return (
    <FullPageMessage title={t('login.logging_in')}>
      <Spinner/>
    </FullPageMessage>
  );
}
