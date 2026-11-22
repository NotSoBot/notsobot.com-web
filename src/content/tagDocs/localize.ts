// Translated tag docs. Each language is an overlay over the English docs (tagDocs/<language>/), keyed by function id,
// MediaScript command name, guide section id and category id. Anything missing from an overlay (a new function, a new
// note) falls back to English, per field.
// Only prose is translated: names, syntax, example code, argument names, defaults and ranges always come from English.
// The docs are two views, TagScript and MediaScript, and each is loaded on its own in every language (./load.ts). This
// file has no content: it's the types, and how a view's half of an overlay is laid over that view's English docs
// (done once by tagDocs/<language>/tagscript.ts and mediascript.ts, the chunk that holds the half).

import type {
  TagDocCategoryId,
  TagDocExample,
  TagDocFunction,
  TagDocGuideSection,
  TagDocMediaScriptCategoryId,
  TagDocMediaScriptCommand,
} from './types';


export interface TagDocCategory<Id extends string = TagDocCategoryId> {
  id: Id,
  title: string,
  description: string,
}

export interface TagDocCategoryTranslation {
  title: string,
  description: string,
}

export interface TagDocGuideSectionTranslation {
  title?: string,
  body?: string,
  // example results by the example's position; '' keeps the English one (a literal program output)
  results?: ReadonlyArray<string>,
  table?: {
    columns?: ReadonlyArray<string>,
    // cells by row and column position; '' keeps the English cell (syntax like an operator or setting name)
    rows?: ReadonlyArray<ReadonlyArray<string>>,
  },
}

export interface TagDocFunctionTranslation {
  summary?: string,
  description?: string,
  // argument name -> description
  args?: Readonly<Record<string, string>>,
  // example results by position, '' keeps the English one
  results?: ReadonlyArray<string>,
  // notes by position
  notes?: ReadonlyArray<string>,
}

export interface TagDocMediaScriptCommandTranslation {
  summary?: string,
  // argument name -> description
  args?: Readonly<Record<string, string>>,
  results?: ReadonlyArray<string>,
  notes?: ReadonlyArray<string>,
}

export interface TagDocsTranslation {
  categories: Readonly<Partial<Record<TagDocCategoryId, TagDocCategoryTranslation>>>,
  guide: Readonly<Record<string, TagDocGuideSectionTranslation>>,
  functions: Readonly<Record<string, TagDocFunctionTranslation>>,
  mediaScriptCategories: Readonly<Partial<Record<TagDocMediaScriptCategoryId, TagDocCategoryTranslation>>>,
  mediaScriptGuide: Readonly<Record<string, TagDocGuideSectionTranslation>>,
  mediaScriptCommands: Readonly<Record<string, TagDocMediaScriptCommandTranslation>>,
}


// each view's half of an overlay
export type TagScriptTranslation = Pick<TagDocsTranslation, 'categories' | 'guide' | 'functions'>;
export type MediaScriptTranslation = Pick<TagDocsTranslation, 'mediaScriptCategories' | 'mediaScriptGuide' | 'mediaScriptCommands'>;


export type TagDocsView = 'tagscript' | 'mediascript';

export interface TagScriptDocs {
  view: 'tagscript',
  categories: ReadonlyArray<TagDocCategory>,
  guide: ReadonlyArray<TagDocGuideSection>,
  functions: ReadonlyArray<TagDocFunction>,
}

export interface MediaScriptDocs {
  view: 'mediascript',
  categories: ReadonlyArray<TagDocCategory<TagDocMediaScriptCategoryId>>,
  guide: ReadonlyArray<TagDocGuideSection>,
  commands: ReadonlyArray<TagDocMediaScriptCommand>,
}

// what one view shows, in one language
export type TagDocs = TagScriptDocs | MediaScriptDocs;


function pick(translated: string | undefined, english: string): string {
  return translated || english;
}

function localizeExamples(examples: Array<TagDocExample> | undefined, results: ReadonlyArray<string> | undefined): Array<TagDocExample> | undefined {
  if (!examples || !results) {
    return examples;
  }
  return examples.map((example, i) => (example.result) ? {...example, result: pick(results[i], example.result)} : example);
}

function localizeNotes(notes: Array<string> | undefined, translated: ReadonlyArray<string> | undefined): Array<string> | undefined {
  if (!notes || !translated) {
    return notes;
  }
  return notes.map((note, i) => pick(translated[i], note));
}

function localizeCategories<Id extends string>(
  categories: ReadonlyArray<TagDocCategory<Id>>,
  translations: Readonly<Partial<Record<Id, TagDocCategoryTranslation>>>,
): Array<TagDocCategory<Id>> {
  return categories.map((category) => {
    const translation = translations[category.id];
    return (translation) ? {...category, title: pick(translation.title, category.title), description: pick(translation.description, category.description)} : category;
  });
}

function localizeGuide(sections: ReadonlyArray<TagDocGuideSection>, translations: Readonly<Record<string, TagDocGuideSectionTranslation>>): Array<TagDocGuideSection> {
  return sections.map((section) => {
    const translation = translations[section.id];
    if (!translation) {
      return section;
    }
    let table = section.table;
    if (table && translation.table) {
      const { columns, rows } = translation.table;
      table = {
        columns: table.columns.map((column, i) => pick(columns?.[i], column)) as typeof table.columns,
        rows: table.rows.map((row, i) => row.map((cell, j) => pick(rows?.[i]?.[j], cell))),
      };
    }
    return {
      ...section,
      title: pick(translation.title, section.title),
      body: pick(translation.body, section.body),
      examples: localizeExamples(section.examples, translation.results),
      table,
    };
  });
}

function localizeArgs<Arg extends {name: string, description?: string}>(args: Array<Arg> | undefined, translated: Readonly<Record<string, string>> | undefined): Array<Arg> | undefined {
  if (!args || !translated) {
    return args;
  }
  return args.map((arg) => (arg.description && translated[arg.name]) ? {...arg, description: translated[arg.name]} : arg);
}


export function localizeTagScript(english: TagScriptDocs, translation: TagScriptTranslation): TagScriptDocs {
  return {
    view: english.view,
    categories: localizeCategories(english.categories, translation.categories),
    guide: localizeGuide(english.guide, translation.guide),
    functions: english.functions.map((fn) => {
      const entry = translation.functions[fn.id];
      if (!entry) {
        return fn;
      }
      return {
        ...fn,
        summary: pick(entry.summary, fn.summary),
        description: (fn.description) ? pick(entry.description, fn.description) : fn.description,
        args: localizeArgs(fn.args, entry.args),
        examples: localizeExamples(fn.examples, entry.results),
        notes: localizeNotes(fn.notes, entry.notes),
      };
    }),
  };
}

export function localizeMediaScript(english: MediaScriptDocs, translation: MediaScriptTranslation): MediaScriptDocs {
  return {
    view: english.view,
    categories: localizeCategories(english.categories, translation.mediaScriptCategories),
    guide: localizeGuide(english.guide, translation.mediaScriptGuide),
    commands: english.commands.map((command) => {
      const entry = translation.mediaScriptCommands[command.name];
      if (!entry) {
        return command;
      }
      return {
        ...command,
        summary: pick(entry.summary, command.summary),
        args: localizeArgs(command.args, entry.args),
        examples: localizeExamples(command.examples, entry.results),
        notes: localizeNotes(command.notes, entry.notes),
      };
    }),
  };
}
