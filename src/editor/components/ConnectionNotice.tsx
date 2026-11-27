import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n';

import type { EditorRoom, RoomStatus } from '../room';


// how long the socket has to be gone before it's said: a blip that's back within this shows nothing
const NOTICE_DELAY = 1500;
// a socket that has never been open gets longer: its first connect is still on its way when the first screen shows
const FIRST_NOTICE_DELAY = 5000;


// The Activity lost its connection to the api (it restarted, the network dropped) and is reconnecting by itself
// (src/editor/room.ts): said on every screen, in the same place. Not a dialog: nothing has to be dismissed and the editor
// still saves over http meanwhile. Mounted once for as long as the Activity runs, so what it knows about the socket
// carries from screen to screen. `muted`: a game's own screen has its strip for this (src/activity-games/FlagGame.tsx),
// nothing is shown there but the socket is still followed. A first connect that doesn't come is said too, after
// FIRST_NOTICE_DELAY (the first screen doesn't wait for the socket), and a socket that's turned away for good ends the
// Activity with its own message
export function ConnectionNotice({ room, muted = false }: {room: EditorRoom, muted?: boolean}) {
  const { t } = useI18n();
  const [ away, setAway ] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    // `you` comes with the first `ready` and stays: whether it has ever been open, whenever this is mounted
    let opened = room.isOpen || room.you !== null;
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
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          setAway(true);
        }, (opened) ? NOTICE_DELAY : FIRST_NOTICE_DELAY);
      }
    };
    update(room.status);
    const unsubscribe = room.onStatus(update);
    return () => {
      unsubscribe();
      clear();
    };
  }, [room]);

  if (!away || muted) {
    return null;
  }
  return (
    <p
      role='status'
      data-state='reconnecting'
      className='pointer-events-none fixed top-[calc(0.5rem+var(--sait,0px))] left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-warning/50 bg-surface px-3 py-1.5 text-sm text-warning shadow-lg'
    >
      <WifiOff aria-hidden className='size-4 shrink-0'/>
      <span className='truncate'>{t('editor.activity.reconnecting')}</span>
    </p>
  );
}
