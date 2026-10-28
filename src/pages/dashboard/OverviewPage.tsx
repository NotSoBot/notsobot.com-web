import { ArrowRight, ArrowUpRight, Crown, MessageSquareWarning, Settings } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';

import { isOwner, isStaff, useAuth } from '@/auth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { activeLanguage, maybeTranslate, translate, useI18n } from '@/i18n';
import {
  isDiscordGrantError,
  isScopeMismatch,
  useMeApplicationsQuery,
  useMeCommandsQuery,
  useMeFilesQuery,
  useMeGuildsQuery,
  useMeLLMMemoriesQuery,
  useMeRemindersQuery,
  useMeReportsQuery,
  useMeReportsUnreadQuery,
  useMeSettingsQuery,
  useMeTagsQuery,
  useMeVoicesQuery,
} from '@/lib/api/dashboardQueries';
import { UserPremiumTypes } from '@/lib/api';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDate, formatMemory, formatNumber, toDate } from '@/lib/utils';

import { ADMIN_SECTIONS, CONTENT_SECTIONS, OWNER_SECTIONS } from './DashboardLayout';
import { premiumLabel } from './premium';
import { REPORT_STAFF_NAME } from './reports/reportLabels';
import { Skeleton } from './ui';


// by path, the admin sections share some labels with the content ones (Reports, Tags, Voices)
const ADMIN_BLURBS: Record<string, string> = {
  [Routes.DASHBOARD_ADMIN_APPLICATIONS]: 'Every API application.',
  [Routes.DASHBOARD_ADMIN_FLAGS]: 'Media the safety scan flagged, for review.',
  [Routes.DASHBOARD_ADMIN_REPORTS]: 'Reports sent with the bot’s report commands.',
  [Routes.DASHBOARD_ADMIN_SERVERS]: 'Every server NotSoBot knows about, and their settings.',
  [Routes.DASHBOARD_ADMIN_TAG_DIRECTORY]: 'Review tags published to the tag directory.',
  [Routes.DASHBOARD_ADMIN_TAGS]: 'Every tag: personal, server and aliases.',
  [Routes.DASHBOARD_ADMIN_USERS]: 'Everyone NotSoBot knows about, with their flag history.',
  [Routes.DASHBOARD_ADMIN_VOICES]: 'Every voice cloned with the bot.',
  [Routes.DASHBOARD_OWNER_API_ACCESS]: 'Who can create API applications.',
  [Routes.DASHBOARD_OWNER_ENTITLEMENTS]: 'Discord subscriptions and the premium owners give.',
  [Routes.DASHBOARD_OWNER_IDENTITIES]: 'The accounts and proxies the api uses, and how each is holding up.',
  [Routes.DASHBOARD_OWNER_STATS]: 'Numbers across the whole API, like file storage.',
};

type DashboardSection = (typeof CONTENT_SECTIONS)[number];

// the sidebar's groups (children like Tag Directory as their own cards), alphabetical
function sortedSections(sections: ReadonlyArray<DashboardSection>): Array<DashboardSection> {
  return sections.flatMap((section) => [section, ...(section.children ?? [])]).sort((a, b) => maybeTranslate(a.label).localeCompare(maybeTranslate(b.label)));
}

// `in 20m`, `in 5h`, then the date once it's more than two days off
function formatUpcoming(value: string): string {
  const minutes = Math.max(1, Math.round((toDate(value).getTime() - Date.now()) / 60000));
  if (minutes < 60) {
    return translate('overview.in_minutes', {count: minutes});
  }
  const hours = Math.round(minutes / 60);
  return (hours < 48) ? translate('overview.in_hours', {count: hours}) : translate('overview.on_date', {date: formatDate(value)});
}

// what a content tile shows under its count; `progress` (0-1) is a bar along its bottom
interface ContentStat {
  // null while loading, undefined when it couldn't load
  count: number | null | undefined,
  detail?: ReactNode,
  progress?: number,
  // something new for the user, the tile is outlined in the brand colour
  highlight?: boolean,
}

// the language's name for the user card's settings (`ja` is Japanese, or japonés on the Spanish site), the code when
// the browser doesn't know it
function languageName(locale: string): string {
  try {
    return new Intl.DisplayNames([activeLanguage()], {type: 'language'}).of(locale) ?? locale;
  } catch {
    return locale;
  }
}

// `Asia/Tokyo` is Tokyo
function timezoneCity(timezone: string): string {
  return timezone.split('/').pop()!.replace(/_/g, ' ');
}

