import { useEffect, useMemo, useState } from 'react';

import { HowToPlayButton } from '@/components/guides/GuideSheet';
import { GUIDE_SLUGS } from '@/content/guides';
import { EditorErrorCodes } from '@/editor/api';
import { launchScreen } from '@/editor/hosts/activityLaunch';
import type { RoomInviter } from '@/editor/invites';
import type { RoomEvent, RoomMember, RoomStatus } from '@/editor/room';

import { FlagCarry } from '../FlagCarry';
import { FlagGame } from '../FlagGame';
import type { ActivityFeed } from '../counts';
import { GameRooms } from '../GameRooms';
import { GamesTab } from '../GamesTab';
import { ModeChoice } from '../ModeChoice';
import {
  DEFAULT_SETTINGS,
  GAME_DIFFICULTIES,
  LETTER_TRAIL_DEFAULT_SETTINGS,
  LETTER_TRAIL_SECONDS,
  type AnyGameSettings,
  type GameKind,
  type GameRoomSort,
  type GameRoomSummary,
  type GameRoomTab,
  type GameRoomVisibility,
  type GameSettings,
  type LetterTrailSettings,
} from '../protocol';
import type { GameRoomsApi } from '../rooms';
import { FakeFlagGame } from './FakeFlagGame';
import { FakeLetterTrail } from './FakeLetterTrail';
import { MOCK_COUNTRIES } from './flags';
import type { ActivityGamePoints, GamePointsBoardItem, GameStatsByGame } from '../points';
import { PipView, useCompactLayout } from '@/editor/hosts/pip';


// the room browser's rooms: enough of both tabs to page through (20 a page), global ones from a few servers (one the bot
// doesn't know the name of, one made in a dm), one with a long name. Made the same every load
const MOCK_ROOM_NAMES = [
  'Dev flag room', null, 'Stream night', 'Europe only pls', 'Speedrun flags', null, 'Chill guesses', 'Hard mode heroes',
  'Late-night geography marathon for pros!', 'Island nations', null, 'Quick ten', 'Vexillology club', 'No hints allowed',
];
const MOCK_NAMES = ['flagfan', 'atlas', 'mapper', 'streamer', 'mochi', 'quill', 'a_very_long_username_here', 'cake', 'beebo', 'lucia'];
const MOCK_GUILDS: Array<GameRoomSummary['origin']> = [
  {guild_id: '200000000000000001', guild_name: 'Geography Nerds'},
  {guild_id: '200000000000000002', guild_name: 'NotSoBot Support'},
  {guild_id: '200000000000000003', guild_name: null},
  {guild_id: '200000000000000004', guild_name: 'A server with a really quite long name that keeps on going'},
  null,
];
const MOCK_PHASES: Array<GameRoomSummary['phase']> = ['lobby', 'round', 'lobby', 'reveal', 'finished', 'lobby', 'round'];

function mockRooms(visibility: GameRoomVisibility, count: number): Array<GameRoomSummary> {
  const now = Date.now();
  return Array.from({length: count}, (_, index) => {
    const seed = index + ((visibility === 'global') ? 7 : 0);
    const phase = MOCK_PHASES[seed % MOCK_PHASES.length];
    const players = Array.from({length: 1 + ((seed * 5) % 9)}, (__, player) => {
      const username = MOCK_NAMES[(seed + player) % MOCK_NAMES.length];
      return {user_id: `3000000000000${String(seed * 20 + player).padStart(5, '0')}`, username, avatar_url: null};
    });
    // every third room is Letter Trail's
    const letters = seed % 3 === 2;
    const rounds = (letters) ? 1 + (seed % 5) : [5, 10, 15, 20][seed % 4];
    return {
      id: `mock${visibility.charAt(0)}${String(index).padStart(7, '0')}`,
      game: (letters) ? 'letter_trail' : 'flag_guesser',
      visibility,
      origin: (visibility === 'global') ? MOCK_GUILDS[index % MOCK_GUILDS.length] : {guild_id: '200000000000000000', guild_name: 'Dev server'},
      name: MOCK_ROOM_NAMES[seed % MOCK_ROOM_NAMES.length],
      creator: players[0],
      created_at: now - index * 7 * 60000,
      locked: seed % 6 === 1,
      watch_only: seed % 9 === 2,
      phase,
      settings: (letters)
        ? {size: (seed % 2) ? 5 : 4, seconds: LETTER_TRAIL_SECONDS[seed % 3], rounds}
        : {mode: (seed % 3) ? 'type' : 'choices', rounds, difficulty: GAME_DIFFICULTIES[seed % 3], seconds: 20},
      round: (phase === 'round' || phase === 'reveal') ? {number: 1 + (seed % rounds), total: rounds} : (phase === 'finished') ? {number: rounds, total: rounds} : null,
      players,
      watchers: (seed * 3) % 5,
      solo: false,
    };
  });
}

