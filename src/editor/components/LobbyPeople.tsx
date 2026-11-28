import { DoorClosed, Settings2, UserX } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDismiss } from '@/hooks/useDismiss';
import { useI18n } from '@/i18n';
import { userDefaultAvatarUrl } from '@/lib/discord';
import { cn } from '@/lib/utils';

import { ROOM_MAX_EDITORS, type EditorRoom, type RoomMember } from '../room';
import { canModerateRoom, CloseRoomDialog, RoomSettingsDialog } from './RoomModeration';


// how many faces show before the rest become "+N"
const SHOWN_FACES = 4;


// Discord's default avatar for an id, null for ids that aren't snowflakes (web guests). Room members carry no
// discriminator, so legacy-tag users get the id's one, which can be a different colour from what Discord shows them
function defaultAvatarUrl(userId: string): string | null {
  if (!/^\d+$/.test(userId)) {
    return null;
  }
  return userDefaultAvatarUrl({id: userId, discriminator: '0'});
}


export function MemberAvatar({ member, className }: {member: Pick<RoomMember, 'user_id' | 'username' | 'avatar_url'>, className?: string}) {
  // the urls that failed to load: a stored avatar hash goes stale once they change it (the cdn 404s), then Discord's
  // default avatar stands in, and if that fails too, their initial
  const [failed, setFailed] = useState<ReadonlyArray<string>>([]);
  const fallback = defaultAvatarUrl(member.user_id);
  const src = [member.avatar_url, fallback].find((url): url is string => !!url && !failed.includes(url));
  if (src) {
    return (
      <img
        src={src}
        alt=''
        className={cn('rounded-full bg-surface object-cover', className)}
        onError={() => setFailed((urls) => [...urls, src])}
      />
    );
  }
  return (
    <span aria-hidden className={cn('flex items-center justify-center rounded-full bg-brand text-xs font-bold text-white', className)}>
      {member.username.charAt(0).toUpperCase()}
    </span>
  );
}


// a row of faces, the first few and "+N", for lobby cards and the editor's header
export function MemberFaces({ members, size = 'size-7', ring = 'border-deep' }: {members: Array<RoomMember>, size?: string, ring?: string}) {
  const shown = members.slice(0, SHOWN_FACES);
  const more = members.length - shown.length;
  return (
    <span className='flex -space-x-2'>
      {shown.map((member) => <MemberAvatar key={member.user_id} member={member} className={cn('border-2', size, ring)}/>)}
      {(more > 0) ? (
        <span className={cn('flex items-center justify-center rounded-full border-2 bg-surface-3 text-[0.65rem] font-bold text-fg', size, ring)}>+{more}</span>
      ) : null}
    </span>
  );
}


// What's open from the header's faces: the list, or one of the dialogs it leads to (the list stays under them and is
// what they close back to). What a dialog is about is as it was when it opened: the room's name, the person to remove
type PeoplePanel =
  | {kind: 'list'}
  | {kind: 'settings'}
  | {kind: 'close', name: string}
  | {kind: 'remove', member: RoomMember, pending: boolean, error: string | null};


