// Page titles and descriptions in every language, for the worker's metatags. Kept out of seo.ts, which the site
// imports too: the browser already has its language's titles in its dictionary, and shouldn't download the others.

import { Layout as SpanishLayout } from './i18n/locales/es/layout';
import { Pages as SpanishPages } from './i18n/locales/es/pages';
import { Layout as PortugueseLayout } from './i18n/locales/pt/layout';
import { Pages as PortuguesePages } from './i18n/locales/pt/pages';
import { Languages, type Language } from './i18n/languages';
import { NOT_FOUND_PAGE, PAGES, type PageDescriptions, type PageKey, type PageMeta } from './seo';


// Every other language's page text: the titles are its `page.<KEY>` strings (the ones the browser tab shows), the
// descriptions are its locales/<language>/pages.ts. Keyed by language, so adding one without them is a type error
const PAGE_TRANSLATIONS: Readonly<Record<Exclude<Language, typeof Languages.ENGLISH>, {
  titles: Readonly<Record<string, string>>,
  descriptions: PageDescriptions,
}>> = Object.freeze({
  [Languages.SPANISH]: {titles: SpanishLayout, descriptions: SpanishPages},
  [Languages.PORTUGUESE]: {titles: PortugueseLayout, descriptions: PortuguesePages},
});


// a page's title and description in a language, English where it has no translation
export function localizedPage(key: PageKey | 'NOT_FOUND', language: Language): PageMeta {
  const page = (key === 'NOT_FOUND') ? NOT_FOUND_PAGE : PAGES[key];
  if (language === Languages.ENGLISH) {
    return page;
  }
  const { titles, descriptions } = PAGE_TRANSLATIONS[language];
  return {
    ...page,
    title: (page.title) ? (titles[`page.${key}`] ?? page.title) : undefined,
    description: descriptions[key] ?? page.description,
  };
}
