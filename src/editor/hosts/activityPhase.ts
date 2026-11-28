import type { GamesLaunch } from '@/activity/shell';

import type { LobbyMode } from '../components/StartScreen';
import type { RoomScreen } from '../room';


// Which screen the Activity is on (./activity.tsx) and how it moves between them: the phases, the reducer every screen
// change goes through, and which phases count as the same screen. Its own file so it can be tested without the Discord
// SDK and the screens, and so activity.tsx exports only components (React Fast Refresh)


// the startup steps, a failure names the one it stopped at. `signin` is the one from the proxy headers, `authorize` →
// `login` → `authenticate` only run when it fails
export type Step = 'sdk' | 'ready' | 'signin' | 'authorize' | 'login' | 'authenticate' | 'context';

export type Phase =
  // startup, and the step it's on (the screen's `data-step`: where a launch that hangs stopped)
  | {kind: 'loading', step: Step}
  // the end: nothing puts another screen over it (`nextPhase`), Reload starts the Activity over
  | {
    kind: 'failed',
    message: 'editor.activity.not_in_discord' | 'editor.activity.failed' | 'editor.activity.not_ready' | 'editor.activity.denied',
    // what went wrong, shown small under the message to everyone: the step it stopped at and the api's or the sdk's error
    detail?: string,
  }
  // the activity's group edits, join one or start a new one. `notice`: why they're back (lost their spot)
  | {kind: 'lobbies', notice?: string}
  // the mode choice, the editor (lobbies/start) or the games: what the app launcher opens on (./activityLaunch), and
  // where the editor's room list and the games half go back to. `notice`: an invite that couldn't be opened
  | {kind: 'choice', notice?: string}
  // the games half (notsogames.com's, src/activity/shell.ts): an iframe at /games/ that does everything games, through
  // this page's SDK and socket. `launch`: what it opens on, handed over once (`takeLaunch`)
  | {kind: 'games_frame', launch: GamesLaunch}
  // a new edit: who it's for (just me, everyone, everyone with the password) and its media
  | {kind: 'start', mode: LobbyMode}
  | {kind: 'editor', documentId: string, solo: boolean, fill?: boolean}
  // the server's dashboard pages and your own, from the mode choice (src/activity-games/server and user)
  | {kind: 'server_settings', guildId: string}
  | {kind: 'user_settings'};

// where each phase is, said over the socket for everyone's start screen counts (src/activity-games/counts.ts): starting
// or in an edit is editing, anywhere in the games is games, the start screen and the editor's room list are neither
export const PHASE_SCREENS: Record<Phase['kind'], RoomScreen | null> = {
  loading: null,
  failed: null,
  lobbies: null,
  choice: null,
  games_frame: 'games',
  start: 'editor',
  editor: 'editor',
  server_settings: null,
  user_settings: null,
};

// Every screen change goes through `nextPhase`. `from`: the phase that asked, for the changes that come later (a join's
// answer, an upload, a new room): when that's not the phase on screen any more they went somewhere else meanwhile, and
// it's dropped instead of taking them out of where they are. `step`: startup moved on, nothing once it's over
export type PhaseChange = {to: Phase, from?: Phase} | {step: Step};

// whether they're still where `a` was. Startup is one wait whatever step it's on, and the start screen one screen
// whoever the edit is for (it stays mounted when that changes)
export function isSamePhase(a: Phase, b: Phase): boolean {
  return a === b || (a.kind === b.kind && (a.kind === 'loading' || a.kind === 'start'));
}

export function nextPhase(current: Phase, change: PhaseChange): Phase {
  // the end, whatever was still on its way (the first screen, a join, an upload)
  if (current.kind === 'failed') {
    return current;
  }
  if ('step' in change) {
    return (current.kind === 'loading' && current.step !== change.step) ? {kind: 'loading', step: change.step} : current;
  }
  if (change.from && !isSamePhase(change.from, current)) {
    return current;
  }
  return change.to;
}
