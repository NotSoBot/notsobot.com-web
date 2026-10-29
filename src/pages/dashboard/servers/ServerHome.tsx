import { useI18n } from '@/i18n';
import { ReportStatuses, type UserGuild } from '@/lib/api';
import { DEFAULT_GUILD_REMINDERS_FILTERS, useGuildCommandStatsQuery, useGuildLLMKnowledgeQuery, useGuildRemindersQuery, useGuildReportsQuery, useGuildTagsQuery, useGuildWarningsQuery } from '@/lib/api/dashboardQueries';
import { formatDate, formatNumber, snowflakeTimestamp } from '@/lib/utils';

import { StatTile } from '../admin/adminUi';
import { LOCALE_CHOICES, TIMEZONE_CHOICES } from '../settings/settingsChoices';
import { Panel } from '../ui';
import { dashboardServerPath } from './guildMeta';


// The server's Home page: a count or a value for each of its other pages, each opening it. Command stats are only
// for Manage Server, warnings and reports for moderators, the same people who can see those pages (the queries are shared
// with them, the commands page opens on the same 30 days).
export function ServerHome({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const moderator = guild.editable.moderation;
  const manager = guild.editable.settings;
  const commands = useGuildCommandStatsQuery(guild.id, 30, manager);
  const knowledge = useGuildLLMKnowledgeQuery(guild.id);
  const tags = useGuildTagsQuery(guild.id, '');
  const reminders = useGuildRemindersQuery(guild.id, DEFAULT_GUILD_REMINDERS_FILTERS, guild.editable.reminders);
  const warnings = useGuildWarningsQuery(guild.id, {page: 0, query: ''}, moderator);
  const reports = useGuildReportsQuery(guild.id, {awaitingReply: null, page: 0, query: '', queue: false, status: ReportStatuses.OPEN, type: null}, moderator);

  const created = snowflakeTimestamp(guild.id);
  const blockRules = guild.rules.filter((rule) => !rule.value.allow).length;
  const allowRules = guild.rules.length - blockRules;
  const language = LOCALE_CHOICES.find((choice) => choice.value === guild.locale)?.label ?? t('shome.auto');
  const timezone = TIMEZONE_CHOICES.find((choice) => choice.value === guild.timezone)?.label ?? guild.timezone ?? 'UTC';
  const count = (value: number | undefined) => (value === undefined) ? '…' : formatNumber(value);

  return (
    <Panel title={t('shome.title')} accent='#5865f2' description={t('shome.description')}>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {(created) ? <StatTile label={t('shome.created')} value={formatDate(created)}/> : null}
        {(manager) ? (
          <>
            <StatTile label={t('shome.commands')} value={count(commands.data?.count)} to={dashboardServerPath(guild.id, 'commands')}/>
            <StatTile label={t('shome.members')} value={count(commands.data?.users)} to={dashboardServerPath(guild.id, 'commands')}/>
            <StatTile
              label={t('shome.top')}
              value={(commands.data) ? (commands.data.top[0]?.name ?? commands.data.top[0]?.command_id ?? t('shome.none_yet')) : '…'}
              to={dashboardServerPath(guild.id, 'commands')}
            />
          </>
        ) : null}
        <StatTile label={t('shome.language')} value={language} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile label={t('shome.timezone')} value={timezone} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile label={t('shome.prefixes')} value={count(guild.prefixes.length)} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile label={t('shome.loggers')} value={count(guild.loggers.length)} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile
          label={t('shome.personality')}
          value={t((guild.settings.ml_llm_personality) ? 'shome.custom' : 'shome.default')}
          to={dashboardServerPath(guild.id, 'notsoai')}
        />
        <StatTile label={t('shome.knowledge')} value={count(knowledge.data?.items.length)} to={dashboardServerPath(guild.id, 'notsoai')}/>
        <StatTile label={t('shome.tags')} value={count(tags.data?.pages[0]?.count)} to={dashboardServerPath(guild.id, 'tags')}/>
        {(guild.editable.reminders) ? (
          <StatTile label={t('shome.reminders')} value={count(reminders.data?.count)} to={dashboardServerPath(guild.id, 'reminders')}/>
        ) : null}
        <StatTile label={t('shome.block_rules')} value={count(blockRules)} to={dashboardServerPath(guild.id, 'rules')}/>
        <StatTile label={t('shome.allow_rules')} value={count(allowRules)} to={dashboardServerPath(guild.id, 'rules')}/>
        {(moderator) ? (
          <>
            <StatTile
              label={t('shome.warnings')}
              value={count(warnings.data?.active)}
              tone='text-warning'
              to={dashboardServerPath(guild.id, 'warnings')}
            />
            <StatTile
              label={t('shome.reports')}
              value={count(reports.data?.count)}
              tone='text-danger-text'
              to={dashboardServerPath(guild.id, 'reports')}
            />
          </>
        ) : null}
      </div>
    </Panel>
  );
}
