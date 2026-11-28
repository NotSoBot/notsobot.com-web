import type { DiscordSDK } from '@discord/embedded-app-sdk';

import type { EditorRoom } from '@/editor/room';


// THE CONTRACT BETWEEN THE TWO REPOS. notsobot.com-web/src/activity/shell.ts and notsogames.com-web/src/activity/shell.ts
// are the same file: change both, bump `ACTIVITY_SHELL_VERSION` for anything that isn't only an addition.
//
// The Discord Activity is one page that talks to Discord, notsobot.com's `/` (the shell: the editor, the mode choice,
// the settings), with the games half in an iframe of it at `/games/` (notsogames.com's `/activity`, through the URL
// mapping `/games` → `notsogames.com/activity`). Every mapping is the same `<app>.discordsays.com` origin, so the games
// half uses the shell's objects directly instead of a Discord handshake of its own: Discord ignores a second page in
// the frame (notsogames-split-plan.md step 0, the nested test) and the api allows 3 sockets a person
// (`ROOM_MAX_USER_SOCKETS`), so it also shares the shell's one socket.
//
// The shell puts it on `window.__nsbActivityShell` once it's signed in; the games half reads `window.parent`'s.

export const ACTIVITY_SHELL_VERSION = 1;
// the games half's path in the Activity (the URL mapping's prefix), with the shell's query after it
export const GAMES_HALF_PATH = '/games/';

// what the games half opens on, the shell worked it out from the launch (activityLaunch) and hands it over once
export type GamesLaunch =
  // the Games tab
  | {screen: 'tab'}
  // a game's room list (`notice`: why they're there, an invite that couldn't be opened)
  | {screen: 'rooms', game?: string, notice?: string}
  // a room, from an invite the shell already redeemed (it's the shell's: an editor invite stays there)
  | {screen: 'room', roomId: string}
  // Open in Activity on the in-chat Flag Guesser: offers a room continuing it (`carry` is FlagCarry's)
  | {screen: 'carry', carry: {difficulty: 'easy' | 'medium' | 'hard', has_flag: boolean}};

// the Discord profile line (`setActivity`'s activity) and what its timer counts from
export interface ShellPresence {
  activity: Record<string, unknown> | null,
  session: string | null,
}

// Discord's permission for that line (the `rpc.activities.write` scope). Without it Discord only takes the line in
// some places (a server voice channel in the app) and answers 5012 everywhere else; with it the line shows everywhere.
// The shell keeps asking without it as before; this is only the opt-in on top
export interface ProfileStatusSnapshot {
  // their pick, saved on this device: `ask` (nothing yet: asked once, when a game room is joined while the line's
  // turned away), `on`, `off` (closed or denied Discord's screen, or turned it off: never asked by itself again)
  choice: 'ask' | 'on' | 'off',
  // what the last line sent came to: `refused` is Discord turning it away for want of the permission
  sends: 'unknown' | 'working' | 'refused',
  // this launch's connection has the permission
  granted: boolean,
  // Discord's screen is up (or the sign-in after it is on its way)
  asking: boolean,
}

// what asking came to. `reopen`: this launch's connection already signed in without it, and Discord takes one sign-in
// a connection, so it's the next launch's. `failed`: something other than their answer (the api, the network)
export type ProfileStatusAsk = 'granted' | 'declined' | 'reopen' | 'failed';

export interface ProfileStatus {
  // the same object until something changes
  snapshot: () => ProfileStatusSnapshot,
  subscribe: (listener: () => void) => () => void,
  // a game room was entered: Discord's screen if the line's turned away and they haven't been asked yet
  joined: () => void,
  // the settings' switch
  turnOn: () => Promise<ProfileStatusAsk>,
  turnOff: () => void,
}

export interface ActivityShell {
  version: typeof ACTIVITY_SHELL_VERSION,
  // Discord's: the shell's one connection. Commands that may need the consent screen go through `withSdkAuth`
  sdk: DiscordSDK,
  instanceId: string,
  // the server (null in a dm or a group dm)
  guildId: string | null,
  // a NotSoBot owner (connection logs, owner tools)
  owner: boolean,
  // the Activity context's `locales` (`GET /activity/<instance>`): the games half settles its language from them the
  // same way the shell did (editor/activityLanguage `applyActivityLocales`)
  locales: unknown,
  // the api token the shell signed in with (also in localStorage, `tokenStorage`)
  token: () => string | null,
  // the Activity's one socket: the editor's rooms and the games ride on it
  room: EditorRoom,
  // runs a Discord command, once more after Discord's consent screen when it was turned away for want of it
  withSdkAuth: <T>(command: () => Promise<T>) => Promise<T>,
  // a link out of the Activity (Discord's own "leaving Discord" prompt)
  openExternal: (url: string) => void,
  // the Discord profile line while the games half is on screen (the shell's own stops meanwhile)
  setPresence: (presence: ShellPresence) => void,
  // what to open on, once (later calls answer null): the launch the shell sent it here for
  takeLaunch: () => GamesLaunch | null,
  // back to the shell's mode choice (the games half is hidden, it may be kept loaded)
  back: (notice?: string) => void,
  // the shell's own owners' log (its startup, the Discord SDK's traffic, every profile line it sent and Discord's
  // answer), shown beside the games half's in its Connection logs. Optional: added within version 1
  log?: () => ReadonlyArray<{at: number, source: string, text: string}>,
  // the profile line's permission (above). Optional: added within version 1
  profileStatus?: ProfileStatus,
}

declare global {
  interface Window {
    __nsbActivityShell?: ActivityShell,
  }
}

// the games half's side: the parent's shell, when it's the version this was built for
export function parentShell(): ActivityShell | null {
  try {
    if (window.parent === window) {
      return null;
    }
    const shell = window.parent.__nsbActivityShell;
    return (shell?.version === ACTIVITY_SHELL_VERSION) ? shell : null;
  } catch {
    // not same-origin: opened somewhere it shouldn't be
    return null;
  }
}

// either half's: the shell's own page has it on its window, the games half reads its parent's
export function currentShell(): ActivityShell | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.__nsbActivityShell ?? parentShell();
}
