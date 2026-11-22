// Every English name in one place, for anything that wants the whole docs at once. Nothing the browser loads does:
// the page takes one view's content at a time (./load.ts), and importing from here would put both views back in a
// single chunk.

export { TAG_DOC_CATEGORIES } from './categories';
export { MEDIASCRIPT_COMMANDS_SORTED } from './en/mediascript';
export { TAG_DOC_FUNCTIONS } from './en/tagscript';
export { TAG_DOC_GUIDE } from './guide';
export * from './lookup';
export { MEDIASCRIPT_CATEGORIES, MEDIASCRIPT_GUIDE } from './mediascript';
export * from './types';
