// Members' reports from the bot's `report` and its "Report to Mods" menus, laid out like the admin reports page: a list to
// triage from, each opening its details. Seeing and handling them needs Timeout Members, the same as the buttons on the
// reports logger's messages (the bot redraws those when it's handled here). Each has a conversation with the reporter:
// the bot DMs them the moderators' replies (as "the moderators") and posts both sides in a thread on the report's logger
// message, the reporter answers with the Respond button on its DM. What members wrote is only ever rendered as plain text.

import { Check, ExternalLink, Inbox, type LucideIcon, MessagesSquare, RotateCcw, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DetailModalHeader, DetailModalStrip } from '@/components/ui/DetailModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  GuildReportTypes,
  ReportStatuses,
  type GuildContentUser,
  type GuildReport,
  type GuildReportImageKind,
  type ReportMessage,
  type ReportStatus,
  type UserGuild,
} from '@/lib/api';
import {
  GUILD_REPORTS_PAGE_SIZE,
  errorMessage,
  useGuildReportImageQuery,
  useGuildReportMessagesQuery,
  useGuildReportMutation,
  useGuildReportQuery,
  useGuildReportsQuery,
  usePostGuildReportMessageMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

import { AdminModalFooter, AdminTagModal, LinkedItemModal, useOpenListItem } from '../admin/AdminTagModal';
import {
  Chip,
  CopyButton,
  ExactDate,
  FiltersButton,
  Pagination,
  selectAllScope,
  useSearchParamState,
  useStepBackFromEmptyPage,
  UserCell,
} from '../admin/adminUi';
import { REPORT_TONE_FILLS, ROW_EDGE_BAR, reportJumpUrl, reportStatusInfo } from '../reports/reportLabels';
import { ReportThread } from '../reports/ReportThread';
import { EmptyState, Panel, Skeleton } from '../ui';
import { useReadOnlyMessage } from './guildMeta';


// `GuildLoggerTypes.REPORTS`, members can only report anything in a server with one
const REPORTS_LOGGER_TYPE = 8;
// the api's `MAX_GUILD_REPORT_MESSAGE_LENGTH`, a whole reply fits in the bot's DM to the reporter
const MAX_REPLY_LENGTH = 1000;
const MODERATORS_NAME = 'The moderators';
// the api draws the report images at 2x (`DEVICE_SCALE` in `apis/discord_quote.py`)
const IMAGE_SCALE = 2;
const TITLE_ID = 'guild-report-modal-title';

const STATUS_OPTIONS = [
  {value: String(ReportStatuses.OPEN), label: 'Open'},
  {value: String(ReportStatuses.RESOLVED), label: 'Resolved'},
  {value: String(ReportStatuses.DISMISSED), label: 'Dismissed'},
];

const STATUS_ACTIONS: Record<number, string> = {
  [ReportStatuses.OPEN]: 'Reopen',
  [ReportStatuses.RESOLVED]: 'Resolve',
  [ReportStatuses.DISMISSED]: 'Dismiss',
};

const STATUS_DONE: Record<number, string> = {
  [ReportStatuses.OPEN]: 'reopened',
  [ReportStatuses.RESOLVED]: 'resolved',
  [ReportStatuses.DISMISSED]: 'dismissed',
};

// the slot each status button sits in; once the report is in that status, the slot turns into Reopen (like the admin
// page's, so the buttons never move around)
const ACTION_SLOTS: Array<ReportStatus> = [ReportStatuses.RESOLVED, ReportStatuses.DISMISSED];

const STATUS_BUTTON_CLASSES: Record<number, string> = {
  [ReportStatuses.OPEN]: 'border border-warning/40 bg-warning/15 text-warning hover:bg-warning/25',
  [ReportStatuses.RESOLVED]: 'btn-primary',
  [ReportStatuses.DISMISSED]: 'btn-secondary',
};

const STATUS_ICONS: Record<number, LucideIcon> = {
  [ReportStatuses.OPEN]: RotateCcw,
  [ReportStatuses.RESOLVED]: Check,
  [ReportStatuses.DISMISSED]: X,
};


function typeInfo(report: GuildReport): {label: string, tone: 'danger' | 'warning'} {
  return (report.type === GuildReportTypes.MESSAGE) ? {label: 'Message', tone: 'warning'} : {label: 'Member', tone: 'danger'};
}

// the reporter sent the last reply, replying doesn't reopen a handled report so these can be handled ones too
function awaitingReply(report: GuildReport): boolean {
  return report.last_reply?.author === 'reporter';
}

// the people on this page's reports by id (`GuildReportsPage.users`), someone NotSoBot hasn't seen is just their id
type ReportUsers = Record<string, GuildContentUser>;

// their avatar and name with their id under it, or their id alone
function ReportUser({ users, id }: {users: ReportUsers, id: string}) {
  return <UserCell user={users[id] ?? null} fallbackId={id} size='sm'/>;
}


export function GuildReportsSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.moderation;
  const readOnlyMessage = useReadOnlyMessage();
  const hasLogger = guild.loggers.some((logger) => logger.type === REPORTS_LOGGER_TYPE);

  return (
    <Panel
      title='Reports'
      accent='#ed4245'
      description='Members’ reports to the moderators, from the report command and the Report to Mods menus. Handling one here also updates its message in the reports logger, and resolving or dismissing it DMs the reporter. Replies are DMed to them from “the moderators”, without your name. The reported member and message are kept as images of how they looked (their pictures left out when they may be NSFW) for 30 days, then deleted, so save anything you need longer.'
      readOnly={(editable) ? undefined : readOnlyMessage('moderation')}
    >
      {(editable) ? <ReportsList guildId={guild.id} hasLogger={hasLogger}/> : <p className='text-sm text-muted'>Members’ reports are only shown to moderators.</p>}
    </Panel>
  );
}


