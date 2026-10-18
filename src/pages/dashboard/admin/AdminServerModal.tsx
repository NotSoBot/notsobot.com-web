import { AlertTriangle, Ban, ShieldCheck, Sparkles } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';

import { isOwner, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailModalHeader } from '@/components/ui/DetailModal';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { ApiErrorCodes, ApiRequestError, type AdminGuild, type AdminGuildSummary, type GuildFeature } from '@/lib/api';
import { errorMessage, GuildScopeContext, useAdminGuildQuery, usePatchAdminGuildMutation } from '@/lib/api/dashboardQueries';
import { cn, snowflakeTimestamp } from '@/lib/utils';

import { GuildIcon } from '../servers/GuildIcon';
import { ServerDataSection } from '../servers/ServerDataSection';
import { CommandListSection, ListSection, LoggersSection, PrefixesSection } from '../servers/ServerSections';
import { ServerSettingsForm } from '../servers/ServerSettingsForm';
import { PanelSkeleton, Skeleton, UnsavedChangesGuard } from '../ui';
import { BLOCK_REASON_MAX } from './BlockUserDialog';
import { Chip, ContentFlagTiles, CopyableValue, CopyButton, DateTile, ExactDate, StatTile } from './adminUi';
import { AdminModalFooter, AdminTagModal } from './AdminTagModal';
import { EditGuildFeaturesDialog, GUILD_FEATURE_INFO } from './EditGuildFeaturesDialog';


const TITLE_ID = 'admin-server-modal-title';

const BLOCK_DESCRIPTION = 'Blocking stops NotSoBot from responding to anyone in this server. Its settings are kept.';
const UNBLOCK_OWNER_ONLY = 'Only bot owners can unblock servers.';


function adminListPath(route: string, params: Record<string, string>): string {
  return `${route}?${new URLSearchParams(params).toString()}`;
}


type Navigation = {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void};

