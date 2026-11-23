// Content flags are records of media the bot's safety scan flagged. NEVER render `source_url` (or any other url
// here) as <img>/<video>/<iframe>/background-image or any other embed, and never as a link. At most it's plain,
// selectable text. The only media this page shows is the blob `GET /admin/content-flags/<id>/media` returns (the
// api fetches it, so the reviewer's browser never touches the source), blurred until revealed and never for
// child safety flags.

import { AlertTriangle, ArrowUpRight, Ban, Check, CircleHelp, Clock, CloudOff, Eye, Flag, ImageOff, Info, Languages, type LucideIcon, MessageSquareWarning, X } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { CopyButton } from '@/components/ui/CopyButton';
import { DetailModalHeader, DetailModalStrip } from '@/components/ui/DetailModal';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';

import { Spinner } from '@/components/ui/Spinner';
import { useToast, type ToastAction } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  api,
  CONTENT_FLAG_TEXT_MIMETYPE,
  ContentFlagCategories,
  ContentFlagStatuses,
  ContentFlagTypes,
  type ContentFlag,
  type ContentFlagAutoReview,
  ContentFlagAutoReviewFilters,
  type ContentFlagMatchCounts,
  type ContentFlagMatches,
  type ContentFlagPatch,
  type ContentFlagQueryType,
  type ContentFlagStatus,
  type ContentFlagType,
} from '@/lib/api';
import { useSearchParamState, useStepBackFromEmptyPage } from '@/hooks/useSearchParamState';
import { ADMIN_CONTENT_FLAGS_PAGE_SIZE, errorMessage, useAcceptContentFlagSuggestionsMutation, useAdminContentFlagQuery, useAdminContentFlagsQuery, useFetchContentFlagMatches, useFlagAdminContentFlagPromptMutation, usePatchAdminContentFlagMutation, usePatchAdminUserMutation, useTranslateAdminContentFlagMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatMemory, formatUptime, NO_AUTOFILL } from '@/lib/utils';

import { DashboardHeader, EmptyState, ErrorPanel, Skeleton, Toggle } from '../ui';
import { AdminModalFooter, AdminTagModal, LinkedItemModal, REVIEW_KEYS, ReviewShortcutsToggle, useHoldModalNavigation, useOpenListItem, useReviewShortcuts } from './AdminTagModal';
import { adminServerPath, adminUserPath, Chip, CopyableValue, DETAIL_LIST_STACKED, DetailList, ExactDate, FiltersButton, Pagination, selectAllScope, UserCell } from './adminUi';
import { BLOCK_REASON_MAX, BlockDurationSelect, blockedUntilFromSeconds, canBlockUser } from './BlockUserDialog';
import { UserModerationButtons } from './UserModerationButtons';


type Tone = 'warning' | 'danger' | 'neutral' | 'brand' | 'fuchsia';

// `short` is the action's label in the phone-width action bar, where the buttons share one row
// `description` is what the status means, shown on hover over its chip
const REPORTED_DESCRIPTION = 'Reported: staff reported this content outside NotSoBot (like Discord Trust & Safety, or NCMEC for child safety). ' +
  'It’s only a marker, nothing is sent from here. It counts as confirmed, so matching uploads are auto-confirmed too.';

const UNSURE_DESCRIPTION = 'Unsure: a reviewer couldn’t decide and left it for someone else. It counts as neither confirmed nor dismissed, ' +
  'so matching uploads aren’t auto-confirmed or let through.';

const STATUSES: Array<{value: ContentFlagStatus, label: string, action: string, short: string, tone: Tone, icon: LucideIcon, description: string}> = [
  {value: ContentFlagStatuses.PENDING, label: 'Pending', action: 'Mark pending', short: 'Pending', tone: 'warning', icon: Clock, description: 'Pending: waiting for a staff review.'},
  {value: ContentFlagStatuses.UNSURE, label: 'Unsure', action: 'Mark unsure', short: 'Unsure', tone: 'fuchsia', icon: CircleHelp, description: UNSURE_DESCRIPTION},
  {value: ContentFlagStatuses.CONFIRMED, label: 'Confirmed', action: 'Confirm', short: 'Confirm', tone: 'danger', icon: Check, description: 'Confirmed: staff agreed the content breaks the rules. Matching uploads are auto-confirmed.'},
  {value: ContentFlagStatuses.DISMISSED, label: 'Dismissed', action: 'Dismiss', short: 'Dismiss', tone: 'neutral', icon: X, description: 'Dismissed: staff decided it was a false positive.'},
  {value: ContentFlagStatuses.REPORTED, label: 'Reported', action: 'Mark reported', short: 'Report', tone: 'brand', icon: Flag, description: REPORTED_DESCRIPTION},
];

// setting one of these first offers to set it on the other pending flags of the same media
const MATCHABLE_STATUSES: ReadonlyArray<number> = [ContentFlagStatuses.CONFIRMED, ContentFlagStatuses.DISMISSED];

// the verdicts with a key while shortcuts are on (unsure and reported aren't verdicts, mark pending undoes one)
const STATUS_KEYS: Record<number, string> = {
  [ContentFlagStatuses.CONFIRMED]: REVIEW_KEYS.confirm,
  [ContentFlagStatuses.DISMISSED]: REVIEW_KEYS.dismiss,
};

const TYPE_LABELS: Record<ContentFlagType, string> = {media: 'Media', text: 'Text'};
// the "Auto review" filter: `hash` is a flag auto-confirmed from an already confirmed one with the same media (the
// api's `auto_confirmed`), the rest are the model review's `auto_review`
const AUTO_REVIEW_OPTIONS = [
  {value: 'hash', label: 'Hash match (auto-confirmed)'},
  {value: 'applied', label: 'Haiku: applied'},
  {value: 'suggested', label: 'Haiku: suggestion only'},
  {value: 'failed', label: 'Haiku: couldn’t review'},
  {value: 'none', label: 'Haiku: not reviewed'},
] as const;

const AUTO_REVIEW_DECISION_TONES: Record<string, 'danger' | 'success' | 'warning'> = {confirm: 'danger', dismiss: 'success', escalate: 'warning'};

// the row and header chip for a flag the model review looked at
function autoReviewChip(review: ContentFlagAutoReview | null | undefined, key?: string): ReactNode {
  if (!review) {
    return null;
  }
  if (review.error) {
    return <Chip key={key} title={`Haiku couldn’t review this: ${review.error}`}>haiku: failed</Chip>;
  }
  const suffix = (review.overturned) ? ' (overturned)' : (review.applied) ? '' : ' (suggested)';
  const title = (review.propagated_from) ? `${review.reason ?? ''} (copied from #${review.propagated_from}, same content)` : review.reason;
  return <Chip key={key} tone={AUTO_REVIEW_DECISION_TONES[review.decision ?? ''] ?? 'neutral'} title={title}>{`haiku: ${review.decision}${suffix}`}</Chip>;
}

// a pending flag with a confirm/dismiss suggestion a person can accept as it is
function hasAcceptableSuggestion(flag: ContentFlag): boolean {
  const review = flag.auto_review;
  return flag.status === ContentFlagStatuses.PENDING && !!review && !review.error && !review.applied &&
    (review.decision === 'confirm' || review.decision === 'dismiss');
}

function countLabel(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${(count === 1) ? '' : 's'}`;
}

// above the list on the "Haiku: suggestion only" filter: accepts every confirm/dismiss suggestion on the page at once
function AcceptSuggestionsBar({ flags }: {flags: Array<ContentFlag>}) {
  const titleId = useId();
  const toast = useToast();
  const accept = useAcceptContentFlagSuggestionsMutation();
  const [ confirming, setConfirming ] = useState(false);
  const acceptable = flags.filter(hasAcceptableSuggestion);
  if (!acceptable.length) {
    return null;
  }
  const dismissals = acceptable.filter((flag) => flag.auto_review?.decision === 'dismiss').length;
  const summary = [
    (dismissals) ? countLabel(dismissals, 'dismissal') : null,
    (acceptable.length - dismissals) ? countLabel(acceptable.length - dismissals, 'confirmation') : null,
  ].filter(Boolean).join(' • ');

  return (
    <>
      <div className='card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm'>
        <span className='text-muted'>Haiku suggests {summary} on this page</span>
        <button type='button' className='btn btn-secondary' disabled={accept.isPending} onClick={() => setConfirming(true)}>
          {(accept.isPending) ? <Spinner/> : null}
          Accept suggestions
        </button>
      </div>
      {(confirming) ? (
        <Modal labelledBy={titleId} onClose={() => !accept.isPending && setConfirming(false)} className='max-w-lg'>
          <div className='p-5 sm:p-6' data-state={(accept.isPending) ? 'accepting' : 'confirming'}>
            <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Accept Haiku’s suggestions?</h2>
            <p className='mt-2 text-sm text-muted'>
              {summary} on this page get the status Haiku suggested, reviewed by you. Pending flags with the same content get it too.
              Escalations and failed reviews are left alone.
            </p>
            <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <button type='button' className='btn btn-secondary' disabled={accept.isPending} onClick={() => setConfirming(false)}>Cancel</button>
              <button
                type='button'
                className='btn btn-primary'
                disabled={accept.isPending}
                // `mutateAsync`, not `mutate`'s callbacks: the accepted flags leave this filter, and when that empties the
                // page this bar unmounts (the list turns into the empty state) before they'd run, losing the toast
                onClick={() => {
                  accept.mutateAsync({flagIds: acceptable.map((flag) => flag.id)}).then(
                    ({ count }) => toast(`Accepted ${countLabel(count, 'suggestion')}`),
                    (error) => toast(errorMessage(error), 'error'),
                  ).finally(() => setConfirming(false));
                }}
              >
                {(accept.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
                Accept {countLabel(acceptable.length, 'flag')}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

// a media flag's query section heading, older flags without a `query_type` keep 'Query'
const QUERY_TYPE_LABELS: Record<ContentFlagQueryType, string> = {prompt: 'Prompt', mediascript: 'MediaScript'};

// shown on hover wherever the pdq is
function pdqHint(distance?: number): string {
  return 'PDQ is a visual hash: it matches visually similar media (resized, re-encoded, lightly edited), not just the exact same file' +
    `${(distance) ? `, up to ${distance} of its 256 bits can differ` : ''}. For videos and GIFs it's only one frame: the first flagged frame, or the first frame when no single frame was flagged.`;
}

