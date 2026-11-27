// Loads the guides one language at a time, each its own chunk (en.ts, es.ts, pt.ts), so neither the site's bundle nor
// the Activity's carries them until someone opens a guide. Used by the site's guide pages (src/pages/guides, through the
// router's loader and src/lib/pagePreload.ts) and meant for the Activity's "How to play" sheet too: call
// `loadGuides(language)` (or use `guidesQuery`) and render a guide's `quick` rules, then its `sections`.

import { queryOptions } from '@tanstack/react-query';

import { Languages, type Language } from '@/i18n/languages';

import type { GuideBook } from './types';


// a language without its book is a type error
const LOADERS: Readonly<Record<Language, () => Promise<GuideBook>>> = Object.freeze({
  [Languages.ENGLISH]: async () => (await import('./en')).GUIDES_ENGLISH,
  [Languages.SPANISH]: async () => (await import('./es')).GUIDES_SPANISH,
  [Languages.PORTUGUESE]: async () => (await import('./pt')).GUIDES_PORTUGUESE,
});


// what has arrived and what is on its way. module state: the guides are the same for everyone, so the worker keeps
// them between requests like the browser does between pages
const loaded = new Map<Language, GuideBook>();
const loading = new Map<Language, Promise<GuideBook>>();

function load(language: Language): Promise<GuideBook> {
  let pending = loading.get(language);
  if (!pending) {
    pending = LOADERS[language]().then((book) => {
      loaded.set(language, book);
      return book;
    });
    // a chunk that failed to load can be asked for again
    pending.catch(() => loading.delete(language));
    loading.set(language, pending);
  }
  return pending;
}


// the guides in a language once they've loaded, to render them without waiting
export function loadedGuides(language: Language): GuideBook | undefined {
  return loaded.get(language);
}

// A missing chunk for another language (offline, an old deploy) gives the English guides, like a missing dictionary
// shows English text, so this only fails when the English ones do
export async function loadGuides(language: Language): Promise<GuideBook> {
  if (language === Languages.ENGLISH) {
    return load(language);
  }
  try {
    return await load(language);
  } catch {
    return load(Languages.ENGLISH);
  }
}

// the pages' query. Loaded guides are its initial data, so a page renders right away after the router's loader or
// pagePreload fetched them (the worker's render and the browser hydrating it); a language switch fetches here
export function guidesQuery(language: Language) {
  return queryOptions({
    queryKey: ['guides', language],
    queryFn: () => loadGuides(language),
    initialData: () => loadedGuides(language),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}
