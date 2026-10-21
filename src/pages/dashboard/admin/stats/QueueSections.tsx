// What's waiting on staff (each tile opens that queue), and how much of everything users have made.

import { Routes } from '@/config';
import type { AdminContentStats, AdminModerationStats } from '@/lib/api';
import { useAdminStatsQuery } from '@/lib/api/dashboardQueries';
import { formatExactDateTime, formatNumber, toDate } from '@/lib/utils';

import { compact, Metric, plural, RankedList, STAT_COLORS, StatsSection, SubHeading } from './statsUi';


// how long the oldest item has been waiting, roughly
function waiting(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const hours = Math.max(0, (Date.now() - toDate(value).getTime()) / 3600000);
  if (hours < 1) {
    return 'oldest under an hour';
  }
  return (hours < 48) ? `oldest ${Math.floor(hours)}h` : `oldest ${Math.floor(hours / 24)} days`;
}

function joinDetails(...parts: Array<string | null | false>): string | undefined {
  return parts.filter(Boolean).join(' • ') || undefined;
}

function oldestTitle(label: string, value: string | null): string | undefined {
  return (value) ? `${label}, the oldest since ${formatExactDateTime(value)}` : undefined;
}


export function ModerationSection({ days }: {days: number}) {
  const query = useAdminStatsQuery<AdminModerationStats>('moderation', days);
  return (
    <StatsSection id='moderation' title='Moderation' accent={STAT_COLORS.bad} query={query} description='What’s waiting on staff.'>
      {({ content_flags: flags, reports, directory, days: windowDays }) => (
        <>
          {/* a row per queue from lg up: the three flag tiles, then reports and the directory two each */}
          <div className='grid grid-cols-2 gap-2 lg:grid-cols-6'>
            <Metric
              className='lg:col-span-2'
              label='Content flags to review'
              value={formatNumber(flags.pending)}
              detail={joinDetails(waiting(flags.oldest_pending_at)) ?? 'all caught up'}
              tone={(flags.pending) ? 'warning' : undefined}
              title={oldestTitle('Pending flags, blocked users’ left out', flags.oldest_pending_at)}
              to={Routes.DASHBOARD_ADMIN_FLAGS}
            />
            <Metric
              className='lg:col-span-2'
              label='Need a human'
              value={formatNumber(flags.needs_human_review)}
              detail='of the pending flags'
              tone={(flags.needs_human_review) ? 'warning' : undefined}
              title='Pending flags the scanner wasn’t sure about'
              to={`${Routes.DASHBOARD_ADMIN_FLAGS}?needs_human_review=true`}
            />
            <Metric
              className='col-span-2'
              label='Unsure flags'
              value={formatNumber(flags.unsure)}
              detail={waiting(flags.oldest_unsure_at) ?? 'none'}
              tone={(flags.unsure) ? 'warning' : undefined}
              title={oldestTitle('Flags a reviewer marked unsure and left for someone else, blocked users’ left out', flags.oldest_unsure_at) ??
                'Flags a reviewer marked unsure and left for someone else'}
              to={`${Routes.DASHBOARD_ADMIN_FLAGS}?status=4`}
            />
            <Metric
              className='lg:col-span-3'
              label='Open reports'
              value={formatNumber(reports.open)}
              detail={waiting(reports.oldest_open_at) ?? 'all caught up'}
              tone={(reports.open) ? 'warning' : undefined}
              title={oldestTitle('Open reports', reports.oldest_open_at)}
              to={Routes.DASHBOARD_ADMIN_REPORTS}
            />
            <Metric
              className='lg:col-span-3'
              label='Awaiting a reply'
              value={formatNumber(reports.awaiting_reply)}
              detail='the reporter wrote last'
              tone={(reports.awaiting_reply) ? 'warning' : undefined}
              title='Reports whose last reply is from the reporter, whatever their status'
              to={`${Routes.DASHBOARD_ADMIN_REPORTS}?status=all&awaiting_reply=true`}
            />
            <Metric
              className='lg:col-span-3'
              label='Directory listings'
              value={formatNumber(directory.pending)}
              detail={waiting(directory.oldest_pending_at) ?? 'none pending'}
              tone={(directory.pending) ? 'warning' : undefined}
              title={oldestTitle('Listings waiting for verification', directory.oldest_pending_at)}
              to={`${Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}?status=pending`}
            />
            <Metric
              className='lg:col-span-3'
              label='Change requests'
              value={formatNumber(directory.edit_requests)}
              detail={waiting(directory.oldest_edit_request_at) ?? 'none submitted'}
              tone={(directory.edit_requests) ? 'warning' : undefined}
              title={oldestTitle('Changes owners asked for on verified listings', directory.oldest_edit_request_at)}
              to={`${Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}?status=changes`}
            />
          </div>
          <p className='mt-3 text-sm text-muted tabular-nums'>
            In the last {plural(windowDays, 'day')}: {plural(flags.created, 'content flag')} came in and {formatNumber(flags.reviewed)} were reviewed,
            {' '}{plural(reports.created, 'report')} sent.
          </p>
        </>
      )}
    </StatsSection>
  );
}


