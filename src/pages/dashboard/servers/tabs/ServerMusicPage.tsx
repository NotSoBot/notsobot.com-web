import { MusicSection } from '../MusicSection';
import { MusicStatsSection } from '../MusicStatsSection';
import { useServer } from '../ServerPage';


export function ServerMusicPage() {
  const { guild } = useServer();
  return (
    <>
      <MusicSection guild={guild}/>
      <MusicStatsSection guild={guild}/>
    </>
  );
}
