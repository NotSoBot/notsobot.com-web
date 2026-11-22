// The whole Spanish tag docs overlay. The page never loads it in one piece: each view's half is fetched on its own
// (./tagscript.ts and ./mediascript.ts, see ../load.ts).

import type { TagDocsTranslation } from '../localize';

import { MEDIASCRIPT_SPANISH } from './mediascript';
import { TAGSCRIPT_SPANISH } from './tagscript';


export const TAG_DOCS_SPANISH: TagDocsTranslation = {...TAGSCRIPT_SPANISH, ...MEDIASCRIPT_SPANISH};
