import type { GameSnapshot } from './connection';
import type { GameRound, GameState } from './protocol';


// What a Flag Guesser round shows under its hints (./Round.tsx). Its own file so it can be tested without the round's
// screen, and so Round.tsx exports only components (React Fast Refresh)


// what's under the hints, the one place that says which: a watcher's panel, nothing yet (the start countdown, or the
// flag still to come), the four choices (picked or not), or the guess box (until they've solved it)
export type AnswerState =
  | {kind: 'watching'}
  | {kind: 'countdown'}
  | {kind: 'waiting_flag'}
  | {kind: 'choosing', choices: Array<string>}
  | {kind: 'chosen', choices: Array<string>}
  | {kind: 'typing', flagUrl: string}
  | {kind: 'solved', flagUrl: string};

export function answerState(game: GameState, round: GameRound, snapshot: GameSnapshot, countdown: number): AnswerState {
  if (game.you_watch) {
    return {kind: 'watching'};
  }
  if (countdown) {
    return {kind: 'countdown'};
  }
  if (!round.flag_url) {
    return {kind: 'waiting_flag'};
  }
  if (round.choices) {
    return {kind: (snapshot.chosen !== null) ? 'chosen' : 'choosing', choices: round.choices};
  }
  const solved = Boolean(snapshot.you && round.solved.includes(snapshot.you));
  return {kind: (solved) ? 'solved' : 'typing', flagUrl: round.flag_url};
}