// `queue` (the default) is the open ones and the handled ones the reporter replied to since, a reply doesn't reopen one so
// it'd be easy to miss otherwise. `status=all` shows every report
function parseStatus(value: string | null): ReportStatus | null | 'queue' {
  if (value === 'all') {
    return null;
  }
  return (STATUS_OPTIONS.some((option) => option.value === value)) ? Number(value) as ReportStatus : 'queue';
}

function parseType(value: string | null): number | null {
  return (value === String(GuildReportTypes.USER) || value === String(GuildReportTypes.MESSAGE)) ? Number(value) : null;
}

function parseBool(value: string | null): boolean | null {
  return (value === 'true') ? true : (value === 'false') ? false : null;
}


// like the admin reports page: a search box with the filters behind a button, and page numbers. The filters live in the
// url, so a filtered list can be linked to
function ReportsList({ guildId, hasLogger }: {guildId: string, hasLogger: boolean}) {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const status = parseStatus(searchParams.get('status'));
  const type = parseType(searchParams.get('type'));
  const awaitingReply = parseBool(searchParams.get('awaiting_reply'));
  const search = searchParams.get('q') || '';
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, refetch, isRefetching } = useGuildReportsQuery(guildId, {
    awaitingReply,
    page,
    query: debouncedSearch,
    queue: status === 'queue',
    status: (status === 'queue') ? null : status,
    type,
  });
  const reports = data?.reports ?? [];
  const users = data?.users ?? {};
  const steppingBack = useStepBackFromEmptyPage({
    page,
    setPage,
    data: (data) ? {items: data.reports, count: data.count} : undefined,
    isPlaceholderData,
    pageSize: GUILD_REPORTS_PAGE_SIZE,
  });
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: GUILD_REPORTS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [status !== 'queue', type !== null, awaitingReply !== null].filter(Boolean).length;
  const filtered = !!(activeFilters || debouncedSearch);
  // opened in place (no route of its own), Previous / Next step through this page
  const { openItem, previousId, nextId, open, close } = useOpenListItem(reports, (report) => report.id);
  // `?report=<id>`, the View Report button on the bot's logger messages: opened whatever page or filter it's on
  const linkedId = searchParams.get('report');
  const linked = useGuildReportQuery(guildId, linkedId);
  const closeLinked = () => update({report: null}, false);

  return (
    <div>
      <div className='mb-3 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={search}
          onValueChange={(value) => update({q: value})}
          placeholder='Search the reason or message, #id, user: or target:...'
          aria-label='Search reports'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='guild-report-filters'/>
      </div>
      <p className='mb-3 text-xs text-subtle'>
        A bare id matches the report, the reporter or the reported member; <code className='text-code'>#&lt;id&gt;</code>, <code className='text-code'>user:</code> (the reporter) or <code className='text-code'>target:</code> (the reported member) match only that, with any other text still searched.
      </p>

      <div id='guild-report-filters' hidden={!filtersOpen} className='mb-3 grid gap-3 rounded-md border border-line p-3 sm:grid-cols-3'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select
            className='input'
            value={(status === null) ? 'all' : String(status)}
            onChange={(event) => update({status: (event.target.value === 'queue') ? null : event.target.value})}
          >
            <option value='queue'>Open or waiting on mods</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            <option value='all'>Any</option>
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Type</span>
          <select className='input' value={(type === null) ? '' : String(type)} onChange={(event) => update({type: event.target.value})}>
            <option value=''>Any</option>
            <option value={GuildReportTypes.USER}>Member</option>
            <option value={GuildReportTypes.MESSAGE}>Message</option>
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Conversation</span>
          <select className='input' value={(awaitingReply === null) ? '' : String(awaitingReply)} onChange={(event) => update({awaiting_reply: event.target.value})}>
            <option value=''>Any</option>
            <option value='true'>Waiting on mods</option>
            <option value='false'>Not waiting</option>
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !reports.length) ? (
        <div role='alert' className='flex items-center gap-3 text-sm text-danger'>
          {errorMessage(error, 'Couldn’t load the reports.')}
          <button type='button' className='btn btn-secondary btn-sm' disabled={isRefetching} onClick={() => void refetch()}>Try again</button>
        </div>
      ) : (!reports.length) ? (
        <EmptyState icon={<Inbox className='size-10'/>} title={(filtered) ? 'No reports' : 'Nothing to handle'}>
          {(filtered) ? 'Nothing matches these filters.' : (hasLogger) ? 'Members report someone with the report command or a message’s Report to Mods menu.' : 'Members can’t report anything until the server has a reports logger. Add one with the loggers command in Discord.'}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-3'/>
          <ul className={cn('divide-y divide-line rounded-md border border-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {reports.map((report) => <ReportRow key={report.id} report={report} users={users} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <ReportDetails key={openItem.id} guildId={guildId} report={openItem} users={users} navigation={{previousId, nextId, onNavigate: open}}/>
        </AdminTagModal>
      ) : (linkedId && linked.data) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={null} nextId={null} onNavigate={() => {}} onClose={closeLinked} footer={false} stickyClose>
          <ReportDetails
            key={linked.data.report.id}
            guildId={guildId}
            report={linked.data.report}
            users={{...users, ...linked.data.users}}
            navigation={{previousId: null, nextId: null, onNavigate: () => {}}}
          />
        </AdminTagModal>
      ) : (linkedId) ? (
        <LinkedItemModal noun='report' notFoundMessage='There’s no report with this id in this server.' query={linked} onClose={closeLinked}/>
      ) : null}
    </div>
  );
}