// The header's "who's editing this": only this room's editors (others in the activity are in other rooms or choosing
// one), tap for the whole list. Its creator and server moderators also remove people from it and close it here
export function LobbyPeople({ editors, room, documentId, ownerId, roomName, lobbyName, locked, watchOnly = false }: {
  editors: Array<RoomMember>,
  room: EditorRoom,
  documentId: string,
  ownerId: string,
  roomName: string,
  // the room's own settings, for its creator's Room settings
  lobbyName: string | null,
  locked: boolean,
  watchOnly?: boolean,
}) {
  const { t } = useI18n();
  const you = room.you;
  const [ panel, setPanel ] = useState<PeoplePanel | null>(null);
  const moderates = canModerateRoom(room, ownerId);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  // only the list itself: a dialog over it has its own Escape and backdrop
  useDismiss(rootRef, panel?.kind === 'list', () => setPanel(null));

  const backToList = () => setPanel({kind: 'list'});
  // (outside the faces below: with nobody listed for a moment, which is what a reconnect looks like to someone alone in
  // their room, an open dialog used to go and come back empty)
  const dialogs = (
    <>
      {(panel?.kind === 'settings') ? <RoomSettingsDialog room={room} documentId={documentId} name={lobbyName} locked={locked} watchOnly={watchOnly} onClose={backToList}/> : null}
      {(panel?.kind === 'close') ? <CloseRoomDialog room={room} documentId={documentId} name={panel.name} onClose={backToList}/> : null}
      {(panel?.kind === 'remove') ? (
        // removed is kept out of the room (for days): asked first, about whoever was pressed (the list moves as people
        // come and go)
        <ConfirmDialog
          title={t('editor.room.remove', {name: panel.member.username})}
          confirmLabel={t('editor.room.remove', {name: panel.member.username})}
          pending={panel.pending}
          error={panel.error}
          onConfirm={async () => {
            const { member } = panel;
            setPanel({kind: 'remove', member, pending: true, error: null});
            const result = await room.kick(documentId, member.user_id);
            setPanel((current) => {
              if (current?.kind !== 'remove' || current.member.user_id !== member.user_id) {
                return current;
              }
              return (result.ok) ? {kind: 'list'} : {kind: 'remove', member, pending: false, error: result.message};
            });
          }}
          onClose={backToList}
        />
      ) : null}
    </>
  );

  const label = t('editor.session.editing_count', {count: editors.length, limit: ROOM_MAX_EDITORS});
  // the same root with or without anyone listed (a reconnect's `ready` lists nobody for a moment): a different one
  // each way had React remount an open dialog on both flips, and what was typed in it went
  return (
    <div ref={rootRef} data-state={panel?.kind ?? 'closed'} className={(editors.length) ? 'relative' : 'contents'}>
      {(editors.length) ? (
      <>
      <button
        type='button'
        aria-expanded={panel !== null}
        aria-controls={listId}
        aria-label={label}
        title={label}
        onClick={() => setPanel((current) => (current) ? null : {kind: 'list'})}
        className='flex min-h-10 items-center rounded-lg px-1 hover:bg-surface'
      >
        <MemberFaces members={editors}/>
      </button>
      {(panel) ? (
        <div id={listId} className='absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-line-strong bg-surface-2 p-2 shadow-xl'>
          <p className='px-1 pb-1.5 text-xs font-semibold text-subtle'>{label}</p>
          <ul className='flex max-h-72 flex-col gap-0.5 overflow-y-auto'>
            {editors.map((member) => (
              <li key={member.user_id} className='flex min-h-9 items-center gap-2 rounded-md px-1'>
                <MemberAvatar member={member} className='size-6 shrink-0'/>
                <span className='min-w-0 flex-1 truncate text-sm text-fg'>{member.username}</span>
                {(member.user_id === ownerId) ? <span className='text-xs text-subtle'>{t('editor.room.creator')}</span> : null}
                {(member.user_id === you) ? <span className='text-xs text-subtle'>{t('editor.session.you')}</span> : null}
                {(moderates && member.user_id !== you && member.user_id !== ownerId) ? (
                  <button
                    type='button'
                    aria-label={t('editor.room.remove', {name: member.username})}
                    title={t('editor.room.remove', {name: member.username})}
                    onClick={() => setPanel({kind: 'remove', member, pending: false, error: null})}
                    className='flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger-text'
                  >
                    <UserX aria-hidden className='size-4'/>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {(ownerId === you) ? (
            <button
              type='button'
              onClick={() => setPanel({kind: 'settings'})}
              className='mt-1.5 flex min-h-9 w-full items-center gap-2 rounded-md border-t border-line-strong px-1 pt-1.5 text-left text-sm font-semibold text-fg hover:bg-surface-3'
            >
              <Settings2 aria-hidden className='size-4'/>{t('editor.room.settings')}
            </button>
          ) : null}
          {(moderates) ? (
            <button
              type='button'
              onClick={() => setPanel({kind: 'close', name: roomName})}
              className='mt-1.5 flex min-h-9 w-full items-center gap-2 rounded-md border-t border-line-strong px-1 pt-1.5 text-left text-sm font-semibold text-danger-text hover:bg-surface-3'
            >
              <DoorClosed aria-hidden className='size-4'/>{t('editor.room.close_or_delete')}
            </button>
          ) : null}
        </div>
      ) : null}
      </>
      ) : null}
      {dialogs}
    </div>
  );
}
