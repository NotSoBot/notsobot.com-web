// The whole Brazilian Portuguese tag docs overlay. The page never loads it in one piece: each view's half is fetched
// on its own (./tagscript.ts and ./mediascript.ts, see ../load.ts).

import type { TagDocsTranslation } from '../localize';

import { MEDIASCRIPT_PORTUGUESE } from './mediascript';
import { TAGSCRIPT_PORTUGUESE } from './tagscript';


export const TAG_DOCS_PORTUGUESE: TagDocsTranslation = {...TAGSCRIPT_PORTUGUESE, ...MEDIASCRIPT_PORTUGUESE};
