import { useQuery } from '@tanstack/react-query';
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

// straight from the context, the auth index pulls in components that use `useI18n` (a circular import)
import { useAuth } from '@/auth/AuthContext';
import { readStored, removeStored, writeStored } from '@/hooks/usePersistentState';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queries';

import { DEFAULT_LANGUAGE, LANGUAGE_PREFIXES, languageFromLocale, languagePath, splitLanguagePath, type Language } from './languages';
import {
  activeDictionary,
  activeLanguage,
  englishDictionary,
  loadDictionary,
  pluralWith,
  setActiveLanguage,
  translateWith,
  type PluralKey,
  type TranslationKey,
  type Translations,
  type TranslationVariables,
} from './translate';


// the language picked in the footer, kept per browser. nothing stored means automatic
const LANGUAGE_KEY = 'language';

function storedLanguage(): Language | null {
  return languageFromLocale(readStored<string | null>(LANGUAGE_KEY, null));
}

function browserLanguage(): Language | null {
  for (const locale of navigator.languages ?? [navigator.language]) {
    const language = languageFromLocale(locale);
    if (language) {
      return language;
    }
  }
  return null;
}


// the language in the address bar. pages without a prefix are English
function urlLanguage(): Language {
  return splitLanguagePath(window.location.pathname).language ?? DEFAULT_LANGUAGE;
}

// `path` is without the language prefix and may carry its own search/hash, the current page's path when left out
function replaceUrl(language: Language, path?: string): void {
  const target = new URL(path ?? `${splitLanguagePath(window.location.pathname).path}${window.location.search}${window.location.hash}`, window.location.origin);
  window.history.replaceState(window.history.state, '', `${languagePath(language, target.pathname)}${target.search}${target.hash}`);
}

// a missing chunk (offline, old deploy) shows English text, but the language and its urls stay put
async function dictionaryFor(language: Language): Promise<Translations> {
  try {
    return await loadDictionary(language);
  } catch {
    return englishDictionary();
  }
}


// Whether the page opened without a language in its url. Then the language was picked for the visitor (their saved
// choice or browser), and their NotSoBot language setting may still override it once it loads. A url with a prefix
// is someone asking for that language, which only the picker changes.
let automatic = false;

// Called before the first render, so a Spanish visitor never sees the English page flash first. A url without a
// language moves to the preferred one's (`/premium` -> `/es/premium`) before the router reads it.
export async function initI18n(): Promise<void> {
  let language = splitLanguagePath(window.location.pathname).language;
  automatic = !language;
  if (!language) {
    language = storedLanguage() ?? browserLanguage() ?? DEFAULT_LANGUAGE;
    if (language !== DEFAULT_LANGUAGE) {
      replaceUrl(language);
    }
  }
  setActiveLanguage(language, await dictionaryFor(language));
}


// The router's basename is the language prefix, so every link and navigate() stays in the language without knowing
// about it. Switching languages swaps in a router for the other prefix. One at a time, kept outside React so
// StrictMode's double renders can't leave a second one listening to the history.
type AppRouter = ReturnType<typeof createBrowserRouter>;
let mounted: {language: Language, router: AppRouter} | null = null;

function routerFor(language: Language, create: (basename: string) => AppRouter): AppRouter {
  if (mounted?.language !== language) {
    mounted?.router.dispose();
    mounted = {language, router: create(LANGUAGE_PREFIXES[language])};
  }
  return mounted.router;
}


// `<name>text</name>` in a string becomes `components.name('text')`, for links and bold text inside a sentence
export type RichComponents = Record<string, (chunk: string) => ReactNode>;

function renderRich(text: string, components: RichComponents): ReactNode {
  const nodes: Array<ReactNode> = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/gs;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (last < match.index) {
      nodes.push(text.slice(last, match.index));
    }
    const render = components[match[1]];
    nodes.push(<Fragment key={nodes.length}>{(render) ? render(match[2]) : match[2]}</Fragment>);
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}


export interface I18nContextValue {
  language: Language,
  // the language picked in the footer, null while it's automatic
  chosen: Language | null,
  // saves the choice in this browser and moves to that language's url, null goes back to automatic
  setLanguage: (language: Language | null) => void,
  // moves to a language's url without saving it, at `path` (without a prefix) or the same page
  switchLanguage: (language: Language, path?: string) => void,
  t: (key: TranslationKey, variables?: TranslationVariables) => string,
  plural: (key: PluralKey, count: number, variables?: TranslationVariables) => string,
  rich: (key: TranslationKey, components: RichComponents, variables?: TranslationVariables) => ReactNode,
}

