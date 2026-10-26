// The reports the user sent (with the bot's report commands or the website's report forms) and where they stand. Here they
// can talk with staff (only ever "NotSoAdmin" to them) about one and reopen it, even after it was resolved or dismissed.
// Laid out like the admin reports page: one line per report, and a click opens it in a modal like the admin one.
// `content` is whatever the user typed, so it's only ever rendered as plain text.

import { ExternalLink, MessageSquareWarning, MessagesSquare, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import logo from '@/assets/logos/NotSoLogo.svg';
import { useAuth } from '@/auth';
import { DetailModalHeader, DetailModalStrip } from '@/components/ui/DetailModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ReportStatuses, ReportTypes, type MeReport, type MeReportsSortBy } from '@/lib/api';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ME_REPORTS_PAGE_SIZE,
  errorMessage,
  useMeReportMessagesQuery,
  useMeReportQuery,
  useMeReportsQuery,
  usePostMeReportMessageMutation,
  useReopenMeReportMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, toDate } from '@/lib/utils';

import { AdminModalFooter, AdminTagModal, LinkedItemModal, useOpenListItem } from '../admin/AdminTagModal';
import { Chip, CopyableValue, CopyButton, DETAIL_LIST_STACKED, DetailList, ExactDate, FiltersButton, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { Segmented } from '@/components/ui/Segmented';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { REPORT_STATUSES, REPORT_TARGET_LABELS, reportJumpUrl, reportStatusInfo, reportTypeInfo, ROW_EDGE_BAR } from './reportLabels';
import { REPORT_STAFF_NAME, ReportThread } from './ReportThread';
import { ServerReportsTab } from './ServerReportsTab';


function parseStatus(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

// the last reply is from staff, so it's the user's turn
function staffReplied(report: MeReport): boolean {
  return report.last_reply?.author === 'staff';
}

const STAFF_REPLIED_TITLE = 'The last reply is from the NotSoBot team';


// who sent the last reply, told apart at a glance: staff's is brand coloured with the bot's logo (their turn to read it),
// the user's own is grey with their avatar (waiting on staff). Nothing before anyone's replied
function LastReplyChip({ report, className }: {report: MeReport, className?: string}) {
  const { user } = useAuth();
  if (!report.last_reply) {
    return null;
  }
  if (report.last_reply.author === 'staff') {
    return (
      <Chip tone='brand' className={cn('gap-1', className)} title={STAFF_REPLIED_TITLE}>
        <img src={logo} alt='' className='size-3.5'/>
        {REPORT_STAFF_NAME} replied
      </Chip>
    );
  }
  return (
    <Chip className={cn('gap-1', className)} title={`You replied last, waiting on ${REPORT_STAFF_NAME}`}>
      {(user) ? <UserAvatar user={user} size={32} className='size-3.5 rounded-full bg-surface-3'/> : null}
      You replied
    </Chip>
  );
}

// `updated` (the default) is the newest reply or status change, so reports with something new come first
const SORTS: Array<{value: MeReportsSortBy, label: string}> = [
  {value: 'updated', label: 'Last updated'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

// when it last changed, the same as the api's `updated` sort
function reportUpdated(report: MeReport): MeReport['created'] {
  const { created, last_activity: lastActivity } = report;
  return (lastActivity && toDate(created).getTime() < toDate(lastActivity).getTime()) ? lastActivity : created;
}

const TITLE_ID = 'report-modal-title';


const TABS = [
  {value: 'bot', label: 'Bot'},
  {value: 'servers', label: 'Servers'},
];

// Bot (the reports to the NotSoBot developers, the default) and Servers (the reports to servers' moderators), each with
// its own search and filters, so switching clears them
export function ReportsPage() {
  const [ searchParams, setSearchParams ] = useSearchParams();
  const tab = (searchParams.get('tab') === 'servers') ? 'servers' : 'bot';
  return (
    <>
      <DashboardHeader
        title='Your Reports'
        description={(tab === 'servers') ? (
          <>Reports you’ve sent to servers’ moderators with the bot’s <code className='text-fg'>report</code> command or <span className='text-fg'>Report to Mods</span>. They’re only ever “the moderators” to you.</>
        ) : (
          <>Reports you’ve sent to the NotSoBot developers with the bot’s <code className='text-fg'>report</code> commands or from the website.</>
        )}
      />
      <div className='mb-4'>
        <Segmented label='Reports sent to' value={tab} options={TABS} onChange={(value) => setSearchParams((value === 'bot') ? {} : {tab: value}, {replace: true})}/>
      </div>
      {(tab === 'servers') ? <ServerReportsTab/> : <BotReportsTab/>}
    </>
  );
}


// the list, with the open report (`/dashboard/reports/<id>`, so it can be linked) in a modal over it
function BotReportsTab() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const status = parseStatus(searchParams.get('status'));
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'updated';
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  // the panel starts closed like the admin pages', the button counts the ones not on their default
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [sortBy !== 'updated', status !== null].filter(Boolean).length;
  const filtered = !!debouncedQuery || status !== null;

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeReportsQuery({query: debouncedQuery, status, sortBy, page});
  const items = data?.items ?? [];
  const { openId, openItem: listedItem, previousId, nextId, open, close } = useOpenListItem(items, (report) => report.id, Routes.DASHBOARD_REPORTS);
  // a link to a report that isn't on this page
  const linked = useMeReportQuery(openId, !listedItem);
  const openItem = listedItem ?? linked.data ?? null;
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_REPORTS_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ME_REPORTS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search what you wrote, or a report #...'
          aria-label='Search your reports'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='report-filters'/>
      </div>

      <div id='report-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Sort</span>
          <select className='input' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'updated') ? null : event.target.value})}>
            {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select className='input' value={(status === null) ? '' : String(status)} onChange={(event) => update({status: event.target.value})}>
            <option value=''>Any</option>
            {REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load your reports' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState
          icon={<MessageSquareWarning className='size-10'/>}
          title={(debouncedQuery) ? 'No reports found' : (status === null) ? 'No reports yet' : `No ${reportStatusInfo(status).label.toLowerCase()} reports`}
        >
          {(debouncedQuery) ? 'Try a different search or filter.' : (!filtered) ? (
            <>Send one in Discord with <code className='text-fg'>/report</code>, or right-click a user or one of NotSoBot’s messages and pick <span className='text-fg'>Apps → Report</span>.</>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_REPORTS_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((report) => <ReportRow key={report.id} report={report} showUpdated={sortBy === 'updated'} onOpen={open}/>)}
          </ul>
          {(pagination.count > ME_REPORTS_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <ReportDetails key={openItem.id} report={openItem} navigation={{previousId, nextId, onNavigate: open}}/>
        </AdminTagModal>
      ) : (openId) ? (
        <LinkedItemModal noun='report' notFoundMessage='You haven’t sent a report with this id.' query={linked} onClose={close}/>
      ) : null}
    </>
  );
}


// one line per report like the admin list, a click opens it in the modal where the conversation is.
// Plain content only inside (no buttons, links or focusable dates), since the whole row is a button.
// The type and id in the top left with who replied last under them, the status in the top right with the date under it,
// and what they wrote across the bottom.
// `showUpdated`: the date is when it last changed (sorted by that), otherwise when it was sent
function ReportRow({ report, showUpdated, onOpen }: {report: MeReport, showUpdated: boolean, onOpen: (id: string) => void}) {
  const status = reportStatusInfo(report.status);
  const type = reportTypeInfo(report.type);
  const replied = staffReplied(report);
  const updated = reportUpdated(report);
  const edited = showUpdated && updated !== report.created;
  return (
    <li className='group/row relative'>
      {/* an unread bar down the left edge while staff sent something they haven't opened yet */}
      {(report.unread) ? <span aria-hidden title='Something new from staff' className={cn(ROW_EDGE_BAR, 'bg-brand')}/> : null}
      <button
        type='button'
        className='grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:gap-x-4 sm:px-5'
        onClick={() => onOpen(report.id)}
      >
        {/* what it is and its id (fixed widths, so rows line up) */}
        <span className='col-start-1 row-start-1 flex min-w-0 items-center gap-3'>
          <Chip tone={type.tone} className='w-16 shrink-0 justify-center'>{type.label}</Chip>
          <span className='min-w-0 truncate font-mono text-sm leading-5 text-white'>#{report.id}</span>
        </span>
        {/* who replied last, under the type. What it's about (ids) is in the modal */}
        <span className='col-start-1 row-start-2 flex min-h-5 min-w-0 items-center'>
          <LastReplyChip report={report} className='shrink-0'/>
        </span>
        {/* what they wrote, across the bottom in a code box like the modal's */}
        <span className='col-span-2 row-start-3 flex min-w-0 items-center gap-2 text-sm text-muted'>
          {(report.replies) ? (
            <span
              className={cn('inline-flex shrink-0 items-center gap-1 text-xs', (replied) ? 'font-medium text-brand' : 'text-subtle')}
              title={(replied) ? STAFF_REPLIED_TITLE : `${report.replies} ${(report.replies === 1) ? 'reply' : 'replies'}`}
            >
              <MessagesSquare aria-hidden className='size-3.5'/>
              {report.replies}
            </span>
          ) : null}
          <span className='min-w-0 flex-1 truncate rounded-md border border-line bg-deep px-2.5 py-1 font-mono text-xs text-fg'>{report.content}</span>
        </span>
        {/* the status in the top right, when it was sent under it */}
        <Chip tone={status.tone} className='col-start-2 row-start-1 w-20 justify-center justify-self-end'>{status.label}</Chip>
        <span className='col-start-2 row-start-2 justify-self-end text-xs whitespace-nowrap text-subtle'>
          {(edited) ? `Updated ${formatDateTime(updated)}` : formatDateTime(report.created)}
        </span>
      </button>
    </li>
  );
}


// the admin modal's layout without the staff parts (notes, who reviewed it): the header, what it's about in a strip under
// it, where it was sent, what they wrote and the conversation. `navigation` is the modal's Previous / Next, Reopen goes
// between them once it's closed
function ReportDetails({ report, navigation }: {
  report: MeReport,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
}) {
  const toast = useToast();
  const reopen = useReopenMeReportMutation(report.id);
  const status = reportStatusInfo(report.status);
  const type = reportTypeInfo(report.type);
  const closed = report.status !== ReportStatuses.OPEN;
  const isMessageReport = report.type === ReportTypes.MESSAGE;
  const jumpUrl = reportJumpUrl(report);

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip tone={type.tone} className='w-16 shrink-0 justify-center'>{type.label}</Chip>}
        title={<><span className='sr-only'>Report </span>#{report.id}</>}
        mono
        meta={<ExactDate value={report.created} format={formatDateTime}/>}
        states={(report.last_reply) ? <LastReplyChip report={report}/> : null}
        status={<Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>}
      />

      {/* what it's about, bugs aren't about anything. A message report is about one of the bot's replies, so its target is
          whoever used the command */}
      {(report.type !== ReportTypes.BUG) ? (
        <DetailModalStrip className='grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3'>
          <span className='text-xs text-subtle'>{(isMessageReport) ? 'Command used by' : `Reported ${REPORT_TARGET_LABELS[report.type] ?? 'target'}`}</span>
          <div className='flex min-h-8 min-w-0 items-center'>
            {(report.target_id) ? <CopyableValue value={report.target_id} truncate={0}/> : <span className='text-sm text-subtle'>Not given</span>}
          </div>
        </DetailModalStrip>
      ) : null}

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* side by side once there's room, stacked on phones with one label column (subgrid) so the values line up */}
        <div className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-2'>
          {/* where the report command was used, or where the reported message is for message reports */}
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              ['Server', (report.guild_id) ? <CopyableValue value={report.guild_id} truncate={0}/> : <span className='text-subtle'>None, {(isMessageReport) ? 'it’s in' : 'sent in'} DMs</span>],
              ['Channel', (report.channel_id) ? <CopyableValue value={report.channel_id} truncate={0}/> : '—'],
              [(isMessageReport) ? 'Reported message' : 'Message', (report.message_id) ? (
                <span className='inline-flex flex-wrap items-center gap-x-2'>
                  <CopyableValue value={report.message_id} truncate={0}/>
                  {(jumpUrl) ? (
                    <a href={jumpUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-code hover:underline'>
                      Open in Discord
                      <ExternalLink aria-hidden className='size-3'/>
                    </a>
                  ) : null}
                </span>
              ) : '—'],
            ]}
          />
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              // phones only, the title's can be cut off there
              ['Report', <CopyableValue value={report.id} truncate={0}/>, 'sm:hidden'],
              ['Replies', (report.replies) ? (
                <span>
                  {report.replies.toLocaleString()}
                  {(report.last_reply) ? (
                    <span className='text-subtle'>
                      {' '}• last from {(report.last_reply.author === 'staff') ? REPORT_STAFF_NAME : 'you'}{' '}
                      <ExactDate value={report.last_reply.created} format={formatDateTime}/>
                    </span>
                  ) : null}
                </span>
              ) : 'None'],
              ['Reviewed', (report.reviewed_at) ? <ExactDate value={report.reviewed_at} format={formatDateTime}/> : <span className='text-subtle'>Not yet</span>],
            ]}
          />
        </div>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Report</h3>
            <CopyButton value={report.content} label='Copy'/>
          </div>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{report.content}</p>
        </div>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center'>
            <h3 className='section-label'>Conversation with {REPORT_STAFF_NAME}</h3>
          </div>
          <ReportConversation report={report}/>
        </div>
      </div>

      <AdminModalFooter {...navigation}>
        {(closed) ? (
          <button
            type='button'
            className='btn min-w-0 flex-1 border border-warning/40 bg-warning/15 px-2 text-warning hover:bg-warning/25 sm:flex-none sm:px-3'
            disabled={reopen.isPending}
            onClick={() => reopen.mutate(undefined, {
              onSuccess: () => toast(`Report ${report.id}: reopened`),
              onError: (error) => toast(errorMessage(error), 'error'),
            })}
          >
            {(reopen.isPending) ? <Spinner className='size-4'/> : <RotateCcw aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
            <span className='truncate'>Reopen</span>
          </button>
        ) : null}
      </AdminModalFooter>
    </div>
  );
}


