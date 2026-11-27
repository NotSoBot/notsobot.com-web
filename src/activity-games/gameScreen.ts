import type { TranslationKey } from '@/i18n';

import type { GameSnapshot } from './connection';
import { GameCloseCodes, isLetterTrail, type AnyGameState, type GameState, type LetterTrailState } from './protocol';


// Which screen a game room shows (./FlagGame.tsx): the one its snapshot is on, and what a game that ended for good does.
// Its own file so it can be tested without the screens, and so FlagGame.tsx exports only components (React Fast Refresh)


// what a game that ended for good (`game.closed`'s code) does, the one table for it: removed, closed, its password
// changed or no seat left go back to the room list saying why (`leave`), anything else stays on its own screen (`stay`)
export type CloseOutcome = {kind: 'leave', message: TranslationKey} | {kind: 'stay', message: TranslationKey};

export function closeOutcome(closeCode: number | null): CloseOutcome {
  switch (closeCode) {
    case GameCloseCodes.KICKED: return {kind: 'leave', message: 'games.rooms.kicked'};
    case GameCloseCodes.LOCKED: return {kind: 'leave', message: 'games.rooms.locked_out'};
    case GameCloseCodes.ROOM_GONE: return {kind: 'leave', message: 'games.rooms.closed'};
    case GameCloseCodes.FULL: return {kind: 'leave', message: 'games.rooms.full'};
    case GameCloseCodes.UNAUTHORIZED: return {kind: 'stay', message: 'games.flag.denied_token'};
    default: return {kind: 'stay', message: 'games.flag.denied'};
  }
}


// which screen a room's snapshot is on: joining until its first state, then its phase's (a round and a reveal are
// their game's). `waiting`: a round or reveal phase whose state came without its round or reveal, nothing to show
// until the next state says
export type GameScreen =
  | {kind: 'joining'}
  | {kind: 'lobby', game: AnyGameState}
  | {kind: 'flag_round', game: GameState, round: NonNullable<GameState['round']>}
  | {kind: 'flag_reveal', game: GameState, reveal: NonNullable<GameState['reveal']>}
  | {kind: 'letters_round', game: LetterTrailState, round: NonNullable<LetterTrailState['round']>}
  | {kind: 'letters_reveal', game: LetterTrailState, reveal: NonNullable<LetterTrailState['reveal']>}
  | {kind: 'finished', game: AnyGameState}
  | {kind: 'waiting'};

export function screenOf(snapshot: GameSnapshot): GameScreen {
  const game = snapshot.game;
  if (!game) {
    return {kind: 'joining'};
  }
  const phase = game.phase;
  switch (phase) {
    case 'lobby':
      return {kind: 'lobby', game};
    case 'round':
      if (isLetterTrail(game)) {
        return (game.round) ? {kind: 'letters_round', game, round: game.round} : {kind: 'waiting'};
      }
      return (game.round) ? {kind: 'flag_round', game, round: game.round} : {kind: 'waiting'};
    case 'reveal':
      if (isLetterTrail(game)) {
        return (game.reveal) ? {kind: 'letters_reveal', game, reveal: game.reveal} : {kind: 'waiting'};
      }
      return (game.reveal) ? {kind: 'flag_reveal', game, reveal: game.reveal} : {kind: 'waiting'};
    case 'finished':
      return {kind: 'finished', game};
    default: {
      // a phase added to GamePhase has to get a screen here: this stops compiling until it does
      const unknown: never = phase;
      return unknown;
    }
  }
}
