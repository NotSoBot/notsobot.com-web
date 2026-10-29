import { clsx, type ClassValue } from 'clsx';

import { intlLocale } from '@/i18n/languages';
import { activeLanguage } from '@/i18n/translate';


export function cn(...inputs: Array<ClassValue>): string {
  return clsx(inputs);
}


// password managers ignore autocomplete='off', so non-credential inputs (search, id filters) opt out explicitly
export const NO_AUTOFILL = {
  'data-1p-ignore': true,
  'data-lpignore': 'true',
  'data-bwignore': true,
  'data-form-type': 'other',
} as const;


export function formatMemory(bytes: number, decimals = 0): string {
  if (!bytes || bytes < 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exponent)).toFixed(decimals)} ${units[exponent]}`;
}


// `45m`, `5h 12m`, `3d 4h`
export function formatUptime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return (hours < 48) ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}


// the locale dates and numbers are shown in, following the site's language
export function displayLocale(): string {
  return intlLocale(activeLanguage());
}


export function formatNumber(value: number): string {
  return value.toLocaleString(displayLocale());
}


export function shuffle<T>(array: Array<T>): Array<T> {
  const copy = array.slice();
  for (let i = copy.length - 1; 0 < i; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}


// Discord snowflake -> shard id (https://discord.com/developers/docs/topics/gateway#sharding)
export function shardIdForGuild(guildId: string, shardCount: number): number | null {
  if (!/^\d{15,21}$/.test(guildId) || shardCount <= 0) {
    return null;
  }
  return Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
}


// a server in the Discord client
export function discordGuildUrl(guildId: string): string {
  return `https://discord.com/channels/${guildId}`;
}

// a server's channel in the Discord client
export function discordChannelUrl(guildId: string, channelId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

// a dm or group dm in the Discord client
export function discordDmUrl(channelId: string): string {
  return `https://discord.com/channels/@me/${channelId}`;
}


// Discord snowflake -> when it was made, in ms (null for anything that isn't one)
export function snowflakeTimestamp(id: string): number | null {
  return (/^\d{15,21}$/.test(id)) ? Number(BigInt(id) >> 22n) + 1420070400000 : null;
}


// API timestamps are ISO strings; some admin fields may be epoch numbers (seconds or ms)
export function toDate(value: string | number): Date {
  if (typeof value === 'number') {
    return new Date((value < 1e12) ? value * 1000 : value);
  }
  return new Date(value);
}


export function formatDate(value: string | number, options: Intl.DateTimeFormatOptions = {year: 'numeric', month: 'short', day: 'numeric'}): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(displayLocale(), options);
}


export function formatDateTime(value: string | number): string {
  return formatDate(value, {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
}


// down to the second, with the weekday and time zone; for hover titles
export function formatExactDateTime(value: string | number): string {
  return formatDate(value, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });
}


// floors instead of rounding so 1,289,999 shows as `1.2M+`, never more than the real count
// (roundingMode is ES2023 Intl, newer than the app's lib target)
const compactFormatters = new Map<string, Intl.NumberFormat>();

export function formatCompact(value: number): string {
  const locale = displayLocale();
  if (value < 10000) {
    return value.toLocaleString(locale);
  }
  let formatter = compactFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {notation: 'compact', maximumFractionDigits: 1, roundingMode: 'floor'} as Intl.NumberFormatOptions);
    compactFormatters.set(locale, formatter);
  }
  return `${formatter.format(value)}+`;
}


// `#some%20id` -> `some id`; a malformed escape (`#%E0`) would throw, so that falls back to the raw text
export function decodeHash(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// saves `data` as a pretty-printed .json file (the dashboard's data exports)
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // give the browser a moment to start the download before the url goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
