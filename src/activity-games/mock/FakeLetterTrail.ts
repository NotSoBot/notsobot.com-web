import { FlagGameConnection } from '../connection';
import { findTrail, touching, wordOf, wordPoints } from '../letterTrailBoard';
import { gamePointsFor } from '../points';
import {
  LETTER_TRAIL_DEFAULT_SETTINGS,
  LETTER_TRAIL_MIN_LETTERS,
  LETTER_TRAIL_REVEAL_MS,
  LETTER_TRAIL_ROUNDS_MAX,
  LETTER_TRAIL_ROUNDS_MIN,
  LETTER_TRAIL_SECONDS,
  START_COUNTDOWN_MS,
  type GameClientMessage,
  type GamePlayer,
  type GameRoomVisibility,
  type GameServerEvent,
  type LetterTrailRevealWord,
  type LetterTrailSettings,
  type LetterTrailState,
  type LetterTrailWord,
} from '../protocol';
import { MOCK_WORDS } from './letterWords';


// Dev mocks only (never in a production build, see src/activity.tsx): the api's Letter Trail played in the browser,
// behind the same connection the Activity's socket gives the screens. Three bots join and find some of the board's
// words over the round. Its own letter weights and a small word list (./letterWords), close enough to see every screen.
// `phase`: open on that screen straight away (`countdown`, `round`, `reveal` or `finished`, with made-up words for the
// ones before), `hold`: nothing moves on by itself (the round never ends, the reveal stays) so a screen can be looked at

const YOU = '300000000000000001';
const BOTS: Array<GamePlayer> = [
  {user_id: '300000000000000002', username: 'mochi', avatar_url: null, score: 0, streak: 0, connected: true},
  {user_id: '300000000000000003', username: 'ferretking', avatar_url: null, score: 0, streak: 0, connected: true},
  {user_id: '300000000000000004', username: 'quill', avatar_url: null, score: 0, streak: 0, connected: false},
];
const LATENCY = 40;
const AWARD_DELAY = 1200;
// a board's tries before the best one so far is dealt, and how many words it wants (the api's are 30 and 60 against
// its full dictionary, the mock's list is much smaller)
const DEAL_TRIES = 120;
const DEAL_WANTS: Record<number, number> = {4: 24, 5: 45};
// the reveal's longest missed words
const MISSED_SHOWN = 12;

// letters by how often a tile shows them: vowels and common consonants a lot, `Qu` rarely
const LETTER_WEIGHTS: Array<[string, number]> = [
  ['E', 12], ['A', 9], ['I', 8], ['O', 8], ['U', 4], ['T', 8], ['N', 7], ['S', 7], ['R', 7], ['H', 4], ['L', 5],
  ['D', 4], ['C', 3], ['M', 3], ['P', 3], ['B', 2], ['G', 2], ['F', 2], ['W', 2], ['Y', 2], ['K', 1], ['V', 1],
  ['X', 0.5], ['J', 0.3], ['Z', 0.3], ['Qu', 0.6],
];
const WEIGHT_TOTAL = LETTER_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);


function randomLetter(): string {
  let pick = Math.random() * WEIGHT_TOTAL;
  for (const [ letter, weight ] of LETTER_WEIGHTS) {
    pick -= weight;
    if (pick <= 0) {
      return letter;
    }
  }
  return 'E';
}

function shuffle<T>(items: Array<T>): Array<T> {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}


interface Dealt {
  board: Array<string>,
  bonus: number,
  // every word on it, with a trail for each
  answers: Map<string, Array<number>>,
}

function solve(board: Array<string>, size: number): Map<string, Array<number>> {
  const answers = new Map<string, Array<number>>();
  for (const word of MOCK_WORDS) {
    if (word.length >= LETTER_TRAIL_MIN_LETTERS) {
      const trail = findTrail(board, size, word);
      // a trail ending on a half-typed `Qu` doesn't spell it
      if (trail && wordOf(board, trail) === word) {
        answers.set(word, trail);
      }
    }
  }
  return answers;
}

function deal(size: number): Dealt {
  let best: Dealt | null = null;
  for (let attempt = 0; attempt < DEAL_TRIES; attempt++) {
    const board = Array.from({length: size * size}, randomLetter);
    const answers = solve(board, size);
    if (!best || answers.size > best.answers.size) {
      const plain = board.map((tile, index) => (tile === 'Qu') ? -1 : index).filter((index) => index >= 0);
      best = {board, answers, bonus: plain[Math.floor(Math.random() * plain.length)] ?? 0};
    }
    if (best.answers.size >= DEAL_WANTS[size]) {
      break;
    }
  }
  return best!;
}


