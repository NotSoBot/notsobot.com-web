// Loads the tag docs one view at a time. The docs are two views, TagScript and MediaScript, and each is a chunk per
// language: English is `en/<view>`, another language's is that view's half of its overlay laid over the English one
// (`es/<view>`, which brings the English chunk with it). So a reader only downloads the view and language on screen,
// and the other view when they switch to it.
// This file has no content, it's the part the site's own bundle takes in: the router's loaders (src/router.tsx) and
// src/lib/pagePreload.ts load a view before the page renders, and the page (src/pages/docs/TagDocsPage.tsx) reads it.

import { queryOptions } from '@tanstack/react-query';

import { Languages, type Language } from '@/i18n/languages';

import type { TagDocs, TagDocsView } from './localize';


// a language without both views is a type error
const LOADERS: Readonly<Record<Language, Readonly<Record<TagDocsView, () => Promise<TagDocs>>>>> = Object.freeze({
  [Languages.ENGLISH]: {
    tagscript: async () => (await import('./en/tagscript')).TAGSCRIPT_DOCS_ENGLISH,
    mediascript: async () => (await import('./en/mediascript')).MEDIASCRIPT_DOCS_ENGLISH,
  },
  [Languages.SPANISH]: {
    tagscript: async () => (await import('./es/tagscript')).TAGSCRIPT_DOCS_SPANISH,
    mediascript: async () => (await import('./es/mediascript')).MEDIASCRIPT_DOCS_SPANISH,
  },
  [Languages.PORTUGUESE]: {
    tagscript: async () => (await import('./pt/tagscript')).TAGSCRIPT_DOCS_PORTUGUESE,
    mediascript: async () => (await import('./pt/mediascript')).MEDIASCRIPT_DOCS_PORTUGUESE,
  },
});


// What has arrived, and what is on its way. Module state: the docs are the same for everyone, so the worker keeps
// them between requests like the browser does between pages
const loaded = new Map<string, TagDocs>();
const loading = new Map<string, Promise<TagDocs>>();

function loadKey(view: TagDocsView, language: Language): string {
  return `${language}:${view}`;
}

function load(view: TagDocsView, language: Language): Promise<TagDocs> {
  const key = loadKey(view, language);
  let pending = loading.get(key);
  if (!pending) {
    pending = LOADERS[language][view]().then((docs) => {
      loaded.set(key, docs);
      return docs;
    });
    // a chunk that failed to load can be asked for again
    pending.catch(() => loading.delete(key));
    loading.set(key, pending);
  }
  return pending;
}


// a view in a language once it has loaded, to render it without waiting
export function loadedTagDocs(view: TagDocsView, language: Language): TagDocs | undefined {
  return loaded.get(loadKey(view, language));
}

// Loads a view in a language. A missing overlay chunk (offline, old deploy) gives the English view, like a missing
// dictionary shows English text, so this only fails when the English docs do
export async function loadTagDocs(view: TagDocsView, language: Language): Promise<TagDocs> {
  // asked for alongside the overlay (whose chunk imports it anyway) rather than once that failed, and kept: it's
  // what the page counts from while another language's docs are still loading
  const english = load(view, Languages.ENGLISH);
  if (language === Languages.ENGLISH) {
    return english;
  }
  try {
    const [ docs ] = await Promise.all([load(view, language), english]);
    return docs;
  } catch {
    return english;
  }
}

// TagDocsPage's query. A view that has loaded is its initial data, so the page renders it right away: after the
// router's loader or pagePreload fetched it, which covers the worker's render and the browser hydrating it. Anything
// else (a language switch) is fetched here, while the page shows its spinner
export function tagDocsQuery(view: TagDocsView, language: Language) {
  return queryOptions({
    queryKey: ['tag-docs', view, language],
    queryFn: () => loadTagDocs(view, language),
    initialData: () => loadedTagDocs(view, language),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}
