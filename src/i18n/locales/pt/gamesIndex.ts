import type { GamesTranslations } from '../../translate';

import { Editor } from './editor';
import { Games } from './games';
import { GamesSite } from './gamesSite';


export const PortugueseGames: GamesTranslations = Object.freeze({
  ...Games,
  ...Editor,
  ...GamesSite,
});