export class FakeLetterTrail extends FlagGameConnection {
  private game: LetterTrailState;
  private dealt: Dealt | null = null;
  // this round's words per player, in the order found
  private found = new Map<string, Array<LetterTrailWord & {path: Array<number>}>>();
  private timers: Array<number> = [];
  private alive = false;
  private dailyLeft: number;
  private solo: boolean;
  private soloStarted = false;
  private hold: boolean;
  private phase: 'lobby' | 'countdown' | 'round' | 'reveal' | 'finished';

  constructor({ youHost = true, watch = false, dailyLeft = Infinity, visibility = 'server', solo = false, alone = false, settings, phase = 'lobby', hold = false }: {
    youHost?: boolean,
    watch?: boolean,
    dailyLeft?: number,
    visibility?: GameRoomVisibility,
    solo?: boolean,
    alone?: boolean,
    settings?: LetterTrailSettings,
    phase?: 'lobby' | 'countdown' | 'round' | 'reveal' | 'finished',
    hold?: boolean,
  } = {}) {
    super();
    this.dailyLeft = dailyLeft;
    this.solo = solo;
    this.hold = hold;
    this.phase = phase;
    const you: GamePlayer = {user_id: YOU, username: 'you_in_dev', avatar_url: null, score: 0, streak: 0, connected: true};
    const players = (solo || alone) ? [you] : (watch) ? [...BOTS] : (youHost) ? [you, ...BOTS] : [BOTS[0], you, ...BOTS.slice(1)];
    const creator = (solo || alone || (youHost && !watch)) ? you : BOTS[0];
    this.game = {
      id: 'mockletters01',
      room: {
        name: (solo || alone) ? null : 'Dev word room', creator: {user_id: creator.user_id, username: creator.username, avatar_url: creator.avatar_url}, locked: false, watch_only: false,
        game: 'letter_trail', visibility, origin: (visibility === 'global') ? {guild_id: '200000000000000001', guild_name: 'Word Nerds'} : null,
        solo,
      },
      watchers: (solo || alone) ? [] : [
        {user_id: '300000000000000099', username: 'lurker', avatar_url: null},
        ...((watch) ? [{user_id: YOU, username: 'you_in_dev', avatar_url: null}] : []),
      ],
      you_watch: watch && !solo,
      can_play: true,
      phase: 'lobby',
      host_id: players[0].user_id,
      settings: {...(settings ?? LETTER_TRAIL_DEFAULT_SETTINGS)},
      players: players.map((player) => ({...player})),
      round: null,
      reveal: null,
      standings: null,
    };
  }

  connect(): void {
    this.alive = true;
    this.setStatus('connecting');
    this.later(() => {
      if (this.solo && !this.soloStarted && this.game.phase === 'lobby') {
        // like the api: a solo room's game is already running by the time `ready` says so
        this.soloStarted = true;
        this.startRound(1);
      } else if (this.phase !== 'lobby' && this.game.phase === 'lobby') {
        this.jumpTo(this.phase);
      }
      this.emit({t: 'ready', you: YOU, now: Date.now(), game: this.copy()});
    }, 300);
  }

  close(): void {
    this.alive = false;
    this.clearTimers();
    this.setStatus('closed');
  }

  loadFlag(flagUrl: string): Promise<string> {
    return Promise.resolve(flagUrl);
  }

  // the dev toolbar's, like FakeFlagGame's
  botJoins(): void {
    const bot = BOTS.find((entry) => !this.game.players.some((player) => player.user_id === entry.user_id));
    if (!bot || this.solo) {
      return;
    }
    this.game.players = [...this.game.players, {...bot, connected: true}];
    this.broadcastState();
  }

  drop(ms = 4000): void {
    this.setStatus('closed');
    window.setTimeout(() => {
      this.setStatus('connecting');
      window.setTimeout(() => this.emit({t: 'ready', you: YOU, now: Date.now(), game: this.copy()}), 600);
    }, ms);
  }

  hostStart(): void {
    if (this.game.host_id) {
      this.handle({op: 'start'}, this.game.host_id);
    }
  }

  finish(): void {
    this.clearTimers();
    if (this.game.players.every((player) => player.score === 0)) {
      this.game.players = this.game.players.map((player, index) => ({...player, score: [58, 31, 74, 0][index % 4]}));
    }
    this.finishGame();
  }

