import type { EditorRoom, RoomGameMessage } from '@/editor/room';

import { pointsAwarded } from './points';
import {
  GameCloseCodes,
  isLetterTrail,
  type AnyGameSettings,
  type AnyGameState,
  type GameClientMessage,
  type GameRoomVisibility,
  type GameServerEvent,
  type LetterTrailMissReason,
  type LetterTrailRound,
  type LetterTrailWord,
} from './protocol';


// A game room's connection, every game's (Flag Guesser's and Letter Trail's ops and events): what the screens read (a
// snapshot, replaced on every change) and the ops they send. The Activity's socket (RoomFlagGame below) and the dev
// mocks' in-browser engines share everything but the transport

export type GameStatus = 'connecting' | 'open' | 'closed' | 'denied';

// your own last guess's answer, `text` what was typed (`type` mode)
export interface GuessResult {
  result: 'correct' | 'wrong' | 'close',
  text: string | null,
  at: number,
}

// a word that missed: the api's reasons, and `board` for typed letters with no trail on the board (never sent)
export type WordMissReason = LetterTrailMissReason | 'board';

// Letter Trail: your last word's answer, `path` the tiles it was sent with (a miss shakes them, a hit flashes them)
export interface WordResult {
  ok: boolean,
  word: string | null,
  points: number | null,
  bonus: boolean,
  reason: WordMissReason | null,
  path: Array<number> | null,
  at: number,
}

export interface SolvedEntry {
  user_id: string,
  points: number,
  rank: number,
}

export interface GameSnapshot {
  status: GameStatus,
  // the code that ended it for good (`denied`): `game.closed`'s, see GameCloseCodes
  closeCode: number | null,
  you: string | null,
  // a moderator of the activity's server (from `ready`)
  moderator: boolean,
  game: AnyGameState | null,
  // the api's clock minus this one's, in ms
  skew: number,
  // this round's own: your last guess, the choice you picked, who picked a choice, who solved it (in order, with points)
  guess: GuessResult | null,
  chosen: number | null,
  answeredIds: Array<string>,
  feed: Array<SolvedEntry>,
  // Letter Trail, this round's own: the words you found (newest first) and your last word's answer
  words: Array<LetterTrailWord>,
  word: WordResult | null,
  // the api refused something (it may not send these, see protocol.ts)
  error: string | null,
  // joining is taking a while (no answer to a `game_join` in JOIN_TIMEOUT): it's asked again, the screen says so
  slowJoin: boolean,
  // the finished game's game points per user (what counted toward their total), from the state's `awarded` or a
  // `game.awarded` after it. null until either says, and outside the finished screen
  awards: Record<string, number> | null,
}

const EMPTY_SNAPSHOT: GameSnapshot = Object.freeze({
  status: 'connecting',
  closeCode: null,
  you: null,
  moderator: false,
  game: null,
  skew: 0,
  guess: null,
  chosen: null,
  answeredIds: [],
  feed: [],
  words: [],
  word: null,
  error: null,
  slowJoin: false,
  awards: null,
});

// a guess at most this often, the api rate limits them too
const GUESS_INTERVAL = 350;
// a Letter Trail word at most this often (the api takes ~10 a second)
const WORD_INTERVAL = 100;


// Letter Trail's same round: a new state for it keeps this round's own words
function sameLetterTrailRound(a: LetterTrailRound | null | undefined, b: LetterTrailRound | null | undefined): boolean {
  return Boolean(a && b && a.number === b.number && a.started_at === b.started_at);
}

// your words this round: the ones shown so far (newest first) and any the api has that they don't (a reconnect's)
function mergeWords(shown: Array<LetterTrailWord>, fromApi: Array<LetterTrailWord> | undefined): Array<LetterTrailWord> {
  if (!fromApi?.length) {
    return shown;
  }
  const known = new Set(shown.map((entry) => entry.word));
  const missing = fromApi.filter((entry) => !known.has(entry.word)).reverse();
  return (missing.length) ? [...missing, ...shown] : shown;
}


export abstract class FlagGameConnection {
  snapshot: GameSnapshot = EMPTY_SNAPSHOT;

