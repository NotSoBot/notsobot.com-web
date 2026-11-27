// Letter Trail's board on this side (word-game-plan.md "Build contract"): which tiles touch, the word a trail spells, what
// it's worth, and a trail for typed letters. Only for the screen's feel (the api checks every word itself)

import { LETTER_TRAIL_MIN_LETTERS, LETTER_TRAIL_POINTS } from './protocol';


// a tile's letters as words have them: `Qu` is one tile, two letters
export function tileLetters(tile: string): string {
  return tile.toLowerCase();
}

// the tile's face: one letter, or `Qu`
export function tileFace(tile: string): string {
  const letters = tileLetters(tile);
  return (letters.length > 1) ? letters.charAt(0).toUpperCase() + letters.slice(1) : letters.toUpperCase();
}


// two tiles touch: side by side or corner to corner
export function touching(a: number, b: number, size: number): boolean {
  if (a === b) {
    return false;
  }
  return Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1 && Math.abs((a % size) - (b % size)) <= 1;
}


export function wordOf(board: ReadonlyArray<string>, path: ReadonlyArray<number>): string {
  return path.map((index) => tileLetters(board[index] ?? '')).join('');
}


// what a word is worth before the x2 tile and "only you": by its letters, 8 or more all the same
export function wordPoints(letters: number): number {
  let points = 0;
  for (const step of LETTER_TRAIL_POINTS) {
    if (step.letters <= letters) {
      points = step.points;
    }
  }
  return points;
}

export function longEnough(word: string): boolean {
  return LETTER_TRAIL_MIN_LETTERS <= word.length;
}


// A trail on the board that spells `typed` (lowercase letters), each tile once and every step touching, or null when
// there's none. `prefer`: the trail shown so far, tried first so a letter more doesn't move what's lit to another spot.
// A `Qu` tile takes `qu`, or a last `q` while they're still typing it
export function findTrail(board: ReadonlyArray<string>, size: number, typed: string, prefer: ReadonlyArray<number> = []): Array<number> | null {
  if (!typed) {
    return null;
  }
  const faces = board.map(tileLetters);
  const used = new Array<boolean>(board.length).fill(false);
  const trail: Array<number> = [];

  const candidates = (depth: number, from: number | null): Array<number> => {
    const all: Array<number> = [];
    for (let index = 0; index < faces.length; index++) {
      if (!used[index] && (from === null || touching(from, index, size))) {
        all.push(index);
      }
    }
    const preferred = prefer[depth];
    if (preferred !== undefined && all.includes(preferred)) {
      return [preferred, ...all.filter((index) => index !== preferred)];
    }
    return all;
  };

  const search = (position: number, depth: number): boolean => {
    if (position >= typed.length) {
      return true;
    }
    const from = (trail.length) ? trail[trail.length - 1] : null;
    for (const index of candidates(depth, from)) {
      const face = faces[index];
      let taken = 0;
      if (face && typed.startsWith(face, position)) {
        taken = face.length;
      } else if (face === 'qu' && position === typed.length - 1 && typed.charAt(position) === 'q') {
        taken = 1;
      }
      if (!taken) {
        continue;
      }
      used[index] = true;
      trail.push(index);
      if (search(position + taken, depth + 1)) {
        return true;
      }
      trail.pop();
      used[index] = false;
    }
    return false;
  };

  return (search(0, 0)) ? [...trail] : null;
}
