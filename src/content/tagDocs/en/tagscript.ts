// The English TagScript docs: the guide, the categories and every function. A chunk of its own (see ../load.ts),
// and what each language's TagScript docs are built over (../<language>/tagscript.ts).

import { TAG_DOC_CATEGORIES } from '../categories';
import { TAG_DOC_FUNCTIONS_PART1 } from '../functions/part1';
import { TAG_DOC_FUNCTIONS_PART2 } from '../functions/part2';
import { TAG_DOC_FUNCTIONS_PART3 } from '../functions/part3';
import { TAG_DOC_FUNCTIONS_PART4 } from '../functions/part4';
import { TAG_DOC_FUNCTIONS_PART5 } from '../functions/part5';
import { TAG_DOC_GUIDE } from '../guide';
import type { TagScriptDocs } from '../localize';
import type { TagDocFunction } from '../types';


export const TAG_DOC_FUNCTIONS: ReadonlyArray<TagDocFunction> = [
  ...TAG_DOC_FUNCTIONS_PART1,
  ...TAG_DOC_FUNCTIONS_PART2,
  ...TAG_DOC_FUNCTIONS_PART3,
  ...TAG_DOC_FUNCTIONS_PART4,
  ...TAG_DOC_FUNCTIONS_PART5,
].sort((a, b) => a.names[0].localeCompare(b.names[0]));


export const TAGSCRIPT_DOCS_ENGLISH: TagScriptDocs = Object.freeze({
  view: 'tagscript',
  categories: TAG_DOC_CATEGORIES,
  guide: TAG_DOC_GUIDE,
  functions: TAG_DOC_FUNCTIONS,
});
