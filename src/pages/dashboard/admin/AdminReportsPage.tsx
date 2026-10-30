// Bug, user, server, message and tag reports sent with the bot's `report` commands (prefixed, slash and context menus),
// and bug and tag reports from the website, which can be anonymous (no reporter, so no conversation).
// `content` is whatever the reporter typed, so it's only ever rendered as plain text.

import { ArrowUpRight, Check, ExternalLink, EyeOff, Inbox, Languages, type LucideIcon, MessagesSquare, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { DetailModalHeader, DetailModalStrip } from '@/components/ui/DetailModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ReportStatuses, ReportTypes, type Report, type ReportPatch, type ReportStatus, type ReportTranslation } from '@/lib/api';
import {
  ADMIN_PAGE_SIZE,
  errorMessage,
  useAdminReportMessagesQuery,
  useAdminReportQuery,
  useAdminReportsQuery,
  usePatchAdminReportMutation,
  usePostAdminReportMessageMutation,
  useTranslateAdminReportMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDateTime } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { REPORT_TARGET_LABELS, REPORT_TONE_FILLS, REPORT_TYPES, ROW_EDGE_BAR, type ReportTone, reportJumpUrl, reportTypeInfo } from '../reports/reportLabels';
import { ReportThread } from '../reports/ReportThread';
import { AdminModalFooter, AdminTagModal, LinkedItemModal, useOpenListItem } from './AdminTagModal';
import { UserModerationButtons } from './UserModerationButtons';
import { adminServerPath, adminUserPath, Chip, CopyableValue, CopyButton, DETAIL_LIST_STACKED, DetailList, ExactDate, FilterButton, FiltersButton, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage, UserCell } from './adminUi';


type Tone = ReportTone;

const STATUSES: Array<{value: ReportStatus, label: string, action: string, tone: Tone}> = [
  {value: ReportStatuses.OPEN, label: 'Open', action: 'Reopen', tone: 'warning'},
  {value: ReportStatuses.RESOLVED, label: 'Resolved', action: 'Resolve', tone: 'success'},
  {value: ReportStatuses.DISMISSED, label: 'Dismissed', action: 'Dismiss', tone: 'neutral'},
];

const TYPES = REPORT_TYPES;

function statusInfo(status: number) {
  return STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, action: '', tone: 'neutral' as Tone};
}

const typeInfo = reportTypeInfo;

const TITLE_ID = 'admin-report-modal-title';


