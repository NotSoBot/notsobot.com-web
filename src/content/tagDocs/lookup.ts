// How a function or command is linked to and searched. Apart from the content, so the page can use these without
// taking a view's docs in with them (see ./load.ts)

import type { TagDocFunction, TagDocMediaScriptCommand } from './types';


export function tagFunctionAnchor(fn: TagDocFunction): string {
  return `fn-${fn.names[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

export function tagFunctionSearchText(fn: TagDocFunction): string {
  return [
    ...fn.names,
    fn.summary,
    fn.description ?? '',
    fn.syntax,
  ].join(' ').toLowerCase();
}


export function mediaScriptCommandAnchor(command: TagDocMediaScriptCommand): string {
  return `ms-${command.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

export function mediaScriptCommandSearchText(command: TagDocMediaScriptCommand): string {
  return [
    command.name,
    ...(command.aliases ?? []),
    command.summary,
    command.syntax,
  ].join(' ').toLowerCase();
}