// a query's count for its tile, null while loading and undefined when it failed
function countOf(query: {isPending: boolean, isError: boolean}, count: number | undefined): number | null | undefined {
  return (query.isPending) ? null : (query.isError) ? undefined : count;
}


export function OverviewPage() {
  const { user } = useAuth();
  const { t, rich } = useI18n();
  const guilds = useMeGuildsQuery();
  const applications = useMeApplicationsQuery();
  const settings = useMeSettingsQuery();
  // the history page's unfiltered first page, so opening it after this is instant
  const commands = useMeCommandsQuery({guildId: null, channelId: null, commandId: null, commandType: null, result: null, page: 0});
  // the same query as the sidebar's badge
  const unreadReports = useMeReportsUnreadQuery().data?.count ?? 0;
  // the content tiles, from the same queries as those pages' default views so opening one after is instant
  const memories = useMeLLMMemoriesQuery();
  const files = useMeFilesQuery({query: '', sortBy: 'newest', temporary: null, page: 0});
  const reminders = useMeRemindersQuery();
  const reports = useMeReportsQuery({query: '', status: null, sortBy: 'updated', page: 0});
  const tags = useMeTagsQuery('', 'newest');
  const voices = useMeVoicesQuery();

  if (!user) {
    return null;
  }

  const premium = user.premium_type !== UserPremiumTypes.NONE;
  const manageable = guilds.data?.filter((guild) => guild.can_manage).length ?? 0;

  const now = Date.now();
  const nextReminder = reminders.data?.items
    .map((reminder) => reminder.timestamp_end)
    .filter((value): value is string => !!value && now < toDate(value).getTime())
    .sort((a, b) => toDate(a).getTime() - toDate(b).getTime())[0];
  const globalMemories = memories.data?.items.filter((memory) => !memory.guild_id).length ?? 0;
  const newestVoice = [...(voices.data?.items ?? [])].sort((a, b) => toDate(b.created).getTime() - toDate(a.created).getTime())[0];
  const contentStats: Record<string, ContentStat> = {
    [Routes.DASHBOARD_AI_MEMORY]: {
      count: countOf(memories, memories.data?.items.length),
      // the bar is the global ones, servers each have their own limit on top
      detail: (memories.data) ? `${t('overview.memories', {used: formatNumber(globalMemories), limit: formatNumber(memories.data.limits.global)})}${(globalMemories < memories.data.items.length) ? t('overview.memories_servers', {count: formatNumber(memories.data.items.length - globalMemories)}) : ''}` : undefined,
      progress: (memories.data?.limits.global) ? globalMemories / memories.data.limits.global : undefined,
    },
    [Routes.DASHBOARD_FILES]: {
      count: countOf(files, files.data?.total.count),
      detail: (files.data) ? ((files.data.total.count) ? t('overview.stored', {size: formatMemory(files.data.total.size, 1)}) : t('overview.nothing_uploaded')) : undefined,
    },
    [Routes.DASHBOARD_REMINDERS]: {
      count: countOf(reminders, reminders.data?.count),
      detail: (reminders.data) ? ((nextReminder) ? t('overview.next', {when: formatUpcoming(nextReminder)}) : t((reminders.data.count) ? 'overview.none_coming' : 'overview.none_set')) : undefined,
    },
    [Routes.DASHBOARD_REPORTS]: {
      count: countOf(reports, reports.data?.count),
      detail: (unreadReports) ? (
        <span className='inline-flex items-center gap-1.5 font-medium text-brand-text'>
          <span aria-hidden className='size-1.5 rounded-full bg-brand'/>
          {t('overview.with_updates', {count: formatNumber(unreadReports)})}
        </span>
      ) : (reports.data) ? t((reports.data.count) ? 'overview.caught_up' : 'overview.none_sent') : undefined,
      highlight: !!unreadReports,
    },
    [Routes.DASHBOARD_TAGS]: {
      count: countOf(tags, tags.data?.count),
      detail: (tags.data) ? ((tags.data.items[0]) ? rich('overview.newest', {b: (chunk) => <span className='text-muted'>{chunk}</span>}, {name: tags.data.items[0].name}) : t('overview.no_tags')) : undefined,
    },
    [Routes.DASHBOARD_VOICES]: {
      count: countOf(voices, voices.data?.count),
      detail: (voices.data) ? ((newestVoice) ? rich('overview.newest', {b: (chunk) => <span className='text-muted'>{chunk}</span>}, {name: newestVoice.name}) : t('overview.no_voices')) : undefined,
    },
  };

  // a user cached from before the api returned it has no field at all
  const accentColor = (typeof user.accent_color === 'number') ? `#${user.accent_color.toString(16).padStart(6, '0')}` : null;

  return (
    <div className='space-y-6'>
      <section className='card relative overflow-hidden p-5 sm:p-6'>
        {/* their discord profile color, like the banner strip on a discord profile. the content starts below it so text never sits on a color we don't pick */}
        <div
          aria-hidden
          className={cn('absolute inset-x-0 top-0 h-16', !accentColor && 'bg-surface-3')}
          style={(accentColor) ? {backgroundColor: accentColor} : undefined}
        />
        <div className='relative flex flex-col gap-4 pt-6 sm:flex-row sm:items-end'>
          <UserAvatar user={user} size={128} className='size-20 rounded-full border-4 border-surface bg-surface-3'/>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-2xl font-bold text-white sm:text-3xl'>{userDisplayTag(user)}</h1>
            <p className='mt-0.5 truncate font-mono text-xs text-subtle'>{user.id}</p>
          </div>
          {/* their tier, and the settings most people change (language and timezone) */}
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            <Link
              to={Routes.DASHBOARD_PREMIUM}
              title={t('overview.premium_title')}
              className={cn(
                'flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                premium ? 'border-warning/50 bg-warning/10 text-warning hover:bg-warning/20' : 'border-line-strong bg-surface-2 text-muted hover:text-white',
              )}
            >
              <Crown aria-hidden className='size-4'/>
              {premiumLabel(user.premium_type)}
            </Link>
            <Link
              to={Routes.DASHBOARD_SETTINGS}
              title={t('overview.settings_title')}
              className='flex w-fit min-w-0 items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-sm font-medium text-muted transition-colors hover:text-white'
            >
              <Settings aria-hidden className='size-4 shrink-0 text-[#00b0f4]'/>
              {(settings.isPending) ? (
                <Skeleton className='h-4 w-28'/>
              ) : (settings.data) ? (
                <span className='truncate'>
                  {(settings.data.locale) ? languageName(settings.data.locale) : t('overview.auto_language')}
                  <span className='text-subtle'> • </span>
                  {(settings.data.timezone) ? timezoneCity(settings.data.timezone) : 'UTC'}
                </span>
              ) : t('dash.nav.settings')}
            </Link>
          </div>
        </div>
      </section>

      {(unreadReports) ? <ReportUpdatesNotice count={unreadReports}/> : null}

      {/* the sidebar's Dashboard sections, alphabetical. Premium and Settings are in the user card, tags in Content below */}
      <section aria-labelledby='overview-dashboard'>
        <h2 id='overview-dashboard' className='section-label mb-3'>{t('dash.group.dashboard')}</h2>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4'>
          <Stat
            label={t('overview.applications')}
            to={Routes.DASHBOARD_APPLICATIONS}
            value={(applications.isPending) ? null : (applications.isError) ? '—' : formatNumber(applications.data.count)}
            detail={(applications.data) ? ((applications.data.can_create) ? t('overview.can_make', {limit: formatNumber(applications.data.limit)}) : t('overview.no_api')) : undefined}
            color='#3ba55c'
          />
          <Stat
            label={t('overview.commands')}
            to={Routes.DASHBOARD_COMMANDS}
            value={(commands.isPending) ? null : (commands.isError) ? '—' : formatNumber(commands.data.total)}
            detail={(commands.data?.first_used) ? t('overview.since', {date: formatDate(commands.data.first_used)}) : undefined}
            color='#5865f2'
          />
          <Stat
            label={t('overview.servers')}
            to={Routes.DASHBOARD_SERVERS}
            value={(guilds.isPending) ? null : (guilds.isError) ? '—' : formatNumber(guilds.data.length)}
            detail={
              (isScopeMismatch(guilds.error) || isDiscordGrantError(guilds.error)) ? t('overview.relogin')
                : (guilds.data) ? t('overview.can_manage', {count: formatNumber(manageable)}) : undefined
            }
            color='#faa81a'
          />
        </div>
      </section>

      <section aria-labelledby='overview-content'>
        <h2 id='overview-content' className='section-label mb-3'>{t('dash.group.content')}</h2>
        <ul className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3'>
          {sortedSections(CONTENT_SECTIONS).map((section) => (
            <li key={section.to}>
              <ContentTile section={section} stat={contentStats[section.to] ?? {count: undefined}}/>
            </li>
          ))}
        </ul>
      </section>

      {(isStaff(user)) ? <AdminSection id='overview-admin' title='Admin' sections={ADMIN_SECTIONS}/> : null}
      {(isOwner(user)) ? <AdminSection id='overview-owner' title='Owner' sections={OWNER_SECTIONS}/> : null}
    </div>
  );
}