// works whatever the status is; replying alone doesn't reopen it, that's the footer's Reopen
function ReportConversation({ report }: {report: MeReport}) {
  const toast = useToast();
  const { user } = useAuth();
  const messages = useMeReportMessagesQuery(report.id);
  const send = usePostMeReportMessageMutation(report.id);
  return (
    <ReportThread
      viewer='reporter'
      reporter={user}
      messages={messages.data?.items}
      loading={messages.isPending}
      error={messages.error}
      onRetry={() => messages.refetch()}
      onSend={(content) => send.mutateAsync(content).catch((error) => {
        toast(errorMessage(error), 'error');
        throw error;
      })}
      sending={send.isPending}
      notice={(report.status !== ReportStatuses.OPEN) ? (
        <>This report is {reportStatusInfo(report.status).label.toLowerCase()}. Replying won’t reopen it, use <span className='text-fg'>Reopen</span> if you still need it looked at.</>
      ) : undefined}
    />
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 4}, (_, i) => (
        <li key={i} className='grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-4 sm:px-5'>
          <Skeleton className='h-5 w-32'/>
          <Skeleton className='h-5 w-20 bg-surface-2'/>
          <Skeleton className='h-3 w-40 bg-surface-2'/>
          <Skeleton className='h-3 w-24 bg-surface-2'/>
          <Skeleton className='col-span-2 h-6 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
