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

            <UseDetails data={data}/>
          </>
        );
      }}
    </StatsSection>
  );
}


// why an attempt didn't run (the bot's `getRecordedCommandReason`), anything else is shown as it came
const REASON_LABELS: Record<string, string> = {
  cancel_run: 'Stopped before running',
  channel_turned_off: 'Turned off in the channel',
  command_permissions: 'Discord command permissions',
  dm_disabled: 'Not usable in DMs',
  invalid_media: 'Invalid user or URL',
  job_cancelled: 'Job cancelled',
  job_errored: 'Job polling failed',
  job_failed: 'Job failed',
  job_taken_over: 'Reply taken over',
  job_timed_out: 'Job timed out',
  job_unknown: 'Job state unknown',
  no_channel_history: 'Can’t read the channel',
  no_media: 'No media found',
  not_enough_media: 'Not enough media',
  nsfw: 'Not an NSFW channel',
  premium: 'Needs premium',
  rule: 'Server rule',
  server_blocked: 'Server is blocked',
  settings_fetch_failed: 'Settings didn’t load',
  too_many_media: 'Too much media',
  trigger_changed: 'Message changed',
  usage: 'Usage shown',
  user_blocked: 'User is blocked',
  user_fetch_failed: 'User didn’t load',
  warnings_pending: 'Staff warning shown',
};

// the lists are narrow, so the place goes on the detail line
const INSTALL_LABELS: Record<string, string> = {'': 'No install', guild: 'Server install', user: 'User install'};
const CONTEXT_LABELS: Record<string, string> = {
  '': 'place unknown',
  bot_dm: 'bot’s DMs',
  guild: 'in a server',
  private_channel: 'DM or group DM',
};

const LANGUAGE_NAMES = new Intl.DisplayNames(['en'], {type: 'language'});

function languageName(locale: string): string {
  try {
    return LANGUAGE_NAMES.of(locale) ?? locale;
  } catch {
    // not a language tag
    return locale;
  }
}

function took(ms: number): string {
  return (ms < 1000) ? `${formatNumber(ms)} ms` : `${formatNumber(Math.round(ms / 100) / 10)} s`;
}

// what the bot sends with each use since 2026-11-22: left out for an api from before then
function UseDetails({ data }: {data: AdminCommandStats}) {
  const { duration, locales, places, reasons, tip, triggers } = data;
  if (!duration || !locales || !places || !reasons || !tip || !triggers) {
    return null;
  }
  const triggered = (trigger: string) => triggers.find((item) => item.trigger === trigger)?.count ?? 0;
  return (
    <div className='mt-6'>
      <SubHeading>Each use, in detail</SubHeading>
      <p className='mb-3 text-sm text-muted'>Recorded since November 22, 2026, only uses from then on count here.</p>
      <MetricGrid>
        <Metric
          label='Median time'
          value={took(duration.p50)}
          detail={`p95 ${took(duration.p95)}`}
          title='From the command being checked to its end, a media job’s end included'
        />
        <Metric
          label='Moved off the prefix'
          value={percent(tip.switched, tip.users)}
          detail={`${formatNumber(tip.switched)} of ${plural(tip.users, 'user')} who got the tip`}
          color={STAT_COLORS.primary}
          title='Users whose reply had the “prefix commands are ending” tip, and how many used a slash command or a mention after first seeing it'
        />
        <Metric label='Edit re-runs' value={compact(data.edited ?? 0)} detail='ran by editing the message'/>
        <Metric
          label='Auto-embeds'
          value={compact(triggered('auto_embed'))}
          detail={`${compact(triggered('ai_reply'))} replies to NotSoAI`}
          title='Uses nobody typed a command for: a posted link, or a reply to a NotSoAI message'
        />
      </MetricGrid>

      <div className='mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        <section>
          <SubHeading>Why they didn’t run</SubHeading>
          <RankedList
            empty='Nothing was stopped in this window.'
            items={reasons.map((item) => ({
              key: item.reason,
              label: REASON_LABELS[item.reason] ?? <span className='font-mono text-[13px]'>{item.reason}</span>,
              value: item.count,
              display: compact(item.count),
              detail: plural(item.users, 'user'),
            }))}
          />
        </section>
        <section>
          <SubHeading>Where they came from</SubHeading>
          <RankedList
            empty='No uses with an install yet.'
            items={places.map((item) => ({
              key: `${item.install}:${item.context}`,
              label: INSTALL_LABELS[item.install] ?? item.install,
              value: item.count,
              display: compact(item.count),
              detail: `${CONTEXT_LABELS[item.context] ?? item.context} • ${plural(item.users, 'user')}`,
            }))}
          />
        </section>
        <section>
          <SubHeading>Reply languages</SubHeading>
          <RankedList
            empty='No uses with a language yet.'
            items={locales.map((item) => ({
              key: item.locale,
              label: languageName(item.locale),
              value: item.count,
              display: compact(item.count),
              detail: `${item.locale} • ${plural(item.users, 'user')}`,
            }))}
          />
        </section>
      </div>
    </div>
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

          {/* which limits and paywalls people run into. an api from before the codes were recorded has no `errors`, the
              section is left out then */}
          {(data.errors) ? <section className='mt-6'>
            <SubHeading>Most common errors</SubHeading>
            <p className='mb-3 text-sm text-muted'>Error responses by their code, recorded since November 22, 2026.</p>
            <RankedList
              empty='No error responses with a code in this window.'
              items={data.errors.map((item) => ({
                key: `${item.code}:${item.tier ?? ''}`,
                label: (
                  <span className='font-mono text-[13px]'>
                    {item.name ?? 'UNKNOWN'} <span className='text-subtle'>{item.code}</span>
                  </span>
                ),
                value: item.count,
                display: compact(item.count),
                detail: [(item.tier) ? `asked for ${item.tier}` : null, `${plural(item.users, 'user')} signed in`].filter(Boolean).join(' • '),
              }))}
            />
          </section> : null}
        </>
      )}
    </StatsSection>
  );
}
