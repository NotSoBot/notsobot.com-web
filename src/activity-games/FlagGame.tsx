import { ArrowLeft, Eye, Globe, Lock, RotateCw, Settings2, Square, Trash2, WifiOff, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { HowToPlayButton } from '@/components/guides/GuideSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DialogError } from '@/components/ui/DialogError';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ActivityLogButton } from '@/editor/components/ActivityLogButton';
import { RoomInviteButton } from '@/editor/components/RoomInvite';
import type { RoomInviter } from '@/editor/invites';
import type { EditorRoom, RoomClose } from '@/editor/room';
import { useI18n, type TranslationKey } from '@/i18n';
import { usePublishPipStatus } from '@/editor/hosts/pip';

import { gameInfo } from './catalog';
import { RoomFlagGame, type FlagGameConnection } from './connection';
import { Finished } from './Finished';
import { GameRoomFields, GameRoomVisibilityField, type RoomMode } from './GameRooms';
import { rankedPlayers, useFlagImage, useGameSnapshot } from './hooks';
import { LetterTrailReveal, LetterTrailRound } from './LetterTrail';
import { Lobby } from './Lobby';
import { GameCloseCodes, isLetterTrail, ROOM_PASSWORD_MIN, type AnyGameState, type GameRoomVisibility } from './protocol';
import { Reveal } from './Reveal';
import { Round } from './Round';
import { storeSoloSettings } from './solo';


// why a game ended for good (`game.closed`'s code), as the room list says it
export function deniedMessageKey(closeCode: number | null): TranslationKey {
  switch (closeCode) {
    case GameCloseCodes.UNAUTHORIZED: return 'games.flag.denied_token';
    case GameCloseCodes.KICKED: return 'games.rooms.kicked';
    case GameCloseCodes.LOCKED: return 'games.rooms.locked_out';
    case GameCloseCodes.ROOM_GONE: return 'games.rooms.closed';
    case GameCloseCodes.FULL: return 'games.rooms.full';
    default: return 'games.flag.denied';
  }
}


// the api closes a person's extra sockets with this (`ROOM_MAX_USER_SOCKETS`), a flood has the same code
const TOO_MANY_SOCKETS = {code: 4029, reason: 'too many sockets open'};

// what the joining screen says under its title: why the Activity's socket is down when it is (it used to say nothing
// for as long as that lasted), or that the join is slow
function joiningDescription(socketClose: RoomClose | null, slow: boolean, t: (key: TranslationKey) => string): string | undefined {
  if (socketClose?.code === TOO_MANY_SOCKETS.code && socketClose.reason === TOO_MANY_SOCKETS.reason) {
    return t('games.flag.joining_too_many');
  }
  if (socketClose) {
    return t('games.flag.joining_socket');
  }
  return (slow) ? t('games.flag.joining_slow') : undefined;
}


// A game room in the Activity, any game's (activity-plan.md "Flag game in the Activity", word-game-plan.md): the header,
// the connection's banners and the room's dialogs are every game's, the screens under them its game's (`room.game`:
// Flag Guesser's here, Letter Trail's from ./LetterTrail). The api runs it, this shows its state: lobby → rounds with
// reveals between → final scores. Watchers see it all and answer nothing.
// `inviter`: the header's Invite (anyone in the room makes one) and the lobby's while the host is alone. A solo room
// (Play solo) has neither, nor room settings or Close: it's theirs alone, and its settings are kept for the next one
// `owner`: a NotSoBot owner, the header has the connection logs
export function FlagGame({ connection, inviter, owner = false, onLeave }: {connection: FlagGameConnection, inviter?: RoomInviter, owner?: boolean, onLeave: (notice?: string) => void}) {
  const { t } = useI18n();
  const snapshot = useGameSnapshot(connection);
  const [ ending, setEnding ] = useState(false);
  const [ editing, setEditing ] = useState(false);
  const [ closing, setClosing ] = useState(false);
  // a confirmed End or Close that wasn't sent (the socket's reconnecting), its dialog says so
  const [ unsent, setUnsent ] = useState(false);
  const game = snapshot.game;
  const isHost = Boolean(snapshot.you && game?.host_id === snapshot.you);
  const isCreator = Boolean(snapshot.you && game?.room.creator.user_id === snapshot.you);
  const solo = Boolean(game?.room.solo);
  const roomInviter = (solo) ? undefined : inviter;
  const info = gameInfo(game?.room.game);
  const GameIcon = info.icon;
  // the settings they play alone with, for their next Play solo
  const settings = game?.settings;
  useEffect(() => {
    if (solo && isCreator && settings) {
      storeSoloSettings(info.id, settings);
    }
  }, [solo, isCreator, settings, info.id]);
  // the Activity's small window when they tab out (editor/hosts/pip.tsx): the room, its round, the flag and their score
  const pipFlag = useFlagImage(connection, (game && !isLetterTrail(game)) ? game.round?.flag_url ?? null : null).src;
  const ranked = (game) ? rankedPlayers(game) : [];
  const you = ranked.find((player) => player.user_id === snapshot.you) ?? null;
  usePublishPipStatus((game) ? {
    kind: 'game',
    title: game.room.name ?? t(info.title),
    phase: game.phase,
    round: (game.round) ? {number: game.round.number, total: game.round.total} : null,
    score: you?.score ?? null,
    rank: (you) ? ranked.indexOf(you) + 1 : null,
    players: ranked.length,
    watching: game.you_watch,
    flagUrl: pipFlag,
    letters: isLetterTrail(game),
  } : null);

  // removed or closed: back to the room list, saying why (anything else stays on its own screen)
  useEffect(() => {
    if (snapshot.status === 'denied' && (snapshot.closeCode === GameCloseCodes.KICKED || snapshot.closeCode === GameCloseCodes.ROOM_GONE || snapshot.closeCode === GameCloseCodes.LOCKED || snapshot.closeCode === GameCloseCodes.FULL)) {
      onLeave(t(deniedMessageKey(snapshot.closeCode)));
    }
  }, [snapshot.status, snapshot.closeCode, onLeave, t]);

  if (snapshot.status === 'denied') {
    return (
      <FullPageMessage title={t(deniedMessageKey(snapshot.closeCode))}>
        {(owner) ? <ActivityLogButton className='btn btn-secondary'/> : null}
        <button type='button' className='btn btn-secondary' onClick={() => onLeave()}>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.rooms.back')}
        </button>
      </FullPageMessage>
    );
  }

  return (
    <div className='flex min-h-[var(--editor-height,100dvh)] flex-col bg-bg text-fg'>
      <header className='border-b border-line'>
        <div className='mx-auto flex w-full max-w-5xl items-center gap-2 px-2 py-1.5'>
          <button type='button' onClick={() => onLeave()} className='inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
            <ArrowLeft aria-hidden className='size-4'/><span className='max-sm:sr-only'>{t('games.rooms.back')}</span>
          </button>
          <h1 className='flex min-w-0 flex-1 items-center justify-center gap-1.5 font-display text-base font-bold text-white'>
            <GameIcon aria-hidden className='size-4 shrink-0 text-brand-text'/>
            <span className='truncate'>{game?.room.name ?? t(info.title)}</span>
            {(game?.room.visibility === 'global') ? <Globe aria-label={t('games.rooms.visibility_global')} className='size-3.5 shrink-0 text-subtle'/> : null}
            {(game?.room.locked) ? <Lock aria-label={t('games.rooms.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
            {(game?.room.watch_only) ? <Eye aria-label={t('games.rooms.watch_only')} className='size-3.5 shrink-0 text-subtle'/> : null}
            {(solo) ? <span className='shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-muted'>{t('games.rooms.solo_badge')}</span> : null}
          </h1>
          <span className='flex shrink-0 items-center'>
            {(owner) ? <ActivityLogButton/> : null}
            <HowToPlayButton guide={info.guide} markUnseen className='size-11'/>
            {(game && roomInviter) ? <RoomInviteButton inviter={roomInviter} compact/> : null}
            {(isHost && (game?.phase === 'round' || game?.phase === 'reveal')) ? (
              <button type='button' onClick={() => setEnding(true)} className='inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-danger-text hover:bg-surface'>
                <Square aria-hidden className='size-3.5'/><span className='max-sm:sr-only'>{t('games.flag.end')}</span>
              </button>
            ) : null}
            {(game && isCreator && !solo) ? (
              <button type='button' aria-label={t('games.rooms.settings')} title={t('games.rooms.settings')} onClick={() => setEditing(true)} className='flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg'>
                <Settings2 aria-hidden className='size-4'/>
              </button>
            ) : null}
            {(game && !solo && (isCreator || snapshot.moderator)) ? (
              <button type='button' aria-label={t('games.rooms.close')} title={t('games.rooms.close')} onClick={() => setClosing(true)} className='flex size-11 items-center justify-center rounded-lg text-danger-text hover:bg-surface'>
                <Trash2 aria-hidden className='size-4'/>
              </button>
            ) : null}
          </span>
        </div>
      </header>

      {(game && snapshot.status !== 'open') ? (
        <p role='status' className='flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning'>
          <WifiOff aria-hidden className='size-4'/>{t('games.flag.reconnecting')}
        </p>
      ) : null}
      {(snapshot.error) ? (
        <div role='alert' className='flex items-center gap-2 border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger-text'>
          <span className='flex-1'>{snapshot.error}</span>
          <button type='button' aria-label={t('ui.close')} onClick={() => connection.dismissError()} className='flex size-8 items-center justify-center rounded-md hover:bg-surface'>
            <X aria-hidden className='size-4'/>
          </button>
        </div>
      ) : null}

      {(!game) ? (
        <FullPageMessage title={t('games.flag.joining')} description={joiningDescription(snapshot.socketClose, snapshot.slowJoin, t)}>
          {(snapshot.slowJoin && snapshot.status !== 'open') ? (
            <button type='button' className='btn btn-secondary' onClick={() => connection.retryJoin()}>
              <RotateCw aria-hidden className='size-4'/>{t('games.flag.joining_retry')}
            </button>
          ) : <Spinner/>}
        </FullPageMessage>
      ) : (game.phase === 'lobby') ? (
        <Lobby connection={connection} game={game} you={snapshot.you} moderator={snapshot.moderator} inviter={roomInviter}/>
      ) : (isLetterTrail(game)) ? (
        (game.phase === 'round' && game.round) ? (
          <LetterTrailRound key={`${game.round.number}:${game.round.started_at}`} connection={connection} snapshot={snapshot} game={game} round={game.round}/>
        ) : (game.phase === 'reveal' && game.reveal) ? (
          <LetterTrailReveal key={`${game.round?.number ?? 0}:${game.round?.started_at ?? 0}`} connection={connection} snapshot={snapshot} game={game} reveal={game.reveal}/>
        ) : (game.phase === 'finished') ? (
          <Finished connection={connection} game={game} you={snapshot.you} awards={snapshot.awards} onLeave={() => onLeave()}/>
        ) : (
          <FullPageMessage><Spinner/></FullPageMessage>
        )
      ) : (game.phase === 'round' && game.round) ? (
        <Round connection={connection} snapshot={snapshot} game={game} round={game.round}/>
      ) : (game.phase === 'reveal' && game.reveal) ? (
        <Reveal key={game.round?.flag_url ?? game.reveal.code} connection={connection} snapshot={snapshot} game={game} reveal={game.reveal}/>
      ) : (game.phase === 'finished') ? (
        <Finished connection={connection} game={game} you={snapshot.you} awards={snapshot.awards} onLeave={() => onLeave()}/>
      ) : (
        <FullPageMessage><Spinner/></FullPageMessage>
      )}

      {(ending) ? (
        <ConfirmDialog
          title={t('games.flag.end_title')}
          description={t('games.flag.end_description')}
          confirmLabel={t('games.flag.end')}
          tone='danger'
          error={(unsent) ? t('games.flag.reconnecting') : undefined}
          onConfirm={() => {
            // not sent while the socket's reconnecting: the dialog stays and says so, it didn't happen
            if (connection.end()) {
              setEnding(false);
            } else {
              setUnsent(true);
            }
          }}
          onClose={() => {
            setEnding(false);
            setUnsent(false);
          }}
        />
      ) : null}
      {(editing && game) ? <RoomSettingsDialog connection={connection} game={game} onClose={() => setEditing(false)}/> : null}
      {(closing) ? (
        <ConfirmDialog
          title={t('games.rooms.close_title')}
          description={t('games.rooms.close_description')}
          confirmLabel={t('games.rooms.close')}
          tone='danger'
          error={(unsent) ? t('games.flag.reconnecting') : undefined}
          onConfirm={() => {
            if (connection.closeRoom()) {
              setClosing(false);
            } else {
              setUnsent(true);
            }
          }}
          onClose={() => {
            setClosing(false);
            setUnsent(false);
          }}
        />
      ) : null}
    </div>
  );
}


// the room's creator: who finds it (this server or global, only in its lobby), its name, public or password (an empty
// password keeps the one it has), watch-only. Sent over the socket, everyone's header updates from the `state` that
// follows
function RoomSettingsDialog({ connection, game, onClose }: {connection: FlagGameConnection, game: AnyGameState, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const shownVisibility = game.room.visibility ?? 'server';
  const [ visibility, setVisibility ] = useState<GameRoomVisibility>(shownVisibility);
  const inLobby = game.phase === 'lobby';
  const [ mode, setMode ] = useState<RoomMode>((game.room.locked) ? 'password' : 'public');
  const [ name, setName ] = useState(game.room.name ?? '');
  const [ password, setPassword ] = useState('');
  const [ watchOnly, setWatchOnly ] = useState(game.room.watch_only);
  const [ error, setError ] = useState<string | null>(null);
  const keepsPassword = game.room.locked;
  const ready = mode === 'public' || (keepsPassword && !password) || ROOM_PASSWORD_MIN <= password.length;
  return (
    <Modal anchor='top' labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) {
            return;
          }
          const sent = connection.roomSettings({
            name: name.trim() || null,
            mode,
            ...((mode === 'password' && password) ? {password} : {}),
            watch_only: watchOnly,
            // only a change, and only in the lobby: the api refuses it otherwise
            ...((inLobby && visibility !== shownVisibility) ? {visibility} : {}),
          });
          if (sent) {
            onClose();
          } else {
            setError(t('games.flag.reconnecting'));
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('games.rooms.settings')}</h2>
        <GameRoomVisibilityField value={(inLobby) ? visibility : shownVisibility} onChange={setVisibility} locked={!inLobby}/>
        <GameRoomFields
          mode={mode}
          onModeChange={setMode}
          name={name}
          onNameChange={setName}
          password={password}
          onPasswordChange={setPassword}
          watchOnly={watchOnly}
          onWatchOnlyChange={setWatchOnly}
          keepsPassword={keepsPassword}
        />
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex justify-end gap-2'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={!ready}>{t('games.rooms.save')}</button>
        </div>
      </form>
    </Modal>
  );
}


// In the Activity: a room's game over the Activity's socket (whichever game it is, its first state says), joined while
// it's on screen (leaving it sends `game_leave`, the
// api marks them away). `watch`: they joined to watch
export function ActivityFlagGame({ room, gameId, apiBase, token, watch = false, owner = false, inviter, onLeave }: {
  room: EditorRoom,
  gameId: string,
  apiBase: string,
  token: string,
  watch?: boolean,
  owner?: boolean,
  inviter?: RoomInviter,
  onLeave: (notice?: string) => void,
}) {
  const [ connection ] = useState(() => new RoomFlagGame(room, gameId, apiBase, token, watch));
  useEffect(() => {
    connection.connect();
    return () => connection.close();
  }, [connection]);

  return <FlagGame connection={connection} inviter={inviter} owner={owner} onLeave={onLeave}/>;
}
