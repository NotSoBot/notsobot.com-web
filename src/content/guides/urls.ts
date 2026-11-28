// Where a guide's page is: a game's on notsogames.com, the media editor's on notsobot.com, at `/guides/<slug>` on both
// (src/content/guides/types.ts). Plain functions, the Activity's sheet and both sites link with them
import { languagePath, type Language } from '@/i18n/languages';
import { SiteIds, siteOrigin, type SiteId } from '@/sites';

import { isGameGuide, type GuideSlug } from './types';


// the path on its own site
export function guidePath(slug: GuideSlug): string {
  return `/guides/${slug}`;
}

export function guideSite(slug: GuideSlug): SiteId {
  return (isGameGuide(slug)) ? SiteIds.GAMES : SiteIds.NOTSOBOT;
}

// the whole url, in a language: production's site, or the one beside the page's own (beta, a dev server)
export function guideUrl(slug: GuideSlug, language: Language): string {
  return `${siteOrigin(guideSite(slug))}${languagePath(language, guidePath(slug))}`;
}
