import type { QueryClient } from '@tanstack/react-query';

import { loadGuides } from '@/content/guides/load';
import { loadTagDocs } from '@/content/tagDocs/load';
import { Languages, type Language } from '@/i18n/languages';
import { PAGES } from '@/seo';


// the guide pages (src/pages/guides), the index and each guide
const GUIDE_HANDLES: ReadonlyArray<unknown> = [PAGES.GUIDES, PAGES.GUIDE_FLAG_GUESSER, PAGES.GUIDE_GAME_POINTS, PAGES.GUIDE_LETTER_TRAIL, PAGES.GUIDE_MEDIA_EDITOR];


// What a page's first render needs that it would otherwise load after mounting (for now the tag docs' view, a chunk
// per view and language, the guides, a chunk per language, and another language's FAQ, a chunk too). Loaded before
// the worker renders the page (src/entry-server.tsx) and before the browser hydrates it (src/main.tsx), so both start
// from the same text instead of the worker sending a spinner. `handles` are the matched routes' handles. The FAQ is
// imported here so the site's own bundle doesn't take it in (the docs' and guides' loaders have no content in them)
export async function preloadPage(queryClient: QueryClient, handles: ReadonlyArray<unknown>, language: Language): Promise<void> {
  const loads: Array<Promise<unknown>> = [];
  // only the view that matched, in English too: the page reads it from what has loaded (tagDocsQuery's initial data)
  if (handles.includes(PAGES.TAG_DOCS)) {
    loads.push(loadTagDocs('tagscript', language));
  }
  if (handles.includes(PAGES.TAG_DOCS_MEDIASCRIPT)) {
    loads.push(loadTagDocs('mediascript', language));
  }
  // any guide page, the index included: the page reads them from what has loaded (guidesQuery's initial data)
  if (GUIDE_HANDLES.some((handle) => handles.includes(handle))) {
    loads.push(loadGuides(language));
  }
  // the English questions ship with the page
  if (language !== Languages.ENGLISH && handles.includes(PAGES.FAQ)) {
    loads.push(import('@/content/faq').then(({ faqTranslationQuery }) => queryClient.prefetchQuery(faqTranslationQuery(language))));
  }
  await Promise.all(loads);
}