export function ContentSection({ days }: {days: number}) {
  const query = useAdminStatsQuery<AdminContentStats>('content', days);
  return (
    <StatsSection id='content' title='Content' accent={STAT_COLORS.primary} query={query} description='Everything users have made.'>
      {({ tags, reminders, voices, ai_memories: memories, applications, days: windowDays }) => {
        const added = (count: number) => (count) ? `+${formatNumber(count)} in ${plural(windowDays, 'day')}` : null;
        return (
          <>
            <div className='grid grid-cols-2 gap-2 lg:grid-cols-3'>
              <Metric label='Tags' value={compact(tags.total)} detail={joinDetails(plural(tags.users, 'owner'), added(tags.new))} to={Routes.DASHBOARD_ADMIN_TAGS}/>
              <Metric
                label='Tag directory'
                value={formatNumber(tags.directory.verified)}
                detail={joinDetails('verified', `${formatNumber(tags.directory.pending)} pending`, `${formatNumber(tags.directory.unverified)} unverified`)}
                to={Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}
              />
              <Metric
                label='Reminders'
                value={compact(reminders.total)}
                detail={joinDetails(`${formatNumber(reminders.next_day)} in the next day`, plural(reminders.users, 'user'))}
              />
              <Metric label='Cloned voices' value={formatNumber(voices.total)} detail={joinDetails(plural(voices.users, 'user'), added(voices.new))} to={Routes.DASHBOARD_ADMIN_VOICES}/>
              <Metric label='AI memories' value={compact(memories.total)} detail={joinDetails(plural(memories.users, 'user'), added(memories.new))}/>
              <Metric
                label='API applications'
                value={formatNumber(applications.total)}
                detail={joinDetails(plural(applications.users, 'owner'), (applications.disabled) ? `${formatNumber(applications.disabled)} disabled` : null)}
                to={Routes.DASHBOARD_ADMIN_APPLICATIONS}
              />
            </div>

            <section className='mt-6'>
              <SubHeading>Where tags live</SubHeading>
              <RankedList items={[
                {key: 'personal', label: 'Personal', value: tags.personal, display: compact(tags.personal), detail: 'on their owner, usable anywhere'},
                {key: 'server', label: 'Servers', value: tags.server, display: compact(tags.server)},
                {key: 'dm', label: 'DMs', value: tags.dm, display: compact(tags.dm), detail: 'group DMs and the bot’s DMs'},
              ]}/>
              <p className='mt-2 text-xs text-subtle tabular-nums'>
                Of them {plural(tags.aliases, 'alias', 'aliases')}, {plural(tags.commands, 'custom command')} and {formatNumber(tags.nsfw)} NSFW.
              </p>
            </section>
          </>
        );
      }}
    </StatsSection>
  );
}