function parseEnum(value: string | null): number | null {
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

// defaults to the open ones (the review queue), `status=all` shows every report
function parseStatus(value: string | null): number | null {
  return (value === 'all') ? null : parseEnum(value) ?? ReportStatuses.OPEN;
}

function parseBool(value: string | null): boolean | null {
  return (value === 'true') ? true : (value === 'false') ? false : null;
}

// the reporter sent the last reply. Replying doesn't reopen a closed report, so these can be resolved or dismissed too
function awaitingReply(report: Report): boolean {
  return report.last_reply?.author === 'reporter';
}

// the slot each status button sits in; once the report is in that status, the slot turns into Reopen
const ACTION_SLOTS: Array<ReportStatus> = [ReportStatuses.RESOLVED, ReportStatuses.DISMISSED];

// the footer's status buttons, by the status they set
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


export function AdminReportsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  const navigate = useNavigate();
  const type = parseEnum(searchParams.get('type'));
  const status = parseStatus(searchParams.get('status'));
  const awaiting = parseBool(searchParams.get('awaiting_reply'));
  const anonymous = parseBool(searchParams.get('anonymous'));
  // what they wrote, or an id: `#<report>`, `user:<reporter>`, `target:<id>`, `server:<sent from or about>` or a bare one
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminReportsQuery({
    type,
    status,
    awaitingReply: awaiting,
    anonymous,
    query: debouncedQuery,
    page,
  });
  const items = data?.items ?? [];
  const { openId, openItem: listedItem, previousId, nextId, open, close } = useOpenListItem(items, (report) => report.id, Routes.DASHBOARD_ADMIN_REPORTS);
  // a link to a report that isn't on this page
  const linked = useAdminReportQuery(openId, !listedItem);
  const openItem = listedItem ?? linked.data ?? null;
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const filtered = !!(type !== null || status !== ReportStatuses.OPEN || awaiting !== null || anonymous !== null || debouncedQuery);
  // the panel starts closed like the other admin pages', the button counts the filters not on their default (the search
  // box stays out)
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [type !== null, status !== ReportStatuses.OPEN, awaiting !== null, anonymous !== null].filter(Boolean).length;
  // closes the report too (in the same navigation), the one it's filtering by might not be in the new list
  const filterBy = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [ key, value ] of Object.entries(changes)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    next.delete('page');
    navigate({pathname: Routes.DASHBOARD_ADMIN_REPORTS, search: next.toString()}, {replace: true, preventScrollReset: true});
  };

  return (
    <>
      <DashboardHeader
        title='Reports'
        description={<>Bug, user, server, message and tag reports sent with the bot’s report commands, and bug and tag reports from the website (anonymous when logged out), newest first. Search what they wrote, or an id: a bare one matches the report, reporter, target or server; <code className='text-code'>#&lt;id&gt;</code>, <code className='text-code'>user:</code>, <code className='text-code'>target:</code> or <code className='text-code'>server:</code> match only that, with any other text still searched (<code className='text-code'>user:&lt;id&gt; foo</code>).</>}
      />

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder='Search what they wrote, #id, user:, target: or server:...'
          aria-label='Search reports'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='admin-report-filters'/>
      </div>

      <div id='admin-report-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select
            className='input'
            value={(status === null) ? 'all' : String(status)}
            onChange={(event) => update({status: (event.target.value === String(ReportStatuses.OPEN)) ? null : event.target.value})}
          >
            <option value='all'>Any</option>
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Type</span>
          <select className='input' value={(type === null) ? '' : String(type)} onChange={(event) => update({type: event.target.value})}>
            <option value=''>Any</option>
            {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Conversation</span>
          <select className='input' value={(awaiting === null) ? '' : String(awaiting)} onChange={(event) => update({awaiting_reply: event.target.value})}>
            <option value=''>Any</option>
            <option value='true'>Waiting on staff</option>
            <option value='false'>Not waiting</option>
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>Sender</span>
          <select className='input' value={(anonymous === null) ? '' : String(anonymous)} onChange={(event) => update({anonymous: event.target.value})}>
            <option value=''>Any</option>
            <option value='false'>Logged in</option>
            <option value='true'>Anonymous</option>
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load reports' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Inbox className='size-10'/>} title={(filtered) ? 'No reports' : 'No open reports'}>
          {(filtered) ? 'Nothing matches these filters.' : 'Everything’s been reviewed.'}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((report) => <ReportRow key={report.id} report={report} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <ReportDetails
            key={openItem.id}
            report={openItem}
            onFilterReporter={(value) => filterBy({q: `user:${value}`})}
            onFilterTarget={(value) => filterBy({q: `target:${value}`})}
            navigation={{previousId, nextId, onNavigate: open}}
          />
        </AdminTagModal>
      ) : (openId) ? (
        <LinkedItemModal noun='report' notFoundMessage='There’s no report with this id.' query={linked} onClose={close}/>
      ) : null}
    </>
  );
}


// one line per report, just enough to triage from; the rest is in `ReportDetails` a click away.
// Plain content only inside (no buttons, links or focusable dates), since the whole row is a button.
// The type and id in the top left with the reporter under them, the status in the top right with the date under it, and
// what they wrote across the bottom.
function ReportRow({ report, onOpen }: {report: Report, onOpen: (id: string) => void}) {
  const status = statusInfo(report.status);
  const type = typeInfo(report.type);
  return (
    <li className='group/row relative'>
      {/* the status at a glance, down the left edge like the content flags' */}
      <span aria-hidden title={status.label} className={cn(ROW_EDGE_BAR, REPORT_TONE_FILLS[status.tone])}/>
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
        {/* who sent it, under the type */}
        <span className='col-start-1 row-start-2 min-w-0'>{(report.user) ? <UserCell user={report.user} size='sm'/> : <AnonymousReporter/>}</span>
        {/* what they wrote, across the bottom in a code box like the modal's */}
        <span className='col-span-2 row-start-3 flex min-w-0 items-center gap-2 text-sm text-muted'>
          {(report.replies) ? (
            <span
              className={cn('inline-flex shrink-0 items-center gap-1 text-xs', (awaitingReply(report)) ? 'font-medium text-warning' : 'text-subtle')}
              title={(awaitingReply(report)) ? 'The reporter replied last, waiting on staff' : `${report.replies} ${(report.replies === 1) ? 'reply' : 'replies'}`}
            >
              <MessagesSquare aria-hidden className='size-3.5'/>
              {report.replies}
            </span>
          ) : null}
          <span className='min-w-0 flex-1 truncate rounded-md border border-line bg-deep px-2.5 py-1 font-mono text-xs text-fg'>{report.content}</span>
        </span>
        {/* the status in the top right, when it was sent under it */}
        <Chip tone={status.tone} className='col-start-2 row-start-1 w-20 justify-center justify-self-end'>{status.label}</Chip>
        <span className='col-start-2 row-start-2 justify-self-end text-xs whitespace-nowrap text-subtle'>{formatDateTime(report.created)}</span>
      </button>
    </li>
  );
}


