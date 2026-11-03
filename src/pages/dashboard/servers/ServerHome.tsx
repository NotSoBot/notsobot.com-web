import { useI18n } from '@/i18n';
import { ReportStatuses, type UserGuild } from '@/lib/api';
import {
  DEFAULT_GUILD_REMINDERS_FILTERS,
  useGuildCommandStatsQuery,
  useGuildLLMKnowledgeQuery,
  useGuildRemindersQuery,
  useGuildReportsQuery,
  useGuildScope,
  useGuildTagsQuery,
  useGuildVoicesQuery,
  useGuildWarningsQuery,
  useSavedFontsQuery,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatNumber, snowflakeTimestamp } from '@/lib/utils';

import { StatTile } from '../admin/adminUi';
import { LOCALE_CHOICES, TIMEZONE_CHOICES } from '../settings/settingsChoices';
import { Panel } from '../ui';
import { dashboardServerPath, type ServerTab } from './guildMeta';


// The server's Home page: a count or a value for each of its other pages, each opening it. Command stats are only
// for Manage Server, warnings and reports for moderators, the same people who can see those pages (the queries are shared
// with them, the commands page opens on the same 30 days). In the admin server modal (`onOpen`) staff see all of them
// but the reminders, and each opens the modal's tab instead.
export function ServerHome({ guild, onOpen }: {guild: UserGuild, onOpen?: (tab: ServerTab) => void}) {
  const { t } = useI18n();
  const staff = useGuildScope() === 'admin';
  const moderator = guild.editable.moderation || staff;
  const manager = guild.editable.settings || staff;
  // reminders are people's private notes, staff only get a count of them
  const reminderCount = guild.editable.reminders && !staff;
  const commands = useGuildCommandStatsQuery(guild.id, 30, manager);
  const knowledge = useGuildLLMKnowledgeQuery(guild.id);
  const tags = useGuildTagsQuery(guild.id, '');
  const voices = useGuildVoicesQuery(guild.id);
  const fonts = useSavedFontsQuery(guild.id);
  const reminders = useGuildRemindersQuery(guild.id, DEFAULT_GUILD_REMINDERS_FILTERS, reminderCount);
  const warnings = useGuildWarningsQuery(guild.id, {page: 0, query: ''}, moderator);
  const reports = useGuildReportsQuery(guild.id, {awaitingReply: null, page: 0, query: '', queue: false, status: ReportStatuses.OPEN, type: null}, moderator);

  const created = snowflakeTimestamp(guild.id);
  const blockRules = guild.rules.filter((rule) => !rule.value.allow).length;
  const allowRules = guild.rules.length - blockRules;
  const language = LOCALE_CHOICES.find((choice) => choice.value === guild.locale)?.label ?? t('shome.auto');
  const timezone = TIMEZONE_CHOICES.find((choice) => choice.value === guild.timezone)?.label ?? guild.timezone ?? 'UTC';
  const count = (value: number | undefined) => (value === undefined) ? '…' : formatNumber(value);
  const open = (tab: ServerTab) => (onOpen) ? {onClick: () => onOpen(tab)} : {to: dashboardServerPath(guild.id, tab)};

  return (
    <Panel title={t('shome.title')} accent='#5865f2' description={t('shome.description')}>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {(created) ? <StatTile label={t('shome.created')} value={formatDate(created)}/> : null}
        {(manager) ? (
          <>
            <StatTile label={t('shome.commands')} value={count(commands.data?.count)} {...open('commands')}/>
            <StatTile label={t('shome.members')} value={count(commands.data?.users)} {...open('commands')}/>
            <StatTile
              label={t('shome.top')}
              value={(commands.data) ? (commands.data.top[0]?.name ?? commands.data.top[0]?.command_id ?? t('shome.none_yet')) : '…'}
              {...open('commands')}
            />
          </>
        ) : null}
        <StatTile label={t('shome.language')} value={language} {...open('settings')}/>
        <StatTile label={t('shome.timezone')} value={timezone} {...open('settings')}/>
        <StatTile label={t('shome.prefixes')} value={count(guild.prefixes.length)} {...open('settings')}/>
        <StatTile label={t('shome.loggers')} value={count(guild.loggers.length)} {...open('settings')}/>
        <StatTile
          label={t('shome.personality')}
          value={t((guild.settings.ml_llm_personality) ? 'shome.custom' : 'shome.default')}
          {...open('notsoai')}
        />
        <StatTile label={t('shome.knowledge')} value={count(knowledge.data?.items.length)} {...open('notsoai')}/>
        <StatTile label={t('shome.tags')} value={count(tags.data?.pages[0]?.count)} {...open('tags')}/>
        <StatTile label={t('shome.voices')} value={count(voices.data?.count)} {...open('voices')}/>
        <StatTile label={t('shome.fonts')} value={count(fonts.data?.items.length)} {...open('fonts')}/>
        {(reminderCount) ? (
          <StatTile label={t('shome.reminders')} value={count(reminders.data?.count)} {...open('reminders')}/>
        ) : null}
        <StatTile label={t('shome.block_rules')} value={count(blockRules)} {...open('rules')}/>
        <StatTile label={t('shome.allow_rules')} value={count(allowRules)} {...open('rules')}/>
        {(moderator) ? (
          <>
            <StatTile
              label={t('shome.warnings')}
              value={count(warnings.data?.active)}
              tone='text-warning'
              {...open('warnings')}
            />
            <StatTile
              label={t('shome.reports')}
              value={count(reports.data?.count)}
              tone='text-danger-text'
              {...open('reports')}
            />
          </>
        ) : null}
      </div>
    </Panel>
  );
}
