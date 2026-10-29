import { ShieldAlert, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { translate, useI18n } from '@/i18n';
import type { GuildContentUser, GuildWarning, UserGuild } from '@/lib/api';
import {
  GUILD_WARNINGS_PAGE_SIZE,
  errorMessage,
  useGuildWarningsMutation,
  useGuildWarningsQuery,
  type GuildWarningsAction,
} from '@/lib/api/dashboardQueries';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDateTime, formatNumber } from '@/lib/utils';

import { Chip, CopyButton, ExactDate, Pagination, selectAllScope, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { EmptyState, Panel, Skeleton } from '../ui';
import { formatSeconds, useReadOnlyMessage } from './guildMeta';


// The server's warnings from the bot's `warn`, newest first. Seeing and removing them needs Timeout Members, the same as
// the bot's commands; how long they stay active and when they're deleted are in the server settings.
export function WarningsSection({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const editable = guild.editable.moderation;
  const readOnlyMessage = useReadOnlyMessage();

  return (
    <Panel
      title={t('warnings.title')}
      accent='#fee75c'
      description={t('warnings.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('moderation')}
    >
      {(editable) ? <WarningsList guildId={guild.id}/> : <p className='text-sm text-muted'>{t('warnings.mods_only')}</p>}
    </Panel>
  );
}


// `user:<id>` and nothing else, the one search that's every warning a member has (so Clear all of theirs fits it)
const MEMBER_SEARCH = /^(?:user|member)\s*:\s*(\d{15,21})$/i;

// the people on this page's warnings by id (`GuildWarningsPage.users`), someone NotSoBot couldn't find is just their id
type WarningUsers = Record<string, GuildContentUser>;


// like the server's reports: a search box and page numbers, both in the url so a search can be linked to. The page scrolls
// inside its own box, the server's warning settings sit above it
function WarningsList({ guildId }: {guildId: string}) {
  const { t, plural, rich } = useI18n();
  const toast = useToast();
  const { searchParams, page, update } = useSearchParamState();
  const search = searchParams.get('q') || '';
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const memberId = MEMBER_SEARCH.exec(debouncedSearch)?.[1] ?? null;
  const [ busyKey, setBusyKey ] = useState<string | null>(null);
  const [ confirmingClear, setConfirmingClear ] = useState(false);
  // the warning whose Remove was clicked, deleted once it's confirmed
  const [ removing, setRemoving ] = useState<GuildWarning | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // back to the top of the list, not of the page (`useSearchParamState`'s `setPage` scrolls the window)
  const setPage = (value: number) => {
    update({page: (value <= 0) ? null : String(value + 1)}, false);
    listRef.current?.scrollTo({top: 0});
  };
  const filterBy = (value: string) => update({q: value});

  const { data, isPending, isError, error, isPlaceholderData, isFetching, refetch, isRefetching } = useGuildWarningsQuery(guildId, {page, query: debouncedSearch});
  const mutation = useGuildWarningsMutation(guildId);
  const warnings = data?.warnings ?? [];
  const users = data?.users ?? {};
  // `count`/`active` add up weights, so with an auto-warn among them they're more than `total`
  const weighted = !!data && data.count !== data.total;
  const steppingBack = useStepBackFromEmptyPage({
    page,
    setPage,
    data: (data) ? {items: data.warnings, count: data.total} : undefined,
    isPlaceholderData,
    pageSize: GUILD_WARNINGS_PAGE_SIZE,
  });
  const pagination = {
    page,
    count: data?.total ?? 0,
    pageSize: GUILD_WARNINGS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const member = (memberId) ? users[memberId] : undefined;

  const run = async (key: string, action: GuildWarningsAction, success: string): Promise<boolean> => {
    setBusyKey(key);
    try {
      await mutation.mutateAsync(action);
      toast(success);
      return true;
    } catch (error) {
      toast(errorMessage(error, translate('warnings.remove_error')), 'error');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          size='sm'
          value={search}
          onValueChange={filterBy}
          placeholder={t('warnings.search_placeholder')}
          aria-label={t('warnings.search_label')}
        />
        {(memberId && data?.count && !isPlaceholderData) ? (
          <button type='button' className='btn btn-secondary btn-sm h-9' disabled={mutation.isPending} onClick={() => setConfirmingClear(true)}>
            {t('warnings.clear_all')}
          </button>
        ) : null}
      </div>
      <p className='text-xs text-subtle'>
        {rich('warnings.search_hint', {code: (chunk) => <code className='text-code'>{chunk}</code>})}
      </p>

      {(data && data.total) ? (
        <p className='text-sm text-muted'>
          {plural((weighted) ? 'warnings.summary_weighted' : 'warnings.summary', data.count, {active: formatNumber(data.active), window: formatSeconds(data.window)})}
        </p>
      ) : null}

      {(isPending || steppingBack) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-16 w-full bg-surface-2'/>
          <Skeleton className='h-16 w-full bg-surface-2'/>
          <Skeleton className='h-16 w-full bg-surface-2'/>
        </div>
      ) : (isError && !warnings.length) ? (
        <div role='alert' className='flex items-center gap-3 text-sm text-danger-text'>
          {errorMessage(error, t('warnings.load_error'))}
          <button type='button' className='btn btn-secondary btn-sm' disabled={isRefetching} onClick={() => void refetch()}>{t('common.try_again')}</button>
        </div>
      ) : (!warnings.length || !data) ? (
        <EmptyState icon={<ShieldAlert className='size-10'/>} title={t((debouncedSearch) ? 'warnings.empty_filtered' : 'warnings.empty')}>
          {t((debouncedSearch) ? 'warnings.empty_filtered_description' : 'warnings.empty_description')}
        </EmptyState>
      ) : (
        <>
          <ul
            ref={listRef}
            className={cn(
              'max-h-[min(70vh,44rem)] divide-y divide-line overflow-y-auto overscroll-contain rounded-md border border-line transition-opacity',
              isPlaceholderData && 'opacity-60',
            )}
          >
            {warnings.map((warning) => (
              <WarningRow
                key={warning.id}
                warning={warning}
                users={users}
                window={data.window}
                disabled={mutation.isPending}
                onFilter={filterBy}
                onRemove={() => setRemoving(warning)}
              />
            ))}
          </ul>
          <Pagination {...pagination} className='mt-0'/>
        </>
      )}

      {(confirmingClear && memberId && data) ? (
        <ConfirmDialog
          title={t('warnings.clear_title')}
          description={t((weighted) ? 'warnings.clear_description_weighted' : 'warnings.clear_description', {
            count: formatNumber(data.count),
            user: (member) ? userDisplayTag(member) : memberId,
          })}
          confirmLabel={t('warnings.clear')}
          pending={busyKey === memberId}
          onConfirm={async () => {
            if (await run(memberId, {kind: 'clear', userId: memberId}, t('warnings.cleared'))) {
              setConfirmingClear(false);
            }
          }}
          onClose={() => setConfirmingClear(false)}
        />
      ) : null}

      {(removing) ? (
        <ConfirmDialog
          title={t('warnings.remove_title')}
          description={t((1 < removing.weight) ? 'warnings.remove_description_weighted' : 'warnings.remove_description', {
            id: removing.id,
            user: (users[removing.user_id]) ? userDisplayTag(users[removing.user_id]) : removing.user_id,
            count: formatNumber(removing.weight),
          })}
          confirmLabel={t('warnings.remove_confirm')}
          pending={busyKey === removing.id}
          onConfirm={async () => {
            if (await run(removing.id, {kind: 'remove', warningId: removing.id}, t('warnings.removed'))) {
              setRemoving(null);
            }
          }}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}


// their avatar, or Discord's default one when NotSoBot couldn't find them
function WarningAvatar({ user, id, className }: {user: GuildContentUser | undefined, id: string, className: string}) {
  return <UserAvatar user={user ?? {avatar: null, discriminator: '0', id}} size={64} loading='lazy' className={cn('shrink-0 rounded-full bg-surface-3', className)}/>;
}


// an id that fills the search box with `query` when clicked, with a copy button after it
function SearchableId({ id, query, label, className, onFilter }: {
  id: string,
  query: string,
  // what's shown, the id itself by default
  label?: string,
  className?: string,
  onFilter: (query: string) => void,
}) {
  const { t } = useI18n();
  return (
    <span className='flex min-w-0 items-center gap-0.5'>
      <button
        type='button'
        title={t('warnings.search_for', {query})}
        className={cn('min-w-0 cursor-pointer truncate rounded font-mono underline-offset-2 hover:text-brand-text hover:underline', className)}
        onClick={() => onFilter(query)}
      >
        {label ?? id}
      </button>
      <CopyButton value={id}/>
    </span>
  );
}


// a warned member or moderator: their avatar and name (a click searches only theirs), then their id. `small` is the
// moderator's, in the line under the reason
function WarningPerson({ user, id, scope, title, small = false, onFilter }: {
  user: GuildContentUser | undefined,
  id: string,
  scope: 'user' | 'moderator',
  title: string,
  small?: boolean,
  onFilter: (query: string) => void,
}) {
  return (
    <span className='flex min-w-0 items-center gap-1.5'>
      <button
        type='button'
        title={title}
        className='-mx-0.5 flex min-w-0 shrink items-center gap-1.5 rounded px-0.5 py-0.5 text-left hover:bg-surface-3'
        onClick={() => onFilter(`${scope}:${id}`)}
      >
        <WarningAvatar user={user} id={id} className={(small) ? 'size-4' : 'size-5'}/>
        {(user) ? <span className={cn('min-w-0 truncate', (small) ? 'text-muted' : 'text-sm font-medium text-white')}>{userDisplayTag(user)}</span> : null}
      </button>
      <SearchableId
        id={id}
        query={`${scope}:${id}`}
        className={(small || user) ? 'text-xs text-subtle' : 'text-sm text-fg'}
        onFilter={onFilter}
      />
    </span>
  );
}


// like the server's reports' rows: the warning's id in the top left with what it counts as next to it and Remove across
// from it, the warned member on one line under it, the reason in a copyable block, then who gave it with the date in the
// bottom right. Every id fills the search with itself when clicked (`#<id>`, `user:<id>`, `moderator:<id>`). Remove is
// labelled and the row lights up under the pointer, so it's clear which warning it's for; it asks before deleting
function WarningRow({ warning, users, window, disabled, onFilter, onRemove }: {
  warning: GuildWarning,
  users: WarningUsers,
  window: number,
  disabled: boolean,
  onFilter: (query: string) => void,
  onRemove: () => void,
}) {
  const { t, rich } = useI18n();
  const created = Date.parse(warning.created);
  const inactive = created < Date.now() - window * 1000;
  return (
    <li className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 transition-colors hover:bg-surface-2'>
      <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
        <SearchableId id={warning.id} query={`#${warning.id}`} label={`#${warning.id}`} className='text-sm leading-5 text-white' onFilter={onFilter}/>
        {(1 < warning.weight) ? <Chip title={t('warnings.weight_title', {count: formatNumber(warning.weight)})}>{t('warnings.weight', {count: formatNumber(warning.weight)})}</Chip> : null}
        {(inactive) ? <Chip title={t('warnings.inactive_title', {window: formatSeconds(window)})}>{t('warnings.inactive')}</Chip> : null}
      </div>
      <button
        type='button'
        className='-mr-1 flex h-7 cursor-pointer items-center gap-1 justify-self-end rounded-md px-2 text-xs text-muted transition-colors hover:bg-surface-3 hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-50'
        aria-label={(1 < warning.weight) ? t('warnings.remove_label_weighted', {id: warning.id, count: formatNumber(warning.weight)}) : t('warnings.remove_label', {id: warning.id})}
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 aria-hidden className='size-3.5'/>
        {t('warnings.remove')}
      </button>
      <div className='col-span-2 flex min-w-0'>
        <WarningPerson user={users[warning.user_id]} id={warning.user_id} scope='user' title={t('warnings.only_theirs')} onFilter={onFilter}/>
      </div>
      {/* in a block like the reports' reasons, with a copy button (Ctrl/Cmd+A inside selects only the reason) */}
      {(warning.reason) ? (
        <div className='relative col-span-2'>
          <pre className='max-h-40 overflow-auto rounded-md border border-line bg-deep py-1.5 pr-8 pl-2.5 font-mono text-xs break-words whitespace-pre-wrap text-fg focus:border-line-strong focus:outline-none' {...selectAllScope}>
            {warning.reason}
          </pre>
          <span className='absolute top-1 right-1'><CopyButton value={warning.reason}/></span>
        </div>
      ) : (
        <p className='col-span-2 text-sm text-muted italic'>{t('warnings.no_reason')}</p>
      )}
      {/* the date wraps under who gave it when there's no room, staying on the right */}
      <div className='col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-subtle'>
        <div className='flex min-w-0 items-center gap-x-1 whitespace-nowrap'>
          {rich('warnings.by', {
            // the moderator is drawn here, not put through the translation
            m: () => (
              <WarningPerson
                user={users[warning.moderator_id]}
                id={warning.moderator_id}
                scope='moderator'
                title={t('warnings.only_by_them')}
                small
                onFilter={onFilter}
              />
            ),
          }, {moderator: warning.moderator_id})}
        </div>
        <span className='ml-auto whitespace-nowrap'><ExactDate value={warning.created} format={formatDateTime}/></span>
      </div>
    </li>
  );
}
