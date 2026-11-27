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
// a game's first flag in a room for more than one comes this long after Start ("3, 2, 1", `round.started_at` is when)
export const START_COUNTDOWN_MS = 3000;

export interface GamePlayer {
  user_id: string,
  username: string,
  avatar_url: string | null,
  score: number,
  streak: number,
  connected: boolean,
  // once the game's finished: the game points that counted toward their total (./points, after the daily cap). Best
  // effort, it can come after the state in a `game.awarded`
  awarded?: number | null,
}

export interface GameHint {
  region?: string,
  // the answer's letters as blanks with some shown, `F _ _ _ _ _`
  letters?: string,
}

export interface GameRound {
  number: number,
  total: number,
  // relative to the api base, a random token per round (no country code in it). null during a game's start countdown
  // (`started_at` still to come), the api sends it with a `state` once it's started
  flag_url: string | null,
  // ms epoch, the api's clock (`now` in its messages gives the skew). After `now` at a game's start: its countdown
  started_at: number,
  ends_at: number,
  hint: GameHint | null,
  // `choices` mode only, null during the start countdown too
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

// the games rooms can be for (the api's `game`)
export type GameKind = 'flag_guesser' | 'letter_trail';
export const GAME_KINDS: ReadonlyArray<GameKind> = ['flag_guesser', 'letter_trail'];

// who finds a room: everyone in this server's Activity (or this dm's), or everyone in any server's (`global`)
export type GameRoomVisibility = 'server' | 'global';
export const GAME_ROOM_VISIBILITIES: ReadonlyArray<GameRoomVisibility> = ['server', 'global'];

// the server a room was made in (null in a dm), its name only when the bot knows it
export interface GameRoomOrigin {
  guild_id: string,
  guild_name: string | null,
}

export interface GameRoomInfo {
  name: string | null,
  creator: GameWatcher,
  // a password room
  locked: boolean,
  // whoever isn't already playing only watches
  watch_only: boolean,
  // older apis send none of these: a Flag Guesser room in this server
  game?: GameKind,
  visibility?: GameRoomVisibility,
  origin?: GameRoomOrigin | null,
  // Play solo: its creator's alone (no invites, watchers or room settings, never listed), its game starts as they join
  solo?: boolean,
}

// a room's state, the same for every game but its settings, round and reveal (Flag Guesser's are `GameState`, Letter
// Trail's `LetterTrailState`, see word-game-plan.md "Build contract")
export interface GameStateOf<Settings, Round, Reveal> {
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
  settings: Settings,
  players: Array<GamePlayer>,
  round: Round | null,
  reveal: Reveal | null,
  standings: Array<{user_id: string, score: number}> | null,
}

// Flag Guesser's
export type GameState = GameStateOf<GameSettings, GameRound, GameReveal>;
export type LetterTrailState = GameStateOf<LetterTrailSettings, LetterTrailRound, LetterTrailReveal>;
// any room's, `isLetterTrail` tells them apart (an older api's rooms without a `game` are Flag Guesser's)
export type AnyGameState = GameState | LetterTrailState;
export type AnyGameSettings = GameSettings | LetterTrailSettings;

export function isLetterTrail(game: AnyGameState): game is LetterTrailState {
  return game.room.game === 'letter_trail';
}

// `game.<t>` on the socket, without the prefix
export type GameServerEvent =
  // the answer to `game_join`. `moderator`: a moderator of the activity's server, they remove people from any room and
  // close it
  | {t: 'ready', you: string, now: number, game: AnyGameState, moderator?: boolean}
  | {t: 'state', now: number, game: AnyGameState}
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
  | {t: 'error', op?: string, code?: number, message?: string}
  // the game points a game that just ended added, per user (what counted after the daily cap), when the finished state
  // went out before them. A game its host ended early sends it too, while it's back in the lobby
  | {t: 'awarded', awards: Record<string, number>, now?: number}
  // Letter Trail: the answer to your own `word`, nobody else gets it
  | ({t: 'word'} & LetterTrailWordAnswer)
  // Letter Trail: how many words someone has this round now (never which), to everyone but them
  | {t: 'found', user_id: string, count: number, now?: number};

// `game_<op>` on the socket
export type GameClientMessage =
  | ({op: 'settings'} & AnyGameSettings)
  | {op: 'start'}
  | {op: 'guess', text: string}
  | {op: 'choose', index: number}
  | {op: 'end'}
  | {op: 'play'}
  | {op: 'watch'}
  // `visibility` only in the lobby (the api refuses it otherwise)
  | {op: 'room', name: string | null, mode: 'public' | 'password', password?: string, watch_only: boolean, visibility?: GameRoomVisibility}
  | {op: 'kick', user_id: string}
  | {op: 'close'}
  // Letter Trail: a word as the tiles it goes through (board indexes, row-major), and the host skipping a reveal
  | {op: 'word', path: Array<number>}
  | {op: 'next'};

// a room on the list (`GET /activity/games/<instance_id>/rooms`)
export interface GameRoomSummary {
  id: string,
  game: GameKind,
  visibility: GameRoomVisibility,
  origin: GameRoomOrigin | null,
  name: string | null,
  creator: GameWatcher,
  created_at: number,
  locked: boolean,
  watch_only: boolean,
  phase: GamePhase,
  // the room's game's (`game`)
  settings: AnyGameSettings,
  round: {number: number, total: number} | null,
  players: Array<GameWatcher>,
  watchers: number,
  // a solo room (only its creator ever gets one, from Play solo)
  solo?: boolean,
}

// the room browser's tabs: this server's rooms (or this dm's) and the global ones
export type GameRoomTab = GameRoomVisibility;
// `filling`: open lobbies with the most players first, `playing`: rooms in a round first, `newest`: made last first
export type GameRoomSort = 'filling' | 'playing' | 'newest';
export const GAME_ROOM_SORTS: ReadonlyArray<GameRoomSort> = ['filling', 'playing', 'newest'];
// rooms a page
export const GAME_ROOMS_PAGE = 20;

// a page of one tab's rooms
export interface GameRoomList {
  rooms: Array<GameRoomSummary>,
  // null on the last page
  next_cursor: string | null,
  // both tabs' rooms, whichever one this page is
  counts: Record<GameRoomTab, number>,
  // rooms a scope can have open, and how many global ones there can be
  limit: number,
  global_limit: number,
  // a moderator of this server: the server tab only (always false on the global one)
  moderator: boolean,
}

// Quick play's answer: the room to join, `created` when none was open and it made one
export interface QuickPlayResult {
  id: string,
  created: boolean,
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
  // the room has as many players (or watchers) as it takes
  FULL: 4011,
});

