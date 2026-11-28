// Which page key each of notsobot.com's guides has (src/routes.ts, src/seo.ts). The router makes a route per guide from
// this, so adding one is its content, its Routes entry and a line here. The games' guides are notsogames.com's
// (src/games/routes.ts)
import type { SiteGuideSlug } from '@/content/guides';
import { Routes } from '@/routes';


export const GUIDE_PAGE_KEYS = Object.freeze({
  'media-editor': 'GUIDE_MEDIA_EDITOR',
} as const satisfies Record<SiteGuideSlug, keyof typeof Routes>);
