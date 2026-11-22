import { ServerHome } from '../ServerHome';
import { useServer } from '../ServerPage';


export function ServerHomePage() {
  const { guild } = useServer();
  return <ServerHome guild={guild}/>;
}
