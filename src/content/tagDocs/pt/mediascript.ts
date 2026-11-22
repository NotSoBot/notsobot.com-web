// The Brazilian Portuguese MediaScript docs: this half of the overlay (its guide, the categories and the commands)
// over the English docs. A chunk of its own (see ../load.ts), only fetched when the MediaScript docs are opened in
// Portuguese.

import { MEDIASCRIPT_DOCS_ENGLISH } from '../en/mediascript';
import { localizeMediaScript, type MediaScriptTranslation } from '../localize';

import { MEDIASCRIPT_PORTUGUESE_1 } from './mediascript1';
import { MEDIASCRIPT_PORTUGUESE_2 } from './mediascript2';
import { MEDIASCRIPT_PORTUGUESE_3 } from './mediascript3';
import { MEDIASCRIPT_PORTUGUESE_4 } from './mediascript4';
import { MEDIASCRIPT_PORTUGUESE_5 } from './mediascript5';
import { MEDIASCRIPT_PORTUGUESE_6 } from './mediascript6';
import { MEDIASCRIPT_PORTUGUESE_7 } from './mediascript7';
import { MEDIASCRIPT_PORTUGUESE_8 } from './mediascript8';
import { MEDIASCRIPT_PORTUGUESE_9 } from './mediascript9';
import { MEDIASCRIPT_CATEGORIES_PORTUGUESE } from './mediascriptCategories';
import { MEDIASCRIPT_GUIDE_PORTUGUESE } from './mediascriptGuide';


export const MEDIASCRIPT_PORTUGUESE: MediaScriptTranslation = {
  mediaScriptCategories: MEDIASCRIPT_CATEGORIES_PORTUGUESE,
  mediaScriptGuide: MEDIASCRIPT_GUIDE_PORTUGUESE,
  mediaScriptCommands: {
    ...MEDIASCRIPT_PORTUGUESE_1,
    ...MEDIASCRIPT_PORTUGUESE_2,
    ...MEDIASCRIPT_PORTUGUESE_3,
    ...MEDIASCRIPT_PORTUGUESE_4,
    ...MEDIASCRIPT_PORTUGUESE_5,
    ...MEDIASCRIPT_PORTUGUESE_6,
    ...MEDIASCRIPT_PORTUGUESE_7,
    ...MEDIASCRIPT_PORTUGUESE_8,
    ...MEDIASCRIPT_PORTUGUESE_9,
  },
};


export const MEDIASCRIPT_DOCS_PORTUGUESE = localizeMediaScript(MEDIASCRIPT_DOCS_ENGLISH, MEDIASCRIPT_PORTUGUESE);
