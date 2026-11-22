import { AIKnowledgeSection } from '../AIKnowledgeSection';
import { useServer } from '../ServerPage';
import { ServerSettingsForm } from '../ServerSettingsForm';


export function ServerNotSoAIPage() {
  const { guild, setDirty } = useServer();
  return (
    <>
      <ServerSettingsForm guild={guild} group='ai' onDirtyChange={setDirty('ai')}/>
      <AIKnowledgeSection guild={guild}/>
    </>
  );
}
