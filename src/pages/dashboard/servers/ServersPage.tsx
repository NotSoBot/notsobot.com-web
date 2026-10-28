import { Crown, Eye, KeyRound, Pin, PinOff, Search, Server, Settings2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { readStored, writeStored } from '@/hooks/usePersistentState';
import { translate, useI18n, type TranslationKey } from '@/i18n';
import { ApiEndpoints, apiUrl, type UserGuildSummary } from '@/lib/api';
import {
  errorMessage,
  isDiscordGrantError,
  isScopeMismatch,
  useMeGuildsQuery,
  useMeSettingsQuery,
  usePatchMeSettingsMutation,
} from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { useSearchParamState } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { GuildIcon } from './GuildIcon';
import { dashboardServerPath } from './guildMeta';


// the page's sections, in order. A pinned server is only in Pinned, the rest go by what you can do there
const SECTIONS: Array<{key: SectionKey, title: TranslationKey}> = [
  {key: 'pinned', title: 'servers.section.pinned'},
  {key: 'owned', title: 'servers.section.owned'},
  {key: 'manage', title: 'servers.section.manage'},
  {key: 'member', title: 'servers.section.member'},
];
type SectionKey = 'pinned' | 'owned' | 'manage' | 'member';

function sectionOf(guild: UserGuildSummary, pinned: Set<string>): SectionKey {
  if (pinned.has(guild.id)) {
    return 'pinned';
  }
  return (guild.owner) ? 'owned' : (guild.can_manage) ? 'manage' : 'member';
}


// where the first version kept pins, in the browser. They're moved onto the account once
const LEGACY_PINNED_KEY = 'servers:pinned';
const MAX_PINNED = 100;

export function ServersPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, isPending, isError, error, refetch, isRefetching } = useMeGuildsQuery();
  // on the account (user settings), so every device has them, in the order they were pinned. A server you've left just
  // stops showing up. The settings save optimistically, so a pin moves right away and moves back if it fails
  const settings = useMeSettingsQuery();
  const patchSettings = usePatchMeSettingsMutation();
  const pinnedIds = useMemo(() => settings.data?.dashboard_pinned_guilds ?? [], [settings.data]);
  const pinned = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const savePins = (ids: Array<string>) => {
    patchSettings.mutate({dashboard_pinned_guilds: ids.slice(0, MAX_PINNED)}, {
      onError: (saveError) => toast(errorMessage(saveError, translate('servers.pin_error')), 'error'),
    });
  };
  const togglePin = (guildId: string) => {
    savePins((pinned.has(guildId)) ? pinnedIds.filter((id) => id !== guildId) : [...pinnedIds, guildId]);
  };
  // pins from before they were saved on the account, added to the account's once and then forgotten here
  useEffect(() => {
    if (!settings.data) {
      return;
    }
    const legacy = readStored<Array<string>>(LEGACY_PINNED_KEY, []);
    if (!Array.isArray(legacy) || !legacy.length) {
      return;
    }
    writeStored(LEGACY_PINNED_KEY, []);
    const merged = [...settings.data.dashboard_pinned_guilds, ...legacy.filter((id) => !settings.data.dashboard_pinned_guilds.includes(id))];
    if (merged.length !== settings.data.dashboard_pinned_guilds.length) {
      savePins(merged);
    }
    // runs when the settings first load, the stored pins are cleared so it's only ever once
  }, [!!settings.data]);

  // alphabetical within each section, pinned ones in the order they were pinned
  const guilds = useMemo(() => {
    return (data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // `?q=` filters by name (or an exact id), kept in the url so it's still there coming back from a server
  const { searchParams, update } = useSearchParamState();
  const query = searchParams.get('q') || '';
  const shown = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (search) ? guilds.filter((guild) => guild.name.toLowerCase().includes(search) || guild.id === search) : guilds;
  }, [guilds, query]);
  const sections = useMemo(() => {
    return SECTIONS.map((section) => {
      const items = shown.filter((guild) => sectionOf(guild, pinned) === section.key);
      if (section.key === 'pinned') {
        items.sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
      }
      return {...section, items};
    }).filter((section) => section.items.length);
  }, [shown, pinned, pinnedIds]);

  return (
    <>
      <DashboardHeader
        title={t('dash.nav.servers')}
        description={t('servers.description')}
      />

      {(isPending) ? (
        <ServerGridSkeleton/>
      ) : (isScopeMismatch(error)) ? (
        <ScopeMismatchCard/>
      ) : (isDiscordGrantError(error)) ? (
        <ScopeMismatchCard reason='grant'/>
      ) : (isError) ? (
        <ErrorPanel title={t('servers.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!guilds.length) ? (
        <EmptyState icon={<Server className='size-10'/>} title={t('servers.empty')}>
          <a href={apiUrl(ApiEndpoints.HELP_DISCORD_BOT)} className='mt-3 inline-flex btn btn-discord'>{t('servers.add')}</a>
        </EmptyState>
      ) : (
        <>
          <SearchInput
            className='mb-4'
            value={query}
            onValueChange={(value) => update({q: value})}
            placeholder={t('servers.search_placeholder')}
            aria-label={t('servers.search_label')}
          />
          {(shown.length) ? (
            <div className='space-y-6'>
              {sections.map((section) => (
                <section key={section.key} aria-labelledby={`servers-${section.key}`}>
                  <h2 id={`servers-${section.key}`} className='section-label mb-2'>
                    {t(section.title)} <span className='normal-case tracking-normal text-subtle'>({section.items.length})</span>
                  </h2>
                  <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                    {section.items.map((guild) => (
                      <ServerCard key={guild.id} guild={guild} pinned={pinned.has(guild.id)} onTogglePin={() => togglePin(guild.id)}/>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Search className='size-10'/>} title={t('servers.empty_search')}>{t('servers.empty_search_description')}</EmptyState>
          )}
        </>
      )}
    </>
  );
}


// the pin is a badge on the icon's corner, outside the link (a button can't go inside one): always shown once it's pinned,
// on hover (or always on phones) otherwise
function ServerCard({ guild, pinned, onTogglePin }: {guild: UserGuildSummary, pinned: boolean, onTogglePin: () => void}) {
  const { t } = useI18n();
  const PinIcon = (pinned) ? PinOff : Pin;
  return (
    <li className='group/server relative'>
      <Link
        to={dashboardServerPath(guild.id)}
        className={cn(
          'group card card-hover flex h-full items-center gap-3 p-4',
          (guild.can_manage) ? 'hover:border-brand' : 'hover:border-line-strong',
        )}
      >
        <GuildIcon guild={guild} size={48} className='size-12 text-sm'/>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-1.5'>
            <span className='truncate font-medium text-white' title={guild.name}>{guild.name}</span>
            {(guild.owner) ? <Crown aria-label={t('servers.owner')} className='size-3.5 shrink-0 text-warning'/> : null}
          </div>
          <div className='mt-0.5 text-xs text-subtle'>{t((guild.owner) ? 'dash.role.owner' : (guild.can_manage) ? 'dash.role.manager' : 'dash.role.member')}</div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
            (guild.can_manage) ? 'bg-brand text-white group-hover:bg-brand-hover' : 'bg-surface-3 text-muted group-hover:text-white',
          )}
        >
          {(guild.can_manage) ? <Settings2 aria-hidden className='size-3.5'/> : <Eye aria-hidden className='size-3.5'/>}
          {t((guild.can_manage) ? 'servers.manage' : 'servers.view')}
        </span>
      </Link>
      <button
        type='button'
        className={cn(
          'absolute top-2 left-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-1 shadow transition focus-visible:opacity-100',
          (pinned) ? 'text-brand-text' : 'text-subtle opacity-0 group-hover/server:opacity-100 hover:text-white max-sm:opacity-100',
        )}
        aria-pressed={pinned}
        aria-label={t((pinned) ? 'servers.unpin_label' : 'servers.pin_label', {name: guild.name})}
        title={t((pinned) ? 'servers.unpin' : 'servers.pin')}
        onClick={onTogglePin}
      >
        <PinIcon aria-hidden className='size-3.5'/>
      </button>
    </li>
  );
}


// `scope`: the session predates the `guilds` scope; `grant`: Discord revoked/expired the login
export function ScopeMismatchCard({ reason = 'scope' }: {reason?: 'scope' | 'grant'}) {
  const { login } = useAuth();
  const { t } = useI18n();
  return (
    <div className='card flex flex-col items-center gap-4 p-8 text-center sm:p-10'>
      <span className='flex size-12 items-center justify-center rounded-full bg-brand/20'>
        <KeyRound aria-hidden className='size-6 text-brand-text'/>
      </span>
      <div className='max-w-md'>
        <h2 className='text-lg font-semibold text-white'>{t((reason === 'grant') ? 'servers.grant_title' : 'servers.scope_title')}</h2>
        <p className='mt-1.5 text-sm text-muted'>
          {t((reason === 'grant') ? 'servers.grant_description' : 'servers.scope_description')}
        </p>
      </div>
      <button type='button' className='btn btn-discord' onClick={() => login()}>{t('servers.relogin')}</button>
    </div>
  );
}


function ServerGridSkeleton() {
  return (
    <ul aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({length: 6}, (_, i) => (
        <li key={i} className='card flex items-center gap-3 p-4'>
          <Skeleton className='size-12 rounded-2xl'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-28'/>
            <Skeleton className='mt-2 h-3 w-16 bg-surface-2'/>
          </div>
          <Skeleton className='h-7 w-16 bg-surface-2'/>
        </li>
      ))}
    </ul>
  );
}
