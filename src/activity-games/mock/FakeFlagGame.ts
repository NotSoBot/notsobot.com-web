import { FlagGameConnection } from '../connection';
import {
  DEFAULT_SETTINGS,
  GAME_DIFFICULTIES,
  GAME_MODES,
  REVEAL_MS,
  ROUNDS_MAX,
  ROUNDS_MIN,
  SECONDS_MAX,
  SECONDS_MIN,
  START_COUNTDOWN_MS,
  type GameClientMessage,
  type GamePlayer,
  type GameRoomVisibility,
  type GameServerEvent,
  type GameSettings,
  type GameState,
} from '../protocol';
import { MOCK_COUNTRIES, type MockCountry } from './flags';


// Dev mocks only (never in a production build, see src/activity.tsx): the api's flag game played in the browser, behind
// the same connection the Activity's socket gives the screens. Three bots join, solve some flags and answer some
// choices. Not the api's rules to the letter, close enough to see every screen. A game's first flag counts down
// (`START_COUNTDOWN_MS`, no flag or choices until then) unless the room is solo, which starts as you join. `alone`: a
// room just made, only you in it until the dev bar's "someone joins"

const YOU = '300000000000000001';
const BOTS: Array<GamePlayer> = [
  {user_id: '300000000000000002', username: 'mochi', avatar_url: null, score: 0, streak: 0, connected: true},
  {user_id: '300000000000000003', username: 'ferretking', avatar_url: null, score: 0, streak: 0, connected: true},
  {user_id: '300000000000000004', username: 'quill', avatar_url: null, score: 0, streak: 0, connected: false},
];
// a message's trip each way
const LATENCY = 40;
// the api's award after a game ends comes a moment after its finished state (a `game.awarded`)
const AWARD_DELAY = 1200;


function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

