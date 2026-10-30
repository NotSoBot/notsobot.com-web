import { AlarmClock, ArrowLeft, AudioLines, ChevronsUpDown, Blocks, Brain, ChartColumn, Crown, Files, Fingerprint, Flag, Inbox, KeyRound, LayoutDashboard, MessageSquareWarning, RadioTower, Server, Settings, ShieldCheck, SquareTerminal, Tags, type LucideIcon, Users } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router';

import { isOwner, isStaff, useAuth } from '@/auth';
import { BlockedNotice } from '@/components/ui/BlockedNotice';
import { StaffWarningsNotice } from '@/components/ui/StaffWarningsNotice';
import { ToastProvider } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { maybeTranslate, useI18n } from '@/i18n';
import { useMeGuildQuery, useMeReportsUnreadQuery } from '@/lib/api/dashboardQueries';
import { cn, formatNumber } from '@/lib/utils';

import { premiumLabel } from './premium';
import { GuildIcon } from './servers/GuildIcon';
import { dashboardServerPath, SERVER_TAB_GROUPS } from './servers/guildMeta';


interface Section {
  to: string,
  // a translation key, or plain English on the staff pages
  label: string,
  icon: LucideIcon,
  color: string,
  end?: boolean,
  // shown indented under this one, its own option in the phone menu
  children?: ReadonlyArray<Section>,
}

// the account: Overview first, the rest alphabetical (export/delete your data is at the bottom of Settings)
export const DASHBOARD_SECTIONS: ReadonlyArray<Section> = [
  {to: Routes.DASHBOARD, label: 'dash.nav.overview', icon: LayoutDashboard, color: '#5865f2', end: true},
  {to: Routes.DASHBOARD_APPLICATIONS, label: 'dash.nav.applications', icon: Blocks, color: '#3ba55c'},
  {to: Routes.DASHBOARD_COMMANDS, label: 'dash.nav.commands', icon: SquareTerminal, color: '#5865f2'},
  {to: Routes.DASHBOARD_PREMIUM, label: 'dash.nav.premium', icon: Crown, color: '#f0b232'},
  {to: Routes.DASHBOARD_SERVERS, label: 'dash.nav.servers', icon: Server, color: '#faa81a'},
  {to: Routes.DASHBOARD_SETTINGS, label: 'dash.nav.settings', icon: Settings, color: '#00b0f4'},
];

// things the user made with the bot, alphabetical
export const CONTENT_SECTIONS: ReadonlyArray<Section> = [
  {to: Routes.DASHBOARD_AI_MEMORY, label: 'dash.nav.ai_memory', icon: Brain, color: '#eb459e'},
  {to: Routes.DASHBOARD_FILES, label: 'dash.nav.files', icon: Files, color: '#00b0f4'},
  {to: Routes.DASHBOARD_REMINDERS, label: 'dash.nav.reminders', icon: AlarmClock, color: '#faa81a'},
  {to: Routes.DASHBOARD_REPORTS, label: 'dash.nav.reports', icon: MessageSquareWarning, color: '#ed4245'},
  {to: Routes.DASHBOARD_TAGS, label: 'dash.nav.tags', icon: Tags, color: '#3ba55c'},
  {to: Routes.DASHBOARD_VOICES, label: 'dash.nav.voices', icon: AudioLines, color: '#eb459e'},
];

// only shown to NotSoBot staff, owners and moderators (the routes are guarded by <RequireStaff/> too); alphabetical
export const ADMIN_SECTIONS: ReadonlyArray<Section> = [
  {to: Routes.DASHBOARD_ADMIN_APPLICATIONS, label: 'Applications', icon: Blocks, color: '#3ba55c'},
  {to: Routes.DASHBOARD_ADMIN_FLAGS, label: 'Content Flags', icon: Flag, color: '#ed4245'},
  {to: Routes.DASHBOARD_ADMIN_REPORTS, label: 'Reports', icon: Inbox, color: '#faa81a'},
  {to: Routes.DASHBOARD_ADMIN_SERVERS, label: 'Servers', icon: Server, color: '#faa81a'},
  {
    to: Routes.DASHBOARD_ADMIN_TAGS,
    label: 'Tags',
    icon: Tags,
    color: '#00b0f4',
    end: true,
    children: [{to: Routes.DASHBOARD_ADMIN_TAG_DIRECTORY, label: 'Tag Directory', icon: ShieldCheck, color: '#3ba55c'}],
  },
  {to: Routes.DASHBOARD_ADMIN_USERS, label: 'Users', icon: Users, color: '#5865f2'},
  {to: Routes.DASHBOARD_ADMIN_VOICES, label: 'Voices', icon: AudioLines, color: '#eb459e'},
];

