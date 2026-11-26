import { ArrowLeft, Eye, Flag, Lock, Play, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { EditorApiError } from '@/editor/api';
import { MemberAvatar } from '@/editor/components/LobbyPeople';
import type { EditorRoom } from '@/editor/room';
import { RoomSettingsFields, roomSettingsReady, type LobbyMode } from '@/editor/components/RoomSettings';
import { PasswordInput } from '@/editor/components/SaveTemplate';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { GameRoomSummary } from './protocol';
import type { GameRoomsApi } from './rooms';


// the list again this long after the api says a room changed (`game_rooms_changed`) or the socket came back, the
// changes meanwhile fold into the same fetch
const REFRESH_DELAY = 800;
// a card shows this many faces
const SHOWN_FACES = 6;


export type RoomMode = Exclude<LobbyMode, 'solo'>;
const ROOM_MODES: ReadonlyArray<LobbyMode> = ['public', 'password'];


// what the list listens to on the Activity's socket (the dev mocks have a stand-in)
export type GameRoomsFeed = Pick<EditorRoom, 'subscribe' | 'onStatus'>;


// The flag game's rooms in this server's Activity (or this dm's), like the editor's: what each plays, who's playing and
// watching. Play or watch one (a password one asks for it first), or make a new one. No polling: fetched on mount, then
// again when the socket says a room changed or reconnects
export function GameRooms({ api, room, errorOf, notice, onOpen, onBack }: {
  api: GameRoomsApi,
  room: GameRoomsFeed,
  errorOf: (error: unknown) => EditorApiError | null,
  // why they're back here (removed, the room closed)
  notice?: string | null,
  onOpen: (gameId: string, watch: boolean) => void,
  onBack: () => void,
}) {
  const { t } = useI18n();
  const [ rooms, setRooms ] = useState<Array<GameRoomSummary> | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  const [ creating, setCreating ] = useState(false);
  // a password room being joined: the room, and whether they asked to watch
  const [ unlocking, setUnlocking ] = useState<{room: GameRoomSummary, watch: boolean} | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    // a change while hidden is fetched once it's shown again
    let stale = false;
    // only the latest fetch's answer counts (an older one can come back last)
    let latest = 0;
    const refresh = () => {
      if (document.visibilityState === 'hidden') {
        stale = true;
        return;
      }
      stale = false;
      const request = ++latest;
      api.list().then((result) => {
        if (alive && request === latest) {
          setRooms(result.rooms);
          setError(null);
        }
      }).catch((failure) => {
        if (alive && request === latest) {
          setError(errorOf(failure)?.message || t('games.rooms.error'));
          setRooms((current) => current ?? []);
        }
      });
    };
    const refreshSoon = () => {
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          refresh();
        }, REFRESH_DELAY);
      }
    };
    const onVisible = () => {
      if (stale && document.visibilityState === 'visible') {
        refresh();
      }
    };
    refresh();
    const unsubscribe = room.subscribe((event) => {
      if (event.t === 'game_rooms_changed') {
        refreshSoon();
      }
    });
    // 'open' comes with each `ready`: back after a reconnect, whatever changed meanwhile wasn't said
    const unsubscribeStatus = room.onStatus((status) => {
      if (status === 'open') {
        refreshSoon();
      }
    });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      unsubscribe();
      unsubscribeStatus();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [api, room, errorOf, t]);

  const open = (room: GameRoomSummary, watch: boolean) => {
    if (room.locked) {
      // the api lets in whoever gave it already (and its creator) without asking again
      api.join(room.id).then(() => onOpen(room.id, watch)).catch(() => setUnlocking({room, watch}));
      return;
    }
    onOpen(room.id, watch);
  };

  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-[calc(1.5rem+var(--saib,0px))]'>
      <div className='flex items-center gap-2'>
        <button type='button' onClick={onBack} className='-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
        </button>
      </div>
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <h1 className='flex items-center gap-2 font-display text-2xl font-bold text-white'>
            <Flag aria-hidden className='size-6 text-success-text'/>{t('games.rooms.title')}
          </h1>
          <p className='text-sm text-muted'>{t('games.rooms.description')}</p>
        </div>
        <button type='button' className='btn btn-primary' onClick={() => setCreating(true)}>
          <Plus aria-hidden className='size-4'/>{t('games.rooms.new')}
        </button>
      </header>

      {(notice) ? <p role='status' className='rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning'>{notice}</p> : null}
      {(error) ? <DialogError>{error}</DialogError> : null}

      {(!rooms) ? (
        <div className='flex justify-center py-12'><Spinner/></div>
      ) : (rooms.length) ? (
        <ul className='flex flex-col gap-2'>
          {rooms.map((room) => <RoomCard key={room.id} room={room} onOpen={(watch) => open(room, watch)}/>)}
        </ul>
      ) : (
        <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-10 text-center'>
          <p className='text-sm text-muted'>{t('games.rooms.none')}</p>
          <button type='button' className='btn btn-secondary' onClick={() => setCreating(true)}>
            <Plus aria-hidden className='size-4'/>{t('games.rooms.new')}
          </button>
        </div>
      )}

      {(creating) ? (
        <NewRoomDialog
          api={api}
          errorOf={errorOf}
          onClose={() => setCreating(false)}
          onCreated={(room) => {
            setCreating(false);
            onOpen(room.id, false);
          }}
        />
      ) : null}
      {(unlocking) ? (
        <PasswordDialog
          api={api}
          errorOf={errorOf}
          room={unlocking.room}
          onClose={() => setUnlocking(null)}
          onJoined={() => {
            const { room, watch } = unlocking;
            setUnlocking(null);
            onOpen(room.id, watch);
          }}
        />
      ) : null}
    </div>
  );
}


