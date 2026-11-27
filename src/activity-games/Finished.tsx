import { ArrowLeft, RotateCcw, SlidersHorizontal, Sparkles, Trophy } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { FlagGameConnection } from './connection';
import { playerOf, rankedPlayers } from './hooks';
import { PlayerFace } from './parts';
import { gamePointsFor } from './points';
import { isLetterTrail, type AnyGameState, type GamePlayer } from './protocol';


interface Placed {
  player: GamePlayer,
  score: number,
  // equal scores share a place
  place: number,
}

// the podium's order left to right (second, first, third) and each step's height
const PODIUM = [
  {index: 1, height: 'h-16', medal: 'text-[#c9d1d9]'},
  {index: 0, height: 'h-24', medal: 'text-[#f5c542]'},
  {index: 2, height: 'h-12', medal: 'text-[#d08b4f]'},
];


function placings(game: AnyGameState): Array<Placed> {
  const rows = (game.standings)
    ? game.standings.map((entry) => ({player: playerOf(game, entry.user_id), score: entry.score}))
      .filter((row): row is {player: GamePlayer, score: number} => row.player !== null)
    : rankedPlayers(game).map((player) => ({player, score: player.score}));
  let place = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.score !== rows[index - 1].score) {
      place = index + 1;
    }
    return {...row, place};
  });
}


// what their score added to their game points total (./points): all of it, part of it (the daily cap) or none. Blank
// until the api says (the award can come after the standings), the line's there from the start so nothing moves.
// `expected`: what the score is worth in game points before the daily cap (a game's own rate, ./points)
function AwardedLine({ expected, awarded }: {expected: number, awarded: number | undefined}) {
  const { t, plural } = useI18n();
  const text = (awarded === undefined) ? null
    : (awarded <= 0) ? t('games.flag.awarded_none')
    : (awarded < expected) ? plural('games.flag.awarded_capped', awarded)
    : plural('games.flag.awarded', awarded);
  return (
    <p role='status' className={cn('flex min-h-5 items-center justify-center gap-1.5 text-sm font-semibold', (awarded !== undefined && 0 < awarded) ? 'text-success-text' : 'text-subtle')}>
      {(text) ? <><Sparkles aria-hidden className='size-4 shrink-0'/>{text}</> : '\u00a0'}
    </p>
  );
}


// The game's over: a podium for the top three, everyone else below, and the host's Play again / Change settings.
// `awards`: the game points each score added (connection.ts)
export function Finished({ connection, game, you, awards, onLeave }: {
  connection: FlagGameConnection,
  game: AnyGameState,
  you: string | null,
  awards: Record<string, number> | null,
  onLeave: () => void,
}) {
  const { t, plural } = useI18n();
  const isHost = Boolean(you) && game.host_id === you;
  const host = playerOf(game, game.host_id);
  const placed = placings(game);
  const mine = placed.find((row) => row.player.user_id === you) ?? null;
  const winners = placed.filter((row) => row.place === 1 && row.score > 0);
  const rest = placed.slice(3);

  return (
    <div className='flex flex-1 flex-col'>
      <div className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-6'>
        <header className='flex flex-col items-center gap-1 text-center'>
          <Trophy aria-hidden className='size-8 text-[#f5c542]'/>
          <h2 className='font-display text-3xl font-bold text-white'>
            {(winners.length > 1) ? t('games.flag.finished_tie')
              : (winners.length === 1) ? t('games.flag.finished_winner', {name: winners[0].player.username})
              : t('games.flag.finished_title')}
          </h2>
          {(mine) ? <p className='text-sm text-muted'>{t('games.flag.finished_you', {place: mine.place, count: placed.length})}</p> : null}
          {/* a score of 0 adds nothing, so there's no line for it */}
          {(mine && 0 < mine.score) ? <AwardedLine expected={gamePointsFor((isLetterTrail(game)) ? 'letter_trail' : 'flag_guesser', mine.score)} awarded={(you) ? awards?.[you] : undefined}/> : null}
        </header>

        <ol aria-label={t('games.flag.finished_title')} className='grid grid-cols-3 items-end gap-2'>
          {PODIUM.map(({ index, height, medal }) => {
            const row = placed[index];
            if (!row) {
              return <li key={index} aria-hidden/>;
            }
            return (
              <li key={row.player.user_id} className='flex min-w-0 flex-col items-center gap-1.5'>
                <PlayerFace player={row.player} className={cn((index === 0) ? 'size-16' : 'size-12', 'border-2 border-line-strong')}/>
                <span className={cn('max-w-full truncate text-sm', (row.player.user_id === you) ? 'font-bold text-white' : 'text-fg')}>{row.player.username}</span>
                <span className='text-xs text-subtle'>{plural('games.flag.points', row.score)}</span>
                <div className={cn('flex w-full items-start justify-center rounded-t-lg bg-surface-3 pt-2', height)}>
                  <span className={cn('font-display text-2xl font-bold', medal)}>{row.place}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {(rest.length) ? (
          <ol className='flex flex-col gap-1'>
            {rest.map((row) => (
              <li key={row.player.user_id} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm', (row.player.user_id === you) ? 'bg-brand/15' : 'bg-surface')}>
                <span className='w-5 text-right text-xs text-subtle tabular-nums'>{row.place}</span>
                <PlayerFace player={row.player} className='size-7'/>
                <span className='min-w-0 flex-1 truncate text-fg'>{row.player.username}</span>
                <span className='font-bold text-white tabular-nums'>{row.score}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className='sticky bottom-0 border-t border-line bg-bg/95 px-4 pt-3 pb-[calc(0.75rem+var(--saib,0px))] backdrop-blur'>
        <div className='mx-auto flex w-full max-w-2xl flex-col gap-2'>
          {(isHost) ? (
            <div className='grid grid-cols-2 gap-2'>
              <button type='button' className='btn btn-secondary min-h-12' onClick={() => connection.end()}>
                <SlidersHorizontal aria-hidden className='size-4'/>{t('games.flag.change_settings')}
              </button>
              <button type='button' className='btn btn-primary min-h-12' onClick={() => connection.start()}>
                <RotateCcw aria-hidden className='size-4'/>{t('games.flag.play_again')}
              </button>
            </div>
          ) : (
            <p role='status' className='flex min-h-10 items-center justify-center text-center text-sm text-muted'>
              {t('games.flag.waiting_host_again', {name: host?.username ?? '…'})}
            </p>
          )}
          <button type='button' className='btn btn-ghost min-h-11' onClick={onLeave}>
            <ArrowLeft aria-hidden className='size-4'/>{t('games.rooms.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
