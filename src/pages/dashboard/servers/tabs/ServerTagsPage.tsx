import { GuildTagsSection } from '../GuildTagsSection';
import { useServer } from '../ServerPage';


export function ServerTagsPage() {
  const { guild } = useServer();
  return <GuildTagsSection guild={guild}/>;
}
