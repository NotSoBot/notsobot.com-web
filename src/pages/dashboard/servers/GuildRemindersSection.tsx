import { AlarmClock, Send } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useI18n, type TranslationKey } from '@/i18n';
import type { GuildReminder, GuildReminderSort, GuildReminderWithin, UserGuild } from '@/lib/api';
import { GUILD_REMINDERS_PAGE_SIZE, errorMessage, useGuildReminderMoveMutation, useGuildRemindersQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

import { Chip, ExactDate, FiltersButton, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { EmptyState, Panel, Skeleton } from '../ui';
import { EntryMention, useReadOnlyMessage } from './guildMeta';
import { Owner } from './GuildTagsSection';


const SORTS: Array<{value: GuildReminderSort, label: TranslationKey}> = [
  {value: 'next', label: 'sreminders.sort.next'},
  {value: 'last', label: 'sreminders.sort.last'},
  {value: 'newest', label: 'sreminders.sort.newest'},
  {value: 'oldest', label: 'sreminders.sort.oldest'},
];

const WITHIN: Array<{value: GuildReminderWithin, label: TranslationKey}> = [
  {value: 'day', label: 'sreminders.within.day'},
  {value: 'week', label: 'sreminders.within.week'},
  {value: 'month', label: 'sreminders.within.month'},
];

function parseSort(value: string | null): GuildReminderSort {
  return SORTS.find((sort) => sort.value === value)?.value ?? 'next';
}

function parseWithin(value: string | null): GuildReminderWithin | null {
  return WITHIN.find((option) => option.value === value)?.value ?? null;
}

function parseBool(value: string | null): boolean | null {
  return (value === 'true') ? true : (value === 'false') ? false : null;
}


// The reminders set to go off in the server, the soonest first, like `remind list server`. A moderator can't delete
// someone's reminder, only move it out of the server into the owner's dms (`remind delete server`), so that's the one
// action here. Seeing them needs Manage Messages, the same as moving them
export function GuildRemindersSection({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const editable = guild.editable.reminders;
  const readOnlyMessage = useReadOnlyMessage();

  return (
    <Panel
      title={t('sreminders.title')}
      accent='#fee75c'
      description={t('sreminders.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('reminders')}
    >
      {(editable) ? <RemindersList guildId={guild.id}/> : <p className='text-sm text-muted'>{t('sreminders.managers_only')}</p>}
    </Panel>
  );
}


// like the server's reports: a search box with the filters behind a button, and page numbers. The filters live in the
// url, so a filtered list can be linked to
function RemindersList({ guildId }: {guildId: string}) {
  const { t, rich } = useI18n();
  const toast = useToast();
  const { searchParams, page, update, setPage } = useSearchParamState();
  const sort = parseSort(searchParams.get('sort'));
  const within = parseWithin(searchParams.get('within'));
  const allDay = parseBool(searchParams.get('all_day'));
  const search = searchParams.get('q') || '';
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isPending, isError, error, isPlaceholderData, isFetching, refetch, isRefetching } = useGuildRemindersQuery(guildId, {
    allDay,
    page,
    query: debouncedSearch,
    sort,
    within,
  });
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: GUILD_REMINDERS_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: GUILD_REMINDERS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [sort !== 'next', within !== null, allDay !== null].filter(Boolean).length;
  const filtered = !!(within || allDay !== null || debouncedSearch);

  const mutation = useGuildReminderMoveMutation(guildId);
  const [ moving, setMoving ] = useState<GuildReminder | null>(null);

  return (
    <div>
      <div className='mb-3 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={search}
          onValueChange={(value) => update({q: value})}
          placeholder={t('sreminders.search_placeholder')}
          aria-label={t('sreminders.search_label')}
        />
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='guild-reminder-filters'/>
      </div>
      <p className='mb-3 text-xs text-subtle'>
        {rich('sreminders.search_hint', {code: (chunk) => <code className='text-code'>{chunk}</code>})}
      </p>

      <div id='guild-reminder-filters' hidden={!filtersOpen} className='mb-3 grid gap-3 rounded-md border border-line p-3 sm:grid-cols-3'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('sreminders.sort')}</span>
          <select className='input' value={sort} onChange={(event) => update({sort: (event.target.value === 'next') ? null : event.target.value})}>
            {SORTS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('sreminders.goes_off')}</span>
          <select className='input' value={within ?? ''} onChange={(event) => update({within: event.target.value})}>
            <option value=''>{t('sreminders.any_time')}</option>
            {WITHIN.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('sreminders.type')}</span>
          <select className='input' value={(allDay === null) ? '' : String(allDay)} onChange={(event) => update({all_day: event.target.value})}>
            <option value=''>{t('sreminders.any')}</option>
            <option value='false'>{t('sreminders.at_time')}</option>
            <option value='true'>{t('sreminders.all_day')}</option>
          </select>
        </label>
      </div>

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <div role='alert' className='flex items-center gap-3 text-sm text-danger-text'>
          {errorMessage(error, t('sreminders.load_error'))}
          <button type='button' className='btn btn-secondary btn-sm' disabled={isRefetching} onClick={() => void refetch()}>{t('common.try_again')}</button>
        </div>
      ) : (!items.length) ? (
        <EmptyState icon={<AlarmClock className='size-10'/>} title={t((filtered) ? 'sreminders.empty_filtered' : 'sreminders.empty')}>
          {t((filtered) ? 'sreminders.empty_filtered_description' : 'sreminders.empty_description')}
        </EmptyState>
      ) : (
        <>
          <Pagination {...pagination} className='mt-0 mb-3'/>
          <ul className={cn('divide-y divide-line rounded-md border border-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} disabled={mutation.isPending} onMove={() => setMoving(reminder)}/>
            ))}
          </ul>
          <Pagination {...pagination}/>
        </>
      )}

      {(moving) ? (
        <ConfirmDialog
          title={t('sreminders.move_title')}
          description={t('sreminders.move_description', {user: moving.user.username})}
          confirmLabel={t('sreminders.move')}
          tone='primary'
          pending={mutation.isPending}
          onConfirm={() => {
            mutation.mutate(moving.id, {
              onSuccess: () => {
                toast(t('sreminders.moved'));
                setMoving(null);
              },
              onError: (error) => toast(errorMessage(error, t('sreminders.move_error')), 'error'),
            });
          }}
          onClose={() => setMoving(null)}
        />
      ) : null}
    </div>
  );
}


