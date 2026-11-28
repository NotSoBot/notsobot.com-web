import type { ProfileStatus, ProfileStatusAsk, ProfileStatusSnapshot } from '@/activity/shell';


// Their Discord profile line's permission (src/activity/shell.ts `ProfileStatus`), the shell's. The line (./presence)
// is always sent without it first, as before: Discord takes it from a server voice channel in its app and answers 5012
// "Command not available for this application" almost everywhere else (a dm, a text channel, the browser), because its
// `SET_ACTIVITY` handler only skips its frame lookup for a connection with `rpc.activities.write` (discord-webarchive,
// read 2026-11-27/28). So once a send is turned away like that, Discord's own permission screen (`authorize` with that
// scope, then the code exchange and `authenticate`) is offered: when they enter a game room, once, and from the settings'
// switch whenever they like. Closing or denying it is remembered and nothing else happens.
// Discord takes one `authorize`/`authenticate` a connection ("Already authenticated" after that), so a launch whose
// connection already signed in without the scope (a share, an invite) can't add it: the switch says it's the next launch's


// what Discord's rpc answers a line it won't take for want of the scope: 5012 UNAUTHORIZED_FOR_APPLICATION (the frame
// lookup that stands in for the scope found no frame), 4006 INVALID_PERMISSIONS (a connection without any scope it takes)
const REFUSED_CODES: ReadonlySet<number> = new Set([5012, 4006]);
// the permission screen closed ("User cancelled authorization") or denied ("OAuth2 Error: access_denied"): their answer
const OAUTH2_ERROR = 5000;

export const PROFILE_STATUS_SCOPE = 'rpc.activities.write';
// saved on this device (the shell's window and the games half share the origin's storage, never its module state)
const STORAGE_KEY = 'nsb.activity.profile_status';
// a join before the first line's answer: how long it waits for it
const JOIN_WAIT = 10 * 1000;

type Choice = ProfileStatusSnapshot['choice'];
const CHOICES: ReadonlyArray<Choice> = ['ask', 'on', 'off'];


export function codeOf(error: unknown): number | null {
  const code = (error as {code?: unknown} | null)?.code;
  return (typeof code === 'number') ? code : null;
}

export function isPresenceRefusal(error: unknown): boolean {
  const code = codeOf(error);
  return code !== null && REFUSED_CODES.has(code);
}


export interface ProfileStatusDeps {
  // Discord's screen with the scope + the code exchange + `authenticate`: the scopes the connection has after it (the
  // one that's already on its way when there is one, it may not have the scope). Throws the sdk's error
  authorize: () => Promise<ReadonlyArray<string>>,
  // the scopes the connection was authenticated with, null when it hasn't been
  authenticated: () => ReadonlyArray<string> | null,
  // the line once more, now that Discord may take it
  resend: () => void,
  // for the owners' log
  log?: (text: string) => void,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
}


export class ProfileStatusController implements ProfileStatus {
  private state: ProfileStatusSnapshot;
  private readonly listeners = new Set<() => void>();
  private asking: Promise<ProfileStatusAsk> | null = null;
  // a join waiting for the first line's answer
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  // `on` asks by itself once a launch (Discord skips its screen when the permission's still there)
  private autoAsked = false;
  private closed = false;

  constructor(private readonly deps: ProfileStatusDeps) {
    this.state = {choice: this.readChoice(), sends: 'unknown', granted: false, asking: false};
  }

  snapshot = (): ProfileStatusSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // whether a sign-in should ask for the scope too: they turned it on (a share's screen then carries it, and with the
  // permission already there Discord shows nothing extra)
  get wanted(): boolean {
    return this.state.choice === 'on';
  }

  // a line's answer (PresenceSender's send): `undefined` for one Discord took
  noteSend = (error?: unknown): void => {
    if (this.closed) {
      return;
    }
    const sends = (error === undefined) ? 'working' : (isPresenceRefusal(error)) ? 'refused' : 'unknown';
    this.set({sends});
    if (sends !== 'refused' || this.state.granted) {
      if (sends !== 'unknown') {
        this.stopJoinWait();
      }
      return;
    }
    if (this.joinTimer !== null) {
      this.stopJoinWait();
      void this.ask('join');
    } else if (this.state.choice === 'on' && !this.autoAsked) {
      this.autoAsked = true;
      void this.ask('auto');
    }
  };

