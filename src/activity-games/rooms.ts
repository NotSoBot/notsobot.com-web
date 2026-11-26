// The Activity's game rooms over http (`/activity/games/<instance_id>/rooms`): the list, a new room, and a password
// room's password. Playing in one is over the Activity's socket (connection.ts), which also says when the list changed
import { pathId, type EditorRequest } from '@/editor/api';

import type { GameRoomList, GameRoomSummary } from './protocol';


export interface NewGameRoom {
  name: string | null,
  password?: string,
  watch_only: boolean,
}

export interface GameRoomsApi {
  list: () => Promise<GameRoomList>,
  create: (room: NewGameRoom) => Promise<GameRoomSummary>,
  // a password room's password (a public one needs none, a removed person is refused)
  join: (gameId: string, password?: string) => Promise<void>,
}


export function createGameRoomsApi(request: EditorRequest, instanceId: string): GameRoomsApi {
  const base = `/activity/games/${pathId(instanceId)}/rooms`;
  return {
    list: () => request<GameRoomList>(base),
    create: (room) => request<GameRoomSummary>(base, {method: 'POST', body: room}),
    join: async (gameId, password) => {
      await request(`${base}/${pathId(gameId)}/join`, {method: 'POST', body: (password) ? {password} : {}});
    },
  };
}
