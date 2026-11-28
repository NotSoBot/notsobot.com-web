import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { useI18n } from '@/i18n';
import { ReportStatuses, type UserGuild } from '@/lib/api';
import {
  DEFAULT_GUILD_REMINDERS_FILTERS,
  useGuildCommandStatsQuery,
  useGuildCreditsQuery,
  useGuildLLMKnowledgeQuery,
  useGuildRemindersQuery,
  useGuildReportsQuery,
  useGuildScope,
  useGuildTagsQuery,
  useGuildVoicesQuery,
  useGuildWarningsQuery,
  useSavedFontsQuery,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatNumber, snowflakeTimestamp } from '@/lib/utils';

import { LOCALE_CHOICES, TIMEZONE_CHOICES } from '../settings/settingsChoices';
import { dashboardServerPath, isModerationHidden, SERVER_TAB_GROUPS, type ServerTab } from './guildMeta';


type HomeGroup = (typeof SERVER_TAB_GROUPS)[number]['id'];

// the sidebar's groups, Moderation moved up: its open reports and active warnings are what's waiting on someone
const HOME_GROUPS: ReadonlyArray<HomeGroup> = ['overview', 'moderation', 'features', 'server'];


// The server's Home page: a count or a value for each of its other pages, each opening it, in a card per group of the
// sidebar (under the same names). Command stats are only for Manage Server, warnings and reports for moderators, the same
// people who can see those pages (the queries are shared with them, the commands page opens on the same 30 days). In the
// admin server modal (`onOpen`) staff see all of them but the reminders, and each opens the modal's tab instead.
export function ServerHome({ guild, onOpen }: {guild: UserGuild, onOpen?: (tab: ServerTab) => void}) {
  const { t } = useI18n();
  const staff = useGuildScope() === 'admin';
  const moderator = guild.editable.moderation || staff;
  const manager = guild.editable.settings || staff;
  // a member without Manage Server or Timeout Members gets the rules and loggers empty, no count for them
  const seesModeration = !isModerationHidden(guild);
  // reminders are people's private notes, staff only get a count of them
  const reminderCount = guild.editable.reminders && !staff;
  const commands = useGuildCommandStatsQuery(guild.id, 30, manager);
  const knowledge = useGuildLLMKnowledgeQuery(guild.id);
  const tags = useGuildTagsQuery(guild.id, '');
  const voices = useGuildVoicesQuery(guild.id);
  const fonts = useSavedFontsQuery(guild.id);
  const credits = useGuildCreditsQuery(guild.id);
  const reminders = useGuildRemindersQuery(guild.id, DEFAULT_GUILD_REMINDERS_FILTERS, reminderCount);
  const warnings = useGuildWarningsQuery(guild.id, {page: 0, query: ''}, moderator);
  const reports = useGuildReportsQuery(guild.id, {awaitingReply: null, page: 0, query: '', queue: false, status: ReportStatuses.OPEN, type: null}, moderator);

  const created = snowflakeTimestamp(guild.id);
  const blockRules = guild.rules.filter((rule) => !rule.value.allow).length;
  const allowRules = guild.rules.length - blockRules;
  const language = LOCALE_CHOICES.find((choice) => choice.value === guild.locale)?.label ?? t('shome.auto');
  const timezone = TIMEZONE_CHOICES.find((choice) => choice.value === guild.timezone)?.label ?? guild.timezone ?? 'UTC';
  // still loading is "…", a count that failed to load is "—" instead of loading forever
  const count = (value: number | undefined, failed = false) => (value !== undefined) ? formatNumber(value) : (failed) ? '—' : '…';
  const open = (tab: ServerTab) => (onOpen) ? {onClick: () => onOpen(tab)} : {to: dashboardServerPath(guild.id, tab)};

  // a card's rows, the ones this person can't see left out (a card with none isn't shown)
  const rows: Record<HomeGroup, Array<ReactNode>> = {
    overview: [
      (created) ? <HomeRow key='created' label={t('shome.created')} value={formatDate(created)}/> : null,
      (manager) ? <HomeRow key='commands' label={t('shome.commands')} value={count(commands.data?.count, commands.isError)} {...open('commands')}/> : null,
      (manager) ? <HomeRow key='members' label={t('shome.members')} value={count(commands.data?.users, commands.isError)} {...open('commands')}/> : null,
      (manager) ? (
        <HomeRow
          key='top'
          label={t('shome.top')}
          value={(commands.data) ? (commands.data.top[0]?.name ?? commands.data.top[0]?.command_id ?? t('shome.none_yet')) : count(undefined, commands.isError)}
          {...open('commands')}
        />
      ) : null,
    ],
    moderation: [
      // what's waiting on a moderator comes first
      (moderator) ? <HomeRow key='reports' label={t('shome.reports')} value={count(reports.data?.count, reports.isError)} tone='text-danger-text' {...open('reports')}/> : null,
      (moderator) ? <HomeRow key='warnings' label={t('shome.warnings')} value={count(warnings.data?.active, warnings.isError)} tone='text-warning-text' {...open('warnings')}/> : null,
      (seesModeration) ? <HomeRow key='block' label={t('shome.block_rules')} value={count(blockRules)} {...open('rules')}/> : null,
      (seesModeration) ? <HomeRow key='allow' label={t('shome.allow_rules')} value={count(allowRules)} {...open('rules')}/> : null,
    ],
    features: [
      <HomeRow key='personality' label={t('shome.personality')} value={t((guild.settings.ml_llm_personality) ? 'shome.custom' : 'shome.default')} {...open('notsoai')}/>,
      <HomeRow key='knowledge' label={t('shome.knowledge')} value={count(knowledge.data?.items.length, knowledge.isError)} {...open('notsoai')}/>,
      <HomeRow key='tags' label={t('shome.tags')} value={count(tags.data?.pages[0]?.count, tags.isError)} {...open('tags')}/>,
      <HomeRow key='voices' label={t('shome.voices')} value={count(voices.data?.count, voices.isError)} {...open('voices')}/>,
      <HomeRow key='fonts' label={t('shome.fonts')} value={count(fonts.data?.items.length, fonts.isError)} {...open('fonts')}/>,
      (reminderCount) ? <HomeRow key='reminders' label={t('shome.reminders')} value={count(reminders.data?.count, reminders.isError)} {...open('reminders')}/> : null,
    ],
    server: [
      <HomeRow key='language' label={t('shome.language')} value={language} {...open('settings')}/>,
      <HomeRow key='timezone' label={t('shome.timezone')} value={timezone} {...open('settings')}/>,
      <HomeRow key='prefixes' label={t('shome.prefixes')} value={count(guild.prefixes.length)} {...open('settings')}/>,
      (seesModeration) ? <HomeRow key='loggers' label={t('shome.loggers')} value={count(guild.loggers.length)} {...open('settings')}/> : null,
      <HomeRow
        key='credits'
        label={t('shome.credits')}
        // not one total: NotSoAI's week and the voices' week can't pay for each other, only what was given is shared
        value={(credits.data) ? t('shome.credits_split', {
          ai: formatNumber(credits.data.balance.weekly_left),
          voices: formatNumber(credits.data.voices.weekly_left),
          given: formatNumber(Math.max(0, credits.data.balance.refill_left)),
        }) : count(undefined, credits.isError)}
        {...open('credits')}
      />,
    ],
  };

  return (
    <section aria-label={t('shome.title')}>
      <p className='mb-3 text-sm text-muted'>{t('shome.description')}</p>
      <div className='grid items-start gap-3 sm:grid-cols-2'>
        {HOME_GROUPS.map((group) => {
          const shown = rows[group].filter(Boolean);
          return (shown.length) ? (
            <section key={group} className='card min-w-0 overflow-hidden'>
              <h2 className='section-label border-b border-line px-3 py-2'>{t(`server_tab.group.${group}`)}</h2>
              <ul className='divide-y divide-line'>{shown}</ul>
            </section>
          ) : null;
        })}
      </div>
    </section>
  );
}


// one line of a card: what it is, then its count or value. With somewhere to go the whole line opens it
function HomeRow({ label, value, tone = 'text-white', to, onClick }: {
  label: string,
  value: string,
  tone?: string,
  to?: string,
  onClick?: () => void,
}) {
  const className = 'flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm';
  const interactive = 'group/row cursor-pointer transition-colors hover:bg-surface-2';
  const content = (
    <>
      <span className='shrink-0 text-muted'>{label}</span>
      <span className={cn('min-w-0 text-right font-semibold break-words tabular-nums group-hover/row:underline', (value === '0') ? 'text-subtle' : tone)}>{value}</span>
    </>
  );
  return (
    <li>
      {(onClick) ? (
        <button type='button' className={cn(className, interactive)} onClick={onClick}>{content}</button>
      ) : (to) ? (
        <Link to={to} className={cn(className, interactive)}>{content}</Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}