// Any server over the admin server list (`/dashboard/admin/servers/<id>`): what's happened in it, the same settings
// sections as the user dashboard's server modal (all editable, through `/admin/guilds`), and editing its features and
// blocking it in the footer, between Previous / Next. ← / → (and the footer's arrows) step through the list page's servers.
export function AdminServerModal({ guildId, previousId, nextId, onNavigate, onClose }: {
  guildId: string,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (guildId: string) => void,
  onClose: () => void,
}) {
  const { data: guild, isPending, error, refetch, isRefetching } = useAdminGuildQuery(guildId);
  const [ settingsDirty, setSettingsDirty ] = useState(false);
  // what to do once unsaved settings are discarded: close, or go to another server
  const [ confirming, setConfirming ] = useState<{close: true} | {navigate: string} | null>(null);

  const leave = (action: {close: true} | {navigate: string}) => {
    if ('close' in action) {
      onClose();
    } else {
      setSettingsDirty(false);
      onNavigate(action.navigate);
    }
  };
  const request = (action: {close: true} | {navigate: string}) => {
    if (settingsDirty) {
      setConfirming(action);
    } else {
      leave(action);
    }
  };
  const navigation: Navigation = {previousId, nextId, onNavigate: (id) => request({navigate: id})};

  return (
    // the loaded server brings its own footer (with the block action in it), loading and errors get the plain one
    <AdminTagModal
      labelledBy={TITLE_ID}
      previousId={previousId}
      nextId={nextId}
      onNavigate={navigation.onNavigate}
      onClose={() => request({close: true})}
      footer={!guild}
      stickyClose
    >
      {(guild) ? (
        <GuildScopeContext.Provider value='admin'>
          <ServerDetails key={guild.id} guild={guild} navigation={navigation} onDirtyChange={setSettingsDirty}/>
        </GuildScopeContext.Provider>
      ) : (isPending) ? (
        <div aria-busy='true'>
          <h2 id={TITLE_ID} className='sr-only'>Loading server</h2>
          <div className='px-4 pt-4 pb-3 sm:px-6 sm:pt-5'>
            <div className='flex h-7 items-center gap-2.5'>
              <Skeleton className='size-7 rounded-lg'/>
              <Skeleton className='h-5 w-48'/>
            </div>
            <Skeleton className='mt-2 h-3 w-32 bg-surface-2'/>
          </div>
          <div className='space-y-4 border-t border-line px-4 pt-4 pb-5 sm:px-6'><PanelSkeleton rows={2}/><PanelSkeleton rows={3}/></div>
        </div>
      ) : (
        <ServerLoadError error={error} onRetry={() => refetch()} retrying={isRefetching}/>
      )}

      {(confirming) ? (
        <ConfirmDialog
          title='Discard unsaved changes?'
          description={('close' in confirming) ?
            'You have edits to this server’s settings that haven’t been saved. If you close it now, they’ll be lost.' :
            'You have edits to this server’s settings that haven’t been saved. If you go to another server now, they’ll be lost.'}
          confirmLabel={('close' in confirming) ? 'Discard and close' : 'Discard and continue'}
          onConfirm={() => {
            setConfirming(null);
            leave(confirming);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : null}
      {/* leaving the page altogether (the shortcuts, the sidebar) */}
      <UnsavedChangesGuard when={settingsDirty}/>
    </AdminTagModal>
  );
}


function ServerLoadError({ error, onRetry, retrying }: {error: Error | null, onRetry: () => void, retrying: boolean}) {
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_SERVER);
  return (
    <div className='px-6 py-16 text-center'>
      <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
      <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{(notFound) ? 'Server not found' : 'Couldn’t load this server'}</h2>
      <p className='mb-6 text-muted'>{(notFound) ? 'NotSoBot isn’t in this server and has nothing saved for it.' : errorMessage(error)}</p>
      {(notFound) ? null : <button type='button' className='btn btn-secondary' disabled={retrying} onClick={onRetry}>Retry</button>}
    </div>
  );
}


// the "Has" tiles' explanations, worded like their sections in the Settings tab
const LIST_TITLES = {
  allowlist: 'Channels, roles and users on the allowlist. If anything is listed, NotSoBot only responds to those.',
  blocklist: 'Channels, roles and users NotSoBot ignores here.',
  commandsAllowlist: 'Commands limited to specific channels, roles or users.',
  commandsBlocklist: 'Commands turned off here, for the whole server or for specific channels, roles or users.',
  loggers: 'Channels server events (message edits, joins, bans…) are posted to.',
};

const SERVER_TABS = [
  {id: 'information', label: 'Information'},
  {id: 'settings', label: 'Settings'},
] as const;
type ServerTab = (typeof SERVER_TABS)[number]['id'];

// Laid out like the user modal: the server, its id and when it was made on the left, whether the bot's in it in the
// middle and whether it's blocked in the top right. Then two tabs: what's happened in it (its content flags, activity and
// what's in it) and its settings. Editing its features (owners) and blocking it are in the footer.
function ServerDetails({ guild, navigation, onDirtyChange }: {guild: AdminGuild, navigation: Navigation, onDirtyChange: (dirty: boolean) => void}) {
  const { user } = useAuth();
  const viewerIsOwner = isOwner(user);
  // like users, only bot owners can unblock
  const canUnblock = viewerIsOwner;
  const [ blocking, setBlocking ] = useState(false);
  const [ editingFeatures, setEditingFeatures ] = useState(false);
  const tabsId = useId();
  const [ tab, setTab ] = useState<ServerTab>('information');
  const [ settingsDirty, setSettingsDirty ] = useState(false);
  const created = snowflakeTimestamp(guild.id);
  const name = guild.name || 'Unnamed server';
  const flagsPath = (status: string) => adminListPath(Routes.DASHBOARD_ADMIN_FLAGS, {guild_id: guild.id, status, blocked: '1'});
  // an API from before these were added leaves them out
  const { counts, content_flags: flags } = guild as Partial<AdminGuild>;

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SERVER_TABS.findIndex((item) => item.id === tab);
    const next = (event.key === 'ArrowRight' || event.key === 'End') ? SERVER_TABS.length - 1 :
      (event.key === 'ArrowLeft' || event.key === 'Home') ? 0 : -1;
    if (next !== -1 && next !== index) {
      event.preventDefault();
      setTab(SERVER_TABS[next].id);
      document.getElementById(`${tabsId}-${SERVER_TABS[next].id}`)?.focus();
    }
    // ← / → would step to another server too
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  };

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<GuildIcon guild={guild} size={32} className='size-7 rounded-lg text-[10px]'/>}
        // the header's title is always white, a server without a name gets its placeholder dimmed inside it
        title={(guild.name) ? name : <span className='text-subtle italic'>{name}</span>}
        titleTooltip={name}
        meta={(
          // the id, with when it was made always on its own line under it
          <span className='flex flex-col items-start gap-0.5'>
            <CopyableValue value={guild.id} truncate={0}/>
            {(created) ? <span>Created <ExactDate value={created}/></span> : null}
          </span>
        )}
        states={<BotChip bot={guild.bot}/>}
        status={(
          <Chip
            tone={(guild.blocked) ? 'danger' : 'neutral'}
            title={(guild.blocked) ? 'NotSoBot doesn’t respond to anyone in this server' : 'NotSoBot works here as usual'}
            className='w-24 justify-center'
          >
            {(guild.blocked) ? 'Blocked' : 'Not blocked'}
          </Chip>
        )}
        wideStatus
      />

      <div className='border-b border-line px-4 sm:border-t sm:px-6'>
        <div role='tablist' aria-label='Server sections' onKeyDown={onTabKeyDown} className='-mb-px mt-1 flex gap-1 overflow-x-auto'>
          {SERVER_TABS.map((item) => (
            <button
              key={item.id}
              id={`${tabsId}-${item.id}`}
              type='button'
              role='tab'
              aria-selected={tab === item.id}
              aria-controls={`${tabsId}-${item.id}-panel`}
              tabIndex={(tab === item.id) ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
                (tab === item.id) ? 'border-brand text-white' : 'border-transparent text-muted hover:text-white',
              )}
            >
              {item.label}
              {(item.id === 'settings' && settingsDirty) ? <span aria-label='(unsaved changes)' className='size-1.5 rounded-full bg-warning'/> : null}
            </button>
          ))}
        </div>
      </div>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* panels stay mounted so unsaved settings survive switching tabs */}
        <div id={`${tabsId}-information-panel`} role='tabpanel' aria-labelledby={`${tabsId}-information`} hidden={tab !== 'information'} className='space-y-5'>
          {(guild.blocked) ? (
            <div>
              <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
                <h3 className='section-label'>Block reason</h3>
                {(guild.blocked_reason) ? <CopyButton value={guild.blocked_reason} label='Copy'/> : null}
              </div>
              {(guild.blocked_reason) ? (
                <p className='rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm whitespace-pre-wrap break-words text-fg'>{guild.blocked_reason}</p>
              ) : (
                <p className='rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-subtle italic'>No reason given</p>
              )}
              {(!canUnblock) ? <p className='mt-2 text-xs text-subtle'>{UNBLOCK_OWNER_ONLY}</p> : null}
            </div>
          ) : null}

          {/* like the user modal: the flag counts by status on the left, commands and reports on the right, then what's
              in it across the bottom, once there's room. Stacked below that */}
          <div className='grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:gap-4'>
            {(flags) ? <ContentFlagTiles flags={flags} flagsPath={flagsPath}/> : null}
            <section>
              <h3 className='section-label mb-2'>Activity</h3>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2'>
                <StatTile label='Commands run' value={(guild.commands ?? 0).toLocaleString()} title='Commands run in this server, ever'/>
                <DateTile label='First seen' value={guild.first_seen ?? null} empty='Never' title='When the first command was run in this server'/>
                <StatTile
                  label='Reports'
                  to={adminListPath(Routes.DASHBOARD_ADMIN_REPORTS, {guild_id: guild.id, status: 'all'})}
                  value={(counts?.reports ?? 0).toLocaleString()}
                  tone='text-warning'
                  title='Reports sent from this server, or about it'
                />
                <DateTile
                  label='Last seen'
                  value={guild.bot?.updated ?? null}
                  title={(guild.bot) ? `When the bot last synced it (shard ${guild.bot.shard_id})` : 'The bot isn’t in this server'}
                />
              </div>
            </section>
          </div>

          <section>
            <h3 className='section-label mb-2'>Has</h3>
            {/* the settings counts open the Settings tab, where they're listed */}
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              <StatTile label='Allowlist' value={guild.allowlist.length.toLocaleString()} onClick={() => setTab('settings')} title={LIST_TITLES.allowlist}/>
              <StatTile label='Blocklist' value={guild.blocklist.length.toLocaleString()} onClick={() => setTab('settings')} title={LIST_TITLES.blocklist}/>
              <StatTile label='Command allowlist' value={guild.commands_allowlist.length.toLocaleString()} onClick={() => setTab('settings')} title={LIST_TITLES.commandsAllowlist}/>
              <StatTile label='Command blocklist' value={guild.commands_blocklist.length.toLocaleString()} onClick={() => setTab('settings')} title={LIST_TITLES.commandsBlocklist}/>
              <div className='col-span-2 rounded-md border border-line bg-deep px-3 py-2'>
                <p className='text-xs text-subtle'>Features</p>
                <div className='mt-1 flex flex-wrap gap-1'>
                  {(guild.features.length) ? guild.features.map((feature) => {
                    const info = GUILD_FEATURE_INFO[feature as GuildFeature];
                    return <Chip key={feature} tone='brand' title={info?.description}>{info?.label ?? feature}</Chip>;
                  }) : <span className='text-sm text-subtle'>None</span>}
                </div>
              </div>
              <StatTile label='Loggers' value={guild.loggers.length.toLocaleString()} onClick={() => setTab('settings')} title={LIST_TITLES.loggers}/>
              {/* a count only: reminders are people's private notes, so staff don't get to read them */}
              <StatTile label='Reminders' value={(counts?.reminders ?? 0).toLocaleString()} title='Reminders set in this server. Their contents are private.'/>
              <StatTile label='Tags' to={adminListPath(Routes.DASHBOARD_ADMIN_TAGS, {server: guild.id})} value={(counts?.tags ?? 0).toLocaleString()}/>
            </div>
          </section>
        </div>

        <div id={`${tabsId}-settings-panel`} role='tabpanel' aria-labelledby={`${tabsId}-settings`} hidden={tab !== 'settings'} className='space-y-4'>
          <PrefixesSection guild={guild}/>
          <ServerSettingsForm
            guild={guild}
            onDirtyChange={(dirty) => {
              setSettingsDirty(dirty);
              onDirtyChange(dirty);
            }}
          />
          <ListSection guild={guild} list='allowlist'/>
          <ListSection guild={guild} list='blocklist'/>
          <CommandListSection guild={guild} list='allowlist'/>
          <CommandListSection guild={guild} list='blocklist'/>
          <LoggersSection guild={guild}/>
          <ServerDataSection guild={guild}/>
        </div>
      </div>

      {/* features (owners) set apart from blocking by a divider. The block slot turns into "Unblock", disabled for
          moderators rather than left out so it never moves around */}
      <AdminModalFooter {...navigation}>
        {(viewerIsOwner) ? (
          <>
            <button type='button' className='btn btn-secondary min-w-0 flex-1 px-2 sm:flex-none sm:px-3' onClick={() => setEditingFeatures(true)}>
              <Sparkles aria-hidden className='hidden size-4 shrink-0 sm:block'/>
              <span className='truncate sm:hidden'>Features</span>
              <span className='hidden sm:inline'>Edit features</span>
            </button>
            <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/>
          </>
        ) : null}
        <button
          type='button'
          className={cn('btn min-w-0 flex-1 px-2 sm:flex-none sm:px-3', (guild.blocked) ? 'btn-secondary' : 'btn-danger')}
          disabled={guild.blocked && !canUnblock}
          title={(guild.blocked && !canUnblock) ? UNBLOCK_OWNER_ONLY : (guild.blocked) ? undefined : BLOCK_DESCRIPTION}
          onClick={() => setBlocking(true)}
        >
          {(guild.blocked) ? <ShieldCheck aria-hidden className='hidden size-4 shrink-0 sm:block'/> : <Ban aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
          <span className='truncate sm:hidden'>{(guild.blocked) ? 'Unblock' : 'Block'}</span>
          <span className='hidden sm:inline'>{(guild.blocked) ? 'Unblock server' : 'Block server'}</span>
        </button>
      </AdminModalFooter>

      {(blocking) ? <BlockServerDialog guild={guild} onClose={() => setBlocking(false)}/> : null}
      {(editingFeatures) ? <EditGuildFeaturesDialog guild={guild} onClose={() => setEditingFeatures(false)}/> : null}
    </div>
  );
}


