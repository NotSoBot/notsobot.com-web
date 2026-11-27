import { gameInfo } from '@/activity-games/catalog';
import type { translate } from '@/i18n';

import type { Phase } from './activityPhase';
import type { PipRoom, PipStatus } from './pip';


// What their Discord profile says while they're in the Activity (the sdk's `setActivity`, Discord's "rich presence"):
// under "Playing NotSoBot", which screen they're on, and in an edit or a game what's going on in it. Built from the
// phase and from what the screen on show already says about itself for the small window (./pip), so a game or the
// editor doesn't publish anything new for it.
// No OAuth scope needed: Discord's client takes `SET_ACTIVITY` from an Activity's frame with the scope it has from the
// start (`RPC_EMBEDDED_APP_SCOPE`, read from discord-webarchive 2026-11-27), unlike its docs' `rpc.activities.write`.
// Everyone who can see their profile reads it: a room's name is there only when anyone could find and join it, a
// password room says it's private, a solo one that it's solo. Never a file name


// the activity as the sdk takes it, only what's used here
export interface PresenceActivity {
  // 0, "Playing"
  type: 0,
  details: string,
  state?: string,
  timestamps?: {start: number},
  party?: {size: [number, number]},
}

// the api's seats (`MAX_ROOM_PLAYERS` in notsobot.api's activity_games/rooms.py, `ROOM_MAX_EDITORS` in ../room.ts):
// a party shows as "(3 of 32)" next to the state
export const PRESENCE_GAME_SEATS = 32;
export const PRESENCE_EDITOR_SEATS = 10;

type Translate = typeof translate;

// between the parts of a state line, as the bot's info displays join theirs
const SEPARATOR = ' • ';


// after the game's or the editor's name: the room's own name when it's open to anyone, otherwise only what kind of
// room it is. Null for an unnamed open room
export function roomLabel(room: PipRoom, t: Translate): string | null {
  if (room.solo) {
    return t('editor.presence.solo');
  }
  if (room.locked) {
    return t('editor.presence.private_room');
  }
  // one line on the profile (the api keeps names to 40 characters already)
  const name = room.name?.replace(/\s+/g, ' ').trim();
  return (name) ? name : null;
}

// the first line, Discord takes up to 128 characters
function detailsOf(title: string, room: PipRoom, t: Translate): string {
  return [ title, roomLabel(room, t) ].filter(Boolean).join(SEPARATOR).slice(0, 128);
}

// what the timer counts from (`PresenceSender.update`): a room from when they entered it, even when it's renamed;
// anywhere else from when the first line changed
export function presenceSession(phase: Phase, activity: Omit<PresenceActivity, 'timestamps'>): string {
  switch (phase.kind) {
    case 'game':
      return `game:${phase.gameId}`;
    case 'editor':
      return `editor:${phase.documentId}`;
    default:
      return `details:${activity.details}`;
  }
}


