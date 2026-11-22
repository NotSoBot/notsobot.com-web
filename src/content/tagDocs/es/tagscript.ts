// The Spanish TagScript docs: this half of the overlay (the guide, the categories and the functions) over the English
// docs. A chunk of its own (see ../load.ts), only fetched when the TagScript docs are opened in Spanish.

import { TAGSCRIPT_DOCS_ENGLISH } from '../en/tagscript';
import { localizeTagScript, type TagScriptTranslation } from '../localize';

import { CATEGORIES_SPANISH } from './categories';
import { FUNCTIONS_SPANISH_1 } from './functions1';
import { FUNCTIONS_SPANISH_2 } from './functions2';
import { FUNCTIONS_SPANISH_3 } from './functions3';
import { FUNCTIONS_SPANISH_4 } from './functions4';
import { FUNCTIONS_SPANISH_5 } from './functions5';
import { GUIDE_SPANISH } from './guide';


export const TAGSCRIPT_SPANISH: TagScriptTranslation = {
  categories: CATEGORIES_SPANISH,
  guide: GUIDE_SPANISH,
  functions: {
    ...FUNCTIONS_SPANISH_1,
    ...FUNCTIONS_SPANISH_2,
    ...FUNCTIONS_SPANISH_3,
    ...FUNCTIONS_SPANISH_4,
    ...FUNCTIONS_SPANISH_5,
  },
};


export const TAGSCRIPT_DOCS_SPANISH = localizeTagScript(TAGSCRIPT_DOCS_ENGLISH, TAGSCRIPT_SPANISH);