  // the connection signed in (any of the Activity's sign-ins): with the scope, the line goes again
  noteAuthenticated = (scopes: ReadonlyArray<string>): void => {
    if (this.closed || this.state.granted || !scopes.includes(PROFILE_STATUS_SCOPE)) {
      return;
    }
    this.set({granted: true});
    if (this.state.sends !== 'working') {
      this.deps.resend();
    }
  };

  joined = (): void => {
    if (this.closed || this.state.choice !== 'ask' || this.state.granted) {
      return;
    }
    if (this.state.sends === 'refused') {
      void this.ask('join');
    } else if (this.state.sends === 'unknown' && this.joinTimer === null) {
      // the line's answer isn't in yet (a launch straight into a room): asked when it comes, if it's a refusal
      this.joinTimer = setTimeout(() => {
        this.joinTimer = null;
      }, JOIN_WAIT);
    }
  };

  turnOn = (): Promise<ProfileStatusAsk> => this.ask('switch');

  turnOff = (): void => {
    this.stopJoinWait();
    this.setChoice('off');
  };

  close(): void {
    this.closed = true;
    this.stopJoinWait();
    this.listeners.clear();
  }

  private ask(reason: 'join' | 'auto' | 'switch'): Promise<ProfileStatusAsk> {
    if (!this.asking) {
      const pending = this.run(reason).finally(() => {
        if (this.asking === pending) {
          this.asking = null;
          this.set({asking: false});
        }
      });
      this.asking = pending;
      this.set({asking: true});
    }
    return this.asking;
  }

  private async run(reason: 'join' | 'auto' | 'switch'): Promise<ProfileStatusAsk> {
    const has = (scopes: ReadonlyArray<string>) => scopes.includes(PROFILE_STATUS_SCOPE);
    const already = this.deps.authenticated();
    if (already) {
      if (has(already)) {
        this.noteAuthenticated(already);
        this.setChoice('on');
        return 'granted';
      }
      // signed in without it this launch: only the switch saves the pick, for the next launch's sign-in
      this.deps.log?.(`profile status: ${reason}, connection already signed in without ${PROFILE_STATUS_SCOPE}`);
      if (reason === 'switch') {
        this.setChoice('on');
      }
      return 'reopen';
    }
    this.deps.log?.(`profile status: asking (${reason})`);
    let scopes: ReadonlyArray<string>;
    try {
      scopes = await this.deps.authorize();
    } catch (error) {
      if (codeOf(error) === OAUTH2_ERROR) {
        // closed or denied: remembered, no error, whatever they were doing carries on
        this.deps.log?.(`profile status: ${reason} declined`);
        this.setChoice('off');
        return 'declined';
      }
      this.deps.log?.(`profile status: ${reason} failed ${String(codeOf(error) ?? '?')} ${String((error as Error)?.message ?? error).slice(0, 160)}`);
      return 'failed';
    }
    if (!has(scopes)) {
      // another sign-in got there first without the scope
      if (reason === 'switch') {
        this.setChoice('on');
      }
      return 'reopen';
    }
    this.noteAuthenticated(scopes);
    this.setChoice('on');
    return 'granted';
  }

  private stopJoinWait(): void {
    if (this.joinTimer !== null) {
      clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
  }

  private readChoice(): Choice {
    try {
      const stored = this.deps.storage?.getItem(STORAGE_KEY);
      return (CHOICES.includes(stored as Choice)) ? stored as Choice : 'ask';
    } catch {
      return 'ask';
    }
  }

  private setChoice(choice: Choice): void {
    if (this.state.choice === choice) {
      return;
    }
    try {
      this.deps.storage?.setItem(STORAGE_KEY, choice);
    } catch {
      // this launch only
    }
    this.set({choice});
  }

  private set(changes: Partial<ProfileStatusSnapshot>): void {
    const next = {...this.state, ...changes};
    if ((Object.keys(next) as Array<keyof ProfileStatusSnapshot>).every((key) => next[key] === this.state[key])) {
      return;
    }
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}