// shown on hover beside the prompt hash
const PROMPT_HASH_HINT = 'A hash of the safety scanner\'s prompts and settings this was scanned with. Dismissing the flag lets the same ' +
  'content (same SHA-256) through future scans only while they still hash the same, so changing the prompts scans it again. ' +
  'Empty for flags from before it was recorded, dismissing those doesn\'t let anything through.';

const TITLE_ID = 'admin-content-flag-modal-title';

// What the safety scan did with it (`action`, set in `responses/tools.py` and `content_flag.py`). Coloured by whether the
// content got out: the ones that stopped it are calm teal/blue/grey, `logged` (it went through, only logged for review)
// is amber. Red and yellow stay for the verdict and category chips.
const FLAG_ACTIONS: Record<string, {label: string, icon: LucideIcon, className: string, description: string}> = {
  blocked: {
    label: 'blocked',
    icon: Ban,
    className: 'bg-[#1abc9c]/15 text-[#5fd4bd]',
    description: 'Blocked: the command errored instead of sending it, nobody saw it.',
  },
  replaced: {
    label: 'replaced',
    icon: ImageOff,
    className: 'bg-[#3498db]/15 text-[#7cc0f0]',
    description: 'Replaced: the output was swapped for a black image, the original wasn’t sent.',
  },
  not_hosted: {
    label: 'not hosted',
    icon: CloudOff,
    className: 'bg-line-strong text-muted',
    description: 'Not hosted: it was too big for Discord and NotSoBot wouldn’t host it, so it wasn’t sent.',
  },
  logged: {
    label: 'logged',
    icon: Eye,
    className: 'bg-warning/20 text-warning',
    description: 'Logged: it went through to the user, and was only logged for a review.',
  },
};

function ActionChip({ action }: {action: string}) {
  const info = FLAG_ACTIONS[action];
  if (!info) {
    return <Chip>{action}</Chip>;
  }
  const Icon = info.icon;
  return (
    <span title={info.description} className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', info.className)}>
      <Icon aria-hidden className='size-3'/>
      {info.label}
    </span>
  );
}

// the modal's status buttons: confirm is the strong red, mark pending the pending chip's light yellow, and unsure and
// reporting outlines in their chips' colours so they don't read as verdicts
const STATUS_BUTTON_CLASSES: Record<number, string> = {
  [ContentFlagStatuses.PENDING]: 'border border-warning/40 bg-warning/15 text-warning hover:bg-warning/25',
  [ContentFlagStatuses.CONFIRMED]: 'btn-danger',
  [ContentFlagStatuses.DISMISSED]: 'btn-secondary',
  [ContentFlagStatuses.REPORTED]: 'border border-brand/50 bg-transparent text-[#aab2ff] hover:bg-brand/15',
  [ContentFlagStatuses.UNSURE]: 'border border-[#eb459e]/50 bg-transparent text-[#f47fbf] hover:bg-[#eb459e]/15',
};

// the status bar down the left edge of each row, by the status' tone (pending orange, confirmed red, dismissed grey,
// unsure pink)
const STATUS_PILL_FILLS: Record<Tone, string> = {
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-subtle',
  brand: 'bg-brand',
  fuchsia: 'bg-[#eb459e]',
};

function statusInfo(status: number) {
  return STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, action: '', short: '', tone: 'neutral' as Tone, icon: Flag, description: ''};
}


// no `status` param means the review queue (pending), `all` means any status
const DEFAULT_STATUS = ContentFlagStatuses.PENDING;
const ANY_STATUS = 'all';

