// The Brazilian Portuguese TagScript docs: this half of the overlay (the guide, the categories and the functions) over
// the English docs. A chunk of its own (see ../load.ts), only fetched when the TagScript docs are opened in Portuguese.

import { TAGSCRIPT_DOCS_ENGLISH } from '../en/tagscript';
import { localizeTagScript, type TagScriptTranslation } from '../localize';

import { CATEGORIES_PORTUGUESE } from './categories';
import { FUNCTIONS_PORTUGUESE_1 } from './functions1';
import { FUNCTIONS_PORTUGUESE_2 } from './functions2';
import { FUNCTIONS_PORTUGUESE_3 } from './functions3';
import { FUNCTIONS_PORTUGUESE_4 } from './functions4';
import { FUNCTIONS_PORTUGUESE_5 } from './functions5';
import { GUIDE_PORTUGUESE } from './guide';


export const TAGSCRIPT_PORTUGUESE: TagScriptTranslation = {
  categories: CATEGORIES_PORTUGUESE,
  guide: GUIDE_PORTUGUESE,
  functions: {
    ...FUNCTIONS_PORTUGUESE_1,
    ...FUNCTIONS_PORTUGUESE_2,
    ...FUNCTIONS_PORTUGUESE_3,
    ...FUNCTIONS_PORTUGUESE_4,
    ...FUNCTIONS_PORTUGUESE_5,
  },
};


export const TAGSCRIPT_DOCS_PORTUGUESE = localizeTagScript(TAGSCRIPT_DOCS_ENGLISH, TAGSCRIPT_PORTUGUESE);
