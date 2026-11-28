import { describe, expect, it } from 'vitest';

import { isSamePhase, nextPhase, PHASE_SCREENS, type Phase, type Step } from './activityPhase';


// a fresh phase of every kind each call: identity is what `isSamePhase` compares by, so a test that wants two of the
// "same" phase builds them twice
const loading = (step: Step = 'sdk'): Phase => ({kind: 'loading', step});
const failed = (): Phase => ({kind: 'failed', message: 'editor.activity.failed', detail: 'context: 500 boom'});
const lobbies = (notice?: string): Phase => ({kind: 'lobbies', notice});
const choice = (): Phase => ({kind: 'choice'});
const gamesFrame = (): Phase => ({kind: 'games_frame', launch: {screen: 'tab'}});
const start = (mode: 'solo' | 'public' | 'password' = 'public'): Phase => ({kind: 'start', mode});
const editor = (documentId = 'doc1'): Phase => ({kind: 'editor', documentId, solo: false});
const serverSettings = (): Phase => ({kind: 'server_settings', guildId: '100000000000000001'});
const userSettings = (): Phase => ({kind: 'user_settings'});

const BUILDERS: Record<Phase['kind'], () => Phase> = {
  loading: () => loading(),
  failed,
  lobbies: () => lobbies(),
  choice,
  games_frame: gamesFrame,
  start: () => start(),
  editor: () => editor(),
  server_settings: serverSettings,
  user_settings: userSettings,
};
const KINDS = Object.keys(BUILDERS) as Array<Phase['kind']>;
// the kinds compared only by identity (everything but startup and the start screen)
const IDENTITY_KINDS = KINDS.filter((kind) => kind !== 'loading' && kind !== 'start');
const NOT_FAILED_KINDS = KINDS.filter((kind) => kind !== 'failed');


describe('isSamePhase', () => {
  it.each(KINDS)('a %s phase is the same as itself', (kind) => {
    const phase = BUILDERS[kind]();
    expect(isSamePhase(phase, phase)).toBe(true);
  });

  it('two loading phases are the same screen whatever step each is on', () => {
    expect(isSamePhase(loading('sdk'), loading('context'))).toBe(true);
  });

  it('two start phases are the same screen whoever the edit is for', () => {
    expect(isSamePhase(start('solo'), start('password'))).toBe(true);
  });

  it.each(IDENTITY_KINDS)('two %s phases built apart are not the same, even with the same fields', (kind) => {
    expect(isSamePhase(BUILDERS[kind](), BUILDERS[kind]())).toBe(false);
  });

  it('phases of different kinds are never the same', () => {
    for (const a of KINDS) {
      for (const b of KINDS) {
        if (a !== b) {
          expect(isSamePhase(BUILDERS[a](), BUILDERS[b]()), `${a} vs ${b}`).toBe(false);
        }
      }
    }
  });
});


describe('nextPhase', () => {
  describe('a change to another screen', () => {
    it('with no `from` always applies', () => {
      const to = choice();
      expect(nextPhase(lobbies(), {to})).toBe(to);
    });

    it('with the current phase as its `from` applies', () => {
      const current = editor();
      const to = lobbies('kicked');
      expect(nextPhase(current, {to, from: current})).toBe(to);
    });

    it('with a stale `from` is dropped and the current phase stays', () => {
      const asked = start();
      const current = choice();
      expect(nextPhase(current, {to: editor(), from: asked})).toBe(current);
    });

    it('from an editor phase that has since been replaced by an equal one is dropped', () => {
      const current = editor('doc1');
      expect(nextPhase(current, {to: lobbies(), from: editor('doc1')})).toBe(current);
    });

    it('from a start screen still applies after its mode changed', () => {
      const to = editor();
      expect(nextPhase(start('solo'), {to, from: start('public')})).toBe(to);
    });

    it('from startup still applies after startup moved to another step', () => {
      const to = choice();
      expect(nextPhase(loading('context'), {to, from: loading('sdk')})).toBe(to);
    });
  });

  describe('a failed phase is terminal', () => {
    it.each(NOT_FAILED_KINDS)('a change to %s with no `from` leaves it failed', (kind) => {
      const current = failed();
      expect(nextPhase(current, {to: BUILDERS[kind]()})).toBe(current);
    });

    it('a change whose `from` is the failed phase itself leaves it failed', () => {
      const current = failed();
      expect(nextPhase(current, {to: choice(), from: current})).toBe(current);
    });

    it('a startup step leaves it failed', () => {
      const current = failed();
      expect(nextPhase(current, {step: 'context'})).toBe(current);
    });

    it('another failure does not replace the first one', () => {
      const current = failed();
      expect(nextPhase(current, {to: {kind: 'failed', message: 'editor.activity.denied'}})).toBe(current);
    });
  });

  describe('a startup step', () => {
    it('moves the loading screen on to a new step', () => {
      expect(nextPhase(loading('sdk'), {step: 'signin'})).toEqual({kind: 'loading', step: 'signin'});
    });

    it('to the step it is already on changes nothing', () => {
      const current = loading('signin');
      expect(nextPhase(current, {step: 'signin'})).toBe(current);
    });

    it.each(NOT_FAILED_KINDS.filter((kind) => kind !== 'loading'))('once startup is over (on %s) changes nothing', (kind) => {
      const current = BUILDERS[kind]();
      expect(nextPhase(current, {step: 'authenticate'})).toBe(current);
    });
  });
});


describe('PHASE_SCREENS', () => {
  it.each<[Phase['kind'], 'editor' | 'games' | null]>([
    ['loading', null],
    ['failed', null],
    ['lobbies', null],
    ['choice', null],
    ['games_frame', 'games'],
    ['start', 'editor'],
    ['editor', 'editor'],
    ['server_settings', null],
    ['user_settings', null],
  ])('a %s phase counts as %s on everyone\'s start screen', (kind, screen) => {
    expect(PHASE_SCREENS[kind]).toBe(screen);
  });
});