function parseStatus(value: string | null): number | null {
  if (value === null || value === '') {
    return DEFAULT_STATUS;
  }
  if (value === ANY_STATUS || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function parseBool(value: string | null): boolean | null {
  return (value === '1' || value === 'true') ? true : (value === '0' || value === 'false') ? false : null;
}

// these never get a "Show media" button, and the api refuses them too (`admin_get_content_flag_media`)
const CHILD_SAFETY_CATEGORIES: ReadonlyArray<string> = ['unsafe_child_safety', 'review_child_safety'];
const CHILD_SAFETY_LABEL = 'child_safety';

function isChildSafetyFlag(flag: ContentFlag): boolean {
  return CHILD_SAFETY_CATEGORIES.includes(flag.category ?? '') ||
    (flag.flagged ?? []).includes(CHILD_SAFETY_LABEL) ||
    (flag.flagged_for_review ?? []).includes(CHILD_SAFETY_LABEL);
}

// the default reason when warning or blocking someone from one of their flags
function flagBlockReason(flag: ContentFlag): string {
  return `Content flag #${flag.id}${(flag.category) ? ` (${flag.category})` : ''}`;
}

// The undo button on the toast after a flag's status changes, putting it back to `previous`. Uses `mutateAsync` since
// the card has usually left the list (and unmounted) by the time it's clicked, and `mutate`'s callbacks don't run then.
// None for a status this page doesn't know, since it couldn't be set back.
function useUndoStatusAction(): (flagId: string, previous: number) => ToastAction | undefined {
  const toast = useToast();
  const mutation = usePatchAdminContentFlagMutation();
  return (flagId, previous) => {
    const status = STATUSES.find((item) => item.value === previous);
    if (!status) {
      return undefined;
    }
    return {
      label: 'Undo',
      onClick: () => {
        mutation.mutateAsync({flagId, patch: {status: status.value}}).then(
          () => toast(`Flag ${flagId}: back to ${status.label.toLowerCase()}`),
          (error) => toast(errorMessage(error), 'error'),
        );
      },
    };
  };
}


export function AdminContentFlagsPage() {
  const { searchParams, page, update, setPage } = useSearchParamState();
  // kept here so the dialog survives the flag leaving the list (e.g. filtered by a status that excludes "reported").
  // `notes` is the modal's unsaved note, saved with the status (left out when there's none)
  const [ reportingFlag, setReportingFlag ] = useState<{flag: ContentFlag, notes?: string | null} | null>(null);
  const userId = (searchParams.get('user_id') || '').trim();
  const guildId = (searchParams.get('guild_id') || '').trim();
  const channelId = (searchParams.get('channel_id') || '').trim();
  const tagId = (searchParams.get('tag_id') || '').trim();
  const commandId = (searchParams.get('command_id') || '').trim();
  const status = parseStatus(searchParams.get('status'));
  const category = searchParams.get('category') || '';
  const needsHumanReview = parseBool(searchParams.get('needs_human_review'));
  // one select for both kinds of automatic review, `hash` is the api's `auto_confirmed`, the rest its `auto_review`
  const auto = AUTO_REVIEW_OPTIONS.find((option) => option.value === searchParams.get('auto'))?.value ?? null;
  const autoConfirmed = (auto === 'hash') ? true : null;
  const autoReview = ContentFlagAutoReviewFilters.find((value) => value === auto) ?? null;
  const promptHash = (searchParams.get('prompt_hash') || '').trim();
  const type = ContentFlagTypes.find((item) => item === searchParams.get('type')) ?? null;
  // flags of blocked users are hidden unless `blocked=1`
  const includeBlocked = searchParams.get('blocked') === '1';
  const search = searchParams.get('q') || '';
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  // collapsed on every visit, the count on its button says when any of them are set
  const [ filtersOpen, setFiltersOpen ] = useState(false);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useAdminContentFlagsQuery({
    userId,
    guildId,
    channelId,
    tagId,
    commandId,
    status,
    category,
    needsHumanReview,
    autoConfirmed,
    autoReview,
    promptHash,
    type,
    includeBlocked,
    search: debouncedSearch,
    page,
  });
  const items = data?.items ?? [];
  const { openId, openItem: listedItem, previousId, nextId, open, close } = useOpenListItem(items, (flag) => flag.id, Routes.DASHBOARD_ADMIN_FLAGS);
  // a link to a flag that isn't on this page, or one that left it after its status changed. `listedItem` is then the
  // last copy seen in the list and goes stale on the next change, the mutation keeps this one up to date instead
  const inList = items.some((flag) => flag.id === openId);
  const linked = useAdminContentFlagQuery(openId, !inList);
  const openItem = ((inList) ? listedItem : linked.data ?? listedItem) ?? null;
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ADMIN_CONTENT_FLAGS_PAGE_SIZE});
  // the ones in the collapsible panel set to something other than their default, the search box stays out
  const activeFilters = [
    userId, guildId, channelId, tagId, commandId, status !== DEFAULT_STATUS, category, needsHumanReview !== null, auto,
    promptHash, type, includeBlocked,
  ].filter(Boolean).length;
  const filtered = !!(userId || guildId || channelId || tagId || commandId || status !== null || category || needsHumanReview !== null || auto || promptHash || type || debouncedSearch);
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ADMIN_CONTENT_FLAGS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  return (
    <>
      <DashboardHeader
        title='Content Flags'
        description='Media the safety scan flagged. Shown as metadata, media is only loaded when you ask for it.'
      />

      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={search}
          onValueChange={(value) => update({q: value})}
          placeholder='Search by case #, user, server, channel, message or tag id, command, text, url or hash...'
          aria-label='Search content flags'
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='admin-content-flag-filters'/>
      </div>

      <div id='admin-content-flag-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12'>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Status</span>
          <select
            className='input'
            value={(status === null) ? ANY_STATUS : String(status)}
            onChange={(event) => update({status: (event.target.value === String(DEFAULT_STATUS)) ? null : event.target.value})}
          >
            <option value={ANY_STATUS}>Any</option>
            {STATUSES.filter((item) => item.value !== ContentFlagStatuses.REPORTED).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            <optgroup label='Reported outside NotSoBot'>
              <option value={ContentFlagStatuses.REPORTED}>Reported</option>
            </optgroup>
          </select>
        </label>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Type</span>
          <select className='input' value={type ?? ''} onChange={(event) => update({type: event.target.value})}>
            <option value=''>Any</option>
            {ContentFlagTypes.map((item) => <option key={item} value={item}>{TYPE_LABELS[item]}</option>)}
          </select>
        </label>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Category</span>
          <select className='input' value={category} onChange={(event) => update({category: event.target.value})}>
            <option value=''>Any</option>
            {(category && !(ContentFlagCategories as ReadonlyArray<string>).includes(category)) ? <option value={category}>{category}</option> : null}
            {ContentFlagCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className='text-sm lg:col-span-3'>
          <span className='mb-1 block text-subtle'>Needs review</span>
          <select
            className='input'
            value={(needsHumanReview === null) ? '' : (needsHumanReview) ? '1' : '0'}
            onChange={(event) => update({needs_human_review: event.target.value})}
          >
            <option value=''>Any</option>
            <option value='1'>Yes</option>
            <option value='0'>No</option>
          </select>
        </label>
        <IdFilter label='User id' placeholder='Any user' value={userId} onChange={(value) => update({user_id: value})}/>
        <IdFilter label='Guild id' placeholder='Any guild' value={guildId} onChange={(value) => update({guild_id: value})}/>
        <IdFilter label='Channel id' placeholder='Any channel' value={channelId} onChange={(value) => update({channel_id: value})}/>
        <IdFilter label='Tag id' placeholder='Any tag' value={tagId} onChange={(value) => update({tag_id: value})}/>
        {/* wider so the example in the placeholder isn't cut off */}
        <IdFilter
          className='sm:col-span-2 lg:col-span-8'
          label='Command id'
          placeholder='Any command, e.g. tag or tag.show'
          value={commandId}
          pattern={COMMAND_ID_PATTERN}
          onChange={(value) => update({command_id: value})}
        />
        <label className='text-sm lg:col-span-4'>
          <span className='mb-1 block text-subtle'>Auto review</span>
          <select className='input' value={auto ?? ''} onChange={(event) => update({auto: event.target.value})}>
            <option value=''>Any</option>
            {AUTO_REVIEW_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <IdFilter
          label='Prompt hash'
          placeholder='Any, or none'
          value={promptHash}
          pattern={PROMPT_HASH_PATTERN}
          onChange={(value) => update({prompt_hash: value})}
        />
        <div className='flex items-end lg:col-span-4'>
          <div className='w-full rounded-md border border-line bg-surface px-3 py-2'>
            <Toggle label='Show blocked users' checked={includeBlocked} onChange={(value) => update({blocked: (value) ? '1' : null})}/>
          </div>
        </div>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title='Couldn’t load content flags' message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Flag className='size-10'/>} title='No content flags'>
          {(filtered) ? 'Nothing matches these filters.' : null}
          {/* the status filter (pending unless changed) applies to a search too, which hid already reviewed flags */}
          {(debouncedSearch && status !== null) ? (
            <>
              {' '}Only {statusInfo(status).label.toLowerCase()} flags were searched.{' '}
              <button type='button' className='cursor-pointer text-brand-text hover:underline' onClick={() => update({status: ANY_STATUS})}>Search all statuses</button>
            </>
          ) : null}
          {(!includeBlocked) ? (
            <>
              {(filtered) ? ' ' : null}Flags from blocked users are hidden.{' '}
              <button type='button' className='cursor-pointer text-brand-text hover:underline' onClick={() => update({blocked: '1'})}>Show them</button>
            </>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {(auto === 'suggested') ? <AcceptSuggestionsBar flags={items}/> : null}
          <Pagination {...pagination} className='mt-0 mb-4'/>
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((flag) => <ContentFlagRow key={flag.id} flag={flag} onOpen={open}/>)}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(openItem) ? (
        <AdminTagModal labelledBy={TITLE_ID} previousId={previousId} nextId={nextId} onNavigate={open} onClose={close} footer={false} stickyClose>
          <ContentFlagDetails
            key={openItem.id}
            flag={openItem}
            onReport={(notes) => setReportingFlag({flag: openItem, notes})}
            navigation={{previousId, nextId, onNavigate: open}}
          />
        </AdminTagModal>
      ) : (openId) ? (
        <LinkedItemModal noun='content flag' notFoundMessage='There’s no content flag with this id.' query={linked} onClose={close}/>
      ) : null}
      {(reportingFlag) ? <ReportFlagDialog flag={reportingFlag.flag} notes={reportingFlag.notes} onClose={() => setReportingFlag(null)}/> : null}
    </>
  );
}


const SNOWFLAKE_PATTERN = /^\d+$/;
// `tag.show`, `media.aiv.tools.extract.media`; spaces are allowed since the api treats them as dots
const COMMAND_ID_PATTERN = /^[\w.\- ]+$/;
// a full prompt hash or a prefix of one (the api wants 6+ characters), `none` for flags without one
const PROMPT_HASH_PATTERN = /^(none|[0-9a-fA-F]{6,64})$/;

// edits locally and lands in the URL once typing stops, only for empty values or ones matching `pattern`
function IdFilter({ className = 'lg:col-span-4', label, placeholder, value, pattern = SNOWFLAKE_PATTERN, onChange }: {
  className?: string,
  label: string,
  placeholder: string,
  value: string,
  pattern?: RegExp,
  onChange: (value: string | null) => void,
}) {
  const numeric = pattern === SNOWFLAKE_PATTERN;
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && (!debounced || pattern.test(debounced))) {
      onChange(debounced);
    }
    // only when the typed value settles
  }, [debounced]);

  return (
    <label className={cn('text-sm', className)}>
      <span className='mb-1 block text-subtle'>{label}</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          inputMode={(numeric) ? 'numeric' : 'text'}
          spellCheck={false}
          autoCapitalize='off'
          autoComplete='off'
          {...NO_AUTOFILL}
          placeholder={placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        {(input) ? (
          <button
            type='button'
            aria-label={`Clear ${label.toLowerCase()} filter`}
            className='absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-subtle hover:text-fg'
            onClick={() => {
              setInput('');
              onChange(null);
            }}
          >
            <X className='size-4'/>
          </button>
        ) : null}
      </span>
    </label>
  );
}