  private listeners = new Set<() => void>();
  // guesses sent and not answered yet, oldest first (the answer doesn't repeat the text)
  private pendingGuesses: Array<string | null> = [];
  private lastGuessAt = 0;
  // Letter Trail's words sent and not answered yet, oldest first (a miss's answer may not repeat the word)
  private pendingWords: Array<Array<number>> = [];
  private lastWordAt = 0;
  // the best clock sample so far: the round trip it came with (a ping's), smaller is closer
  private skewRoundTrip = Infinity;

  abstract connect(): void;
  abstract close(): void;
  // a round's flag as something an <img> can show (the api's needs the token, so it's fetched). Flag Guesser's only
  abstract loadFlag(flagUrl: string): Promise<string>;
  protected abstract send(message: GameClientMessage): boolean;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): GameSnapshot => this.snapshot;

  // the api's time now, by this one's clock plus the skew
  serverNow(): number {
    return Date.now() + this.snapshot.skew;
  }

  get isHost(): boolean {
    return Boolean(this.snapshot.you && this.snapshot.game?.host_id === this.snapshot.you);
  }

  // each op: false when it wasn't sent (not connected just now), so a dialog asking for it can stay open and say so
  // the room's game's settings (the api checks them against its game)
  settings(settings: AnyGameSettings): boolean {
    return this.send({op: 'settings', ...settings});
  }

  start(): boolean {
    return this.send({op: 'start'});
  }

  end(): boolean {
    return this.send({op: 'end'});
  }

  // a watcher joins in, a player only watches (between games)
  play(): boolean {
    return this.send({op: 'play'});
  }

  watch(): boolean {
    return this.send({op: 'watch'});
  }

  // the room's creator: its name, password and watch-only, and in its lobby who finds it (this server or global)
  roomSettings(settings: {name: string | null, mode: 'public' | 'password', password?: string, watch_only: boolean, visibility?: GameRoomVisibility}): boolean {
    return this.send({op: 'room', ...settings});
  }

  // its creator or a server moderator
  kick(userId: string): boolean {
    return this.send({op: 'kick', user_id: userId});
  }

  closeRoom(): boolean {
    return this.send({op: 'close'});
  }

  // false when it wasn't sent (too soon after the last one, or not connected)
  guess(text: string): boolean {
    const now = Date.now();
    if (now - this.lastGuessAt < GUESS_INTERVAL) {
      return false;
    }
    if (!this.send({op: 'guess', text})) {
      return false;
    }
    this.lastGuessAt = now;
    this.pendingGuesses.push(text);
    return true;
  }

  choose(index: number): boolean {
    if (this.snapshot.chosen !== null || !this.send({op: 'choose', index})) {
      return false;
    }
    this.pendingGuesses.push(null);
    this.update({chosen: index});
    return true;
  }

  // Letter Trail: a word as the tiles it goes through. false when it wasn't sent (too soon after the last one, or not
  // connected)
  word(path: Array<number>): boolean {
    const now = Date.now();
    if (now - this.lastWordAt < WORD_INTERVAL) {
      return false;
    }
    if (!this.send({op: 'word', path})) {
      return false;
    }
    this.lastWordAt = now;
    this.pendingWords.push(path);
    return true;
  }

  // Letter Trail: a miss the screen already knows of (too short, already yours), never sent
  localMiss(path: Array<number>, word: string, reason: WordMissReason): void {
    this.update({word: {ok: false, word, points: null, bonus: false, reason, path, at: Date.now()}});
  }

  // Letter Trail's host: the reveal's over now (the next round, or the standings)
  next(): boolean {
    return this.send({op: 'next'});
  }

  dismissError(): void {
    this.update({error: null});
  }

  // asking to join again now (the joining screen's button), for a transport that joins
  retryJoin(): void {}

  protected setStatus(status: GameStatus, closeCode: number | null = null): void {
    if (status !== 'open') {
      // answers to guesses sent on the old socket won't come
      this.pendingGuesses = [];
      this.pendingWords = [];
    }
    this.update({status, closeCode});
  }

  // a sample of the api's clock: `now` from a message, or from a pong (its round trip known, the best kind)
  protected sampleClock(now: number, roundTrip: number | null): void {
    const received = Date.now();
    if (roundTrip !== null) {
      if (roundTrip <= this.skewRoundTrip) {
        this.skewRoundTrip = roundTrip;
        this.update({skew: now - (received - roundTrip / 2)});
      }
    } else if (this.skewRoundTrip === Infinity) {
      this.update({skew: now - received});
    }
  }

  protected receive(event: GameServerEvent): void {
    switch (event.t) {
      case 'ready': {
        this.sampleClock(event.now, null);
        this.update({you: event.you, moderator: Boolean(event.moderator)});
        this.awardsFrom(event.game);
        // a `ready` is the api's whole answer for this socket: a choice it doesn't know of never arrived
        this.update(this.replaceGame(event.game, true));
        this.setStatus('open');
        break;
      }
      case 'state': {
        this.sampleClock(event.now, null);
        this.awardsFrom(event.game);
        this.update(this.replaceGame(event.game));
        break;
      }
      case 'hint': {
        const game = this.snapshot.game;
        if (game && !isLetterTrail(game) && game.round) {
          // a hint adds to the ones before it
          this.update({game: {...game, round: {...game.round, hint: {...game.round.hint, ...event.hint}}}});
        }
        break;
      }
      case 'guess': {
        const text = this.pendingGuesses.shift() ?? null;
        this.update({guess: {result: (event.correct) ? 'correct' : (event.close) ? 'close' : 'wrong', text, at: Date.now()}});
        break;
      }
      case 'solved': {
        const game = this.snapshot.game;
        if (!game || isLetterTrail(game) || !game.round || game.round.solved.includes(event.user_id)) {
          break;
        }
        this.update({
          game: {
            ...game,
            // its score until the next state has the real one (and the streak)
            players: game.players.map((player) => (player.user_id === event.user_id) ? {...player, score: player.score + event.points} : player),
            round: {...game.round, solved: [...game.round.solved, event.user_id]},
          },
          feed: [...this.snapshot.feed, {user_id: event.user_id, points: event.points, rank: event.rank}],
        });
        break;
      }
      case 'answered': {
        const game = this.snapshot.game;
        if (!game || isLetterTrail(game) || !game.round || this.snapshot.answeredIds.includes(event.user_id)) {
          break;
        }
        this.update({
          game: {...game, round: {...game.round, answered: game.round.answered + 1}},
          answeredIds: [...this.snapshot.answeredIds, event.user_id],
        });
        break;
      }
      case 'word': {
        const path = this.pendingWords.shift() ?? null;
        const at = Date.now();
        if (!event.ok) {
          this.update({word: {ok: false, word: event.word ?? null, points: null, bonus: false, reason: event.reason, path, at}});
          break;
        }
        const found: LetterTrailWord = {word: event.word, points: event.points, bonus: event.bonus};
        const words = (this.snapshot.words.some((entry) => entry.word === found.word)) ? this.snapshot.words : [found, ...this.snapshot.words];
        const game = this.snapshot.game;
        const you = this.snapshot.you;
        // your own count (nobody sends you a `found` of yours) until the next state has it
        const changes: Partial<GameSnapshot> = {words, word: {ok: true, word: found.word, points: found.points, bonus: found.bonus, reason: null, path, at}};
        if (game && isLetterTrail(game) && game.round && you) {
          const count = Math.max(game.round.counts[you] ?? 0, words.length);
          changes.game = {...game, round: {...game.round, counts: {...game.round.counts, [you]: count}}};
        }
        this.update(changes);
        break;
      }
      case 'found': {
        const game = this.snapshot.game;
        if (game && isLetterTrail(game) && game.round) {
          this.update({game: {...game, round: {...game.round, counts: {...game.round.counts, [event.user_id]: event.count}}}});
        }
        break;
      }
      case 'kicked': {
        // you: out of the room for good (a `closed` with the same code follows)
        if (event.user_id === this.snapshot.you) {
          this.setStatus('denied', GameCloseCodes.KICKED);
        }
        break;
      }
      case 'closed': {
        // the game's over for this connection: removed, the room gone, its password needed, not allowed
        this.setStatus('denied', event.code);
        break;
      }
      case 'error': {
        // a refused guess or choice gets this instead of its answer: it leaves the queue too, or every later answer
        // would name the guess before it. a refused choice can be picked again
        const refused = event.op === 'guess' || event.op === 'choose';
        if (refused) {
          this.pendingGuesses.shift();
        }
        // a refused word (too many too fast) leaves its queue the same way
        if (event.op === 'word') {
          this.pendingWords.shift();
        }
        this.update({error: event.message || null, ...((event.op === 'choose') ? {chosen: null} : {})});
        break;
      }
      case 'awarded': {
        // a game its host ended early is back in the lobby by now: nothing shows it there, the points still changed
        const finished = this.snapshot.game?.phase === 'finished';
        this.takeAwards(event.awards, finished);
        break;
      }
      default:
        break;
    }
  }

  // awards from a state or a `game.awarded`: kept for the finished screen, and their total changed for anything
  // showing it (./points) the first time theirs comes with some
  private takeAwards(awards: Record<string, number>, keep: boolean): void {
    const you = this.snapshot.you;
    const before = this.snapshot.awards;
    if (you && typeof awards[you] === 'number' && 0 < awards[you] && before?.[you] === undefined) {
      pointsAwarded();
    }
    if (keep && Object.keys(awards).length) {
      this.update({awards: {...before, ...awards}});
    }
  }

  // a finished state's own `awarded`, the ones a `game.awarded` already brought stay while it's the same finish
  private awardsFrom(game: AnyGameState): void {
    if (game.phase !== 'finished') {
      if (this.snapshot.awards) {
        this.update({awards: null});
      }
      return;
    }
    if (this.snapshot.game?.phase !== 'finished' && this.snapshot.awards) {
      this.update({awards: null});
    }
    const awards: Record<string, number> = {};
    for (const player of game.players) {
      if (typeof player.awarded === 'number') {
        awards[player.user_id] = player.awarded;
      }
    }
    this.takeAwards(awards, true);
  }

  // a whole new state: this round's own bits stay while it's the same round, otherwise they start over
  private replaceGame(game: AnyGameState, authoritative = false): Partial<GameSnapshot> {
    const previous = this.snapshot.game;
    if (isLetterTrail(game)) {
      const previousRound = (previous && isLetterTrail(previous)) ? previous.round : null;
      if (sameLetterTrailRound(previousRound, game.round)) {
        return {game, words: mergeWords(this.snapshot.words, game.round?.you_found)};
      }
      // a new round (or none): the last one's words and unanswered ones aren't this one's
      this.pendingWords = [];
      return {game, words: mergeWords([], game.round?.you_found), word: null, error: null, guess: null, chosen: null, answeredIds: [], feed: []};
    }
    if (previous && isLetterTrail(previous)) {
      this.pendingWords = [];
    }
    const previousRound = (previous && !isLetterTrail(previous)) ? previous.round : null;
    const sameRound = Boolean(previousRound && game.round && previousRound.flag_url === game.round.flag_url);
    // the api says what this socket already picked (a reconnect gets it in `ready`)
    const yourChoice = game.round?.your_choice ?? null;
    const answeredIds = game.round?.answered_by ?? [];
    if (sameRound) {
      const solvedIds = new Set(game.round?.solved ?? []);
      return {
        game,
        feed: this.snapshot.feed.filter((entry) => solvedIds.has(entry.user_id)),
        // a state made before the api saw the choice has none yet, the one just picked stays until a `ready` says
        chosen: (authoritative) ? yourChoice : this.snapshot.chosen ?? yourChoice,
        answeredIds: (answeredIds.length) ? answeredIds : this.snapshot.answeredIds,
      };
    }
    // the last round's unanswered guesses aren't this round's
    this.pendingGuesses = [];
    return {game, guess: null, chosen: yourChoice, answeredIds, feed: [], words: [], word: null, error: null};
  }

  protected update(changes: Partial<GameSnapshot>): void {
    this.snapshot = {...this.snapshot, ...changes};
    for (const listener of this.listeners) {
      listener();
    }
  }
}