// the api's orders (game-rooms-plan.md "Build scope and contract")
function sortMockRooms(rooms: Array<GameRoomSummary>, sort: GameRoomSort): Array<GameRoomSummary> {
  const rank = (room: GameRoomSummary, first: Array<GameRoomSummary['phase']>) => (first.includes(room.phase)) ? 0 : (room.phase === 'finished') ? 2 : 1;
  return [...rooms].sort((a, b) => {
    if (sort === 'newest') {
      return b.created_at - a.created_at;
    }
    const first: Array<GameRoomSummary['phase']> = (sort === 'filling') ? ['lobby'] : ['round', 'reveal'];
    return rank(a, first) - rank(b, first) || b.players.length - a.players.length || b.created_at - a.created_at;
  });
}

const MOCK_YOU_PLAYER = {user_id: '300000000000000001', username: 'you_in_dev', avatar_url: null};

// a refusal with the api's own code (`errorOf` below reads it), for the ones the screens tell apart by it
class MockApiError extends Error {
  constructor(message: string, readonly code: number) {
    super(message);
  }
}


// the Games tab's game points: you're on both boards, a few places down
const MOCK_YOU = '300000000000000001';
function mockBoard(names: Array<[string, number]>): Array<GamePointsBoardItem> {
  return names.map(([ username, points ], index) => ({
    rank: index + 1,
    user_id: (username === 'you_in_dev') ? MOCK_YOU : `30000000000000010${index}`,
    username,
    avatar_url: null,
    points,
  }));
}
// your record in each game (game-stats-plan.md): Flag Guesser with every column, Letter Trail a few games
const MOCK_STATS: GameStatsByGame = {
  flag_guesser: {
    games: 23, wins: 12, losses: 5, ties: 1, left: 2, solo: 3, win_streak: 3, best_win_streak: 7,
    stats: {best_score: 31, named: 142, firsts: 38, best_streak: 9, fastest_ms: 1430},
  },
  letter_trail: {
    games: 6, wins: 2, losses: 3, ties: 0, left: 0, solo: 1, win_streak: 0, best_win_streak: 1,
    stats: {best_score: 74, words: 118, only_you: 21, longest_word: 'gardens'},
  },
};
// nobody's played yet: every game there with zeros (the api's), so no game's block shows
const EMPTY_STATS: GameStatsByGame = {
  flag_guesser: {games: 0, wins: 0, losses: 0, ties: 0, left: 0, solo: 0, win_streak: 0, best_win_streak: 0, stats: {}},
  letter_trail: {games: 0, wins: 0, losses: 0, ties: 0, left: 0, solo: 0, win_streak: 0, best_win_streak: 0, stats: {}},
};
const MOCK_POINTS: ActivityGamePoints = {
  you: {user_id: MOCK_YOU, total: 1284, games: {flag_guesser: 1101, letter_trail: 183}, week: 96, rank: {global: 1532, guild: 4}, hidden: false, stats: MOCK_STATS},
  board: {scope: 'guild', period: 'all', game: null, items: mockBoard([['flagfan', 4810], ['atlas', 3122], ['mapper', 1990], ['you_in_dev', 1284], ['streamer', 1203], ['mochi', 870], ['quill', 455]])},
  week_board: {scope: 'guild', period: 'week', game: null, items: mockBoard([['atlas', 288], ['flagfan', 241], ['you_in_dev', 96], ['a_very_long_username_here', 71], ['mochi', 12], ['quill', 4]])},
};
const EMPTY_POINTS: ActivityGamePoints = {
  you: {user_id: MOCK_YOU, total: 0, games: {}, week: 0, rank: {global: null, guild: null}, hidden: false, stats: EMPTY_STATS},
  board: {scope: 'global', period: 'all', game: null, items: []},
  week_board: {scope: 'global', period: 'week', game: null, items: []},
};
// a dm's, you hid from the global boards: no rank and not on them
const HIDDEN_POINTS: ActivityGamePoints = {
  you: {...MOCK_POINTS.you, rank: {global: null, guild: null}, hidden: true},
  board: {scope: 'global', period: 'all', game: null, items: mockBoard([['flagfan', 4810], ['atlas', 3122], ['mapper', 1990], ['streamer', 1203], ['mochi', 870]])},
  week_board: {scope: 'global', period: 'week', game: null, items: mockBoard([['atlas', 288], ['flagfan', 241], ['a_very_long_username_here', 71], ['mochi', 12]])},
};


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
class MockRoomsFeed implements ActivityFeed {
  private listeners = new Set<(event: RoomEvent) => void>();
  you: string | null = MOCK_YOU_PLAYER.user_id;
  // two people editing (one in a lobby), one on the start screen (the mode choice's count), two in a game room and
  // you: the mode choice's Join rows (`&friends=0` has nobody in a room)
  members: Array<RoomMember> = [
    {user_id: '1', username: 'cake', avatar_url: null, screen: 'editor'},
    {user_id: '2', username: 'beebo', avatar_url: null, editing: 'mocklobby1'},
    {user_id: '3', username: 'lucia', avatar_url: null, screen: null},
    {user_id: '4', username: 'mochi', avatar_url: null, screen: 'games', playing: {game_id: 'mockroom00002', game: 'letter_trail'}},
    {user_id: '5', username: 'ferretking', avatar_url: null, screen: 'games', playing: {game_id: 'mockroom00002', game: 'letter_trail'}},
    {user_id: MOCK_YOU_PLAYER.user_id, username: MOCK_YOU_PLAYER.username, avatar_url: null, screen: null},
  ];

