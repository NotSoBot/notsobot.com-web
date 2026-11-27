// Which page key and path each guide has (src/routes.ts, src/seo.ts). The router makes a route per guide from this, and
// the pages link to guides with it, so adding a guide is its content, its Routes entry and a line here
import type { GuideSlug } from '@/content/guides';
import { Routes } from '@/routes';


export const GUIDE_PAGE_KEYS = Object.freeze({
  'flag-guesser': 'GUIDE_FLAG_GUESSER',
  'game-points': 'GUIDE_GAME_POINTS',
  'letter-trail': 'GUIDE_LETTER_TRAIL',
  'media-editor': 'GUIDE_MEDIA_EDITOR',
} as const satisfies Record<GuideSlug, keyof typeof Routes>);


export function guidePath(slug: GuideSlug): string {
  return Routes[GUIDE_PAGE_KEYS[slug]];
}
