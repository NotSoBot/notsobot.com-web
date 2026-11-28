// notsogames.com's strings (src/games), loaded by its entry (`loadGamesText` in i18n/translate.ts): the games' and the
// editor's (the game screens and their room dialogs use both, the dashboard loads the same files) and the site's own
import { Editor } from './editor';
import { Games } from './games';
import { GamesSite } from './gamesSite';


export const EnglishGames = Object.freeze({
  ...Games,
  ...Editor,
  ...GamesSite,
});
