import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRound, GameState } from '../protocol';
import { FakeFlagGame } from './FakeFlagGame';
import { FakeLetterTrail } from './FakeLetterTrail';


// the dev fakes behind the real FlagGameConnection: what the screens see from them should be what the api's socket gives

// the fakes' snapshot game as Flag Guesser's (these tests only make Flag Guesser rooms with FakeFlagGame)
function flagState(game: FakeFlagGame): GameState {
  return game.snapshot.game as GameState;
}

function round(game: FakeFlagGame): GameRound {
  const state = flagState(game);
  if (!state.round) {
    throw new Error('no round');
  }
  return state.round;
}


describe('dev fakes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    // the bots never answer (a 0.7 chance), shuffles keep their order
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('FakeFlagGame in choices mode', () => {
    function started(): FakeFlagGame {
      const game = new FakeFlagGame({moderator: true, settings: {mode: 'choices', rounds: 5, difficulty: 'easy', seconds: 10}});
      game.connect();
      vi.advanceTimersByTime(400);
      return game;
    }

    // its round after the start countdown, with your choice answered
    function answered(): FakeFlagGame {
      const game = started();
      game.start();
      vi.advanceTimersByTime(100);
      vi.advanceTimersByTime(3100);
      game.choose(1);
      vi.advanceTimersByTime(100);
      return game;
    }

    it('is connecting first', () => {
      const game = new FakeFlagGame({moderator: true});
      game.connect();
      expect(game.snapshot.status).toBe('connecting');
    });

    it('its ready opens, as a moderator', () => {
      const game = started();
      expect(game.snapshot.status).toBe('open');
      expect(game.snapshot.moderator).toBe(true);
    });

    it('a start is pending and a second one waits', () => {
      const game = started();
      expect(game.start()).toBe(true);
      expect(game.snapshot.pendingOp).toBe('start');
      expect(game.start()).toBe(false);
    });

    it('its state answers the start: a countdown round with nothing of the flag yet', () => {
      const game = started();
      game.start();
      vi.advanceTimersByTime(100);
      expect(game.snapshot.pendingOp).toBeNull();
      expect(game.snapshot.game?.phase).toBe('round');
      expect(round(game).flag_url).toBeNull();
      expect(round(game).your_choice).toBeNull();
      expect(Array.isArray(round(game).answered_by)).toBe(true);
    });

    it('the flag and its choices come after the countdown', () => {
      const game = started();
      game.start();
      vi.advanceTimersByTime(3200);
      expect(typeof round(game).flag_url).toBe('string');
      expect(round(game).choices).toHaveLength(4);
    });

    it('a choice goes out', () => {
      const game = started();
      game.start();
      vi.advanceTimersByTime(3200);
      expect(game.choose(1)).toBe(true);
    });

    it('a choice is answered', () => {
      const game = answered();
      expect(game.snapshot.guess).not.toBeNull();
      expect(game.snapshot.chosen).toBe(1);
    });

    it('a dropped socket is reconnecting', () => {
      const game = answered();
      game.drop(1000);
      expect(game.snapshot.status).toBe('reconnecting');
    });

    it('back from a drop it is open and the api says the choice', () => {
      const game = answered();
      game.drop(1000);
      vi.advanceTimersByTime(1700);
      expect(game.snapshot.status).toBe('open');
      expect(game.snapshot.chosen).toBe(1);
      expect(round(game)).toMatchObject({your_choice: 1, you_answered: true});
      expect(round(game).answered_by).toContain('300000000000000001');
    });

    it('the reveal has its end, `until` the same', () => {
      const game = answered();
      game.drop(1000);
      vi.advanceTimersByTime(1700);
      vi.advanceTimersByTime(8000);
      const state = flagState(game);
      expect(state.phase).toBe('reveal');
      expect(typeof state.reveal?.ends_at).toBe('number');
      expect(state.reveal?.until).toBe(state.reveal?.ends_at);
    });

    it('close is left', () => {
      const game = started();
      game.close();
      expect(game.snapshot.status).toBe('left');
    });
  });

  describe('FakeFlagGame in type mode', () => {
    // solo: its round is running at ready, no countdown
    function solo(): FakeFlagGame {
      const game = new FakeFlagGame({solo: true, settings: {mode: 'type', rounds: 5, difficulty: 'easy', seconds: 10}});
      game.connect();
      vi.advanceTimersByTime(400);
      return game;
    }

    it('a solo room is in its round at ready', () => {
      expect(solo().snapshot.game?.phase).toBe('round');
    });

    it('a guess goes out at the buzzer', () => {
      const game = solo();
      vi.advanceTimersByTime(9990);
      expect(game.guess('zzzzzz')).toBe(true);
    });

    // B1: one sent as the time ran out is refused every time, the reveal already says why
    it('a guess refused as the round is over is no banner and leaves no stale result', () => {
      const game = solo();
      vi.advanceTimersByTime(9990);
      game.guess('zzzzzz');
      vi.advanceTimersByTime(200);
      expect(game.snapshot.game?.phase).toBe('reveal');
      expect(game.snapshot.error).toBeNull();
      expect(game.snapshot.guess).toBeNull();
    });

    it('the guess queue is in step in the next round', () => {
      const game = solo();
      vi.advanceTimersByTime(9990);
      game.guess('zzzzzz');
      vi.advanceTimersByTime(200);
      vi.advanceTimersByTime(5100);
      vi.advanceTimersByTime(400);
      game.guess('first');
      vi.advanceTimersByTime(400);
      expect(game.snapshot.guess?.text).toBe('first');
    });
  });

  // not the host: the start is refused, and the refusal answers the pending op
  describe('FakeFlagGame not as the host', () => {
    it('a start is sent and pending', () => {
      const game = new FakeFlagGame({youHost: false});
      game.connect();
      vi.advanceTimersByTime(400);
      expect(game.start()).toBe(true);
      expect(game.snapshot.pendingOp).toBe('start');
    });

    it('the start refused with an error is no longer pending', () => {
      const game = new FakeFlagGame({youHost: false});
      game.connect();
      vi.advanceTimersByTime(400);
      game.start();
      vi.advanceTimersByTime(100);
      expect(game.snapshot.pendingOp).toBeNull();
      expect(game.snapshot.error).not.toBeNull();
    });
  });

  // finished: the standings carry `awarded`, the game points come a moment later
  describe('FakeFlagGame finishing', () => {
    function finished(): FakeFlagGame {
      const game = new FakeFlagGame();
      game.connect();
      vi.advanceTimersByTime(400);
      game.finish();
      vi.advanceTimersByTime(100);
      return game;
    }

    it('is finished with the awards not in yet', () => {
      const state = flagState(finished());
      expect(state.phase).toBe('finished');
      expect(state.standings?.[0].awarded).toBeNull();
    });

    it('the awards come after', () => {
      const game = finished();
      vi.advanceTimersByTime(1300);
      expect(game.snapshot.awards).not.toBeNull();
    });
  });

  describe('FakeLetterTrail', () => {
    function letters(): FakeLetterTrail {
      const game = new FakeLetterTrail({youHost: false, moderator: true});
      game.connect();
      vi.advanceTimersByTime(400);
      return game;
    }

    it('its ready opens a Letter Trail room, as a moderator', () => {
      const game = letters();
      expect(game.snapshot.status).toBe('open');
      expect(game.snapshot.moderator).toBe(true);
      expect(game.snapshot.game?.room.game).toBe('letter_trail');
    });

    it('an end refused (not the host) answers the pending op and shows', () => {
      const game = letters();
      game.end();
      vi.advanceTimersByTime(100);
      expect(game.snapshot.pendingOp).toBeNull();
      expect(game.snapshot.error).not.toBeNull();
    });

    it('a dropped socket is reconnecting', () => {
      const game = letters();
      game.drop(500);
      expect(game.snapshot.status).toBe('reconnecting');
    });

    it('it is open again after the drop', () => {
      const game = letters();
      game.drop(500);
      vi.advanceTimersByTime(1200);
      expect(game.snapshot.status).toBe('open');
    });

    it('close is left', () => {
      const game = letters();
      game.close();
      expect(game.snapshot.status).toBe('left');
    });
  });
});