// only shown to NotSoBot owners, not moderators (the routes are guarded by <RequireStaff owner/> too); alphabetical
export const OWNER_SECTIONS: ReadonlyArray<Section> = [
  {to: Routes.DASHBOARD_OWNER_API_ACCESS, label: 'API Access', icon: KeyRound, color: '#3ba55c'},
  {to: Routes.DASHBOARD_OWNER_ENTITLEMENTS, label: 'Entitlements', icon: Crown, color: '#f0b232'},
  {to: Routes.DASHBOARD_OWNER_IDENTITIES, label: 'Identities', icon: Fingerprint, color: '#eb459e'},
  {to: Routes.DASHBOARD_OWNER_STATS, label: 'Stats', icon: ChartColumn, color: '#00b0f4'},
  {to: Routes.DASHBOARD_OWNER_VOICE_NODES, label: 'Voice Nodes', icon: RadioTower, color: '#5865f2'},
];


export function DashboardLayout() {
  const { user } = useAuth();
  const { t } = useI18n();
  // reports with something from staff they haven't seen, as a badge on Reports
  const unreadReports = useMeReportsUnreadQuery();
  const contentBadges = {[Routes.DASHBOARD_REPORTS]: unreadReports.data?.count ?? 0};
  // inside one of your servers the sidebar is that server's pages instead, so there's only ever one menu
  const serverMatch = useMatch({path: Routes.DASHBOARD_SERVER, end: false});

  return (
    <ToastProvider>
      <div className='container-page py-6 sm:py-8'>
        {(user?.blocked) ? <BlockedNotice user={user} className='mb-6'/> : null}
        <StaffWarningsNotice className='mb-6'/>
        <div className='grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8'>
          {/* sticky, so on desktop it scrolls on its own once it's taller than the window; otherwise its bottom (the admin
              links) could only be reached by scrolling the page all the way down */}
          <aside
            aria-label={t('dash.label')}
            className='lg:sticky lg:top-24 lg:-mr-2 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2 lg:pb-2 lg:[scrollbar-width:thin]'
          >
            {(serverMatch?.params.guildId) ? (
              <ServerSidebar guildId={serverMatch.params.guildId}/>
            ) : (
              <>
                {(user) ? (
                  <div className='mb-4 hidden items-center gap-3 px-1 lg:flex'>
                    <UserAvatar user={user} size={64} className='size-10 rounded-full bg-surface-3'/>
                    <div className='min-w-0'>
                      <div className='truncate font-semibold text-white'>{user.username}</div>
                      <div className='truncate text-xs text-subtle'>{premiumLabel(user.premium_type)}</div>
                    </div>
                  </div>
                ) : null}
                <SectionMenu
                  groups={[
                    {label: 'dash.group.dashboard', sections: DASHBOARD_SECTIONS},
                    {label: 'dash.group.content', sections: CONTENT_SECTIONS, badges: contentBadges},
                    ...((isStaff(user)) ? [{label: 'Admin', sections: ADMIN_SECTIONS}] : []),
                    ...((isOwner(user)) ? [{label: 'Owner', sections: OWNER_SECTIONS}] : []),
                  ]}
                />
              </>
            )}
          </aside>

          <div className='min-w-0'>
            <Outlet/>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}


// One of your servers' pages in its groups, with the way back to the server list on top. The server's name and icon
// come from the page's own query (it's the same one, so it's only fetched once)
function ServerSidebar({ guildId }: {guildId: string}) {
  const { t } = useI18n();
  const { data: guild } = useMeGuildQuery(guildId);
  return (
    <>
      <Link to={Routes.DASHBOARD_SERVERS} className='mb-3 inline-flex items-center gap-1.5 px-1 text-sm text-muted hover:text-white lg:mb-4'>
        <ArrowLeft aria-hidden className='size-4'/>
        {t('dash.all_servers')}
      </Link>
      {(guild) ? (
        <div className='mb-4 hidden items-center gap-3 px-1 lg:flex'>
          <GuildIcon guild={guild} size={64} className='size-10 shrink-0 text-xs'/>
          <div className='min-w-0'>
            <div className='truncate font-semibold text-white' title={guild.name}>{guild.name}</div>
            <div className='truncate text-xs text-subtle'>{t((guild.owner) ? 'dash.role.owner' : (Object.values(guild.editable).some(Boolean)) ? 'dash.role.manager' : 'dash.role.member')}</div>
          </div>
        </div>
      ) : null}
      <SectionMenu
        groups={SERVER_TAB_GROUPS.map((group) => ({
          label: `server_tab.group.${group.id}`,
          sections: group.tabs.map((tab) => ({
            to: dashboardServerPath(guildId, tab.id),
            label: `server_tab.${tab.id}`,
            icon: tab.icon,
            color: tab.color,
            // Home is the server's own url, every other page is under it
            end: tab.id === 'home',
          })),
        }))}
      />
    </>
  );
}


interface SectionGroup {
  // a translation key, or plain English on the staff pages
  label: string,
  sections: ReadonlyArray<Section>,
  // counts by section path, see `SectionList`
  badges?: Record<string, number>,
}

// A sidebar's sections in their groups: a list per group on desktop, one menu on phones (`SectionSelect`) instead of a
// row of buttons per group
function SectionMenu({ groups }: {groups: ReadonlyArray<SectionGroup>}) {
  const { t } = useI18n();
  return (
    <>
      <SectionSelect groups={groups}/>
      {groups.map((group, i) => (
        <nav key={group.label} aria-label={t('dash.sections', {group: maybeTranslate(group.label)})} className={cn('hidden lg:block', (i) ? 'lg:mt-6' : null)}>
          <h2 className='section-label mb-2 px-1'>{maybeTranslate(group.label)}</h2>
          <SectionList sections={group.sections} badges={group.badges}/>
        </nav>
      ))}
    </>
  );
}


// Phones: what looks like a button with the open page's icon is the native <select> (invisible, over it), so tapping
// it opens the phone's own picker with the groups in it. The open page is the longest section path the url is under,
// so a tag's url (`/dashboard/tags/<id>`) is Tags and the tag directory beats admin Tags. A count from `badges` shows
// in the option's name, on the button when it's the open page, and as a dot when it's another one
function SectionSelect({ groups }: {groups: ReadonlyArray<SectionGroup>}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const path = pathname.replace(/\/$/, '');
  const options = groups.map((group) => ({
    label: group.label,
    sections: group.sections.flatMap((section) => [section, ...(section.children ?? [])]).map((section) => ({
      ...section,
      badge: group.badges?.[section.to] ?? 0,
    })),
  }));
  const all = options.flatMap((group) => group.sections);
  const current = all
    .filter((section) => path === section.to || path.startsWith(`${section.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const elsewhere = all.some((section) => section !== current && section.badge);

  return (
    <div className='relative lg:hidden'>
      <div aria-hidden className='flex items-center gap-2.5 rounded-md border border-brand/70 bg-surface-3 px-3 py-2.5 text-sm text-white'>
        {(current) ? <current.icon className='size-4 shrink-0 text-muted'/> : null}
        <span className='min-w-0 flex-1 truncate'>{(current) ? maybeTranslate(current.label) : t('dash.choose_page')}</span>
        {(current?.badge) ? (
          <span className='min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 font-semibold text-white tabular-nums'>{current.badge.toLocaleString()}</span>
        ) : null}
        {(elsewhere) ? <span className='size-2 shrink-0 rounded-full bg-brand'/> : null}
        <ChevronsUpDown className='size-4 shrink-0 text-muted'/>
      </div>
      <select
        aria-label={t((elsewhere) ? 'dash.page_updates' : 'dash.page')}
        className='absolute inset-0 size-full cursor-pointer opacity-0'
        value={current?.to ?? ''}
        onChange={(event) => navigate(event.target.value)}
      >
        {(current) ? null : <option value='' disabled>{t('dash.choose_page')}</option>}
        {options.map((group) => (
          <optgroup key={group.label} label={maybeTranslate(group.label)}>
            {group.sections.map((section) => (
              <option key={section.to} value={section.to}>
                {maybeTranslate(section.label)}{(section.badge) ? t('dash.new_count', {count: formatNumber(section.badge)}) : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}


// A group's links, desktop only (phones get `SectionSelect`). `badges`: counts by section path, shown on the right of the
// link when there's any
function SectionList({ sections, badges }: {sections: ReadonlyArray<Section>, badges?: Record<string, number>}) {
  const { t } = useI18n();
  return (
    <ul className='flex flex-col gap-0.5'>
      {sections.flatMap((section): Array<Section & {nested?: boolean, last?: boolean}> => [
        section,
        ...(section.children ?? []).map((child, i, children) => ({...child, nested: true, last: i === children.length - 1})),
      ]).map((section) => (
        <li key={section.to} className={cn((section.nested) && 'relative pl-8')}>
          {/* a tree line: an elbow from the parent's icon into this link, plus a stem on to the next child */}
          {(section.nested) ? (
            <>
              <span aria-hidden className='pointer-events-none absolute -top-2.5 left-5 h-[30px] w-2.5 rounded-bl-md border-b border-l border-subtle/70'/>
              {(!section.last) ? (
                <span aria-hidden className='pointer-events-none absolute top-5 -bottom-0.5 left-5 border-l border-subtle/70'/>
              ) : null}
            </>
          ) : null}
          <NavLink
            to={section.to}
            end={section.end}
            className={({ isActive }) => cn(
              'group flex items-center gap-2.5 rounded-md border border-transparent px-3 py-2 text-sm whitespace-nowrap transition-colors',
              (isActive) ? 'bg-surface-3 text-white' : 'text-muted hover:bg-surface-2 hover:text-white',
            )}
          >
            <section.icon aria-hidden className='size-4 shrink-0 text-muted transition-colors group-hover:text-white group-aria-[current=page]:text-white'/>
            {maybeTranslate(section.label)}
            {(badges?.[section.to]) ? (
              <span className='ml-auto min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 font-semibold text-white tabular-nums'>
                {badges[section.to].toLocaleString()}
                <span className='sr-only'>{t('dash.with_updates')}</span>
              </span>
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