// `navigation` is the modal's Previous / Next, the status actions go between them
function ReportDetails({ report, onFilterReporter, onFilterTarget, navigation }: {
  report: Report,
  onFilterReporter: (userId: string) => void,
  onFilterTarget: (targetId: string) => void,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
}) {
  const toast = useToast();
  const mutation = usePatchAdminReportMutation();
  const [ notes, setNotes ] = useState(report.notes ?? '');
  useEffect(() => setNotes(report.notes ?? ''), [report.notes]);
  const notesDirty = notes !== (report.notes ?? '');
  // what they wrote in english, only kept while it's open (the modal's keyed by report, so it resets between them)
  const translationMutation = useTranslateAdminReportMutation();
  const [ translation, setTranslation ] = useState<ReportTranslation | null>(null);

  const status = statusInfo(report.status);
  const type = typeInfo(report.type);
  const pendingStatus = (mutation.isPending) ? mutation.variables?.patch.status : undefined;
  const savingNotes = mutation.isPending && mutation.variables?.patch.status === undefined;

  // a status change carries unsaved notes along, so "write a note, click Resolve" is one step
  const setStatus = (value: ReportStatus) => {
    const patch: ReportPatch = {status: value};
    if (notesDirty) {
      patch.notes = notes.trim() || null;
    }
    mutation.mutate({reportId: report.id, patch}, {
      onSuccess: () => toast(`Report ${report.id}: ${(value === ReportStatuses.OPEN) ? 'reopened' : statusInfo(value).label.toLowerCase()}`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const translate = () => {
    translationMutation.mutate({reportId: report.id}, {
      onSuccess: (result) => {
        setTranslation(result);
        if (!result.translation && result.translation_language !== 'en') {
          toast(`Report ${report.id}: no translation returned`, 'error');
        }
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const saveNotes = () => {
    mutation.mutate({reportId: report.id, patch: {notes: notes.trim() || null}}, {
      onSuccess: () => toast(`Report ${report.id}: notes saved`),
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };

  // where the report command was used, or the reported message for message reports; a DM has no guild
  const isMessageReport = report.type === ReportTypes.MESSAGE;
  const jumpUrl = reportJumpUrl(report);
  const { user } = report;
  // the target id opens whatever it is: the user, the tag (searched in tags) or the server
  const targetLink = (!report.target_id) ? {} :
    (report.type === ReportTypes.USER || report.type === ReportTypes.MESSAGE) ? {to: adminUserPath(report.target_id), linkTitle: 'Open this user'} :
    (report.type === ReportTypes.TAG) ? {to: `${Routes.DASHBOARD_ADMIN_TAGS}?q=${report.target_id}`, linkTitle: 'Find this tag in tags'} :
    (report.type === ReportTypes.SERVER) ? {to: adminServerPath(report.target_id), linkTitle: 'Open this server'} :
    {};

  return (
    <div>
      {/* the title can be cut off on phones, so there it's in the details below with a copy button too */}
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip tone={type.tone} className='w-16 shrink-0 justify-center'>{type.label}</Chip>}
        title={<><span className='sr-only'>Report </span>#{report.id}</>}
        mono
        meta={<ExactDate value={report.created} format={formatDateTime}/>}
        states={(awaitingReply(report)) ? <Chip tone='warning' title='The reporter replied last, waiting on staff'>waiting on staff</Chip> : null}
        status={<Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>}
      />

      {/* who sent it and what it's about. The reporter links to their admin page, the target id to whatever it is */}
      <DetailModalStrip className='grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1'>
        <span className='text-xs text-subtle'>Reporter</span>
        {(user) ? (
          <div className='flex min-h-8 min-w-0 items-center gap-2'>
            <Link
              to={adminUserPath(user.id)}
              title='Open in users'
              className='group/user -ml-1.5 flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 transition-colors hover:bg-surface-3'
            >
              <UserCell user={user} size='sm'/>
              <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand-text'/>
            </Link>
            {/* the filter by their name, and copying their id under it by the id (outside the link, so copying doesn't open
                their page) */}
            <div className='flex shrink-0 flex-col items-center gap-0.5'>
              <FilterButton label='Show reports from this user' onClick={() => onFilterReporter(user.id)}/>
              <CopyButton value={user.id}/>
            </div>
            {/* on phones the Unblock button says it, the name needs the room */}
            {(user.blocked) ? <Chip tone='danger' title={user.blocked_reason ?? undefined} className='max-sm:hidden'>Blocked</Chip> : null}
            {/* for people spamming the report system */}
            <UserModerationButtons user={user} defaultReason={`Abusing the report system (report #${report.id})`} className='ml-auto'/>
          </div>
        ) : (
          // sent from the website logged out: no account, just a hash of where it came from (the same on reports from
          // the same place)
          <div className='flex min-h-8 min-w-0 items-center gap-2'>
            <AnonymousReporter/>
            {(report.ip_hash) ? (
              <span className='font-mono text-xs text-subtle' title={`Source ${report.ip_hash}: anonymous reports with the same source came from the same IP address`}>
                source {report.ip_hash.slice(0, 8)}
              </span>
            ) : null}
          </div>
        )}
        {(report.type !== ReportTypes.BUG) ? (
          <>
            <span className='text-xs text-subtle'>Reported {REPORT_TARGET_LABELS[report.type] ?? 'target'}</span>
            <div className='flex min-h-8 min-w-0 items-center gap-2'>
              {(report.target_user) ? (
                // in our database, shown like the reporter
                <>
                  <Link
                    to={adminUserPath(report.target_user.id)}
                    title='Open in users'
                    className='group/user -ml-1.5 flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 transition-colors hover:bg-surface-3'
                  >
                    <UserCell user={report.target_user} size='sm'/>
                    <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand-text'/>
                  </Link>
                  <div className='flex shrink-0 flex-col items-center gap-0.5'>
                    <FilterButton label='Show reports about this user' onClick={() => onFilterTarget(report.target_user!.id)}/>
                    <CopyButton value={report.target_user.id}/>
                  </div>
                  {(report.target_user.blocked) ? <Chip tone='danger' title={report.target_user.blocked_reason ?? undefined} className='max-sm:hidden'>Blocked</Chip> : null}
                  <UserModerationButtons user={report.target_user} defaultReason={`Reported in report #${report.id}`} className='ml-auto'/>
                </>
              ) : (report.target_id) ? (
                <>
                  <CopyableValue value={report.target_id} truncate={0} {...targetLink}/>
                  <FilterButton label='Show reports about this target' onClick={() => onFilterTarget(report.target_id!)}/>
                </>
              ) : (
                <span className='text-sm text-subtle'>Not given</span>
              )}
            </div>
          </>
        ) : null}
      </DetailModalStrip>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* side by side once there's room. Stacked on phones, both lists share one label column (subgrid) so their values
            line up */}
        <div className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-2'>
          {/* where the report command was used, or where the reported message is for message reports */}
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              ['Server', (report.guild_id) ? (
                <CopyableValue value={report.guild_id} truncate={0} to={adminServerPath(report.guild_id)} linkTitle='Open this server'/>
              ) : <span className='text-subtle'>None, {(isMessageReport) ? 'it’s in' : 'sent in'} DMs</span>],
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
                      {' '}• last from {(report.last_reply.author === 'reporter') ? 'the reporter' : 'staff'}{' '}
                      <ExactDate value={report.last_reply.created} format={formatDateTime}/>
                    </span>
                  ) : null}
                </span>
              ) : 'None'],
              // message reports of a tag's output
              (isMessageReport && report.tag_id) ? ['Tag', <CopyableValue value={report.tag_id} truncate={0} to={`${Routes.DASHBOARD_ADMIN_TAGS}?q=${report.tag_id}`} linkTitle='Find this tag in tags'/>] : null,
            ]}
          />
        </div>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Report</h3>
            <div className='flex items-center gap-1'>
              {(!translation) ? (
                <button type='button' className='btn btn-ghost btn-sm' disabled={translationMutation.isPending} onClick={translate}>
                  {(translationMutation.isPending) ? <Spinner className='size-3.5'/> : <Languages aria-hidden className='size-4'/>}
                  Translate
                </button>
              ) : null}
              <CopyButton value={report.content} label='Copy'/>
            </div>
          </div>
          {/* monospaced like the flag modal's prompts and the list's rows, reports often quote commands and output */}
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{report.content}</p>
          {(translation && !translation.translation && translation.translation_language === 'en') ? (
            <p className='mt-2 text-xs text-subtle'>Already in English, no translation needed.</p>
          ) : null}
        </div>

        {/* like the content flags' translation, but not stored */}
        {(translation?.translation) ? (
          <div className='mt-4'>
            <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
              <h3 className='section-label'>
                Translation <span className='normal-case tracking-normal text-subtle'>({translation.translation_language ?? '?'} → en)</span>
              </h3>
              <CopyButton value={translation.translation} label='Copy'/>
            </div>
            <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{translation.translation}</p>
          </div>
        ) : null}

        <form
          className='mt-4'
          onSubmit={(event) => {
            event.preventDefault();
            saveNotes();
          }}
        >
          {/* who reviewed it sits with the notes, since that's what they'd explain */}
          <div className='mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
            <label htmlFor={`report-notes-${report.id}`} className='section-label'>Notes</label>
            {(report.reviewed_at || report.reviewed_by) ? (
              <p className='text-xs text-subtle'>
                Reviewed
                {(report.reviewed_at) ? <> <ExactDate value={report.reviewed_at} format={formatDateTime}/></> : null}
                {(report.reviewed_by) ? (
                  <> by <Link to={adminUserPath(report.reviewed_by)} title='Open in users' className='font-mono text-code underline-offset-2 hover:underline'>{report.reviewed_by}</Link></>
                ) : null}
              </p>
            ) : null}
          </div>
          <textarea
            id={`report-notes-${report.id}`}
            className='input min-h-16 resize-y'
            rows={2}
            maxLength={2000}
            value={notes}
            placeholder='Add a note for other reviewers (saved with the next status change too)...'
            onChange={(event) => setNotes(event.target.value)}
          />
          {(notesDirty) ? (
            <div className='mt-2 flex justify-end gap-2'>
              <button type='button' className='btn btn-ghost btn-sm' disabled={mutation.isPending} onClick={() => setNotes(report.notes ?? '')}>Discard</button>
              <button type='submit' className='btn btn-primary btn-sm' disabled={mutation.isPending}>
                {(savingNotes) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : null}
                Save notes
              </button>
            </div>
          ) : null}
        </form>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center'>
            <h3 className='section-label'>Conversation with the reporter</h3>
          </div>
          {(report.user) ? (
            <ReportConversation report={report}/>
          ) : (
            <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm text-muted'>
              Sent anonymously from the website, so there’s nobody to reply to. Changing the status still works.
            </p>
          )}
        </div>
      </div>

      {/* resolve on the left, dismiss on the right. The current status' slot turns into Reopen, so the buttons never move
          around */}
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
              <span className='truncate'>{statusInfo(value).action}</span>
            </button>
          );
        })}
      </AdminModalFooter>
    </div>
  );
}


