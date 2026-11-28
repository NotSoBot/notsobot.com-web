import { describe, expect, it } from 'vitest';

import { counterpartOrigin, siteForHost, SiteIds } from './sites';


describe('siteForHost', () => {
  it('picks each site by its hosts', () => {
    expect(siteForHost('notsobot.com')).toEqual({site: SiteIds.NOTSOBOT, kind: 'site'});
    expect(siteForHost('www.notsobot.com')).toEqual({site: SiteIds.NOTSOBOT, kind: 'site'});
    expect(siteForHost('beta.notsobot.com')).toEqual({site: SiteIds.NOTSOBOT, kind: 'site'});
    expect(siteForHost('notsogames.com')).toEqual({site: SiteIds.GAMES, kind: 'site'});
    expect(siteForHost('www.notsogames.com')).toEqual({site: SiteIds.GAMES, kind: 'site'});
    expect(siteForHost('beta.notsogames.com')).toEqual({site: SiteIds.GAMES, kind: 'site'});
  });

  it('knows the dev hosts and ignores case and a trailing dot', () => {
    expect(siteForHost('localhost')).toEqual({site: SiteIds.NOTSOBOT, kind: 'local'});
    expect(siteForHost('127.0.0.1')).toEqual({site: SiteIds.NOTSOBOT, kind: 'local'});
    expect(siteForHost('games.localhost')).toEqual({site: SiteIds.GAMES, kind: 'local'});
    expect(siteForHost('NotSoGames.com.')).toEqual({site: SiteIds.GAMES, kind: 'site'});
  });

  it('sends the short domains to their site', () => {
    expect(siteForHost('notso.bot')).toEqual({site: SiteIds.NOTSOBOT, kind: 'redirect'});
    expect(siteForHost('www.notso.bot')).toEqual({site: SiteIds.NOTSOBOT, kind: 'redirect'});
    expect(siteForHost('notso.games')).toEqual({site: SiteIds.GAMES, kind: 'redirect'});
    expect(siteForHost('www.notso.games')).toEqual({site: SiteIds.GAMES, kind: 'redirect'});
  });

  it('knows no other host', () => {
    for (const host of ['nsb.gg', 'api.notsobot.com', 'notsogames.com.evil.example', 'evilnotsogames.com', 'other.localhost', '']) {
      expect(siteForHost(host)).toBeNull();
    }
  });
});


describe('counterpartOrigin', () => {
  it('maps production to production, www. to the apex', () => {
    expect(counterpartOrigin('https://notsobot.com', SiteIds.GAMES)).toBe('https://notsogames.com');
    expect(counterpartOrigin('https://www.notsobot.com', SiteIds.GAMES)).toBe('https://notsogames.com');
    expect(counterpartOrigin('https://notsogames.com', SiteIds.NOTSOBOT)).toBe('https://notsobot.com');
    expect(counterpartOrigin('https://www.notsogames.com/play?x=1', SiteIds.NOTSOBOT)).toBe('https://notsobot.com');
  });

  it('keeps beta with beta', () => {
    expect(counterpartOrigin('https://beta.notsobot.com', SiteIds.GAMES)).toBe('https://beta.notsogames.com');
    expect(counterpartOrigin('https://beta.notsogames.com', SiteIds.NOTSOBOT)).toBe('https://beta.notsobot.com');
  });

  it("gives a site its own origin's environment too", () => {
    expect(counterpartOrigin('https://notsogames.com', SiteIds.GAMES)).toBe('https://notsogames.com');
    expect(counterpartOrigin('http://games.localhost:5175', SiteIds.GAMES)).toBe('http://games.localhost:5175');
  });

  it("maps a dev server to the other repo's dev server (its own port)", () => {
    expect(counterpartOrigin('http://localhost:5173', SiteIds.GAMES)).toBe('http://games.localhost:5175');
    expect(counterpartOrigin('http://127.0.0.1:5180', SiteIds.GAMES)).toBe('http://games.localhost:5175');
    expect(counterpartOrigin('http://games.localhost:5175', SiteIds.NOTSOBOT)).toBe('http://localhost:5173');
  });

  it('gives nothing for any other origin', () => {
    for (const origin of [
      'https://evil.example',
      'https://notsogames.com.evil.example',
      'http://notsogames.com',
      'https://notsogames.com:8443',
      'https://notso.games',
      'javascript:alert(1)',
      'not a url',
      '',
    ]) {
      expect(counterpartOrigin(origin, SiteIds.GAMES)).toBeNull();
    }
  });
});