// one of the user's content sections: what it is, how many they have and a line about them (the newest, what's next)
function ContentTile({ section, stat }: {section: DashboardSection, stat: ContentStat}) {
  const { count, detail, progress, highlight = false } = stat;
  return (
    <Link
      to={section.to}
      style={{'--cat': section.color} as CSSProperties}
      className={cn('group card card-hover flex h-full flex-col p-4 hover:border-[var(--cat)] sm:p-5', highlight && 'border-brand/50')}
    >
      {/* the arrow is hover only, so phones leave it out to fit the label */}
      <span className='flex items-center gap-2 sm:gap-2.5'>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--cat)_18%,transparent)] sm:size-8'>
          <section.icon aria-hidden className='size-4 text-[var(--cat)]'/>
        </span>
        <span className='min-w-0 truncate text-sm font-medium text-muted transition-colors group-hover:text-white'>{maybeTranslate(section.label)}</span>
        <ArrowUpRight aria-hidden className='ml-auto hidden size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 sm:block'/>
      </span>
      <span className='mt-4 block text-3xl leading-9 font-bold text-white tabular-nums'>
        {(count === null) ? <Skeleton className='h-9 w-14'/> : (count === undefined) ? '—' : formatNumber(count)}
      </span>
      <span className='mt-1 block min-h-4 truncate text-xs leading-4 text-subtle'>
        {(count === null) ? <Skeleton className='h-3 w-24 bg-surface-2'/> : detail}
      </span>
      {(progress !== undefined) ? (
        <span aria-hidden className='mt-3 block h-1 overflow-hidden rounded-full bg-surface-3'>
          <span className='block h-full rounded-full bg-[var(--cat)]' style={{width: `${Math.min(100, Math.round(progress * 100))}%`}}/>
        </span>
      ) : null}
    </Link>
  );
}