// when it goes off (`timestamp_start`) up top, `timestamp_end` is only the end of an all-day or ranged one
function ReminderRow({ reminder, disabled, onMove }: {reminder: GuildReminder, disabled: boolean, onMove: () => void}) {
  const { t } = useI18n();
  const format = (reminder.is_all_day) ? formatDate : formatDateTime;
  return (
    <li className='flex items-start gap-3 px-3 py-2.5'>
      <div className='min-w-0 flex-1 space-y-1'>
        <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-white'>
          <span>
            <ExactDate value={reminder.timestamp_start} format={format}/>
            {(reminder.timestamp_end) ? <span className='text-muted'> – <ExactDate value={reminder.timestamp_end} format={format}/></span> : null}
          </span>
          {(reminder.is_all_day) ? <Chip tone='brand'>{t('sreminders.all_day')}</Chip> : null}
        </p>
        <p className='text-sm break-words whitespace-pre-wrap text-fg'>
          {reminder.content || <span className='text-subtle italic'>{t('sreminders.no_message')}</span>}
        </p>
        <p className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-subtle'>
          <Owner user={reminder.user}/>
          {(reminder.channel_id) ? (
            <>
              <span aria-hidden>•</span>
              <EntryMention type='channel' id={reminder.channel_id}/>
            </>
          ) : null}
          <span aria-hidden>•</span>
          <span className='font-mono'>#{reminder.id}</span>
        </p>
      </div>
      <button type='button' className='btn btn-secondary btn-sm shrink-0' disabled={disabled} onClick={onMove}>
        <Send aria-hidden className='size-3.5'/>
        {t('sreminders.move')}
      </button>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='space-y-2'>
      <Skeleton className='h-18 w-full bg-surface-2'/>
      <Skeleton className='h-18 w-full bg-surface-2'/>
      <Skeleton className='h-18 w-full bg-surface-2'/>
    </div>
  );
}
