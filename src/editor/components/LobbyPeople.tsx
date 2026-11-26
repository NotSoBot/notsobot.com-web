import { DoorClosed, Settings2, UserX } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { ROOM_MAX_EDITORS, type EditorRoom, type RoomMember } from '../room';
import { canModerateRoom, CloseRoomDialog, RoomSettingsDialog } from './RoomModeration';


// how many faces show before the rest become "+N"
const SHOWN_FACES = 4;


export function MemberAvatar({ member, className }: {member: Pick<RoomMember, 'username' | 'avatar_url'>, className?: string}) {
  if (member.avatar_url) {
    return <img src={member.avatar_url} alt='' className={cn('rounded-full bg-surface object-cover', className)}/>;
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


// The header's "who's editing this": only this room's editors (others in the activity are in other rooms or choosing
// one), tap for the whole list. Its creator and server moderators also remove people from it and close it here
export function LobbyPeople({ editors, room, documentId, ownerId, roomName, lobbyName, locked }: {
  editors: Array<RoomMember>,
  room: EditorRoom,
  documentId: string,
  ownerId: string,
  roomName: string,
  // the room's own settings, for its creator's Room settings
  lobbyName: string | null,
  locked: boolean,
}) {
  const { t } = useI18n();
  const you = room.you;
  const [ open, setOpen ] = useState(false);
  const [ removing, setRemoving ] = useState<string | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  const [ closing, setClosing ] = useState(false);
  const [ editing, setEditing ] = useState(false);
  const moderates = canModerateRoom(room, ownerId);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || closing || editing) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [closing, editing, open]);

  if (!editors.length) {
    return null;
  }
  const label = t('editor.session.editing_count', {count: editors.length, limit: ROOM_MAX_EDITORS});
  return (
    <div ref={rootRef} className='relative'>
      <button
        type='button'
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className='flex min-h-10 items-center rounded-lg px-1 hover:bg-surface'
      >
        <MemberFaces members={editors}/>
      </button>
      {(open) ? (
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
                    disabled={removing !== null}
                    aria-label={t('editor.room.remove', {name: member.username})}
                    title={t('editor.room.remove', {name: member.username})}
                    onClick={async () => {
                      setRemoving(member.user_id);
                      setError(null);
                      const result = await room.kick(documentId, member.user_id);
                      setRemoving(null);
                      if (!result.ok) {
                        setError(result.message);
                      }
                    }}
                    className='flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger-text disabled:opacity-40'
                  >
                    {(removing === member.user_id) ? <Spinner className='size-3.5'/> : <UserX aria-hidden className='size-4'/>}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {(error) ? <p role='alert' className='px-1 pt-1.5 text-xs text-danger-text'>{error}</p> : null}
          {(ownerId === you) ? (
            <button
              type='button'
              onClick={() => setEditing(true)}
              className='mt-1.5 flex min-h-9 w-full items-center gap-2 rounded-md border-t border-line-strong px-1 pt-1.5 text-left text-sm font-semibold text-fg hover:bg-surface-3'
            >
              <Settings2 aria-hidden className='size-4'/>{t('editor.room.settings')}
            </button>
          ) : null}
          {(moderates) ? (
            <button
              type='button'
              onClick={() => setClosing(true)}
              className='mt-1.5 flex min-h-9 w-full items-center gap-2 rounded-md border-t border-line-strong px-1 pt-1.5 text-left text-sm font-semibold text-danger-text hover:bg-surface-3'
            >
              <DoorClosed aria-hidden className='size-4'/>{t('editor.room.close_or_delete')}
            </button>
          ) : null}
        </div>
      ) : null}
      {(editing) ? <RoomSettingsDialog room={room} documentId={documentId} name={lobbyName} locked={locked} onClose={() => setEditing(false)}/> : null}
      {(closing) ? <CloseRoomDialog room={room} documentId={documentId} name={roomName} onClose={() => setClosing(false)}/> : null}
    </div>
  );
}
