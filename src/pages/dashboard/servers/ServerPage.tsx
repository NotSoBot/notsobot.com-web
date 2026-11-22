import { AlarmClock, AlertTriangle, ArrowUpRight, Ban, Crown, ExternalLink, Eye, SquareTerminal, Tags as TagsIcon, type LucideIcon } from 'lucide-react';
import { Link, Outlet, useMatch, useOutletContext, useParams } from 'react-router';

import { Chip } from '@/components/ui/Chip';
import { CopyableValue } from '@/components/ui/CopyableValue';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { ApiErrorCodes, ApiRequestError, type GuildEditableArea, type UserGuild } from '@/lib/api';
import {
  errorMessage,
  isDiscordGrantError,
  isScopeMismatch,
  useGuildCreditsQuery,
  useGuildLLMKnowledgeQuery,
  useGuildTagsQuery,
  useGuildVoicesQuery,
  useMeGuildQuery,
  useMeRemindersQuery,
  useMeTagsCountQuery,
  useSavedFontsQuery,
} from '@/lib/api/dashboardQueries';
import { cn, discordGuildUrl, formatNumber } from '@/lib/utils';

import { PanelSkeleton, Skeleton, UnsavedChangesGuard } from '../ui';
import { GuildIcon } from './GuildIcon';
import { AREA_LABEL, AREA_PERMISSION } from './guildMeta';
import { ScopeMismatchCard } from './ServersPage';
import { useDirtyGroups, type SettingsGroup } from './useDirtyGroups';


// what each tab's page (`./tabs`, a module each so opening one doesn't download the others) gets from `ServerPage`.
// Nothing a tab draws is imported here, or it'd come with every one of them
interface ServerOutletContext {
  guild: UserGuild,
  setDirty: (group: SettingsGroup) => (dirty: boolean) => void,
}

export function useServer(): ServerOutletContext {
  return useOutletContext<ServerOutletContext>();
}


// One of your servers (`/dashboard/servers/:guildId`): everything you can see and change about it, plus shortcuts to your
// own reminders and tags in it. Each section is its own page under it (Home is the server's own url), listed in the
// dashboard's sidebar while a server is open, and they share the server loaded here. Leaving a page (or the server) with
// unsaved settings asks first.
export function ServerPage() {
  const { t } = useI18n();
  const { guildId = '' } = useParams();
  const { data: guild, isPending, error, refetch, isRefetching } = useMeGuildQuery(guildId);
  const { setter, any } = useDirtyGroups<SettingsGroup>();
  const home = !!useMatch({path: Routes.DASHBOARD_SERVER, end: true});

  return (
    <>
      {/* not for a server that didn't load, there's no Home to show them on */}
      {(home && (guild || isPending)) ? <HomeQueries guildId={guildId}/> : null}
      {(guild) ? (
        // keyed by the server: switching servers keeps this route mounted, so without it one server's unsaved edits,
        // open editors, dialogs and in-flight saves would carry over onto the next (like the admin modal's `ServerDetails`)
        <ServerLayout key={guild.id} guild={guild} setDirty={setter}/>
      ) : (isPending) ? (
        <div aria-busy='true'>
          <h1 className='sr-only'>{t('server.loading')}</h1>
          <div className='mb-6 flex items-center gap-3'>
            <Skeleton className='size-12 rounded-2xl'/>
            <div>
              <Skeleton className='h-7 w-56'/>
              <Skeleton className='mt-2 h-4 w-40 bg-surface-2'/>
            </div>
          </div>
          <div className='space-y-4'><PanelSkeleton rows={2}/><PanelSkeleton rows={3}/></div>
        </div>
      ) : (
        <ServerLoadError error={error} onRetry={() => refetch()} retrying={isRefetching}/>
      )}
      <UnsavedChangesGuard when={any}/>
    </>
  );
}


