import { useEffect, useState } from 'react';

import type { EditorRoom, RoomMember } from '@/editor/room';

import { GAMES } from './catalog';
import type { GameKind } from './protocol';
import type { GameRoomsApi } from './rooms';


// What's going on in this server's Activity (or this dm's), for the start screen and the Games tab: how many people are
// editing media (their client says where they are, the room's `members` carry it) and a game's rooms (open, being
// played, people in them), or every game's. Live: members come over the socket, the rooms are fetched again when the socket says one
// changed or it reconnects


export type ActivityFeed = Pick<EditorRoom, 'subscribe' | 'onStatus' | 'members' | 'you'>;

// someone else here who's in a room the start screen can take you to: a lobby they're editing, or a game room
export type JoinTarget =
  | {kind: 'editor', member: RoomMember, documentId: string}
  | {kind: 'game', member: RoomMember, gameId: string, game: GameKind};

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


// how many people the start screen offers to join, the busiest rooms first
export const JOIN_TARGETS_SHOWN = 3;

// The others here who are in a room (`members`, the api's: `editing` a lobby, `playing` a game room), each once. Ones in
// the same room as someone already listed are left out, the busier rooms go first, a game they can't open (a newer
// client's) is skipped. `first`: whose launch message they pressed Join on (the entry point's, its launch's
// `joined_user_id`), their room goes first and its row is theirs
export function joinTargets(members: Array<RoomMember>, you: string | null, first: string | null = null): Array<JoinTarget> {
  const counts = new Map<string, number>();
  const targets: Array<JoinTarget> = [];
  let firstKey: string | null = null;
  for (const member of members) {
    if (member.user_id === you) {
      continue;
    }
    const playing = member.playing;
    const known = (playing) ? GAMES.find((game) => game.id === playing.game) : undefined;
    const target: JoinTarget | null = (member.editing) ? {kind: 'editor', member, documentId: member.editing}
      : (playing && known) ? {kind: 'game', member, gameId: playing.game_id, game: known.id} : null;
    if (!target) {
      continue;
    }
    const key = joinTargetKey(target);
    const seen = counts.get(key) ?? 0;
    counts.set(key, seen + 1);
    if (member.user_id === first && firstKey === null) {
      firstKey = key;
      if (seen) {
        // someone else in their room was listed before them: the row shows them instead
        const index = targets.findIndex((listed) => joinTargetKey(listed) === key);
        targets[index] = target;
      }
    }
    if (!seen) {
      targets.push(target);
    }
  }
  // stable: the same count keeps the socket's order
  return targets.sort((a, b) => {
    const aKey = joinTargetKey(a);
    const bKey = joinTargetKey(b);
    if (aKey === firstKey || bKey === firstKey) {
      return (aKey === firstKey) ? -1 : 1;
    }
    return (counts.get(bKey) ?? 0) - (counts.get(aKey) ?? 0);
  });
}

export function joinTargetKey(target: JoinTarget): string {
  return (target.kind === 'editor') ? `editor:${target.documentId}` : `game:${target.gameId}`;
}

// `joinTargets`, live, empty until the socket's said who's in
export function useJoinTargets(room: ActivityFeed, first: string | null = null): Array<JoinTarget> {
  const [ targets, setTargets ] = useState<Array<JoinTarget>>(() => joinTargets(room.members, room.you, first));
  useEffect(() => {
    setTargets(joinTargets(room.members, room.you, first));
    return room.subscribe((event) => {
      if (event.t === 'ready' || event.t === 'members') {
        setTargets(joinTargets(event.members, room.you, first));
      }
    });
  }, [room, first]);
  return targets;
}


// A game's rooms here (`game`, every game's when null; this server's, not the global ones), null until the first fetch
// answers. One page, the rooms in a round first: a scope's room limit is under a page, so it's all of them
export function useGameRoomCounts(api: GameRoomsApi, room: ActivityFeed, game: GameKind | null): GameRoomCounts | null {
  const [ counts, setCounts ] = useState<GameRoomCounts | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    // the fetch asked last: an older one answering after it (it was slow) would put its older rooms back
    let latest = 0;
    const refresh = () => {
      const asked = ++latest;
      api.list({tab: 'server', game, sort: 'playing'}).then((result) => {
        if (alive && asked === latest) {
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
