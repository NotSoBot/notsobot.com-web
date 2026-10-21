// How much the bot and the api get used over the page's window: commands run (and how they ended), and requests to the
// api (errors, response times, the busiest endpoints and applications).

import type { AdminApiStats, AdminCommandStats } from '@/lib/api';
import { MeCommandResults } from '@/lib/api';
import { useAdminStatsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatNumber } from '@/lib/utils';

import { COMMAND_TYPE_LABELS, resultInfo, TONE_FILLS } from '../../commands/commandLabels';
import { compact, DailyBars, dayLabel, Metric, MetricGrid, percent, plural, RankedList, STAT_COLORS, StatsSection, SubHeading } from './statsUi';


// the attempts that broke on our side, not the user's
const ERROR_RESULTS: ReadonlyArray<string> = [MeCommandResults.RUN_ERROR, MeCommandResults.FAIL];


export function CommandsSection({ days }: {days: number}) {
  const query = useAdminStatsQuery<AdminCommandStats>('commands', days);
  return (
    <StatsSection id='commands' title='Commands' accent={STAT_COLORS.primary} query={query}>
      {(data) => {
        const tracked = data.results.filter((item) => item.result !== 'untracked').reduce((sum, item) => sum + item.count, 0);
        const errors = data.results.filter((item) => ERROR_RESULTS.includes(item.result)).reduce((sum, item) => sum + item.count, 0);
        return (
          <>
            <MetricGrid>
              <Metric label='Commands run' value={compact(data.count)} detail={`${formatNumber(Math.round(data.count / data.days))} a day`}/>
              <Metric label='Users' value={compact(data.users)} detail='ran at least one'/>
              <Metric label='Servers' value={compact(data.servers)} detail='used in, DMs aside'/>
              <Metric
                label='Error rate'
                value={percent(errors, tracked)}
                detail={plural(errors, 'error')}
                tone={(tracked && 0.02 < errors / tracked) ? 'warning' : undefined}
                title='Attempts that errored or failed on our side, out of the ones that say how they ended'
              />
            </MetricGrid>

            <div className='mt-4'>
              <DailyBars
                items={data.series}
                format={compact}
                series={[{label: 'Commands', color: STAT_COLORS.primary, value: (item) => item.count}]}
                describe={(item) => `${dayLabel(item.date)}: ${plural(item.count, 'command')}`}
              />
            </div>

            <div className='mt-6 grid gap-6 lg:grid-cols-2'>
              <section>
                <SubHeading>Most used</SubHeading>
                <RankedList
                  empty='No commands in this window.'
                  items={data.top.map((item) => ({
                    key: item.command_id,
                    label: <span className='font-mono text-[13px]'>{item.command_id}</span>,
                    value: item.count,
                    display: compact(item.count),
                    detail: plural(item.users, 'user'),
                  }))}
                />
              </section>
              <div className='space-y-6'>
                <Results results={data.results}/>
                <section>
                  <SubHeading>By type</SubHeading>
                  <RankedList
                    items={data.types.map((item) => ({
                      key: String(item.type),
                      label: COMMAND_TYPE_LABELS[item.type] ?? `Type ${item.type}`,
                      value: item.count,
                      display: compact(item.count),
                      detail: percent(item.count, data.count),
                    }))}
                  />
                </section>
              </div>
            </div>
          </>
        );
      }}
    </StatsSection>
  );
}


// how attempts ended, one bar split by result like the user's command history
function Results({ results }: {results: AdminCommandStats['results']}) {
  const total = results.reduce((sum, item) => sum + item.count, 0);
  return (
    <section>
      <SubHeading>How they ended</SubHeading>
      {(total) ? (
        <>
          <div aria-hidden className='flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-3'>
            {results.map((item) => (
              <span key={item.result} className={cn('h-full', TONE_FILLS[resultInfo(item.result).tone])} style={{width: `${(item.count / total) * 100}%`}}/>
            ))}
          </div>
          <ul className='mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-1'>
            {results.map((item) => {
              const info = resultInfo(item.result);
              return (
                <li key={item.result} className='flex min-w-0 items-center gap-2 text-sm'>
                  <span aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE_FILLS[info.tone])}/>
                  <span className='truncate text-muted'>{info.label}</span>
                  <span className='ml-auto font-semibold text-white tabular-nums'>{compact(item.count)}</span>
                  <span className='w-10 text-right text-xs text-subtle tabular-nums'>{percent(item.count, total)}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : <p className='text-sm text-subtle'>No commands in this window.</p>}
    </section>
  );
}


export function ApiSection({ days }: {days: number}) {
  const query = useAdminStatsQuery<AdminApiStats>('api', days);
  return (
    <StatsSection
      id='api'
      title='API'
      accent={STAT_COLORS.secondary}
      query={query}
      description='Requests the API logged, the bot’s own aren’t.'
    >
      {(data) => (
        <>
          <MetricGrid>
            <Metric label='Requests' value={compact(data.requests)} detail={`${plural(data.users, 'user')} signed in`}/>
            <Metric
              label='Server errors'
              value={percent(data.server_errors, data.requests)}
              detail={`${formatNumber(data.server_errors)} 5xx`}
              tone={(data.requests && 0.01 < data.server_errors / data.requests) ? 'danger' : undefined}
            />
            <Metric label='Client errors' value={percent(data.client_errors, data.requests)} detail={`${formatNumber(data.client_errors)} 4xx`}/>
            <Metric label='Response time' value={`${formatNumber(data.took_avg)} ms`} detail={`p95 ${formatNumber(data.took_p95)} ms`}/>
          </MetricGrid>

          <div className='mt-4'>
            <DailyBars
              items={data.series}
              format={compact}
              series={[
                {label: 'Requests', color: STAT_COLORS.primary, value: (item) => item.requests - item.server_errors},
                {label: 'Server errors', color: STAT_COLORS.bad, value: (item) => item.server_errors},
              ]}
              describe={(item) => `${dayLabel(item.date)}: ${plural(item.requests, 'request')}, ${plural(item.server_errors, 'server error')}`}
            />
          </div>

          <div className='mt-6 grid gap-6 lg:grid-cols-2'>
            <section>
              <SubHeading>Busiest endpoints</SubHeading>
              <RankedList
                empty='No requests in this window.'
                items={data.endpoints.map((item) => ({
                  key: `${item.method} ${item.endpoint}`,
                  label: (
                    <span className='font-mono text-[13px]'>
                      <span className='text-subtle'>{item.method}</span> {item.endpoint}
                    </span>
                  ),
                  value: item.requests,
                  display: compact(item.requests),
                  detail: `avg ${formatNumber(item.took_avg)} ms${(item.server_errors) ? ` • ${plural(item.server_errors, 'server error')}` : ''}`,
                }))}
              />
            </section>
            <section>
              <SubHeading>Busiest applications</SubHeading>
              <RankedList
                empty='No requests in this window.'
                items={data.applications.map((item) => ({
                  key: item.application?.id ?? 'none',
                  label: (item.application) ? (item.application.name ?? <span className='text-subtle'>Deleted application</span>) : <span className='text-muted'>No application (site and dashboard)</span>,
                  value: item.requests,
                  display: compact(item.requests),
                  detail: [item.application?.id, (item.server_errors) ? plural(item.server_errors, 'server error') : null].filter(Boolean).join(' • ') || undefined,
                }))}
              />
            </section>
          </div>
        </>
      )}
    </StatsSection>
  );
}
