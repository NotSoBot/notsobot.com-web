import { BarChart3 } from 'lucide-react';
import { useState } from 'react';

import { Segmented } from '@/components/ui/Segmented';
import { useI18n } from '@/i18n';
import type { GuildMusicStatsCounts, GuildMusicStatsPeriod, GuildMusicStatsSort, UserGuild } from '@/lib/api';
import { errorMessage, useGuildMusicStatsQuery } from '@/lib/api/dashboardQueries';
import { displayLocale, formatDate } from '@/lib/utils';

import { compact, Metric, MetricGrid, RankedList, SubHeading } from '../admin/stats/statsUi';
import { InlineError, Panel, Skeleton } from '../ui';
import { Owner } from './GuildTagsSection';
import { musicItemTitle, TrackCover } from './MusicSection';


// labels are `mstats.period.<value>` and `mstats.sort.<value>`
const PERIOD_OPTIONS: Array<GuildMusicStatsPeriod> = ['week', 'month', 'year', 'all'];
const SORT_OPTIONS: Array<GuildMusicStatsSort> = ['plays', 'time'];

// a long time in its two largest units (`41d 6h`, `3h 12m`), seconds only under a minute
function playedTime(milliseconds: number): string {
  const seconds = Math.max(Math.floor(milliseconds / 1000), 0);
  const units: Array<[string, number]> = [
    ['day', Math.floor(seconds / 86400)],
    ['hour', Math.floor(seconds / 3600) % 24],
    ['minute', Math.floor(seconds / 60) % 60],
  ];
  const format = (unit: string, value: number) => new Intl.NumberFormat(displayLocale(), {style: 'unit', unit, unitDisplay: 'narrow'}).format(value);
  const first = units.findIndex(([, value]) => value);
  if (first === -1) {
    return format('second', seconds);
  }
  return units.slice(first, first + 2).filter(([, value]) => value).map(([unit, value]) => format(unit, value)).join(' ');
}


// What the server's music played over the last week, month or year (or since stats started): totals, then the most played
// songs, the members whose songs played the most and the top artists, ranked by plays or time played, with how often a
// loop played them again. Like `music stats`, any member can see it
export function MusicStatsSection({ guild }: {guild: UserGuild}) {
  const { t, plural } = useI18n();
  const [ period, setPeriod ] = useState<GuildMusicStatsPeriod>('all');
  const [ sort, setSort ] = useState<GuildMusicStatsSort>('plays');
  const query = useGuildMusicStatsQuery(guild.id, period, sort);
  const data = query.data;

  // the bar and number on the right follow the sort, the other count goes underneath with the repeats (when there are
  // some). The data's own sort, the previous answer stays up while another one loads
  const ranked = (item: GuildMusicStatsCounts) => ({
    value: (data?.sort === 'time') ? item.played_ms : item.plays,
    display: (data?.sort === 'time') ? playedTime(item.played_ms) : compact(item.plays),
    detail: [
      (data?.sort === 'time') ? plural('mstats.plays', item.plays) : t('mstats.played', {duration: playedTime(item.played_ms)}),
      (item.repeats) ? plural('mstats.repeats', item.repeats) : null,
    ].filter(Boolean).join(' • '),
  });

  return (
    <Panel title={t('mstats.title')} accent='#1db954' description={t('mstats.description')}>
      <div className='space-y-4'>
        <div className='flex flex-wrap gap-2'>
          <Segmented
            label={t('mstats.period')}
            value={period}
            options={PERIOD_OPTIONS.map((value) => ({value, label: t(`mstats.period.${value}`)}))}
            onChange={(value) => setPeriod(value as GuildMusicStatsPeriod)}
          />
          <Segmented
            label={t('mstats.sort')}
            value={sort}
            options={SORT_OPTIONS.map((value) => ({value, label: t(`mstats.sort.${value}`)}))}
            onChange={(value) => setSort(value as GuildMusicStatsSort)}
          />
        </div>
        {(query.isError) ? (
          <InlineError>{errorMessage(query.error, t('mstats.load_error'))}</InlineError>
        ) : (!data) ? (
          <div aria-busy='true' className='space-y-3'>
            <Skeleton className='h-16 w-full'/>
            <Skeleton className='h-40 w-full bg-surface-2'/>
          </div>
        ) : (!data.totals.played_ms) ? (
          <p className='flex items-center gap-2 text-sm text-muted'>
            <BarChart3 aria-hidden className='size-4 text-subtle'/>
            {t((data.period === 'all') ? 'mstats.empty' : 'mstats.empty_period')}
          </p>
        ) : (
          <>
            <MetricGrid>
              <Metric
                label={t('mstats.plays_label')}
                value={compact(data.totals.plays)}
                detail={(data.period === 'all' && data.totals.first_played) ? t('mstats.since', {
                  date: formatDate(new Date(data.totals.first_played).toISOString(), {month: 'short', day: 'numeric', year: 'numeric'}),
                }) : undefined}
              />
              <Metric
                label={t('mstats.time')}
                value={playedTime(data.totals.played_ms)}
                detail={(data.totals.repeats) ? plural('mstats.time_repeats', data.totals.repeats) : undefined}
              />
              <Metric label={t('mstats.songs')} value={compact(data.totals.tracks)}/>
              <Metric label={t('mstats.listeners')} value={compact(data.totals.users)} detail={t('mstats.listeners_detail')}/>
            </MetricGrid>
            <div className='grid gap-4 lg:grid-cols-3'>
              <section className='min-w-0'>
                <SubHeading>{t('mstats.top_songs')}</SubHeading>
                <RankedList
                  empty={t('mstats.none')}
                  items={data.tracks.map((item, index) => ({
                    key: `${index}.${item.url}`,
                    label: (
                      <span className='flex min-w-0 items-center gap-2'>
                        <TrackCover item={item} className='size-5'/>
                        <span className='truncate'>{musicItemTitle(item)}</span>
                      </span>
                    ),
                    ...ranked(item),
                  }))}
                />
              </section>
              <section className='min-w-0'>
                <SubHeading>{t('mstats.top_listeners')}</SubHeading>
                <RankedList
                  empty={t('mstats.none')}
                  items={data.users.map((item) => ({
                    key: item.user_id,
                    label: (item.user) ? <Owner user={item.user}/> : <span className='font-mono'>{item.user_id}</span>,
                    ...ranked(item),
                  }))}
                />
              </section>
              <section className='min-w-0'>
                <SubHeading>{t('mstats.top_artists')}</SubHeading>
                <RankedList
                  empty={t('mstats.no_artists')}
                  items={data.artists.map((item) => ({key: item.name.toLowerCase(), label: item.name, ...ranked(item)}))}
                />
              </section>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
