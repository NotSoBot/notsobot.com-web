// a login pasted as one line, `username:password` and then whatever else the account came with (the way accounts are
// usually handed over), split into the login fields. either in a format picked from the list, or worked out from what
// each part looks like

import type { IdentityLogin } from '@/lib/api';

import { base32Bytes } from './identitiesUi';


export type LoginLineField = 'recovery_email' | 'recovery_phone' | 'channel_email' | 'channel_url' | 'two_factor';

export const LOGIN_LINE_LABELS: Record<keyof IdentityLogin, string> = {
  username: 'username',
  password: 'password',
  recovery_email: 'recovery email',
  recovery_phone: 'recovery phone',
  channel_email: 'channel email',
  channel_url: 'channel link',
  two_factor: '2FA',
  notes: 'notes',
};

// `fields` are what comes after the password, null works it out
export const LOGIN_LINE_FORMATS: Array<{value: string, fields: Array<LoginLineField> | null}> = [
  {value: 'auto', fields: null},
  {value: 'basic', fields: []},
  {value: 'email', fields: ['recovery_email']},
  {value: 'phone', fields: ['recovery_phone']},
  {value: 'email-phone', fields: ['recovery_email', 'recovery_phone']},
  {value: 'email-channel', fields: ['recovery_email', 'channel_url']},
  {value: 'email-2fa', fields: ['recovery_email', 'two_factor']},
  {value: 'email-phone-2fa', fields: ['recovery_email', 'recovery_phone', 'two_factor']},
  {value: '2fa', fields: ['two_factor']},
];

// the short ones for the format picker, so the longest still fits it closed
const SHORT_LABELS: Record<LoginLineField, string> = {
  recovery_email: 'email',
  recovery_phone: 'phone',
  channel_email: 'channel email',
  channel_url: 'channel',
  two_factor: '2fa',
};

export function loginLineFormatLabel(fields: Array<LoginLineField> | null, short = false): string {
  if (!fields) {
    return 'Work it out';
  }
  return (short)
    ? ['user', 'pass', ...fields.map((field) => SHORT_LABELS[field])].join(':')
    : ['username', 'password', ...fields.map((field) => LOGIN_LINE_LABELS[field])].join(':');
}


// on ":", except the one in a link (`https://…`)
function splitLine(line: string): Array<string> {
  const parts: Array<string> = [];
  for (const part of line.split(':')) {
    const previous = parts.at(-1);
    if (previous !== undefined && part.startsWith('//') && /^https?$/i.test(previous.trim())) {
      parts[parts.length - 1] = `${previous}:${part}`;
    } else {
      parts.push(part);
    }
  }
  return parts;
}

const EMAIL = /^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/;
// google's backup codes, 8 digits each (`1234 5678`), several of them
const BACKUP_CODES = /^(\d{4}\s?\d{4}[\s,;]*){2,}$/;

function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[\d\s().-]+$/.test(value) && 7 <= digits && digits <= 15;
}

function isLink(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value) || /^(www\.|m\.)?youtube\.com\/\S+$/i.test(value);
}

function asLink(value: string): string {
  return (/^https?:\/\//i.test(value)) ? value : `https://${value}`;
}

type Kind = 'email' | 'recovery_phone' | 'channel_url' | 'two_factor';

function kindOf(value: string): Kind | null {
  if (EMAIL.test(value)) {
    return 'email';
  }
  if (isLink(value)) {
    return 'channel_url';
  }
  if (BACKUP_CODES.test(value) || base32Bytes(value)) {
    return 'two_factor';
  }
  if (isPhone(value)) {
    return 'recovery_phone';
  }
  return null;
}


export type ParsedLoginLine = Partial<Record<keyof IdentityLogin, string>> & {username: string, password: string};

// null when it isn't at least `username:password`, or has fewer parts than the format. the password is everything
// between the username and the parts after it, so one with a ":" in it comes through whole
export function parseLoginLine(line: string, fields: Array<LoginLineField> | null): ParsedLoginLine | null {
  const parts = splitLine(line.trim());
  const username = parts[0]?.trim() ?? '';
  if (parts.length < 2 || !username) {
    return null;
  }

  const extras: Partial<Record<LoginLineField, string>> = {};
  let end = parts.length;
  if (fields) {
    if (parts.length < 2 + fields.length) {
      return null;
    }
    end = parts.length - fields.length;
    fields.forEach((field, index) => {
      const value = parts[end + index].trim();
      if (value) {
        extras[field] = (field === 'channel_url') ? asLink(value) : value;
      }
    });
  } else {
    // from the end, as long as each part is something recognizable (each kind once, two emails at most), what's left
    // after the username is the password
    const found: Array<{kind: Kind, value: string}> = [];
    while (2 < end) {
      const value = parts[end - 1].trim();
      const kind = kindOf(value);
      const seen = found.filter((item) => item.kind === kind).length;
      if (!kind || seen >= ((kind === 'email') ? 2 : 1)) {
        break;
      }
      found.unshift({kind, value});
      end -= 1;
    }
    // the first email is the recovery one, a second the channel's (a brand account's)
    const emails = found.filter((item) => item.kind === 'email');
    if (emails[0]) {
      extras.recovery_email = emails[0].value;
    }
    if (emails[1]) {
      extras.channel_email = emails[1].value;
    }
    for (const item of found) {
      if (item.kind !== 'email') {
        extras[item.kind] = (item.kind === 'channel_url') ? asLink(item.value) : item.value;
      }
    }
  }

  const password = parts.slice(1, end).join(':');
  if (!password) {
    return null;
  }
  return {username, password, ...extras};
}


// an identity's default name from its login: the username lowercased, only what's before the "@" of an email, without
// what a name can't have (spaces, ":")
export function nameFromUsername(username: string): string {
  return username.trim().toLowerCase().split('@')[0].replace(/[:\s]/g, '').slice(0, 48);
}
