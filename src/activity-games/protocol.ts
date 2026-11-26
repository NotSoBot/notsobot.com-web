// The Activity's flag game, its protocol (activity-plan.md "Flag game in the Activity" and "One Activity socket"). Games
// are in rooms like the editor's (a server's Activity has any number, public or with a password, some watch-only), the
// api runs each one: answers never reach a client before the reveal. It's played over the Activity's one socket (the
// editor's, src/editor/room.ts): the ops below go out as `game_<op>` (`game_join {game_id, watch?}` first), the events
// come back as `game.<t>` with `game_id` and `now`. connection.ts strips and adds the prefixes


export type GamePhase = 'lobby' | 'round' | 'reveal' | 'finished';
export type GameMode = 'type' | 'choices';
// the bot's CountryTiers
export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  mode: GameMode,
  rounds: number,
  difficulty: GameDifficulty,
  seconds: number,
}

export const GAME_MODES: ReadonlyArray<GameMode> = ['type', 'choices'];
export const GAME_DIFFICULTIES: ReadonlyArray<GameDifficulty> = ['easy', 'medium', 'hard'];
// the api's limits for `settings`
export const ROUNDS_MIN = 5;
export const ROUNDS_MAX = 20;
export const SECONDS_MIN = 10;
export const SECONDS_MAX = 60;
export const SECONDS_STEP = 5;
// longest guess the api takes
export const GUESS_MAX_LENGTH = 64;
// how long the api shows a reveal before the next round: the bar's length (`reveal.ends_at` is when it ends)
export const REVEAL_MS = 5000;

export interface GamePlayer {
  user_id: string,
  username: string,
  avatar_url: string | null,
  score: number,
  streak: number,
  connected: boolean,
}

export interface GameHint {
  region?: string,
  // the answer's letters as blanks with some shown, `F _ _ _ _ _`
  letters?: string,
}

export interface GameRound {
  number: number,
  total: number,
  // relative to the api base, a random token per round (no country code in it)
  flag_url: string,
  // ms epoch, the api's clock (`now` in its messages gives the skew)
  started_at: number,
  ends_at: number,
  hint: GameHint | null,
  // `choices` mode only
  choices: Array<string> | null,
  // who solved it, in order
  solved: Array<string>,
  answered: number,
  // who has answered (choices mode), not what
  answered_by?: Array<string>,
  // this socket's own: solved it, answered (choices), and which one it picked
  you_solved?: boolean,
  you_answered?: boolean,
  your_choice?: number | null,
}

export interface GameReveal {
  name: string,
  code: string,
  solved: Array<{user_id: string, points: number}>,
  // ms epoch on the api's clock: the next flag (or the standings) comes then. `until` is the same
  ends_at?: number,
  until?: number,
}

// someone watching: sees everything, answers nothing
export interface GameWatcher {
  user_id: string,
  username: string,
  avatar_url: string | null,
}

export interface GameRoomInfo {
  name: string | null,
  creator: GameWatcher,
  // a password room
  locked: boolean,
  // whoever isn't already playing only watches
  watch_only: boolean,
}

export interface GameState {
  // the room's id
  id: string,
  room: GameRoomInfo,
  watchers: Array<GameWatcher>,
  // this socket's own: watching, and whether it may play (a watch-only room lets only who's already playing)
  you_watch: boolean,
  can_play: boolean,
  phase: GamePhase,
  // null while nobody's connected
  host_id: string | null,
  settings: GameSettings,
  players: Array<GamePlayer>,
  round: GameRound | null,
  reveal: GameReveal | null,
  standings: Array<{user_id: string, score: number}> | null,
}

// `game.<t>` on the socket, without the prefix
export type GameServerEvent =
  // the answer to `game_join`. `moderator`: a moderator of the activity's server, they remove people from any room and
  // close it
  | {t: 'ready', you: string, now: number, game: GameState, moderator?: boolean}
  | {t: 'state', now: number, game: GameState}
  | {t: 'hint', hint: GameHint, now?: number}
  // the answer to your own guess or choice, nobody else gets it. `close`: a near miss (`type` mode)
  | {t: 'guess', correct: boolean, close?: boolean}
  | {t: 'solved', user_id: string, points: number, rank: number}
  // someone picked a choice, not which one
  | {t: 'answered', user_id: string}
  // removed from the room (when it's you, a `closed` with 4005 follows)
  | {t: 'kicked', user_id: string}
  // the game's over for this socket (it stays open): a refused `game_join` or the end of one, `code` from GameCloseCodes
  | {t: 'closed', code: number, message?: string}
  // a refused op (`op` without the prefix)
  | {t: 'error', op?: string, code?: number, message?: string};

// `game_<op>` on the socket
export type GameClientMessage =
  | ({op: 'settings'} & GameSettings)
  | {op: 'start'}
  | {op: 'guess', text: string}
  | {op: 'choose', index: number}
  | {op: 'end'}
  | {op: 'play'}
  | {op: 'watch'}
  | {op: 'room', name: string | null, mode: 'public' | 'password', password?: string, watch_only: boolean}
  | {op: 'kick', user_id: string}
  | {op: 'close'};

// a room on the list (`GET /activity/games/<instance_id>/rooms`)
export interface GameRoomSummary {
  id: string,
  name: string | null,
  creator: GameWatcher,
  created_at: number,
  locked: boolean,
  watch_only: boolean,
  phase: GamePhase,
  settings: GameSettings,
  round: {number: number, total: number} | null,
  players: Array<GameWatcher>,
  watchers: number,
}

export interface GameRoomList {
  rooms: Array<GameRoomSummary>,
  limit: number,
  moderator: boolean,
}

// the api's limits for a room
export const ROOM_NAME_MAX_LENGTH = 40;
export const ROOM_PASSWORD_MIN = 4;
export const ROOM_PASSWORD_MAX = 64;

// why a game ended for good: `game.closed`'s code (the old game socket's close codes). 4001 and 4004 close the whole
// Activity socket instead
export const GameCloseCodes = Object.freeze({
  UNAUTHORIZED: 4001,
  FORBIDDEN: 4003,
  UNKNOWN_INSTANCE: 4004,
  KICKED: 4005,
  LOCKED: 4007,
  ROOM_GONE: 4010,
});

export const DEFAULT_SETTINGS: GameSettings = Object.freeze({mode: 'type', rounds: 10, difficulty: 'medium', seconds: 20});
