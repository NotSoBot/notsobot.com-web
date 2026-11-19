// A command's link, /commands/:commandId(/:commandType), shared by the commands page and the worker's embeds. Keep
// this file free of browser, vite-only and react code (relative imports only) so worker/index.ts can import it.

import { Routes } from '../routes';
import { CommandTypes, type CommandType } from './api/types';


// the `:commandType` in /commands/:commandId/:commandType
const COMMAND_TYPE_SLUGS: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: 'prefix',
  [CommandTypes.APPLICATION_SLASH]: 'slash',
  [CommandTypes.APPLICATION_MENU_USER]: 'user',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'message',
  // usage only, no command has a mention variant
  [CommandTypes.MENTION]: 'mention',
};


// the order a command's ways to run it are listed in: slash first, since Discord requires bots to use slash commands
// and prefix commands end on 2027-01-01 (a mention keeps working), then prefix, then the context menus
const VARIANT_ORDER: Record<CommandType, number> = {
  [CommandTypes.APPLICATION_SLASH]: 0,
  [CommandTypes.PREFIXED]: 1,
  [CommandTypes.APPLICATION_MENU_USER]: 2,
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 3,
  [CommandTypes.MENTION]: 4,
};

export function compareCommandTypes(a: CommandType, b: CommandType): number {
  return VARIANT_ORDER[a] - VARIANT_ORDER[b];
}


// a command's first variant (slash, then prefix, then context menus) is the plain /commands/:commandId
export function defaultCommandType(types: Array<CommandType>): CommandType | undefined {
  return [ ...types ].sort(compareCommandTypes)[0];
}


// `types` are every variant the command has
export function commandPath(commandId: string, type: CommandType, types: Array<CommandType>): string {
  const path = Routes.COMMAND.replace(':commandId', encodeURIComponent(commandId));
  return (defaultCommandType(types) === type) ? path : `${path}/${COMMAND_TYPE_SLUGS[type]}`;
}


// the variant a path points at, undefined when the command doesn't have it (or the slug is unknown)
export function commandTypeFromPath(slug: string | undefined, types: Array<CommandType>): CommandType | undefined {
  if (!slug) {
    return defaultCommandType(types);
  }
  return types.find((type) => COMMAND_TYPE_SLUGS[type] === slug.toLowerCase());
}