function RoomCard({ room, onOpen }: {room: GameRoomSummary, onOpen: (watch: boolean) => void}) {
  const { t, plural } = useI18n();
  const shown = room.players.slice(0, SHOWN_FACES);
  const status = (room.phase === 'lobby') ? t('games.rooms.status_lobby')
    : (room.phase === 'finished') ? t('games.rooms.status_finished')
    : (room.round) ? t('games.rooms.status_round', {number: room.round.number, total: room.round.total}) : t('games.rooms.status_lobby');
  return (
    <li className='flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-3 sm:flex-row sm:items-center'>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='flex min-w-0 items-center gap-1.5'>
          <span className='truncate font-semibold text-white'>{room.name ?? t('games.rooms.unnamed', {name: room.creator.username})}</span>
          {(room.locked) ? <Lock aria-label={t('games.rooms.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
          {(room.watch_only) ? (
            <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted'>
              <Eye aria-hidden className='size-3'/>{t('games.rooms.watch_only')}
            </span>
          ) : null}
        </span>
        <span className='truncate text-xs text-subtle'>
          {[
            status,
            t(`games.flag.settings_mode_${room.settings.mode}`),
            t(`games.flag.settings_difficulty_${room.settings.difficulty}`),
            plural('games.rooms.flags', room.settings.rounds),
          ].join(' • ')}
        </span>
        <span className='flex items-center gap-2'>
          {(shown.length) ? (
            <span className='flex -space-x-1.5'>
              {shown.map((player) => <MemberAvatar key={player.user_id} member={player} className='size-6 rounded-full border-2 border-surface'/>)}
            </span>
          ) : null}
          <span className='text-xs text-muted'>
            {plural('games.rooms.playing', room.players.length)}
            {(room.watchers) ? ` • ${plural('games.rooms.watchers', room.watchers)}` : ''}
          </span>
        </span>
      </div>
      <div className='flex shrink-0 gap-2'>
        {(room.watch_only) ? (
          // the api decides: its creator and who's already playing play, everyone else watches
          <button type='button' className='btn btn-primary flex-1 sm:flex-none' onClick={() => onOpen(false)}>
            <Eye aria-hidden className='size-4'/>{t('games.rooms.watch')}
          </button>
        ) : (
          <>
            <button type='button' className='btn btn-secondary flex-1 sm:flex-none' onClick={() => onOpen(true)}>
              <Eye aria-hidden className='size-4'/>{t('games.rooms.watch')}
            </button>
            <button type='button' className='btn btn-primary flex-1 sm:flex-none' onClick={() => onOpen(false)}>
              <Play aria-hidden className='size-4'/>{t('games.rooms.play')}
            </button>
          </>
        )}
      </div>
    </li>
  );
}


// the room's name, public or password, and watch-only: a new room's, and its creator's settings in the game
export function GameRoomFields({ mode, onModeChange, name, onNameChange, password, onPasswordChange, watchOnly, onWatchOnlyChange, keepsPassword }: {
  mode: RoomMode,
  onModeChange: (mode: RoomMode) => void,
  name: string,
  onNameChange: (name: string) => void,
  password: string,
  onPasswordChange: (password: string) => void,
  watchOnly: boolean,
  onWatchOnlyChange: (watchOnly: boolean) => void,
  keepsPassword?: boolean,
}) {
  const { t } = useI18n();
  return (
    <RoomSettingsFields
      modes={ROOM_MODES}
      mode={mode}
      onModeChange={(value) => onModeChange((value === 'password') ? 'password' : 'public')}
      name={name}
      onNameChange={onNameChange}
      password={password}
      onPasswordChange={onPasswordChange}
      watchOnly={watchOnly}
      onWatchOnlyChange={onWatchOnlyChange}
      keepsPassword={keepsPassword}
      modeHint={(value) => t(`games.rooms.mode_${(value === 'password') ? 'password' : 'public'}_hint`)}
      watchOnlyHint={t('games.rooms.watch_only_hint')}
    />
  );
}


function NewRoomDialog({ api, errorOf, onClose, onCreated }: {
  api: GameRoomsApi,
  errorOf: (error: unknown) => EditorApiError | null,
  onClose: () => void,
  onCreated: (room: GameRoomSummary) => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ mode, setMode ] = useState<RoomMode>('public');
  const [ name, setName ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ watchOnly, setWatchOnly ] = useState(false);
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const ready = roomSettingsReady(mode, password);

  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || busy) {
            return;
          }
          setBusy(true);
          setError(null);
          try {
            onCreated(await api.create({
              name: name.trim() || null,
              ...((mode === 'password') ? {password} : {}),
              watch_only: watchOnly,
            }));
          } catch (failure) {
            setError(errorOf(failure)?.message || t('games.rooms.create_failed'));
            setBusy(false);
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('games.rooms.new_title')}</h2>
        <GameRoomFields
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
        <div className='flex justify-end gap-2'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={!ready || busy}>
            {(busy) ? <Spinner className='size-4'/> : <Plus aria-hidden className='size-4'/>}{t('games.rooms.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function PasswordDialog({ api, errorOf, room, onClose, onJoined }: {
  api: GameRoomsApi,
  errorOf: (error: unknown) => EditorApiError | null,
  room: GameRoomSummary,
  onClose: () => void,
  onJoined: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const passwordId = useId();
  const [ password, setPassword ] = useState('');
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-sm'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={async (event) => {
          event.preventDefault();
          if (!password || busy) {
            return;
          }
          setBusy(true);
          setError(null);
          try {
            await api.join(room.id, password);
            onJoined();
          } catch (failure) {
            setError(errorOf(failure)?.message || t('games.rooms.join_failed'));
            setBusy(false);
          }
        }}
      >
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('games.rooms.password_title')}</h2>
          <p className='mt-1 text-sm text-muted'>{t('games.rooms.password_description', {name: room.name ?? t('games.rooms.unnamed', {name: room.creator.username})})}</p>
        </div>
        <div>
          <label htmlFor={passwordId} className='sr-only'>{t('games.rooms.password')}</label>
          <PasswordInput id={passwordId} value={password} onChange={setPassword} autoComplete='current-password' autoFocus placeholder={t('games.rooms.password')}/>
        </div>
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex justify-end gap-2'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
          <button type='submit' className={cn('btn btn-primary')} disabled={!password || busy}>
            {(busy) ? <Spinner className='size-4'/> : <Lock aria-hidden className='size-4'/>}{t('games.rooms.unlock')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
