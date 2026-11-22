// The Spanish MediaScript docs: this half of the overlay (its guide, the categories and the commands) over the
// English docs. A chunk of its own (see ../load.ts), only fetched when the MediaScript docs are opened in Spanish.

import { MEDIASCRIPT_DOCS_ENGLISH } from '../en/mediascript';
import { localizeMediaScript, type MediaScriptTranslation } from '../localize';

import { MEDIASCRIPT_SPANISH_1 } from './mediascript1';
import { MEDIASCRIPT_SPANISH_2 } from './mediascript2';
import { MEDIASCRIPT_SPANISH_3 } from './mediascript3';
import { MEDIASCRIPT_SPANISH_4 } from './mediascript4';
import { MEDIASCRIPT_SPANISH_5 } from './mediascript5';
import { MEDIASCRIPT_SPANISH_6 } from './mediascript6';
import { MEDIASCRIPT_SPANISH_7 } from './mediascript7';
import { MEDIASCRIPT_SPANISH_8 } from './mediascript8';
import { MEDIASCRIPT_SPANISH_9 } from './mediascript9';
import { MEDIASCRIPT_CATEGORIES_SPANISH } from './mediascriptCategories';
import { MEDIASCRIPT_GUIDE_SPANISH } from './mediascriptGuide';


export const MEDIASCRIPT_SPANISH: MediaScriptTranslation = {
  mediaScriptCategories: MEDIASCRIPT_CATEGORIES_SPANISH,
  mediaScriptGuide: MEDIASCRIPT_GUIDE_SPANISH,
  mediaScriptCommands: {
    ...MEDIASCRIPT_SPANISH_1,
    ...MEDIASCRIPT_SPANISH_2,
    ...MEDIASCRIPT_SPANISH_3,
    ...MEDIASCRIPT_SPANISH_4,
    ...MEDIASCRIPT_SPANISH_5,
    ...MEDIASCRIPT_SPANISH_6,
    ...MEDIASCRIPT_SPANISH_7,
    ...MEDIASCRIPT_SPANISH_8,
    ...MEDIASCRIPT_SPANISH_9,
  },
};


export const MEDIASCRIPT_DOCS_SPANISH = localizeMediaScript(MEDIASCRIPT_DOCS_ENGLISH, MEDIASCRIPT_SPANISH);
