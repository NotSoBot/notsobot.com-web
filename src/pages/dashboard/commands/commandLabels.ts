// How commands are named in the dashboard: their type, and how an attempt ended (the bot's `CommandResults`). Shared by
// the user's command history and the owner Stats page.

import { CommandTypes, MeCommandResults, type CommandType } from '@/lib/api';


export const COMMAND_TYPE_LABELS: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: 'Prefix',
  [CommandTypes.APPLICATION_SLASH]: 'Slash',
  [CommandTypes.APPLICATION_MENU_USER]: 'User app',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Message app',
};

export type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'brand';

// the api's name for uses from before the bot reported how they ended
export const UNTRACKED_RESULT = 'untracked';

// in the order the filter offers them: ran, then the errors, then the rest
export const RESULT_LABELS: Record<string, {label: string, tone: Tone}> = {
  [MeCommandResults.RAN]: {label: 'Ran', tone: 'success'},
  [MeCommandResults.RUN_ERROR]: {label: 'Errored', tone: 'danger'},
  [MeCommandResults.FAIL]: {label: 'Failed', tone: 'danger'},
  [MeCommandResults.SCRIPT_ERROR]: {label: 'Script errored', tone: 'warning'},
  [MeCommandResults.ARGUMENT_ERROR]: {label: 'Bad arguments', tone: 'warning'},
  [MeCommandResults.MISSING_PERMISSIONS]: {label: 'Missing permissions', tone: 'warning'},
  [MeCommandResults.BOT_MISSING_PERMISSIONS]: {label: 'Bot missing permissions', tone: 'warning'},
  [MeCommandResults.RATELIMITED]: {label: 'Rate limited', tone: 'warning'},
  [MeCommandResults.BLOCKED]: {label: 'Blocked', tone: 'neutral'},
  [MeCommandResults.CANCELLED]: {label: 'Cancelled', tone: 'neutral'},
  [UNTRACKED_RESULT]: {label: 'Not tracked', tone: 'neutral'},
};

export function resultInfo(result: string): {label: string, tone: Tone} {
  return RESULT_LABELS[result] ?? {label: result, tone: 'neutral'};
}

// the breakdown's bar and dots, by tone
export const TONE_FILLS: Record<Tone, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  brand: 'bg-brand',
  neutral: 'bg-subtle',
};
