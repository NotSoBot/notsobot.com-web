import { useServer } from '../ServerPage';
import { ServerVoicesSection } from '../ServerVoicesSection';


export function ServerVoicesPage() {
  const { guild } = useServer();
  return <ServerVoicesSection guild={guild}/>;
}
