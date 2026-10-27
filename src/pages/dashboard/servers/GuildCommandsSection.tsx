import { useState } from 'react';

import { Segmented } from '@/components/ui/Segmented';
import { CommandTypes, type UserGuild } from '@/lib/api';
import { errorMessage, useGuildCommandStatsQuery } from '@/lib/api/dashboardQueries';
import { formatNumber } from '@/lib/utils';

import { compact, DailyBars, dayLabel, Metric, MetricGrid, plural, RankedList, STAT_COLORS, SubHeading } from '../admin/stats/statsUi';
import { COMMAND_TYPE_LABELS } from '../commands/commandLabels';
import { InlineError, Panel, Skeleton } from '../ui';
import { useReadOnlyMessage } from './guildMeta';


const RANGE_OPTIONS = [
  {value: '7', label: '7 days'},
  {value: '30', label: '30 days'},
  {value: '90', label: '90 days'},
];

// the prefix to write prefixed commands with: the oldest custom one (the api's order is arbitrary), else the default `.`
function displayPrefix(guild: UserGuild): string {
  const oldest = [...guild.prefixes].sort((a, b) => Date.parse(a.added) - Date.parse(b.added))[0];
  return oldest?.prefix ?? '.';
}


// Commands run in the server over the last 7, 30 or 90 days: how many, by how many members, a bar per day and the most
// used. Counts only, never who ran what. Needs Manage Server, like the owner stats page's commands section for one server
export function GuildCommandsSection({ guild }: {guild: UserGuild}) {
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
      title='Commands'
      accent={STAT_COLORS.primary}
      description='How much NotSoBot gets used here. Counts only, nobody’s commands are listed.'
      readOnly={(editable) ? undefined : readOnlyMessage('settings')}
    >
      {(!editable) ? (
        <p className='text-sm text-muted'>Command stats are only shown to people who can manage the server.</p>
      ) : (
        <div className='space-y-4'>
          <Segmented label='Time range' value={days} options={RANGE_OPTIONS} onChange={setDays}/>
          {(query.isError) ? (
            <InlineError>{errorMessage(query.error, 'Couldn’t load the command stats.')}</InlineError>
          ) : (!data) ? (
            <div aria-busy='true' className='space-y-3'>
              <Skeleton className='h-16 w-full'/>
              <Skeleton className='h-40 w-full bg-surface-2'/>
            </div>
          ) : (
            <>
              <MetricGrid>
                <Metric label='Commands run' value={compact(data.count)} detail={`${formatNumber(Math.round(data.count / data.days))} a day`}/>
                <Metric label='Members' value={compact(data.users)} detail='ran at least one'/>
              </MetricGrid>
              <DailyBars
                items={data.series}
                format={compact}
                series={[{label: 'Commands', color: STAT_COLORS.primary, value: (item) => item.count}]}
                describe={(item) => `${dayLabel(item.date)}: ${plural(item.count, 'command')}`}
              />
              <section>
                <SubHeading>Most used</SubHeading>
                <RankedList
                  empty='No commands in this time range.'
                  items={data.top.map((item) => ({
                    key: `${item.command_id}.${item.command_type}`,
                    label: <span className='font-mono text-[13px]'>{(item.name) ? `${prefixFor(item.command_type)}${item.name}` : item.command_id}</span>,
                    value: item.count,
                    display: compact(item.count),
                    detail: `${COMMAND_TYPE_LABELS[item.command_type] ?? `Type ${item.command_type}`} • ${plural(item.users, 'member')}`,
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
