import { Medal, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';

import { MemberAvatar } from '@/editor/components/LobbyPeople';
import { intlLocale, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { BOARD_SHOWN, DAILY_POINTS_CAP, type ActivityGamePoints, type PointsPeriod } from './points';


// The Games tab's game points (./points): your total, this week's and your rank above the game cards, this server's top
// few under them. Every number has its place before it loads (a blank one), so nothing moves when they come

const PERIODS: ReadonlyArray<PointsPeriod> = ['week', 'all'];
// the top three's numbers, like the Finished podium's
const MEDALS = ['text-[#f5c542]', 'text-[#c9d1d9]', 'text-[#d08b4f]'];


function Stat({ label, value }: {label: string, value: string | null}) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5'>
      <span className='min-h-8 truncate font-display text-2xl font-bold text-white tabular-nums'>{value ?? ' '}</span>
      <span className='truncate text-xs text-subtle'>{label}</span>
    </div>
  );
}


export function YourPoints({ points, failed }: {points: ActivityGamePoints | null, failed: boolean}) {
  const { t, language } = useI18n();
  const titleId = useId();
  const format = (value: number) => value.toLocaleString(intlLocale(language));
  // a dm's Activity has no server, its board and rank are everyone's
  const global = points?.board.scope === 'global';
  const rank = (points) ? ((global) ? points.you.rank.global : points.you.rank.guild) : null;
  const missing = (failed) ? '—' : null;
  return (
    <section aria-labelledby={titleId} className='flex flex-col gap-3 rounded-2xl border border-line-strong bg-surface p-4'>
      <h2 id={titleId} className='flex items-center gap-2 font-display text-lg font-bold text-white'>
        <Sparkles aria-hidden className='size-5 text-brand-text'/>{t('games.points.title')}
      </h2>
      <div className='grid grid-cols-3 gap-3'>
        <Stat label={t('games.points.total')} value={(points) ? format(points.you.total) : missing}/>
        <Stat label={t('games.points.week')} value={(points) ? format(points.you.week) : missing}/>
        <Stat
          label={t((global) ? 'games.points.rank_global' : 'games.points.rank_guild')}
          value={(points) ? ((rank) ? t('games.points.rank_value', {rank: format(rank)}) : '—') : missing}
        />
      </div>
      <p className='text-xs text-subtle'>{t('games.points.description', {cap: format(DAILY_POINTS_CAP)})}</p>
    </section>
  );
}


export function PointsBoard({ points, failed }: {points: ActivityGamePoints | null, failed: boolean}) {
  const { t, language } = useI18n();
  const titleId = useId();
  const [ period, setPeriod ] = useState<PointsPeriod>('week');
  const board = (points) ? ((period === 'week') ? points.week_board : points.board) : null;
  const items = board?.items.slice(0, BOARD_SHOWN) ?? null;
  const you = points?.you.user_id ?? null;
  return (
    <section aria-labelledby={titleId} className='flex flex-col gap-3 rounded-2xl border border-line-strong bg-surface p-4'>
      {/* the period toggle drops under the title when a language's words don't fit beside it */}
      <div className='flex flex-wrap items-start justify-between gap-x-3 gap-y-2'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <h2 id={titleId} className='flex items-center gap-2 font-display text-lg font-bold text-white'>
            <Medal aria-hidden className='size-5 text-[#f5c542]'/>{t('games.points.board_title')}
          </h2>
          {/* blank until it's known whether this is a server's board or everyone's */}
          <span className='min-h-4 truncate text-xs text-subtle'>
            {(points) ? t((points.board.scope === 'global') ? 'games.points.board_global' : 'games.points.board_guild') : ' '}
          </span>
        </div>
        <div role='radiogroup' aria-label={t('games.points.period')} className='grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-deep p-1'>
          {PERIODS.map((value) => (
            <button
              key={value}
              type='button'
              role='radio'
              aria-checked={period === value}
              onClick={() => setPeriod(value)}
              className={cn(
                'flex min-h-9 items-center justify-center rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
                (period === value) ? 'bg-brand text-white' : 'text-muted hover:text-fg',
              )}
            >
              {t(`games.points.period_${value}`)}
            </button>
          ))}
        </div>
      </div>
      {/* room for every row from the start, so loading or switching the period doesn't move what's under it */}
      <div className='min-h-[14.75rem]'>
        {(items && items.length) ? (
          <ol className='flex flex-col gap-1'>
            {items.map((item) => (
              <li key={item.user_id} className={cn('flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm', (item.user_id === you) ? 'bg-brand/15' : 'bg-surface-2')}>
                <span className={cn('w-6 shrink-0 text-right font-display font-bold tabular-nums', MEDALS[item.rank - 1] ?? 'text-subtle')}>{item.rank}</span>
                <MemberAvatar member={item} className='size-7 shrink-0'/>
                <span className={cn('min-w-0 flex-1 truncate', (item.user_id === you) ? 'font-bold text-white' : 'text-fg')}>{item.username}</span>
                <span className='font-bold text-white tabular-nums'>{item.points.toLocaleString(intlLocale(language))}</span>
              </li>
            ))}
          </ol>
        ) : (items) ? (
          <p className='flex min-h-[14.75rem] items-center justify-center px-4 text-center text-sm text-muted'>
            {t((period === 'week') ? 'games.points.board_empty_week' : 'games.points.board_empty_all')}
          </p>
        ) : (failed) ? (
          <p className='flex min-h-[14.75rem] items-center justify-center px-4 text-center text-sm text-muted'>{t('games.points.error')}</p>
        ) : (
          <ol aria-hidden className='flex flex-col gap-1'>
            {Array.from({length: BOARD_SHOWN}, (_, index) => <li key={index} className='h-11 rounded-lg bg-surface-2'/>)}
          </ol>
        )}
      </div>
    </section>
  );
}
