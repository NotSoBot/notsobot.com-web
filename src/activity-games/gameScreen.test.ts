import { describe, expect, it } from 'vitest';

import type { GameSnapshot } from './connection';
import { closeOutcome, screenOf } from './gameScreen';
import {
  DEFAULT_SETTINGS,
  GameCloseCodes,
  LETTER_TRAIL_DEFAULT_SETTINGS,
  type GamePlayer,
  type GameReveal,
  type GameRoomInfo,
  type GameRound,
  type GameState,
  type LetterTrailReveal,
  type LetterTrailRound,
  type LetterTrailState,
} from './protocol';


const YOU = '300000000000000001';
const BOT = '300000000000000002';
const NOW = 1_800_000_000_000;

const player = (user_id: string, username: string): GamePlayer => ({user_id, username, avatar_url: null, score: 0, streak: 0, connected: true, outcome: null});

const room = (game: GameRoomInfo['game']): GameRoomInfo => ({
  name: 'Dev room',
  creator: {user_id: BOT, username: 'bot', avatar_url: null},
  locked: false,
  watch_only: false,
  game,
  visibility: 'server',
  origin: null,
  solo: false,
});

const flagRound = (): GameRound => ({
  number: 1,
  total: 10,
  flag_url: '/activity/games/room1/flag/abc',
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
});

const flagReveal = (): GameReveal => ({name: 'France', code: 'fr', solved: [], ends_at: NOW + 5000, until: NOW + 5000});

const letterRound = (): LetterTrailRound => ({
  number: 1,
  total: 1,
  size: 4,
  board: ['C', 'A', 'T', 'S', 'O', 'R', 'E', 'D', 'Qu', 'U', 'I', 'Z', 'L', 'M', 'N', 'P'],
  bonus: 5,
  started_at: NOW,
  ends_at: NOW + 80_000,
  counts: {},
});

const letterReveal = (): LetterTrailReveal => ({ends_at: NOW + 10_000, until: NOW + 10_000, players: [], missed: ['DOTS'], total_words: 40});

const flagGame = (changes: Partial<GameState> = {}): GameState => ({
  id: 'room1',
  room: room('flag_guesser'),
  watchers: [],
  you_watch: false,
  can_play: true,
  phase: 'lobby',
  host_id: BOT,
  settings: {...DEFAULT_SETTINGS},
  players: [player(BOT, 'bot'), player(YOU, 'you')],
  round: null,
  reveal: null,
  standings: null,
  ...changes,
});

const letterGame = (changes: Partial<LetterTrailState> = {}): LetterTrailState => ({
  id: 'room2',
  room: room('letter_trail'),
  watchers: [],
  you_watch: false,
  can_play: true,
  phase: 'lobby',
  host_id: BOT,
  settings: {...LETTER_TRAIL_DEFAULT_SETTINGS},
  players: [player(BOT, 'bot'), player(YOU, 'you')],
  round: null,
  reveal: null,
  standings: null,
  ...changes,
});

