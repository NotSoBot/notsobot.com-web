import { SavedFontsPanel } from '../../fonts/SavedFontsPanel';
import { useReadOnlyMessage } from '../guildMeta';
import { useServer } from '../ServerPage';


export function ServerFontsPage() {
  const { guild } = useServer();
  const readOnlyMessage = useReadOnlyMessage();
  return <SavedFontsPanel guildId={guild.id} editable={guild.editable.settings} readOnly={readOnlyMessage('settings')}/>;
}
