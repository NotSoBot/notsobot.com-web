import { AtSign, Hash, Server, Shield } from 'lucide-react';

import { Routes } from '@/config';
import type { GuildEditableArea } from '@/lib/api';
import { useGuildScope } from '@/lib/api/dashboardQueries';

import type { Choice } from '../settings/botChoices';


// the server opens as a modal over the server list
export function dashboardServerPath(guildId: string): string {
  return `${Routes.DASHBOARD_SERVERS}?${new URLSearchParams({server: guildId})}`;
}


// permission the bot command for each area needs (owners always pass)
export const AREA_PERMISSION: Record<GuildEditableArea, string> = {
  prefixes: 'Manage Server',
  rules: 'Manage Server',
  rules_admin: 'Administrator',
  loggers: 'Manage Server',
  settings: 'Manage Server',
  music: 'Manage Server',
  moderation: 'Timeout Members',
};

export const AREA_LABEL: Record<GuildEditableArea, string> = {
  prefixes: 'Prefixes',
  settings: 'Server settings',
  rules: 'Command and category rules',
  rules_admin: 'Rules for every command and the owner/admin bypass',
  loggers: 'Loggers',
  music: 'Music',
  moderation: 'Warnings',
};

// why a server's section can't be changed: a missing Discord permission, or in the admin panel, not being a bot owner
export function useReadOnlyMessage(): (area: GuildEditableArea) => string {
  const staff = useGuildScope() === 'admin';
  return (area) => (staff) ? 'Only bot owners can change a server’s settings.' : `You need the ${AREA_PERMISSION[area]} permission in this server to change this.`;
}


// the server's warning settings, in seconds like the api: "30 days", "1 year", "12 hours", "10 minutes"
export function formatSeconds(seconds: number): string {
  if (seconds < 3600) {
    const minutes = Math.max(Math.round(seconds / 60), 1);
    return `${minutes} minute${(minutes === 1) ? '' : 's'}`;
  }
  const days = seconds / 86400;
  if (Number.isInteger(days / 365)) {
    return `${days / 365} year${(days === 365) ? '' : 's'}`;
  }
  if (Number.isInteger(days)) {
    return `${days} day${(days === 1) ? '' : 's'}`;
  }
  const hours = Math.round(seconds / 3600);
  return `${hours} hour${(hours === 1) ? '' : 's'}`;
}

// the bot's `WARNINGS_WINDOW_DEFAULT`
export const WARNINGS_WINDOW_DEFAULT = 30 * 86400;

// a stored value the list doesn't have (`set warnings` takes any duration) still shows as a duration
function withSeconds(choices: Array<number>, value: number | null, defaultValue: number | null): ReadonlyArray<Choice<number>> {
  const values = (value === null || choices.includes(value)) ? choices : [...choices, value].sort((a, b) => a - b);
  return values.map((seconds) => ({value: seconds, label: `${formatSeconds(seconds)}${(seconds === defaultValue) ? ' (default)' : ''}`}));
}

export function warningsWindowChoices(value: number | null): ReadonlyArray<Choice<number>> {
  return withSeconds([1, 3, 7, 14, 30, 60, 90, 180, 365].map((days) => days * 86400), value, WARNINGS_WINDOW_DEFAULT);
}

export function warningsExpireChoices(value: number | null): ReadonlyArray<Choice<number>> {
  return withSeconds([30, 60, 90, 180, 365, 730, 1825].map((days) => days * 86400), value, null);
}


export const RULE_TARGET_TYPES = ['guild', 'channel', 'role', 'user'] as const;

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  channel: 'Channel',
  guild: 'Whole server',
  role: 'Role',
  user: 'User',
};


// IDs only for now (the API doesn't store names), formatted like Discord mentions
export function EntryMention({ type, id }: {type: string, id: string}) {
  const Icon = (type === 'channel') ? Hash : (type === 'role') ? Shield : (type === 'guild') ? Server : AtSign;
  const color = (type === 'channel') ? 'text-code' : (type === 'role') ? 'text-warning' : (type === 'guild') ? 'text-success' : 'text-[#a5acff]';
  return (
    <span className='inline-flex min-w-0 items-center gap-1.5'>
      <Icon aria-hidden className={`size-3.5 shrink-0 ${color}`}/>
      <span className='sr-only'>{ENTRY_TYPE_LABELS[type] ?? type} </span>
      {(type === 'guild') ? (
        <span className='text-sm text-fg'>Whole server</span>
      ) : (
        <span className='truncate font-mono text-sm text-fg'>{id}</span>
      )}
    </span>
  );
}


// `GuildLoggerTypes`
export const LOGGER_TYPES: ReadonlyArray<{value: number, label: string, description: string}> = [
  {value: 0, label: 'Messages', description: 'Edits, deletes and bulk deletes'},
  {value: 1, label: 'Users', description: 'Username and avatar changes'},
  {value: 2, label: 'Members', description: 'Joins, leaves and member updates'},
  {value: 3, label: 'Voice', description: 'Voice channel joins, leaves and moves'},
  {value: 4, label: 'Channels', description: 'Channel creates, deletes and updates'},
  {value: 5, label: 'Bans', description: 'Bans and unbans'},
  {value: 6, label: 'Roles', description: 'Role creates, deletes and updates'},
  {value: 7, label: 'Moderation', description: 'Warnings given, removed and cleared'},
];

export function loggerTypeLabel(type: number): string {
  return LOGGER_TYPES.find((item) => item.value === type)?.label ?? `Type ${type}`;
}

