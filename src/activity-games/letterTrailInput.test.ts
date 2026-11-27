import { describe, expect, it } from 'vitest';

import { IDLE_TRAIL, trailPath, trailReduce, type Trail, type TrailEvent } from './letterTrailInput';


// 4x4:  c a t s / o r e d / q u i z / l m n p   ('Qu' is one tile at 8)
const board = ['C', 'A', 'T', 'S', 'O', 'R', 'E', 'D', 'Qu', 'U', 'I', 'Z', 'L', 'M', 'N', 'P'];
const grid = {board, size: 4};

// runs events from a trail, collecting every send
function run(start: Trail, events: Array<TrailEvent>): {trail: Trail, sends: Array<Array<number>>} {
  let trail = start;
  const sends: Array<Array<number>> = [];
  for (const event of events) {
    const step = trailReduce(trail, event, grid);
    trail = step.trail;
    if (step.send) {
      sends.push(step.send);
    }
  }
  return {trail, sends};
}

const down = (tile: number, pointerId = 1): TrailEvent => ({type: 'down', tile, pointerId});
const move = (tile: number, pointerId = 1): TrailEvent => ({type: 'move', tile, pointerId});
const up = (pointerId = 1): TrailEvent => ({type: 'up', pointerId});
const cancel = (pointerId = 1): TrailEvent => ({type: 'cancel', pointerId});
const letter = (value: string): TrailEvent => ({type: 'letter', letter: value});


