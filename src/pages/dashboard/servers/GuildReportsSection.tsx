import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { GuildReportTypes, ReportStatuses, type GuildReport, type ReportStatus, type UserGuild } from '@/lib/api';
import { errorMessage, useGuildReportMutation, useGuildReportsQuery } from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { reportJumpUrl, reportStatusInfo } from '../reports/reportLabels';
import { EmptyState, Panel, Skeleton } from '../ui';
import { EntryMention, useReadOnlyMessage } from './guildMeta';


// `GuildLoggerTypes.REPORTS`, members can only report anything in a server with one
const REPORTS_LOGGER_TYPE = 8;

const STATUS_OPTIONS = [
  {value: String(ReportStatuses.OPEN), label: 'Open'},
  {value: String(ReportStatuses.RESOLVED), label: 'Resolved'},
  {value: String(ReportStatuses.DISMISSED), label: 'Dismissed'},
  {value: 'all', label: 'All'},
];

const STATUS_DONE: Record<number, string> = {
  [ReportStatuses.OPEN]: 'Reopened the report',
  [ReportStatuses.RESOLVED]: 'Resolved the report',
  [ReportStatuses.DISMISSED]: 'Dismissed the report',
};


// Members' reports from the bot's `report` and its "Report to Mods" menus, newest first. Seeing and handling them needs
// Timeout Members, the same as the buttons on the reports logger's messages (the bot redraws those when it's handled here).
export function GuildReportsSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.moderation;
  const readOnlyMessage = useReadOnlyMessage();
  const hasLogger = guild.loggers.some((logger) => logger.type === REPORTS_LOGGER_TYPE);

  return (
    <Panel
      title='Reports'
      accent='#ed4245'
      description='Members’ reports to the moderators, from the report command and the Report to Mods menus. Handling one here also updates its message in the reports logger.'
      readOnly={(editable) ? undefined : readOnlyMessage('moderation')}
    >
      {(editable) ? <ReportsList guildId={guild.id} hasLogger={hasLogger}/> : <p className='text-sm text-muted'>Members’ reports are only shown to moderators.</p>}
    </Panel>
  );
}


function ReportsList({ guildId, hasLogger }: {guildId: string, hasLogger: boolean}) {
  const toast = useToast();
  const [ filter, setFilter ] = useState(String(ReportStatuses.OPEN));
  const [ busyId, setBusyId ] = useState<string | null>(null);

  const status = (filter === 'all') ? null : Number(filter) as ReportStatus;
  const query = useGuildReportsQuery(guildId, status);
  const mutation = useGuildReportMutation(guildId);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const reports = pages.flatMap((page) => page.reports);
  const statusLabel = (status === null) ? '' : `${reportStatusInfo(status).label.toLowerCase()} `;

  const setStatus = async (report: GuildReport, next: ReportStatus) => {
    setBusyId(report.id);
    try {
      await mutation.mutateAsync({reportId: report.id, status: next});
      toast(STATUS_DONE[next]);
    } catch (error) {
      toast(errorMessage(error, 'Couldn’t update the report.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Segmented label='Show reports' value={filter} options={STATUS_OPTIONS} onChange={setFilter}/>
        {(first) ? (
          <p className='text-sm text-muted'>
            {first.count.toLocaleString()} {statusLabel}report{(first.count === 1) ? '' : 's'}
          </p>
        ) : null}
      </div>

      {(query.isPending) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-20 w-full bg-surface-2'/>
          <Skeleton className='h-20 w-full bg-surface-2'/>
        </div>
      ) : (query.error) ? (
        <p role='alert' className='text-sm text-danger'>{errorMessage(query.error, 'Couldn’t load the reports.')}</p>
      ) : (reports.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              showStatus={status === null}
              busy={busyId === report.id}
              disabled={mutation.isPending}
              onStatus={(next) => void setStatus(report, next)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState title={`No ${statusLabel}reports`}>
          {(hasLogger) ? 'Members report someone with the report command or a message’s Report to Mods menu.' : 'Members can’t report anything until the server has a reports logger. Add one with the loggers command in Discord.'}
        </EmptyState>
      )}

      {(query.hasNextPage) ? (
        <button type='button' className='btn btn-secondary btn-sm' disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {(query.isFetchingNextPage) ? <Spinner className='size-3.5'/> : null}
          Load older
        </button>
      ) : null}
    </div>
  );
}


function ReportRow({ report, showStatus, busy, disabled, onStatus }: {
  report: GuildReport,
  showStatus: boolean,
  busy: boolean,
  disabled: boolean,
  onStatus: (status: ReportStatus) => void,
}) {
  const isMessage = report.type === GuildReportTypes.MESSAGE;
  const status = reportStatusInfo(report.status);
  const jumpUrl = (isMessage) ? reportJumpUrl(report) : null;
  const open = report.status === ReportStatuses.OPEN;

  return (
    <li className='flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3'>
      <div className='min-w-0 flex-1 space-y-1'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <Chip tone={(isMessage) ? 'warning' : 'danger'}>{(isMessage) ? 'Message' : 'Member'}</Chip>
          <span className='sr-only'>{(isMessage) ? 'Message by' : 'Reported member'}</span>
          <EntryMention type='user' id={report.target_id}/>
          {(showStatus) ? <Chip tone={status.tone}>{status.label}</Chip> : null}
        </div>
        <p className='text-sm break-words whitespace-pre-wrap text-fg'>{report.reason}</p>
        {(isMessage) ? (
          <div className='space-y-1 rounded-md border-l-2 border-line-strong bg-surface-2 px-2.5 py-1.5'>
            {(report.message_content) ? (
              <p className='text-sm break-words whitespace-pre-wrap text-muted'>{report.message_content}</p>
            ) : (
              <p className='text-sm text-subtle italic'>No text (attachments or embeds only)</p>
            )}
            {(jumpUrl) ? (
              <a href={jumpUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-xs text-code hover:underline'>
                Jump to message
                <ArrowUpRight aria-hidden className='size-3'/>
              </a>
            ) : null}
          </div>
        ) : null}
        <p className='text-xs text-subtle'>
          by <span className='font-mono'>{report.user_id}</span> · <time dateTime={report.created} title={formatDateTime(report.created)}>{formatDate(report.created)}</time> · <span className='font-mono'>{report.id}</span>
        </p>
        {(!open && report.handled_by) ? (
          <p className='text-xs text-subtle'>
            {status.label} by <span className='font-mono'>{report.handled_by}</span>
            {(report.handled_at) ? <> · <time dateTime={report.handled_at} title={formatDateTime(report.handled_at)}>{formatDate(report.handled_at)}</time></> : null}
          </p>
        ) : null}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {(busy) ? <Spinner className='size-3.5'/> : null}
        {(open) ? (
          <>
            <button type='button' className='btn btn-primary btn-sm' disabled={disabled} onClick={() => onStatus(ReportStatuses.RESOLVED)}>Resolve</button>
            <button type='button' className='btn btn-secondary btn-sm' disabled={disabled} onClick={() => onStatus(ReportStatuses.DISMISSED)}>Dismiss</button>
          </>
        ) : (
          <button type='button' className='btn btn-secondary btn-sm' disabled={disabled} onClick={() => onStatus(ReportStatuses.OPEN)}>Reopen</button>
        )}
      </div>
    </li>
  );
}
