import type { QueryClient } from '@tanstack/react-query';

import { Languages, type Language } from '@/i18n/languages';
import { PAGES } from '@/seo';


// What a page's first render needs that it would otherwise load after mounting (for now another language's FAQ or
// tag docs, a chunk each). Loaded before the worker renders the page (src/entry-server.tsx) and before the browser
// hydrates it (src/main.tsx), so both start from the same text instead of the worker sending a spinner. `handles` are
// the matched routes' handles. The modules are imported here so the site's own bundle doesn't take them in
export async function preloadPage(queryClient: QueryClient, handles: ReadonlyArray<unknown>, language: Language): Promise<void> {
  // the English text ships with the page
  if (language === Languages.ENGLISH) {
    return;
  }
  const loads: Array<Promise<void>> = [];
  if (handles.includes(PAGES.FAQ)) {
    loads.push(import('@/content/faq').then(({ faqTranslationQuery }) => queryClient.prefetchQuery(faqTranslationQuery(language))));
  }
  if (handles.includes(PAGES.TAG_DOCS) || handles.includes(PAGES.TAG_DOCS_MEDIASCRIPT)) {
    loads.push(import('@/content/tagDocs/localize').then(({ tagDocsTranslationQuery }) => queryClient.prefetchQuery(tagDocsTranslationQuery(language))));
  }
  await Promise.all(loads);
}
