import { describe, expect, it } from 'vitest';

import { sanitizeReturnTo } from './returnTo';


describe('sanitizeReturnTo', () => {
  it('keeps a path on this site', () => {
    expect(sanitizeReturnTo('/dashboard/settings')).toBe('/dashboard/settings');
    expect(sanitizeReturnTo('/es/premium?x=1')).toBe('/es/premium?x=1');
  });

  it('refuses other origins and the auth pages', () => {
    for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/auth/login', '/es/auth/login/callback', '/auth/handoffx', '', null]) {
      expect(sanitizeReturnTo(value)).toBeNull();
    }
  });

  it("keeps notsogames.com's handoff, which carries on after logging in", () => {
    expect(sanitizeReturnTo('/auth/handoff?state=abc')).toBe('/auth/handoff?state=abc');
    expect(sanitizeReturnTo('/pt/auth/handoff?state=abc')).toBe('/pt/auth/handoff?state=abc');
  });
});