// the flag's box in css pixels is at most ~640 on a phone at 2x, the api fits it in a square this size
const FLAG_WIDTH = 640;


// a `game.closed` with this code is the game busy during the join (the api's internal error code), tried again after
const GAME_BUSY_CODE = 1011;
const GAME_BUSY_RETRY = 1000;
const GAME_BUSY_RETRY_MAX = 8000;
// this many busy answers in a row and the joining screen says it's slow (with its retry button)
const GAME_BUSY_SLOW_AFTER = 3;
// no `game.ready` or `game.closed` this long after a `game_join`: asked again (a lost message, a slow api)
const JOIN_TIMEOUT = 6000;


// One game over the Activity's socket (activity-plan.md "One Activity socket"): `game_join` once the socket's open and
// again after each reconnect (a new socket starts outside every game), `game_leave` on close. The socket's reconnects and
// ping are the room's (src/editor/room.ts), its fatal closes end the whole Activity. `game.closed` ends only this game
export class RoomFlagGame extends FlagGameConnection {
  private unsubscribers: Array<() => void> = [];
  private stopped = false;
  // a `game.ready` came for this socket's join, so leaving means something
  private joined = false;
  private flags = new Map<string, Promise<string>>();
  private objectUrls: Array<string> = [];
  private joinTimer: number | null = null;
  // joins refused as busy in a row, each one waits longer
  private busyRetries = 0;