function ServerLoadError({ error, onRetry, retrying }: {error: Error | null, onRetry: () => void, retrying: boolean}) {
  const { t } = useI18n();
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_SERVER);
  if (isScopeMismatch(error) || isDiscordGrantError(error)) {
    return (
      <>
        <h1 className='sr-only'>{t('server.load_error')}</h1>
        <ScopeMismatchCard reason={(isDiscordGrantError(error)) ? 'grant' : 'scope'}/>
      </>
    );
  }
  return (
    <div className='card px-6 py-16 text-center'>
      <AlertTriangle className='mx-auto mb-4 size-14 text-danger-text'/>
      <h1 className='mb-3 text-2xl font-bold text-white'>{t((notFound) ? 'server.not_found' : 'server.load_error')}</h1>
      <p className='mb-6 text-muted'>{(notFound) ? t('server.not_found_description') : errorMessage(error)}</p>
      {(notFound) ? null : <button type='button' className='btn btn-secondary' disabled={retrying} onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}


// the server's name and who you are in it, your things in it, then the open page
function ServerLayout({ guild, setDirty }: {guild: UserGuild, setDirty: ServerOutletContext['setDirty']}) {
  const { t } = useI18n();
  const canEditAnything = Object.values(guild.editable).some(Boolean);
  const lockedAreas = (Object.keys(AREA_LABEL) as Array<GuildEditableArea>).filter((area) => !guild.editable[area]);
  // on a phone the page picker and this header come before any content on every one of the server's pages, so there the
  // shortcuts and the list of what's view only are only on Home (the chip stays, and each panel says when it's locked)
  const home = !!useMatch({path: Routes.DASHBOARD_SERVER, end: true});
  const homeOnly = (home) ? undefined : 'max-sm:hidden';

  return (
    <>
      <header className='mb-4 flex flex-wrap items-start justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <GuildIcon guild={guild} size={48} className='size-12 shrink-0 text-sm'/>
          <div className='min-w-0'>
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              <h1 className='truncate text-2xl font-bold text-white sm:text-3xl' title={guild.name}>{guild.name}</h1>
              {(guild.owner) ? <Chip tone='warning' title={t('server.owner_title')} className='gap-1'><Crown aria-hidden className='size-3'/>{t('server.owner')}</Chip> : null}
              {(guild.blocked) ? <Chip tone='danger' title={guild.blocked_reason || t('server.blocked_title')}>{t('server.blocked')}</Chip> : null}
            </div>
            <div className='mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted'>
              <CopyableValue value={guild.id} truncate={0}/>
              <a href={discordGuildUrl(guild.id)} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-code hover:underline'>
                {t('common.open_discord')}
                <ExternalLink aria-hidden className='size-3.5'/>
              </a>
            </div>
          </div>
        </div>
        <Chip
          tone={(canEditAnything) ? 'success' : 'neutral'}
          title={t((canEditAnything) ? ((lockedAreas.length) ? 'server.can_manage_some' : 'server.can_manage_all') : 'server.view_only_title')}
          // at least this wide, the Spanish and Portuguese labels are longer
          className='min-w-24 justify-center'
        >
          {t((canEditAnything) ? 'dash.role.manager' : 'dash.view_only')}
        </Chip>
      </header>
      <YourStuffLinks guildId={guild.id} className={homeOnly}/>

      <div className='mt-6 space-y-4'>
        {(lockedAreas.length) ? <ViewOnlyBanner lockedAreas={lockedAreas} all={!canEditAnything} className={homeOnly}/> : null}
        {(guild.blocked) ? (
          <p role='status' className='flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            <Ban aria-hidden className='mt-0.5 size-4 shrink-0 text-danger-text'/>
            <span>{t('server.blocked_notice')}{(guild.blocked_reason) ? t('server.blocked_reason', {reason: guild.blocked_reason}) : null}</span>
          </p>
        ) : null}
        <Outlet context={{guild, setDirty} satisfies ServerOutletContext}/>
      </div>
    </>
  );
}


// Home's counts that only need the server's id, the same queries `ServerHome` reads: asked for next to the server itself
// instead of a round trip later, once it has loaded and Home is drawn. It stays for as long as Home is open (leaving
// right as Home takes over would cancel them mid-flight), and draws nothing
function HomeQueries({ guildId }: {guildId: string}) {
  useGuildLLMKnowledgeQuery(guildId);
  useGuildTagsQuery(guildId, '');
  useGuildVoicesQuery(guildId);
  useSavedFontsQuery(guildId);
  useGuildCreditsQuery(guildId);
  return null;
}


// "Your commands" / "Your reminders" / "Your tags" in this server, opening those pages filtered to it
function YourStuffLinks({ guildId, className }: {guildId: string, className?: string}) {
  const { t } = useI18n();
  const reminders = useMeRemindersQuery();
  const tags = useMeTagsCountQuery(guildId);
  const reminderCount = reminders.data?.items.filter((reminder) => reminder.guild_id === guildId).length;
  const search = `?${new URLSearchParams({server: guildId})}`;
  return (
    <nav aria-label={t('server.your_things')} className={cn('flex flex-wrap gap-2', className)}>
      {/* no count, it'd scan their whole command history every time a server is opened */}
      <YourStuffLink to={`${Routes.DASHBOARD_COMMANDS}${search}`} icon={SquareTerminal} label={t('server.your_commands')} count={undefined}/>
      <YourStuffLink to={`${Routes.DASHBOARD_REMINDERS}${search}`} icon={AlarmClock} label={t('server.your_reminders')} count={reminderCount}/>
      <YourStuffLink to={`${Routes.DASHBOARD_TAGS}${search}`} icon={TagsIcon} label={t('server.your_tags')} count={tags.data}/>
    </nav>
  );
}


// a shortcut to a list filtered to the server, with how many it'll show
function YourStuffLink({ to, icon: Icon, label, count }: {to: string, icon: LucideIcon, label: string, count: number | undefined}) {
  return (
    <Link to={to} className='group/stuff inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-white'>
      <Icon aria-hidden className='size-4 text-muted transition-colors group-hover/stuff:text-brand-text'/>
      {label}
      {(count === undefined) ? null : (
        <span className='rounded bg-surface-3 px-1.5 text-xs text-muted tabular-nums'>{formatNumber(count)}</span>
      )}
      <ArrowUpRight aria-hidden className='size-3.5 text-subtle transition-colors group-hover/stuff:text-brand-text'/>
    </Link>
  );
}


// Says up front what can't be changed here, and which permission it would take.
function ViewOnlyBanner({ lockedAreas, all, className }: {lockedAreas: Array<GuildEditableArea>, all: boolean, className?: string}) {
  const { t, rich } = useI18n();
  const byPermission = new Map<string, Array<string>>();
  for (const area of lockedAreas) {
    const permission = AREA_PERMISSION[area];
    byPermission.set(permission, [...(byPermission.get(permission) ?? []), AREA_LABEL[area]]);
  }
  return (
    <div role='status' className={cn('flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4', className)}>
      <Eye aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
      <div className='min-w-0 text-sm'>
        <p className='font-semibold text-white'>
          {t((all) ? 'server.view_only_all' : 'server.view_only_some')}
        </p>
        <ul className='mt-1 space-y-0.5 text-fg'>
          {Array.from(byPermission, ([permission, areas]) => (
            <li key={permission}>
              {rich((all) ? 'server.needs_all' : 'server.needs_some', {b: (chunk) => <span className='font-medium text-white'>{chunk}</span>}, {areas: areas.join(', '), permission})}
            </li>
          ))}
        </ul>
        <p className='mt-1.5 text-muted'>{t('server.owners_note')}</p>
      </div>
    </div>
  );
}
