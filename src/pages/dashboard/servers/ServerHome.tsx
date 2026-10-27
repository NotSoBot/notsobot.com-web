import { ReportStatuses, type UserGuild } from '@/lib/api';
import { DEFAULT_GUILD_REMINDERS_FILTERS, useGuildCommandStatsQuery, useGuildLLMKnowledgeQuery, useGuildRemindersQuery, useGuildReportsQuery, useGuildTagsQuery, useGuildWarningsQuery } from '@/lib/api/dashboardQueries';
import { formatDate, snowflakeTimestamp } from '@/lib/utils';

import { StatTile } from '../admin/adminUi';
import { LOCALE_CHOICES, TIMEZONE_CHOICES } from '../settings/settingsChoices';
import { Panel } from '../ui';
import { dashboardServerPath } from './guildMeta';


// The server's Home page: a count or a value for each of its other pages, each opening it. Command stats are only
// for Manage Server, warnings and reports for moderators, the same people who can see those pages (the queries are shared
// with them, the commands page opens on the same 30 days).
export function ServerHome({ guild }: {guild: UserGuild}) {
  const moderator = guild.editable.moderation;
  const manager = guild.editable.settings;
  const commands = useGuildCommandStatsQuery(guild.id, 30, manager);
  const knowledge = useGuildLLMKnowledgeQuery(guild.id);
  const tags = useGuildTagsQuery(guild.id, '');
  const reminders = useGuildRemindersQuery(guild.id, DEFAULT_GUILD_REMINDERS_FILTERS, guild.editable.reminders);
  const warnings = useGuildWarningsQuery(guild.id, null, moderator);
  const reports = useGuildReportsQuery(guild.id, {awaitingReply: null, page: 0, query: '', queue: false, status: ReportStatuses.OPEN, type: null}, moderator);

  const created = snowflakeTimestamp(guild.id);
  const blockRules = guild.rules.filter((rule) => !rule.value.allow).length;
  const allowRules = guild.rules.length - blockRules;
  const language = LOCALE_CHOICES.find((choice) => choice.value === guild.locale)?.label ?? 'Automatic';
  const timezone = TIMEZONE_CHOICES.find((choice) => choice.value === guild.timezone)?.label ?? guild.timezone ?? 'UTC';
  const count = (value: number | undefined) => (value === undefined) ? '…' : value.toLocaleString();

  return (
    <Panel title='Overview' accent='#5865f2' description='This server at a glance. Pick anything to open its page.'>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {(created) ? <StatTile label='Created' value={formatDate(created)}/> : null}
        {(manager) ? (
          <>
            <StatTile label='Commands, last 30 days' value={count(commands.data?.count)} to={dashboardServerPath(guild.id, 'commands')}/>
            <StatTile label='Members using commands' value={count(commands.data?.users)} to={dashboardServerPath(guild.id, 'commands')}/>
            <StatTile
              label='Most used command'
              value={(commands.data) ? (commands.data.top[0]?.name ?? commands.data.top[0]?.command_id ?? 'None yet') : '…'}
              to={dashboardServerPath(guild.id, 'commands')}
            />
          </>
        ) : null}
        <StatTile label='Language' value={language} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile label='Timezone' value={timezone} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile label='Prefixes' value={count(guild.prefixes.length)} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile label='Loggers' value={count(guild.loggers.length)} to={dashboardServerPath(guild.id, 'settings')}/>
        <StatTile
          label='AI personality'
          value={(guild.settings.ml_llm_personality) ? 'Custom' : 'Default'}
          to={dashboardServerPath(guild.id, 'notsoai')}
        />
        <StatTile label='NotSoAI knowledge' value={count(knowledge.data?.items.length)} to={dashboardServerPath(guild.id, 'notsoai')}/>
        <StatTile label='Tags' value={count(tags.data?.pages[0]?.count)} to={dashboardServerPath(guild.id, 'tags')}/>
        {(guild.editable.reminders) ? (
          <StatTile label='Reminders' value={count(reminders.data?.count)} to={dashboardServerPath(guild.id, 'reminders')}/>
        ) : null}
        <StatTile label='Block rules' value={count(blockRules)} to={dashboardServerPath(guild.id, 'rules')}/>
        <StatTile label='Allow rules' value={count(allowRules)} to={dashboardServerPath(guild.id, 'rules')}/>
        {(moderator) ? (
          <>
            <StatTile
              label='Active warnings'
              value={count(warnings.data?.pages[0]?.active)}
              tone='text-warning'
              to={dashboardServerPath(guild.id, 'warnings')}
            />
            <StatTile
              label='Open reports'
              value={count(reports.data?.count)}
              tone='text-danger'
              to={dashboardServerPath(guild.id, 'reports')}
            />
          </>
        ) : null}
      </div>
    </Panel>
  );
}
