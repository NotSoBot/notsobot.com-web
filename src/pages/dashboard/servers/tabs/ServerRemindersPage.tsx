import { GuildRemindersSection } from '../GuildRemindersSection';
import { useServer } from '../ServerPage';


export function ServerRemindersPage() {
  const { guild } = useServer();
  return <GuildRemindersSection guild={guild}/>;
}