// what the profile says on a screen, `null` for the ones that say nothing (starting up, failed: whatever Discord shows
// by itself stays)
export function presenceOf(phase: Phase, status: PipStatus, t: Translate): Omit<PresenceActivity, 'timestamps'> | null {
  // the editor and a game say what's in them once they've loaded (the joining screen before that has no status)
  if (status?.kind === 'editor' && phase.kind === 'editor') {
    return {
      type: 0,
      details: detailsOf(t('editor.title'), status.room, t),
      state: t((status.watching) ? 'editor.presence.watching_edit' : 'editor.presence.editing'),
      // only once someone else is in it: "(1 of 10)" alone in a lobby reads as an empty room
      ...((1 < status.people) ? {party: {size: [status.people, PRESENCE_EDITOR_SEATS]}} : {}),
    };
  }
  if (status?.kind === 'game' && phase.kind === 'game') {
    const round = (status.round) ? t((status.letters) ? 'editor.presence.round_letters' : 'editor.presence.round_flag', {number: status.round.number, total: status.round.total}) : null;
    const where = (status.phase === 'lobby') ? t('editor.presence.lobby')
      : (status.phase === 'finished') ? t('editor.pip.game_over')
      : round;
    const state = [ (status.watching) ? t('editor.pip.watching') : null, where ].filter(Boolean).join(SEPARATOR);
    return {
      type: 0,
      details: detailsOf(t((status.letters) ? 'games.letters.title' : 'games.flag.title'), status.room, t),
      ...((state) ? {state} : {}),
      ...((1 < status.players) ? {party: {size: [status.players, PRESENCE_GAME_SEATS]}} : {}),
    };
  }
  switch (phase.kind) {
    case 'loading':
    case 'failed':
      return null;
    case 'choice':
      return {type: 0, details: t('editor.presence.main_menu'), state: t('editor.presence.choosing')};
    case 'server_settings':
      return {type: 0, details: t('editor.presence.settings'), state: t('editor.presence.server_settings')};
    case 'user_settings':
      return {type: 0, details: t('editor.presence.settings'), state: t('editor.presence.personal_settings')};
    case 'games_tab':
      return {type: 0, details: t('editor.presence.games'), state: t('editor.presence.picking_game')};
    case 'games':
      // the room list filtered to one game says which, the whole list just games
      return {type: 0, details: (phase.game) ? t(gameInfo(phase.game).title) : t('editor.presence.games'), state: t('editor.presence.looking_for_room')};
    case 'flag_carry':
      return {type: 0, details: t('games.flag.title'), state: t('editor.presence.starting_game')};
    case 'lobbies':
    case 'start':
      return {type: 0, details: t('editor.title'), state: t('editor.presence.starting_edit')};
    case 'editor':
      return {type: 0, details: t('editor.title'), state: t('editor.presence.opening_edit')};
    case 'game':
      // the room's own game isn't known until its first state: the room list's filter when it had one
      return {type: 0, details: (phase.game) ? t(gameInfo(phase.game).title) : t('editor.presence.games'), state: t('editor.presence.joining_room')};
  }
}


// Discord's client takes a handful of presence updates a window and drops the rest, so at most one goes out every
// `MIN_GAP` ms and only the newest of the ones asked for meanwhile, and the same one twice is sent once.
// The timer next to it (`timestamps.start`) counts from when its session last changed (`presenceSession`, the first
// line when none is given): how long they've been in this room, not since the Activity opened
export const PRESENCE_MIN_GAP = 4 * 1000;

export class PresenceSender {
  private sentKey: string | null = null;
  private pending: Omit<PresenceActivity, 'timestamps'> | null = null;
  private lastSentAt = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private session: string | null = null;
  private startedAt = 0;
  private closed = false;

  constructor(
    private readonly send: (activity: PresenceActivity) => Promise<unknown>,
    private readonly now: () => number = Date.now,
  ) {}

  update(activity: Omit<PresenceActivity, 'timestamps'> | null, session: string | null = activity?.details ?? null): void {
    if (this.closed || !activity) {
      return;
    }
    if (session !== this.session) {
      this.session = session;
      this.startedAt = this.now();
    }
    this.pending = activity;
    this.flush();
  }

  close(): void {
    this.closed = true;
    this.pending = null;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private flush(): void {
    if (this.timer !== null || !this.pending) {
      return;
    }
    const activity: PresenceActivity = {...this.pending, timestamps: {start: this.startedAt}};
    const key = JSON.stringify(activity);
    if (key === this.sentKey) {
      this.pending = null;
      return;
    }
    const wait = this.lastSentAt + PRESENCE_MIN_GAP - this.now();
    if (0 < wait) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush();
      }, wait);
      return;
    }
    this.pending = null;
    this.sentKey = key;
    this.lastSentAt = this.now();
    // a profile line isn't worth a failure on screen: the next change tries again
    this.send(activity).catch((error) => {
      console.warn('[editor activity] setActivity failed', error);
      if (this.sentKey === key) {
        this.sentKey = null;
      }
    });
  }
}
