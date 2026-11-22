import { ServerLimitsSection } from '../../LimitsSummary';
import { ServerCreditsSection } from '../ServerCreditsSection';
import { useServer } from '../ServerPage';


export function ServerCreditsPage() {
  const { guild } = useServer();
  return (
    <>
      <ServerCreditsSection guild={guild}/>
      <ServerLimitsSection guild={guild}/>
    </>
  );
}
