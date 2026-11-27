import { useEffect, useState } from 'react';

import type { GameKind } from './protocol';
import type { GameRoomsApi } from './rooms';


// Game points (game-points-plan.md): one total per user across every game, a game's own score counts 1:1, at most
// DAILY_POINTS_CAP a game each UTC day. The Games tab shows yours and this server's board (`GET
// /activity/games/<instance_id>/points`), a finished game says what it added (`awarded`, `game.awarded`)

// the api's daily cap, per user per game
export const DAILY_POINTS_CAP = 300;

// what a game's score is worth in game points, before the daily cap: Flag Guesser's 1:1, Letter Trail's a quarter
// rounded up (its scores run ~4x for the same time, word-game-plan.md "Scoring")
export function gamePointsFor(game: GameKind, score: number): number {
  return (game === 'letter_trail') ? Math.ceil(score / 4) : score;
}
// the board's rows on the Games tab (the api sends the top 10)
export const BOARD_SHOWN = 5;

export type PointsPeriod = 'all' | 'week';

export interface GamePointsUser {
  user_id: string,
  total: number,
  // per game key (`flag_guesser`)
  games: Record<string, number>,
  week: number,
  // null with 0 points, `guild` null outside a server, `global` null while they're `hidden`
  rank: {global: number | null, guild: number | null},
  // they hid from the global boards (their settings' `game_points_hidden`), servers' boards still show them
  hidden: boolean,
  // their record and stats in each game (game-stats-plan.md "Game stats"), every game there (zeros, `stats: {}`, before
  // their first)
  stats: GameStatsByGame,
}

// a game's own stats, summed or best of across their recorded games. Missing until a game sets one
export interface FlagGuesserStats {
  // the game's own score, not game points
  best_score: number,
  // right answers
  named: number,
  // first to name the flag
  firsts: number,
  // longest run of flags named in one game
  best_streak: number,
  // quickest right answer from the flag showing
  fastest_ms: number,
}

export interface LetterTrailStats {
  best_score: number,
  words: number,
  // words only they found (rooms of 2+)
  only_you: number,
  longest_word: string,
}

export interface GameStatsEntry<Stats extends object = Record<string, number | string>> {
  // every recorded game, solo ones too
  games: number,
  wins: number,
  losses: number,
  ties: number,
  left: number,
  solo: number,
  win_streak: number,
  best_win_streak: number,
  stats: Partial<Stats>,
}

export interface GameStatsByGame {
  flag_guesser: GameStatsEntry<FlagGuesserStats>,
  letter_trail: GameStatsEntry<LetterTrailStats>,
}

export interface GamePointsBoardItem {
  rank: number,
  user_id: string,
  username: string,
  avatar_url: string | null,
  points: number,
}

export interface GamePointsBoard {
  // a dm's Activity gets the global board
  scope: 'global' | 'guild',
  period: PointsPeriod,
  game: string | null,
  items: Array<GamePointsBoardItem>,
}

export interface ActivityGamePoints {
  you: GamePointsUser,
  board: GamePointsBoard,
  week_board: GamePointsBoard,
}


// a game of theirs ended with points: whatever shows them fetches again
const awardListeners = new Set<() => void>();

export function onPointsAwarded(listener: () => void): () => void {
  awardListeners.add(listener);
  return () => {
    awardListeners.delete(listener);
  };
}

export function pointsAwarded(): void {
  for (const listener of awardListeners) {
    listener();
  }
}


// the last answer per api, so coming back to the Games tab shows the numbers it had while it fetches again
const lastPoints = new WeakMap<GameRoomsApi, ActivityGamePoints>();

// yours and the board, null until the first fetch answers (or the last one's, see above). `failed`: no answer to show
export function useGamePoints(api: GameRoomsApi): {points: ActivityGamePoints | null, failed: boolean} {
  const [ points, setPoints ] = useState<ActivityGamePoints | null>(() => lastPoints.get(api) ?? null);
  const [ failed, setFailed ] = useState(false);
  useEffect(() => {
    let alive = true;
    // the fetch asked last: an older one answering after it (it was slow) would put its older numbers back
    let latest = 0;
    const refresh = () => {
      const asked = ++latest;
      api.points().then((result) => {
        if (asked !== latest) {
          return;
        }
        lastPoints.set(api, result);
        if (alive) {
          setPoints(result);
          setFailed(false);
        }
      }).catch(() => {
        if (alive && asked === latest) {
          setFailed(true);
        }
      });
    };
    setPoints(lastPoints.get(api) ?? null);
    refresh();
    const unsubscribe = onPointsAwarded(refresh);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [api]);
  return {points, failed};
}
