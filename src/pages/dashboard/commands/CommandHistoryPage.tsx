// Every command attempt the bot reported for the user (`/users/@me/commands`), newest first, filterable by server,
// channel, command, type and how it ended. Read only. The filters live in the URL (`?server=`, `?channel=`, `?command=`,
// `?type=`, `?result=`), `?server=0` is DMs.

import { ExternalLink, SquareTerminal, X } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useI18n } from '@/i18n';
import { CommandTypes, type Command, type CommandType, type MeCommandUse } from '@/lib/api';
import { ME_COMMANDS_PAGE_SIZE, errorMessage, useMeCommandsQuery, useMeGuildsQuery } from '@/lib/api/dashboardQueries';
import { useCommandsQuery } from '@/lib/api/queries';
import { enabledCommandVariants } from '@/lib/commandAvailability';
import { commandPath } from '@/lib/commandPaths';
import { cn, formatDate, formatDateTime, formatExactDateTime, formatNumber, NO_AUTOFILL } from '@/lib/utils';

import { Chip, FilterButton, FiltersButton, IdFilter, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { COMMAND_TYPE_LABELS, RESULT_LABELS, resultInfo, TONE_FILLS } from './commandLabels';


// the api doesn't page past this offset
const MAX_OFFSET = 100000;
const DMS = '0';

function commandLabel(use: MeCommandUse): string {
  const name = use.command_name ?? use.command_id;
  return (use.command_type === CommandTypes.APPLICATION_SLASH) ? `/${name}` : name;
}

function channelUrl(use: MeCommandUse): string {
  return `https://discord.com/channels/${use.guild_id ?? '@me'}/${use.channel_id}`;
}


export function CommandHistoryPage() {
  const { t, language } = useI18n();
  const { searchParams, page, update, setPage } = useSearchParamState();
  const serverId = searchParams.get('server') || null;
  const channelId = searchParams.get('channel') || '';
  const commandId = searchParams.get('command') || '';
  const typeParam = searchParams.get('type');
  const commandType = (typeParam !== null && typeParam in COMMAND_TYPE_LABELS) ? Number(typeParam) : null;
  const result = searchParams.get('result') || null;
  const filtered = !!(serverId || channelId || commandId || commandType !== null || result);
  // the panel starts closed like the other dashboard pages', the button counts the ones in use
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [serverId, channelId, commandId, commandType !== null, result].filter(Boolean).length;

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeCommandsQuery({
    guildId: serverId,
    channelId: channelId || null,
    commandId: commandId || null,
    commandType,
    result,
    page,
  });
  // only for names and the server filter, the history still shows (with ids) when these can't load
  const guilds = useMeGuildsQuery();
  const commands = useCommandsQuery(language);
  const guildNames = useMemo(() => new Map((guilds.data ?? []).map((guild) => [guild.id, guild.name])), [guilds.data]);
  // only the variants still offered get a link; a disabled (removed) command shows its name without one, since its
  // page on the commands site no longer exists
  const commandTypes = useMemo(() => new Map((commands.data ?? []).map((command) => [command.id, enabledCommandVariants(command).map((x) => x.type)])), [commands.data]);

  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_COMMANDS_PAGE_SIZE});
  const pagination = {
    page,
    count: Math.min(data?.count ?? 0, MAX_OFFSET + ME_COMMANDS_PAGE_SIZE),
    pageSize: ME_COMMANDS_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };
  const serverName = (guildId: string | null) => (guildId) ? (guildNames.get(guildId) ?? null) : t('history.dms');

  return (
    <>
      <DashboardHeader
        title={t('dash.nav.commands')}
        description={t('history.description')}
      >
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='command-history-filters'/>
      </DashboardHeader>

      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <SummaryCard
          label={t((filtered) ? 'history.matching' : 'history.used')}
          color='#5865f2'
          value={(isPending) ? null : (data) ? formatNumber(data.count) : '—'}
          detail={(filtered && data) ? t('history.of_total', {total: formatNumber(data.total)}) : undefined}
        />
        <SummaryCard
          label={t('history.first')}
          color='#3ba55c'
          value={(isPending) ? null : (data?.first_used) ? (
            <time dateTime={data.first_used} title={formatExactDateTime(data.first_used)}>{formatDate(data.first_used)}</time>
          ) : '—'}
          detail={(data?.first_used) ? formatDateTime(data.first_used) : undefined}
        />
      </div>

      {(data?.results.length) ? (
        <ResultBreakdown results={data.results} selected={result} onSelect={(value) => update({result: value})}/>
      ) : null}

      <div id='command-history-filters' hidden={!filtersOpen} className='card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('history.server')}</span>
          <select className='input' value={serverId ?? ''} onChange={(event) => update({server: event.target.value})}>
            <option value=''>{t('history.any_server')}</option>
            <option value={DMS}>{t('history.dms')}</option>
            {(guilds.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((guild) => (
              <option key={guild.id} value={guild.id}>{guild.name}</option>
            ))}
            {/* a server they've left (or the list couldn't load) still filters, by its id */}
            {(serverId && serverId !== DMS && !guildNames.has(serverId)) ? <option value={serverId}>{t('history.server_id', {id: serverId})}</option> : null}
          </select>
        </label>
        <IdFilter label={t('history.channel_id')} placeholder={t('history.any_channel')} value={channelId} onChange={(value) => update({channel: value})}/>
        <CommandFilter value={commandId} commands={commands.data} onChange={(value) => update({command: value})}/>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('history.type')}</span>
          <select className='input' value={(commandType === null) ? '' : String(commandType)} onChange={(event) => update({type: event.target.value || null})}>
            <option value=''>{t('history.any_type')}</option>
            {Object.entries(COMMAND_TYPE_LABELS).map(([ value, label ]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('history.result')}</span>
          <select className='input' value={result ?? ''} onChange={(event) => update({result: event.target.value || null})}>
            <option value=''>{t('history.any_result')}</option>
            {Object.entries(RESULT_LABELS).map(([ value, { label } ]) => <option key={value} value={value}>{label}</option>)}
            {(result && !(result in RESULT_LABELS)) ? <option value={result}>{result}</option> : null}
          </select>
        </label>
      </div>

      {(filtered) ? (
        <div className='mb-4'>
          <button type='button' className='btn btn-secondary btn-sm' onClick={() => update({server: null, channel: null, command: null, type: null, result: null})}>
            <X aria-hidden className='size-4'/>
            {t('commands.clear_filters')}
          </button>
        </div>
      ) : null}

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title={t('history.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<SquareTerminal className='size-10'/>} title={t((filtered) ? 'history.empty_filtered' : 'history.empty')}>
          {(filtered) ? null : t('history.empty_description')}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_COMMANDS_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <ul className={cn('card divide-y divide-line transition-opacity', isPlaceholderData && 'opacity-60')}>
            {items.map((use, index) => (
              <CommandRow
                key={`${use.timestamp}-${use.channel_id}-${use.command_id}-${use.command_type}-${index}`}
                use={use}
                serverName={serverName(use.guild_id)}
                commandTypes={commandTypes.get(use.command_id)}
                onFilter={update}
              />
            ))}
          </ul>
          {(pagination.count > ME_COMMANDS_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}
    </>
  );
}


function SummaryCard({ label, value, detail, color }: {label: string, value: ReactNode | null, detail?: string, color: string}) {
  return (
    <div className='card p-4 sm:p-5' style={{'--cat': color} as CSSProperties}>
      <div className='flex items-center gap-2 text-sm text-muted'>
        <span aria-hidden className='size-2 rounded-full bg-[var(--cat)]'/>
        {label}
      </div>
      <div className='mt-2 text-3xl font-bold text-white tabular-nums'>
        {(value === null) ? <Skeleton className='h-9 w-24'/> : value}
      </div>
      {(detail) ? <div className='mt-1 text-xs text-subtle'>{detail}</div> : null}
    </div>
  );
}


// how the matching uses ended (every filter but the result's applies), as a bar of their shares and a legend whose
// entries filter by that result; picking the selected one again clears it
function ResultBreakdown({ results, selected, onSelect }: {
  results: Array<{count: number, result: string}>,
  selected: string | null,
  onSelect: (result: string | null) => void,
}) {
  const { t } = useI18n();
  const total = results.reduce((sum, item) => sum + item.count, 0);
  const percent = (count: number) => (total) ? count / total * 100 : 0;
  return (
    <section aria-label={t('history.breakdown')} className='card mb-4 p-4 sm:p-5'>
      <div aria-hidden className='flex h-2 overflow-hidden rounded-full bg-surface-3'>
        {results.map((item) => (
          <span
            key={item.result}
            className={cn('h-full transition-opacity', TONE_FILLS[resultInfo(item.result).tone], selected && selected !== item.result && 'opacity-30')}
            style={{width: `${percent(item.count)}%`}}
          />
        ))}
      </div>
      <ul className='mt-3 flex flex-wrap gap-2'>
        {results.map((item) => {
          const info = resultInfo(item.result);
          const active = selected === item.result;
          return (
            <li key={item.result}>
              <button
                type='button'
                aria-pressed={active}
                title={(active) ? t('history.show_all') : t('history.only_result', {result: info.label.toLowerCase()})}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                  (active) ? 'border-brand/70 bg-surface-3 text-white' : 'border-line text-muted hover:bg-surface-2 hover:text-white',
                )}
                onClick={() => onSelect((active) ? null : item.result)}
              >
                <span aria-hidden className={cn('size-2 rounded-full', TONE_FILLS[info.tone])}/>
                {info.label}
                <span className='font-semibold text-white tabular-nums'>{formatNumber(item.count)}</span>
                <span className='text-xs text-subtle tabular-nums'>{Math.round(percent(item.count))}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


// free text (`tag` also matches its subcommands like `tag show`), suggesting the bot's command ids (disabled ones too,
// they're still in the history); lands in the URL once typing stops
function CommandFilter({ value, commands, onChange }: {value: string, commands: Array<Command> | undefined, onChange: (value: string | null) => void}) {
  const { t } = useI18n();
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && debounced.length <= 64) {
      onChange(debounced || null);
    }
    // only when the typed value settles
  }, [debounced]);

  const ids = useMemo(() => (commands ?? []).map((command) => command.id).sort(), [commands]);

  return (
    <label className='text-sm'>
      <span className='mb-1 block text-subtle'>{t('history.command')}</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          list='command-history-commands'
          autoComplete='off'
          {...NO_AUTOFILL}
          maxLength={64}
          placeholder={t('history.any_command')}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        {(input) ? (
          <button
            type='button'
            aria-label={t('history.clear_command')}
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
      <datalist id='command-history-commands'>
        {ids.map((id) => <option key={id} value={id}/>)}
      </datalist>
    </label>
  );
}


function CommandRow({ use, serverName, commandTypes, onFilter }: {
  use: MeCommandUse,
  // null for a server they aren't in anymore
  serverName: string | null,
  // every variant the command has, for linking to it on the commands page (undefined if it isn't listed)
  commandTypes: Array<CommandType> | undefined,
  onFilter: (changes: Record<string, string | null>) => void,
}) {
  const { t } = useI18n();
  const result = (use.result) ? resultInfo(use.result) : null;
  const label = commandLabel(use);
  const linkable = !!commandTypes?.includes(use.command_type);

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#5865f2]/15'>
        <SquareTerminal className='size-5 text-[#5865f2]'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          {(linkable) ? (
            <Link to={commandPath(use.command_id, use.command_type, commandTypes!)} className='font-mono font-medium text-white hover:text-brand-text hover:underline'>
              {label}
            </Link>
          ) : (
            <span className='font-mono font-medium text-white'>{label}</span>
          )}
          <FilterButton label={t('history.only_command', {command: use.command_id})} onClick={() => onFilter({command: use.command_id})}/>
          <Chip>{COMMAND_TYPE_LABELS[use.command_type] ?? t('history.command')}</Chip>
          {(result) ? <Chip tone={result.tone}>{result.label}</Chip> : null}
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          {/* on phones the time goes here, there's no room for it on the right */}
          <time dateTime={use.timestamp} title={formatExactDateTime(use.timestamp)} className='sm:hidden'>{formatDateTime(use.timestamp)}</time>
          <span className='inline-flex max-w-full min-w-0 shrink-0 items-center'>
            {(serverName) ? <span className='truncate'>{serverName}</span> : <span className='font-mono'>{t('history.server_id', {id: use.guild_id})}</span>}
            <FilterButton label={t('history.only_server')} onClick={() => onFilter({server: use.guild_id ?? DMS})}/>
          </span>
          <span className='inline-flex items-center font-mono'>
            #{use.channel_id}
            <FilterButton label={t('history.only_channel')} onClick={() => onFilter({channel: use.channel_id})}/>
          </span>
          <a href={channelUrl(use)} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 whitespace-nowrap text-code hover:underline'>
            {t('history.open_channel')}
            <ExternalLink aria-hidden className='size-3'/>
          </a>
        </div>
      </div>
      <time dateTime={use.timestamp} title={formatExactDateTime(use.timestamp)} className='hidden shrink-0 text-right text-xs text-subtle sm:block'>
        {formatDateTime(use.timestamp)}
      </time>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 5}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
          </div>
          <Skeleton className='h-3 w-28 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
