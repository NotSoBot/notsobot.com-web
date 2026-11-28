// The Activity's connection log: what its socket and a game's join did, newest last. Always kept (a small ring, nothing
// leaves the browser), shown only to NotSoBot's owners (`EditorActivityContext.owner`) from a game's header, for when a
// join hangs inside Discord where there's no devtools. Never a token, never a whole document or game state: op names,
// message types, codes and short reasons

// `sdk`: the Discord SDK's postMessage traffic while it starts (./hosts/sdkTrace.ts)
export type ActivityLogSource = 'socket' | 'game' | 'startup' | 'sdk';

export interface ActivityLogEntry {
  at: number,
  source: ActivityLogSource,
  text: string,
}

const MAX_ENTRIES = 400;
// one value in an entry, a long reason or message is cut
const MAX_VALUE_LENGTH = 160;


class ActivityLog {
  private entries: Array<ActivityLogEntry> = [];
  private listeners = new Set<() => void>();

  add(source: ActivityLogSource, text: string): void {
    const entries = (this.entries.length < MAX_ENTRIES) ? this.entries : this.entries.slice(1 - MAX_ENTRIES);
    this.entries = [...entries, {at: Date.now(), source, text}];
    for (const listener of this.listeners) {
      listener();
    }
  }

  clear(): void {
    this.entries = [];
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Array<ActivityLogEntry> => this.entries;
}

export const activityLog = new ActivityLog();


// Whether the last person signed in to the Activity on this device was a NotSoBot owner: set after every sign-in. The
// startup failure screen shows the log by it, since a start that fails before sign-in can't ask the api who's there.
// Only hides the log from everyone else, the log has nothing secret in it
const OWNER_DEVICE_KEY = 'nsb.activity.owner-device';

export function rememberOwnerDevice(owner: boolean): void {
  try {
    if (owner) {
      window.localStorage.setItem(OWNER_DEVICE_KEY, '1');
    } else {
      window.localStorage.removeItem(OWNER_DEVICE_KEY);
    }
  } catch {
    // storage refused: the failure screen just won't have the log
  }
}

export function isOwnerDevice(): boolean {
  try {
    return window.localStorage.getItem(OWNER_DEVICE_KEY) === '1';
  } catch {
    return false;
  }
}


// a message's small fields for a log line (`code=4029 game_id=…`), leaving out anything big or secret
const SUMMARY_FIELDS = ['op', 'game_id', 'document_id', 'code', 'error', 'op_id', 'message', 'reason', 'watch', 'full'] as const;

export function summarize(message: Record<string, unknown>): string {
  const parts: Array<string> = [];
  for (const field of SUMMARY_FIELDS) {
    const value = message[field];
    if (value === undefined || value === null) {
      continue;
    }
    const text = (typeof value === 'string') ? value : JSON.stringify(value);
    parts.push(`${field}=${(text.length > MAX_VALUE_LENGTH) ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text}`);
  }
  return parts.join(' ');
}

// the whole log as text, for Copy
export function formatLog(entries: Array<ActivityLogEntry>): string {
  return entries.map((entry) => `${formatTime(entry.at)} [${entry.source}] ${entry.text}`).join('\n');
}

export function formatTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}
