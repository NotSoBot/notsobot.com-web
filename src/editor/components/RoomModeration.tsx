import { useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import type { EditorRoom } from '../room';
import { RoomSettingsFields, roomSettingsReady, type LobbyMode } from './RoomSettings';

const ROOM_MODES: ReadonlyArray<LobbyMode> = ['public', 'password'];


// whether `you` can close or delete this room and remove people from it: its creator, or a moderator of the server
export function canModerateRoom(room: EditorRoom | null, ownerId: string | null | undefined): boolean {
  return Boolean(room && room.you && (ownerId === room.you || room.moderator));
}


// "Close or delete this room?": either way everyone in it goes back to the room list. Closing leaves its creator the
// edit as their own, deleting removes it for everyone
export function CloseRoomDialog({ room, documentId, name, onClose }: {
  room: EditorRoom,
  documentId: string,
  name: string,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ pending, setPending ] = useState<'close' | 'delete' | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  const end = async (how: 'close' | 'delete') => {
    setPending(how);
    setError(null);
    const result = (how === 'delete') ? await room.deleteLobby(documentId) : await room.closeLobby(documentId);
    setPending(null);
    if (result.ok) {
      onClose();
    } else {
      setError(result.message);
    }
  };
  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.room.end_title', {name})}</h2>
        <div className='mt-2 flex flex-col gap-2 text-sm text-muted'>
          <p>{t('editor.room.close_description')}</p>
          <p>{t('editor.room.delete_description')}</p>
        </div>
        {(error) ? <DialogError className='mt-4'>{error}</DialogError> : null}
        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={Boolean(pending)}>{t('common.cancel')}</button>
          <button type='button' className='btn btn-secondary' onClick={() => void end('close')} disabled={Boolean(pending)} data-autofocus>
            {(pending === 'close') ? <Spinner className='size-4'/> : null}
            {t('editor.room.close')}
          </button>
          <button type='button' className='btn btn-danger' onClick={() => void end('delete')} disabled={Boolean(pending)}>
            {(pending === 'delete') ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {t('editor.room.delete')}
          </button>
        </div>
      </div>
    </Modal>
  );
}


// The room's creator changes its name and whether it needs a password, mid-room. Who's in it stays in
export function RoomSettingsDialog({ room, documentId, name: currentName, locked, watchOnly: currentWatchOnly, onClose }: {
  room: EditorRoom,
  documentId: string,
  name: string | null,
  locked: boolean,
  watchOnly: boolean,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ mode, setMode ] = useState<LobbyMode>((locked) ? 'password' : 'public');
  const [ name, setName ] = useState(currentName ?? '');
  const [ password, setPassword ] = useState('');
  const [ watchOnly, setWatchOnly ] = useState(currentWatchOnly);
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  // a password room keeps its password when the box is left empty
  const keepsPassword = locked && mode === 'password';
  const ready = roomSettingsReady(mode, password, keepsPassword);

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || pending) {
            return;
          }
          setPending(true);
          setError(null);
          const result = await room.updateRoomSettings(documentId, {name, mode: (mode === 'password') ? 'password' : 'public', password, watchOnly});
          setPending(false);
          if (result.ok) {
            onClose();
          } else {
            setError(result.message);
          }
        }}
      >
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.room.settings_title')}</h2>
          <p className='mt-2 text-sm text-muted'>{t('editor.room.settings_description')}</p>
        </div>
        <RoomSettingsFields
          modes={ROOM_MODES}
          keepsPassword={keepsPassword}
          mode={mode}
          onModeChange={setMode}
          name={name}
          onNameChange={setName}
          password={password}
          onPasswordChange={setPassword}
          watchOnly={watchOnly}
          onWatchOnlyChange={setWatchOnly}
        />
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={!ready || pending}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {t('editor.room.settings_save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
