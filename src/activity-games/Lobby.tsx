import { Crown, Eye, Minus, Play, Plus, UserPlus, UserX } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { HowToPlayCard } from '@/components/guides/GuideSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { RoomInviteDialog } from '@/editor/components/RoomInvite';
import type { RoomInviter } from '@/editor/invites';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { gameInfo } from './catalog';
import type { FlagGameConnection } from './connection';
import { playerOf, useGameSnapshot } from './hooks';
import { useHowToCard } from './howTo';
import { PlayerFace } from './parts';
import {
  GAME_DIFFICULTIES,
  GAME_MODES,
  isLetterTrail,
  LETTER_TRAIL_ROUNDS_MAX,
  LETTER_TRAIL_ROUNDS_MIN,
  LETTER_TRAIL_SECONDS,
  LETTER_TRAIL_SIZES,
  ROUNDS_MAX,
  ROUNDS_MIN,
  SECONDS_MAX,
  SECONDS_MIN,
  SECONDS_STEP,
  type AnyGameSettings,
  type AnyGameState,
  type GameSettings,
  type GameWatcher,
  type LetterTrailSettings,
} from './protocol';


// the host's own change stays shown this long without the api's settings matching it, then the api's show again
const DRAFT_KEPT = 1500;


// Before a game (and after one, for "Change settings"): who's playing and watching, the room's game's settings (only the
// host changes them, the others see them as they are) and the host's Start. The room's creator (or a server moderator) removes people.
// While the host is here alone (nobody playing or watching) and the room isn't solo, a card offers its Invite (`inviter`)
export function Lobby({ connection, game, you, moderator = false, inviter }: {
  connection: FlagGameConnection,
  game: AnyGameState,
  you: string | null,
  moderator?: boolean,
  inviter?: RoomInviter,
}) {
  const { t, plural } = useI18n();
  // the connection's own two: whether an op can go out now, and a Start (or End) that's sent and not answered yet
  const { status, pendingOp } = useGameSnapshot(connection);
  const [ kicking, setKicking ] = useState<GameWatcher | null>(null);
  // the invite dialog stays open when the card goes (someone came in while it was open)
  const [ inviting, setInviting ] = useState(false);
  const creatorId = game.room.creator.user_id;
  // the room's creator can't be removed (they close the room instead), nobody removes themselves
  const canKick = (userId: string) => Boolean(you) && (you === creatorId || moderator) && userId !== you && userId !== creatorId;
  const isHost = Boolean(you) && game.host_id === you;
  const host = playerOf(game, game.host_id);
  // the host's change shows at once, the api's state replaces it
  // (kept until the api's settings are the draft's, or nothing came for a moment: a state for an earlier tap, or for
  // someone joining, used to put the old value back mid-tap and the next tap counted from it)
  const [ draft, setDraft ] = useState<AnyGameSettings | null>(null);
  useEffect(() => {
    if (!draft) {
      return;
    }
    const shown = game.settings as unknown as Record<string, unknown>;
    const applied = Object.entries(draft).every(([ key, value ]) => value === shown[key]);
    if (applied) {
      setDraft(null);
      return;
    }
    // refused or lost: the api's value shows again
    const timer = window.setTimeout(() => setDraft(null), DRAFT_KEPT);
    return () => window.clearTimeout(timer);
  }, [game.settings, draft]);
  const settings = draft ?? game.settings;
  const change = (changes: Partial<AnyGameSettings>) => {
    const next = {...settings, ...changes} as AnyGameSettings;
    setDraft(next);
    connection.settings(next);
  };
  const connected = game.players.filter((player) => player.connected).length;
  const solo = Boolean(game.room.solo);
  const alone = isHost && connected <= 1 && !game.watchers.length;
  const info = gameInfo(game.room.game);
  const [ howToShown, howToOpen, toggleHowTo ] = useHowToCard(info.id);

  return (
    <div className='flex flex-1 flex-col'>
      <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-4 pb-6 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start'>
        {/* the rules while they wait for the host: open until they've finished a game of it, one line after (the Activity's
            settings can keep it open or hide it, ./howTo) */}
        {(howToShown) ? <HowToPlayCard guide={info.guide} rules={info.lobbyRules} open={howToOpen} onToggle={toggleHowTo} className='lg:col-span-2'/> : null}
        <section aria-labelledby='flag-players' className='flex flex-col gap-3'>
          <div className='flex items-baseline gap-2'>
            <h2 id='flag-players' className='text-sm font-semibold text-white'>{t('games.flag.players')}</h2>
            <span className='text-xs text-subtle'>{plural('games.flag.players_here', connected)}</span>
          </div>
          {/* the invite card's room is kept whether it shows or not (a room for more than one): someone coming in takes a
              row of it, the last one leaving gives it back, so the settings under it never move */}
          <div className={cn('flex flex-col gap-1.5', (!solo && inviter) && 'min-h-[13.75rem]')}>
          <ul className='flex flex-col gap-1.5'>
            {game.players.map((player) => (
              <li key={player.user_id} className='flex min-h-12 items-center gap-3 rounded-lg bg-surface px-3 py-2'>
                <PlayerFace player={player} className='size-8'/>
                <span className={cn('min-w-0 flex-1 truncate text-sm', (player.connected) ? 'text-fg' : 'text-subtle')}>
                  {player.username}
                  {(player.user_id === you) ? <span className='text-subtle'> · {t('games.flag.you')}</span> : null}
                  {(!player.connected) ? <span className='text-subtle'> · {t('games.flag.away')}</span> : null}
                </span>
                {(player.user_id === game.host_id) ? (
                  <span className='inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning'>
                    <Crown aria-hidden className='size-3.5'/>{t('games.flag.host')}
                  </span>
                ) : null}
                {(canKick(player.user_id)) ? <KickButton person={player} onKick={setKicking}/> : null}
              </li>
            ))}
          </ul>
          {(alone && !solo && inviter) ? <InviteCard onInvite={() => setInviting(true)}/> : null}
          </div>
          {(game.watchers.length) ? (
            <>
              <h3 className='mt-2 flex items-center gap-1.5 text-sm font-semibold text-white'>
                <Eye aria-hidden className='size-4 text-muted'/>{t('games.rooms.watching_title')}
                <span className='text-xs font-normal text-subtle'>{game.watchers.length}</span>
              </h3>
              <ul className='flex flex-col gap-1.5'>
                {game.watchers.map((watcher) => (
                  <li key={watcher.user_id} className='flex min-h-11 items-center gap-3 rounded-lg bg-surface/60 px-3 py-1.5'>
                    <PlayerFace player={{...watcher, connected: true}} className='size-7'/>
                    <span className='min-w-0 flex-1 truncate text-sm text-muted'>
                      {watcher.username}
                      {(watcher.user_id === you) ? <span className='text-subtle'> · {t('games.flag.you')}</span> : null}
                    </span>
                    {(canKick(watcher.user_id)) ? <KickButton person={watcher} onKick={setKicking}/> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section aria-labelledby='flag-settings' className='flex flex-col gap-4 rounded-xl border border-line-strong bg-surface p-4'>
          <div className='flex flex-col gap-1'>
            <h2 id='flag-settings' className='text-sm font-semibold text-white'>{t('games.flag.settings')}</h2>
            {(!isHost && host) ? <p className='text-xs text-subtle'>{t('games.flag.settings_host_only', {name: host.username})}</p> : null}
          </div>
          {(isLetterTrail(game)) ? (
            <LetterTrailFields settings={settings as LetterTrailSettings} disabled={!isHost} onChange={change}/>
          ) : (
            <FlagGuesserFields settings={settings as GameSettings} disabled={!isHost} onChange={change}/>
          )}
        </section>
      </div>

      <div className='sticky bottom-0 border-t border-line bg-bg/95 px-4 pt-3 pb-[calc(0.75rem+var(--saib,0px))] backdrop-blur'>
        <div className='mx-auto w-full max-w-3xl'>
          {(game.you_watch) ? (
            <div role='status' className='flex min-h-12 flex-wrap items-center justify-center gap-3 text-center text-sm text-muted'>
              <span className='inline-flex items-center gap-1.5'><Eye aria-hidden className='size-4'/>{t('games.rooms.watching')}</span>
              {(game.can_play) ? (
                <button type='button' className='btn btn-primary' onClick={() => connection.play()}>
                  <Play aria-hidden className='size-4'/>{t('games.rooms.join_in')}
                </button>
              ) : <span className='text-xs text-subtle'>{t('games.rooms.watch_only_you')}</span>}
            </div>
          ) : (isHost) ? (
            <div className='flex gap-2'>
              {/* sent and not answered yet: a second tap would be refused as "already running" */}
              <button type='button' className='btn btn-primary btn-lg flex-1 py-3.5' disabled={Boolean(pendingOp)} onClick={() => connection.start()}>
                {(pendingOp === 'start') ? <Spinner className='size-5 border-white/40 border-t-white'/> : <Play aria-hidden className='size-5'/>}{t('games.flag.start')}
              </button>
              {/* a solo room has nobody to watch */}
              {(solo) ? null : <WatchInsteadButton connection={connection}/>}
            </div>
          ) : (
            <div className='flex min-h-12 items-center justify-center gap-3'>
              <p role='status' className='text-center text-sm text-muted'>
                {t('games.flag.waiting_host', {name: host?.username ?? '…'})}
              </p>
              <WatchInsteadButton connection={connection}/>
            </div>
          )}
        </div>
      </div>
      {(inviting && inviter) ? <RoomInviteDialog inviter={inviter} onClose={() => setInviting(false)}/> : null}
      {(kicking) ? (
        <ConfirmDialog
          title={t('games.rooms.kick_title', {name: kicking.username})}
          description={t('games.rooms.kick_description')}
          confirmLabel={t('games.rooms.kick_confirm')}
          tone='danger'
          // not sent while the socket's reconnecting: the dialog stays and says so for as long as that lasts
          error={(status !== 'open') ? t('games.flag.reconnecting') : undefined}
          onConfirm={() => {
            if (connection.kick(kicking.user_id)) {
              setKicking(null);
            }
          }}
          onClose={() => setKicking(null)}
        />
      ) : null}
    </div>
  );
}


// the host alone in the lobby: bring friends in (the header's Invite: Discord's share sheet or a post in the channel),
// or just start, a game works with one player
function InviteCard({ onInvite }: {onInvite: () => void}) {
  const { t } = useI18n();
  return (
    <div className='flex flex-col gap-3 rounded-xl border border-dashed border-line-strong bg-surface/50 p-3'>
      <div className='flex items-start gap-3'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-text'>
          <UserPlus aria-hidden className='size-4'/>
        </span>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <h3 className='text-sm font-semibold text-white'>{t('games.flag.invite_title')}</h3>
          <p className='text-xs text-muted'>{t('games.flag.invite_alone')}</p>
        </div>
      </div>
      <button type='button' className='btn btn-secondary' onClick={onInvite}>
        <UserPlus aria-hidden className='size-4'/>{t('editor.invite.button')}
      </button>
    </div>
  );
}


function KickButton({ person, onKick }: {person: GameWatcher, onKick: (person: GameWatcher) => void}) {
  const { t } = useI18n();
  const label = t('games.rooms.kick', {name: person.username});
  return (
    <button type='button' aria-label={label} title={label} onClick={() => onKick(person)} className='flex size-9 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-surface-3 hover:text-danger-text'>
      <UserX aria-hidden className='size-4'/>
    </button>
  );
}


// a player only watches from now on (back in with Join in), between games
function WatchInsteadButton({ connection }: {connection: FlagGameConnection}) {
  const { t } = useI18n();
  return (
    <button type='button' className='btn btn-secondary shrink-0' onClick={() => connection.watch()}>
      <Eye aria-hidden className='size-4'/><span className='max-sm:sr-only'>{t('games.rooms.watch_instead')}</span>
    </button>
  );
}


function Setting({ label, hint, children }: {label: string, hint: string, children: ReactNode}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-xs font-semibold text-muted'>{label}</span>
      {children}
      <span className='text-xs text-subtle'>{hint}</span>
    </div>
  );
}


// a number with big − and + buttons (fingers), read-only for everyone but the host
function Stepper({ label, value, min, max, step, disabled, onChange }: {
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  disabled: boolean,
  onChange: (value: number) => void,
}) {
  const { t } = useI18n();
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-xs font-semibold text-muted'>{label}</span>
      <div className='flex items-center justify-between rounded-lg border border-line bg-deep p-1'>
        {(disabled) ? null : (
          <button
            type='button'
            aria-label={t('games.flag.less', {label})}
            disabled={value <= min}
            onClick={() => onChange(Math.max(min, value - step))}
            className='flex size-10 items-center justify-center rounded-md text-fg hover:bg-surface-3 disabled:opacity-40'
          >
            <Minus aria-hidden className='size-4'/>
          </button>
        )}
        <output aria-label={label} className={cn('flex-1 text-center text-lg font-bold text-white tabular-nums', disabled && 'py-1.5')}>{value}</output>
        {(disabled) ? null : (
          <button
            type='button'
            aria-label={t('games.flag.more', {label})}
            disabled={value >= max}
            onClick={() => onChange(Math.min(max, value + step))}
            className='flex size-10 items-center justify-center rounded-md text-fg hover:bg-surface-3 disabled:opacity-40'
          >
            <Plus aria-hidden className='size-4'/>
          </button>
        )}
      </div>
    </div>
  );
}


// Flag Guesser's settings: how they answer, which flags, how many and how long each
function FlagGuesserFields({ settings, disabled, onChange }: {settings: GameSettings, disabled: boolean, onChange: (changes: Partial<GameSettings>) => void}) {
  const { t } = useI18n();
  return (
    <>
      <Setting label={t('games.flag.settings_mode')} hint={t(`games.flag.settings_mode_${settings.mode}_hint`)}>
        <Segmented
          label={t('games.flag.settings_mode')}
          value={settings.mode}
          disabled={disabled}
          options={GAME_MODES.map((value) => ({value, label: t(`games.flag.settings_mode_${value}`)}))}
          onChange={(value) => onChange({mode: value as GameSettings['mode']})}
        />
      </Setting>
      <Setting label={t('games.flag.settings_difficulty')} hint={t(`games.flag.settings_difficulty_${settings.difficulty}_hint`)}>
        <Segmented
          label={t('games.flag.settings_difficulty')}
          value={settings.difficulty}
          disabled={disabled}
          options={GAME_DIFFICULTIES.map((value) => ({value, label: t(`games.flag.settings_difficulty_${value}`)}))}
          onChange={(value) => onChange({difficulty: value as GameSettings['difficulty']})}
        />
      </Setting>
      <div className='grid grid-cols-2 gap-3'>
        <Stepper
          label={t('games.flag.settings_rounds')}
          value={settings.rounds}
          min={ROUNDS_MIN}
          max={ROUNDS_MAX}
          step={1}
          disabled={disabled}
          onChange={(rounds) => onChange({rounds})}
        />
        <Stepper
          label={t('games.flag.settings_seconds')}
          value={settings.seconds}
          min={SECONDS_MIN}
          max={SECONDS_MAX}
          step={SECONDS_STEP}
          disabled={disabled}
          onChange={(seconds) => onChange({seconds})}
        />
      </div>
      <p className='text-xs leading-relaxed text-subtle'>{t('games.flag.points_rules')}</p>
    </>
  );
}


// Letter Trail's: the grid's size, a round's seconds and how many rounds
function LetterTrailFields({ settings, disabled, onChange }: {settings: LetterTrailSettings, disabled: boolean, onChange: (changes: Partial<LetterTrailSettings>) => void}) {
  const { t } = useI18n();
  return (
    <>
      <Setting label={t('games.letters.settings_size')} hint={t(`games.letters.settings_size_${settings.size}_hint`)}>
        <Segmented
          label={t('games.letters.settings_size')}
          value={String(settings.size)}
          disabled={disabled}
          options={LETTER_TRAIL_SIZES.map((value) => ({value: String(value), label: t('games.letters.settings_size_value', {size: value})}))}
          onChange={(value) => onChange({size: (Number(value) === 5) ? 5 : 4})}
        />
      </Setting>
      <Setting label={t('games.letters.settings_seconds')} hint={t('games.letters.settings_seconds_hint')}>
        <Segmented
          label={t('games.letters.settings_seconds')}
          value={String(settings.seconds)}
          disabled={disabled}
          options={LETTER_TRAIL_SECONDS.map((value) => ({value: String(value), label: t('games.letters.settings_seconds_value', {seconds: value})}))}
          onChange={(value) => onChange({seconds: Number(value)})}
        />
      </Setting>
      <Stepper
        label={t('games.letters.settings_rounds')}
        value={settings.rounds}
        min={LETTER_TRAIL_ROUNDS_MIN}
        max={LETTER_TRAIL_ROUNDS_MAX}
        step={1}
        disabled={disabled}
        onChange={(rounds) => onChange({rounds})}
      />
      <p className='text-xs leading-relaxed text-subtle'>{t('games.letters.points_rules')}</p>
    </>
  );
}