// one line per report, just enough to triage from; the rest is in `ReportDetails` a click away. Plain content only inside
// (no buttons, links or focusable dates), since the whole row is a button. Like the admin reports': the type and id in the
// top left with the reporter under them, the status in the top right with the date under it, and the reason across the
// bottom. Who's reported is in the details.
function ReportRow({ report, users, onOpen }: {report: GuildReport, users: ReportUsers, onOpen: (id: string) => void}) {
  const status = reportStatusInfo(report.status);
  const type = typeInfo(report);
  const awaiting = awaitingReply(report);
  return (
    <li className='group/row relative'>
      {/* the status at a glance, down the left edge like the admin reports' */}
      <span aria-hidden title={status.label} className={cn(ROW_EDGE_BAR, REPORT_TONE_FILLS[status.tone])}/>
      <button
        type='button'
        className='grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2'
        onClick={() => onOpen(report.id)}
      >
        <span className='col-start-1 row-start-1 flex min-w-0 items-center gap-3'>
          <Chip tone={type.tone} className='w-18 shrink-0 justify-center'>{type.label}</Chip>
          <span className='min-w-0 truncate font-mono text-sm leading-5 text-white'>#{report.id}</span>
        </span>
        {/* who sent it, under the type */}
        <span className='col-start-1 row-start-2 min-w-0'><ReportUser users={users} id={report.user_id}/></span>
        <span className='col-span-2 row-start-3 flex min-w-0 items-center gap-2 text-sm text-muted'>
          {(report.replies) ? (
            <span
              className={cn('inline-flex shrink-0 items-center gap-1 text-xs', (awaiting) ? 'font-medium text-warning' : 'text-subtle')}
              title={(awaiting) ? 'The reporter replied last, waiting on the moderators' : `${report.replies} ${(report.replies === 1) ? 'reply' : 'replies'}`}
            >
              <MessagesSquare aria-hidden className='size-3.5'/>
              {report.replies}
            </span>
          ) : null}
          <span className='min-w-0 flex-1 truncate rounded-md border border-line bg-deep px-2.5 py-1 font-mono text-xs text-fg'>{report.reason}</span>
        </span>
        <Chip tone={status.tone} className='col-start-2 row-start-1 w-20 justify-center justify-self-end'>{status.label}</Chip>
        <span className='col-start-2 row-start-2 justify-self-end text-xs whitespace-nowrap text-subtle'>{formatDateTime(report.created)}</span>
      </button>
    </li>
  );
}


