import { useState } from 'react';

import { activityPrefs, useActivityPrefs } from '@/lib/activityPrefs';

import { GAMES } from './catalog';
import type { GameKind } from './protocol';


// Whether a game's lobby shows its How to play card, and open (HowToPlayCard). The Activity's settings pick
// (`lobbyRules`): until they've played (open until they've finished a game of it, folded after, their own fold or unfold
// wins from then on), always (open every time, a fold lasts the visit) or never. Per viewer, in local storage: storage
// that throws just means the card starts open each time (it's one tap to fold, and never covers anything)

const PLAYED_STORAGE_KEY = 'nsb.activity.game_played.';
const CARD_STORAGE_KEY = 'nsb.activity.lobby_rules.';


function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // this visit only
  }
}


// a game of it finished with them playing (the finished screen, not as a watcher)
export function markGamePlayed(game: GameKind): void {
  if (!read(`${PLAYED_STORAGE_KEY}${game}`)) {
    write(`${PLAYED_STORAGE_KEY}${game}`, '1');
  }
}


// Settings' "Show tips again": every game's card starts open again, as if never played
export function forgetPlayedGames(): void {
  try {
    for (const info of GAMES) {
      window.localStorage.removeItem(`${PLAYED_STORAGE_KEY}${info.id}`);
      window.localStorage.removeItem(`${CARD_STORAGE_KEY}${info.id}`);
    }
  } catch {
    // nothing was stored
  }
}


// [shown, open, toggle]
export function useHowToCard(game: GameKind): [boolean, boolean, () => void] {
  const { lobbyRules } = useActivityPrefs();
  const [ open, setOpen ] = useState(() => {
    if (activityPrefs().lobbyRules === 'always') {
      return true;
    }
    const chosen = read(`${CARD_STORAGE_KEY}${game}`);
    return (chosen) ? chosen === 'open' : !read(`${PLAYED_STORAGE_KEY}${game}`);
  });
  const toggle = () => {
    // "always" starts open every time, a fold there is for this visit
    if (lobbyRules === 'until_played') {
      write(`${CARD_STORAGE_KEY}${game}`, (open) ? 'closed' : 'open');
    }
    setOpen(!open);
  };
  return [lobbyRules !== 'never', open, toggle];
}
