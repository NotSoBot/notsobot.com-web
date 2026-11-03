// The site's languages. English is the source every other dictionary is checked against (see locales/en).

export const Languages = Object.freeze({
  ENGLISH: 'en',
  SPANISH: 'es',
  PORTUGUESE: 'pt',
} as const);

export type Language = typeof Languages[keyof typeof Languages];

export const DEFAULT_LANGUAGE: Language = Languages.ENGLISH;

// shown in the picker in their own language, so someone who can't read the current one can still find theirs
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = Object.freeze({
  [Languages.ENGLISH]: 'English',
  [Languages.SPANISH]: 'Español',
  [Languages.PORTUGUESE]: 'Português',
});


// any locale string ('es', 'es-419', 'en-US', 'es_MX') -> a language we have, matching on the base language
export function languageFromLocale(locale?: string | null): Language | null {
  if (!locale) {
    return null;
  }
  const base = locale.toLowerCase().replace(/_/g, '-').split('-').shift();
  return Object.values(Languages).find((language) => language === base) ?? null;
}


// The worker's stand-in for navigator.languages while it renders a page: the request's Accept-Language, which the
// browser sends from the same list, so the dates and numbers it renders match the ones the browser hydrates with
let serverLocales: ReadonlyArray<string> = [];

export function setServerLocales(locales: ReadonlyArray<string>): void {
  serverLocales = locales;
}

// the locale Intl formats dates and numbers with. the browser's own locale when it's the same language
// ('es-MX' keeps its own date order on the Spanish site), otherwise the language itself
export function intlLocale(language: Language): string {
  const preferred = (typeof window === 'undefined') ? serverLocales : (navigator.languages ?? [navigator.language]);
  return preferred.find((locale) => languageFromLocale(locale) === language) ?? language;
}


// every page of a language lives under its prefix (`/es/premium`). English is the site's root, so its urls never change
export const LANGUAGE_PREFIXES: Readonly<Record<Language, string>> = Object.freeze({
  [Languages.ENGLISH]: '',
  [Languages.SPANISH]: '/es',
  [Languages.PORTUGUESE]: '/pt',
});

// `/en/premium` is English too, for links that want English whatever the visitor's saved choice or browser says, like
// `/es/` does for Spanish. It keeps its prefix while browsing (the router's basename is the url's prefix, not the
// language's), but the unprefixed url stays the canonical one
const PREFIX_ALIASES: Readonly<Record<string, Language>> = Object.freeze({
  '/en': Languages.ENGLISH,
});

const URL_PREFIXES = [
  ...(Object.entries(LANGUAGE_PREFIXES) as Array<[Language, string]>).filter(([ , prefix ]) => prefix).map(([ language, prefix ]) => [prefix, language] as const),
  ...Object.entries(PREFIX_ALIASES),
];

// '/es/premium' -> {language: 'es', path: '/premium', prefix: '/es'}, '/en/premium' -> {language: 'en', ..., prefix: '/en'},
// '/premium' -> {language: null, path: '/premium', prefix: ''}. `prefix` is the router's basename for the url
export function splitLanguagePath(pathname: string): {language: Language | null, path: string, prefix: string} {
  // react router matches case-insensitively, so `/ES/premium` is the Spanish page too
  const lower = pathname.toLowerCase();
  for (const [ prefix, language ] of URL_PREFIXES) {
    if (lower === prefix || lower.startsWith(`${prefix}/`)) {
      return {language, path: pathname.slice(prefix.length) || '/', prefix};
    }
  }
  return {language: null, path: pathname, prefix: ''};
}

// '/premium' in Spanish -> '/es/premium', '/' in Spanish -> '/es'
export function languagePath(language: Language, path: string): string {
  const prefix = LANGUAGE_PREFIXES[language];
  return (prefix && path === '/') ? prefix : `${prefix}${path}`;
}
