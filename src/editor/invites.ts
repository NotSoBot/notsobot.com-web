// Room invites (activity-plan.md "Room invites"): a code that opens the Activity straight into one room, an editor
// lobby or a flag game room. Anyone in the room makes one (`POST /activity/invites`), it lasts 24 hours and stands in
// for a password room's password. It reaches people as a Discord share link (`custom_id: 'invite:<code>'`, read back
// from `sdk.customId`) or the bot's post in the channel (its Join launches with surface `invite` and `invite_code`)
import { pathId, type EditorApiError, type EditorRequest } from './api';


export type RoomInviteKind = 'editor' | 'game';

// a new invite: `expires_at` 24 hours on
export interface RoomInvite {
  code: string,
  expires_at: string | number,
}

// what a redeemed invite opens. For a game the redeemer is now allowed into a password room, for the editor the
// socket's `editing` op takes the code instead of the password
export interface RedeemedInvite {
  kind: RoomInviteKind,
  // the lobby's document id or the game id
  room_id: string,
  name: string | null,
  inviter: {user_id: string, username: string, avatar_url: string | null},
  locked: boolean,
  watch_only: boolean,
}

// a shared invite link's `custom_id` (`invite:<code>`)
export const INVITE_CUSTOM_ID = 'invite:';


// an invite code from a link or a launch (`secrets.token_urlsafe(9)`: 12 url-safe characters), anything else is ignored
export function inviteCodeOf(value: unknown): string | null {
  return (typeof value === 'string' && /^[\w-]{6,32}$/.test(value)) ? value : null;
}


export function createInvitesApi(request: EditorRequest) {
  return {
    // by someone in that room right now (10/min)
    create: (instanceId: string, kind: RoomInviteKind, roomId: string) => request<RoomInvite>('/activity/invites', {
      method: 'POST',
      body: {instance_id: instanceId, kind, room_id: roomId},
    }),
    // refused: unknown or expired (10047), the room gone (10043 / 10046), removed from it (50062), another server's (403)
    redeem: (code: string, instanceId: string) => request<RedeemedInvite>(`/activity/invites/${pathId(code)}/redeem`, {
      method: 'POST',
      body: {instance_id: instanceId},
    }),
  };
}


// what Discord's share sheet did: sent in a chat, the link copied, or closed
export type InviteShareResult = 'sent' | 'copied' | 'none';


// One room's Invite dialog, bound to that room by the host (the Activity, or a dev mock)
export interface RoomInviter {
  kind: RoomInviteKind,
  // a new invite to this room
  create: () => Promise<RoomInvite>,
  // Discord's share sheet: a link that launches the Activity on the invite
  shareLink: (code: string) => Promise<InviteShareResult>,
  // the bot posts it in the activity's channel with a Join button, `posted: false` with why when it can't
  post: (code: string) => Promise<{posted: boolean, reason?: string}>,
  errorOf: (error: unknown) => EditorApiError | null,
}
