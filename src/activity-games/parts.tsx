import { Check, Crown, ImageOff } from 'lucide-react';

import { Spinner } from '@/components/ui/Spinner';
import { MemberAvatar } from '@/editor/components/LobbyPeople';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { FlagGameConnection } from './connection';
import { rankedPlayers, useFlagImage } from './hooks';
import type { GamePlayer, GameState } from './protocol';


export function PlayerFace({ player, className }: {player: Pick<GamePlayer, 'username' | 'avatar_url' | 'connected'>, className?: string}) {
  return <MemberAvatar member={player} className={cn(className, !player.connected && 'opacity-40 grayscale')}/>;
}


// everyone's score in a row under the header, highest first: a tick on whoever solved this flag, a dot on whoever picked
// a choice (not which one)
export function ScoresStrip({ game, you, answeredIds = [] }: {game: GameState, you: string | null, answeredIds?: Array<string>}) {
  const { t } = useI18n();
  const solved = new Set(game.round?.solved ?? []);
  return (
    <ul aria-label={t('games.flag.scores')} className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden'>
      {rankedPlayers(game).map((player) => (
        <li
          key={player.user_id}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1',
            (solved.has(player.user_id)) ? 'border-success/60 bg-success/15' : 'border-line-strong bg-surface',
            (player.user_id === you) && 'ring-1 ring-brand',
          )}
        >
          <span className='relative'>
            <PlayerFace player={player} className='size-6'/>
            {(solved.has(player.user_id)) ? (
              <span className='absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-success text-white'>
                <Check aria-hidden className='size-2.5' strokeWidth={3.5}/>
              </span>
            ) : (answeredIds.includes(player.user_id)) ? (
              <span className='absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-brand'/>
            ) : null}
          </span>
          <span className={cn('max-w-24 truncate text-xs', (player.connected) ? 'text-fg' : 'text-subtle')}>{player.username}</span>
          <span className='text-xs font-bold text-white tabular-nums'>{player.score}</span>
          <span className='sr-only'>
            {(solved.has(player.user_id)) ? t('games.flag.solved_mark') : (answeredIds.includes(player.user_id)) ? t('games.flag.answered_mark') : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}


// the same scores as a list, beside the game on wide screens
export function ScoresList({ game, you, answeredIds = [], className }: {game: GameState, you: string | null, answeredIds?: Array<string>, className?: string}) {
  const { t, plural } = useI18n();
  const solved = new Set(game.round?.solved ?? []);
  return (
    <section aria-labelledby='flag-scores' className={cn('flex flex-col gap-2', className)}>
      <h2 id='flag-scores' className='section-label'>{t('games.flag.scores')}</h2>
      <ol className='flex flex-col gap-1'>
        {rankedPlayers(game).map((player, index) => (
          <li
            key={player.user_id}
            className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', (player.user_id === you) ? 'bg-brand/15' : 'bg-surface')}
          >
            <span className='w-5 text-right text-xs text-subtle tabular-nums'>{index + 1}</span>
            <PlayerFace player={player} className='size-7'/>
            <span className='min-w-0 flex-1'>
              <span className={cn('flex items-center gap-1 truncate text-sm', (player.connected) ? 'text-fg' : 'text-subtle')}>
                <span className='truncate'>{player.username}</span>
                {(player.user_id === game.host_id) ? <Crown aria-label={t('games.flag.host')} className='size-3.5 shrink-0 text-warning'/> : null}
              </span>
              {(player.streak >= 2) ? <span className='block text-[0.7rem] text-warning'>{t('games.flag.streak', {count: player.streak})}</span> : null}
            </span>
            {(solved.has(player.user_id)) ? (
              <Check aria-label={t('games.flag.solved_mark')} className='size-4 text-success-text'/>
            ) : (answeredIds.includes(player.user_id)) ? (
              <span aria-label={t('games.flag.answered_mark')} className='size-2 rounded-full bg-brand'/>
            ) : null}
            <span className='text-sm font-bold text-white tabular-nums' aria-label={plural('games.flag.points', player.score)}>{player.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}


// the flag at its own proportions, as big as fits its box (never stretched)
export function FlagImage({ connection, flagUrl, className, alt }: {connection: FlagGameConnection, flagUrl: string | null, className?: string, alt?: string}) {
  const { t } = useI18n();
  const { src, failed, retry } = useFlagImage(connection, flagUrl);
  return (
    <div className={cn('flex items-center justify-center', className)}>
      {(src) ? (
        <img
          src={src}
          alt={alt ?? t('games.flag.flag_alt')}
          draggable={false}
          className='h-auto max-h-full w-auto max-w-full rounded-sm object-contain shadow-[0_6px_24px_rgba(0,0,0,0.45)] select-none'
        />
      ) : (failed) ? (
        <div className='flex flex-col items-center gap-2 text-sm text-subtle'>
          <ImageOff aria-hidden className='size-8'/>
          {t('games.flag.flag_failed')}
          <button type='button' className='btn btn-secondary btn-sm' onClick={retry}>{t('common.retry')}</button>
        </div>
      ) : (
        <Spinner/>
      )}
    </div>
  );
}


// a thin bar that empties as `remaining` of `total` runs out
export function TimeBar({ fraction, tone = 'brand', label }: {fraction: number, tone?: 'brand' | 'warning' | 'danger' | 'muted', label?: string}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div
      role='progressbar'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className='h-2 w-full overflow-hidden rounded-full bg-deep'
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-100 ease-linear',
          (tone === 'danger') ? 'bg-danger' : (tone === 'warning') ? 'bg-warning' : (tone === 'muted') ? 'bg-line-strong' : 'bg-brand',
        )}
        style={{width: `${clamped * 100}%`}}
      />
    </div>
  );
}