// a website report sent while logged out, in place of the reporter
function AnonymousReporter() {
  return (
    <span className='inline-flex items-center gap-1.5 text-sm text-muted' title='Sent from the website without logging in'>
      <EyeOff aria-hidden className='size-4 shrink-0 text-subtle'/>
      Anonymous
    </span>
  );
}


// replies here show up on the reporter's dashboard as NotSoAdmin
function ReportConversation({ report }: {report: Report}) {
  const toast = useToast();
  const messages = useAdminReportMessagesQuery(report.id);
  const send = usePostAdminReportMessageMutation(report.id);
  const translation = useTranslateAdminReportMutation();
  return (
    <ReportThread
      viewer='staff'
      reporter={report.user}
      messages={messages.data?.items}
      loading={messages.isPending}
      error={messages.error}
      onRetry={() => messages.refetch()}
      onSend={(content) => send.mutateAsync(content).catch((error) => {
        toast(errorMessage(error), 'error');
        throw error;
      })}
      sending={send.isPending}
      notice={(report.status !== ReportStatuses.OPEN) ? 'Replying doesn’t reopen the report.' : undefined}
      onTranslate={(messageId) => translation.mutateAsync({reportId: report.id, messageId}).catch((error) => {
        toast(errorMessage(error), 'error');
        throw error;
      })}
    />
  );
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <li key={i} className='flex items-center gap-3 px-4 py-3 sm:px-5'>
          <Skeleton className='h-4 w-44'/>
          <Skeleton className='h-5 w-16 bg-surface-2'/>
          <Skeleton className='h-5 w-20 bg-surface-2'/>
          <Skeleton className='size-6 rounded-full bg-surface-2'/>
          <Skeleton className='h-3 flex-1 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
