import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n, type TranslationKey } from '@/i18n';
import { AnalyticsEvents, trackEvent } from '@/lib/analytics';
import { readSource } from '@/lib/analyticsUrl';
import { botInviteUrl } from '@/lib/api';


// Replaces the current history entry with an external URL (e.g. bot invite, support server).
// `onLeave` runs right before, for an analytics event: this page is gone before its own page view would be sent
export function ExternalRedirect({ to, label = 'redirect.default', onLeave }: {to: string, label?: TranslationKey, onLeave?: () => void}) {
  const { t } = useI18n();
  // the latest one without making it a reason to redirect again
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  });
  // once per destination: StrictMode runs the effect twice in development
  const left = useRef<string | null>(null);
  useEffect(() => {
    if (left.current !== to) {
      left.current = to;
      leave.current?.();
    }
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


// `/invite`, a `?guild_id=` is passed on so Discord picks that server and a `?src=` (or the bot's scrambled `?i=`)
// says who linked here (the FAQ, our other sites, the bot), `invite` when it's a bare link
export function BotInviteRedirect() {
  const [ searchParams ] = useSearchParams();
  const source = readSource(searchParams) ?? 'invite';
  const to = botInviteUrl(searchParams.get('guild_id'), source);
  return <ExternalRedirect to={to} label='redirect.discord' onLeave={() => trackEvent(AnalyticsEvents.INVITE_CLICK, {src: source})}/>;
}
