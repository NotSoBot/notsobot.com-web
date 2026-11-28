import { beforeEach, describe, expect, it } from 'vitest';

import {
  consumeHandoff,
  HANDOFF_MAX_AGE,
  handoffCallbackUrl,
  handoffStartUrl,
  handoffStateHash,
  isHandoffState,
  newHandoffState,
  sanitizeGamesReturnTo,
  saveHandoff,
} from './handoff';


describe('the handoff state', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('makes a new random state each time', () => {
    const first = newHandoffState();
    expect(isHandoffState(first)).toBe(true);
    expect(first).not.toBe(newHandoffState());
  });

  it('takes the state this tab started, once', () => {
    const state = newHandoffState();
    saveHandoff(state, '/play?game=letter_trail', 1000);
    expect(consumeHandoff(state, 2000)).toEqual({ok: true, returnTo: '/play?game=letter_trail'});
    expect(consumeHandoff(state, 2000)).toEqual({ok: false});
  });

  it('refuses another state, and the one waiting is gone after', () => {
    const state = newHandoffState();
    saveHandoff(state, '/', 1000);
    expect(consumeHandoff(newHandoffState(), 2000)).toEqual({ok: false});
    expect(consumeHandoff(state, 2000)).toEqual({ok: false});
  });

  it('refuses a state when this tab started none', () => {
    expect(consumeHandoff(newHandoffState())).toEqual({ok: false});
    expect(consumeHandoff(null)).toEqual({ok: false});
  });

  it('refuses one that is too old, or from the future', () => {
    const state = newHandoffState();
    saveHandoff(state, '/', 1000);
    expect(consumeHandoff(state, 1000 + HANDOFF_MAX_AGE + 1)).toEqual({ok: false});
    saveHandoff(state, '/', 5000);
    expect(consumeHandoff(state, 4000)).toEqual({ok: false});
  });

  it('refuses a malformed state even if it was stored', () => {
    window.sessionStorage.setItem('games:handoff', JSON.stringify({state: 'short', returnTo: '/', at: 1000}));
    expect(consumeHandoff('short', 1000)).toEqual({ok: false});
    window.sessionStorage.setItem('games:handoff', 'not json');
    expect(consumeHandoff(newHandoffState(), 1000)).toEqual({ok: false});
  });

  it('only comes back to a path on this site', () => {
    for (const value of ['https://evil.example/', '//evil.example', '/\\evil.example', 'play', '/auth/callback', '/es/auth/callback?x', '', null]) {
      expect(sanitizeGamesReturnTo(value)).toBe('/');
    }
    expect(sanitizeGamesReturnTo('/es/play/abc?watch=1')).toBe('/es/play/abc?watch=1');
    const state = newHandoffState();
    saveHandoff(state, 'https://evil.example', 1000);
    expect(consumeHandoff(state, 1000)).toEqual({ok: true, returnTo: '/'});
  });
});


describe('the handoff urls', () => {
  it("goes to notsobot.com's handoff page in the language", () => {
    expect(handoffStartUrl('https://notsobot.com', 'es', 'a'.repeat(43))).toBe(`https://notsobot.com/es/auth/handoff?state=${'a'.repeat(43)}`);
    expect(handoffStartUrl('http://localhost:5175', 'en', 'b'.repeat(43), true)).toBe(`http://localhost:5175/auth/handoff?state=${'b'.repeat(43)}&reauth=guilds`);
  });

  it("comes back to the games site's callback with the code", () => {
    expect(handoffCallbackUrl('https://notsogames.com', 'pt', 'code&1', 's'.repeat(43))).toBe(`https://notsogames.com/pt/auth/callback?code=code%261&state=${'s'.repeat(43)}`);
  });

  it('hashes the state as sha256 hex', async () => {
    expect(await handoffStateHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
