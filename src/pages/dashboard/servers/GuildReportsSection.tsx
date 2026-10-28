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
import { translate, useI18n, type TranslationKey } from '@/i18n';
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
// the api draws the report images at 2x (`DEVICE_SCALE` in `apis/discord_quote.py`)
const IMAGE_SCALE = 2;
const TITLE_ID = 'guild-report-modal-title';

// labels come from `reportStatusInfo`
const STATUS_OPTIONS = [ReportStatuses.OPEN, ReportStatuses.RESOLVED, ReportStatuses.DISMISSED].map((status) => ({value: String(status), status}));

// the buttons, and the toast once it's done, by the status they set
const STATUS_ACTIONS: Record<number, TranslationKey> = {
  [ReportStatuses.OPEN]: 'greports.action.open',
  [ReportStatuses.RESOLVED]: 'greports.action.resolved',
  [ReportStatuses.DISMISSED]: 'greports.action.dismissed',
};

const STATUS_DONE: Record<number, TranslationKey> = {
  [ReportStatuses.OPEN]: 'greports.done.open',
  [ReportStatuses.RESOLVED]: 'greports.done.resolved',
  [ReportStatuses.DISMISSED]: 'greports.done.dismissed',
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
  return (report.type === GuildReportTypes.MESSAGE) ? {label: translate('sreports.type.message'), tone: 'warning'} : {label: translate('sreports.type.member'), tone: 'danger'};
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
  const { t } = useI18n();
  const editable = guild.editable.moderation;
  const readOnlyMessage = useReadOnlyMessage();
  const hasLogger = guild.loggers.some((logger) => logger.type === REPORTS_LOGGER_TYPE);

  return (
    <Panel
      title={t('greports.title')}
      accent='#ed4245'
      description={t('greports.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('moderation')}
    >
      {(editable) ? <ReportsList guildId={guild.id} hasLogger={hasLogger}/> : <p className='text-sm text-muted'>{t('greports.mods_only')}</p>}
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
  const { t, rich } = useI18n();
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
          placeholder={t('greports.search_placeholder')}
          aria-label={t('greports.search_label')}
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='guild-report-filters'/>
      </div>
      <p className='mb-3 text-xs text-subtle'>
        {rich('greports.search_hint', {code: (chunk) => <code className='text-code'>{chunk}</code>})}
      </p>

      <div id='guild-report-filters' hidden={!filtersOpen} className='mb-3 grid gap-3 rounded-md border border-line p-3 sm:grid-cols-3'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('greports.status')}</span>
          <select
            className='input'
            value={(status === null) ? 'all' : String(status)}
            onChange={(event) => update({status: (event.target.value === 'queue') ? null : event.target.value})}
          >
            <option value='queue'>{t('greports.queue')}</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{reportStatusInfo(option.status).label}</option>)}
            <option value='all'>{t('greports.any')}</option>
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('greports.type')}</span>
          <select className='input' value={(type === null) ? '' : String(type)} onChange={(event) => update({type: event.target.value})}>
            <option value=''>{t('greports.any')}</option>
            <option value={GuildReportTypes.USER}>{t('sreports.type.member')}</option>
            <option value={GuildReportTypes.MESSAGE}>{t('sreports.type.message')}</option>
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('greports.conversation')}</span>
          <select className='input' value={(awaitingReply === null) ? '' : String(awaitingReply)} onChange={(event) => update({awaiting_reply: event.target.value})}>
            <option value=''>{t('greports.any')}</option>
            <option value='true'>{t('greports.waiting')}</option>
            <option value='false'>{t('greports.not_waiting')}</option>
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !reports.length) ? (
        <div role='alert' className='flex items-center gap-3 text-sm text-danger-text'>
          {errorMessage(error, t('greports.load_error'))}
          <button type='button' className='btn btn-secondary btn-sm' disabled={isRefetching} onClick={() => void refetch()}>{t('common.try_again')}</button>
        </div>
      ) : (!reports.length) ? (
        <EmptyState icon={<Inbox className='size-10'/>} title={t((filtered) ? 'greports.empty_filtered' : 'greports.empty')}>
          {t((filtered) ? 'greports.empty_filtered_description' : (hasLogger) ? 'greports.empty_description' : 'greports.empty_no_logger')}
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
        <LinkedItemModal noun={t('reports.noun')} notFoundMessage={t('greports.not_found')} query={linked} onClose={closeLinked}/>
      ) : null}
    </div>
  );
}


