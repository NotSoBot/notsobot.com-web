import { ServerDataSection } from '../ServerDataSection';
import { useServer } from '../ServerPage';
import { LoggersSection, PrefixesSection } from '../ServerSections';
import { ServerSettingsForm } from '../ServerSettingsForm';


export function ServerSettingsPage() {
  const { guild, setDirty } = useServer();
  return (
    <>
      <PrefixesSection guild={guild}/>
      <ServerSettingsForm guild={guild} group='general' onDirtyChange={setDirty('general')}/>
      <ServerSettingsForm guild={guild} group='moderation' onDirtyChange={setDirty('moderation')}/>
      <LoggersSection guild={guild}/>
      <ServerDataSection guild={guild}/>
    </>
  );
}