  constructor(friends: boolean = true) {
    if (!friends) {
      this.members = this.members.map((member) => ({...member, editing: null, playing: null}));
    }
  }

  subscribe(listener: (event: RoomEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(_listener: (status: RoomStatus) => void): () => void {
    return () => undefined;
  }

  changed(scope: GameRoomTab): void {
    for (const listener of this.listeners) {
      listener({t: 'game_rooms_changed', scope});
    }
  }
}


// Dev mocks only (`/activity?mockGame=1` on the `VITE_DASHBOARD_MOCKS=true` dev server, see src/activity.tsx): the mode
// choice, the room browser and the flag game against FakeFlagGame, no Discord or api. `&host=0` makes a bot the host (the
// read-only settings), `&screen=tab` opens on the Games tab, `&screen=rooms` on the room browser, `&surface=games` (or `command`, `entry_point`, ...) on the
// screen that launch would open on, the room header's Invite answers with a fake code (`&post=0`: posting refused), the
// bar at the bottom drops the connection, has the bot host start or (on the room
// browser) has someone watch the first room of a tab (`game_rooms_changed` with that scope). A locked room's password is
// "hunter22". `&friends=0` has nobody in a room on the mode choice (no Join rows), `&joined=2` launched from that member's Join (their room first). `&rooms=0` has no rooms at all, `&quick=fail` Quick play refused. Game points: `&points=empty` (a dm's,
// nobody has any), `&points=hidden` (a dm's, you hid from the global boards), `&points=fail`, `&cap=N` leaves N of your daily cap (the finished screen's limit line), the bar's
// "finish" ends the game now. Play solo makes a solo room (on no list) that starts as it opens, New room and a Quick play
// that makes one open with only you in them (the lobby's invite card) until the bar's "someone joins". How to play's ? has
// a dot until a guide's opened and a lobby's How to play card starts open until a game's finished (`&guides=reset`
// forgets both, for every guide and game); the editor's stand-in has the media editor's ?. Letter Trail: every third mock room is one (opened against FakeLetterTrail), and
// `&game=letters` opens straight into one, `&phase=countdown|round|reveal|finished` on that screen (with made-up words),
// `&hold=1` keeps it there (no round end, no reveal timer), `&solo=1` a solo one, `&size=5` a 5x5 grid. `&owner=1` has the
// owners' connection logs in the header, `&join=too_many|socket|slow` a flag game join that hangs until Try again,
// `&moderator=1` a room where you moderate the server (`ready`'s `moderator`: remove anyone, close any room)
// either game's fake engine, the dev bar works the same on both
type MockGame = FakeFlagGame | FakeLetterTrail;

// `&join=too_many|socket|slow`: the flag game's join hangs that way until Try again (`&owner=1` to read its logs)
function stuckJoinOf(value: string | null): 'too_many' | 'socket' | 'slow' | null {
  return (value === 'too_many' || value === 'socket' || value === 'slow') ? value : null;
}

function mockPhase(value: string | null): 'lobby' | 'countdown' | 'round' | 'reveal' | 'finished' {
  return (value === 'countdown' || value === 'round' || value === 'reveal' || value === 'finished') ? value : 'lobby';
}


// the carried flag's image after a moment, like the api route (`&screen=carry`, `&flag=0` for a game whose flag was answered)
async function loadMockCarriedFlag(): Promise<string | null> {
  await new Promise((resolve) => window.setTimeout(resolve, 400));
  return MOCK_COUNTRIES[0].flag;
}


export function FlagGameMockApp() {
  const params = new URLSearchParams(window.location.search);
  useState(() => {
    if (params.get('guides') === 'reset') {
      try {
        for (const slug of GUIDE_SLUGS) {
          window.localStorage.removeItem(`nsb.activity.guide_seen.${slug}`);
          window.localStorage.removeItem(`nsb.activity.guide_opened.${slug}`);
        }
        for (const game of ['flag_guesser', 'letter_trail']) {
          window.localStorage.removeItem(`nsb.activity.game_played.${game}`);
          window.localStorage.removeItem(`nsb.activity.lobby_rules.${game}`);
        }
      } catch {
        // blocked storage remembers nothing anyway
      }
    }
  });
  const youHost = params.get('host') !== '0';
  const moderator = params.get('moderator') === '1';
  const dailyLeft = (params.get('cap') !== null) ? Number(params.get('cap')) : Infinity;
  const pointsMode = params.get('points');
  const first = params.get('screen');
  const surface = params.get('surface');
  const [ screen, setScreen ] = useState<'choice' | 'tab' | 'rooms' | 'game' | 'editor' | 'carry'>(() => {
    if (first === 'choice' || first === 'tab' || first === 'rooms' || first === 'carry' || surface === null) {
      return (first === 'choice' || first === 'tab' || first === 'rooms' || first === 'carry') ? first : 'game';
    }
    const launched = launchScreen(surface, false);
    return (launched === 'games') ? 'tab' : (launched === 'flag_guesser') ? 'rooms' : (launched === 'choice') ? 'choice' : 'editor';
  });
  const [ notice, setNotice ] = useState<string | null>(null);
  // the browser's game filter, from the Games tab card it was opened with
  const [ roomsGame, setRoomsGame ] = useState<GameKind | null>(null);
  const [ watch, setWatch ] = useState(false);
  const lettersFirst = params.get('game') === 'letters';
  const [ connection, setConnection ] = useState<MockGame>(() => (lettersFirst) ? new FakeLetterTrail({
    youHost, dailyLeft, moderator, solo: params.get('solo') === '1', hold: params.get('hold') === '1',
    phase: mockPhase(params.get('phase')),
    settings: {...LETTER_TRAIL_DEFAULT_SETTINGS, size: (params.get('size') === '5') ? 5 : 4},
  }) : new FakeFlagGame({youHost, dailyLeft, moderator, stuckJoin: stuckJoinOf(params.get('join'))}));
  // `&owner=1`: a NotSoBot owner's header (the connection logs)
  const owner = params.get('owner') === '1';
  useEffect(() => {
    connection.connect();
    return () => connection.close();
  }, [connection]);
  const [ feed ] = useState(() => new MockRoomsFeed(params.get('friends') !== '0'));
  const [ inviter ] = useState(() => mockInviter(params.get('post') !== '0'));
  // both tabs' rooms, made and changed by the browser's New room, Quick play and the dev bar
  const [ store ] = useState(() => ({
    rooms: (params.get('rooms') === '0') ? [] : [...mockRooms('server', 26), ...mockRooms('global', 47)],
    // solo rooms are on no list: their settings, by id
    solo: new Map<string, {game: GameKind, settings: AnyGameSettings}>(),
  }));
  const api = useMemo<GameRoomsApi>(() => {
    const matching = (game: string | null | undefined, q: string | undefined) => store.rooms.filter((room) => (!game || room.game === game)
      && (!q || (room.name ?? `${room.creator.username}’s room`).toLowerCase().includes(q.toLowerCase())));
    const made = (visibility: GameRoomVisibility, room: Partial<GameRoomSummary>): GameRoomSummary => {
      const created: GameRoomSummary = {
        id: `mocknew${String(store.rooms.length).padStart(5, '0')}`, game: 'flag_guesser', visibility,
        origin: {guild_id: '200000000000000000', guild_name: 'Dev server'}, name: null, creator: MOCK_YOU_PLAYER,
        created_at: Date.now(), locked: false, watch_only: false, phase: 'lobby',
        settings: (room.game === 'letter_trail') ? {...LETTER_TRAIL_DEFAULT_SETTINGS} : {mode: 'type', rounds: 10, difficulty: 'medium', seconds: 20},
        round: null, players: [MOCK_YOU_PLAYER], watchers: 0, solo: false, ...room,
      };
      store.rooms = [created, ...store.rooms];
      return created;
    };
    return {
      // a moment like a real fetch, so the counts and cards show their placeholders first
      list: async ({ tab, game, q, sort = 'filling', cursor, limit = 20 }) => {
        await new Promise((resolve) => window.setTimeout(resolve, 600));
        const found = matching(game, q);
        // the api's counts follow the game filter, never the search (a tab says how many rooms it has)
        const counted = matching(game, '');
        const shown = sortMockRooms(found.filter((room) => room.visibility === tab), sort);
        const offset = Number(cursor ?? 0);
        return {
          rooms: shown.slice(offset, offset + limit),
          next_cursor: (offset + limit < shown.length) ? String(offset + limit) : null,
          counts: {server: counted.filter((room) => room.visibility === 'server').length, global: counted.filter((room) => room.visibility === 'global').length},
          limit: 30,
          global_limit: 100,
          moderator: tab === 'server',
        };
      },
      create: async (room) => {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        if (room.solo) {
          const id = `mocksolo${String(store.solo.size).padStart(4, '0')}`;
          const game = room.game ?? 'flag_guesser';
          const settings = {...(room.settings ?? ((game === 'letter_trail') ? LETTER_TRAIL_DEFAULT_SETTINGS : DEFAULT_SETTINGS))};
          store.solo.set(id, {game, settings});
          return {
            id, game, visibility: 'server', origin: null, name: null, creator: MOCK_YOU_PLAYER,
            created_at: Date.now(), locked: false, watch_only: false, phase: 'lobby', settings, round: null, players: [], watchers: 0, solo: true,
          };
        }
        return made(room.visibility ?? 'server', {game: room.game ?? 'flag_guesser', name: room.name, locked: Boolean(room.password), watch_only: room.watch_only});
      },
      // the fullest open public lobby in that tab, else a new one
      quick: async (game, tab) => {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        if (params.get('quick') === 'fail') {
          throw new Error('You can only have one global room open at a time');
        }
        const open = sortMockRooms(store.rooms.filter((room) => room.game === game && room.visibility === tab && room.phase === 'lobby' && !room.locked && !room.watch_only), 'filling');
        if (open.length) {
          return {id: open[0].id, created: false};
        }
        return {id: made(tab, {game}).id, created: true};
      },
      // asked without one first (the api lets in whoever gave it already): refused with the api's locked code, which
      // is what opens the password dialog
      join: async (_gameId, password) => {
        if (password !== undefined && password !== 'hunter22') {
          throw new Error('That isn’t the password');
        }
        if (password === undefined) {
          throw new MockApiError('This room needs its password', EditorErrorCodes.EDITOR_LOBBY_LOCKED);
        }
      },
      // a moment like the list's, so the points show blank first
      points: async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        if (pointsMode === 'fail') {
          throw new Error('points failed');
        }
        return (pointsMode === 'empty') ? EMPTY_POINTS : (pointsMode === 'hidden') ? HIDDEN_POINTS : MOCK_POINTS;
      },
    };
  }, [store, pointsMode]);
  // someone starts watching a tab's first room, the api says that tab changed
  const changeRooms = (scope: GameRoomTab) => {
    const first = store.rooms.find((room) => room.visibility === scope);
    if (first) {
      store.rooms = store.rooms.map((room) => (room === first) ? {...room, watchers: room.watchers + 1} : room);
    }
    feed.changed(scope);
  };

  // a window this small shows the Activity's compact view, like Discord's corner window
  const compact = useCompactLayout(null);

  return (
    <>
      {(compact) ? <PipView/> : null}
      {(screen === 'choice') ? (
        <ModeChoice
          api={api}
          room={feed}
          onEdit={() => setScreen('editor')}
          onGame={() => setScreen('tab')}
          first={params.get('joined')}
          // a moment like the real join, then where it would land
          onJoin={async (target) => {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            setScreen((target.kind === 'game') ? 'game' : 'editor');
          }}
        />
      ) : (screen === 'editor') ? (
        <div className='flex items-center gap-2 p-6 text-muted'>
          <span>
            (mock) the editor would open here.{' '}
            <button type='button' className='text-brand-text underline' onClick={() => setScreen('choice')}>back</button>
          </span>
          <HowToPlayButton guide='media-editor' markUnseen/>
        </div>
      ) : (screen === 'carry') ? (
        <FlagCarry
          carry={{difficulty: 'easy', has_flag: params.get('flag') !== '0'}}
          loadFlag={loadMockCarriedFlag}
          onStart={async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            if (params.get('start') === 'fail') {
              throw new Error('You can have at most 2 game rooms open, close one first');
            }
            setWatch(false);
            setConnection(new FakeFlagGame({youHost, dailyLeft, moderator}));
            setScreen('game');
          }}
          onRooms={() => setScreen('rooms')}
        />
      ) : (screen === 'tab') ? (
        <GamesTab api={api} room={feed} onGame={(game) => {
          setRoomsGame(game);
          setScreen('rooms');
        }} onBack={() => setScreen('choice')}/>
      ) : (screen === 'rooms') ? (
        <GameRooms
          api={api}
          room={feed}
          errorOf={(error) => (error instanceof Error) ? {status: 400, code: (error instanceof MockApiError) ? error.code : null, message: error.message, body: null} : null}
          notice={notice}
          game={roomsGame}
          onOpen={(gameId, asWatcher) => {
            const opened = store.rooms.find((room) => room.id === gameId);
            const solo = store.solo.get(gameId);
            const options = {youHost, watch: asWatcher, dailyLeft, moderator, visibility: opened?.visibility, solo: Boolean(solo), alone: gameId.startsWith('mocknew')};
            setWatch(asWatcher);
            setConnection(((solo?.game ?? opened?.game) === 'letter_trail')
              ? new FakeLetterTrail({...options, settings: (solo?.settings ?? opened?.settings) as LetterTrailSettings | undefined})
              : new FakeFlagGame({...options, settings: solo?.settings as GameSettings | undefined}));
            setScreen('game');
          }}
          onBack={() => setScreen('tab')}
        />
      ) : (
        <FlagGame
          key={String(watch)}
          connection={connection}
          inviter={inviter}
          owner={owner}
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
        {(screen === 'game') ? <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => connection.finish()}>finish</button> : null}
        {(screen === 'game') ? <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => connection.botJoins()}>someone joins</button> : null}
        {(screen === 'rooms') ? (
          <>
            <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => changeRooms('server')}>server changed</button>
            <button type='button' className='rounded bg-surface-3 px-1.5 py-0.5' onClick={() => changeRooms('global')}>global changed</button>
          </>
        ) : null}
      </div>
    </>
  );
}
