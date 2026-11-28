import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { config, Routes } from '@/config';
import { HANDOFF_REAUTH_PARAM, handoffCallbackUrl, handoffStateHash, isHandoffState } from '@/auth/handoff';
import { languagePath, useI18n } from '@/i18n';
import { apiRequest } from '@/lib/api';
import { SiteIds, siteOrigin } from '@/sites';

import { LoginDisabledMessage } from './LoginPage';


type HandoffState = {kind: 'working'} | {kind: 'bad_link'} | {kind: 'failed'};


// notsobot.com/auth/handoff?state=…: notsogames.com's "Sign in with Discord" (src/games/auth/handoff.ts). Logged in
// here (through Discord first when not, back to this page after), it asks the api for a one-time code bound to this
// user and sha256(state), then sends the tab to notsogames.com's callback with the code and the state. The games site
// is the one beside this one (src/sites.ts: production's, beta's or the dev server's), never a url from the link.
// `reauth=guilds`: through Discord again for the server list's scope, even when logged in already
export function HandoffPage() {
  const { t, language } = useI18n();
  const { status, login } = useAuth();
  // read once: the login's return drops `reauth`, so it isn't asked for twice
  const [ params ] = useState(() => new URLSearchParams(window.location.search));
  const state = params.get('state');
  const reauth = params.get(HANDOFF_REAUTH_PARAM) === 'guilds';
  const [ result, setResult ] = useState<HandoffState>(() => (isHandoffState(state)) ? {kind: 'working'} : {kind: 'bad_link'});
  const started = useRef(false);
  const gamesOrigin = siteOrigin(SiteIds.GAMES);

  useEffect(() => {
    if (!config.authEnabled || result.kind !== 'working' || !isHandoffState(state) || started.current) {
      return;
    }
    const back = `${Routes.AUTH_HANDOFF}?state=${encodeURIComponent(state)}`;
    if (status === 'anonymous' || (reauth && status !== 'loading')) {
      started.current = true;
      login(back, {scopes: ['guilds']});
      return;
    }
    if (status !== 'authenticated') {
      return;
    }
    started.current = true;
    void (async () => {
      try {
        const { code } = await apiRequest<{code: string}>('/auth/handoff', {method: 'POST', body: {target: 'games', state_hash: await handoffStateHash(state)}});
        window.location.replace(handoffCallbackUrl(gamesOrigin, language, code, state));
      } catch {
        setResult({kind: 'failed'});
      }
    })();
  }, [status, login, state, reauth, result.kind, gamesOrigin, language]);

  if (!config.authEnabled) {
    return <LoginDisabledMessage/>;
  }
  if (result.kind === 'working') {
    return (
      <FullPageMessage title={t('handoff.working')}>
        <Spinner/>
      </FullPageMessage>
    );
  }
  const bad = result.kind === 'bad_link';
  return (
    <FullPageMessage
      title={t((bad) ? 'handoff.bad_link_title' : 'handoff.failed_title')}
      description={t((bad) ? 'handoff.bad_link_description' : 'handoff.failed_description')}
    >
      <a href={`${gamesOrigin}${languagePath(language, '/')}`} className='btn btn-primary'>{t('handoff.back')}</a>
    </FullPageMessage>
  );
}
