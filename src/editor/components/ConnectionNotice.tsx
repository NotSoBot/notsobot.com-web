import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n';

import type { EditorRoom, RoomStatus } from '../room';


// how long the socket has to be gone before it's said: a blip that's back within this shows nothing
const NOTICE_DELAY = 1500;


// The Activity lost its connection to the api (it restarted, the network dropped) and is reconnecting by itself
// (src/editor/room.ts): said on every screen, in the same place. Not a dialog: nothing has to be dismissed and the editor
// still saves over http meanwhile. A game's own screen has its strip for this (src/activity-games/FlagGame.tsx), the
// Activity leaves this one out there. Only once it has been connected: the first connect has the loading screen, and a
// socket that's turned away for good ends the Activity with its own message
export function ConnectionNotice({ room }: {room: EditorRoom}) {
  const { t } = useI18n();
  const [ away, setAway ] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    let opened = room.isOpen;
    const clear = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    const update = (status: RoomStatus) => {
      if (status === 'open') {
        opened = true;
      }
      if (status === 'open' || status === 'denied') {
        clear();
        setAway(false);
        return;
      }
      if (opened && timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          setAway(true);
        }, NOTICE_DELAY);
      }
    };
    update(room.status);
    const unsubscribe = room.onStatus(update);
    return () => {
      unsubscribe();
      clear();
    };
  }, [room]);

  if (!away) {
    return null;
  }
  return (
    <p
      role='status'
      className='pointer-events-none fixed top-[calc(0.5rem+var(--sait,0px))] left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-warning/50 bg-surface px-3 py-1.5 text-sm text-warning shadow-lg'
    >
      <WifiOff aria-hidden className='size-4 shrink-0'/>
      <span className='truncate'>{t('editor.activity.reconnecting')}</span>
    </p>
  );
}
