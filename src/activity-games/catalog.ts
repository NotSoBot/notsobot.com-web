import { Flag, LetterText, type LucideIcon } from 'lucide-react';

import type { GuideSlug } from '@/content/guides';
import type { TranslationKey } from '@/i18n';

import type { GameKind } from './protocol';


// The Activity's games as the Games tab and the room browser show them: a new game is one entry here (and its `GameKind`)
export interface GameInfo {
  id: GameKind,
  icon: LucideIcon,
  // its icon's tile
  accent: string,
  title: TranslationKey,
  description: TranslationKey,
  // its How to play sheet's guide (src/content/guides)
  guide: GuideSlug,
}

export const GAMES: ReadonlyArray<GameInfo> = [
  {id: 'flag_guesser', icon: Flag, accent: 'bg-success/20 text-success-text', title: 'games.flag.title', description: 'games.tab.flag_description', guide: 'flag-guesser'},
  {id: 'letter_trail', icon: LetterText, accent: 'bg-brand/20 text-brand-text', title: 'games.letters.title', description: 'games.tab.letters_description', guide: 'letter-trail'},
];

// a room from an api that doesn't say its game is Flag Guesser's
export function gameInfo(id: GameKind | null | undefined): GameInfo {
  return GAMES.find((game) => game.id === id) ?? GAMES[0];
}
