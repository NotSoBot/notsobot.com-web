// The guides' shape, shared by notsobot.com/guides and notsogames.com/guides (src/pages/guides, src/games/pages) and the
// Activity's "How to play" sheet. Plain data,
// no React or browser code, so the worker's render and the Activity bundle can both take it in.
//
// Text in blocks and quick rules uses a tiny inline markup (rendered by src/components/guides/GuideBlocks.tsx):
//   `code`, **bold**, [label](/path) for a site page, [label](guide:<slug>) for another guide (the Activity's sheet
//   opens that guide instead of following a link).
// Each language is a whole book (en.ts, es.ts, pt.ts), so a guide or section missing in one is a type error.


export const GUIDE_SLUGS = ['flag-guesser', 'letter-trail', 'game-points', 'media-editor'] as const;
export type GuideSlug = typeof GUIDE_SLUGS[number];

// where each guide's page is (notsogames-plan.md): the games' on notsogames.com, the media editor's on notsobot.com. Both
// sites put a guide at `/guides/<slug>`
export const GAME_GUIDE_SLUGS = ['flag-guesser', 'letter-trail', 'game-points'] as const satisfies ReadonlyArray<GuideSlug>;
export type GameGuideSlug = typeof GAME_GUIDE_SLUGS[number];
export const SITE_GUIDE_SLUGS = ['media-editor'] as const satisfies ReadonlyArray<GuideSlug>;
export type SiteGuideSlug = typeof SITE_GUIDE_SLUGS[number];

export function isGameGuide(slug: GuideSlug): slug is GameGuideSlug {
  return (GAME_GUIDE_SLUGS as ReadonlyArray<string>).includes(slug);
}

// games with a card on the index but no guide yet (none right now, the next one goes here)
export const UPCOMING_GUIDE_SLUGS = [] as const;
export type UpcomingGuideSlug = typeof UPCOMING_GUIDE_SLUGS[number];

// a guide's section ids, the same in every language: they're the sections' anchors (`/guides/flag-guesser#scoring`)
// and what the Activity's sheet can open a guide on
export interface GuideSectionIds {
  'flag-guesser': 'starting' | 'solo' | 'rooms' | 'host' | 'settings' | 'scoring' | 'hints' | 'watching' | 'invites' | 'chat',
  'letter-trail': 'starting' | 'playing' | 'scoring' | 'only-you' | 'bonus' | 'settings' | 'solo' | 'rooms',
  'game-points': 'earning' | 'daily-limit' | 'commands' | 'activity',
  'media-editor': 'opening' | 'start-screen' | 'who' | 'together' | 'watch-only' | 'managing' | 'invites' | 'templates' | 'posting' | 'premium',
}


export type GuideBlock =
  // a short paragraph
  | {kind: 'text', text: string}
  // things to do in order, numbered
  | {kind: 'steps', items: ReadonlyArray<string>}
  // a bulleted list
  | {kind: 'list', items: ReadonlyArray<string>}
  // label and value rows, for settings and point values
  | {kind: 'facts', items: ReadonlyArray<{label: string, value: string}>}
  // a small callout beside the text
  | {kind: 'tip', text: string};

export interface GuideSection<Id extends string = string> {
  id: Id,
  title: string,
  blocks: ReadonlyArray<GuideBlock>,
}

export interface Guide<Slug extends GuideSlug = GuideSlug> {
  title: string,
  // one line, for the index's cards and the sheet's list
  summary: string,
  // the short version at the top, a handful of one-line rules. What a compact sheet shows first
  quick: ReadonlyArray<string>,
  sections: ReadonlyArray<GuideSection<GuideSectionIds[Slug]>>,
}

export interface UpcomingGuide {
  title: string,
  summary: string,
}

export interface GuideBook {
  // how to open the Activity at all, on the index page
  opening: GuideSection<'opening'>,
  guides: {readonly [Slug in GuideSlug]: Guide<Slug>},
  upcoming: {readonly [Slug in UpcomingGuideSlug]: UpcomingGuide},
}


// a `guide:<slug>` or `guide:<slug>#<section>` link in the inline markup, null for any other link
export function parseGuideLink(href: string): {slug: GuideSlug, section: string | null} | null {
  if (!href.startsWith('guide:')) {
    return null;
  }
  const [ slug, section ] = href.slice('guide:'.length).split('#');
  if (!(GUIDE_SLUGS as ReadonlyArray<string>).includes(slug)) {
    return null;
  }
  return {slug: slug as GuideSlug, section: section || null};
}
