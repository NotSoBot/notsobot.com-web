import { useServer } from '../ServerPage';
import { RulesSection } from '../ServerSections';


export function ServerRulesPage() {
  const { guild } = useServer();
  return <RulesSection guild={guild}/>;
}
