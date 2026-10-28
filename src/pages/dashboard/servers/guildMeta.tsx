import { AlarmClock, AtSign, ChartColumn, Hash, LayoutDashboard, ListChecks, MessageSquareWarning, Music, Server, Settings, Shield, Sparkles, Tags, TriangleAlert } from 'lucide-react';

import { Routes } from '@/config';
import { translate, translatePlural, useI18n, type TranslationKey } from '@/i18n';
import type { GuildEditableArea } from '@/lib/api';
import { useGuildScope } from '@/lib/api/dashboardQueries';

import type { Choice } from '../settings/botChoices';


// a server's pages (`/dashboard/servers/:guildId/<id>`, Home is the server's own url), grouped like the dashboard's
// sidebar lists them while a server is open. A group's label is `server_tab.group.<id>`, a tab's `server_tab.<id>`
export const SERVER_TAB_GROUPS = [
  {id: 'overview', tabs: [
    {id: 'home', icon: LayoutDashboard, color: '#5865f2'},
    {id: 'commands', icon: ChartColumn, color: '#00b0f4'},
  ]},
  {id: 'features', tabs: [
    {id: 'music', icon: Music, color: '#eb459e'},
    {id: 'notsoai', icon: Sparkles, color: '#a855f7'},
    {id: 'reminders', icon: AlarmClock, color: '#faa81a'},
    {id: 'tags', icon: Tags, color: '#3ba55c'},
  ]},
  {id: 'moderation', tabs: [
    {id: 'reports', icon: MessageSquareWarning, color: '#ed4245'},
    {id: 'rules', icon: ListChecks, color: '#5865f2'},
    {id: 'warnings', icon: TriangleAlert, color: '#fee75c'},
  ]},
  {id: 'server', tabs: [
    {id: 'settings', icon: Settings, color: '#00b0f4'},
  ]},
] as const;

export type ServerTab = (typeof SERVER_TAB_GROUPS)[number]['tabs'][number]['id'];

export function dashboardServerPath(guildId: string, tab: ServerTab = 'home'): string {
  const base = Routes.DASHBOARD_SERVER.replace(':guildId', guildId);
  return (tab === 'home') ? base : `${base}/${tab}`;
}


// permission the bot command for each area needs (owners always pass)
// Discord's own names for them, so they match its settings in either language. These and the labels below are getters,
// read in the language on screen
export const AREA_PERMISSION: Record<GuildEditableArea, string> = {
  get prefixes() { return translate('permission.manage_server'); },
  get rules() { return translate('permission.manage_server'); },
  get rules_admin() { return translate('permission.administrator'); },
  get loggers() { return translate('permission.manage_server'); },
  get settings() { return translate('permission.manage_server'); },
  get music() { return translate('permission.manage_server'); },
  get moderation() { return translate('permission.timeout_members'); },
  get reminders() { return translate('permission.manage_messages'); },
  get tags() { return translate('permission.manage_server_or_ban'); },
};

export const AREA_LABEL: Record<GuildEditableArea, string> = {
  get prefixes() { return translate('area.prefixes'); },
  get settings() { return translate('area.settings'); },
  get rules() { return translate('area.rules'); },
  get rules_admin() { return translate('area.rules_admin'); },
  get loggers() { return translate('area.loggers'); },
  get music() { return translate('area.music'); },
  get moderation() { return translate('area.moderation'); },
  get reminders() { return translate('area.reminders'); },
  get tags() { return translate('area.tags'); },
};

// why a server's section can't be changed: a missing Discord permission, or in the admin panel, not being a bot owner
export function useReadOnlyMessage(): (area: GuildEditableArea) => string {
  const staff = useGuildScope() === 'admin';
  const { t } = useI18n();
  return (area) => (staff) ? t('area.read_only_staff') : t('area.read_only', {permission: AREA_PERMISSION[area]});
}


// the server's warning settings, in seconds like the api: "30 days", "1 year", "12 hours", "10 minutes"
export function formatSeconds(seconds: number): string {
  if (seconds < 3600) {
    return translatePlural('duration.minutes', Math.max(Math.round(seconds / 60), 1));
  }
  const days = seconds / 86400;
  if (Number.isInteger(days / 365)) {
    return translatePlural('duration.years', days / 365);
  }
  if (Number.isInteger(days)) {
    return translatePlural('duration.days', days);
  }
  return translatePlural('duration.hours', Math.round(seconds / 3600));
}

// the bot's `WARNINGS_WINDOW_DEFAULT`
export const WARNINGS_WINDOW_DEFAULT = 30 * 86400;

// a stored value the list doesn't have (`set warnings` takes any duration) still shows as a duration
function withSeconds(choices: Array<number>, value: number | null, defaultValue: number | null): ReadonlyArray<Choice<number>> {
  const values = (value === null || choices.includes(value)) ? choices : [...choices, value].sort((a, b) => a - b);
  return values.map((seconds) => ({value: seconds, label: (seconds === defaultValue) ? translate('duration.default', {duration: formatSeconds(seconds)}) : formatSeconds(seconds)}));
}

export function warningsWindowChoices(value: number | null): ReadonlyArray<Choice<number>> {
  return withSeconds([1, 3, 7, 14, 30, 60, 90, 180, 365].map((days) => days * 86400), value, WARNINGS_WINDOW_DEFAULT);
}

export function warningsExpireChoices(value: number | null): ReadonlyArray<Choice<number>> {
  return withSeconds([30, 60, 90, 180, 365, 730, 1825].map((days) => days * 86400), value, null);
}


export const RULE_TARGET_TYPES = ['guild', 'channel', 'role', 'user'] as const;

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  get channel() { return translate('entry.channel'); },
  get guild() { return translate('entry.guild'); },
  get role() { return translate('entry.role'); },
  get user() { return translate('entry.user'); },
};


// IDs only for now (the API doesn't store names), formatted like Discord mentions
export function EntryMention({ type, id }: {type: string, id: string}) {
  const { t } = useI18n();
  const Icon = (type === 'channel') ? Hash : (type === 'role') ? Shield : (type === 'guild') ? Server : AtSign;
  const color = (type === 'channel') ? 'text-code' : (type === 'role') ? 'text-warning' : (type === 'guild') ? 'text-success-text' : 'text-[#a5acff]';
  return (
    <span className='inline-flex min-w-0 items-center gap-1.5'>
      <Icon aria-hidden className={`size-3.5 shrink-0 ${color}`}/>
      <span className='sr-only'>{ENTRY_TYPE_LABELS[type] ?? type} </span>
      {(type === 'guild') ? (
        <span className='text-sm text-fg'>{t('entry.guild')}</span>
      ) : (
        <span className='truncate font-mono text-sm text-fg'>{id}</span>
      )}
    </span>
  );
}


// `GuildLoggerTypes`, labels are `logger.<value>` and descriptions `logger.<value>.description`
export const LOGGER_TYPES: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function loggerTypeLabel(type: number): string {
  return (LOGGER_TYPES.includes(type)) ? translate(`logger.${type}` as TranslationKey) : translate('logger.unknown', {type});
}

export function loggerTypeDescription(type: number): string {
  return (LOGGER_TYPES.includes(type)) ? translate(`logger.${type}.description` as TranslationKey) : '';
}

