import { describe, expect, it } from 'vitest';

import { localizedSiteUrl } from './siteLinks';


describe('localizedSiteUrl', () => {
  it("puts the language's prefix on the site's pages", () => {
    expect(localizedSiteUrl('https://notsobot.com/premium', 'es')).toBe('https://notsobot.com/es/premium');
    expect(localizedSiteUrl('https://notsobot.com/guides/flag-guesser', 'pt')).toBe('https://notsobot.com/pt/guides/flag-guesser');
    expect(localizedSiteUrl('https://notsobot.com/docs/mediascript', 'es')).toBe('https://notsobot.com/es/docs/mediascript');
    expect(localizedSiteUrl('https://notsobot.com/commands/caption', 'pt')).toBe('https://notsobot.com/pt/commands/caption');
    expect(localizedSiteUrl('https://www.notsobot.com/faq', 'es')).toBe('https://www.notsobot.com/es/faq');
  });

  it('keeps the query and the anchor', () => {
    expect(localizedSiteUrl('https://notsobot.com/dashboard/settings#your-data', 'es')).toBe('https://notsobot.com/es/dashboard/settings#your-data');
    expect(localizedSiteUrl('https://notsobot.com/commands?search=caption#top', 'pt')).toBe('https://notsobot.com/pt/commands?search=caption#top');
  });

  it("makes the home page the language's root", () => {
    expect(localizedSiteUrl('https://notsobot.com/', 'es')).toBe('https://notsobot.com/es');
    expect(localizedSiteUrl('https://notsobot.com', 'pt')).toBe('https://notsobot.com/pt');
  });

  it('leaves English as it is', () => {
    expect(localizedSiteUrl('https://notsobot.com/premium', 'en')).toBe('https://notsobot.com/premium');
    expect(localizedSiteUrl('https://notsobot.com/', 'en')).toBe('https://notsobot.com/');
  });

  it('leaves the pages that stay English', () => {
    for (const path of ['/changelog', '/legal/privacy', '/legal/tos', '/privacy', '/terms', '/dashboard/admin/tags', '/dashboard/owner/stats', '/api/editor/x', '/Changelog']) {
      expect(localizedSiteUrl(`https://notsobot.com${path}`, 'es')).toBe(`https://notsobot.com${path}`);
    }
  });

  it("doesn't mistake a page that only starts like one that stays English", () => {
    expect(localizedSiteUrl('https://notsobot.com/dashboard/administrators', 'es')).toBe('https://notsobot.com/es/dashboard/administrators');
    expect(localizedSiteUrl('https://notsobot.com/dashboard/servers/1/settings', 'pt')).toBe('https://notsobot.com/pt/dashboard/servers/1/settings');
  });

  it('leaves a link that already says its language', () => {
    expect(localizedSiteUrl('https://notsobot.com/es/guides', 'pt')).toBe('https://notsobot.com/es/guides');
    expect(localizedSiteUrl('https://notsobot.com/pt', 'es')).toBe('https://notsobot.com/pt');
    expect(localizedSiteUrl('https://notsobot.com/en/premium', 'es')).toBe('https://notsobot.com/en/premium');
  });

  it('leaves other sites and what is not a url', () => {
    expect(localizedSiteUrl('https://discord.gg/notsobot', 'es')).toBe('https://discord.gg/notsobot');
    expect(localizedSiteUrl('https://cdn.nsb.gg/x.png', 'es')).toBe('https://cdn.nsb.gg/x.png');
    expect(localizedSiteUrl('https://notsobot.com.evil.example/premium', 'es')).toBe('https://notsobot.com.evil.example/premium');
    expect(localizedSiteUrl('http://notsobot.com/premium', 'es')).toBe('http://notsobot.com/premium');
    expect(localizedSiteUrl('/premium', 'es')).toBe('/premium');
    expect(localizedSiteUrl('not a url', 'pt')).toBe('not a url');
  });
});