  protected send(message: GameClientMessage): boolean {
    if (this.snapshot.status !== 'open') {
      return false;
    }
    window.setTimeout(() => this.handle(message, YOU), LATENCY);
    return true;
  }

  // a screen straight away: a round well into it (the bots and you with some words), or its reveal, or the end
  private jumpTo(phase: 'countdown' | 'round' | 'reveal' | 'finished'): void {
    if (phase === 'countdown') {
      this.startRound(1);
      return;
    }
    this.startRound(1, 0);
    const answers = [...(this.dealt?.answers.entries() ?? [])];
    // some for everyone, a couple of yours shared with a bot
    for (const [ index, [ word, path ] ] of answers.slice(0, 18).entries()) {
      const finders = (index % 5 === 0) ? [YOU, BOTS[0].user_id] : (index % 3 === 0) ? [YOU] : (index % 2) ? [BOTS[0].user_id] : [BOTS[1].user_id, BOTS[0].user_id];
      for (const finder of finders) {
        if (this.game.players.some((player) => player.user_id === finder)) {
          this.record(finder, word, path, finder !== YOU);
        }
      }
    }
    if (phase === 'round') {
      return;
    }
    this.endRound();
    if (phase === 'finished') {
      this.clearTimers();
      this.finishGame();
    }
  }

  private later(run: () => void, ms: number): void {
    this.timers.push(window.setTimeout(() => {
      if (this.alive) {
        run();
      }
    }, ms));
  }

  private clearTimers(): void {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers = [];
  }

  private emit(event: GameServerEvent): void {
    if (!this.alive || (this.snapshot.status !== 'open' && event.t !== 'ready')) {
      return;
    }
    window.setTimeout(() => this.receive(event), LATENCY);
  }

  private copy(): LetterTrailState {
    const game: LetterTrailState = JSON.parse(JSON.stringify(this.game));
    // like the api: your own words come back in `you_found` (a reconnect gets them), nobody else's
    if (game.round && game.phase === 'round') {
      game.round.you_found = (this.found.get(YOU) ?? []).map(({ word, points, bonus }) => ({word, points, bonus}));
    }
    return game;
  }

  private broadcastState(): void {
    this.emit({t: 'state', now: Date.now(), game: this.copy()});
  }

  private handle(message: GameClientMessage, from: string): void {
    const host = from === this.game.host_id;
    switch (message.op) {
      case 'settings': {
        if (!host || (this.game.phase !== 'lobby' && this.game.phase !== 'finished') || !('size' in message)) {
          this.emit({t: 'error', op: 'settings', message: 'Only the host can change the settings'});
          return;
        }
        this.game = {...this.game, settings: {
          size: (message.size === 5) ? 5 : 4,
          seconds: (LETTER_TRAIL_SECONDS.includes(message.seconds)) ? message.seconds : LETTER_TRAIL_DEFAULT_SETTINGS.seconds,
          rounds: Math.min(LETTER_TRAIL_ROUNDS_MAX, Math.max(LETTER_TRAIL_ROUNDS_MIN, Math.round(message.rounds))),
        }};
        this.broadcastState();
        break;
      }
      case 'start': {
        if (!host) {
          return;
        }
        this.game.players = this.game.players.map(({ awarded: _awarded, ...player }) => ({...player, score: 0, streak: 0}));
        this.startRound(1);
        break;
      }
      case 'end': {
        if (!host) {
          return;
        }
        const ended = this.game.phase === 'round' || this.game.phase === 'reveal';
        this.clearTimers();
        this.game = {...this.game, phase: 'lobby', round: null, reveal: null, standings: null};
        this.game.players = this.game.players.map(({ awarded: _awarded, ...player }) => player);
        this.broadcastState();
        if (ended) {
          this.award();
        }
        break;
      }
      case 'next': {
        if (!host || this.game.phase !== 'reveal') {
          this.emit({t: 'error', op: 'next', message: 'Only the host can skip ahead, and only between rounds'});
          return;
        }
        this.clearTimers();
        this.afterReveal();
        break;
      }
      case 'word': {
        this.checkWord(from, message.path);
        break;
      }
      case 'play': {
        const watcher = this.game.watchers.find((entry) => entry.user_id === from);
        if (!watcher) {
          return;
        }
        this.game.watchers = this.game.watchers.filter((entry) => entry.user_id !== from);
        this.game.players = [...this.game.players, {...watcher, score: 0, streak: 0, connected: true}];
        this.game.you_watch = false;
        this.broadcastState();
        break;
      }
      case 'watch': {
        const player = this.game.players.find((entry) => entry.user_id === from);
        if (this.solo || !player || (this.game.phase !== 'lobby' && this.game.phase !== 'finished')) {
          this.emit({t: 'error', op: 'watch', message: 'You can watch once this game ends'});
          return;
        }
        this.game.players = this.game.players.filter((entry) => entry.user_id !== from);
        this.game.watchers = [...this.game.watchers, {user_id: player.user_id, username: player.username, avatar_url: player.avatar_url}];
        this.game.you_watch = true;
        if (this.game.host_id === from) {
          this.game.host_id = this.game.players[0]?.user_id ?? null;
        }
        this.broadcastState();
        break;
      }
      case 'room': {
        if (this.solo || (message.visibility && this.game.phase !== 'lobby')) {
          this.emit({t: 'error', op: 'room', message: 'A room can only change who finds it while it’s waiting to start'});
          break;
        }
        this.game.room = {
          ...this.game.room, name: message.name, locked: message.mode === 'password', watch_only: message.watch_only,
          ...((message.visibility) ? {visibility: message.visibility} : {}),
        };
        this.broadcastState();
        break;
      }
      case 'kick': {
        this.game.players = this.game.players.filter((entry) => entry.user_id !== message.user_id);
        this.game.watchers = this.game.watchers.filter((entry) => entry.user_id !== message.user_id);
        this.emit({t: 'kicked', user_id: message.user_id});
        this.broadcastState();
        break;
      }
      case 'close': {
        this.emit({t: 'closed', code: 4010});
        this.clearTimers();
        break;
      }
      default:
        break;
    }
  }

