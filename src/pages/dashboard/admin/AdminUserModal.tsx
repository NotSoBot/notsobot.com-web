import { Ban, ChevronDown, Lock, LockOpen, Pencil, ShieldCheck, Tags, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { DetailModalHeader, ModalFooter } from '@/components/ui/DetailModal';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { UserFlags, UserPremiumTypes, type AdminCopyrightStrike, type AdminCopyrightStrikes, type AdminUserEntry } from '@/lib/api';
import { errorMessage, useAdminUserCopyrightStrikesQuery, useAdminUserEntryQuery } from '@/lib/api/dashboardQueries';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDateTime, formatMemory, snowflakeTimestamp } from '@/lib/utils';

import { premiumLabel } from '../premium';
import { adminTagsPath, adminUserPath, Chip, ContentFlagTiles, CopyableValue, DateTile, ExactDate, StatTile } from './adminUi';
import { AdminModalFooter, AdminTagModal, LinkedItemModal } from './AdminTagModal';
import { BlockUserDialog, BlockedUntilLine, canBlockUser } from './BlockUserDialog';
import { DeleteUserTagsDialog } from './DeleteUserTagsDialog';
import { canToggleLegalHold, LegalHoldDialog, LegalHoldNotice, legalHoldTitle } from './LegalHoldDialog';
import { EditUserDialog } from './EditUserDialog';
import { UserWarningsSection } from './UserWarnings';


export function adminFlagsPath(params: Record<string, string>): string {
  return `${Routes.DASHBOARD_ADMIN_FLAGS}?${new URLSearchParams(params).toString()}`;
}

function adminReportsPath(params: Record<string, string>): string {
  return adminListPath(Routes.DASHBOARD_ADMIN_REPORTS, params);
}

function adminListPath(route: string, params: Record<string, string>): string {
  return `${route}?${new URLSearchParams(params).toString()}`;
}

// the modal's footer actions: they share the row on phones (short labels, no icons there, sized to their labels since four
// even slots are too narrow for them); destructive ones tinted red
const ACTION = 'btn min-w-0 flex-auto px-1.5 sm:flex-none sm:px-3';
const DANGER_TINT = 'border border-danger/40 bg-danger/10 text-danger-text hover:bg-danger/20';

const TITLE_ID = 'admin-user-modal-title';


type Navigation = {previousId: string | null, nextId: string | null, onNavigate: (id: string) => void};

// A user's modal, over the admin user list (`/dashboard/admin/users/<id>`, with `navigation` to step through the page's
// users) or over any other admin page that links to them (`AdminUserPeek`, on its own). `entry` is the user when the
// page already has them, otherwise they're fetched by id.
export function AdminUserModal({ userId, entry = null, navigation, onClose }: {
  userId: string,
  entry?: AdminUserEntry | null,
  navigation?: Navigation,
  onClose: () => void,
}) {
  const linked = useAdminUserEntryQuery(userId, !entry);
  const openItem = entry ?? linked.data ?? null;
  if (!openItem) {
    return <LinkedItemModal noun='user' notFoundMessage='NotSoBot doesn’t know anyone with this id.' query={linked} onClose={onClose}/>;
  }
  const details = <UserDetails key={openItem.user.id} entry={openItem} navigation={navigation}/>;
  return (navigation) ? (
    <AdminTagModal labelledBy={TITLE_ID} previousId={navigation.previousId} nextId={navigation.nextId} onNavigate={navigation.onNavigate} onClose={onClose} footer={false} stickyClose>
      {details}
    </AdminTagModal>
  ) : (
    <Modal labelledBy={TITLE_ID} onClose={onClose} stickyClose>{details}</Modal>
  );
}


// the modal's footer: between Previous / Next over the user list, on its own anywhere else
function UserModalFooter({ navigation, children }: {navigation?: Navigation, children: ReactNode}) {
  return (navigation) ? <AdminModalFooter {...navigation}>{children}</AdminModalFooter> : <ModalFooter>{children}</ModalFooter>;
}


