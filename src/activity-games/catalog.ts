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
  // the guide's quick rules its lobby's How to play card shows (indexes into `quick`, the same in every language): the
  // ones about playing, not about getting into a room
  lobbyRules: ReadonlyArray<number>,
}

export const GAMES: ReadonlyArray<GameInfo> = [
  {id: 'flag_guesser', icon: Flag, accent: 'bg-success/20 text-success-text', title: 'games.flag.title', description: 'games.tab.flag_description', guide: 'flag-guesser', lobbyRules: [0, 2, 4]},
  {id: 'letter_trail', icon: LetterText, accent: 'bg-brand/20 text-brand-text', title: 'games.letters.title', description: 'games.tab.letters_description', guide: 'letter-trail', lobbyRules: [1, 2, 3, 4]},
];

// a room from an api that doesn't say its game is Flag Guesser's
export function gameInfo(id: GameKind | null | undefined): GameInfo {
  return GAMES.find((game) => game.id === id) ?? GAMES[0];
}
