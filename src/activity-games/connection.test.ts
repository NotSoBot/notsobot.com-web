import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EditorRoom, RoomClose, RoomGameMessage, RoomStatus } from '@/editor/room';

import { RoomFlagGame } from './connection';
import type { GamePhase, GameRound, GameRoomInfo, GameState, LetterTrailState } from './protocol';


// the Activity's socket as RoomFlagGame sees it: its status, its game messages and pongs, and what was sent on it
class FakeRoom {
  status: RoomStatus = 'open';
  lastClose: RoomClose | null = null;
  sent: Array<Record<string, unknown>> = [];
  pings = 0;
  reconnects = 0;
  private gameListeners = new Set<(message: RoomGameMessage) => void>();
  private statusListeners = new Set<(status: RoomStatus) => void>();
  private pongListeners = new Set<(now: number, roundTrip: number) => void>();

  get isOpen(): boolean {
    return this.status === 'open';
  }

  onGame(listener: (message: RoomGameMessage) => void): () => void {
    this.gameListeners.add(listener);
    return () => {
      this.gameListeners.delete(listener);
    };
  }

  onStatus(listener: (status: RoomStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onPong(listener: (now: number, roundTrip: number) => void): () => void {
    this.pongListeners.add(listener);
    return () => {
      this.pongListeners.delete(listener);
    };
  }

  sendMessage(message: Record<string, unknown>): boolean {
    if (!this.isOpen) {
      return false;
    }
    this.sent.push(message);
    return true;
  }

  ping(): void {
    this.pings += 1;
  }

  reconnectNow(): void {
    this.reconnects += 1;
  }

  setStatus(status: RoomStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  // a `game.<t>` from the api, for this room unless said otherwise (null: an answer from before any game is joined)
  emit(t: string, payload: Record<string, unknown> = {}, gameId: string | null = 'roomA'): void {
    for (const listener of this.gameListeners) {
      listener({t: `game.${t}`, game_id: gameId, now: Date.now(), ...payload});
    }
  }

  pong(now: number, roundTrip: number): void {
    for (const listener of this.pongListeners) {
      listener(now, roundTrip);
    }
  }

  ops(): Array<unknown> {
    return this.sent.map((message) => message.op);
  }

  count(op: string): number {
    return this.ops().filter((sent) => sent === op).length;
  }
}


const ROOM: GameRoomInfo = {
  name: null, creator: {user_id: 'u1', username: 'a', avatar_url: null}, locked: false, watch_only: false,
  game: 'flag_guesser', visibility: 'server', origin: null, solo: false,
};

function flagGame(phase: GamePhase, flag: string | null, extra: Partial<GameState> = {}, roundExtra: Partial<GameRound> = {}): GameState {
  const now = Date.now();
  return {
    id: 'roomA', room: ROOM, watchers: [], you_watch: false, can_play: true, phase, host_id: 'u1',
    settings: {mode: 'choices', rounds: 5, difficulty: 'easy', seconds: 20},
    players: [{user_id: 'u1', username: 'a', avatar_url: null, score: 0, streak: 0, connected: true, outcome: null}],
    round: (flag === null) ? null : {
      number: 1, total: 5, flag_url: flag, started_at: now - 1000, ends_at: now + 9000, hint: null, choices: ['a', 'b', 'c', 'd'],
      solved: [], answered: 0, answered_by: [], you_solved: false, you_answered: false, your_choice: null, ...roundExtra,
    },
    reveal: null, standings: null, ...extra,
  };
}

const TYPE_MODE: Partial<GameState> = {settings: {mode: 'type', rounds: 5, difficulty: 'easy', seconds: 20}};

function lettersGame(number: number, startedAt: number): LetterTrailState {
  return {
    id: 'roomA', room: {...ROOM, game: 'letter_trail'}, watchers: [], you_watch: false, can_play: true, phase: 'round', host_id: 'u1',
    settings: {size: 4, seconds: 80, rounds: 2},
    players: [{user_id: 'u1', username: 'a', avatar_url: null, score: 0, streak: 0, connected: true, outcome: null}],
    round: {number, total: 2, size: 4, board: Array<string>(16).fill('A'), bonus: 0, started_at: startedAt, ends_at: startedAt + 80000, counts: {}, you_found: []},
    reveal: null, standings: null,
  };
}

function fresh(room = new FakeRoom()): {room: FakeRoom, game: RoomFlagGame} {
  return {room, game: new RoomFlagGame(room as unknown as EditorRoom, 'roomA', '/api', 'token')};
}

function ready(room: FakeRoom, game: GameState | LetterTrailState, moderator = false): void {
  room.emit('ready', {you: 'u1', game, moderator});
}

// connected and in the game, `state` the game its `ready` brings
function joined(state: GameState | LetterTrailState = flagGame('lobby', null), moderator = false): {room: FakeRoom, game: RoomFlagGame} {
  const { room, game } = fresh();
  game.connect();
  ready(room, state, moderator);
  return {room, game};
}

// the socket drops and comes back (its `open` sends the join again)
function bounce(room: FakeRoom): void {
  room.setStatus('closed');
  room.setStatus('open');
}


describe('RoomFlagGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('joining', () => {
    it('connect sends a game_join and is connecting', () => {
      const { room, game } = fresh();
      game.connect();
      expect(room.ops()).toEqual(['game_join']);
      expect(game.snapshot.status).toBe('connecting');
    });

    // L3: anything before the join's `ready` is from before this join and would show a game they aren't in
    it('a state before ready is ignored', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('state', {game: flagGame('lobby', null)});
      expect(game.snapshot.game).toBeNull();
    });

    it('a stray error before ready is ignored', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('error', {op: 'guess', message: 'Join the game first'}, null);
      expect(game.snapshot.error).toBeNull();
    });

    it('ready opens with the game and the moderator flag, and pings for a clock sample', () => {
      const { room, game } = joined(flagGame('lobby', null), true);
      expect(game.snapshot.status).toBe('open');
      expect(game.snapshot.game).not.toBeNull();
      expect(game.snapshot.moderator).toBe(true);
      expect(room.pings).toBe(1);
    });
  });

  describe('pendingOp', () => {
    it('a start is sent and pending', () => {
      const { game } = joined();
      expect(game.start()).toBe(true);
      expect(game.snapshot.pendingOp).toBe('start');
    });

    it('a second start, and an end, wait while a start is pending', () => {
      const { room, game } = joined();
      game.start();
      expect(game.start()).toBe(false);
      expect(game.end()).toBe(false);
      expect(room.count('game_start')).toBe(1);
    });

    it('a state answers the pending op', () => {
      const { room, game } = joined();
      game.start();
      room.emit('state', {game: flagGame('lobby', null)});
      expect(game.snapshot.pendingOp).toBeNull();
    });

    it('an error answers the pending op and shows', () => {
      const { room, game } = joined();
      game.start();
      room.emit('error', {op: 'start', message: 'Nobody to play with'});
      expect(game.snapshot.pendingOp).toBeNull();
      expect(game.snapshot.error).toBe('Nobody to play with');
    });

    it('any error clears the pending op, a refused guess\'s too', () => {
      const { room, game } = joined();
      game.end();
      room.emit('error', {op: 'guess', message: 'x'});
      expect(game.snapshot.pendingOp).toBeNull();
    });
  });

  // B2: a refusal showing goes when a round starts, not with every state
  describe('error banner', () => {
    it('a lobby state keeps the error', () => {
      const { room, game } = joined();
      game.start();
      room.emit('error', {op: 'start', message: 'Nobody to play with'});
      room.emit('state', {game: flagGame('lobby', null)});
      expect(game.snapshot.error).toBe('Nobody to play with');
    });

    // the scratch script expected the lobby's first round to keep it (the previous state had no round); the source
    // now takes it with any state that has a round
    it('a lobby\'s first round clears the error', () => {
      const { room, game } = joined();
      game.start();
      room.emit('error', {op: 'start', message: 'Nobody to play with'});
      room.emit('state', {game: flagGame('round', '/flag/1')});
      expect(game.snapshot.error).toBeNull();
    });

    it('the next round clears the error', () => {
      const { room, game } = joined(flagGame('round', '/flag/1'));
      room.emit('error', {op: 'settings', message: 'Only the host can change the settings'});
      room.emit('state', {game: flagGame('round', '/flag/1')});
      expect(game.snapshot.error).toBe('Only the host can change the settings');
      room.emit('state', {game: flagGame('round', '/flag/2')});
      expect(game.snapshot.error).toBeNull();
    });
  });

  // B1 / contract 3: a refused guess, choice or word gets an error instead of its answer
  describe('refused answers', () => {
    it('a choice goes out and shows as chosen', () => {
      const { game } = joined(flagGame('round', '/flag/1'));
      vi.advanceTimersByTime(400);
      expect(game.choose(2)).toBe(true);
      expect(game.snapshot.chosen).toBe(2);
    });

    it('a refused choice is no banner and can be picked again', () => {
      const { room, game } = joined(flagGame('round', '/flag/1'));
      game.choose(2);
      room.emit('error', {op: 'choose', message: 'The round is over'});
      expect(game.snapshot.error).toBeNull();
      expect(game.snapshot.chosen).toBeNull();
    });

    it('a refused guess leaves the queue: the next answer names the right text', () => {
      const { room, game } = joined(flagGame('round', '/flag/1', TYPE_MODE, {choices: null}));
      vi.advanceTimersByTime(400);
      game.guess('first');
      vi.advanceTimersByTime(400);
      game.guess('second');
      room.emit('error', {op: 'guess', message: 'Too fast, slow down'});
      room.emit('guess', {correct: false, close: true});
      expect(game.snapshot.guess).toMatchObject({text: 'second', result: 'close'});
      expect(game.snapshot.error).toBeNull();
    });

    // rate limited is the one refusal the round doesn't explain by itself (the answer just went nowhere): it shows
    it.each([
      {op: 'guess', send: (game: RoomFlagGame) => game.guess('first'), state: () => flagGame('round', '/flag/1', TYPE_MODE, {choices: null})},
      {op: 'choose', send: (game: RoomFlagGame) => game.choose(1), state: () => flagGame('round', '/flag/1')},
      {op: 'word', send: (game: RoomFlagGame) => game.word([0, 1, 2]), state: () => lettersGame(1, Date.now() - 1000)},
    ])('a $op refused as rate limited (30016) shows as a banner', ({ op, send, state }) => {
      const { room, game } = joined(state());
      vi.advanceTimersByTime(400);
      expect(send(game)).toBe(true);
      room.emit('error', {op, code: 30016, message: 'Too fast, slow down'});
      expect(game.snapshot.error).toBe('Too fast, slow down');
      expect(game.snapshot.chosen).toBeNull();
    });
  });

  describe('close', () => {
    it('close sends a leave, is left and keeps no timer', () => {
      const { room, game } = joined();
      game.close();
      expect(room.ops().at(-1)).toBe('game_leave');
      expect(game.snapshot.status).toBe('left');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('a plain close never asks to close the room', () => {
      const { room, game } = joined();
      game.close();
      expect(room.sent.at(-1)).toEqual({op: 'game_leave'});
    });

    it('going back to the rooms asks for an empty room to close', () => {
      const { room, game } = joined(flagGame('finished', null));
      game.backToRooms();
      expect(room.count('game_leave')).toBe(0);
      game.close();
      expect(room.sent.at(-1)).toEqual({op: 'game_leave', close_empty: true});
      expect(room.count('game_leave')).toBe(1);
    });

    it('nothing after close counts', () => {
      const { room, game } = joined(flagGame('round', '/flag/1'));
      game.close();
      room.emit('state', {game: flagGame('lobby', null)});
      expect(game.snapshot.game?.phase).toBe('round');
    });
  });

  describe('reconnecting', () => {
    function dropped(): {room: FakeRoom, game: RoomFlagGame} {
      const { room, game } = joined();
      game.start();
      room.lastClose = {code: 1006, reason: '', at: Date.now()};
      room.setStatus('closed');
      return {room, game};
    }

    it('the socket going down with a game is reconnecting, and the pending op goes', () => {
      const { game } = dropped();
      expect(game.snapshot.status).toBe('reconnecting');
      expect(game.snapshot.pendingOp).toBeNull();
      expect(game.snapshot.socketClose?.code).toBe(1006);
    });

    it('nothing is sent while the socket is down', () => {
      const { game } = dropped();
      expect(game.start()).toBe(false);
      expect(game.settings({mode: 'type', rounds: 5, difficulty: 'easy', seconds: 20})).toBe(false);
    });

    it('it is still reconnecting while the socket connects', () => {
      const { room, game } = dropped();
      room.setStatus('connecting');
      expect(game.snapshot.status).toBe('reconnecting');
    });

    it('the socket back joins again and is still reconnecting until its ready', () => {
      const { room, game } = dropped();
      room.setStatus('connecting');
      room.setStatus('open');
      expect(room.count('game_join')).toBe(2);
      expect(game.snapshot.status).toBe('reconnecting');
      expect(game.snapshot.socketClose).toBeNull();
    });

    it('the rejoin\'s ready reopens', () => {
      const { room, game } = dropped();
      room.setStatus('open');
      ready(room, flagGame('lobby', null));
      expect(game.snapshot.status).toBe('open');
    });

    // L1: a second join's busy answer can come after the first one's `ready`
    it('a busy answer after ready is not open and sends nothing', () => {
      const { room, game } = joined();
      room.emit('closed', {code: 1011, message: 'busy'});
      expect(game.snapshot.status).toBe('reconnecting');
      expect(game.start()).toBe(false);
    });

    it('a busy join is asked again after the wait', () => {
      const { room } = joined();
      room.emit('closed', {code: 1011, message: 'busy'});
      vi.advanceTimersByTime(999);
      expect(room.count('game_join')).toBe(1);
      vi.advanceTimersByTime(1);
      expect(room.count('game_join')).toBe(2);
    });

    it('a busy join is back open with its next ready', () => {
      const { room, game } = joined();
      room.emit('closed', {code: 1011, message: 'busy'});
      vi.advanceTimersByTime(1000);
      ready(room, flagGame('lobby', null));
      expect(game.snapshot.status).toBe('open');
      expect(game.start()).toBe(true);
    });
  });

  describe('slow join', () => {
    function downAtConnect(): {room: FakeRoom, game: RoomFlagGame} {
      const room = new FakeRoom();
      room.status = 'closed';
      room.lastClose = {code: 4029, reason: 'too many sockets open', at: Date.now()};
      const { game } = fresh(room);
      game.connect();
      return {room, game};
    }

    it('the socket down with no game yet is connecting, not slow', () => {
      const { game } = downAtConnect();
      expect(game.snapshot.status).toBe('connecting');
      expect(game.snapshot.slowJoin).toBe(false);
    });

    it('it is slow after JOIN_TIMEOUT', () => {
      const { game } = downAtConnect();
      vi.advanceTimersByTime(6000);
      expect(game.snapshot.slowJoin).toBe(true);
    });

    // B3: Try again puts the screen back to waiting, slow again only after another timeout
    it('Try again with the socket down is waiting again and asks the socket to reconnect', () => {
      const { room, game } = downAtConnect();
      vi.advanceTimersByTime(6000);
      game.retryJoin();
      expect(game.snapshot.slowJoin).toBe(false);
      expect(room.reconnects).toBe(1);
    });

    it('after Try again it is slow again only once another timeout has passed', () => {
      const { game } = downAtConnect();
      vi.advanceTimersByTime(6000);
      game.retryJoin();
      vi.advanceTimersByTime(5999);
      expect(game.snapshot.slowJoin).toBe(false);
      vi.advanceTimersByTime(1);
      expect(game.snapshot.slowJoin).toBe(true);
    });

    it('a join left unanswered is slow and asked again', () => {
      const { room, game } = downAtConnect();
      vi.advanceTimersByTime(12_000);
      room.setStatus('open');
      vi.advanceTimersByTime(6000);
      expect(game.snapshot.slowJoin).toBe(true);
      expect(room.count('game_join')).toBe(2);
    });

    it('Try again with the socket up sends a join and is waiting', () => {
      const { room, game } = downAtConnect();
      room.setStatus('open');
      vi.advanceTimersByTime(6000);
      game.retryJoin();
      expect(game.snapshot.slowJoin).toBe(false);
      expect(room.count('game_join')).toBe(3);
    });

    it('no timer is left after close', () => {
      const { room, game } = downAtConnect();
      room.setStatus('open');
      vi.advanceTimersByTime(6000);
      game.retryJoin();
      game.close();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('denied', () => {
    it('a refused join is denied with its code', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('closed', {code: 4011, message: 'full'});
      expect(game.snapshot.status).toBe('denied');
      expect(game.snapshot.closeCode).toBe(4011);
    });

    // L2: denied is for good, a second join's `ready` after it changes nothing
    it('a ready after denied changes nothing', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('closed', {code: 4011, message: 'full'});
      ready(room, flagGame('lobby', null));
      expect(game.snapshot.status).toBe('denied');
      expect(game.snapshot.game).toBeNull();
      expect(game.snapshot.closeCode).toBe(4011);
    });

    it('Try again after denied sends no join', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('closed', {code: 4011, message: 'full'});
      game.retryJoin();
      expect(room.count('game_join')).toBe(1);
    });

    // L2: a join asked twice can be refused and then let in, so the leave goes out whatever the status
    it('the leave is sent even when denied', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('closed', {code: 4011, message: 'full'});
      game.close();
      expect(room.ops().at(-1)).toBe('game_leave');
    });

    it('kicked then closed is denied as kicked', () => {
      const { room, game } = joined();
      room.emit('kicked', {user_id: 'u1'});
      room.emit('closed', {code: 4005});
      expect(game.snapshot.status).toBe('denied');
      expect(game.snapshot.closeCode).toBe(4005);
    });

    it('another room\'s close is not this one\'s', () => {
      const { room, game } = joined();
      room.emit('kicked', {user_id: 'u1'});
      room.emit('closed', {code: 4010}, 'roomB');
      expect(game.snapshot.closeCode).toBe(4005);
    });

    it('a join refused as too fast is asked again', () => {
      const { room, game } = fresh();
      game.connect();
      room.emit('error', {op: 'join', message: 'Too fast, slow down'}, null);
      vi.advanceTimersByTime(1000);
      expect(room.count('game_join')).toBe(2);
      expect(game.snapshot.status).toBe('connecting');
    });
  });

  // B5: a `ready` is the api's whole answer for this socket, a choice it says was made has its result
  describe('rejoining mid-round', () => {
    it('a join mid-round has the choice and its result', () => {
      const { game } = joined(flagGame('round', '/flag/1', {}, {your_choice: 3, you_answered: true, you_solved: true, answered_by: ['u1'], solved: ['u1']}));
      expect(game.snapshot.chosen).toBe(3);
      expect(game.snapshot.guess?.result).toBe('correct');
    });

    it('a reconnect whose answer was lost shows the api\'s result (wrong)', () => {
      const { room, game } = joined(flagGame('round', '/flag/1'));
      vi.advanceTimersByTime(400);
      game.choose(1);
      bounce(room);
      ready(room, flagGame('round', '/flag/1', {}, {your_choice: 1, you_answered: true, answered_by: ['u1']}));
      expect(game.snapshot.chosen).toBe(1);
      expect(game.snapshot.guess?.result).toBe('wrong');
    });

    it('a ready without the choice means it never arrived: pick again', () => {
      const { room, game } = joined(flagGame('round', '/flag/1'));
      vi.advanceTimersByTime(400);
      game.choose(1);
      bounce(room);
      ready(room, flagGame('round', '/flag/1'));
      expect(game.snapshot.chosen).toBeNull();
    });

    it('an answer that did arrive stays as it was', () => {
      const { room, game } = joined(flagGame('round', '/flag/1'));
      vi.advanceTimersByTime(400);
      game.choose(0);
      room.emit('guess', {correct: true});
      const at = game.snapshot.guess?.at;
      bounce(room);
      vi.advanceTimersByTime(50);
      ready(room, flagGame('round', '/flag/1', {}, {your_choice: 0, you_answered: true, you_solved: true}));
      expect(game.snapshot.guess?.result).toBe('correct');
      expect(game.snapshot.guess?.at).toBe(at);
    });
  });

  // contract 4: Letter Trail's words and their answers, one queue per round
  describe('Letter Trail words', () => {
    function playing(): {room: FakeRoom, game: RoomFlagGame} {
      const result = joined(lettersGame(1, Date.now() - 1000));
      vi.advanceTimersByTime(200);
      return result;
    }

    it('a word goes out', () => {
      const { game } = playing();
      expect(game.word([0, 1, 2])).toBe(true);
    });

    it('its answer counts', () => {
      const { room, game } = playing();
      game.word([0, 1, 2]);
      room.emit('word', {ok: true, word: 'AAA', points: 1, bonus: false});
      expect(game.snapshot.words).toHaveLength(1);
      expect(game.snapshot.word?.ok).toBe(true);
    });

    it('a new round starts clean', () => {
      const { room, game } = playing();
      game.word([0, 1, 2]);
      room.emit('word', {ok: true, word: 'AAA', points: 1, bonus: false});
      vi.advanceTimersByTime(200);
      game.word([1, 2, 3]);
      room.emit('state', {game: lettersGame(2, Date.now())});
      expect(game.snapshot.words).toEqual([]);
      expect(game.snapshot.word).toBeNull();
    });

    // a word from the round before, answered late, isn't this round's
    it('a word answer with nothing pending is ignored', () => {
      const { room, game } = playing();
      game.word([1, 2, 3]);
      room.emit('state', {game: lettersGame(2, Date.now())});
      room.emit('word', {ok: true, word: 'AAB', points: 1, bonus: false});
      expect(game.snapshot.words).toEqual([]);
      expect(game.snapshot.word).toBeNull();
    });

    it('a refused word is no banner', () => {
      const { room, game } = playing();
      game.word([2, 3, 7]);
      room.emit('error', {op: 'word', message: 'Too fast, slow down'});
      expect(game.snapshot.error).toBeNull();
    });

    it('a refused word leaves the queue: the next miss has its own path', () => {
      const { room, game } = playing();
      game.word([2, 3, 7]);
      room.emit('error', {op: 'word', message: 'Too fast, slow down'});
      vi.advanceTimersByTime(200);
      game.word([4, 5, 6]);
      room.emit('word', {ok: false, reason: 'not_word'});
      expect(game.snapshot.word?.path).toEqual([4, 5, 6]);
    });
  });

  // L4: the api's clock from pongs, the closest sample wins unless it can't agree with the one so far
  describe('clock skew', () => {
    it('the first pong sets the skew', () => {
      const { room, game } = joined();
      room.pong(Date.now() + 500 - 10, 20);
      expect(game.snapshot.skew).toBe(500);
    });

    it('a worse sample that agrees is left out', () => {
      const { room, game } = joined();
      room.pong(Date.now() + 500 - 10, 20);
      room.pong(Date.now() + 530 - 50, 100);
      expect(game.snapshot.skew).toBe(500);
    });

    it('a worse sample that cannot agree (the clock here changed) replaces it', () => {
      const { room, game } = joined();
      room.pong(Date.now() + 500 - 10, 20);
      room.pong(Date.now() + 60_500 - 50, 100);
      expect(game.snapshot.skew).toBe(60_500);
    });

    it('a closer sample after the change refines it again', () => {
      const { room, game } = joined();
      room.pong(Date.now() + 500 - 10, 20);
      room.pong(Date.now() + 60_500 - 50, 100);
      room.pong(Date.now() + 60_510 - 15, 30);
      expect(game.snapshot.skew).toBe(60_510);
    });
  });
});
