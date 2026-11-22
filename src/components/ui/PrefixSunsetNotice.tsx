import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/utils';

import { CollapsibleNotice, useNoticeDismissed } from './CollapsibleNotice';


// Discord won't give the message content intent to bots that use it for prefix commands, so they stop on this day.
// Mentioning the bot keeps working (Discord still sends messages that mention it). Same day as the bot's
// `PREFIX_COMMANDS_END` (notsobot.ts utils/tools.ts).
export const PREFIX_COMMANDS_END = Date.UTC(2027, 0, 1);

const STORAGE_DISMISSED = 'notice:prefix-sunset-dismissed';

export function prefixCommandsEnded(): boolean {
  return PREFIX_COMMANDS_END <= Date.now();
}

// the day in the page's language. utc, or the americas would read December 31
export function formatPrefixCommandsEnd(): string {
  return formatDate(PREFIX_COMMANDS_END, {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'});
}


// the warning at the top of the home, commands and dashboard pages, pointing people at slash commands (and mentions).
// closing it on one page closes it on all of them, they share the one stored answer
export function PrefixSunsetNotice({ className }: {className?: string}) {
  const { t, rich } = useI18n();
  const [ dismissed, setDismissed ] = useNoticeDismissed(STORAGE_DISMISSED);
  if (dismissed) {
    return null;
  }
  const ended = prefixCommandsEnded();
  const date = formatPrefixCommandsEnd();
  const code = (chunk: string) => <code className='font-mono text-code'>{chunk}</code>;
  return (
    <CollapsibleNotice
      className={className}
      title={t((ended) ? 'ui.prefix_sunset.title_ended' : 'ui.prefix_sunset.title', {date})}
      onDismiss={() => setDismissed(true)}
    >
      <p>{rich((ended) ? 'ui.prefix_sunset.description_ended' : 'ui.prefix_sunset.description', {code})}</p>
      <p className='mt-2'>{rich('ui.prefix_sunset.mention', {code})}</p>
    </CollapsibleNotice>
  );
}
