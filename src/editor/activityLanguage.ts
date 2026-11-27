// The Activity's language, picked in the bot's order (notsobot.ts `resolveLanguage`): their NotSoBot setting → their
// Discord client's → the server's NotSoBot setting → the server's Discord one → English. A step whose language the site
// doesn't have is skipped. The start (src/activity.tsx) only knows the client's (`navigator.language`, which Discord
// sets for the iframe), the rest comes with the activity's context (`locales`) after sign-in, and the running Activity
// switches to it then (`applyActivityLocales`). Kept here so a settings screen can say where the language came from.
import { useSyncExternalStore } from 'react';

import { DEFAULT_LANGUAGE, languageFromLocale, type Language } from '@/i18n';
import { activeLanguage, loadDictionary, setActiveLanguage, type Translations } from '@/i18n/translate';

import type { EditorActivityLocales } from './types';


export type ActivityLanguageSource = 'setting' | 'discord' | 'server_setting' | 'server_discord' | 'default';

export interface ActivityLanguage {
  language: Language,
  source: ActivityLanguageSource,
}


function clientLocale(): string | null {
  return (typeof navigator === 'undefined') ? null : navigator.language;
}

// the same order as the bot, with what the api sent (null: none, a dm's server steps or a step that failed)
export function resolveActivityLanguage(locales: EditorActivityLocales | null): ActivityLanguage {
  const steps: Array<[ActivityLanguageSource, string | null | undefined]> = [
    ['setting', locales?.setting],
    ['discord', clientLocale()],
    ['server_setting', locales?.server_setting],
    ['server_discord', locales?.server_discord],
  ];
  for (const [ source, locale ] of steps) {
    const language = languageFromLocale(locale);
    if (language) {
      return {language, source};
    }
  }
  return {language: DEFAULT_LANGUAGE, source: 'default'};
}


// what src/activity.tsx started on, until the context answers. Worked out on first use, not at import
let current: ActivityLanguage | null = null;
const listeners = new Set<() => void>();

export function activityLanguage(): ActivityLanguage {
  if (!current) {
    current = resolveActivityLanguage(null);
  }
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(next: ActivityLanguage): void {
  const previous = activityLanguage();
  if (previous.language === next.language && previous.source === next.source) {
    return;
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
}

export function useActivityLanguage(): ActivityLanguage {
  return useSyncExternalStore(subscribe, activityLanguage, activityLanguage);
}


// only the latest answer lands, if a slow dictionary finishes after a later one
let applying = 0;

// The context's locales (`GET /editor/activity/<instance_id>`): switches the running Activity when the order lands on
// another language than the one on screen. Components re-render through `useI18n` (it follows `setActiveLanguage`
// without a provider). A dictionary that doesn't load keeps the language it started on, and says so here too
export async function applyActivityLocales(locales: EditorActivityLocales | null): Promise<void> {
  const id = ++applying;
  const next = resolveActivityLanguage(locales);
  if (next.language === activeLanguage()) {
    update(next);
    return;
  }
  let dictionary: Translations;
  try {
    dictionary = await loadDictionary(next.language);
  } catch (error) {
    console.warn('[editor activity] language failed to load', next.language, (error instanceof Error) ? error.message : error);
    return;
  }
  if (id !== applying) {
    return;
  }
  setActiveLanguage(next.language, dictionary);
  update(next);
}
