import type { ComponentProps } from 'react';

import { AnalyticsEvents, trackEvent } from '@/lib/analytics';
import { botInviteUrl } from '@/lib/api';


// A link to the bot's invite. `source` is the button it's on: it goes with the invite (see `botInviteUrl`) and with the
// click's `InviteClick`, so the clicks on a button and the bots added from it (`BotAdded`) can be put side by side.
// The click is sent without holding the link back, it's a request that outlives the page
export function BotInviteLink({ guildId, source, onClick, ...props }: Omit<ComponentProps<'a'>, 'href'> & {
  guildId?: string | null,
  source: string,
}) {
  return (
    <a
      {...props}
      href={botInviteUrl(guildId, source)}
      onClick={(event) => {
        trackEvent(AnalyticsEvents.INVITE_CLICK, {src: source});
        onClick?.(event);
      }}
    />
  );
}