// `navigation` is the modal's Previous / Next, the status actions go between them
function ReportDetails({ guildId, report: listed, users, navigation }: {
  guildId: string,
  report: GuildReport,
  users: ReportUsers,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
}) {
  const toast = useToast();
  const mutation = useGuildReportMutation(guildId);
  // the api's copy after a status change, a report handled here can leave the filtered list (the modal keeps the copy it
  // last saw from there)
  const [ report, setReport ] = useState(listed);
  useEffect(() => setReport(listed), [listed]);
  const status = reportStatusInfo(report.status);
  const type = typeInfo(report);
  const isMessage = report.type === GuildReportTypes.MESSAGE;
  const jumpUrl = (isMessage) ? reportJumpUrl(report) : null;
  const pendingStatus = (mutation.isPending) ? mutation.variables?.status : undefined;

  const setStatus = (value: ReportStatus) => {
    mutation.mutate({reportId: report.id, status: value}, {
      onSuccess: (updated) => {
        setReport(updated);
        toast(`Report ${report.id}: ${STATUS_DONE[value]}`);
      },
      onError: (error) => toast(errorMessage(error, 'Couldn’t update the report.'), 'error'),
    });
  };

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip tone={type.tone} className='w-18 shrink-0 justify-center'>{type.label}</Chip>}
        title={<><span className='sr-only'>Report </span>#{report.id}</>}
        mono
        meta={<ExactDate value={report.created} format={formatDateTime}/>}
        states={(awaitingReply(report)) ? <Chip tone='warning' title='The reporter replied last'>waiting on mods</Chip> : null}
        status={<Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>}
      />

      {/* who sent it and who it's about, then who handled it */}
      <DetailModalStrip className='grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1'>
        <span className='text-xs text-subtle'>Reporter</span>
        <div className='flex min-h-8 min-w-0 items-center gap-2'>
          <ReportUser users={users} id={report.user_id}/>
          <CopyButton value={report.user_id}/>
          {(report.reporter_muted) ? <Chip title='The reporter turned off DMs for this report, they only see replies on their dashboard'>DMs off</Chip> : null}
        </div>
        <span className='text-xs text-subtle'>{(isMessage) ? 'Message by' : 'Reported member'}</span>
        <div className='flex min-h-8 min-w-0 items-center gap-2'>
          <ReportUser users={users} id={report.target_id}/>
          <CopyButton value={report.target_id}/>
        </div>
        {(report.status !== ReportStatuses.OPEN && report.handled_by) ? (
          <>
            <span className='text-xs text-subtle'>{status.label} by</span>
            <div className='flex min-h-8 min-w-0 flex-wrap items-center gap-x-2'>
              <ReportUser users={users} id={report.handled_by}/>
              {(report.handled_at) ? <span className='text-xs text-subtle'><ExactDate value={report.handled_at} format={formatDateTime}/></span> : null}
            </div>
          </>
        ) : null}
      </DetailModalStrip>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* the member as they looked when reported, a message report's quote already shows its author */}
        {(!isMessage && report.target_quote) ? (
          <section className='mb-4'>
            <div className='mb-1 flex min-h-8 items-center'>
              <h3 className='section-label'>Reported member</h3>
            </div>
            <ReportImage guildId={guildId} report={report} kind='member'/>
          </section>
        ) : null}

        {(isMessage) ? (
          <section className='mb-4'>
            <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
              <h3 className='section-label'>Reported message</h3>
              {(jumpUrl) ? (
                <a href={jumpUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-code hover:underline'>
                  Open in Discord
                  <ExternalLink aria-hidden className='size-3'/>
                </a>
              ) : null}
            </div>
            <ReportedMessage guildId={guildId} report={report}/>
          </section>
        ) : null}

        <section>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Reason</h3>
            <CopyButton value={report.reason} label='Copy'/>
          </div>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{report.reason}</p>
        </section>

        <section className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center'>
            <h3 className='section-label'>Conversation with the reporter</h3>
          </div>
          <Conversation guildId={guildId} report={report} reporter={users[report.user_id] ?? null}/>
        </section>
      </div>

      <AdminModalFooter {...navigation}>
        {ACTION_SLOTS.map((slot) => {
          const value = (report.status === slot) ? ReportStatuses.OPEN : slot;
          const Icon = STATUS_ICONS[value] ?? RotateCcw;
          return (
            <button
              key={slot}
              type='button'
              className={cn('btn min-w-0 flex-1 px-2 sm:flex-none sm:px-3', STATUS_BUTTON_CLASSES[value])}
              disabled={mutation.isPending}
              onClick={() => setStatus(value)}
            >
              {(pendingStatus === value) ? <Spinner className='size-4'/> : <Icon aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
              <span className='truncate'>{STATUS_ACTIONS[value]}</span>
            </button>
          );
        })}
      </AdminModalFooter>
    </div>
  );
}


// the quote when there's one, its text otherwise, then when what's kept gets deleted
function ReportedMessage({ guildId, report }: {guildId: string, report: GuildReport}) {
  const expires = (report.message_content_expires_at) ? (
    <p className='mt-1 text-xs text-subtle'>
      {(report.message_quote) ? 'This image is' : 'This text is'} deleted on {formatDate(report.message_content_expires_at)}
    </p>
  ) : null;
  if (report.message_quote) {
    return <><ReportImage guildId={guildId} report={report} kind='message'/>{expires}</>;
  }
  if (report.message_content) {
    return (
      <>
        <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-muted' {...selectAllScope}>{report.message_content}</p>
        {expires}
      </>
    );
  }
  return (
    <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm text-subtle italic'>
      {(report.message_content_deleted) ? 'The saved copy was deleted 30 days after the report' : 'No text (attachments or embeds only)'}
    </p>
  );
}


// the reported message (drawn like `quote`) or member as they looked. A message's text instead if its image can't load
function ReportImage({ guildId, report, kind }: {guildId: string, report: GuildReport, kind: GuildReportImageKind}) {
  const query = useGuildReportImageQuery(guildId, report.id, kind);
  const [ url, setUrl ] = useState<string | null>(null);
  // drawn at 2x for sharp text, shown at the size discord shows it
  const [ width, setWidth ] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!query.data) {
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);

  if (url) {
    return (
      <a href={url} target='_blank' rel='noreferrer' className='block w-fit'>
        <img
          src={url}
          alt={imageAlt(report, kind)}
          width={width}
          className='h-auto max-w-full rounded-md'
          onLoad={(event) => setWidth(Math.round(event.currentTarget.naturalWidth / IMAGE_SCALE))}
        />
      </a>
    );
  }
  if (query.isPending) {
    return <Skeleton className={cn('w-full max-w-md bg-surface-3', (kind === 'message') ? 'h-24' : 'h-14 max-w-60')}/>;
  }
  if (kind === 'member') {
    return <p className='text-sm text-subtle italic'>Couldn’t load the image of the member</p>;
  }
  return (report.message_content) ? (
    <p className='text-sm break-words whitespace-pre-wrap text-muted'>{report.message_content}</p>
  ) : (
    <p className='text-sm text-subtle italic'>Couldn’t load the image of the message</p>
  );
}