// staff only, the sidebar's Admin (and for owners, Owner) sections as cards
function AdminSection({ id, title, sections }: {id: string, title: string, sections: ReadonlyArray<DashboardSection>}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className='section-label mb-3'>{title}</h2>
      <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {sortedSections(sections).map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              style={{'--cat': section.color} as CSSProperties}
              className='group card card-hover flex h-full items-start gap-3 p-4 hover:border-[var(--cat)]'
            >
              <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--cat)_18%,transparent)]'>
                <section.icon aria-hidden className='size-5 text-[var(--cat)]'/>
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block font-medium text-white'>{section.label}</span>
                <span className='mt-0.5 block text-sm text-muted'>{ADMIN_BLURBS[section.to]}</span>
              </span>
              <ArrowRight aria-hidden className='mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-white'/>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}


// only while staff sent something on a report they haven't opened yet
function ReportUpdatesNotice({ count }: {count: number}) {
  const { plural } = useI18n();
  return (
    <Link to={Routes.DASHBOARD_REPORTS} className='group card card-hover flex items-center gap-3 border-brand/50 p-4 hover:border-brand'>
      <span className='relative flex size-9 shrink-0 items-center justify-center rounded-md bg-brand/15'>
        <MessageSquareWarning aria-hidden className='size-5 text-brand-text'/>
        <span aria-hidden className='absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-surface bg-brand'/>
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block font-medium text-white'>
          {plural('ui.report_updates', count)}
        </span>
        <span className='mt-0.5 block text-sm text-muted'>{plural('overview.report_staff', count, {staff: REPORT_STAFF_NAME})}</span>
      </span>
      <ArrowRight aria-hidden className='size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-white'/>
    </Link>
  );
}


function Stat({ label, value, detail, to, color }: {label: string, value: ReactNode | null, detail?: string, to: string, color: string}) {
  return (
    <Link to={to} className='card card-hover block min-w-0 p-4 sm:p-5' style={{'--cat': color} as CSSProperties}>
      <div className='flex items-center gap-2 text-sm text-muted'>
        <span aria-hidden className='size-2 shrink-0 rounded-full bg-[var(--cat)]'/>
        <span className='truncate'>{label}</span>
      </div>
      <div className='mt-2 flex h-9 items-center truncate text-3xl font-bold text-white tabular-nums'>
        {(value === null) ? <Skeleton className='h-9 w-16'/> : value}
      </div>
      {(detail) ? <div className='mt-1 truncate text-xs text-subtle'>{detail}</div> : null}
    </Link>
  );
}
