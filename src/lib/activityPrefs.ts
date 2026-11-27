import { useSyncExternalStore } from 'react';


// The Activity's own settings (its settings sheet, src/activity-games/ActivitySettings.tsx), per viewer in local
// storage. Storage that throws keeps the defaults, and a change still holds for the visit. The language isn't one: it
// follows the bot's (src/editor/activityLanguage.ts)

// the lobby's How to play card: open until they've finished a game of it then folded (their own fold wins), open every
// time, or not shown at all
export type LobbyRulesPref = 'until_played' | 'always' | 'never';

export interface ActivityPrefs {
  lobbyRules: LobbyRulesPref,
  // the dot on a How to play button whose guide they haven't opened
  guideDots: boolean,
  // animations and transitions off, as with the system's reduce motion (which always applies too)
  lessMotion: boolean,
}

const STORAGE_KEY = 'nsb.activity.prefs';

export const DEFAULT_ACTIVITY_PREFS: ActivityPrefs = {lobbyRules: 'until_played', guideDots: true, lessMotion: false};

const LOBBY_RULES: ReadonlyArray<LobbyRulesPref> = ['until_played', 'always', 'never'];


function read(): ActivityPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = (raw) ? JSON.parse(raw) as Partial<Record<keyof ActivityPrefs, unknown>> : {};
    return {
      lobbyRules: (LOBBY_RULES.includes(stored.lobbyRules as LobbyRulesPref)) ? stored.lobbyRules as LobbyRulesPref : DEFAULT_ACTIVITY_PREFS.lobbyRules,
      guideDots: (typeof stored.guideDots === 'boolean') ? stored.guideDots : DEFAULT_ACTIVITY_PREFS.guideDots,
      lessMotion: (typeof stored.lessMotion === 'boolean') ? stored.lessMotion : DEFAULT_ACTIVITY_PREFS.lessMotion,
    };
  } catch {
    return DEFAULT_ACTIVITY_PREFS;
  }
}

// one object until a change, useSyncExternalStore compares snapshots by identity
let current: ActivityPrefs | null = null;
const listeners = new Set<() => void>();

export function activityPrefs(): ActivityPrefs {
  if (!current) {
    current = (typeof window === 'undefined') ? DEFAULT_ACTIVITY_PREFS : read();
  }
  return current;
}

export function setActivityPrefs(changes: Partial<ActivityPrefs>): void {
  current = {...activityPrefs(), ...changes};
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // this visit only
  }
  applyActivityMotion();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useActivityPrefs(): ActivityPrefs {
  return useSyncExternalStore(subscribe, activityPrefs, () => DEFAULT_ACTIVITY_PREFS);
}


// Less motion as `<html data-motion="reduce">`: index.css stops animations and transitions under it like it does for
// the system setting, and prefersReducedMotion (./motion) says yes for the ones started from code
export function applyActivityMotion(): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (activityPrefs().lessMotion) {
    document.documentElement.dataset.motion = 'reduce';
  } else {
    delete document.documentElement.dataset.motion;
  }
}