export function BotChip({ bot }: {bot: AdminGuildSummary['bot']}) {
  if (!bot) {
    return <Chip title='NotSoBot isn’t in this server anymore (or never joined it). Its settings are kept.'>Bot not in server</Chip>;
  }
  return <Chip tone='success' title={`Shard ${bot.shard_id}`}>Bot in server</Chip>;
}


// blocking stops NotSoBot from responding in the server; like users, only bot owners can unblock
function BlockServerDialog({ guild, onClose }: {guild: AdminGuild, onClose: () => void}) {
  const titleId = useId();
  const reasonId = useId();
  const toast = useToast();
  const mutation = usePatchAdminGuildMutation(guild.id);
  const [ reason, setReason ] = useState('');
  const { blocked } = guild;
  const name = guild.name || guild.id;

  const submit = () => {
    const patch = (blocked) ? {blocked: false} : {blocked: true, blocked_reason: reason.trim() || null};
    mutation.mutate(patch, {
      onSuccess: () => {
        toast((blocked) ? `Unblocked ${name}` : `Blocked ${name}`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>
          {(blocked) ? `Unblock ${name}?` : `Block ${name} from NotSoBot?`}
        </h2>
        <p className='mt-2 text-sm text-muted'>
          {(blocked) ? 'NotSoBot will respond in this server again.' : 'NotSoBot stops responding to everyone in this server. Its settings are kept, and only bot owners can undo it.'}
        </p>

        <div className='mt-3 rounded-md border border-line bg-deep p-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <GuildIcon guild={guild} size={32} className='size-8 rounded-lg text-[10px]'/>
            <span className='min-w-0'>
              <span className={cn('block truncate text-sm font-medium', (guild.name) ? 'text-white' : 'text-subtle italic')}>{guild.name || 'Unnamed server'}</span>
              <span className='block truncate font-mono text-xs text-subtle'>{guild.id}</span>
            </span>
          </div>
          {(blocked && guild.blocked_reason) ? (
            <p className='mt-2 text-sm break-words text-muted'><span className='text-subtle'>Blocked for: </span>{guild.blocked_reason}</p>
          ) : null}
        </div>

        {(!blocked) ? (
          <div className='mt-3 rounded-md border border-line p-3 text-sm'>
            <label htmlFor={reasonId} className='mb-1.5 block text-muted'>Block reason</label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={BLOCK_REASON_MAX}
              rows={2}
              disabled={mutation.isPending}
              className='input'
              autoFocus
            />
          </div>
        ) : null}

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, (blocked) ? 'Couldn’t unblock the server.' : 'Couldn’t block the server.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className={cn('btn', (blocked) ? 'btn-primary' : 'btn-danger')} disabled={mutation.isPending}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(blocked) ? 'Unblock' : 'Block'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