// one line per report, just enough to triage from; the rest is in `ReportDetails` a click away. Plain content only inside
// (no buttons, links or focusable dates), since the whole row is a button. Like the admin reports': the type and id in the
// top left with the reporter under them, the status in the top right with the date under it, and the reason across the
// bottom. Who's reported is in the details.
function ReportRow({ report, users, onOpen }: {report: GuildReport, users: ReportUsers, onOpen: (id: string) => void}) {
  const { t, plural } = useI18n();
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
              title={(awaiting) ? t('greports.reporter_replied') : plural('reports.replies', report.replies)}
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
  const { t } = useI18n();
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
        toast(translate(STATUS_DONE[value], {id: report.id}));
      },
      onError: (error) => toast(errorMessage(error, translate('greports.update_error')), 'error'),
    });
  };

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip tone={type.tone} className='w-18 shrink-0 justify-center'>{type.label}</Chip>}
        title={<><span className='sr-only'>{t('reports.report_sr')}</span>#{report.id}</>}
        mono
        meta={<ExactDate value={report.created} format={formatDateTime}/>}
        states={(awaitingReply(report)) ? <Chip tone='warning' title={t('greports.replied_title')}>{t('greports.waiting_chip')}</Chip> : null}
        status={<Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>}
      />

      {/* who sent it and who it's about, then who handled it */}
      <DetailModalStrip className='grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1'>
        <span className='text-xs text-subtle'>{t('greports.reporter')}</span>
        <div className='flex min-h-8 min-w-0 items-center gap-2'>
          <ReportUser users={users} id={report.user_id}/>
          <CopyButton value={report.user_id}/>
          {(report.reporter_muted) ? <Chip title={t('greports.muted_title')}>{t('sreports.dms_off')}</Chip> : null}
        </div>
        <span className='text-xs text-subtle'>{t((isMessage) ? 'sreports.message_by' : 'sreports.reported_member')}</span>
        <div className='flex min-h-8 min-w-0 items-center gap-2'>
          <ReportUser users={users} id={report.target_id}/>
          <CopyButton value={report.target_id}/>
        </div>
        {(report.status !== ReportStatuses.OPEN && report.handled_by) ? (
          <>
            <span className='text-xs text-subtle'>{t('greports.handled_by', {status: status.label})}</span>
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
              <h3 className='section-label'>{t('sreports.reported_member')}</h3>
            </div>
            <ReportImage guildId={guildId} report={report} kind='member'/>
          </section>
        ) : null}

        {(isMessage) ? (
          <section className='mb-4'>
            <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
              <h3 className='section-label'>{t('sreports.reported_message')}</h3>
              {(jumpUrl) ? (
                <a href={jumpUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-code hover:underline'>
                  {t('reports.open_discord')}
                  <ExternalLink aria-hidden className='size-3'/>
                </a>
              ) : null}
            </div>
            <ReportedMessage guildId={guildId} report={report}/>
          </section>
        ) : null}

        <section>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>{t('greports.reason')}</h3>
            <CopyButton value={report.reason} label={t('common.copy')}/>
          </div>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{report.reason}</p>
        </section>

        <section className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center'>
            <h3 className='section-label'>{t('greports.conversation_with')}</h3>
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
              <span className='truncate'>{t(STATUS_ACTIONS[value])}</span>
            </button>
          );
        })}
      </AdminModalFooter>
    </div>
  );
}


// the quote when there's one, its text otherwise, then when what's kept gets deleted
function ReportedMessage({ guildId, report }: {guildId: string, report: GuildReport}) {
  const { t } = useI18n();
  const expires = (report.message_content_expires_at) ? (
    <p className='mt-1 text-xs text-subtle'>
      {t((report.message_quote) ? 'greports.image_expires' : 'greports.text_expires', {date: formatDate(report.message_content_expires_at)})}
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
      {t((report.message_content_deleted) ? 'sreports.copy_deleted' : 'sreports.no_text')}
    </p>
  );
}


// the reported message (drawn like `quote`) or member as they looked. A message's text instead if its image can't load
function ReportImage({ guildId, report, kind }: {guildId: string, report: GuildReport, kind: GuildReportImageKind}) {
  const { t } = useI18n();
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
    return <p className='text-sm text-subtle italic'>{t('greports.member_image_error')}</p>;
  }
  return (report.message_content) ? (
    <p className='text-sm break-words whitespace-pre-wrap text-muted'>{report.message_content}</p>
  ) : (
    <p className='text-sm text-subtle italic'>{t('greports.message_image_error')}</p>
  );
}


function imageAlt(report: GuildReport, kind: GuildReportImageKind): string {
  if (kind === 'member') {
    return translate('greports.member_alt');
  }
  return (report.message_content) ? translate('greports.message_alt', {content: report.message_content}) : translate('greports.message_alt_empty');
}


// moderators are the thread's staff side here, the reporter only ever sees "the moderators" in the bot's DMs
function Conversation({ guildId, report, reporter }: {guildId: string, report: GuildReport, reporter: GuildContentUser | null}) {
  const { t } = useI18n();
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
        toast(errorMessage(error, translate('sreports.send_error')), 'error');
        throw error;
      })}
      sending={mutation.isPending}
      staff={{name: t('sreports.moderators'), icon: <Shield className='size-4 text-brand-text'/>}}
      emptyText={t('greports.empty_thread')}
      placeholder={t('greports.placeholder')}
      maxLength={MAX_REPLY_LENGTH}
      notice={(report.status !== ReportStatuses.OPEN) ? t('greports.no_reopen') : undefined}
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