  // a word as the api checks it: in a round, a trail of touching tiles each once, 3 letters, a word, not theirs yet
  private checkWord(from: string, path: Array<number>): void {
    const round = this.game.round;
    const dealt = this.dealt;
    const answer = (event: GameServerEvent) => {
      if (from === YOU) {
        this.emit(event);
      }
    };
    if (this.game.phase !== 'round' || !round || !round.board || !dealt || Date.now() >= round.ends_at || Date.now() < round.started_at) {
      answer({t: 'word', ok: false, reason: 'closed'});
      return;
    }
    const size = round.size;
    const valid = path.every((index, step) => Number.isInteger(index) && 0 <= index && index < size * size
      && path.indexOf(index) === step && (step === 0 || touching(path[step - 1], index, size)));
    if (!valid) {
      answer({t: 'word', ok: false, reason: 'path'});
      return;
    }
    const word = wordOf(dealt.board, path);
    if (word.length < LETTER_TRAIL_MIN_LETTERS) {
      answer({t: 'word', ok: false, word, reason: 'short'});
      return;
    }
    if (!MOCK_WORDS.has(word)) {
      answer({t: 'word', ok: false, word, reason: 'not_word'});
      return;
    }
    if ((this.found.get(from) ?? []).some((entry) => entry.word === word)) {
      answer({t: 'word', ok: false, word, reason: 'repeat'});
      return;
    }
    const entry = this.record(from, word, path, true);
    answer({t: 'word', ok: true, word, points: entry.points, bonus: entry.bonus});
  }

  // a word into someone's list and the room's counts (everyone else hears how many, `tell`)
  private record(userId: string, word: string, path: Array<number>, tell: boolean): LetterTrailWord {
    const round = this.game.round!;
    const bonus = round.bonus !== null && path.includes(round.bonus);
    const entry = {word, points: wordPoints(word.length) * ((bonus) ? 2 : 1), bonus, path};
    const list = [...(this.found.get(userId) ?? []), entry];
    this.found.set(userId, list);
    round.counts = {...round.counts, [userId]: list.length};
    if (tell && userId !== YOU) {
      this.emit({t: 'found', user_id: userId, count: list.length, now: Date.now()});
    }
    return entry;
  }

