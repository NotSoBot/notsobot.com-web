import { GuildCommandsSection } from '../GuildCommandsSection';
import { useServer } from '../ServerPage';


export function ServerCommandsPage() {
  const { guild } = useServer();
  return <GuildCommandsSection guild={guild}/>;
}
