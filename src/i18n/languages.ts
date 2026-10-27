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


// the locale Intl formats dates and numbers with. the browser's own locale when it's the same language
// ('es-MX' keeps its own date order on the Spanish site), otherwise the language itself
export function intlLocale(language: Language): string {
  const preferred = (typeof navigator === 'undefined') ? [] : (navigator.languages ?? [navigator.language]);
  return preferred.find((locale) => languageFromLocale(locale) === language) ?? language;
}


// every page of a language lives under its prefix (`/es/premium`). English is the site's root, so its urls never change
export const LANGUAGE_PREFIXES: Readonly<Record<Language, string>> = Object.freeze({
  [Languages.ENGLISH]: '',
  [Languages.SPANISH]: '/es',
  [Languages.PORTUGUESE]: '/pt',
});

// '/es/premium' -> {language: 'es', path: '/premium'}, '/premium' -> {language: null, path: '/premium'}
export function splitLanguagePath(pathname: string): {language: Language | null, path: string} {
  for (const [ language, prefix ] of Object.entries(LANGUAGE_PREFIXES) as Array<[Language, string]>) {
    if (!prefix) {
      continue;
    }
    // react router matches case-insensitively, so `/ES/premium` is the Spanish page too
    const lower = pathname.toLowerCase();
    if (lower === prefix || lower.startsWith(`${prefix}/`)) {
      return {language, path: pathname.slice(prefix.length) || '/'};
    }
  }
  return {language: null, path: pathname};
}

// '/premium' in Spanish -> '/es/premium', '/' in Spanish -> '/es'
export function languagePath(language: Language, path: string): string {
  const prefix = LANGUAGE_PREFIXES[language];
  return (prefix && path === '/') ? prefix : `${prefix}${path}`;
}