// one line per flag, just enough to triage from; the rest is in `ContentFlagDetails` a click away.
// the model review's verdict in the flag modal: what it decided and why, or why it couldn't review it
function AutoReviewSection({ review }: {review: ContentFlagAutoReview}) {
  return (
    <div className='mt-4'>
      <div className='mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
        <h3 className='section-label'>Haiku review</h3>
        <p className='text-xs text-subtle'>
          <ExactDate value={review.reviewed_at} format={formatDateTime}/>
          {(review.model) ? <> • <span className='font-mono'>{review.model}</span></> : null}
        </p>
      </div>
      <div className='rounded-md border border-line bg-deep px-3 py-2 text-sm'>
        {(review.error) ? (
          <p className='text-subtle'>Couldn’t review this: <span className='text-fg'>{review.error}</span></p>
        ) : (
          <>
            <div className='flex flex-wrap items-center gap-1.5'>
              {autoReviewChip(review)}
              {(review.confidence) ? <span className='text-xs text-subtle'>{review.confidence} confidence</span> : null}
              {review.categories?.map((category) => <Chip key={category}>{category}</Chip>)}
            </div>
            {(review.reason) ? <p className='mt-1.5 text-fg'>{review.reason}</p> : null}
            {(!review.applied) ? (
              <p className='mt-1.5 text-xs text-subtle'>
                Only a suggestion, the status was left for a person
                {(review.sha256_match === false) ? ': it saw the command’s input, not the exact file that was flagged' : ''}.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// Plain content only inside (no buttons, links or focusable dates), since the whole row is a link.
// From sm up it's three columns: what it is and who posted it, why it was flagged stacked in the middle, the status and
// date on the right. On phones the middle doesn't fit, so the reasons go centred under the rest: the type and id in the
// top left with the status across from them, and the poster with the date across from them, like the reports list.
function ContentFlagRow({ flag, onOpen }: {flag: ContentFlag, onOpen: (id: string) => void}) {
  const status = statusInfo(flag.status);
  const isText = flag.mimetype === CONTENT_FLAG_TEXT_MIMETYPE;
  const { user } = flag;
  const reasons = [
    // whether it reached anyone and which command made it, first: that's what decides how urgent the row is
    (flag.action || flag.command_id) ? (
      <span key='action' className='flex max-w-full min-w-0 items-center gap-1 text-xs text-subtle'>
        {(flag.action) ? <ActionChip action={flag.action}/> : null}
        {(flag.action && flag.command_id) ? <span aria-hidden>•</span> : null}
        {(flag.command_id) ? <span className='max-w-56 min-w-0 truncate font-mono' title={flag.command_id}>{flag.command_id}</span> : null}
      </span>
    ) : null,
    (flag.category) ? <Chip key='category' tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip> : null,
    (flag.needs_human_review) ? <Chip key='review' tone='warning'>needs review</Chip> : null,
    (flag.auto_confirmed_from) ? <Chip key='auto'>auto-confirmed</Chip> : null,
    autoReviewChip(flag.auto_review, 'auto-review'),
    (user?.blocked) ? <Chip key='blocked' tone='danger'>user blocked</Chip> : null,
  ].filter(Boolean);
  return (
    <li className='group/row relative'>
      {/* the status at a glance, the full height of the left edge. The first and last rows round it into the card's
          corners (its 8px radius less the 1px border) */}
      <span
        aria-hidden
        title={status.label}
        className={cn('pointer-events-none absolute inset-y-0 left-0 w-1 group-first/row:rounded-tl-[7px] group-last/row:rounded-bl-[7px]', STATUS_PILL_FILLS[status.tone])}
      />
      <Link
        to={`${Routes.DASHBOARD_ADMIN_FLAGS}/${flag.id}`}
        className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-4 sm:px-5'
        onClick={(event) => {
          // a plain click opens it over the list (keeping the filters), new tabs and copied links still get the url
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
            event.preventDefault();
            onOpen(flag.id);
          }
        }}
      >
        {/* what it is and its id (fixed widths, so rows line up) */}
        <span className='col-start-1 row-start-1 flex min-w-0 items-center gap-3'>
          <Chip className='w-12 shrink-0 justify-center'>{(isText) ? 'text' : 'media'}</Chip>
          <span className='min-w-0 truncate font-mono text-sm leading-5 text-white'>#{flag.id}</span>
        </span>
        {/* who posted it, under the type */}
        <span className='col-start-1 row-start-2 min-w-0'>
          <UserCell user={user} fallbackId={flag.user_id} size='sm'/>
        </span>
        {/* why it was flagged: a centred wrapping line across the bottom on phones, stacked in the middle column from sm up */}
        {(reasons.length) ? (
          <span className='col-span-2 row-start-3 flex flex-wrap items-center justify-center gap-1 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:flex-col sm:flex-nowrap'>
            {reasons}
          </span>
        ) : null}
        {/* the review status, and when it was flagged under it. On phones this wrapper drops out of the layout so the
            status sits across from the id and the date across from the poster */}
        <span className='contents sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:flex sm:min-w-0 sm:flex-col sm:items-end sm:gap-2'>
          <Chip tone={status.tone} title={status.description} className='col-start-2 row-start-1 w-20 justify-center justify-self-end'>{status.label}</Chip>
          <span className='col-start-2 row-start-2 justify-self-end text-xs whitespace-nowrap text-subtle'>{formatDateTime(flag.created)}</span>
        </span>
      </Link>
    </li>
  );
}


// `navigation` is the modal's Previous / Next, the status actions go between them. `onReport` opens the page's report
// dialog, with the unsaved note to save along (undefined when there's none)
function ContentFlagDetails({ flag, onReport, navigation }: {
  flag: ContentFlag,
  onReport: (notes?: string | null) => void,
  navigation: {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void},
}) {
  const toast = useToast();
  const { user } = flag;
  const mutation = usePatchAdminContentFlagMutation();
  const translation = useTranslateAdminContentFlagMutation();
  const [ notes, setNotes ] = useState(flag.notes ?? '');
  useEffect(() => setNotes(flag.notes ?? ''), [flag.notes]);
  // trimmed like saving does: a note that only differs by spaces saves as what's there already, so nothing comes back
  // to reset this (Mark reported leaves it as typed) and it stayed "unsaved", holding Previous / Next for good
  const notesDirty = notes.trim() !== (flag.notes ?? '').trim();
  const status = statusInfo(flag.status);
  const isText = flag.mimetype === CONTENT_FLAG_TEXT_MIMETYPE;
  const fetchMatches = useFetchContentFlagMatches();
  // the status whose matches are being looked up
  const [ checkingMatches, setCheckingMatches ] = useState<ContentFlagStatus | null>(null);
  // other flags of the same media, set while the "confirm/dismiss the matches too?" dialog is open
  const [ matches, setMatches ] = useState<{status: ContentFlagStatus, found: ContentFlagMatches} | null>(null);
  // set while the "flag the prompt instead of the media?" dialog is open
  const [ flaggingPrompt, setFlaggingPrompt ] = useState(false);
  // set while the media viewer is open
  const [ viewingMedia, setViewingMedia ] = useState(false);
  // set while the kept frames viewer is open
  const [ viewingFrames, setViewingFrames ] = useState(false);
  const pendingStatus = (mutation.isPending) ? mutation.variables?.patch.status : checkingMatches ?? undefined;
  const savingNotes = mutation.isPending && mutation.variables?.patch.status === undefined;

  const undoAction = useUndoStatusAction();
  // false once the modal's closed (navigating away is held while a change is in flight, closing isn't)
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // `mutateAsync` rather than `mutate`'s callbacks, which don't run once this has unmounted: closing the modal while
  // it's saving would otherwise drop the toast (and its undo), or worse an error, so it looked like it went through
  const setStatus = (value: ContentFlagStatus, match?: MatchSelection) => {
    const others = match?.others ?? 0;
    const previous = flag.status;
    const patch: ContentFlagPatch = {status: value, match_sha256: match?.sha256 || undefined, match_pdq: match?.pdq || undefined};
    // a status change carries unsaved notes along like the reports modal's, so "write a note, click Confirm" is one
    // step (it used to drop the note). Only this flag gets them, not its matches
    if (notesDirty) {
      patch.notes = notes.trim() || null;
    }
    mutation.mutateAsync({flagId: flag.id, patch}).then(
      (updated) => {
        if (patch.notes !== undefined) {
          setNotes(updated.notes ?? '');
        }
        const label = statusInfo(value).label.toLowerCase();
        // no undo when matches changed too, the api doesn't say which flags those were so they can't be put back
        toast(
          (others) ? `Flag ${flag.id} and ${others.toLocaleString()} matching ${(others === 1) ? 'flag' : 'flags'}: ${label}` : `Flag ${flag.id}: ${label}`,
          'success',
          (others) ? undefined : undoAction(flag.id, previous),
        );
        // with shortcuts on a verdict moves on to the next flag, however it was given (key or button)
        if (value in STATUS_KEYS) {
          shortcuts.advance();
        }
      },
      (error) => toast(errorMessage(error), 'error'),
    );
  };
  // confirming or dismissing looks for other pending flags of the same media first, and offers to change those too
  const setStatusWithMatches = async (value: ContentFlagStatus) => {
    setCheckingMatches(value);
    let found: ContentFlagMatches;
    try {
      found = await fetchMatches(flag.id);
    } catch (error) {
      toast(errorMessage(error, 'Couldn’t check for other flags of the same media.'), 'error');
      return;
    } finally {
      setCheckingMatches(null);
    }
    // closed while it was checking: that's backing out, so nothing's changed (it used to set the status anyway, with
    // no toast or undo since this was gone, and skip asking about the matches)
    if (!mounted.current) {
      return;
    }
    if ((found.sha256?.pending ?? 0) + (found.pdq?.pending ?? 0)) {
      setMatches({status: value, found});
    } else {
      setStatus(value);
    }
  };
  const translate = () => {
    translation.mutate({flagId: flag.id}, {
      onSuccess: (updated) => {
        if (updated.translation) {
          toast(`Flag ${flag.id}: translated from ${updated.translation_language ?? 'unknown'}`);
        } else if (updated.translation_language === 'en') {
          toast(`Flag ${flag.id}: already in English`);
        } else {
          toast(`Flag ${flag.id}: no translation returned`, 'error');
        }
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    });
  };
  const saveNotes = () => {
    // like `setStatus`, so closing mid-save still says whether it worked
    mutation.mutateAsync({flagId: flag.id, patch: {notes: notes.trim() || null}}).then(
      (updated) => {
        // saving trims, which leaves the notes as they were when that's all it changed (and the effect above quiet)
        setNotes(updated.notes ?? '');
        toast(`Flag ${flag.id}: notes saved`);
      },
      (error) => toast(errorMessage(error), 'error'),
    );
  };

  const flagged = flag.flagged ?? [];
  const forReview = flag.flagged_for_review ?? [];
  const framesFlagged = flag.frames_flagged ?? [];
  // highest first, non-numeric scores last, ties by name
  const scores = Object.entries(flag.scores_worst ?? {}).sort(([ keyA, a ], [ keyB, b ]) => {
    return (((typeof b === 'number') ? b : -Infinity) - ((typeof a === 'number') ? a : -Infinity) || 0) || keyA.localeCompare(keyB);
  });

  const changingStatus = mutation.isPending || checkingMatches !== null;
  // stepping to another flag would unmount this one, dropping the change's toast (and undo), the matches dialog or a
  // typed note that isn't saved yet
  const held = changingStatus || translation.isPending || notesDirty;
  useHoldModalNavigation(held);
  // reporting goes through a dialog so the uploader can be blocked in the same step
  const changeStatus = (value: ContentFlagStatus) => (value === ContentFlagStatuses.REPORTED) ? onReport((notesDirty) ? notes.trim() || null : undefined) :
    (MATCHABLE_STATUSES.includes(value)) ? setStatusWithMatches(value) : setStatus(value);
  // a key only does what its button would: nothing for the status the flag is already in (that slot is Mark pending)
  const shortcuts = useReviewShortcuts({
    keys: {
      [REVIEW_KEYS.confirm]: (flag.status === ContentFlagStatuses.CONFIRMED) ? undefined : () => changeStatus(ContentFlagStatuses.CONFIRMED),
      [REVIEW_KEYS.dismiss]: (flag.status === ContentFlagStatuses.DISMISSED) ? undefined : () => changeStatus(ContentFlagStatuses.DISMISSED),
    },
    pending: changingStatus,
    held,
  });
  // what the review is doing right now, for whoever's reading the DOM
  const reviewState = (checkingMatches !== null) ? 'checking-matches' : (matches) ? 'choosing-matches' :
    (savingNotes) ? 'saving-notes' : (mutation.isPending) ? 'saving-status' : 'idle';
  // the line above the evidence: what the scan did with it, the command that made it, and where it was (missing parts
  // are left out). The flag's own id is there on phones only, the title's can be cut off there
  const context: Array<{key: string, node: ReactNode, className?: string}> = [
    (flag.action) ? {key: 'action', node: <ActionChip action={flag.action}/>} : null,
    (flag.command_id) ? {key: 'command', node: <span className='font-mono text-fg' title='Command'>{flag.command_id}</span>} : null,
    (flag.guild_id) ? {
      key: 'server',
      node: <>server <CopyableValue value={flag.guild_id} truncate={0} to={adminServerPath(flag.guild_id)} linkTitle='Open this server'/></>,
    } : null,
    (flag.tag_id) ? {
      key: 'tag',
      node: <>tag <CopyableValue value={flag.tag_id} truncate={0} to={`${Routes.DASHBOARD_ADMIN_TAGS}?q=${flag.tag_id}`} linkTitle='Find this tag in tags'/></>,
    } : null,
    {key: 'flag', node: <>flag <CopyableValue value={flag.id} truncate={0}/></>, className: 'sm:hidden'},
  ].filter((item) => !!item);

  return (
    <div data-state={reviewState}>
      {/* the title can be cut off on phones, so there it's in the details below with a copy button too */}
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<Chip className='w-12 shrink-0 justify-center'>{(isText) ? 'text' : 'media'}</Chip>}
        title={<><span className='sr-only'>Flag </span>#{flag.id}</>}
        mono
        meta={<ExactDate value={flag.created} format={formatDateTime}/>}
        states={<>
          {(flag.category) ? <Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip> : null}
          {(flag.needs_human_review) ? <Chip tone='warning'>needs human review</Chip> : null}
          {(flag.auto_confirmed_from) ? <Chip title={`Same media as #${flag.auto_confirmed_from}, which was already confirmed`}>auto-confirmed</Chip> : null}
          {autoReviewChip(flag.auto_review)}
        </>}
        status={<>
          <ReviewShortcutsToggle enabled={shortcuts.enabled} onChange={shortcuts.setEnabled} legend='C confirm • D dismiss'/>
          <Chip tone={status.tone} title={status.description} className='w-20 justify-center'>{status.label}</Chip>
        </>}
        // room for the shortcuts toggle beside the chip on phones
        wideStatus
      />

      {/* who posted it, a link to their admin page (the server is linked from the line under the chips below) */}
      <DetailModalStrip>
        <div className='flex items-center gap-2'>
          {(user ?? flag.user_id) ? (
            <Link
              to={adminUserPath(user?.id ?? flag.user_id!)}
              title='Open in users'
              className='group/user -ml-1.5 flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 transition-colors hover:bg-surface-3'
            >
              <UserCell user={user} fallbackId={flag.user_id} size='sm'/>
              <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand-text'/>
            </Link>
          ) : (
            <UserCell user={null}/>
          )}
          {(user?.blocked) ? <Chip tone='danger' title={user.blocked_reason || undefined}>Blocked</Chip> : null}
          {/* Warn and Block (or Unblock), like the reports modal's */}
          {(user) ? <UserModerationButtons user={user} defaultReason={flagBlockReason(flag)} className='ml-auto'/> : null}
        </div>
        {(user?.blocked && user.blocked_reason) ? <p className='mt-1 text-xs break-words text-subtle'>Blocked for: {user.blocked_reason}</p> : null}
      </DetailModalStrip>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {(flagged.length || forReview.length) ? (
          <div className='mb-2 flex flex-wrap items-center gap-1.5'>
            {flagged.map((label) => <Chip key={`f-${label}`} tone='danger'>{label}</Chip>)}
            {forReview.map((label) => <Chip key={`r-${label}`} tone='warning' title='Flagged for review'>review: {label}</Chip>)}
          </div>
        ) : null}

        {/* what happened to it and where, in one line: the evidence comes next, the rest is under Technical */}
        <div className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-subtle', context.length === 1 && 'sm:hidden')}>
          {context.map((item, i) => (
            <span key={item.key} className={cn('inline-flex min-w-0 items-center gap-1.5', item.className)}>
              {(i) ? <span aria-hidden>•</span> : null}
              {item.node}
            </span>
          ))}
        </div>

        {(flag.query) ? (
          <div className='mt-4'>
            <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
              <h3 className='section-label'>{(isText) ? 'Flagged text' : (flag.query_type) ? QUERY_TYPE_LABELS[flag.query_type] : 'Query'}</h3>
              <div className='flex items-center gap-1'>
                {/* a script isn't a prompt, flagging it as text would scan the code */}
                {(!isText && flag.query_type !== 'mediascript') ? (
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm'
                    title='The prompt is the problem, not the media: turn this into a text flag on the prompt'
                    onClick={() => setFlaggingPrompt(true)}
                  >
                    <MessageSquareWarning aria-hidden className='size-4 shrink-0'/>
                    {/* icon only on phones, the label squeezes the header onto three lines there */}
                    <span className='sr-only sm:not-sr-only'>Flag prompt only</span>
                  </button>
                ) : null}
                {(!flag.translation && flag.translation_language !== 'en') ? (
                  <button type='button' className='btn btn-ghost btn-sm' disabled={translation.isPending} onClick={translate}>
                    {(translation.isPending) ? <Spinner className='size-3.5'/> : <Languages aria-hidden className='size-4'/>}
                    Translate
                  </button>
                ) : null}
                <CopyButton value={flag.query} label='Copy'/>
              </div>
            </div>
            <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.query}</p>
          </div>
        ) : null}

        {(flag.query && flag.translation) ? (
          <div className='mt-4'>
            <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
              <h3 className='section-label'>
                Translation <span className='normal-case tracking-normal text-subtle'>({flag.translation_language ?? '?'} → en)</span>
              </h3>
              <div className='flex items-center gap-1'>
                <button type='button' className='btn btn-ghost btn-sm' disabled={translation.isPending} onClick={translate}>
                  {(translation.isPending) ? <Spinner className='size-3.5'/> : <Languages aria-hidden className='size-4'/>}
                  Retranslate
                </button>
                <CopyButton value={flag.translation} label='Copy'/>
              </div>
            </div>
            <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.translation}</p>
          </div>
        ) : (flag.query && flag.translation_language === 'en') ? (
          <p className='mt-2 text-xs text-subtle'>Already in English, no translation needed.</p>
        ) : null}

        {(flag.source_url) ? (
          <div className='mt-4'>
            <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
              <h3 className='section-label'>Source URL <span className='normal-case tracking-normal text-subtle'>(not loaded)</span></h3>
              <div className='flex items-center gap-1'>
                {(!isText && !isChildSafetyFlag(flag)) ? (
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm'
                    title='Fetch the media from its source through the API and show it here, blurred. Nothing is kept or uploaded.'
                    onClick={() => setViewingMedia(true)}
                  >
                    <Eye aria-hidden className='size-4'/>
                    Show media
                  </button>
                ) : null}
                <CopyButton value={flag.source_url} label='Copy'/>
              </div>
            </div>
            {/* plain text on purpose: no link, no preview */}
            <p className='rounded-md border border-line bg-deep px-3 py-2 font-mono text-xs break-all text-muted select-all focus:border-line-strong focus:outline-none' {...selectAllScope}>{flag.source_url}</p>
          </div>
        ) : null}

        {(flag.frames_kept && !isText && !isChildSafetyFlag(flag)) ? (
          <div className='mt-4 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>Flagged frames <span className='normal-case tracking-normal text-subtle'>(kept for review)</span></h3>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              title='The frames that were scanned, kept by the API when this was flagged. Shown here blurred, gone once it’s confirmed or dismissed.'
              onClick={() => setViewingFrames(true)}
            >
              <Eye aria-hidden className='size-4'/>
              Show frames
            </button>
          </div>
        ) : null}

        {(scores.length) ? (
          <div className='mt-4'>
            <h3 className='section-label mb-1'>Worst scores</h3>
            <dl className='flex flex-wrap gap-1.5'>
              {/* the labels are score keys, so the ones that fired get the same tone as their chips above */}
              {scores.map(([ key, value ]) => {
                const tone = (flagged.includes(key)) ? 'danger' : (forReview.includes(key)) ? 'warning' : null;
                return (
                  <div
                    key={key}
                    className={cn('flex items-baseline gap-1.5 rounded border px-2 py-1 text-xs',
                      (tone === 'danger') ? 'border-danger/40 bg-danger/10' : (tone === 'warning') ? 'border-warning/40 bg-warning/10' : 'border-transparent bg-deep')}
                    title={(tone === 'danger') ? 'Flagged' : (tone === 'warning') ? 'Flagged for review' : undefined}
                  >
                    <dt className={(tone === 'danger') ? 'text-danger-text' : (tone === 'warning') ? 'text-warning' : 'text-subtle'}>{key}</dt>
                    <dd className='font-mono text-fg tabular-nums'>{formatScore(value)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : null}

        {(flag.auto_review) ? <AutoReviewSection review={flag.auto_review}/> : null}

        {/* what the scan ran on and the ids nobody triages by, closed until someone needs them */}
        <details className='mt-4'>
          <summary className='section-label w-fit cursor-pointer hover:text-fg'>Technical</summary>
          {/* side by side once there's room, where the channel and message ids sit on the right. Stacked on phones, both
              lists share one label column (subgrid) so their values line up */}
          <div className='mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-2'>
            <DetailList
              className={DETAIL_LIST_STACKED}
              items={[
                ['Model', flag.model || '—'],
                ['Mimetype', flag.mimetype || '—'],
                ['Size', (flag.size !== null && flag.size !== undefined) ? `${formatMemory(flag.size, 1)} (${flag.size.toLocaleString()} B)` : '—'],
                (isText) ? null : ['Frames', (flag.frames !== null && flag.frames !== undefined)
                  ? `${framesFlagged.length.toLocaleString()} flagged of ${flag.frames.toLocaleString()}`
                  : '—'],
                (framesFlagged.length) ? ['Flagged frames', <span className='font-mono text-xs'>{framesFlagged.join(', ')}</span>] : null,
                ['SHA-256', (flag.sha256) ? (
                  <CopyableValue value={flag.sha256} to={`${Routes.DASHBOARD_ADMIN_FLAGS}?q=${flag.sha256}`} linkTitle='Search the flags of this exact file'/>
                ) : '—'],
                (isText) ? null : [
                  <span title={pdqHint()} className='cursor-help underline decoration-dotted underline-offset-2'>PDQ</span>,
                  (flag.pdq) ? (
                    <CopyableValue value={flag.pdq} to={`${Routes.DASHBOARD_ADMIN_FLAGS}?q=${flag.pdq}`} linkTitle='Search the flags with this PDQ hash'/>
                  ) : '—',
                ],
                [
                  <span title={PROMPT_HASH_HINT} className='cursor-help underline decoration-dotted underline-offset-2'>Prompt hash</span>,
                  (flag.prompt_hash) ? (
                    <CopyableValue
                      value={flag.prompt_hash}
                      to={`${Routes.DASHBOARD_ADMIN_FLAGS}?prompt_hash=${flag.prompt_hash}`}
                      linkTitle='Show the flags scanned with this prompt hash'
                    />
                  ) : '—',
                ],
              ]}
            />
            <DetailList
              className={DETAIL_LIST_STACKED}
              items={[
                ['Channel', (flag.channel_id) ? <CopyableValue value={flag.channel_id} truncate={0}/> : '—'],
                ['Message', (flag.message_id) ? <CopyableValue value={flag.message_id} truncate={0}/> : '—'],
              ]}
            />
          </div>
        </details>

        <form
          className='mt-4'
          onSubmit={(event) => {
            event.preventDefault();
            saveNotes();
          }}
        >
          {/* who reviewed it sits with the notes, since that's what they'd explain */}
          <div className='mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
            <label htmlFor={`flag-notes-${flag.id}`} className='section-label'>Notes</label>
            {(flag.reviewed_at || flag.reviewed_by) ? (
              <p className='text-xs text-subtle'>
                Reviewed
                {(flag.reviewed_at) ? <> <ExactDate value={flag.reviewed_at} format={formatDateTime}/></> : null}
                {/* TODO: have the api send `reviewed_by` as a user object (like `user`) and show a UserCell here instead of the id */}
                {(flag.reviewed_by) ? (
                  <> by <Link to={adminUserPath(flag.reviewed_by)} title='Open in users' className='font-mono text-code underline-offset-2 hover:underline'>{flag.reviewed_by}</Link></>
                ) : (flag.auto_review?.applied) ? (
                  <> by <span className='font-mono text-code'>{flag.auto_review.model ?? 'Haiku'}</span></>
                ) : null}
              </p>
            ) : null}
          </div>
          <textarea
            id={`flag-notes-${flag.id}`}
            className='input min-h-16 resize-y'
            rows={2}
            value={notes}
            placeholder='Add a note for other reviewers (saved with the next status change too)...'
            onChange={(event) => setNotes(event.target.value)}
          />
          {(notesDirty) ? (
            <div className='mt-2 flex justify-end gap-2'>
              <button type='button' className='btn btn-ghost btn-sm' disabled={mutation.isPending} onClick={() => setNotes(flag.notes ?? '')}>Discard</button>
              <button type='submit' className='btn btn-primary btn-sm' disabled={mutation.isPending}>
                {(savingNotes) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : null}
                Save notes
              </button>
            </div>
          ) : null}
        </form>
      </div>

      {/* confirm on the left, dismiss on the right with unsure between them, and reporting set apart after a divider (it
          isn't a review verdict, it marks the content as reported elsewhere). The current status' slot turns into "Mark
          pending", so the buttons never move around. Four labels don't fit a phone's row, so there the unsure and
          report slots are only their icons, leaving the words for the verdicts */}
      <AdminModalFooter {...navigation}>
        {([ ContentFlagStatuses.CONFIRMED, ContentFlagStatuses.UNSURE, ContentFlagStatuses.DISMISSED, ContentFlagStatuses.REPORTED ] as Array<ContentFlagStatus>).map((slot) => {
          const value: ContentFlagStatus = (flag.status === slot) ? ContentFlagStatuses.PENDING : slot;
          const item = statusInfo(value);
          const iconOnPhones = slot === ContentFlagStatuses.UNSURE || slot === ContentFlagStatuses.REPORTED;
          return (
            <Fragment key={slot}>
              {(slot === ContentFlagStatuses.REPORTED) ? <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/> : null}
              <button
                type='button'
                className={cn('btn min-w-0 px-2 sm:flex-none sm:px-3', (iconOnPhones) ? 'flex-none' : 'flex-1', STATUS_BUTTON_CLASSES[item.value])}
                disabled={changingStatus}
                title={(item.value === ContentFlagStatuses.REPORTED) ? REPORTED_DESCRIPTION : (item.value === ContentFlagStatuses.UNSURE) ? UNSURE_DESCRIPTION :
                  (item.value in STATUS_KEYS) ? shortcuts.title(item.action, STATUS_KEYS[item.value]) : (iconOnPhones) ? item.action : undefined}
                onClick={() => changeStatus(value)}
              >
                {(pendingStatus === value) ? <Spinner className='size-4'/> : <item.icon aria-hidden className={cn('size-4 shrink-0', !iconOnPhones && 'hidden sm:block')}/>}
                <span className={cn('truncate sm:hidden', iconOnPhones && 'sr-only')}>{item.short}</span>
                <span className='hidden sm:inline'>{item.action}</span>
              </button>
            </Fragment>
          );
        })}
      </AdminModalFooter>

      {(matches) ? (
        <MatchesDialog
          flag={flag}
          status={matches.status}
          matches={matches.found}
          // closed before the request so the dialog never outlives the card (it leaves the pending queue once changed)
          onConfirm={(match) => {
            const value = matches.status;
            setMatches(null);
            setStatus(value, match);
          }}
          onClose={() => setMatches(null)}
        />
      ) : null}
      {(flaggingPrompt) ? <FlagPromptDialog flag={flag} onClose={() => setFlaggingPrompt(false)}/> : null}
      {(viewingMedia) ? <MediaDialog flag={flag} onClose={() => setViewingMedia(false)}/> : null}
      {(viewingFrames) ? <KeptFramesDialog flag={flag} onClose={() => setViewingFrames(false)}/> : null}
    </div>
  );
}


interface MatchSelection {
  sha256: boolean,
  pdq: boolean,
  // how many pending flags those cover
  others: number,
}

// Asked when confirming or dismissing a flag other pending flags share the media with: the exact same file (sha256) or
// visually similar media (pdq). Nothing is ticked to start with, each kind of match is opted into.
function MatchesDialog({ flag, status, matches, onConfirm, onClose }: {
  flag: ContentFlag,
  status: ContentFlagStatus,
  matches: ContentFlagMatches,
  onConfirm: (match: MatchSelection) => void,
  onClose: () => void,
}) {
  const titleId = useId();
  const [ sha256, setSha256 ] = useState(false);
  const [ pdq, setPdq ] = useState(false);
  const others = ((sha256) ? matches.sha256?.pending ?? 0 : 0) + ((pdq) ? matches.pdq?.pending ?? 0 : 0);
  const { action } = statusInfo(status);
  const danger = status === ContentFlagStatuses.CONFIRMED;

  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm({sha256, pdq, others});
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Other flags match #{flag.id}</h2>
        <p className='mt-2 text-sm text-muted'>Tick the matches to {action.toLowerCase()} along with it. Only pending flags are changed.</p>

        <div className='mt-4 space-y-2'>
          <MatchOption
            label='Same file'
            kind='SHA-256'
            hash={flag.sha256}
            status={status}
            counts={matches.sha256}
            checked={sha256}
            onChange={setSha256}
          />
          <MatchOption
            label='Visually similar'
            kind='PDQ'
            hint={pdqHint(matches.pdq_distance)}
            hash={flag.pdq}
            status={status}
            counts={matches.pdq}
            checked={pdq}
            onChange={setPdq}
          />
        </div>

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Cancel</button>
          <button type='submit' className={cn('btn', (danger) ? 'btn-danger' : 'btn-primary')}>
            {(others) ? `${action} ${(others + 1).toLocaleString()} flags` : `${action} only #${flag.id}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// One kind of match in `MatchesDialog`: its pending count to tick, and the reviewed ones (with another status than the
// one being set) it leaves alone
function MatchOption({ label, kind, hint, hash, status, counts, checked, onChange }: {
  label: string,
  kind: string,
  hint?: string,
  hash: string | null,
  status: ContentFlagStatus,
  counts: ContentFlagMatchCounts | null,
  checked: boolean,
  onChange: (checked: boolean) => void,
}) {
  const id = useId();
  if (!hash || !counts) {
    return null;
  }
  const reviewed = [
    [ContentFlagStatuses.CONFIRMED, counts.confirmed, 'confirmed'],
    [ContentFlagStatuses.DISMISSED, counts.dismissed, 'dismissed'],
    [ContentFlagStatuses.REPORTED, counts.reported, 'reported'],
    [ContentFlagStatuses.UNSURE, counts.unsure, 'unsure'],
  ] as const;
  const ignoredCounts = reviewed.filter(([ value, count ]) => value !== status && count);
  const ignoredTotal = ignoredCounts.reduce((total, [ , count ]) => total + count, 0);
  if (!(counts.pending + ignoredTotal)) {
    return null;
  }
  const ignored = ignoredCounts.map(([ , count, name ]) => `${count.toLocaleString()} ${name}`);

  return (
    <div className={cn('rounded-md border p-3 text-sm', (!checked) ? 'border-line' :
      (status === ContentFlagStatuses.CONFIRMED) ? 'border-danger/60 bg-danger/5' : 'border-brand/60 bg-brand/5')}>
      <label htmlFor={id} className={cn('flex items-start gap-2', (counts.pending) ? 'cursor-pointer' : 'cursor-not-allowed')}>
        <input
          id={id}
          type='checkbox'
          checked={checked}
          disabled={!counts.pending}
          onChange={(event) => onChange(event.target.checked)}
          className='mt-0.5'
        />
        <span className='min-w-0 flex-1'>
          <span className='flex flex-wrap items-center gap-1.5'>
            <span className='font-medium text-white'>{label}</span>
            <span title={hint} className={cn('inline-flex items-center gap-1 text-subtle', hint && 'cursor-help')}>
              ({kind})
              {(hint) ? <Info aria-hidden className='size-3.5'/> : null}
            </span>
            <Chip tone={(counts.pending) ? 'warning' : 'neutral'} className='ml-auto'>{counts.pending.toLocaleString()} pending</Chip>
          </span>
          {(hint) ? <span className='sr-only'>{hint}</span> : null}
          {(ignored.length) ? (
            <span className='mt-1 block text-xs text-subtle'>
              Ignoring {new Intl.ListFormat('en').format(ignored)}, {(ignoredTotal === 1) ? 'it keeps its' : 'they keep their'} status.
            </span>
          ) : null}
        </span>
      </label>
      {/* outside the label so copying doesn't toggle the checkbox */}
      <div className='mt-2 pl-6'>
        <CopyableValue value={hash}/>
      </div>
    </div>
  );
}


async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

type MediaState =
  // `job` is rq's status of the fetch job, null while it's being started
  {status: 'loading', job: string | null} |
  {status: 'error', message: string} |
  // `sameFile` is null when the flag has no sha256 to compare with, `frames` are the flagged frames (multi-frame media only)
  {status: 'ready', url: string, type: string, sameFile: boolean | null, frames: Array<MediaFrame>};

// `timestamp` is where it is in the media, in seconds (null if the api couldn't tell)
interface MediaFrame {
  frame: number,
  timestamp: number | null,
  url: string,
}

// m:ss, with tenths when it isn't on a whole second
function formatTimestamp(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const fractional = tenths % 10 !== 0;
  const rest = (tenths % 600) / 10;
  return `${Math.floor(tenths / 600)}:${((fractional) ? rest.toFixed(1) : String(rest)).padStart((fractional) ? 4 : 2, '0')}`;
}

// the fetch job runs for 90s at most, this leaves room for time spent queued
const MEDIA_JOB_MAX_WAIT = 3 * 60 * 1000;
const MEDIA_JOB_POLL_INTERVAL = 1500;
const JOB_STATUSES_DONE = ['finished', 'failed', 'stopped', 'canceled'];

const MEDIA_JOB_LABELS: Record<string, string> = {
  queued: 'Waiting in the queue...',
  deferred: 'Waiting in the queue...',
  scheduled: 'Waiting in the queue...',
  started: 'Fetching media...',
};

function base64ToBlob(value: string, mimetype: string): Blob {
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return new Blob([bytes], {type: mimetype});
}

// The flag's source media, fetched by the api in a job (polled through `GET /jobs/<id>` like any other) and handed over
// once as a blob that only lives in this dialog (its object url is revoked on close), with the flagged frames of
// videos/gifs next to it (extracted by the api like the scanner did). Blurred until revealed.
function MediaDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const [ state, setState ] = useState<MediaState>({status: 'loading', job: null});
  const [ revealed, setRevealed ] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    // the media's and its frames' object urls, revoked on close
    const urls: Array<string> = [];
    // set until the job hands its file over (that deletes it), cancelled on close
    let jobId: string | null = null;

    const load = async () => {
      // not aborted, the job would be made anyway and its id lost, so one that comes back after closing is cancelled
      let job = await api.startAdminContentFlagMedia(flag.id);
      if (signal.aborted) {
        if (!JOB_STATUSES_DONE.includes(job.status)) {
          api.deleteJob(job.id).catch(() => {});
        }
        return;
      }
      jobId = job.id;
      const deadline = Date.now() + MEDIA_JOB_MAX_WAIT;
      while (!JOB_STATUSES_DONE.includes(job.status)) {
        if (Date.now() > deadline) {
          throw new Error('Fetching the media took too long.');
        }
        setState({status: 'loading', job: job.status});
        await new Promise((resolve) => setTimeout(resolve, MEDIA_JOB_POLL_INTERVAL));
        if (signal.aborted) {
          return;
        }
        job = await api.fetchJob(job.id, signal);
      }
      // done jobs are already deleted by the api
      jobId = null;
      if (job.result.error) {
        throw new Error(job.result.error);
      }
      const item = job.result.response?.items[0];
      if (!item?.file.value) {
        throw new Error('The job finished without the media.');
      }
      const blob = base64ToBlob(item.file.value, item.file.metadata.mimetype);
      const sameFile = (flag.sha256) ? (await sha256Hex(blob)) === flag.sha256 : null;
      if (signal.aborted) {
        return;
      }
      const url = URL.createObjectURL(blob);
      urls.push(url);
      const frames = (item.flagged_frames ?? []).map((frame) => {
        const frameUrl = URL.createObjectURL(base64ToBlob(frame.value, frame.mimetype));
        urls.push(frameUrl);
        return {frame: frame.frame, timestamp: frame.timestamp, url: frameUrl};
      });
      setState({status: 'ready', url, type: blob.type, sameFile, frames});
    };

    // once: closing mid-poll aborts the poll's request, which lands in the catch below after the cleanup already
    // cancelled the job (the second delete was a 404 nobody saw)
    const cancelJob = () => {
      if (jobId) {
        api.deleteJob(jobId).catch(() => {});
        jobId = null;
      }
    };

    load().catch((error) => {
      // gave up (too slow, or a poll failed) while the job still runs: cancel it now instead of when the dialog closes
      cancelJob();
      if (!signal.aborted) {
        setState({status: 'error', message: errorMessage(error, 'Couldn’t load the media.')});
      }
    });
    return () => {
      controller.abort();
      cancelJob();
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [flag.id, flag.sha256]);

  let media: ReactNode = null;
  const frames = (state.status === 'ready') ? state.frames : [];
  if (state.status === 'ready') {
    // not interactive while blurred, the reveal button sits on top
    const className = cn('max-h-[65vh] w-full rounded-md bg-deep object-contain transition-[filter]', !revealed && 'pointer-events-none blur-2xl');
    if (state.type.startsWith('image/')) {
      media = <img src={state.url} alt={`Media of flag #${flag.id}`} className={className}/>;
    } else if (state.type.startsWith('video/')) {
      media = <video ref={videoRef} src={state.url} controls={revealed} className={className}/>;
    } else if (state.type.startsWith('audio/')) {
      media = <audio src={state.url} controls className='w-full'/>;
    } else {
      media = <p className='text-sm text-muted'>Can’t preview <span className='font-mono'>{state.type || 'unknown type'}</span>.</p>;
    }
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} className={(frames.length) ? 'max-w-5xl' : 'max-w-3xl'}>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Media of flag #{flag.id}</h2>
        <p className='mt-1 text-sm text-muted'>Fetched from the source URL by the API. Nothing is kept or uploaded.</p>

        {(state.status === 'ready' && state.sameFile === false) ? (
          <p role='alert' className='mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
            <AlertTriangle aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
            <span>
              This isn’t the exact file that was flagged (its SHA-256 doesn’t match). The source may have changed, it may
              have been converted while fetching, or the flag is on a command’s output rather than this input.
              {(frames.length) ? ' The flagged frames are taken from this file, so they may not be the ones that were flagged.' : null}
            </span>
          </p>
        ) : null}

        <div className='mt-4'>
          {(state.status === 'loading') ? (
            <div className='flex h-48 items-center justify-center gap-2 rounded-md bg-deep text-sm text-muted'>
              <Spinner className='size-4'/> {(state.job && MEDIA_JOB_LABELS[state.job]) || 'Fetching media...'}
            </div>
          ) : (state.status === 'error') ? (
            <DialogError>{state.message}</DialogError>
          ) : (
            <div className={cn((frames.length > 0) && 'grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
              <div className='relative overflow-hidden rounded-md'>
                {media}
                {(!revealed && !state.type.startsWith('audio/')) ? (
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <button type='button' className='btn btn-secondary' onClick={() => setRevealed(true)}>
                      <Eye aria-hidden className='size-4'/>
                      Reveal
                    </button>
                  </div>
                ) : null}
              </div>
              {(frames.length) ? (
                <section aria-label='Flagged frames' className='min-w-0'>
                  <h3 className='text-sm font-medium text-white'>
                    Flagged {(frames.length === 1) ? 'frame' : 'frames'}
                    {(flag.frames_flagged && flag.frames_flagged.length > frames.length) ? (
                      <span className='font-normal text-subtle'> ({frames.length} of {flag.frames_flagged.length})</span>
                    ) : null}
                  </h3>
                  <ul className='mt-2 grid max-h-[65vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-1'>
                    {frames.map((frame) => (
                      <li key={frame.frame} className='overflow-hidden rounded-md bg-deep'>
                        <img
                          src={frame.url}
                          alt={`Frame ${frame.frame} of flag #${flag.id}`}
                          className={cn('w-full object-contain transition-[filter]', !revealed && 'pointer-events-none blur-2xl')}
                        />
                        <p className='flex items-center gap-1.5 px-2 py-1 font-mono text-xs text-muted'>
                          Frame {frame.frame}
                          {(frame.timestamp === null) ? null : (state.type.startsWith('video/')) ? (
                            <button
                              type='button'
                              title='Jump to this frame in the video'
                              className='cursor-pointer rounded px-1 text-code hover:bg-surface-3'
                              onClick={() => {
                                if (videoRef.current) {
                                  videoRef.current.pause();
                                  videoRef.current.currentTime = frame.timestamp ?? 0;
                                }
                              }}
                            >
                              at {formatTimestamp(frame.timestamp)}
                            </button>
                          ) : (
                            <span>at {formatTimestamp(frame.timestamp)}</span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}


type KeptFramesState =
  {status: 'loading'} |
  {status: 'error', message: string} |
  {status: 'ready', exact: boolean, expiresIn: number | null, framesTotal: number, frames: Array<MediaFrame>};

// The flag's flagged frames, kept by the api when it was flagged (`GET /admin/content-flags/<id>/frames`): what was
// actually scanned, for flags whose source url is the command's input or that have none (mediascript). Object urls
// only live in this dialog, blurred until revealed.
function KeptFramesDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const [ state, setState ] = useState<KeptFramesState>({status: 'loading'});
  const [ revealed, setRevealed ] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const urls: Array<string> = [];
    api.fetchAdminContentFlagFrames(flag.id, controller.signal).then((kept) => {
      const frames = kept.frames.map((frame) => {
        const url = URL.createObjectURL(base64ToBlob(frame.value, frame.mimetype));
        urls.push(url);
        return {frame: frame.frame, timestamp: frame.timestamp, url};
      });
      setState({status: 'ready', exact: kept.exact, expiresIn: kept.expires_in, framesTotal: kept.frames_total, frames});
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setState({status: 'error', message: errorMessage(error, 'Couldn’t load the frames.')});
      }
    });
    return () => {
      controller.abort();
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [flag.id]);

  const frames = (state.status === 'ready') ? state.frames : [];
  return (
    <Modal labelledBy={titleId} onClose={onClose} className={(frames.length > 1) ? 'max-w-5xl' : 'max-w-3xl'}>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Flagged frames of flag #{flag.id}</h2>
        <p className='mt-1 text-sm text-muted'>
          Kept by the API when it was flagged, never uploaded.
          {(state.status === 'ready' && state.expiresIn !== null) ? ` Gone in ${formatUptime(state.expiresIn * 1000)}.` : null}
        </p>

        {(state.status === 'ready' && !state.exact) ? (
          <p role='alert' className='mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
            <AlertTriangle aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
            <span>
              The scores are from the command’s input, which was blocked through the output. These frames are spread over
              the output, not the ones that were flagged; a filter like invert or a hue shift may hide what the scanner saw.
            </span>
          </p>
        ) : null}

        <div className='mt-4'>
          {(state.status === 'loading') ? (
            <div className='flex h-48 items-center justify-center gap-2 rounded-md bg-deep text-sm text-muted'>
              <Spinner className='size-4'/> Loading frames...
            </div>
          ) : (state.status === 'error') ? (
            <DialogError>{state.message}</DialogError>
          ) : (
            <div className='relative'>
              <ul className={cn('grid max-h-[65vh] gap-2 overflow-y-auto', (frames.length > 1) && 'sm:grid-cols-2')}>
                {frames.map((frame) => (
                  <li key={frame.frame} className='overflow-hidden rounded-md bg-deep'>
                    <img
                      src={frame.url}
                      alt={`Frame ${frame.frame} of flag #${flag.id}`}
                      className={cn('w-full object-contain transition-[filter]', !revealed && 'pointer-events-none blur-2xl')}
                    />
                    {(state.framesTotal > 1) ? (
                      <p className='px-2 py-1 font-mono text-xs text-muted'>
                        Frame {frame.frame} of {state.framesTotal}
                        {(frame.timestamp === null) ? null : ` • ${formatTimestamp(frame.timestamp)}`}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {(!revealed) ? (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <button type='button' className='btn btn-secondary' onClick={() => setRevealed(true)}>
                    <Eye aria-hidden className='size-4'/>
                    Reveal
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}


// Turns a media flag into a text flag on its prompt, for imagine/edit outputs where the prompt was the problem and not
// the image that was sent in. The media's hashes are dropped, so confirming it never matches other flags of that image.
function FlagPromptDialog({ flag, onClose }: {flag: ContentFlag, onClose: () => void}) {
  const titleId = useId();
  const toast = useToast();
  const mutation = useFlagAdminContentFlagPromptMutation();

  const submit = () => {
    mutation.mutate({flagId: flag.id}, {
      onSuccess: () => {
        toast(`Flag ${flag.id}: now flags the prompt`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Flag the prompt of #{flag.id} instead of the media?</h2>
        <p className='mt-2 text-sm text-muted'>
          This becomes a text flag on the prompt below. The media’s SHA-256, PDQ, frames and source URL are removed, so
          confirming it won’t match other flags of the same image. The status and scanner labels stay. This can’t be undone.
        </p>
        <p className='mt-3 rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg'>{flag.query}</p>

        {(mutation.isError) ? (
          <DialogError className='mt-4'>
            {errorMessage(mutation.error, 'Couldn’t flag the prompt.')}
          </DialogError>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-danger' disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Flag prompt only
          </button>
        </div>
      </form>
    </Modal>
  );
}


// Marks a flag reported and (optionally) blocks whoever posted it, in one go. `notes` is the flag modal's unsaved note,
// saved with the status (undefined when there's none)
function ReportFlagDialog({ flag, notes, onClose }: {flag: ContentFlag, notes?: string | null, onClose: () => void}) {
  const titleId = useId();
  const blockId = useId();
  const reasonId = useId();
  const toast = useToast();
  const { user: me } = useAuth();
  const report = usePatchAdminContentFlagMutation();
  const block = usePatchAdminUserMutation();
  const undoAction = useUndoStatusAction();

  const { user } = flag;
  // already blocked, or one this viewer isn't allowed to block
  const blockable = !!user && !user.blocked && canBlockUser(user, isOwner(me));
  const [ blockUser, setBlockUser ] = useState(false);
  const [ reason, setReason ] = useState(flagBlockReason(flag));
  // seconds, 0 for a permanent block (like the block dialog's Length)
  const [ duration, setDuration ] = useState(0);
  // once set, a failed block can be retried without re-reporting
  const [ reported, setReported ] = useState(false);

  const pending = report.isPending || block.isPending;

  const runBlock = () => {
    if (!user) {
      return;
    }
    block.mutate({userId: user.id, patch: {blocked: true, blocked_reason: reason.trim() || null, blocked_until: blockedUntilFromSeconds(duration)}}, {
      onSuccess: () => {
        toast(`Blocked ${user.username}`);
        onClose();
      },
    });
  };

  const submit = () => {
    if (reported) {
      runBlock();
      return;
    }
    const patch: ContentFlagPatch = {status: ContentFlagStatuses.REPORTED};
    if (notes !== undefined) {
      patch.notes = notes;
    }
    report.mutate({flagId: flag.id, patch}, {
      onSuccess: () => {
        setReported(true);
        // only undoes the report, a block in the same step stays (unblocking is for owners)
        toast(`Flag ${flag.id}: reported`, 'success', undoAction(flag.id, flag.status));
        if (blockUser && blockable) {
          runBlock();
        } else {
          onClose();
        }
      },
    });
  };

  const error = (report.isError) ?
    errorMessage(report.error, 'Couldn’t mark the flag reported.') :
    (block.isError) ? `The flag was marked reported, but blocking failed: ${errorMessage(block.error, 'Couldn’t block the user.')}` : null;

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>Mark flag #{flag.id} reported?</h2>
        <p className='mt-2 text-sm text-muted'>
          For content you’ve reported outside NotSoBot, like to Discord Trust &amp; Safety or to NCMEC for child safety. This only
          marks the flag, nothing is sent from here. It counts as confirmed, so matching uploads are auto-confirmed too.
        </p>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <UserCell user={user} fallbackId={flag.user_id}/>
          {(flag.category || user?.blocked) ? (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {(flag.category) ? <Chip tone={(flag.category.startsWith('unsafe')) ? 'danger' : 'warning'}>{flag.category}</Chip> : null}
              {(user?.blocked) ? <Chip tone='danger' title={user.blocked_reason || undefined}>Already blocked</Chip> : null}
            </div>
          ) : null}
        </div>

        {(user && blockable) ? (
          <div className='mt-3 rounded-md border border-line p-3 text-sm'>
            <label htmlFor={blockId} className='flex cursor-pointer items-start gap-2'>
              <input
                id={blockId}
                type='checkbox'
                checked={blockUser}
                onChange={(event) => setBlockUser(event.target.checked)}
                disabled={pending || reported}
                className='mt-0.5'
              />
              <span>
                <span className='flex items-center gap-1.5 font-medium text-white'>
                  <Ban aria-hidden className='size-4 text-danger-text'/>
                  Block {user.username} from NotSoBot
                </span>
                <span className='mt-0.5 block text-muted'>Stops them from using NotSoBot anywhere.</span>
              </span>
            </label>
            {(blockUser) ? (
              <div className='mt-3'>
                <label htmlFor={reasonId} className='mb-1.5 block text-muted'>Block reason</label>
                <textarea
                  id={reasonId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={BLOCK_REASON_MAX}
                  rows={2}
                  disabled={pending}
                  className='input'
                />
                <BlockDurationSelect value={duration} onChange={setDuration} disabled={pending}/>
              </div>
            ) : null}
          </div>
        ) : null}

        {(error) ? (
          <DialogError className='mt-4'>{error}</DialogError>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>
            {(reported) ? 'Close' : 'Cancel'}
          </button>
          <button type='submit' className='btn btn-danger' disabled={pending}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(reported) ? 'Retry block' : `Mark reported${(blockUser && blockable) ? ' and block' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function formatScore(value: unknown): string {
  if (typeof value === 'number') {
    return (Number.isInteger(value)) ? String(value) : value.toFixed(3);
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}


function ListSkeleton() {
  return (
    <ul aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 6}, (_, i) => (
        <li key={i} className='flex items-center gap-3 px-4 py-3 sm:px-5'>
          <Skeleton className='h-4 w-44'/>
          <Skeleton className='h-5 w-20 bg-surface-2'/>
          <Skeleton className='h-5 w-14 bg-surface-2'/>
          <Skeleton className='h-5 w-36 bg-surface-2'/>
          <Skeleton className='size-6 rounded-full bg-surface-2'/>
          <Skeleton className='h-3 flex-1 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
