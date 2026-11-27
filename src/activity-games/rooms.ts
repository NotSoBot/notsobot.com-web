// The Activity's game rooms over http (`/activity/games/<instance_id>/rooms`): a page of one tab's rooms (this server's
// or the global ones), a new room, Quick play, and a password room's password. Playing in one is over the Activity's
// socket (connection.ts), which also says when a tab's list changed.
// Game points (`/activity/games/<instance_id>/points`, ./points) are here too, they're the same instance's
import { pathId, type EditorRequest } from '@/editor/api';

import type { ActivityGamePoints } from './points';
import type { AnyGameSettings, GameKind, GameRoomList, GameRoomSort, GameRoomSummary, GameRoomTab, GameRoomVisibility, QuickPlayResult } from './protocol';


export interface NewGameRoom {
  // Flag Guesser when left out
  game?: GameKind,
  // this server's when left out, a `from_launch` room always is
  visibility?: GameRoomVisibility,
  name: string | null,
  password?: string,
  watch_only: boolean,
  // continues the in-chat Flag Guesser they opened the Activity from (./FlagCarry): its settings, its flag first
  from_launch?: boolean,
  // Play solo: a room only they come in to (on no list), its game starting as they join, no countdown. Name, password,
  // watch-only and visibility are ignored. A new one closes their last one
  solo?: boolean,
  // its first game's settings, its game's (the api checks them like the lobby's), the defaults when left out
  settings?: AnyGameSettings,
}

export interface GameRoomQuery {
  tab: GameRoomTab,
  // every game's when left out
  game?: GameKind | null,
  // part of a room's name, any case
  q?: string,
  sort?: GameRoomSort,
  // the last page's `next_cursor`, the first page without one
  cursor?: string | null,
  limit?: number,
}

export interface GameRoomsApi {
  list: (query: GameRoomQuery) => Promise<GameRoomList>,
  create: (room: NewGameRoom) => Promise<GameRoomSummary>,
  // the fullest open public lobby of that game in that tab, or a new one there: joined like any room after
  quick: (game: GameKind, tab: GameRoomTab) => Promise<QuickPlayResult>,
  // a password room's password (a public one needs none, a removed person is refused)
  join: (gameId: string, password?: string) => Promise<void>,
  // their own points here and this server's board (a dm's: the global one)
  points: () => Promise<ActivityGamePoints>,
}


export function createGameRoomsApi(request: EditorRequest, instanceId: string): GameRoomsApi {
  const instance = `/activity/games/${pathId(instanceId)}`;
  const base = `${instance}/rooms`;
  return {
    list: ({ tab, game, q, sort, cursor, limit }) => request<GameRoomList>(base, {query: {
      tab,
      game: game ?? undefined,
      q: q || undefined,
      sort,
      cursor: cursor ?? undefined,
      limit,
    }}),
    create: (room) => request<GameRoomSummary>(base, {method: 'POST', body: room}),
    quick: (game, tab) => request<QuickPlayResult>(`${base}/quick`, {method: 'POST', body: {game, tab}}),
    join: async (gameId, password) => {
      await request(`${base}/${pathId(gameId)}/join`, {method: 'POST', body: (password) ? {password} : {}});
    },
    points: () => request<ActivityGamePoints>(`${instance}/points`),
  };
}
