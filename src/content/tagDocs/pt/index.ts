// The Brazilian Portuguese tag docs overlay, loaded on its own (see ../localize.ts) only when the site is in Portuguese.

import type { TagDocsTranslation } from '../localize';

import { CATEGORIES_PORTUGUESE, MEDIASCRIPT_CATEGORIES_PORTUGUESE } from './categories';
import { FUNCTIONS_PORTUGUESE_1 } from './functions1';
import { FUNCTIONS_PORTUGUESE_2 } from './functions2';
import { FUNCTIONS_PORTUGUESE_3 } from './functions3';
import { FUNCTIONS_PORTUGUESE_4 } from './functions4';
import { FUNCTIONS_PORTUGUESE_5 } from './functions5';
import { GUIDE_PORTUGUESE } from './guide';
import { MEDIASCRIPT_PORTUGUESE_1 } from './mediascript1';
import { MEDIASCRIPT_PORTUGUESE_2 } from './mediascript2';
import { MEDIASCRIPT_PORTUGUESE_3 } from './mediascript3';
import { MEDIASCRIPT_PORTUGUESE_4 } from './mediascript4';
import { MEDIASCRIPT_PORTUGUESE_5 } from './mediascript5';
import { MEDIASCRIPT_PORTUGUESE_6 } from './mediascript6';
import { MEDIASCRIPT_PORTUGUESE_7 } from './mediascript7';
import { MEDIASCRIPT_PORTUGUESE_8 } from './mediascript8';
import { MEDIASCRIPT_PORTUGUESE_9 } from './mediascript9';
import { MEDIASCRIPT_GUIDE_PORTUGUESE } from './mediascriptGuide';


export const TAG_DOCS_PORTUGUESE: TagDocsTranslation = {
  categories: CATEGORIES_PORTUGUESE,
  guide: GUIDE_PORTUGUESE,
  functions: {
    ...FUNCTIONS_PORTUGUESE_1,
    ...FUNCTIONS_PORTUGUESE_2,
    ...FUNCTIONS_PORTUGUESE_3,
    ...FUNCTIONS_PORTUGUESE_4,
    ...FUNCTIONS_PORTUGUESE_5,
  },
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