const I18nContext = createContext<I18nContextValue | null>(null);


// The site language is the one in the url. Pages without one (and links from the bot) move to the language picked in
// the footer, else the user's NotSoBot language setting (when logged in), else the browser's, else stay English.
// Renders the router, since its basename is the language. Has to sit inside the AuthProvider for the setting.
export function I18nProvider({ createRouter }: {createRouter: (basename: string) => AppRouter}) {
  const { isAuthenticated, token } = useAuth();
  const [ chosen, setChosen ] = useState<Language | null>(storedLanguage);
  // starts on what initI18n loaded
  const [ current, setCurrent ] = useState<{language: Language, dictionary: Translations, router: AppRouter}>(() => ({
    language: activeLanguage(),
    dictionary: activeDictionary(),
    router: routerFor(activeLanguage(), createRouter),
  }));

  // only the latest switch lands, if a slow chunk finishes after a later one
  const switches = useRef(0);
  const switchLanguage = useCallback((language: Language, path?: string) => {
    const id = ++switches.current;
    void dictionaryFor(language).then((dictionary) => {
      if (id !== switches.current) {
        return;
      }
      // already in that language, so it's just a page change for the router that's there
      if (language === activeLanguage()) {
        if (path !== undefined) {
          void mounted?.router.navigate(path, {replace: true});
        }
        return;
      }
      replaceUrl(language, path);
      setActiveLanguage(language, dictionary);
      setCurrent({language, dictionary, router: routerFor(language, createRouter)});
    });
  }, [createRouter]);

  // back/forward past a language switch lands on the other language's url
  useEffect(() => {
    const onPopState = () => {
      const language = urlLanguage();
      if (language !== activeLanguage()) {
        switchLanguage(language);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [switchLanguage]);

  // shares the cache with the dashboard's settings page, so changing the bot's language there switches the site too
  const settingsQuery = useQuery({
    queryKey: queryKeys.meSettings(token),
    queryFn: ({ signal }) => api.fetchMeSettings(signal),
    enabled: isAuthenticated && !chosen,
    staleTime: 5 * 60 * 1000,
  });
  const settingsLanguage = (isAuthenticated) ? languageFromLocale(settingsQuery.data?.locale) : null;

  const previousSettings = useRef<Language | null>(null);
  useEffect(() => {
    const previous = previousSettings.current;
    previousSettings.current = settingsLanguage;
    if (chosen || !settingsLanguage || settingsLanguage === previous) {
      return;
    }
    // the first answer only replaces a language picked automatically, a later change of the setting always applies
    if ((previous || automatic) && settingsLanguage !== activeLanguage()) {
      switchLanguage(settingsLanguage);
    }
  }, [chosen, settingsLanguage, switchLanguage]);

  const setLanguage = useCallback((language: Language | null) => {
    if (language) {
      writeStored(LANGUAGE_KEY, language);
    } else {
      removeStored(LANGUAGE_KEY);
    }
    setChosen(language);
    switchLanguage(language ?? settingsLanguage ?? browserLanguage() ?? DEFAULT_LANGUAGE);
  }, [settingsLanguage, switchLanguage]);

  const value = useMemo<I18nContextValue>(() => {
    const { language, dictionary } = current;
    return {
      language,
      chosen,
      setLanguage,
      switchLanguage,
      t: (key, variables) => translateWith(dictionary, key, variables),
      plural: (key, count, variables) => pluralWith(language, dictionary, key, count, variables),
      rich: (key, components, variables) => renderRich(translateWith(dictionary, key, variables), components),
    };
  }, [chosen, current, setLanguage, switchLanguage]);

  return (
    <I18nContext.Provider value={value}>
      {/* keyed: RouterProvider keeps the state of the router it was mounted with, a new one needs a new provider */}
      <RouterProvider key={current.language} router={current.router}/>
    </I18nContext.Provider>
  );
}


// Outside the provider (an error page rendered after it broke, a hot reload swapping the context) this falls back to
// whatever language is active, without switching. The error pages have to render no matter what
export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? fallbackContext();
}

function fallbackContext(): I18nContextValue {
  const language = activeLanguage();
  const dictionary = activeDictionary();
  return {
    language,
    chosen: null,
    setLanguage: () => undefined,
    switchLanguage: () => undefined,
    t: (key, variables) => translateWith(dictionary, key, variables),
    plural: (key, count, variables) => pluralWith(language, dictionary, key, count, variables),
    rich: (key, components, variables) => renderRich(translateWith(dictionary, key, variables), components),
  };
}
