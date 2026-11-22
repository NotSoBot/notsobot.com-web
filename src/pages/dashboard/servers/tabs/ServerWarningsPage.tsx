import { useServer } from '../ServerPage';
import { ServerSettingsForm } from '../ServerSettingsForm';
import { WarningsSection } from '../WarningsSection';


export function ServerWarningsPage() {
  const { guild, setDirty } = useServer();
  // the list moderators come for first, then its settings
  return (
    <>
      <WarningsSection guild={guild}/>
      <ServerSettingsForm guild={guild} group='warnings' onDirtyChange={setDirty('warnings')}/>
    </>
  );
}
