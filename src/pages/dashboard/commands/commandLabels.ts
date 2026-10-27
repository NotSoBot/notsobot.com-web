// How commands are named in the dashboard: their type, and how an attempt ended (the bot's `CommandResults`). Shared by
// the user's command history and the owner Stats page.

import { translate } from '@/i18n';
import { CommandTypes, MeCommandResults, type CommandType } from '@/lib/api';


// getters, so they're read in the language on screen
export const COMMAND_TYPE_LABELS: Record<CommandType, string> = {
  get [CommandTypes.PREFIXED]() { return translate('command_type.prefixed'); },
  get [CommandTypes.APPLICATION_SLASH]() { return translate('command_type.slash'); },
  get [CommandTypes.APPLICATION_MENU_USER]() { return translate('command_type.user_app'); },
  get [CommandTypes.APPLICATION_MENU_MESSAGE]() { return translate('command_type.message_app'); },
};

export type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'brand';

// the api's name for uses from before the bot reported how they ended
export const UNTRACKED_RESULT = 'untracked';

// in the order the filter offers them: ran, then the errors, then the rest. The labels are getters, read in the language on screen
export const RESULT_LABELS: Record<string, {label: string, tone: Tone}> = {
  [MeCommandResults.RAN]: {get label() { return translate('result.ran'); }, tone: 'success' as Tone},
  [MeCommandResults.RUN_ERROR]: {get label() { return translate('result.run_error'); }, tone: 'danger' as Tone},
  [MeCommandResults.FAIL]: {get label() { return translate('result.fail'); }, tone: 'danger' as Tone},
  [MeCommandResults.SCRIPT_ERROR]: {get label() { return translate('result.script_error'); }, tone: 'warning' as Tone},
  [MeCommandResults.CONTENT_BLOCKED]: {get label() { return translate('result.content_blocked'); }, tone: 'warning' as Tone},
  [MeCommandResults.ARGUMENT_ERROR]: {get label() { return translate('result.argument_error'); }, tone: 'warning' as Tone},
  [MeCommandResults.MISSING_PERMISSIONS]: {get label() { return translate('result.missing_permissions'); }, tone: 'warning' as Tone},
  [MeCommandResults.BOT_MISSING_PERMISSIONS]: {get label() { return translate('result.bot_missing_permissions'); }, tone: 'warning' as Tone},
  [MeCommandResults.RATELIMITED]: {get label() { return translate('result.ratelimited'); }, tone: 'warning' as Tone},
  [MeCommandResults.BLOCKED]: {get label() { return translate('result.blocked'); }, tone: 'neutral' as Tone},
  [MeCommandResults.CANCELLED]: {get label() { return translate('result.cancelled'); }, tone: 'neutral' as Tone},
  [UNTRACKED_RESULT]: {get label() { return translate('result.untracked'); }, tone: 'neutral' as Tone},
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
