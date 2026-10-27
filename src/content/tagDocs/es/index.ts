// The Spanish tag docs overlay, loaded on its own (see ../localize.ts) only when the site is in Spanish.

import type { TagDocsTranslation } from '../localize';

import { CATEGORIES_SPANISH, MEDIASCRIPT_CATEGORIES_SPANISH } from './categories';
import { FUNCTIONS_SPANISH_1 } from './functions1';
import { FUNCTIONS_SPANISH_2 } from './functions2';
import { FUNCTIONS_SPANISH_3 } from './functions3';
import { FUNCTIONS_SPANISH_4 } from './functions4';
import { FUNCTIONS_SPANISH_5 } from './functions5';
import { GUIDE_SPANISH } from './guide';
import { MEDIASCRIPT_SPANISH_1 } from './mediascript1';
import { MEDIASCRIPT_SPANISH_2 } from './mediascript2';
import { MEDIASCRIPT_SPANISH_3 } from './mediascript3';
import { MEDIASCRIPT_SPANISH_4 } from './mediascript4';
import { MEDIASCRIPT_SPANISH_5 } from './mediascript5';
import { MEDIASCRIPT_SPANISH_6 } from './mediascript6';
import { MEDIASCRIPT_SPANISH_7 } from './mediascript7';
import { MEDIASCRIPT_SPANISH_8 } from './mediascript8';
import { MEDIASCRIPT_SPANISH_9 } from './mediascript9';
import { MEDIASCRIPT_GUIDE_SPANISH } from './mediascriptGuide';


export const TAG_DOCS_SPANISH: TagDocsTranslation = {
  categories: CATEGORIES_SPANISH,
  guide: GUIDE_SPANISH,
  functions: {
    ...FUNCTIONS_SPANISH_1,
    ...FUNCTIONS_SPANISH_2,
    ...FUNCTIONS_SPANISH_3,
    ...FUNCTIONS_SPANISH_4,
    ...FUNCTIONS_SPANISH_5,
  },
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
