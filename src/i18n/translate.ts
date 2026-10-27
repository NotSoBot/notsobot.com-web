import { DEFAULT_LANGUAGE, intlLocale, Languages, type Language } from './languages';
import { English as EnglishSite } from './locales/en';
import type { EnglishDashboard } from './locales/en/dashboardIndex';


// the public site's strings (always loaded) and the dashboard's (loaded once someone opens it)
export type SiteKey = keyof typeof EnglishSite;
export type DashboardKey = keyof typeof EnglishDashboard;
export type TranslationKey = SiteKey | DashboardKey;
// every language has every key, so a string added to English without its translation is a type error
export type SiteTranslations = Readonly<Record<SiteKey, string>>;
export type DashboardTranslations = Readonly<Record<DashboardKey, string>>;
// a language's whole dictionary. Its dashboard keys are only there once the dashboard's text has loaded, which the
// dashboard's route waits for, so nothing outside the dashboard may use them
export type Translations = Readonly<Record<TranslationKey, string>>;
// values are turned into strings with String(), so numbers can be passed in directly like in template literals
export type TranslationVariables = Record<string, unknown>;

// `<base>_one` / `<base>_other` pairs (plus `_zero`, `_many` etc where a language needs them), picked by count
export type PluralKey = TranslationKey extends infer K ? (K extends `${infer Base}_other` ? Base : never) : never;


// English's site strings ship with the site, everything else is its own chunk, only fetched when someone needs it
const SITE_LOADERS: Readonly<Record<Exclude<Language, typeof Languages.ENGLISH>, () => Promise<SiteTranslations>>> = Object.freeze({
  [Languages.SPANISH]: async () => (await import('./locales/es')).Spanish,
  [Languages.PORTUGUESE]: async () => (await import('./locales/pt')).Portuguese,
});

const DASHBOARD_LOADERS: Readonly<Record<Language, () => Promise<DashboardTranslations>>> = Object.freeze({
  [Languages.ENGLISH]: async () => (await import('./locales/en/dashboardIndex')).EnglishDashboard,
  [Languages.SPANISH]: async () => (await import('./locales/es/dashboardIndex')).SpanishDashboard,
  [Languages.PORTUGUESE]: async () => (await import('./locales/pt/dashboardIndex')).PortugueseDashboard,
});

// One object per language. The dashboard's strings are added to it in place, so the provider and every `t()` see
// them without swapping dictionaries
const dictionaries: Partial<Record<Language, Record<string, string>>> = {[Languages.ENGLISH]: {...EnglishSite}};
const English = dictionaries[Languages.ENGLISH] as Translations;

// each language's site and dashboard parts are fetched once, even when asked for twice at the same time. a failed
// fetch is forgotten so the next call tries again
const loading = new Map<string, Promise<void>>();

function once(key: string, load: () => Promise<void>): Promise<void> {
  let promise = loading.get(key);
  if (!promise) {
    promise = load();
    promise.catch(() => loading.delete(key));
    loading.set(key, promise);
  }
  return promise;
}

// set once the dashboard has been opened, from then on a language switch loads its dashboard strings too
let dashboardWanted = false;

export async function loadDictionary(language: Language): Promise<Translations> {
  await once(`site:${language}`, async () => {
    if (!dictionaries[language]) {
      dictionaries[language] = {...await SITE_LOADERS[language as Exclude<Language, typeof Languages.ENGLISH>]()};
    }
  });
  if (dashboardWanted) {
    await once(`dashboard:${language}`, async () => {
      Object.assign(dictionaries[language]!, await DASHBOARD_LOADERS[language]());
    });
  }
  return dictionaries[language] as Translations;
}

// the dashboard's route waits on this before it renders
export async function loadDashboardText(): Promise<void> {
  dashboardWanted = true;
  await loadDictionary(active.language);
}

export function englishDictionary(): Translations {
  return English;
}


// The language on screen right now. The provider keeps it in sync, so code outside React (the date/number
// formatters, toasts fired from mutation callbacks) can use it; components should use `useI18n()` so they re-render.
let active: {language: Language, dictionary: Translations} = {language: DEFAULT_LANGUAGE, dictionary: English};

export function activeLanguage(): Language {
  return active.language;
}

export function activeDictionary(): Translations {
  return active.dictionary;
}

export function setActiveLanguage(language: Language, dictionary: Translations): void {
  active = {language, dictionary};
  document.documentElement.lang = language;
}


function interpolate(text: string, variables?: TranslationVariables): string {
  if (!variables) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in variables) ? String(variables[name]) : match);
}

// the active language's keys count too, the English dashboard strings are only loaded when English is on screen
export function hasTranslation(key: string): key is TranslationKey {
  return key in English || key in active.dictionary;
}

export function translateWith(dictionary: Translations, key: TranslationKey, variables?: TranslationVariables): string {
  return interpolate(dictionary[key] ?? English[key] ?? key, variables);
}


const pluralRules = new Map<Language, Intl.PluralRules>();

// `{count}` is filled in already formatted (`1,234`); a category the language doesn't have a string for uses `_other`
export function pluralWith(
  language: Language,
  dictionary: Translations,
  key: PluralKey,
  count: number,
  variables?: TranslationVariables,
): string {
  let rules = pluralRules.get(language);
  if (!rules) {
    rules = new Intl.PluralRules(language);
    pluralRules.set(language, rules);
  }
  const specific = `${key}_${rules.select(count)}`;
  const resolved = ((specific in dictionary) ? specific : `${key}_other`) as TranslationKey;
  return translateWith(dictionary, resolved, {count: count.toLocaleString(intlLocale(language)), ...variables});
}


// labels that are a translation key for some entries and plain text for others (the staff pages stay in English)
export function maybeTranslate(value: string): string {
  return (hasTranslation(value)) ? translate(value) : value;
}


// for event handlers and callbacks outside render; in components use `useI18n().t`
export function translate(key: TranslationKey, variables?: TranslationVariables): string {
  return translateWith(active.dictionary, key, variables);
}

export function translatePlural(key: PluralKey, count: number, variables?: TranslationVariables): string {
  return pluralWith(active.language, active.dictionary, key, count, variables);
}
