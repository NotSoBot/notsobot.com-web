import { Crown, Eye, Minus, Play, Plus, UserX } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Segmented } from '@/components/ui/Segmented';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { FlagGameConnection } from './connection';
import { playerOf } from './hooks';
import { PlayerFace } from './parts';
import {
  GAME_DIFFICULTIES,
  GAME_MODES,
  ROUNDS_MAX,
  ROUNDS_MIN,
  SECONDS_MAX,
  SECONDS_MIN,
  SECONDS_STEP,
  type GameSettings,
  type GameState,
  type GameWatcher,
} from './protocol';


// Before a game (and after one, for "Change settings"): who's playing and watching, the settings (only the host changes
// them, the others see them as they are) and the host's Start. The room's creator (or a server moderator) removes people
export function Lobby({ connection, game, you, moderator = false }: {connection: FlagGameConnection, game: GameState, you: string | null, moderator?: boolean}) {
  const { t, plural } = useI18n();
  const [ kicking, setKicking ] = useState<GameWatcher | null>(null);
  const creatorId = game.room.creator.user_id;
  // the room's creator can't be removed (they close the room instead), nobody removes themselves
  const canKick = (userId: string) => Boolean(you) && (you === creatorId || moderator) && userId !== you && userId !== creatorId;
  const isHost = Boolean(you) && game.host_id === you;
  const host = playerOf(game, game.host_id);
  // the host's change shows at once, the api's state replaces it
  const [ draft, setDraft ] = useState<GameSettings | null>(null);
  useEffect(() => setDraft(null), [game.settings]);
  const settings = draft ?? game.settings;
  const change = (changes: Partial<GameSettings>) => {
    const next = {...settings, ...changes};
    setDraft(next);
    connection.settings(next);
  };
  const connected = game.players.filter((player) => player.connected).length;

  return (
    <div className='flex flex-1 flex-col'>
      <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-4 pb-6 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start'>
        <section aria-labelledby='flag-players' className='flex flex-col gap-3'>
          <div className='flex items-baseline gap-2'>
            <h2 id='flag-players' className='text-sm font-semibold text-white'>{t('games.flag.players')}</h2>
            <span className='text-xs text-subtle'>{plural('games.flag.players_here', connected)}</span>
          </div>
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
          <Setting label={t('games.flag.settings_mode')} hint={t(`games.flag.settings_mode_${settings.mode}_hint`)}>
            <Segmented
              label={t('games.flag.settings_mode')}
              value={settings.mode}
              disabled={!isHost}
              options={GAME_MODES.map((value) => ({value, label: t(`games.flag.settings_mode_${value}`)}))}
              onChange={(value) => change({mode: value as GameSettings['mode']})}
            />
          </Setting>
          <Setting label={t('games.flag.settings_difficulty')} hint={t(`games.flag.settings_difficulty_${settings.difficulty}_hint`)}>
            <Segmented
              label={t('games.flag.settings_difficulty')}
              value={settings.difficulty}
              disabled={!isHost}
              options={GAME_DIFFICULTIES.map((value) => ({value, label: t(`games.flag.settings_difficulty_${value}`)}))}
              onChange={(value) => change({difficulty: value as GameSettings['difficulty']})}
            />
          </Setting>
          <div className='grid grid-cols-2 gap-3'>
            <Stepper
              label={t('games.flag.settings_rounds')}
              value={settings.rounds}
              min={ROUNDS_MIN}
              max={ROUNDS_MAX}
              step={1}
              disabled={!isHost}
              onChange={(rounds) => change({rounds})}
            />
            <Stepper
              label={t('games.flag.settings_seconds')}
              value={settings.seconds}
              min={SECONDS_MIN}
              max={SECONDS_MAX}
              step={SECONDS_STEP}
              disabled={!isHost}
              onChange={(seconds) => change({seconds})}
            />
          </div>
          <p className='text-xs leading-relaxed text-subtle'>{t('games.flag.points_rules')}</p>
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
              <button type='button' className='btn btn-primary btn-lg flex-1 py-3.5' onClick={() => connection.start()}>
                <Play aria-hidden className='size-5'/>{t('games.flag.start')}
              </button>
              <WatchInsteadButton connection={connection}/>
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
      {(kicking) ? (
        <ConfirmDialog
          title={t('games.rooms.kick_title', {name: kicking.username})}
          description={t('games.rooms.kick_description')}
          confirmLabel={t('games.rooms.kick_confirm')}
          tone='danger'
          onConfirm={() => {
            connection.kick(kicking.user_id);
            setKicking(null);
          }}
          onClose={() => setKicking(null)}
        />
      ) : null}
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
