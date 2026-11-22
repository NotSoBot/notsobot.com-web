import { GuildReportsSection } from '../GuildReportsSection';
import { useServer } from '../ServerPage';


export function ServerReportsPage() {
  const { guild } = useServer();
  return <GuildReportsSection guild={guild}/>;
}