function imageAlt(report: GuildReport, kind: GuildReportImageKind): string {
  if (kind === 'member') {
    return 'The reported member as they looked when they were reported';
  }
  return (report.message_content) ? `The reported message: ${report.message_content}` : 'The reported message';
}


// moderators are the thread's staff side here, the reporter only ever sees "the moderators" in the bot's DMs
function Conversation({ guildId, report, reporter }: {guildId: string, report: GuildReport, reporter: GuildContentUser | null}) {
  const toast = useToast();
  const query = useGuildReportMessagesQuery(guildId, report.id);
  const mutation = usePostGuildReportMessageMutation(guildId, report.id);
  const messages: Array<ReportMessage> | undefined = query.data?.items.map((message) => ({
    ...message,
    author: (message.author === 'moderator') ? 'staff' : 'reporter',
  }));
  return (
    <ReportThread
      viewer='staff'
      reporter={reporter}
      messages={messages}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
      onSend={(content) => mutation.mutateAsync(content).catch((error) => {
        toast(errorMessage(error, 'Couldn’t send the reply.'), 'error');
        throw error;
      })}
      sending={mutation.isPending}
      staff={{name: MODERATORS_NAME, icon: <Shield className='size-4 text-brand'/>}}
      emptyText='No replies yet. Anything you send here is DMed to the reporter from “the moderators”, and they can respond from that DM.'
      placeholder='Reply to the reporter as the moderators...'
      maxLength={MAX_REPLY_LENGTH}
      notice={(report.status !== ReportStatuses.OPEN) ? 'Replying doesn’t reopen the report.' : undefined}
    />
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='divide-y divide-line rounded-md border border-line'>
      {Array.from({length: 4}, (_, i) => (
        <li key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='h-5 w-18 bg-surface-2'/>
          <Skeleton className='h-4 w-44'/>
          <Skeleton className='h-3 flex-1 bg-surface-2'/>
          <Skeleton className='h-5 w-20 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