function distance(a: string, b: string): number {
  const row = Array.from({length: b.length + 1}, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + ((a[i - 1] === b[j - 1]) ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function shuffle<T>(items: Array<T>): Array<T> {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function lettersHint(name: string): string {
  return name.split('').map((char, index) => (char === ' ') ? ' ' : (index === 0) ? char : '_').join(' ');
}


export class FakeFlagGame extends FlagGameConnection {
  private game: GameState;
  private country: MockCountry | null = null;
  private answerIndex = -1;
  private order: Array<MockCountry> = [];
  private answered = new Set<string>();
  private timers: Array<number> = [];
  private alive = false;
  private solvedPoints: Array<{user_id: string, points: number}> = [];
  // what's left of your daily game points cap (`&cap=` on the mock page), the bots never reach theirs
  private dailyLeft: number;
  private solo: boolean;
  // a solo room's game starts as you first join, once
  private soloStarted = false;

  constructor({ youHost = true, watch = false, dailyLeft = Infinity, visibility = 'server', solo = false, alone = false, settings }: {
    youHost?: boolean,
    watch?: boolean,
    dailyLeft?: number,
    visibility?: GameRoomVisibility,
    solo?: boolean,
    alone?: boolean,
    settings?: GameSettings,
  } = {}) {
    super();
    this.dailyLeft = dailyLeft;
    this.solo = solo;
    const you: GamePlayer = {user_id: YOU, username: 'you_in_dev', avatar_url: null, score: 0, streak: 0, connected: true};
    const players = (solo || alone) ? [you] : (watch) ? [...BOTS] : (youHost) ? [you, ...BOTS] : [BOTS[0], you, ...BOTS.slice(1)];
    const creator = (solo || alone || (youHost && !watch)) ? you : BOTS[0];
    this.game = {
      id: 'mockroom0001',
      room: {
        name: (solo || alone) ? null : 'Dev flag room', creator: {user_id: creator.user_id, username: creator.username, avatar_url: creator.avatar_url}, locked: false, watch_only: false,
        game: 'flag_guesser', visibility, origin: (visibility === 'global') ? {guild_id: '200000000000000001', guild_name: 'Geography Nerds'} : null,
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
      settings: {...(settings ?? DEFAULT_SETTINGS)},
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
      // like the api: a solo room's game is already running by the time `ready` says so
      if (this.solo && !this.soloStarted && this.game.phase === 'lobby') {
        this.soloStarted = true;
        this.order = shuffle(MOCK_COUNTRIES);
        this.startRound(1);
      }
      this.emit({t: 'ready', you: YOU, now: Date.now(), game: this.copy()});
    }, 300);
  }

  // the dev toolbar's: the next bot that isn't in comes in (an `alone` room's invite card goes)
  botJoins(): void {
    const bot = BOTS.find((entry) => !this.game.players.some((player) => player.user_id === entry.user_id));
    if (!bot || this.solo) {
      return;
    }
    this.game.players = [...this.game.players, {...bot, connected: true}];
    this.broadcastState();
  }

  close(): void {
    this.alive = false;
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers = [];
    this.setStatus('closed');
  }

  // the dev toolbar's: the socket drops for a while, the game goes on without them, then a fresh `ready`
  drop(ms = 4000): void {
    this.setStatus('closed');
    window.setTimeout(() => {
      this.setStatus('connecting');
      window.setTimeout(() => this.emit({t: 'ready', you: YOU, now: Date.now(), game: this.copy()}), 600);
    }, ms);
  }

  // the dev toolbar's: what the host would do when it isn't you
  hostStart(): void {
    if (this.game.host_id) {
      this.handle({op: 'start'}, this.game.host_id);
    }
  }

  // the dev toolbar's: the game ends now with made-up scores if nobody has any (to see the finished screen fast)
  finish(): void {
    this.clearRoundTimers();
    if (this.game.players.every((player) => player.score === 0)) {
      this.game.players = this.game.players.map((player, index) => ({...player, score: [14, 9, 22, 0][index % 4]}));
    }
    this.finishGame();
  }

  loadFlag(flagUrl: string): Promise<string> {
    return new Promise((resolve) => window.setTimeout(() => resolve(flagUrl), 150));
  }

  protected send(message: GameClientMessage): boolean {
    if (this.snapshot.status !== 'open') {
      return false;
    }
    window.setTimeout(() => this.handle(message, YOU), LATENCY);
    return true;
  }

  private later(run: () => void, ms: number): void {
    this.timers.push(window.setTimeout(() => {
      if (this.alive) {
        run();
      }
    }, ms));
  }

  private clearRoundTimers(): void {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers = [];
  }

  private emit(event: GameServerEvent): void {
    // a dropped socket misses everything until its next `ready`
    if (!this.alive || (this.snapshot.status !== 'open' && event.t !== 'ready')) {
      return;
    }
    window.setTimeout(() => this.receive(event), LATENCY);
  }

  // only the sender gets the answer to its guess
  private answerTo(from: string, event: GameServerEvent): void {
    if (from === YOU) {
      this.emit(event);
    }
  }

  private copy(): GameState {
    return JSON.parse(JSON.stringify(this.game));
  }

  private broadcastState(): void {
    this.emit({t: 'state', now: Date.now(), game: this.copy()});
  }

  private handle(message: GameClientMessage, from: string): void {
    const host = from === this.game.host_id;
    switch (message.op) {
      case 'settings': {
        // another game's settings are refused too, like the api's
        if (!host || (this.game.phase !== 'lobby' && this.game.phase !== 'finished') || !('mode' in message)) {
          this.emit({t: 'error', op: 'settings', message: 'Only the host can change the settings'});
          return;
        }
        const settings: GameSettings = {
          mode: (GAME_MODES.includes(message.mode)) ? message.mode : 'type',
          rounds: Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, Math.round(message.rounds))),
          difficulty: (GAME_DIFFICULTIES.includes(message.difficulty)) ? message.difficulty : 'medium',
          seconds: Math.min(SECONDS_MAX, Math.max(SECONDS_MIN, Math.round(message.seconds))),
        };
        this.game = {...this.game, settings};
        this.broadcastState();
        break;
      }
      case 'start': {
        if (!host) {
          return;
        }
        this.game.players = this.game.players.map(({ awarded: _awarded, ...player }) => ({...player, score: 0, streak: 0}));
        this.order = shuffle(MOCK_COUNTRIES);
        this.startRound(1);
        break;
      }
      case 'end': {
        if (!host) {
          return;
        }
        // ended early: the points so far still count, the award comes while it's back in the lobby
        const ended = this.game.phase === 'round' || this.game.phase === 'reveal';
        this.clearRoundTimers();
        this.game = {...this.game, phase: 'lobby', round: null, reveal: null, standings: null};
        this.game.players = this.game.players.map(({ awarded: _awarded, ...player }) => player);
        this.broadcastState();
        if (ended) {
          this.award();
        }
        break;
      }
      case 'guess': {
        const round = this.game.round;
        if (this.game.phase !== 'round' || !round || !this.country || round.solved.includes(from)) {
          return;
        }
        if (Date.now() < round.started_at) {
          this.answerTo(from, {t: 'error', op: 'guess', message: 'The round hasn’t started yet'});
          return;
        }
        const guess = normalize(message.text);
        const names = [this.country.name, ...(this.country.aliases ?? [])].map(normalize);
        const best = Math.min(...names.map((name) => distance(guess, name)));
        const allowed = (guess.length >= 6) ? 1 : 0;
        if (best <= allowed) {
          this.answerTo(from, {t: 'guess', correct: true});
          this.solve(from);
        } else {
          this.answerTo(from, {t: 'guess', correct: false, close: best <= allowed + 2});
        }
        break;
      }
      case 'choose': {
        const round = this.game.round;
        if (this.game.phase !== 'round' || !round || this.answered.has(from) || Date.now() < round.started_at) {
          return;
        }
        this.answered.add(from);
        round.answered += 1;
        const correct = message.index === this.answerIndex;
        this.answerTo(from, {t: 'guess', correct});
        this.emit({t: 'answered', user_id: from});
        if (correct) {
          this.solve(from);
        } else {
          this.breakStreak(from);
          this.checkEveryone();
        }
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
        if (this.solo) {
          this.emit({t: 'error', op: 'watch', message: 'A solo game has no watchers'});
          return;
        }
        if (!player || (this.game.phase !== 'lobby' && this.game.phase !== 'finished')) {
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
        if (this.solo) {
          this.emit({t: 'error', op: 'room', message: 'A solo game has no room settings'});
          break;
        }
        // like the api: who finds it changes only in the lobby
        if (message.visibility && this.game.phase !== 'lobby') {
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
        // the connection ends it on `closed` (denied, 4010) like the socket's
        this.emit({t: 'closed', code: 4010});
        this.clearRoundTimers();
        break;
      }
      default:
        break;
    }
  }

  // the standings, then each player's game points (what counted, after the daily cap) a moment later like the api's
  private finishGame(): void {
    this.game = {
      ...this.game,
      phase: 'finished',
      round: this.game.round ?? null,
      standings: [...this.game.players].sort((a, b) => b.score - a.score).map((player) => ({user_id: player.user_id, score: player.score})),
    };
    this.broadcastState();
    this.award();
  }

  private award(): void {
    const awards: Record<string, number> = {};
    for (const player of this.game.players) {
      if (0 < player.score) {
        const counted = (player.user_id === YOU) ? Math.min(player.score, this.dailyLeft) : player.score;
        awards[player.user_id] = counted;
        if (player.user_id === YOU) {
          this.dailyLeft -= counted;
        }
      }
    }
    this.later(() => {
      if (this.game.phase === 'finished') {
        // later states carry it on the players, like the api's
        this.game.players = this.game.players.map((player) => (player.user_id in awards) ? {...player, awarded: awards[player.user_id]} : player);
      }
      this.emit({t: 'awarded', awards, now: Date.now()});
    }, AWARD_DELAY);
  }

  private startRound(number: number): void {
    this.clearRoundTimers();
    const country = this.order[(number - 1) % this.order.length];
    this.country = country;
    this.answered = new Set();
    // a game's first flag counts down in a room for more than one, its time and hints from then on
    const delay = (number === 1 && !this.solo) ? START_COUNTDOWN_MS : 0;
    const now = Date.now() + delay;
    const ms = this.game.settings.seconds * 1000;
    let choices: Array<string> | null = null;
    if (this.game.settings.mode === 'choices') {
      const decoys = shuffle(MOCK_COUNTRIES.filter((other) => other.code !== country.code && other.region === country.region)).slice(0, 3);
      const filled = (decoys.length < 3) ? [...decoys, ...shuffle(MOCK_COUNTRIES.filter((other) => other.code !== country.code && !decoys.includes(other))).slice(0, 3 - decoys.length)] : decoys;
      choices = shuffle([country.name, ...filled.map((other) => other.name)]);
      this.answerIndex = choices.indexOf(country.name);
    }
    this.game = {
      ...this.game,
      phase: 'round',
      round: {
        number,
        total: this.game.settings.rounds,
        // like the api: nothing of the flag before it starts
        flag_url: (delay) ? null : country.flag,
        started_at: now,
        ends_at: now + ms,
        hint: null,
        choices: (delay) ? null : choices,
        solved: [],
        answered: 0,
      },
      reveal: null,
      standings: null,
    };
    this.solvedPoints = [];
    this.broadcastState();
    if (delay) {
      this.later(() => {
        if (this.game.round) {
          this.game.round = {...this.game.round, flag_url: country.flag, choices};
          this.broadcastState();
        }
      }, delay);
    }
    this.later(() => {
      if (this.game.round) {
        this.game.round.hint = {region: country.region};
        this.emit({t: 'hint', hint: {region: country.region}});
      }
    }, delay + ms / 3);
    this.later(() => {
      if (this.game.round) {
        this.game.round.hint = {...this.game.round.hint, letters: lettersHint(country.name)};
        this.emit({t: 'hint', hint: {letters: lettersHint(country.name)}});
      }
    }, delay + ms * 2 / 3);
    this.later(() => this.endRound(), delay + ms);
    // the bots: most of them get it, some time into it
    for (const bot of this.game.players.filter((player) => player.user_id !== YOU && player.connected)) {
      const at = delay + ms * (0.15 + Math.random() * 0.75);
      this.later(() => {
        if (this.game.settings.mode === 'choices') {
          const pick = (Math.random() < 0.7) ? this.answerIndex : (this.answerIndex + 1) % 4;
          this.handle({op: 'choose', index: pick}, bot.user_id);
        } else if (Math.random() < 0.7) {
          this.handle({op: 'guess', text: country.name}, bot.user_id);
        }
      }, at);
    }
  }

  private solve(userId: string): void {
    const round = this.game.round!;
    const stage = (round.hint?.letters) ? 1 : (round.hint?.region) ? 2 : 3;
    const first = round.solved.length === 0;
    const player = this.game.players.find((entry) => entry.user_id === userId)!;
    player.streak += 1;
    const points = stage + ((first) ? 1 : 0) + ((player.streak >= 3) ? 1 : 0);
    player.score += points;
    round.solved.push(userId);
    this.solvedPoints.push({user_id: userId, points});
    this.emit({t: 'solved', user_id: userId, points, rank: round.solved.length});
    this.checkEveryone();
  }

  private breakStreak(userId: string): void {
    const player = this.game.players.find((entry) => entry.user_id === userId);
    if (player) {
      player.streak = 0;
    }
  }

  // a round ends early once every connected player solved it (or picked a choice)
  private checkEveryone(): void {
    const round = this.game.round;
    if (!round) {
      return;
    }
    const connected = this.game.players.filter((player) => player.connected);
    const done = connected.every((player) => round.solved.includes(player.user_id) || this.answered.has(player.user_id));
    if (done) {
      this.clearRoundTimers();
      this.later(() => this.endRound(), 400);
    }
  }

  private endRound(): void {
    if (this.game.phase !== 'round' || !this.game.round || !this.country) {
      return;
    }
    this.clearRoundTimers();
    for (const player of this.game.players) {
      if (!this.game.round.solved.includes(player.user_id)) {
        player.streak = 0;
      }
    }
    this.game = {
      ...this.game,
      phase: 'reveal',
      reveal: {name: this.country.name, code: this.country.code, solved: this.solvedPoints},
    };
    this.broadcastState();
    this.later(() => {
      const round = this.game.round!;
      if (round.number >= round.total) {
        this.finishGame();
      } else {
        this.startRound(round.number + 1);
      }
    }, REVEAL_MS);
  }
}
