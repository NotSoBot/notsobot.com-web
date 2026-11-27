import { Medal, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';

import { MemberAvatar } from '@/editor/components/LobbyPeople';
import { intlLocale, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { GAMES, type GameInfo } from './catalog';
import { BOARD_SHOWN, DAILY_POINTS_CAP, type ActivityGamePoints, type GameStatsByGame, type GameStatsEntry, type PointsPeriod } from './points';


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
  // they hid from the global boards in their settings, only shown where the board is the global one
  const hidden = global && !!points?.you.hidden;
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
          value={(points) ? ((hidden) ? t('games.points.rank_hidden') : (rank) ? t('games.points.rank_value', {rank: format(rank)}) : '—') : missing}
        />
      </div>
      <p className='text-xs text-subtle'>
        {t('games.points.description', {cap: format(DAILY_POINTS_CAP)})}
        {(hidden) ? ` ${t('games.points.hidden_note')}` : null}
      </p>
      {(points) ? <GameRecords stats={points.you.stats}/> : null}
    </section>
  );
}


// Each game's record and stats under your points (game-stats-plan.md "What counts", "Game stats"): how many games, the
// record with its win rate, the win streak, then the game's own stats. A game without a recorded game isn't there. Only
// there once the points have loaded (how many games have a block isn't known before)
function GameRecords({ stats }: {stats: GameStatsByGame}) {
  const shown = GAMES.filter((info) => 0 < stats[info.id].games);
  if (!shown.length) {
    return null;
  }
  return (
    <ul className='flex flex-col gap-2 border-t border-line pt-3'>
      {shown.map((info) => <GameRecord key={info.id} info={info} stats={stats}/>)}
    </ul>
  );
}


function GameRecord({ info, stats }: {info: GameInfo, stats: GameStatsByGame}) {
  const { t, plural, language } = useI18n();
  const locale = intlLocale(language);
  const format = (value: number) => value.toLocaleString(locale);
  const entry: GameStatsEntry<object> = stats[info.id];
  // the games with a winner: solo ones count toward `games` only
  const decided = entry.wins + entry.losses + entry.ties + entry.left;
  const record = (decided) ? [
    t('games.stats.wins', {count: format(entry.wins)}),
    t('games.stats.losses', {count: format(entry.losses)}),
    (entry.ties) ? t('games.stats.ties', {count: format(entry.ties)}) : null,
    (entry.left) ? plural('games.stats.left', entry.left) : null,
    t('games.stats.win_rate', {rate: (entry.wins / decided).toLocaleString(locale, {style: 'percent', maximumFractionDigits: 0})}),
  ] : [];
  const streaks = (entry.best_win_streak) ? [
    t('games.stats.win_streak', {count: format(entry.win_streak)}),
    t('games.stats.best_win_streak', {count: format(entry.best_win_streak)}),
  ] : [];
  const details: Array<string | null> = [];
  if (info.id === 'flag_guesser') {
    const own = stats.flag_guesser.stats;
    details.push(
      (own.named) ? plural('games.stats.flag_named', own.named) : null,
      (own.firsts) ? plural('games.stats.flag_firsts', own.firsts) : null,
      (own.best_streak) ? t('games.stats.flag_best_streak', {count: format(own.best_streak)}) : null,
      (typeof own.fastest_ms === 'number') ? t('games.stats.flag_fastest', {
        seconds: (own.fastest_ms / 1000).toLocaleString(locale, {minimumFractionDigits: 1, maximumFractionDigits: 1}),
      }) : null,
      (own.best_score) ? t('games.stats.best_score', {score: format(own.best_score)}) : null,
    );
  } else {
    const own = stats.letter_trail.stats;
    details.push(
      (own.words) ? plural('games.stats.letters_words', own.words) : null,
      (own.only_you) ? plural('games.stats.letters_only_you', own.only_you) : null,
      (own.longest_word) ? t('games.stats.letters_longest', {word: own.longest_word.toUpperCase()}) : null,
      (own.best_score) ? t('games.stats.best_score', {score: format(own.best_score)}) : null,
    );
  }
  const line = (parts: Array<string | null>) => parts.filter(Boolean).join(' • ');
  const Icon = info.icon;
  return (
    <li className='flex min-w-0 items-start gap-3 rounded-xl bg-surface-2 px-3 py-2.5'>
      <span aria-hidden className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', info.accent)}>
        <Icon className='size-4'/>
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <div className='flex items-baseline justify-between gap-2'>
          <h3 className='truncate text-sm font-bold text-white'>{t(info.title)}</h3>
          <span className='shrink-0 text-xs text-subtle tabular-nums'>{plural('games.stats.games', entry.games)}</span>
        </div>
        {(record.length) ? <p className='text-sm text-fg tabular-nums'>{line(record)}</p> : null}
        {(streaks.length) ? <p className='text-xs text-muted tabular-nums'>{line(streaks)}</p> : null}
        {(details.some(Boolean)) ? <p className='text-xs text-subtle tabular-nums'>{line(details)}</p> : null}
      </div>
    </li>
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
