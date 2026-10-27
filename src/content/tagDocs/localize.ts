// Translated tag docs. Each language is an overlay over the English docs (tagDocs/<language>/), keyed by function id,
// MediaScript command name, guide section id and category id, and loaded with a dynamic import only when that
// language is picked. Anything missing from an overlay (a new function, a new note) falls back to English, per field.
// Only prose is translated: names, syntax, example code, argument names, defaults and ranges always come from English.

import { Languages, type Language } from '@/i18n/languages';

import {
  MEDIASCRIPT_CATEGORIES,
  MEDIASCRIPT_COMMANDS_SORTED,
  MEDIASCRIPT_GUIDE,
  TAG_DOC_CATEGORIES,
  TAG_DOC_FUNCTIONS,
  TAG_DOC_GUIDE,
} from './index';
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


export interface TagDocs {
  categories: ReadonlyArray<TagDocCategory>,
  guide: ReadonlyArray<TagDocGuideSection>,
  functions: ReadonlyArray<TagDocFunction>,
  mediaScriptCategories: ReadonlyArray<TagDocCategory<TagDocMediaScriptCategoryId>>,
  mediaScriptGuide: ReadonlyArray<TagDocGuideSection>,
  mediaScriptCommands: ReadonlyArray<TagDocMediaScriptCommand>,
}

export const ENGLISH_TAG_DOCS: TagDocs = Object.freeze({
  categories: TAG_DOC_CATEGORIES,
  guide: TAG_DOC_GUIDE,
  functions: TAG_DOC_FUNCTIONS,
  mediaScriptCategories: MEDIASCRIPT_CATEGORIES,
  mediaScriptGuide: MEDIASCRIPT_GUIDE,
  mediaScriptCommands: MEDIASCRIPT_COMMANDS_SORTED,
});


// English ships with the page, every other language is its own chunk (a language without an overlay is a type error)
const LOADERS: Readonly<Record<Exclude<Language, typeof Languages.ENGLISH>, () => Promise<TagDocsTranslation>>> = Object.freeze({
  [Languages.SPANISH]: async () => (await import('./es')).TAG_DOCS_SPANISH,
  [Languages.PORTUGUESE]: async () => (await import('./pt')).TAG_DOCS_PORTUGUESE,
});

export async function loadTagDocsTranslation(language: Language): Promise<TagDocsTranslation | null> {
  return (language === Languages.ENGLISH) ? null : LOADERS[language]();
}


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


const cache = new WeakMap<TagDocsTranslation, TagDocs>();

export function localizeTagDocs(translation: TagDocsTranslation | null | undefined): TagDocs {
  if (!translation) {
    return ENGLISH_TAG_DOCS;
  }
  const cached = cache.get(translation);
  if (cached) {
    return cached;
  }
  const docs: TagDocs = {
    categories: localizeCategories(TAG_DOC_CATEGORIES, translation.categories),
    guide: localizeGuide(TAG_DOC_GUIDE, translation.guide),
    functions: TAG_DOC_FUNCTIONS.map((fn) => {
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
    mediaScriptCategories: localizeCategories(MEDIASCRIPT_CATEGORIES, translation.mediaScriptCategories),
    mediaScriptGuide: localizeGuide(MEDIASCRIPT_GUIDE, translation.mediaScriptGuide),
    mediaScriptCommands: MEDIASCRIPT_COMMANDS_SORTED.map((command) => {
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
  cache.set(translation, docs);
  return docs;
}