  // `watching`: join as a watcher. Rejoins keep whatever the api last said (`you_watch`), `play`/`watch` change it
  constructor(
    private readonly room: EditorRoom,
    private readonly gameId: string,
    private readonly apiBase: string,
    private readonly token: string,
    private watching = false,
  ) {
    super();
  }

  connect(): void {
    this.stopped = false;
    this.unsubscribers.push(
      this.room.onGame((message) => this.handle(message)),
      this.room.onStatus((status) => {
        if (status === 'open') {
          this.join();
        } else if (this.snapshot.status !== 'denied') {
          // the room reconnects, its `ready` brings a rejoin. a denied room ends the whole Activity
          this.joined = false;
          this.setStatus((status === 'denied') ? 'denied' : 'closed');
        }
      }),
      this.room.onPong((now, roundTrip) => this.sampleClock(now, roundTrip)),
    );
    if (this.room.isOpen) {
      this.join();
    } else {
      this.setStatus((this.room.status === 'denied') ? 'denied' : 'connecting');
    }
  }

  close(): void {
    this.stopped = true;
    this.clearJoinTimer();
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    if (this.snapshot.status !== 'denied') {
      // the api also leaves it when the socket closes, this is for the socket that stays
      this.room.sendMessage({op: 'game_leave'});
    }
    this.joined = false;
    this.setStatus('closed');
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls = [];
    this.flags.clear();
  }

