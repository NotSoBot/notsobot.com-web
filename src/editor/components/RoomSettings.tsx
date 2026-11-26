import { Lock, User, Users } from 'lucide-react';
import { useId } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { ROOM_MAX_EDITORS } from '../room';
import { MIN_PASSWORD_LENGTH, PasswordInput } from './SaveTemplate';


// who a new edit in the Activity is for: just me (a document of their own, nobody else sees it), everyone (a room
// anyone in the activity can join) or everyone with the password
export type LobbyMode = 'solo' | 'public' | 'password';

const LOBBY_MODES: ReadonlyArray<LobbyMode> = ['solo', 'public', 'password'];
// the api's `MAX_LOBBY_NAME_LENGTH`
export const MAX_ROOM_NAME_LENGTH = 40;


// a password room needs one at least MIN_PASSWORD_LENGTH long, everything else is ready as it is
export function roomSettingsReady(mode: LobbyMode, password: string, keepsPassword: boolean = false): boolean {
  if (mode !== 'password' || (keepsPassword && !password)) {
    return true;
  }
  return MIN_PASSWORD_LENGTH <= password.length;
}


// Just me / Everyone / Password, the room's name and its password: the start screen's and Fork's
export function RoomSettingsFields({ mode, onModeChange, name, onNameChange, password, onPasswordChange, modes = LOBBY_MODES, keepsPassword = false }: {
  // the choices shown, a room's own settings leave out Just me
  modes?: ReadonlyArray<LobbyMode>,
  // a password room's settings: an empty password keeps the one it has
  keepsPassword?: boolean,
  mode: LobbyMode,
  onModeChange: (value: LobbyMode) => void,
  name: string,
  onNameChange: (value: string) => void,
  password: string,
  onPasswordChange: (value: string) => void,
}) {
  const { t } = useI18n();
  const nameId = useId();
  const passwordId = useId();
  return (
    <div className='flex flex-col gap-2'>
      <div role='radiogroup' aria-label={t('editor.session.mode')} className={cn('grid gap-1 rounded-lg bg-deep p-1', (modes.length === 3) ? 'grid-cols-3' : 'grid-cols-2')}>
        {modes.map((value) => (
          <button
            key={value}
            type='button'
            role='radio'
            aria-checked={mode === value}
            onClick={() => onModeChange(value)}
            className={cn(
              'flex min-h-10 items-center justify-center gap-1.5 rounded-md px-1.5 text-sm font-semibold transition-colors',
              (mode === value) ? 'bg-brand text-white' : 'text-muted hover:text-fg',
            )}
          >
            {(value === 'solo') ? <User aria-hidden className='size-4 shrink-0'/> : (value === 'public') ? <Users aria-hidden className='size-4 shrink-0'/> : <Lock aria-hidden className='size-4 shrink-0'/>}
            <span className='truncate'>{t(`editor.session.mode_${value}`)}</span>
          </button>
        ))}
      </div>
      <p className='text-xs text-subtle'>{t(`editor.session.mode_${mode}_hint`, {limit: ROOM_MAX_EDITORS})}</p>
      {(mode !== 'solo') ? (
        <div>
          <label htmlFor={nameId} className='mb-1.5 block text-sm text-muted'>{t('editor.session.room_name')}</label>
          <input
            id={nameId}
            value={name}
            maxLength={MAX_ROOM_NAME_LENGTH}
            autoComplete='off'
            placeholder={t('editor.session.room_name_placeholder')}
            onChange={(event) => onNameChange(event.target.value)}
            className='input'
          />
        </div>
      ) : null}
      {(mode === 'password') ? (
        <div>
          <label htmlFor={passwordId} className='mb-1.5 block text-sm text-muted'>{t('editor.session.lobby_password')}</label>
          <PasswordInput id={passwordId} value={password} onChange={onPasswordChange} autoComplete='new-password' placeholder={(keepsPassword) ? t('editor.room.password_keep') : t('editor.session.lobby_password_placeholder')}/>
          {(password && password.length < MIN_PASSWORD_LENGTH) ? (
            <p className='mt-1.5 text-xs text-danger-text'>{t('editor.template.password_short', {count: MIN_PASSWORD_LENGTH})}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
