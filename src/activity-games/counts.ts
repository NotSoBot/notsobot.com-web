import { useEffect, useState } from 'react';

import type { EditorRoom, RoomMember } from '@/editor/room';

import type { GameKind } from './protocol';
import type { GameRoomsApi } from './rooms';


// What's going on in this server's Activity (or this dm's), for the start screen and the Games tab: how many people are
// editing media (their client says where they are, the room's `members` carry it) and a game's rooms (open, being
// played, people in them), or every game's. Live: members come over the socket, the rooms are fetched again when the socket says one
// changed or it reconnects


export type ActivityFeed = Pick<EditorRoom, 'subscribe' | 'onStatus' | 'members'>;

export interface GameRoomCounts {
  rooms: number,
  // rooms in a round (or between two) right now
  playing: number,
  // players and watchers, in every room
  people: number,
}

// a burst of room changes is one refetch
const REFRESH_DELAY = 800;


function countEditing(members: Array<RoomMember>): number {
  return members.filter((member) => member.screen === 'editor' || Boolean(member.editing)).length;
}


// people editing media here, null until the socket's said who's in
export function useEditingCount(room: ActivityFeed): number | null {
  const [ count, setCount ] = useState<number | null>(() => (room.members.length) ? countEditing(room.members) : null);
  useEffect(() => {
    if (room.members.length) {
      setCount(countEditing(room.members));
    }
    return room.subscribe((event) => {
      if (event.t === 'ready' || event.t === 'members') {
        setCount(countEditing(event.members));
      }
    });
  }, [room]);
  return count;
}


// A game's rooms here (`game`, every game's when null; this server's, not the global ones), null until the first fetch
// answers. One page, the rooms in a round first: a scope's room limit is under a page, so it's all of them
export function useGameRoomCounts(api: GameRoomsApi, room: ActivityFeed, game: GameKind | null): GameRoomCounts | null {
  const [ counts, setCounts ] = useState<GameRoomCounts | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    const refresh = () => {
      api.list({tab: 'server', game, sort: 'playing'}).then((result) => {
        if (alive) {
          setCounts({
            rooms: result.counts.server,
            playing: result.rooms.filter((item) => item.phase === 'round' || item.phase === 'reveal').length,
            people: result.rooms.reduce((total, item) => total + item.players.length + item.watchers, 0),
          });
        }
      }).catch(() => undefined);
    };
    const nudge = () => {
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          refresh();
        }, REFRESH_DELAY);
      }
    };
    refresh();
    const unsubscribe = room.subscribe((event) => {
      // the global rooms aren't counted here
      if (event.t === 'game_rooms_changed' && event.scope !== 'global') {
        nudge();
      }
    });
    const unsubscribeStatus = room.onStatus((status) => {
      if (status === 'open') {
        nudge();
      }
    });
    return () => {
      alive = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      unsubscribe();
      unsubscribeStatus();
    };
  }, [api, room, game]);
  return counts;
}