  // the flag route wants the user token like every other request, which an <img> can't send: fetched, then a blob url.
  // a round's flag is asked for again on its reveal, it's kept
  loadFlag(flagUrl: string): Promise<string> {
    let promise = this.flags.get(flagUrl);
    if (!promise) {
      promise = (async () => {
        const url = new URL(this.apiBase + flagUrl, window.location.origin);
        url.searchParams.set('width', String(FLAG_WIDTH));
        const response = await fetch(url, {headers: {authorization: this.token}, signal: AbortSignal.timeout(15 * 1000)});
        if (!response.ok) {
          throw new Error(`Flag failed with status ${response.status}`);
        }
        const objectUrl = URL.createObjectURL(await response.blob());
        if (this.stopped) {
          URL.revokeObjectURL(objectUrl);
        } else {
          this.objectUrls.push(objectUrl);
        }
        return objectUrl;
      })();
      promise.catch(() => this.flags.delete(flagUrl));
      this.flags.set(flagUrl, promise);
      // only the last few rounds' are worth keeping
      if (this.flags.size > 4) {
        const oldest = this.flags.keys().next().value;
        const evicted = (oldest !== undefined) ? this.flags.get(oldest) : undefined;
        if (oldest !== undefined && evicted) {
          this.flags.delete(oldest);
          // its blob goes with it, otherwise every flag of a long stay in one room is kept until it's left
          evicted.then((objectUrl) => {
            URL.revokeObjectURL(objectUrl);
            this.objectUrls = this.objectUrls.filter((url) => url !== objectUrl);
          }).catch(() => undefined);
        }
      }
    }
    return promise;
  }

