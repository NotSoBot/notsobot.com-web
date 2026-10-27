import { useState } from 'react';

import { Segmented } from '@/components/ui/Segmented';
import { useI18n, type TranslationKey } from '@/i18n';
import { CommandTypes, type UserGuild } from '@/lib/api';
import { errorMessage, useGuildCommandStatsQuery } from '@/lib/api/dashboardQueries';
import { formatNumber } from '@/lib/utils';

import { compact, DailyBars, dayLabel, Metric, MetricGrid, RankedList, STAT_COLORS, SubHeading } from '../admin/stats/statsUi';
import { COMMAND_TYPE_LABELS } from '../commands/commandLabels';
import { InlineError, Panel, Skeleton } from '../ui';
import { useReadOnlyMessage } from './guildMeta';


// labels are `scommands.range.<value>`
const RANGE_OPTIONS = ['7', '30', '90'] as const;

// the prefix to write prefixed commands with: the oldest custom one (the api's order is arbitrary), else the default `.`
function displayPrefix(guild: UserGuild): string {
  const oldest = [...guild.prefixes].sort((a, b) => Date.parse(a.added) - Date.parse(b.added))[0];
  return oldest?.prefix ?? '.';
}


// Commands run in the server over the last 7, 30 or 90 days: how many, by how many members, a bar per day and the most
// used. Counts only, never who ran what. Needs Manage Server, like the owner stats page's commands section for one server
export function GuildCommandsSection({ guild }: {guild: UserGuild}) {
  const { t, plural } = useI18n();
  const editable = guild.editable.settings;
  const readOnlyMessage = useReadOnlyMessage();
  const [ days, setDays ] = useState('30');
  const query = useGuildCommandStatsQuery(guild.id, Number(days), editable);
  const data = query.data;
  // how a command is written here: with the server's prefix, `/` for slash commands, a right-click menu's name as is
  const prefix = displayPrefix(guild);
  const prefixFor = (type: number) => (type === CommandTypes.PREFIXED) ? prefix : (type === CommandTypes.APPLICATION_SLASH) ? '/' : '';

  return (
    <Panel
      title={t('scommands.title')}
      accent={STAT_COLORS.primary}
      description={t('scommands.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('settings')}
    >
      {(!editable) ? (
        <p className='text-sm text-muted'>{t('scommands.managers_only')}</p>
      ) : (
        <div className='space-y-4'>
          <Segmented label={t('scommands.range')} value={days} options={RANGE_OPTIONS.map((value) => ({value, label: t(`scommands.range.${value}` as TranslationKey)}))} onChange={setDays}/>
          {(query.isError) ? (
            <InlineError>{errorMessage(query.error, t('scommands.load_error'))}</InlineError>
          ) : (!data) ? (
            <div aria-busy='true' className='space-y-3'>
              <Skeleton className='h-16 w-full'/>
              <Skeleton className='h-40 w-full bg-surface-2'/>
            </div>
          ) : (
            <>
              <MetricGrid>
                <Metric label={t('scommands.run')} value={compact(data.count)} detail={t('scommands.per_day', {count: formatNumber(Math.round(data.count / data.days))})}/>
                <Metric label={t('scommands.members')} value={compact(data.users)} detail={t('scommands.ran_one')}/>
              </MetricGrid>
              <DailyBars
                items={data.series}
                format={compact}
                series={[{label: t('scommands.series'), color: STAT_COLORS.primary, value: (item) => item.count}]}
                describe={(item) => plural('scommands.day', item.count, {day: dayLabel(item.date)})}
              />
              <section>
                <SubHeading>{t('scommands.top')}</SubHeading>
                <RankedList
                  empty={t('scommands.empty')}
                  items={data.top.map((item) => ({
                    key: `${item.command_id}.${item.command_type}`,
                    label: <span className='font-mono text-[13px]'>{(item.name) ? `${prefixFor(item.command_type)}${item.name}` : item.command_id}</span>,
                    value: item.count,
                    display: compact(item.count),
                    detail: `${COMMAND_TYPE_LABELS[item.command_type] ?? t('scommands.type', {type: item.command_type})} • ${plural('scommands.members', item.users)}`,
                  }))}
                />
              </section>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
