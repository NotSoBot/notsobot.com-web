// The English MediaScript docs: its guide, the categories and every command. A chunk of its own (see ../load.ts),
// and what each language's MediaScript docs are built over (../<language>/mediascript.ts).

import type { MediaScriptDocs } from '../localize';
import { MEDIASCRIPT_CATEGORIES, MEDIASCRIPT_COMMANDS, MEDIASCRIPT_GUIDE } from '../mediascript';
import type { TagDocMediaScriptCommand } from '../types';


export const MEDIASCRIPT_COMMANDS_SORTED: ReadonlyArray<TagDocMediaScriptCommand> = [...MEDIASCRIPT_COMMANDS]
  .sort((a, b) => a.name.localeCompare(b.name));


export const MEDIASCRIPT_DOCS_ENGLISH: MediaScriptDocs = Object.freeze({
  view: 'mediascript',
  categories: MEDIASCRIPT_CATEGORIES,
  guide: MEDIASCRIPT_GUIDE,
  commands: MEDIASCRIPT_COMMANDS_SORTED,
});