const snapshot = (game: GameSnapshot['game'], changes: Partial<GameSnapshot> = {}): GameSnapshot => ({
  status: (game) ? 'open' : 'connecting',
  closeCode: null,
  you: YOU,
  moderator: false,
  game,
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

const finishedStandings = [{user_id: YOU, score: 30, awarded: 30}, {user_id: BOT, score: 10, awarded: null}];


describe('screenOf', () => {
  describe('before the first state', () => {
    it('a snapshot with no game yet is joining', () => {
      expect(screenOf(snapshot(null))).toEqual({kind: 'joining'});
    });

    it('a join that is slow or reconnecting is still joining until a game comes', () => {
      expect(screenOf(snapshot(null, {status: 'reconnecting', slowJoin: true}))).toEqual({kind: 'joining'});
    });
  });

  describe('Flag Guesser', () => {
    it('a lobby state is the lobby', () => {
      const game = flagGame();
      expect(screenOf(snapshot(game))).toEqual({kind: 'lobby', game});
    });

    it('a round state with its round is the flag round', () => {
      const round = flagRound();
      const game = flagGame({phase: 'round', round});
      expect(screenOf(snapshot(game))).toEqual({kind: 'flag_round', game, round});
    });

    it('a round still in its start countdown (no flag yet) is the flag round', () => {
      const round = {...flagRound(), flag_url: null, started_at: NOW + 3000};
      const game = flagGame({phase: 'round', round});
      expect(screenOf(snapshot(game))).toEqual({kind: 'flag_round', game, round});
    });

    it('a round state that came without its round is waiting', () => {
      expect(screenOf(snapshot(flagGame({phase: 'round', round: null})))).toEqual({kind: 'waiting'});
    });

    it('a reveal state with its reveal is the flag reveal', () => {
      const reveal = flagReveal();
      const game = flagGame({phase: 'reveal', round: flagRound(), reveal});
      expect(screenOf(snapshot(game))).toEqual({kind: 'flag_reveal', game, reveal});
    });

    it('a reveal state that came without its reveal is waiting', () => {
      expect(screenOf(snapshot(flagGame({phase: 'reveal', round: flagRound(), reveal: null})))).toEqual({kind: 'waiting'});
    });

    it('a finished state is the final scores', () => {
      const game = flagGame({phase: 'finished', standings: finishedStandings});
      expect(screenOf(snapshot(game))).toEqual({kind: 'finished', game});
    });
  });

  describe('Letter Trail', () => {
    it('a lobby state is the lobby', () => {
      const game = letterGame();
      expect(screenOf(snapshot(game))).toEqual({kind: 'lobby', game});
    });

    it('a round state with its round is the letters round', () => {
      const round = letterRound();
      const game = letterGame({phase: 'round', round});
      expect(screenOf(snapshot(game))).toEqual({kind: 'letters_round', game, round});
    });

    it('a round still in its start countdown (no board yet) is the letters round', () => {
      const round = {...letterRound(), board: null, bonus: null, started_at: NOW + 3000};
      const game = letterGame({phase: 'round', round});
      expect(screenOf(snapshot(game))).toEqual({kind: 'letters_round', game, round});
    });

    it('a round state that came without its round is waiting', () => {
      expect(screenOf(snapshot(letterGame({phase: 'round', round: null})))).toEqual({kind: 'waiting'});
    });

    it('a reveal state with its reveal is the letters reveal', () => {
      const reveal = letterReveal();
      const game = letterGame({phase: 'reveal', round: letterRound(), reveal});
      expect(screenOf(snapshot(game))).toEqual({kind: 'letters_reveal', game, reveal});
    });

    it('a reveal state that came without its reveal is waiting', () => {
      expect(screenOf(snapshot(letterGame({phase: 'reveal', round: letterRound(), reveal: null})))).toEqual({kind: 'waiting'});
    });

    it('a finished state is the final scores', () => {
      const game = letterGame({phase: 'finished', standings: finishedStandings});
      expect(screenOf(snapshot(game))).toEqual({kind: 'finished', game});
    });
  });

  describe('a watcher', () => {
    const watching = {you_watch: true, can_play: false, players: [player(BOT, 'bot')], watchers: [{user_id: YOU, username: 'you', avatar_url: null}]};

    it('sees a Flag Guesser round on the same screen as a player', () => {
      const round = flagRound();
      const game = flagGame({...watching, phase: 'round', round});
      expect(screenOf(snapshot(game))).toEqual({kind: 'flag_round', game, round});
    });

    it('sees a Letter Trail reveal on the same screen as a player', () => {
      const reveal = letterReveal();
      const game = letterGame({...watching, phase: 'reveal', round: letterRound(), reveal});
      expect(screenOf(snapshot(game))).toEqual({kind: 'letters_reveal', game, reveal});
    });

    it('sees the lobby while the game waits to start', () => {
      const game = flagGame({...watching});
      expect(screenOf(snapshot(game))).toEqual({kind: 'lobby', game});
    });
  });

  it('a game kept on screen while the socket reconnects is still on its phase\'s screen', () => {
    const round = flagRound();
    const game = flagGame({phase: 'round', round});
    expect(screenOf(snapshot(game, {status: 'reconnecting'}))).toEqual({kind: 'flag_round', game, round});
  });
});


describe('closeOutcome', () => {
  it.each<[string, number, ReturnType<typeof closeOutcome>]>([
    ['KICKED', GameCloseCodes.KICKED, {kind: 'leave', message: 'games.rooms.kicked'}],
    ['LOCKED', GameCloseCodes.LOCKED, {kind: 'leave', message: 'games.rooms.locked_out'}],
    ['ROOM_GONE', GameCloseCodes.ROOM_GONE, {kind: 'leave', message: 'games.rooms.closed'}],
    ['FULL', GameCloseCodes.FULL, {kind: 'leave', message: 'games.rooms.full'}],
    ['UNAUTHORIZED', GameCloseCodes.UNAUTHORIZED, {kind: 'stay', message: 'games.flag.denied_token'}],
    ['FORBIDDEN', GameCloseCodes.FORBIDDEN, {kind: 'stay', message: 'games.flag.denied'}],
    ['UNKNOWN_INSTANCE', GameCloseCodes.UNKNOWN_INSTANCE, {kind: 'stay', message: 'games.flag.denied'}],
  ])('%s (%i) gives %j', (_name, code, outcome) => {
    expect(closeOutcome(code)).toEqual(outcome);
  });

  it('covers every code in GameCloseCodes in the table above', () => {
    // a code added to GameCloseCodes gets a row above (and a decision in closeOutcome)
    expect(Object.keys(GameCloseCodes).sort()).toEqual(['FORBIDDEN', 'FULL', 'KICKED', 'LOCKED', 'ROOM_GONE', 'UNAUTHORIZED', 'UNKNOWN_INSTANCE']);
  });

  it('an unknown code stays on the screen with the generic denied message', () => {
    expect(closeOutcome(4999)).toEqual({kind: 'stay', message: 'games.flag.denied'});
  });

  it('no code at all stays on the screen with the generic denied message', () => {
    expect(closeOutcome(null)).toEqual({kind: 'stay', message: 'games.flag.denied'});
  });

  it('only removal, a password change, a closed room and a full room go back to the room list', () => {
    const leaving = Object.entries(GameCloseCodes).filter(([ , code ]) => closeOutcome(code).kind === 'leave').map(([ name ]) => name).sort();
    expect(leaving).toEqual(['FULL', 'KICKED', 'LOCKED', 'ROOM_GONE']);
  });
});