  // the game's ops go out with a `game_` prefix (`settings` → `game_settings`), only once it's joined
  protected send(message: GameClientMessage): boolean {
    if (this.stopped || !this.joined || this.snapshot.status !== 'open') {
      return false;
    }
    const { op, ...payload } = message;
    return this.room.sendMessage({...payload, op: `game_${op}`});
  }

  retryJoin(): void {
    if (!this.joined && this.room.isOpen) {
      this.busyRetries = 0;
      this.join();
    }
  }

  // the join was refused for now (the game busy, too fast): asked again, a little later each time
  private joinLater(): void {
    this.clearJoinTimer();
    this.busyRetries += 1;
    if (GAME_BUSY_SLOW_AFTER <= this.busyRetries) {
      this.update({slowJoin: true});
    }
    const delay = Math.min(GAME_BUSY_RETRY * 2 ** (this.busyRetries - 1), GAME_BUSY_RETRY_MAX);
    this.joinTimer = window.setTimeout(() => {
      this.joinTimer = null;
      this.join();
    }, delay);
  }

  private join(): void {
    this.clearJoinTimer();
    if (this.stopped || this.snapshot.status === 'denied') {
      return;
    }
    this.joined = false;
    this.setStatus('connecting');
    if (!this.room.sendMessage({op: 'game_join', game_id: this.gameId, ...((this.watching) ? {watch: true} : {})})) {
      // the socket isn't open, its `open` brings the join
      return;
    }
    this.joinTimer = window.setTimeout(() => {
      this.joinTimer = null;
      if (this.stopped || this.joined || this.snapshot.status === 'denied') {
        return;
      }
      this.update({slowJoin: true});
      if (this.room.isOpen) {
        this.join();
      }
    }, JOIN_TIMEOUT);
  }

  private clearJoinTimer(): void {
    if (this.joinTimer !== null) {
      window.clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
  }

  private handle(message: RoomGameMessage): void {
    // one game per socket: another game's (a late one from before a switch) isn't this one's
    // (an answer from before any game is joined has no game id at all, null: a refused join's)
    if (this.stopped || (message.game_id != null && message.game_id !== this.gameId)) {
      return;
    }
    if (typeof message.now === 'number') {
      this.sampleClock(message.now, null);
    }
    // `game.state` → `state` and so on, the payloads are the old socket's
    const event = {...message, t: message.t.slice('game.'.length)} as GameServerEvent;
    switch (event.t) {
      case 'ready': {
        this.clearJoinTimer();
        this.joined = true;
        this.busyRetries = 0;
        this.update({slowJoin: false});
        this.watching = event.game.you_watch;
        this.receive(event);
        // a clock sample with its round trip known, the room's own pings keep it fresh
        this.room.ping();
        return;
      }
      case 'state': {
        this.watching = event.game.you_watch;
        break;
      }
      case 'closed': {
        this.clearJoinTimer();
        this.joined = false;
        if (event.code === GAME_BUSY_CODE) {
          // the game stayed busy for the join (its lock), not a refusal: asked again in a moment
          this.joinLater();
          return;
        }
        this.update({slowJoin: false});
        // refused or ended: the api's old close code, a room gone when it has none
        this.receive({t: 'closed', code: (typeof event.code === 'number') ? event.code : GameCloseCodes.ROOM_GONE, message: event.message});
        return;
      }
      case 'error': {
        if (event.op === 'join' && !this.joined) {
          // the join itself was refused (too fast after a reconnect, say), not the game: asked again shortly
          this.joinLater();
          return;
        }
        break;
      }
      default:
        break;
    }
    this.receive(event);
  }
}