function userRoles(user: AdminUserEntry['user']) {
  const owner = (user.flags & UserFlags.OWNER) === UserFlags.OWNER;
  const moderator = (user.flags & UserFlags.MODERATOR) === UserFlags.MODERATOR;
  return {owner, moderator};
}


// every `UserFlags` bit, so a user's flags can be read without opening the edit dialog
const FLAG_CHIPS: ReadonlyArray<{flag: number, label: string, title: string}> = [
  {flag: UserFlags.OWNER, label: 'Owner', title: 'Bot owner: everything is unlocked and free for them'},
  {flag: UserFlags.MODERATOR, label: 'Moderator', title: 'Can use the admin panel'},
  {flag: UserFlags.API_ACCESS, label: 'API access', title: 'Can create API applications'},
];

// A user's flags and premium type as chips. With `always` the premium one is there even without any ("No premium"),
// so the modal answers it either way; the rows leave it out to stay short
export function userChips(user: AdminUserEntry['user'], always = false) {
  const premiumType = user.premium_type ?? UserPremiumTypes.NONE;
  return [
    ...FLAG_CHIPS.filter(({ flag }) => (user.flags & flag) === flag).map(({ flag, label, title }) => (
      <Chip key={`flag-${flag}`} tone='brand' title={title}>{label}</Chip>
    )),
    (premiumType) ? (
      <Chip key='premium' tone='success' title='Premium type'>{premiumLabel(premiumType)}</Chip>
    ) : (always) ? (
      <Chip key='premium' title='Premium type' className='text-subtle'>No premium</Chip>
    ) : null,
  ];
}