describe('trailReduce', () => {
  describe('dragging', () => {
    // plain drag: c-a-t let go sends it, the trail stays tapped until the screen clears it
    it('a drag sends its tiles as it is let go', () => {
      expect(run(IDLE_TRAIL, [down(0), move(1), move(2), up()]).sends).toEqual([[0, 1, 2]]);
    });

    it('a drag that sent leaves the trail tapped until the screen clears it', () => {
      expect(run(IDLE_TRAIL, [down(0), move(1), move(2), up()]).trail).toEqual({kind: 'tapped', path: [0, 1, 2]});
    });

    it('a clear after a send is idle', () => {
      const sent = run(IDLE_TRAIL, [down(0), move(1), move(2), up()]).trail;
      expect(run(sent, [{type: 'clear'}]).trail).toBe(IDLE_TRAIL);
    });

    // drag back onto the tile before undoes it, back to the start is nothing
    it('dragging back onto the tile before undoes that step', () => {
      expect(trailPath(run(IDLE_TRAIL, [down(0), move(1), move(2), move(1)]).trail)).toEqual([0, 1]);
    });

    it('dragging back to the start and letting go sends nothing and is idle', () => {
      const result = run(IDLE_TRAIL, [down(0), move(1), move(0), up()]);
      expect(result.sends).toEqual([]);
      expect(result.trail).toBe(IDLE_TRAIL);
    });

    it('a drag can\'t jump to a tile that doesn\'t touch or take a tile twice (back two is not an undo)', () => {
      expect(trailPath(run(IDLE_TRAIL, [down(0), move(1), move(2), move(15), move(0)]).trail)).toEqual([0, 1, 2]);
    });
  });

  describe('two pointers', () => {
    // two fingers: B on the grid mid-drag does nothing, A carries on and sends
    it('a second finger mid-drag is ignored and the first drag still sends whole', () => {
      const result = run(IDLE_TRAIL, [down(0, 1), move(1, 1), down(10, 2), move(11, 2), move(2, 1), up(2), up(1)]);
      expect(result.sends).toEqual([[0, 1, 2]]);
    });

    it('a second finger down keeps the same drag (its pointer and path)', () => {
      expect(run(IDLE_TRAIL, [down(0, 1), move(1, 1), down(10, 2)]).trail)
        .toEqual({kind: 'dragging', path: [0, 1], pointerId: 1, moved: true, onLast: false});
    });

    it('the second finger lifting doesn\'t end the drag', () => {
      const result = run(IDLE_TRAIL, [down(0, 1), move(1, 1), down(10, 2), up(2)]);
      expect(result.trail.kind).toBe('dragging');
      expect(result.sends).toEqual([]);
    });

    it('the second finger works once the first is lifted and it is put down again', () => {
      const result = run(IDLE_TRAIL, [down(0, 1), move(1, 1), down(10, 2), up(1), {type: 'clear'}, up(2), down(10, 2), move(11, 2), up(2)]);
      expect(result.sends).toEqual([[0, 1], [10, 11]]);
    });

    it('another pointer\'s cancel doesn\'t touch the drag', () => {
      expect(run(IDLE_TRAIL, [down(0, 1), move(1, 1), cancel(2)]).trail.kind).toBe('dragging');
    });

    // the same pointer down twice (its up never came) starts over from the trail instead of being ignored for good
    it('the same pointer down again goes on from the trail', () => {
      const result = run(IDLE_TRAIL, [down(0, 1), move(1, 1), down(2, 1), up(1)]);
      expect(result.trail).toEqual({kind: 'tapped', path: [0, 1, 2]});
      expect(result.sends).toEqual([]);
    });
  });

  describe('outside taps', () => {
    // outside tap: clears a tapped or typed trail, ignored mid-drag
    it('an outside tap mid-drag is ignored, the drag goes on and sends', () => {
      expect(run(IDLE_TRAIL, [down(0), move(1), {type: 'outsideTap'}, move(2), up()]).sends).toEqual([[0, 1, 2]]);
    });

    it('an outside tap clears a tapped trail', () => {
      expect(run({kind: 'tapped', path: [0, 1]}, [{type: 'outsideTap'}]).trail).toBe(IDLE_TRAIL);
    });

    it('an outside tap clears a typed word', () => {
      expect(run(IDLE_TRAIL, [letter('c'), letter('a'), {type: 'outsideTap'}]).trail).toBe(IDLE_TRAIL);
    });

    it('an outside tap on idle keeps the same object', () => {
      expect(run(IDLE_TRAIL, [{type: 'outsideTap'}]).trail).toBe(IDLE_TRAIL);
    });
  });

  describe('keys mid-drag', () => {
    // keys mid-drag: letter, Backspace, Enter, Escape and the button all leave it alone
    const dragging = run(IDLE_TRAIL, [down(0), move(1)]).trail;

    it.each<TrailEvent>([letter('z'), {type: 'backspace'}, {type: 'enter'}, {type: 'escape'}, {type: 'back'}])('$type mid-drag is ignored', (event) => {
      const step = trailReduce(dragging, event, grid);
      expect(step.trail).toBe(dragging);
      expect(step.send).toBeNull();
    });

    it('the drag still sends after keys in the middle of it', () => {
      expect(run(dragging, [letter('z'), {type: 'escape'}, move(2), up()]).sends).toEqual([[0, 1, 2]]);
    });
  });

  describe('cancel', () => {
    // cancel: the trail stays as a tapped one, nothing sent, then a tap on its last tile sends it
    const cancelled = run(IDLE_TRAIL, [down(0), move(1), move(2), cancel()]);

    it('a cancel keeps the trail as a tapped one and sends nothing', () => {
      expect(cancelled.trail).toEqual({kind: 'tapped', path: [0, 1, 2]});
      expect(cancelled.sends).toEqual([]);
    });

    it('a tap on the last tile after a cancel sends it', () => {
      expect(run(cancelled.trail, [down(2), up()]).sends).toEqual([[0, 1, 2]]);
    });

    it('a cancel of a one-tile press keeps that tile', () => {
      expect(run(IDLE_TRAIL, [down(5), cancel()]).trail).toEqual({kind: 'tapped', path: [5]});
    });

    it('an up after the cancel does nothing', () => {
      expect(run(cancelled.trail, [up()]).trail).toBe(cancelled.trail);
    });
  });

  describe('taps', () => {
    // taps: one by one, the last tile again sends, the only tile again lets go
    const built = run(IDLE_TRAIL, [down(0), up(), down(1), up(), down(2), up()]);

    it('taps build a trail without sending', () => {
      expect(built.trail).toEqual({kind: 'tapped', path: [0, 1, 2]});
      expect(built.sends).toEqual([]);
    });

    it('a tap on the last tile sends the trail and keeps it', () => {
      const sent = run(built.trail, [down(2), up()]);
      expect(sent.sends).toEqual([[0, 1, 2]]);
      expect(sent.trail).toEqual({kind: 'tapped', path: [0, 1, 2]});
    });

    it('the only tile tapped again lets go of it', () => {
      const result = run(IDLE_TRAIL, [down(0), up(), down(0), up()]);
      expect(result.trail).toBe(IDLE_TRAIL);
      expect(result.sends).toEqual([]);
    });

    it('a tap that doesn\'t touch the trail starts over there', () => {
      expect(run(built.trail, [down(15), up()]).trail).toEqual({kind: 'tapped', path: [15]});
    });

    it('a tap on a tile already in the trail starts over there', () => {
      expect(run(built.trail, [down(0), up()]).trail).toEqual({kind: 'tapped', path: [0]});
    });

    it('a drag on from the last tile sends the longer word', () => {
      expect(run(built.trail, [down(2), move(3), up()]).sends).toEqual([[0, 1, 2, 3]]);
    });
  });

  describe('typing', () => {
    // typing: finds the word, off the board keeps the letters with no tiles, Backspace, Enter
    const cat = run(IDLE_TRAIL, [letter('c'), letter('a'), letter('t')]);
    const off = run(cat.trail, [letter('x')]);

    it('typing finds the word\'s trail on the board', () => {
      expect(cat.trail).toEqual({kind: 'typed', letters: 'cat', path: [0, 1, 2]});
    });

    it('Enter sends a typed word', () => {
      expect(run(cat.trail, [{type: 'enter'}]).sends).toEqual([[0, 1, 2]]);
    });

    it('letters not on the board keep the word with no tiles', () => {
      expect(off.trail).toEqual({kind: 'typed', letters: 'catx', path: []});
    });

    it('Enter on a word off the board sends nothing', () => {
      expect(run(off.trail, [{type: 'enter'}]).sends).toEqual([]);
    });

    it('Backspace back onto the board finds the trail again', () => {
      expect(run(off.trail, [{type: 'backspace'}]).trail).toEqual({kind: 'typed', letters: 'cat', path: [0, 1, 2]});
    });

    it('Backspace off the last letter is idle', () => {
      expect(run(IDLE_TRAIL, [letter('c'), {type: 'backspace'}]).trail).toBe(IDLE_TRAIL);
    });

    it('Escape clears a typed word', () => {
      expect(run(cat.trail, [{type: 'escape'}]).trail).toBe(IDLE_TRAIL);
    });

    it('the button clears a typed word whole', () => {
      expect(run(cat.trail, [{type: 'back'}]).trail).toBe(IDLE_TRAIL);
    });

    it('a typed q takes the Qu tile', () => {
      expect(run(IDLE_TRAIL, [letter('q')]).trail).toEqual({kind: 'typed', letters: 'q', path: [8]});
    });
  });

  describe('typed then pointer', () => {
    // typed then pointer: the typed word gives way, its trail stays to go on from
    const typed = run(IDLE_TRAIL, [letter('c'), letter('a')]).trail;

    it('a tap after typing goes on from the typed trail', () => {
      const result = run(typed, [down(2), up()]);
      expect(result.trail).toEqual({kind: 'tapped', path: [0, 1, 2]});
      expect(result.sends).toEqual([]);
    });

    it('a drag from the typed trail\'s last tile sends the longer word', () => {
      expect(run(typed, [down(1), move(2), up()]).sends).toEqual([[0, 1, 2]]);
    });

    it('a tap after letters off the board starts on that tile', () => {
      expect(run(IDLE_TRAIL, [letter('x'), letter('x'), down(5), up()]).trail).toEqual({kind: 'tapped', path: [5]});
    });

    it('a tap on a typed word\'s last tile sends it', () => {
      expect(run(typed, [letter('t'), down(2), up()]).sends).toEqual([[0, 1, 2]]);
    });
  });

  describe('pointer then keys', () => {
    // pointer then keys: a letter starts the word over, Backspace and the button take a tile off
    const tapped: Trail = {kind: 'tapped', path: [0, 1, 2]};

    it('a letter after taps starts a typed word', () => {
      expect(run(tapped, [letter('s')]).trail).toEqual({kind: 'typed', letters: 's', path: [3]});
    });

    it('Backspace takes a tapped tile off', () => {
      expect(run(tapped, [{type: 'backspace'}]).trail).toEqual({kind: 'tapped', path: [0, 1]});
    });

    it('Backspace off the only tapped tile is idle', () => {
      expect(run({kind: 'tapped', path: [0]}, [{type: 'backspace'}]).trail).toBe(IDLE_TRAIL);
    });

    it('the button takes a tapped tile off', () => {
      expect(run(tapped, [{type: 'back'}]).trail).toEqual({kind: 'tapped', path: [0, 1]});
    });

    it('the button clears a one-tile trail', () => {
      expect(run({kind: 'tapped', path: [0]}, [{type: 'back'}]).trail).toBe(IDLE_TRAIL);
    });

    it('Enter sends a tapped trail', () => {
      expect(run(tapped, [{type: 'enter'}]).sends).toEqual([[0, 1, 2]]);
    });

    it('Enter on idle sends nothing', () => {
      expect(run(IDLE_TRAIL, [{type: 'enter'}]).sends).toEqual([]);
    });
  });

  describe('stop', () => {
    // stop: idle from anywhere, a drag in progress included, and its later events do nothing
    it('a stop mid-drag is idle and nothing is sent after it', () => {
      const result = run(IDLE_TRAIL, [down(0), move(1), {type: 'stop'}, move(2), up()]);
      expect(result.trail).toBe(IDLE_TRAIL);
      expect(result.sends).toEqual([]);
    });

    it('a stop clears a typed word', () => {
      expect(run(IDLE_TRAIL, [letter('c'), {type: 'stop'}]).trail).toBe(IDLE_TRAIL);
    });
  });

  describe('no-ops', () => {
    // no-ops hand back the same object (the screen skips a render)
    const tapped: Trail = {kind: 'tapped', path: [0, 1]};

    it('a move with no drag is the same object', () => {
      expect(trailReduce(tapped, move(2), grid).trail).toBe(tapped);
    });

    it('an up with no drag is the same object', () => {
      expect(trailReduce(tapped, up(), grid).trail).toBe(tapped);
    });

    it('a move over the same tile is the same object', () => {
      const dragging = run(IDLE_TRAIL, [down(0)]).trail;
      expect(trailReduce(dragging, move(0), grid).trail).toBe(dragging);
    });
  });
});
