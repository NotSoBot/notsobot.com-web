import type { EditorRoom, RoomGameMessage } from '@/editor/room';

import { GameCloseCodes, type GameClientMessage, type GameServerEvent, type GameSettings, type GameState } from './protocol';


// The flag game's connection: what the screens read (a snapshot, replaced on every change) and the ops they send. The
// Activity's socket (RoomFlagGame below) and the dev mocks' in-browser engine share everything but the transport

export type GameStatus = 'connecting' | 'open' | 'closed' | 'denied';

// your own last guess's answer, `text` what was typed (`type` mode)
export interface GuessResult {
  result: 'correct' | 'wrong' | 'close',
  text: string | null,
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
  game: GameState | null,
  // the api's clock minus this one's, in ms
  skew: number,
  // this round's own: your last guess, the choice you picked, who picked a choice, who solved it (in order, with points)
  guess: GuessResult | null,
  chosen: number | null,
  answeredIds: Array<string>,
  feed: Array<SolvedEntry>,
  // the api refused something (it may not send these, see protocol.ts)
  error: string | null,
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
  error: null,
});

// a guess at most this often, the api rate limits them too
const GUESS_INTERVAL = 350;


export abstract class FlagGameConnection {
  snapshot: GameSnapshot = EMPTY_SNAPSHOT;

  private listeners = new Set<() => void>();
  // guesses sent and not answered yet, oldest first (the answer doesn't repeat the text)
  private pendingGuesses: Array<string | null> = [];
  private lastGuessAt = 0;
  // the best clock sample so far: the round trip it came with (a ping's), smaller is closer
  private skewRoundTrip = Infinity;

  abstract connect(): void;
  abstract close(): void;
  // a round's flag as something an <img> can show (the api's needs the token, so it's fetched)
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

  settings(settings: GameSettings): void {
    this.send({op: 'settings', ...settings});
  }

  start(): void {
    this.send({op: 'start'});
  }

  end(): void {
    this.send({op: 'end'});
  }

  // a watcher joins in, a player only watches (between games)
  play(): void {
    this.send({op: 'play'});
  }

  watch(): void {
    this.send({op: 'watch'});
  }

  // the room's creator: its name, password and watch-only
  roomSettings(settings: {name: string | null, mode: 'public' | 'password', password?: string, watch_only: boolean}): boolean {
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

  dismissError(): void {
    this.update({error: null});
  }

  protected setStatus(status: GameStatus, closeCode: number | null = null): void {
    if (status !== 'open') {
      // answers to guesses sent on the old socket won't come
      this.pendingGuesses = [];
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
        this.update({you: event.you, moderator: Boolean(event.moderator), ...this.replaceGame(event.game)});
        this.setStatus('open');
        break;
      }
      case 'state': {
        this.sampleClock(event.now, null);
        this.update(this.replaceGame(event.game));
        break;
      }
      case 'hint': {
        const game = this.snapshot.game;
        if (game?.round) {
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
        if (!game?.round || game.round.solved.includes(event.user_id)) {
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
        if (!game?.round || this.snapshot.answeredIds.includes(event.user_id)) {
          break;
        }
        this.update({
          game: {...game, round: {...game.round, answered: game.round.answered + 1}},
          answeredIds: [...this.snapshot.answeredIds, event.user_id],
        });
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
        this.update({error: event.message || null});
        break;
      }
      default:
        break;
    }
  }

  // a whole new state: this round's own bits stay while it's the same round, otherwise they start over
  private replaceGame(game: GameState): Partial<GameSnapshot> {
    const previous = this.snapshot.game;
    const sameRound = Boolean(previous?.round && game.round && previous.round.flag_url === game.round.flag_url);
    // the api says what this socket already picked (a reconnect gets it in `ready`)
    const yourChoice = game.round?.your_choice ?? null;
    const answeredIds = game.round?.answered_by ?? [];
    if (sameRound) {
      const solvedIds = new Set(game.round?.solved ?? []);
      return {
        game,
        feed: this.snapshot.feed.filter((entry) => solvedIds.has(entry.user_id)),
        chosen: this.snapshot.chosen ?? yourChoice,
        answeredIds: (answeredIds.length) ? answeredIds : this.snapshot.answeredIds,
      };
    }
    return {game, guess: null, chosen: yourChoice, answeredIds, feed: [], error: null};
  }

  private update(changes: Partial<GameSnapshot>): void {
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
        if (oldest !== undefined) {
          this.flags.delete(oldest);
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

  private join(): void {
    if (this.stopped || this.snapshot.status === 'denied') {
      return;
    }
    this.joined = false;
    this.setStatus('connecting');
    this.room.sendMessage({op: 'game_join', game_id: this.gameId, ...((this.watching) ? {watch: true} : {})});
  }

  private handle(message: RoomGameMessage): void {
    // one game per socket: another game's (a late one from before a switch) isn't this one's
    if (this.stopped || (message.game_id !== undefined && message.game_id !== this.gameId)) {
      return;
    }
    if (typeof message.now === 'number') {
      this.sampleClock(message.now, null);
    }
    // `game.state` → `state` and so on, the payloads are the old socket's
    const event = {...message, t: message.t.slice('game.'.length)} as GameServerEvent;
    switch (event.t) {
      case 'ready': {
        this.joined = true;
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
        this.joined = false;
        if (event.code === GAME_BUSY_CODE) {
          // the game stayed busy for the join (its lock), not a refusal: asked again in a moment
          window.setTimeout(() => this.join(), GAME_BUSY_RETRY);
          return;
        }
        // refused or ended: the api's old close code, a room gone when it has none
        this.receive({t: 'closed', code: (typeof event.code === 'number') ? event.code : GameCloseCodes.ROOM_GONE, message: event.message});
        return;
      }
      default:
        break;
    }
    this.receive(event);
  }
}