// The user's modal, laid out like the content flag one: who they are with their roles and whether they're blocked up
// top, their flag/report numbers (each a link to the list behind it), and everything staff can do to them in the
// footer (between Previous / Next with `navigation`, over the user list), so it's always a click away
function UserDetails({ entry, navigation }: {entry: AdminUserEntry, navigation?: Navigation}) {
  const { user, content_flags: flags } = entry;
  const { user: me } = useAuth();
  const viewerIsOwner = isOwner(me);
  const { owner } = userRoles(user);
  const canBlock = canBlockUser(user, viewerIsOwner);
  const cantBlockReason = (canBlock) ? null : (owner) ? 'Owners can’t be blocked.' : 'Only owners can block moderators.';
  // the footer's block slot does the opposite of what they are now: unblocking is owner only (the api refuses anyone
  // else), like `UserModerationButtons`
  const canToggleBlock = (user.blocked) ? viewerIsOwner : canBlock;
  const cantToggleBlockReason = (canToggleBlock) ? null : (user.blocked) ? 'Only bot owners can unblock users.' : cantBlockReason;
  // deleting everything they made can't be undone, so owners only (moderators delete tags one at a time)
  const canDeleteTags = canBlock && viewerIsOwner;
  const cantDeleteTagsReason = (canDeleteTags) ? null : cantBlockReason ?? 'Only bot owners can delete all of a user’s tags.';
  const [ blocking, setBlocking ] = useState(false);
  const [ holding, setHolding ] = useState(false);
  const [ deletingTags, setDeletingTags ] = useState(false);
  const [ editing, setEditing ] = useState(false);
  const name = userDisplayTag(user);
  const created = snowflakeTimestamp(user.id);

  return (
    <div>
      <DetailModalHeader
        titleId={TITLE_ID}
        leading={<UserAvatar user={user} size={64} className='size-7 shrink-0 rounded-full bg-surface-3'/>}
        title={name}
        titleTooltip={name}
        meta={(
          // the id, with when it was made always on its own line under it
          <span className='flex flex-col items-start gap-0.5'>
            <CopyableValue value={user.id} truncate={0}/>
            {(created) ? <span>Created <ExactDate value={created}/></span> : null}
          </span>
        )}
        states={userChips(user, true)}
        status={(
          <Chip
            tone={(user.blocked) ? 'danger' : 'neutral'}
            title={(user.blocked) ? 'Blocked from using NotSoBot anywhere' : 'Can use NotSoBot'}
            className='w-24 justify-center'
          >
            {(user.blocked) ? 'Blocked' : 'Not blocked'}
          </Chip>
        )}
        wideStatus
      />

      <div className='px-4 pt-4 pb-5 sm:border-t sm:border-line sm:px-6'>
        {(user.blocked) ? <div className='mb-5 [&>div]:w-full'><BlockedNotice reason={user.blocked_reason} until={user.blocked_until}/></div> : null}
        {(user.legal_hold) ? <div className='mb-5 [&>div]:w-full'><LegalHoldNotice hold={user}/></div> : null}
        {(user.data_deletion_started_at) ? <div className='mb-5 [&>div]:w-full'><DataDeletionNotice startedAt={user.data_deletion_started_at}/></div> : null}

        {/* side by side from sm up so both fill two rows of tiles: the flag counts by status on the left, commands and
            reports on the right once there's room, then what they have across the bottom. Stacked below that */}
        <div className='grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:gap-4'>
          <ContentFlagTiles flags={flags} flagsPath={(status) => adminFlagsPath({user_id: user.id, status})}/>
          <section>
            <h3 className='section-label mb-2'>Activity</h3>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2'>
              <StatTile label='Commands run' value={entry.commands.toLocaleString()} hint='Commands they’ve run, ever'/>
              <DateTile label='First seen' value={entry.first_seen} empty='Never' title='When they ran their first command'/>
              <StatTile label='Reports about' to={adminReportsPath({q: `target:${user.id}`, status: 'all'})} value={entry.reports.toLocaleString()} tone='text-warning'/>
              <StatTile label='Reports sent' to={adminReportsPath({q: `user:${user.id}`, status: 'all'})} value={entry.reports_sent.toLocaleString()}/>
            </div>
          </section>
        </div>

        <section className='mt-5 lg:mt-4'>
          <h3 className='section-label mb-2'>Has</h3>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
            <StatTile label='Applications' to={adminListPath(Routes.DASHBOARD_ADMIN_APPLICATIONS, {user_id: user.id})} value={entry.owned.applications.toLocaleString()}/>
            <StatTile
              label='Files'
              // an api from before the size was added leaves it out
              value={(entry.owned.files && entry.files_size) ? `${entry.owned.files.toLocaleString()} • ${formatMemory(entry.files_size, (entry.files_size < 1024 * 1024) ? 0 : 1)}` : entry.owned.files.toLocaleString()}
              hint='Files they’ve uploaded that haven’t expired, and the storage they take up (the same file uploaded twice is stored once)'
            />
            {/* a count only: reminders are people's private notes, so staff don't get to read them */}
            <StatTile label='Reminders' value={entry.owned.reminders.toLocaleString()} hint='Reminders they’ve set. Their contents are private.'/>
            <StatTile label='Tags' to={adminTagsPath(`user:${user.id}`)} value={entry.owned.tags.toLocaleString()}/>
            <StatTile label='Voices' to={adminListPath(Routes.DASHBOARD_ADMIN_VOICES, {user_id: user.id})} value={entry.owned.voices.toLocaleString()}/>
          </div>
        </section>

        <CopyrightStrikes userId={user.id}/>

        {/* same rules as blocking: not owners, and moderators can't warn moderators */}
        <UserWarningsSection user={user} cantWarnReason={(canBlock) ? null : (owner) ? 'Owners can’t be warned.' : 'Only owners can warn moderators.'} viewerIsOwner={viewerIsOwner}/>

        {(cantBlockReason) ? <p className='mt-4 text-xs text-subtle'>{cantBlockReason}</p> : null}
      </div>

      {/* what they can see on the left, blocking and deleting set apart after a divider. The block slot turns into
          "Unblock" and the ones this viewer can't use are disabled rather than left out, so the buttons never move around */}
      <UserModalFooter navigation={navigation}>
        {(viewerIsOwner) ? (
          <button type='button' className={cn(ACTION, 'btn-secondary')} onClick={() => setEditing(true)}>
            <Pencil aria-hidden className='hidden size-4 shrink-0 sm:block'/>
            <span className='truncate sm:hidden'>Edit</span>
            <span className='hidden sm:inline'>Edit flags & premium</span>
          </button>
        ) : null}
        <Link to={adminTagsPath(`user:${user.id}`)} className={cn(ACTION, 'btn-secondary')}>
          <Tags aria-hidden className='hidden size-4 shrink-0 sm:block'/>
          <span className='truncate sm:hidden'>Tags</span>
          <span className='hidden sm:inline'>View tags</span>
        </Link>
        <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/>
        <button
          type='button'
          className={cn(ACTION, (user.blocked) ? 'btn-secondary' : 'btn-danger')}
          disabled={!canToggleBlock}
          title={cantToggleBlockReason ?? undefined}
          onClick={() => setBlocking(true)}
        >
          {(user.blocked) ? <ShieldCheck aria-hidden className='hidden size-4 shrink-0 sm:block'/> : <Ban aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
          <span className='truncate'>{(user.blocked) ? 'Unblock' : 'Block'}</span>
        </button>
        <button
          type='button'
          className={cn(ACTION, 'btn-secondary', user.legal_hold && 'text-warning')}
          disabled={!canToggleLegalHold(user, viewerIsOwner)}
          title={legalHoldTitle(user, viewerIsOwner)}
          onClick={() => setHolding(true)}
        >
          {(user.legal_hold) ? <LockOpen aria-hidden className='hidden size-4 shrink-0 sm:block'/> : <Lock aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
          <span className='truncate'>{(user.legal_hold) ? 'Lift hold' : 'Hold'}</span>
        </button>
        <button type='button' className={cn(ACTION, DANGER_TINT)} disabled={!canDeleteTags} title={cantDeleteTagsReason ?? undefined} onClick={() => setDeletingTags(true)}>
          <Trash2 aria-hidden className='hidden size-4 shrink-0 sm:block'/>
          <span className='truncate sm:hidden'>Delete</span>
          <span className='hidden sm:inline'>Delete tags</span>
        </button>
      </UserModalFooter>

      {(blocking) ? (
        <BlockUserDialog user={user} blocked={user.blocked} blockedReason={user.blocked_reason} blockedUntil={user.blocked_until} onClose={() => setBlocking(false)}/>
      ) : null}
      {(holding) ? <LegalHoldDialog user={user} hold={user} onClose={() => setHolding(false)}/> : null}
      {(editing) ? <EditUserDialog user={user} onClose={() => setEditing(false)}/> : null}
      {(deletingTags) ? <DeleteUserTagsDialog user={user} onClose={() => setDeletingTags(false)}/> : null}
    </div>
  );
}


// The repeat infringer policy's numbers: copyright removals of their tags and files, one per staff action. The count
// opens the list of them, each with who took it down, the notice and the tags it hit
function CopyrightStrikes({ userId }: {userId: string}) {
  const query = useAdminUserCopyrightStrikesQuery(userId);
  const [ open, setOpen ] = useState(false);
  const strikes = query.data?.strikes ?? [];
  const value = (query.isPending) ? '…' : (query.isError) ? '—' : query.data.count.toLocaleString();

  return (
    <section className='mt-5 lg:mt-4'>
      <h3 className='section-label mb-2'>Copyright</h3>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <StatTile
          label='Strikes'
          value={value}
          tone='text-danger-text'
          hint={(query.isError) ? errorMessage(query.error, 'Couldn’t load their strikes.') : 'Copyright removals of their tags, one per staff action'}
          // what clicking it does, only while there are any to show
          title={(strikes.length) ? `${(open) ? 'Hide' : 'Show'} their strikes` : undefined}
          expanded={(strikes.length) ? open : undefined}
          onClick={(strikes.length) ? () => setOpen(!open) : undefined}
        />
        <DateTile label='Last strike' value={strikes[0]?.created ?? null} empty='Never'/>
      </div>
      {(open && strikes.length) ? (
        <ol className='mt-2 space-y-2'>
          {strikes.map((strike) => <StrikeCard key={strike.action_id} strike={strike} users={query.data!.users}/>)}
        </ol>
      ) : null}
    </section>
  );
}


function StrikeCard({ strike, users }: {strike: AdminCopyrightStrike, users: AdminCopyrightStrikes['users']}) {
  const actor = (strike.actor_id) ? users[strike.actor_id] : null;
  return (
    <li className='rounded-md border border-line bg-deep p-2.5 text-sm'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
        {(strike.actor_id) ? (
          <span className='inline-flex min-w-0 items-center gap-1'>
            {(actor) ? <span className='truncate font-medium text-fg'>{actor.username}</span> : null}
            <CopyableValue value={strike.actor_id} truncate={0} to={adminUserPath(strike.actor_id)} linkTitle='Open in users'/>
          </span>
        ) : <span>Unknown staff member</span>}
        <span aria-hidden>•</span>
        <ExactDate value={strike.created} format={formatDateTime}/>
        {(strike.asset_ids.length) ? <Chip>{strike.asset_ids.length.toLocaleString()} {(strike.asset_ids.length === 1) ? 'file' : 'files'}</Chip> : null}
      </div>
      {(strike.notice) ? (
        <p className='mt-1.5 rounded border-l-2 border-line-strong pl-2 text-xs break-words whitespace-pre-wrap text-muted'>{strike.notice}</p>
      ) : (
        <p className='mt-1.5 text-xs text-subtle italic'>No notice given</p>
      )}
      {(strike.tag_ids.length) ? (
        <p className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
          {(strike.tag_ids.length === 1) ? 'Tag' : 'Tags'}
          {strike.tag_ids.map((tagId) => (
            <Link key={tagId} to={adminTagsPath(`id:${tagId}`)} className='font-mono text-fg hover:underline'>{tagId}</Link>
          ))}
        </p>
      ) : null}
    </li>
  );
}


// a red callout with the block reason, two lines at most until "Show full reason" opens the rest
// their "Delete my data" is under way, or stopped partway (a legal hold placed meanwhile stops it)
function DataDeletionNotice({ startedAt }: {startedAt: string}) {
  return (
    <div className='w-72 rounded-md border border-line bg-surface-2 px-3 py-2'>
      <p className='flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase'>
        <Trash2 aria-hidden className='size-3.5 shrink-0'/>
        Data deletion
      </p>
      <p className='mt-1 text-xs text-fg'>
        Data deletion started <ExactDate value={startedAt} format={formatDateTime}/>
      </p>
    </div>
  );
}


function BlockedNotice({ reason, until }: {reason: string | null, until: string | number | null}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [ expanded, setExpanded ] = useState(false);
  const [ overflowing, setOverflowing ] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) {
      return;
    }
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [reason, expanded]);

  return (
    <div className='w-72 rounded-md border border-danger/40 bg-danger/15 px-3 py-2'>
      <p className='flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#ff8a8c] uppercase'>
        <Ban aria-hidden className='size-3.5 shrink-0'/>
        Blocked
      </p>
      {(reason) ? (
        <p ref={ref} className={cn('mt-1 text-xs break-words whitespace-pre-wrap text-fg', !expanded && 'line-clamp-2')}>{reason}</p>
      ) : (
        <p className='mt-1 text-xs text-muted italic'>No reason given</p>
      )}
      {(reason && (overflowing || expanded)) ? (
        <button
          type='button'
          className='mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded text-xs font-semibold text-[#ff8a8c] hover:text-white'
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {(expanded) ? 'Show less' : 'Show full reason'}
          <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}/>
        </button>
      ) : null}
      <BlockedUntilLine until={until} className='mt-1 text-xs'/>
    </div>
  );
}
