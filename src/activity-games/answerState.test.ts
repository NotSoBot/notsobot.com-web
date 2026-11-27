import { describe, expect, it } from 'vitest';

import { answerState, type AnswerState } from './answerState';
import type { GameSnapshot } from './connection';
import { DEFAULT_SETTINGS, type GamePlayer, type GameRound, type GameState } from './protocol';


const YOU = '300000000000000001';
const BOT = '300000000000000002';
const NOW = 1_800_000_000_000;
const FLAG = '/activity/games/room1/flag/abc';
const CHOICES = ['France', 'Belgium', 'Italy', 'Chad'];

const player = (user_id: string, username: string): GamePlayer => ({user_id, username, avatar_url: null, score: 0, streak: 0, connected: true, outcome: null});

const round = (changes: Partial<GameRound> = {}): GameRound => ({
  number: 1,
  total: 10,
  flag_url: FLAG,
  started_at: NOW,
  ends_at: NOW + 20_000,
  hint: null,
  choices: null,
  solved: [],
  answered: 0,
  answered_by: [],
  you_solved: false,
  you_answered: false,
  your_choice: null,
  ...changes,
});

const game = (changes: Partial<GameState> = {}): GameState => ({
  id: 'room1',
  room: {
    name: 'Dev flag room',
    creator: {user_id: BOT, username: 'bot', avatar_url: null},
    locked: false,
    watch_only: false,
    game: 'flag_guesser',
    visibility: 'server',
    origin: null,
    solo: false,
  },
  watchers: [],
  you_watch: false,
  can_play: true,
  phase: 'round',
  host_id: BOT,
  settings: {...DEFAULT_SETTINGS},
  players: [player(BOT, 'bot'), player(YOU, 'you')],
  round: null,
  reveal: null,
  standings: null,
  ...changes,
});

const snapshot = (changes: Partial<GameSnapshot> = {}): GameSnapshot => ({
  status: 'open',
  closeCode: null,
  you: YOU,
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
  pendingOp: null,
  slowJoin: false,
  socketClose: null,
  awards: null,
  ...changes,
});


describe('answerState', () => {
  describe('one rule each', () => {
    it('a watcher gets the watching panel', () => {
      expect(answerState(game({you_watch: true}), round(), snapshot(), 0)).toEqual({kind: 'watching'});
    });

    it('a watcher gets the watching panel during the start countdown too', () => {
      expect(answerState(game({you_watch: true}), round({flag_url: null}), snapshot(), 3)).toEqual({kind: 'watching'});
    });

    it('a player during the start countdown gets nothing to answer', () => {
      expect(answerState(game(), round({flag_url: null}), snapshot(), 3)).toEqual({kind: 'countdown'});
    });

    it('a player whose clock is still counting down gets the countdown even if the flag already came', () => {
      expect(answerState(game(), round(), snapshot(), 1)).toEqual({kind: 'countdown'});
    });

    it('a player after the countdown with no flag yet waits for it', () => {
      expect(answerState(game(), round({flag_url: null}), snapshot(), 0)).toEqual({kind: 'waiting_flag'});
    });

    it('a player in choices mode who has not picked gets the four choices to pick from', () => {
      expect(answerState(game(), round({choices: CHOICES}), snapshot(), 0)).toEqual({kind: 'choosing', choices: CHOICES});
    });

    it('a player in choices mode who picked gets the choices with theirs picked', () => {
      expect(answerState(game(), round({choices: CHOICES}), snapshot({chosen: 2}), 0)).toEqual({kind: 'chosen', choices: CHOICES});
    });

    it('a pick of the first choice (index 0) counts as picked', () => {
      expect(answerState(game(), round({choices: CHOICES}), snapshot({chosen: 0}), 0).kind).toBe('chosen');
    });

    it('a player in choices mode who picked stays chosen whether or not they are in the solved list', () => {
      expect(answerState(game(), round({choices: CHOICES, solved: [YOU]}), snapshot({chosen: 1}), 0).kind).toBe('chosen');
    });

    it('a player in type mode who has not solved it gets the guess box for this flag', () => {
      expect(answerState(game(), round({solved: [BOT]}), snapshot(), 0)).toEqual({kind: 'typing', flagUrl: FLAG});
    });

    it('a player in type mode who solved it gets the solved box for this flag', () => {
      expect(answerState(game(), round({solved: [BOT, YOU]}), snapshot(), 0)).toEqual({kind: 'solved', flagUrl: FLAG});
    });

    it('someone the socket has not named yet (no `you`) is never solved', () => {
      expect(answerState(game(), round({solved: [BOT, YOU]}), snapshot({you: null}), 0)).toEqual({kind: 'typing', flagUrl: FLAG});
    });
  });

  // every combination the inputs allow: watching or not, counting down or not, the flag or not, choices or typed, picked
  // or not, in the solved list or not, `you` known or not
  describe('every combination', () => {
    const bools = [false, true];
    const rows: Array<{watch: boolean, countdown: number, flag: boolean, choices: boolean, chosen: boolean, solved: boolean, youKnown: boolean}> = [];
    for (const watch of bools) {
      for (const countdown of [0, 2]) {
        for (const flag of bools) {
          for (const choices of bools) {
            for (const chosen of bools) {
              for (const solved of bools) {
                for (const youKnown of bools) {
                  rows.push({watch, countdown, flag, choices, chosen, solved, youKnown});
                }
              }
            }
          }
        }
      }
    }

    // the order the screen decides in, top first
    const expected = (row: typeof rows[number]): AnswerState => {
      if (row.watch) {
        return {kind: 'watching'};
      }
      if (row.countdown) {
        return {kind: 'countdown'};
      }
      if (!row.flag) {
        return {kind: 'waiting_flag'};
      }
      if (row.choices) {
        return {kind: (row.chosen) ? 'chosen' : 'choosing', choices: CHOICES};
      }
      return {kind: (row.solved && row.youKnown) ? 'solved' : 'typing', flagUrl: FLAG};
    };

    it.each(rows)('watch=$watch countdown=$countdown flag=$flag choices=$choices chosen=$chosen solved=$solved you=$youKnown', (row) => {
      const result = answerState(
        game({you_watch: row.watch}),
        round({flag_url: (row.flag) ? FLAG : null, choices: (row.choices) ? CHOICES : null, solved: (row.solved) ? [YOU] : []}),
        snapshot({chosen: (row.chosen) ? 0 : null, you: (row.youKnown) ? YOU : null}),
        row.countdown,
      );
      expect(result).toEqual(expected(row));
    });
  });
});
