// Play solo's settings: the last ones a viewer played alone with, per game, kept in this browser (local storage) and sent
// when they make their next solo room of that game. Anything stored that the api wouldn't take falls back to the default
// for that setting
import {
  DEFAULT_SETTINGS,
  GAME_DIFFICULTIES,
  GAME_MODES,
  LETTER_TRAIL_DEFAULT_SETTINGS,
  LETTER_TRAIL_ROUNDS_MAX,
  LETTER_TRAIL_ROUNDS_MIN,
  LETTER_TRAIL_SECONDS,
  LETTER_TRAIL_SIZES,
  ROUNDS_MAX,
  ROUNDS_MIN,
  SECONDS_MAX,
  SECONDS_MIN,
  type AnyGameSettings,
  type GameKind,
  type GameSettings,
  type LetterTrailSettings,
} from './protocol';


// Flag Guesser's key from before there were other games, the others' after it. Letter Trail's is its second: every solo
// game is stored (not only ones whose settings were changed), so the first key held the 3 rounds Letter Trail started
// with and kept solo games at 3 after the default went to 1
const SOLO_SETTINGS_KEY = 'nsb.activity.games.solo_settings';

function storageKey(game: GameKind): string {
  return (game === 'flag_guesser') ? SOLO_SETTINGS_KEY : `${SOLO_SETTINGS_KEY}.${game}.2`;
}


function whole(value: unknown, min: number, max: number, fallback: number): number {
  return (typeof value === 'number' && Number.isInteger(value) && min <= value && value <= max) ? value : fallback;
}

function oneOf<T>(value: unknown, options: ReadonlyArray<T>, fallback: T): T {
  return ((options as ReadonlyArray<unknown>).includes(value)) ? value as T : fallback;
}


function readStored(game: GameKind): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(storageKey(game));
    const parsed: unknown = (raw) ? JSON.parse(raw) : null;
    return (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : null;
  } catch {
    // private windows, blocked storage or something unreadable: the defaults
    return null;
  }
}


export function storedSoloSettings(game: 'letter_trail'): LetterTrailSettings;
export function storedSoloSettings(game?: 'flag_guesser'): GameSettings;
export function storedSoloSettings(game?: GameKind): AnyGameSettings;
export function storedSoloSettings(game: GameKind = 'flag_guesser'): AnyGameSettings {
  const stored = readStored(game);
  if (game === 'letter_trail') {
    const defaults = LETTER_TRAIL_DEFAULT_SETTINGS;
    return {
      size: oneOf(stored?.size, LETTER_TRAIL_SIZES, defaults.size),
      seconds: oneOf(stored?.seconds, LETTER_TRAIL_SECONDS, defaults.seconds),
      rounds: whole(stored?.rounds, LETTER_TRAIL_ROUNDS_MIN, LETTER_TRAIL_ROUNDS_MAX, defaults.rounds),
    };
  }
  if (!stored) {
    return {...DEFAULT_SETTINGS};
  }
  return {
    mode: oneOf(stored.mode, GAME_MODES, DEFAULT_SETTINGS.mode),
    rounds: whole(stored.rounds, ROUNDS_MIN, ROUNDS_MAX, DEFAULT_SETTINGS.rounds),
    difficulty: oneOf(stored.difficulty, GAME_DIFFICULTIES, DEFAULT_SETTINGS.difficulty),
    seconds: whole(stored.seconds, SECONDS_MIN, SECONDS_MAX, DEFAULT_SETTINGS.seconds),
  };
}


export function storeSoloSettings(game: GameKind, settings: AnyGameSettings): void {
  const kept = ('size' in settings)
    ? {size: settings.size, seconds: settings.seconds, rounds: settings.rounds}
    : {mode: settings.mode, rounds: settings.rounds, difficulty: settings.difficulty, seconds: settings.seconds};
  try {
    window.localStorage.setItem(storageKey(game), JSON.stringify(kept));
  } catch {
    // blocked storage: the next solo game starts on the defaults
  }
}
