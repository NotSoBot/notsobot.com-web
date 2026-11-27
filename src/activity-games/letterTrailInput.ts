// Letter Trail's word being built, as one state (./LetterTrail's TrailPlay keeps it): what a pointer or a key does to it
// is all here, so the combinations nobody meant (a second finger taking over a drag, a tap elsewhere emptying a drag
// that's still going, a key in the middle of one) can't be reached. Pure: the screen sends what `send` says

import { findTrail, touching } from './letterTrailBoard';


export type Trail =
  // nothing lit
  | {kind: 'idle'}
  // tiles from a pointer, no finger down: tapped one by one, or a drag that was let go without sending
  | {kind: 'tapped', path: Array<number>}
  // a pointer down on the grid: which, whether it went on to another tile (a drag), whether it came down on the
  // trail's last tile (a tap there sends it)
  | {kind: 'dragging', path: Array<number>, pointerId: number, moved: boolean, onLast: boolean}
  // letters from a keyboard and their trail on the board, `path` empty when there's none (not on the board)
  | {kind: 'typed', letters: string, path: Array<number>};

export type TrailEvent =
  // a pointer on a tile of the grid: down, over another tile while down, let go, taken away by the browser
  | {type: 'down', tile: number, pointerId: number}
  | {type: 'move', tile: number, pointerId: number}
  | {type: 'up', pointerId: number}
  | {type: 'cancel', pointerId: number}
  // a pointer down anywhere but the grid and its buttons
  | {type: 'outsideTap'}
  // keys: a letter (lowercase), Backspace, Enter (the Send button too), Escape
  | {type: 'letter', letter: string}
  | {type: 'backspace'}
  | {type: 'enter'}
  | {type: 'escape'}
  // the button under the grid: a tapped trail's last tile off, anything else cleared
  | {type: 'back'}
  // the word went out (or was said to be a miss here): nothing's lit
  | {type: 'clear'}
  // nothing to play any more (the round's over, or they only watch)
  | {type: 'stop'};

// the board a trail is on: its tiles row by row and how many a side
export interface TrailBoard {
  board: ReadonlyArray<string>,
  size: number,
}

// the trail after an event, and the tiles to send as a word when it asks for one (the trail stays until the screen
// says it went, `clear`)
export interface TrailStep {
  trail: Trail,
  send: Array<number> | null,
}

export const IDLE_TRAIL: Trail = Object.freeze({kind: 'idle'});


export function trailPath(trail: Trail): Array<number> {
  return (trail.kind === 'idle') ? [] : trail.path;
}


// a trail with no pointer down: its tiles, or nothing lit when there are none
function settled(path: Array<number>): Trail {
  return (path.length) ? {kind: 'tapped', path} : IDLE_TRAIL;
}

function stay(trail: Trail): TrailStep {
  return {trail, send: null};
}


export function trailReduce(trail: Trail, event: TrailEvent, { board, size }: TrailBoard): TrailStep {
  switch (event.type) {
    case 'down': {
      // another finger while one's dragging does nothing until it's lifted and put down again. The same pointer down
      // twice is one whose `up` never came: it starts over from the trail
      if (trail.kind === 'dragging' && trail.pointerId !== event.pointerId) {
        return stay(trail);
      }
      // a typed word gives way to the pointer, its trail stays to go on from
      const current = trailPath(trail);
      const last = current[current.length - 1];
      const onLast = last === event.tile;
      const path = (onLast) ? current
        : (last !== undefined && !current.includes(event.tile) && touching(last, event.tile, size)) ? [...current, event.tile]
        : [event.tile];
      return stay({kind: 'dragging', path, pointerId: event.pointerId, moved: false, onLast});
    }
    case 'move': {
      if (trail.kind !== 'dragging' || trail.pointerId !== event.pointerId) {
        return stay(trail);
      }
      const current = trail.path;
      const last = current[current.length - 1];
      if (event.tile === last) {
        return stay(trail);
      }
      if (2 <= current.length && event.tile === current[current.length - 2]) {
        // back onto the tile before: that step's undone
        return stay({...trail, moved: true, path: current.slice(0, -1)});
      }
      if (last !== undefined && !current.includes(event.tile) && touching(last, event.tile, size)) {
        return stay({...trail, moved: true, path: [...current, event.tile]});
      }
      return stay(trail);
    }
    case 'up': {
      if (trail.kind !== 'dragging' || trail.pointerId !== event.pointerId) {
        return stay(trail);
      }
      // a drag sends as it's let go, and so does a tap on a trail's last tile. One tile isn't a word: a drag back to
      // where it started is nothing, the trail's only tile tapped again lets go of it
      if (trail.moved || trail.onLast) {
        return (trail.path.length <= 1) ? stay(IDLE_TRAIL) : {trail: settled(trail.path), send: trail.path};
      }
      return stay(settled(trail.path));
    }
    case 'cancel': {
      // the browser took the pointer (a system gesture, a call): what's lit stays, to send with a tap or go on from
      if (trail.kind !== 'dragging' || trail.pointerId !== event.pointerId) {
        return stay(trail);
      }
      return stay(settled(trail.path));
    }
    case 'outsideTap':
    case 'escape': {
      // not in the middle of a drag: its finger would go on dragging nothing
      return stay((trail.kind === 'dragging') ? trail : IDLE_TRAIL);
    }
    case 'letter': {
      if (trail.kind === 'dragging') {
        return stay(trail);
      }
      // each letter finds the word so far on the board, keeping the trail shown when it still fits. Tiles from a
      // pointer aren't letters typed: the word starts over, on them when it can
      const letters = ((trail.kind === 'typed') ? trail.letters : '') + event.letter;
      return stay({kind: 'typed', letters, path: findTrail(board, size, letters, trailPath(trail)) ?? []});
    }
    case 'backspace': {
      if (trail.kind === 'typed') {
        const letters = trail.letters.slice(0, -1);
        return stay((letters) ? {kind: 'typed', letters, path: findTrail(board, size, letters, trail.path) ?? []} : IDLE_TRAIL);
      }
      return stay((trail.kind === 'tapped') ? settled(trail.path.slice(0, -1)) : trail);
    }
    case 'enter': {
      // typed letters that aren't on the board have no tiles to send, the screen says so
      if ((trail.kind === 'tapped' || trail.kind === 'typed') && trail.path.length) {
        return {trail, send: trail.path};
      }
      return stay(trail);
    }
    case 'back': {
      if (trail.kind === 'dragging') {
        return stay(trail);
      }
      return stay((trail.kind === 'tapped' && 1 < trail.path.length) ? {kind: 'tapped', path: trail.path.slice(0, -1)} : IDLE_TRAIL);
    }
    case 'clear':
    case 'stop': {
      return stay(IDLE_TRAIL);
    }
    default: {
      const unknown: never = event;
      return stay(unknown);
    }
  }
}
