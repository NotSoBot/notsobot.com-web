import { useI18n } from '@/i18n';
import type { UserGuild } from '@/lib/api';

import { Panel } from '../ui';
import { VoiceList } from '../voices/VoiceList';
import { useReadOnlyMessage } from './guildMeta';


// The server's own cloned voices (`tts voice server create`), anyone in it can use them in the bot's TTS: any member
// listens to their clips, Manage Server renames, moves and deletes them like the bot's `tts voice server` commands
export function ServerVoicesSection({ guild }: {guild: UserGuild}) {
  const { t, rich } = useI18n();
  const readOnlyMessage = useReadOnlyMessage();
  const editable = guild.editable.settings;
  return (
    <Panel
      title={t('voices.server_title')}
      accent='#eb459e'
      description={rich('voices.server_description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
      readOnly={(editable) ? undefined : readOnlyMessage('settings')}
    >
      <VoiceList guildId={guild.id} editable={editable}/>
    </Panel>
  );
}
