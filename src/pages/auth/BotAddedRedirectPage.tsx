import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { Routes } from '@/config';
import { AnalyticsEvents, trackEvent } from '@/lib/analytics';


// Discord sends people here after they add the bot (`DISCORD_INVITE_REDIRECT_URI` on the API).
// The invite is an implicit grant, so `state` comes back in the fragment: `<src>@<host>`, the button the invite was on
// (`botInviteUrl`'s source) and the host that generated it, or only `<host>` for an invite without a src.
export function BotAddedRedirectPage() {
  // capture during render: <Navigate>'s effect runs before ours and would wipe the fragment
  const [ state ] = useState(() => {
    return new URLSearchParams(window.location.hash.slice(1)).get('state');
  });

  useEffect(() => {
    if (state) {
      // the last `@`: a host has none
      const index = state.lastIndexOf('@');
      const from = state.slice(index + 1);
      const src = state.slice(0, Math.max(index, 0));
      trackEvent(AnalyticsEvents.BOT_ADDED, (src) ? {from, src} : {from});
    }
  }, [state]);

  return <Navigate to={Routes.COMMANDS} replace/>;
}
