// The Reports page's Servers tab: the reports the user sent to servers' moderators with the bot's `report` and its
// "Report to Mods" menus, laid out like the Bot tab. They can read and reply to the conversation (the same as the Respond
// button on the bot's DM about it), the moderators are only ever "the moderators" and decide the status themselves.
// What members wrote is only ever rendered as plain text.

import { BellOff, BellRing, ExternalLink, MessageSquareWarning, MessagesSquare, Shield } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/auth';
import { DetailModalHeader, DetailModalStrip } from '@/components/ui/DetailModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { translate, useI18n } from '@/i18n';
import { GuildReportTypes, ReportStatuses, type ReportMessage, type ReportStatus, type SentGuildReport } from '@/lib/api';
import {
  ME_REPORTS_PAGE_SIZE,
  errorMessage,
  useMuteSentGuildReportMutation,
  usePostSentGuildReportMessageMutation,
  useSentGuildReportMessagesQuery,
  useSentGuildReportsQuery,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

import { AdminModalFooter, AdminTagModal, useOpenListItem } from '../admin/AdminTagModal';
import { Chip, CopyableValue, CopyButton, ExactDate, FiltersButton, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { GuildIcon } from '../servers/GuildIcon';
import { EmptyState, ErrorPanel, Skeleton } from '../ui';
import { REPORT_STATUSES, reportJumpUrl, reportStatusInfo, ROW_EDGE_BAR } from './reportLabels';
import { ReportThread } from './ReportThread';


// the api's `MAX_GUILD_REPORT_MESSAGE_LENGTH`, a whole reply fits in the bot's DMs
const MAX_REPLY_LENGTH = 1000;
const TITLE_ID = 'server-report-modal-title';


function parseStatus(value: string | null): ReportStatus | null {
  return (REPORT_STATUSES.some((item) => String(item.value) === value)) ? Number(value) as ReportStatus : null;
}

function typeInfo(report: SentGuildReport): {label: string, tone: 'danger' | 'warning'} {
  return (report.type === GuildReportTypes.MESSAGE) ? {label: translate('sreports.type.message'), tone: 'warning'} : {label: translate('sreports.type.member'), tone: 'danger'};
}

// the last reply is from the moderators, so it's the user's turn
function moderatorsReplied(report: SentGuildReport): boolean {
  return report.last_reply?.author === 'moderator';
}


export function ServerReportsTab() {
  const { t, rich } = useI18n();
  const { searchParams, page, update, setPage } = useSearchParamState();
  const status = parseStatus(searchParams.get('status'));
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const filtered = !!debouncedQuery || status !== null;

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useSentGuildReportsQuery({query: debouncedQuery, status, page});
  const items = data?.items ?? [];
  // opened in place, the bot's DMs about these don't link here
  const { openItem, previousId, nextId, open, close } = useOpenListItem(items, (report) => report.id);
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
          placeholder={t('reports.search_placeholder')}
          aria-label={t('sreports.search_label')}
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={(status !== null) ? 1 : 0} controls='server-report-filters'/>
      </div>

      <div id='server-report-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('reports.status')}</span>
          <select className='input' value={(status === null) ? '' : String(status)} onChange={(event) => update({status: event.target.value})}>
            <option value=''>{t('reports.any')}</option>
            {REPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title={t('sreports.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<MessageSquareWarning className='size-10'/>} title={t((filtered) ? 'reports.empty_search' : 'sreports.empty')}>
          {(filtered) ? t('reports.empty_search_description') : (
            rich('sreports.empty_description', {code: (chunk) => <code className='text-fg'>{chunk}</code>, b: (chunk) => <span className='text-fg'>{chunk}</span>})
          )}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_REPORTS_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((report) => <ReportRow key={report.id} report={report} onOpen={open}/>)}
          </ul>
          {(pagination.count > ME_REPORTS_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <ReportDetails key={openItem.id} report={openItem} navigation={{previousId, nextId, onNavigate: open}}/>
        </AdminTagModal>
      ) : null}
    </>
  );
}


// one line per report like the Bot tab's: the type and id in the top left with the server under them, the status in the
// top right with the date under it, and the reason across the bottom. Plain content only inside, the whole row is a button
function ReportRow({ report, onOpen }: {report: SentGuildReport, onOpen: (id: string) => void}) {
  const { t, plural } = useI18n();
  const status = reportStatusInfo(report.status);
  const type = typeInfo(report);
  const replied = moderatorsReplied(report);
  return (
    <li className='group/row relative'>
      {/* the moderators sent the last reply, so it's their turn to read it */}
      {(replied) ? <span aria-hidden title={t('sreports.replied')} className={cn(ROW_EDGE_BAR, 'bg-brand')}/> : null}
      <button
        type='button'
        className='grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:gap-x-4 sm:px-5'
        onClick={() => onOpen(report.id)}
      >
        <span className='col-start-1 row-start-1 flex min-w-0 items-center gap-3'>
          <Chip tone={type.tone} className='w-18 shrink-0 justify-center'>{type.label}</Chip>
          <span className='min-w-0 truncate font-mono text-sm leading-5 text-white'>#{report.id}</span>
        </span>
        <span className='col-start-1 row-start-2 flex min-w-0 items-center gap-2'>
          <ServerName report={report}/>
          {(report.reporter_muted) ? <Chip className='shrink-0 gap-1' title={t('sreports.dms_off_title')}><BellOff aria-hidden className='size-3'/>{t('sreports.dms_off')}</Chip> : null}
        </span>
        <span className='col-span-2 row-start-3 flex min-w-0 items-center gap-2 text-sm text-muted'>
          {(report.replies) ? (
            <span
              className={cn('inline-flex shrink-0 items-center gap-1 text-xs', (replied) ? 'font-medium text-brand' : 'text-subtle')}
              title={(replied) ? t('sreports.replied_last') : plural('reports.replies', report.replies)}
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


// the server's icon and name, its id when NotSoBot doesn't know it anymore
function ServerName({ report }: {report: SentGuildReport}) {
  const { t } = useI18n();
  if (!report.guild) {
    return <span className='font-mono text-xs text-subtle'>{t('sreports.server', {id: report.guild_id})}</span>;
  }
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <GuildIcon guild={report.guild} size={24} className='size-6 rounded-md text-[10px]'/>
      <span className='truncate text-sm text-fg'>{report.guild.name}</span>
    </span>
  );
}


function ReportDetails({ report, navigation }: {
  report: SentGuildReport,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
}) {
  const { t } = useI18n();
  const status = reportStatusInfo(report.status);
  const type = typeInfo(report);
  const isMessage = report.type === GuildReportTypes.MESSAGE;
  const jumpUrl = (isMessage) ? reportJumpUrl(report) : null;

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip tone={type.tone} className='w-18 shrink-0 justify-center'>{type.label}</Chip>}
        title={<><span className='sr-only'>{t('reports.report_sr')}</span>#{report.id}</>}
        mono
        meta={<ExactDate value={report.created} format={formatDateTime}/>}
        states={(moderatorsReplied(report)) ? <Chip tone='brand'>{t('sreports.replied')}</Chip> : null}
        status={<Chip tone={status.tone} className='w-20 justify-center'>{status.label}</Chip>}
      />

      <DetailModalStrip className='grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1'>
        <span className='text-xs text-subtle'>{t('reports.server')}</span>
        <div className='flex min-h-8 min-w-0 items-center'><ServerName report={report}/></div>
        <span className='text-xs text-subtle'>{t((isMessage) ? 'sreports.message_by' : 'sreports.reported_member')}</span>
        <div className='flex min-h-8 min-w-0 items-center'><CopyableValue value={report.target_id} truncate={0}/></div>
        {(report.status !== ReportStatuses.OPEN && report.handled_at) ? (
          <>
            <span className='text-xs text-subtle'>{status.label}</span>
            <div className='flex min-h-8 min-w-0 items-center text-sm text-muted'>
              <ExactDate value={report.handled_at} format={formatDateTime}/>
            </div>
          </>
        ) : null}
      </DetailModalStrip>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
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
            {(report.message_content) ? (
              <>
                <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-muted' {...selectAllScope}>{report.message_content}</p>
                {(report.message_content_expires_at) ? <p className='mt-1 text-xs text-subtle'>{t('sreports.deleted_on', {date: formatDate(report.message_content_expires_at)})}</p> : null}
              </>
            ) : (
              <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm text-subtle italic'>
                {t((report.message_content_deleted) ? 'sreports.copy_deleted' : 'sreports.no_text')}
              </p>
            )}
          </section>
        ) : null}

        <section>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>{t('sreports.your_report')}</h3>
            <CopyButton value={report.reason} label={t('common.copy')}/>
          </div>
          <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{report.reason}</p>
        </section>

        <section className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center'>
            <h3 className='section-label'>{t('sreports.conversation')}</h3>
          </div>
          <Conversation report={report}/>
        </section>
      </div>

      <AdminModalFooter {...navigation}>
        <MuteButton report={report}/>
      </AdminModalFooter>
    </div>
  );
}


// the same as the Stop DMs button on the bot's DMs about it, and the only way back on. The report stays for the moderators
function MuteButton({ report }: {report: SentGuildReport}) {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useMuteSentGuildReportMutation(report.id);
  const muted = report.reporter_muted;
  const Icon = (muted) ? BellRing : BellOff;
  return (
    <button
      type='button'
      className='btn btn-secondary min-w-0 flex-1 px-2 sm:flex-none sm:px-3'
      disabled={mutation.isPending}
      title={t((muted) ? 'sreports.dms_on_title' : 'sreports.dms_off_hint')}
      onClick={() => mutation.mutate(!muted, {
        onSuccess: () => toast(translate((muted) ? 'sreports.dms_on_toast' : 'sreports.dms_off_toast')),
        onError: (error) => toast(errorMessage(error), 'error'),
      })}
    >
      {(mutation.isPending) ? <Spinner className='size-4'/> : <Icon aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
      <span className='truncate'>{t((muted) ? 'sreports.dms_on' : 'sreports.stop_dms')}</span>
    </button>
  );
}


// replying works whatever the status is and doesn't reopen it, the moderators decide that
function Conversation({ report }: {report: SentGuildReport}) {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const query = useSentGuildReportMessagesQuery(report.id);
  const send = usePostSentGuildReportMessageMutation(report.id);
  const messages: Array<ReportMessage> | undefined = query.data?.items.map((message) => ({
    ...message,
    author: (message.author === 'moderator') ? 'staff' : 'reporter',
  }));
  return (
    <ReportThread
      viewer='reporter'
      reporter={user}
      messages={messages}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
      onSend={(content) => send.mutateAsync(content).catch((error) => {
        toast(errorMessage(error, translate('sreports.send_error')), 'error');
        throw error;
      })}
      sending={send.isPending}
      staff={{name: t('sreports.moderators'), icon: <Shield className='size-4 text-brand'/>}}
      emptyText={t('sreports.empty_thread')}
      placeholder={t('sreports.placeholder')}
      maxLength={MAX_REPLY_LENGTH}
      notice={(report.status !== ReportStatuses.OPEN) ? (
        t('sreports.closed_notice', {status: status(report)})
      ) : undefined}
    />
  );
}

function status(report: SentGuildReport): string {
  return reportStatusInfo(report.status).label.toLowerCase();
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