  private startRound(number: number, delayOverride?: number): void {
    this.clearTimers();
    const size = this.game.settings.size;
    this.dealt = deal(size);
    this.found = new Map();
    const delay = delayOverride ?? ((number === 1 && !this.solo) ? START_COUNTDOWN_MS : 0);
    const startedAt = Date.now() + delay;
    const ms = this.game.settings.seconds * 1000;
    this.game = {
      ...this.game,
      phase: 'round',
      round: {
        number,
        total: this.game.settings.rounds,
        size,
        // like the api: no board before it starts
        board: (delay) ? null : [...this.dealt.board],
        bonus: (delay) ? null : this.dealt.bonus,
        started_at: startedAt,
        ends_at: startedAt + ms,
        counts: Object.fromEntries(this.game.players.map((player) => [player.user_id, 0])),
      },
      reveal: null,
      standings: null,
    };
    this.broadcastState();
    const dealt = this.dealt;
    if (delay) {
      this.later(() => {
        if (this.game.round) {
          this.game.round = {...this.game.round, board: [...dealt.board], bonus: dealt.bonus};
          this.broadcastState();
        }
      }, delay);
    }
    if (!this.hold) {
      this.later(() => this.endRound(), delay + ms);
    }
    // the bots: each finds some of the board's words, spread over the round, short ones more often
    const answers = shuffle([...dealt.answers.entries()]);
    for (const [ index, bot ] of this.game.players.filter((player) => player.user_id !== YOU && player.connected).entries()) {
      const share = [0.35, 0.22, 0.15][index % 3];
      const picks = answers.filter(([ word ]) => Math.random() < share * ((word.length <= 4) ? 1.4 : 0.7));
      for (const [ , path ] of picks) {
        this.later(() => this.checkWord(bot.user_id, path), delay + ms * (0.05 + Math.random() * 0.9));
      }
    }
  }

  // the round's over: everyone's words, the "only you" ones +2 when 2 or more played, the longest ones nobody found
  private endRound(): void {
    const round = this.game.round;
    const dealt = this.dealt;
    if (this.game.phase !== 'round' || !round || !dealt) {
      return;
    }
    this.clearTimers();
    const finders = new Map<string, number>();
    for (const list of this.found.values()) {
      for (const entry of list) {
        finders.set(entry.word, (finders.get(entry.word) ?? 0) + 1);
      }
    }
    const contested = this.game.players.length >= 2 && !this.solo;
    const players = this.game.players.map((player) => {
      const words: Array<LetterTrailRevealWord> = (this.found.get(player.user_id) ?? []).map((entry) => {
        const onlyYou = contested && finders.get(entry.word) === 1;
        // the api's `ONLY_YOU_BONUS`, added after the ×2 tile
        return {word: entry.word, points: entry.points + ((onlyYou) ? 2 : 0), bonus: entry.bonus, only_you: onlyYou};
      });
      return {user_id: player.user_id, words, round_score: words.reduce((sum, entry) => sum + entry.points, 0)};
    });
    for (const row of players) {
      const player = this.game.players.find((entry) => entry.user_id === row.user_id);
      if (player) {
        player.score += row.round_score;
      }
    }
    const missed = [...dealt.answers.keys()].filter((word) => !finders.has(word))
      .sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, MISSED_SHOWN);
    const endsAt = Date.now() + LETTER_TRAIL_REVEAL_MS;
    this.game = {...this.game, phase: 'reveal', reveal: {ends_at: endsAt, until: endsAt, players, missed, total_words: dealt.answers.size}};
    this.broadcastState();
    if (!this.hold) {
      this.later(() => this.afterReveal(), LETTER_TRAIL_REVEAL_MS);
    }
  }

  private afterReveal(): void {
    const round = this.game.round;
    if (!round || round.number >= round.total) {
      this.finishGame();
    } else {
      this.startRound(round.number + 1);
    }
  }

  private finishGame(): void {
    this.game = {
      ...this.game,
      phase: 'finished',
      standings: [...this.game.players].sort((a, b) => b.score - a.score).map((player) => ({user_id: player.user_id, score: player.score})),
    };
    this.broadcastState();
    this.award();
  }

  // like the api: a quarter of each score (rounded up) after the daily cap, a moment after the standings
  private award(): void {
    const awards: Record<string, number> = {};
    for (const player of this.game.players) {
      if (0 < player.score) {
        const worth = gamePointsFor('letter_trail', player.score);
        const counted = (player.user_id === YOU) ? Math.min(worth, this.dailyLeft) : worth;
        awards[player.user_id] = counted;
        if (player.user_id === YOU) {
          this.dailyLeft -= counted;
        }
      }
    }
    this.later(() => {
      if (this.game.phase === 'finished') {
        this.game.players = this.game.players.map((player) => (player.user_id in awards) ? {...player, awarded: awards[player.user_id]} : player);
      }
      this.emit({t: 'awarded', awards, now: Date.now()});
    }, AWARD_DELAY);
  }
}
