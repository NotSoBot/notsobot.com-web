import { EditorErrorCodes } from '../api';
import { INVITE_CUSTOM_ID, inviteCodeOf, type RoomInviteKind } from '../invites';


// How the bot launched the Activity, the api's `launch.surface` (each person's own launch): Discord's app launcher or
// Launch button (`entry_point`), Edit Media / Edit Avatar, `/editor` (`command`) and the Join on its launch message
// (`join`), a shared template's post (`template_post`), `/games` (`games`) and the Join on its message (`games_join`),
// the Join on a room invite's post (`invite`, with `invite_code`), and Open in Activity on the in-chat Flag Guesser
// (`flag_guesser`)
export type ActivityLaunchSurface = 'entry_point' | 'edit_media' | 'edit_avatar' | 'command' | 'join' | 'template_post' | 'games' | 'games_join' | 'invite' | 'flag_guesser';

// the first screen after sign-in: a new edit, the Games tab (`games`), Flag Guesser's rooms, the editor's rooms or the
// mode choice
export type ActivityLaunchScreen = 'start' | 'games' | 'flag_guesser' | 'editor' | 'choice';


// Something launched on (media or a template) is a new edit. `/games` opens on the game rooms, the editor's own launches
// on the editor's rooms (an Edit Media/Avatar or template launch whose media or template is gone too), and the app
// launcher, no launch or a surface this build doesn't know on the mode choice. Both room lists go back to the choice
export function launchScreen(surface: string | null, launchedOn: boolean): ActivityLaunchScreen {
  if (launchedOn) {
    return 'start';
  }
  switch (surface as ActivityLaunchSurface | null) {
    case 'games':
    case 'games_join':
      return 'games';
    case 'flag_guesser':
      return 'flag_guesser';
    case 'command':
    case 'join':
    case 'edit_media':
    case 'edit_avatar':
    case 'template_post':
      return 'editor';
    // an invite launch is redeemed first (launchInviteCode, inviteScreen), one without its code opens on the choice
    case 'invite':
    default:
      return 'choice';
  }
}


// the room invite they launched on: a shared invite link (Discord's `custom_id`, `invite:<code>`), or the Join on the
// bot's invite post (surface `invite` with `invite_code`). The link wins, it's what they just opened
export function launchInviteCode(customId: string | null | undefined, launch: Record<string, unknown> | null): string | null {
  if (customId?.startsWith(INVITE_CUSTOM_ID)) {
    return inviteCodeOf(customId.slice(INVITE_CUSTOM_ID.length));
  }
  return (launch?.surface === 'invite') ? inviteCodeOf(launch.invite_code) : null;
}


// where an invite lands: the room's kind once it's redeemed (the editor's room, entered with it, or the game). A
// refused one lands on that kind's room list when the error says which (its room is gone), the mode choice otherwise
// (unknown or expired, removed from it, another server's), the api's message as the notice either way
export function inviteScreen(kind: RoomInviteKind | null, errorCode: number | null = null): ActivityLaunchScreen {
  if (kind === 'editor' || errorCode === EditorErrorCodes.UNKNOWN_EDITOR_DOCUMENT) {
    return 'editor';
  }
  if (kind === 'game' || errorCode === EditorErrorCodes.UNKNOWN_ACTIVITY_GAME_ROOM) {
    return 'games';
  }
  return 'choice';
}
