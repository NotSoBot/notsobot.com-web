import { useEffect, useMemo, useState } from 'react';

import { launchScreen } from '@/editor/hosts/activityLaunch';
import type { RoomInviter } from '@/editor/invites';
import type { RoomEvent, RoomStatus } from '@/editor/room';

import { FlagGame } from '../FlagGame';
import { GameRooms, type GameRoomsFeed } from '../GameRooms';
import { ModeChoice } from '../ModeChoice';
import type { GameRoomSummary } from '../protocol';
import type { GameRoomsApi } from '../rooms';
import { FakeFlagGame } from './FakeFlagGame';


const MOCK_ROOMS: Array<GameRoomSummary> = [
  {
    id: 'mockroom0001', name: 'Dev flag room', creator: {user_id: '300000000000000002', username: 'flagfan', avatar_url: null}, created_at: Date.now(),
    locked: false, watch_only: false, phase: 'round', settings: {mode: 'type', rounds: 10, difficulty: 'medium', seconds: 20}, round: {number: 3, total: 10},
    players: [{user_id: '300000000000000002', username: 'flagfan', avatar_url: null}, {user_id: '300000000000000003', username: 'atlas', avatar_url: null}], watchers: 2,
  },
  {
    id: 'mockroom0002', name: null, creator: {user_id: '300000000000000004', username: 'mapper', avatar_url: null}, created_at: Date.now() - 60000,
    locked: true, watch_only: false, phase: 'lobby', settings: {mode: 'choices', rounds: 5, difficulty: 'easy', seconds: 15}, round: null,
    players: [{user_id: '300000000000000004', username: 'mapper', avatar_url: null}], watchers: 0,
  },
  {
    id: 'mockroom0003', name: 'Stream night', creator: {user_id: '300000000000000005', username: 'streamer', avatar_url: null}, created_at: Date.now() - 120000,
    locked: false, watch_only: true, phase: 'finished', settings: {mode: 'type', rounds: 20, difficulty: 'hard', seconds: 30}, round: {number: 20, total: 20},
    players: [{user_id: '300000000000000005', username: 'streamer', avatar_url: null}], watchers: 14,
  },
];


// the room header's Invite: a fake code after a moment, "Share link" says the link was copied and "Post in this channel"
// posts (`&post=0`: the api's refusal, a reason and no post)
function mockInviter(canPost: boolean): RoomInviter {
  const wait = <T, >(value: T) => new Promise<T>((resolve) => window.setTimeout(() => resolve(value), 400));
  return {
    kind: 'game',
    create: () => wait({code: 'mockInvite01', expires_at: Date.now() + 24 * 60 * 60 * 1000}),
    shareLink: () => wait('copied' as const),
    post: () => wait((canPost) ? {posted: true} : {posted: false, reason: 'You can’t send messages in this channel'}),
    errorOf: () => null,
  };
}


// the Activity's socket as the room list sees it: the dev bar's "rooms changed" is the api's `game_rooms_changed`
class MockRoomsFeed implements GameRoomsFeed {
  private listeners = new Set<(event: RoomEvent) => void>();

  subscribe(listener: (event: RoomEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(_listener: (status: RoomStatus) => void): () => void {
    return () => undefined;
  }

  changed(): void {
    for (const listener of this.listeners) {
      listener({t: 'game_rooms_changed'});
    }
  }
}


// Dev mocks only (`/activity?mockGame=1` on the `VITE_DASHBOARD_MOCKS=true` dev server, see src/activity.tsx): the mode
// choice, the room list and the flag game against FakeFlagGame, no Discord or api. `&host=0` makes a bot the host (the
// read-only settings), `&screen=rooms` opens on the room list, `&surface=games` (or `command`, `entry_point`, ...) on the
// screen that launch would open on, the room header's Invite answers with a fake code (`&post=0`: posting refused), the
// bar at the bottom drops the connection, has the bot host start or (on the room
// list) has someone join the first room. A locked room's password is "hunter22"
export function FlagGameMockApp() {
  const params = new URLSearchParams(window.location.search);
  const youHost = params.get('host') !== '0';
  const first = params.get('screen');
  const surface = params.get('surface');
  const [ screen, setScreen ] = useState<'choice' | 'rooms' | 'game' | 'editor'>(() => {
    if (first === 'choice' || first === 'rooms' || surface === null) {
      return (first === 'choice' || first === 'rooms') ? first : 'game';
    }
    const launched = launchScreen(surface, false);
    return (launched === 'games') ? 'rooms' : (launched === 'choice') ? 'choice' : 'editor';
  });
  const [ notice, setNotice ] = useState<string | null>(null);
  const [ watch, setWatch ] = useState(false);
  const [ connection, setConnection ] = useState(() => new FakeFlagGame({youHost}));
  useEffect(() => {
    connection.connect();
    return () => connection.close();
  }, [connection]);
  const [ feed ] = useState(() => new MockRoomsFeed());
  const [ inviter ] = useState(() => mockInviter(params.get('post') !== '0'));
  // more watchers on the first room, the dev bar's "rooms changed" adds one (only the list's refetch shows it)
  const [ extra ] = useState(() => ({watchers: 0}));
  const api = useMemo<GameRoomsApi>(() => ({
    list: async () => ({rooms: MOCK_ROOMS.map((room, index) => (index) ? room : {...room, watchers: room.watchers + extra.watchers}), limit: 20, moderator: false}),
    create: async (room) => ({...MOCK_ROOMS[0], id: 'mockroomnew1', name: room.name, locked: Boolean(room.password), watch_only: room.watch_only, phase: 'lobby', round: null, watchers: 0}),
    join: async (_gameId, password) => {
      if (password !== undefined && password !== 'hunter22') {
        throw new Error('That isn’t the password');
      }
      if (password === undefined) {
        throw new Error('locked');
      }
    },
  }), [extra]);

  return (
    <>
      {(screen === 'choice') ? (
        <ModeChoice onEdit={() => setScreen('editor')} onGame={() => setScreen('rooms')}/>
      ) : (screen === 'editor') ? (
        <div className='p-6 text-muted'>
          (mock) the editor would open here.{' '}
          <button type='button' className='text-brand-text underline' onClick={() => setScreen('choice')}>back</button>
        </div>
      ) : (screen === 'rooms') ? (
        <GameRooms
          api={api}
          room={feed}
          errorOf={(error) => (error instanceof Error) ? {status: 400, code: null, message: error.message, body: null} : null}
          notice={notice}
          onOpen={(_gameId, asWatcher) => {
            setWatch(asWatcher);
            setConnection(new FakeFlagGame({youHost, watch: asWatcher}));
            setScreen('game');
          }}
          onBack={() => setScreen('choice')}
        />
      ) : (
        <FlagGame
          key={String(watch)}
          connection={connection}
          inviter={inviter}
          onLeave={(why) => {
            setNotice(why ?? null);
            setScreen('rooms');
          }}
        />
      )}
      <div className='fixed bottom-36 left-0 z-50 flex flex-col gap-1 rounded-lg border border-warning/50 bg-deep/90 p-1.5 text-[0.65rem] text-warning opacity-70 hover:opacity-100'>
        <span>dev mock</span>
        <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => connection.drop()}>drop</button>
        {(!youHost) ? <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => connection.hostStart()}>host start</button> : null}
        {(screen === 'rooms') ? <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => {
          extra.watchers += 1;
          feed.changed();
        }}>rooms changed</button> : null}
      </div>
    </>
  );
}