export const DEFAULT_SETTINGS: GameSettings = Object.freeze({mode: 'type', rounds: 10, difficulty: 'medium', seconds: 20});


// Letter Trail (word-game-plan.md "Build contract"): everyone in a room plays the same grid of letters at once, a word is
// a trail of touching tiles (diagonals too, each tile once). The api deals and solves the board, checks every word and
// keeps the board's answers until the round's over

export type LetterTrailSize = 4 | 5;

export interface LetterTrailSettings {
  size: LetterTrailSize,
  seconds: number,
  rounds: number,
}

export const LETTER_TRAIL_SIZES: ReadonlyArray<LetterTrailSize> = [4, 5];
export const LETTER_TRAIL_SECONDS: ReadonlyArray<number> = [60, 80, 120];
export const LETTER_TRAIL_ROUNDS_MIN = 1;
export const LETTER_TRAIL_ROUNDS_MAX = 5;
export const LETTER_TRAIL_DEFAULT_SETTINGS: LetterTrailSettings = Object.freeze({size: 4, seconds: 80, rounds: 3});
// a word's fewest letters (a `Qu` tile is two)
export const LETTER_TRAIL_MIN_LETTERS = 3;
// a reveal's length, longer than Flag Guesser's: there's more to read. The host can skip it (`next`)
export const LETTER_TRAIL_REVEAL_MS = 10 * 1000;
// a word's points by its letters: 3 → 1, 4 → 2, 5 → 4, 6 → 6, 7 → 9, 8 or more → 12 (the api's, only shown here)
export const LETTER_TRAIL_POINTS: ReadonlyArray<{letters: number, points: number}> = [
  {letters: 3, points: 1},
  {letters: 4, points: 2},
  {letters: 5, points: 4},
  {letters: 6, points: 6},
  {letters: 7, points: 9},
  {letters: 8, points: 12},
];

// a word you found: its points as the round shows them (with the x2 tile's double, without "only you")
export interface LetterTrailWord {
  word: string,
  points: number,
  // it goes through the x2 tile
  bonus: boolean,
}

export interface LetterTrailRound {
  number: number,
  total: number,
  size: LetterTrailSize,
  // the tiles row by row, a letter each (`Qu` is one tile). null during a game's start countdown, like Flag Guesser's flag
  board: Array<string> | null,
  // the x2 tile's index, null with the board
  bonus: number | null,
  // ms epoch, the api's clock
  started_at: number,
  ends_at: number,
  // how many words each player has this round
  counts: Record<string, number>,
  // this socket's own words so far (a reconnect gets them back), in the order found
  you_found?: Array<LetterTrailWord>,
}

export interface LetterTrailRevealWord extends LetterTrailWord {
  // nobody else in the room found it: its points are doubled (never in solo)
  only_you: boolean,
}

export interface LetterTrailReveal {
  // ms epoch on the api's clock: the next round (or the standings) comes then, sooner when the host skips. `until` is
  // the same
  ends_at?: number,
  until?: number,
  // every player's words, a word's `points` its final ones (x2 tile and "only you" in), `round_score` their sum
  players: Array<{user_id: string, words: Array<LetterTrailRevealWord>, round_score: number}>,
  // the longest words on the board nobody found, longest first, up to 12
  missed: Array<string>,
  // how many words the board had
  total_words: number,
}

export type LetterTrailMissReason = 'short' | 'path' | 'not_word' | 'repeat' | 'closed';

// the answer to your own `word`
export type LetterTrailWordAnswer =
  | {ok: true, word: string, points: number, bonus: boolean}
  | {ok: false, word?: string, reason: LetterTrailMissReason};
