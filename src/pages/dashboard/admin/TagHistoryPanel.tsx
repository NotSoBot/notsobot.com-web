import { ChevronDown, History } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import {
  TagAuditAssetKinds,
  TagAuditLogTypes,
  TagDirectoryEditRequestStatuses,
  TagRemovalReasons,
  type AdminUserRef,
  type TagAuditEntry,
} from '@/lib/api';
import { errorMessage, useAdminTagAuditQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDateTime, formatMemory } from '@/lib/utils';
import { InlineError } from '@/pages/dashboard/ui';
import { verificationInfo } from '@/pages/tags/tagDirectory';

import { adminUserPath, Chip, CopyableValue, ExactDate } from './adminUi';


const KIND_LABELS: Record<number, string> = {
  [TagAuditAssetKinds.TAG_ASSET]: 'archived file',
  [TagAuditAssetKinds.DIRECTORY_ASSET]: 'listing media',
  [TagAuditAssetKinds.DIRECTORY_THUMBNAIL]: 'listing thumbnail',
  [TagAuditAssetKinds.EDIT_REQUEST_ASSET]: 'change request media',
  [TagAuditAssetKinds.EDIT_REQUEST_THUMBNAIL]: 'change request thumbnail',
};

const REASON_CHIPS: Record<number, {label: string, tone: 'danger' | 'warning' | 'neutral'}> = {
  [TagRemovalReasons.COPYRIGHT]: {label: 'Copyright', tone: 'danger'},
  [TagRemovalReasons.RULES]: {label: 'Rules', tone: 'warning'},
  [TagRemovalReasons.REPLACED]: {label: 'Replaced', tone: 'neutral'},
  [TagRemovalReasons.DATA_DELETION]: {label: 'Data deletion', tone: 'neutral'},
};

type Users = Record<string, AdminUserRef | null>;


// The tag's audit log (`GET /admin/tags/<id>/audit`): its files coming and going (who uploaded them, from where, and
// why they were removed), verification changes, staff edits and change request reviews. Collapsed until opened, so
// opening a tag doesn't fetch it. Entries one staff action wrote (a takedown and its files) share a card
export function TagHistoryPanel({ tagId, ownerId, className = 'mt-4' }: {tagId: string, ownerId: string | null, className?: string}) {
  const [ open, setOpen ] = useState(false);
  const query = useAdminTagAuditQuery(tagId, open);
  const pages = query.data?.pages ?? [];
  const entries = pages.flatMap((page) => page.entries);
  const users: Users = Object.assign({}, ...pages.map((page) => page.users));
  const actions = groupByAction(entries);

  return (
    <div className={className}>
      <button
        type='button'
        aria-expanded={open}
        className='group mb-1 flex min-h-8 w-full cursor-pointer items-center gap-1.5 text-left'
        onClick={() => setOpen(!open)}
      >
        <History aria-hidden className='size-4 text-subtle'/>
        <h3 className='section-label'>History</h3>
        <ChevronDown aria-hidden className={cn('size-4 text-subtle transition-transform group-hover:text-fg', open && 'rotate-180')}/>
        {(open && query.isFetching && !query.isFetchingNextPage) ? <Spinner className='ml-1 size-3.5'/> : null}
      </button>

      {(!open) ? null : (query.isPending) ? (
        <p className='flex items-center gap-2 text-sm text-subtle'><Spinner className='size-4'/> Loading history…</p>
      ) : (query.isError) ? (
        <InlineError>{errorMessage(query.error, 'Couldn’t load the history.')}</InlineError>
      ) : (!actions.length) ? (
        <p className='text-sm text-subtle'>Nothing recorded yet. Uploads, removals, verification changes and staff edits show up here.</p>
      ) : (
        <>
          <ol className='space-y-2'>
            {actions.map((action) => <ActionCard key={action[0].action_id} entries={action} users={users} ownerId={ownerId}/>)}
          </ol>
          {(query.hasNextPage) ? (
            <button type='button' className='btn btn-sm btn-ghost mt-2' disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
              {(query.isFetchingNextPage) ? <Spinner className='size-4'/> : null}
              Load older
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}


// consecutive entries of one action (they come newest first, an action's are written together)
function groupByAction(entries: Array<TagAuditEntry>): Array<Array<TagAuditEntry>> {
  const groups: Array<Array<TagAuditEntry>> = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last[0].action_id === entry.action_id) {
      last.push(entry);
    } else {
      groups.push([entry]);
    }
  }
  return groups;
}


function ActionCard({ entries, users, ownerId }: {entries: Array<TagAuditEntry>, users: Users, ownerId: string | null}) {
  const first = entries[0];
  // a removal's reason and notice are the action's, every entry of it has the same
  const removal = entries.find((entry) => entry.reason !== null);
  const reason = (removal?.reason !== undefined && removal.reason !== null) ? REASON_CHIPS[removal.reason] : undefined;
  return (
    <li className='rounded-md border border-line bg-deep p-2.5 text-sm'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
        <Actor id={first.actor_id} users={users} ownerId={ownerId}/>
        <span aria-hidden>·</span>
        <ExactDate value={first.created} format={formatDateTime}/>
        {(reason) ? <Chip tone={reason.tone}>{reason.label}</Chip> : null}
      </div>
      {(removal?.notice) ? (
        <p className='mt-1.5 rounded border-l-2 border-line-strong pl-2 text-xs break-words whitespace-pre-wrap text-muted'>{removal.notice}</p>
      ) : null}
      <ul className='mt-1.5 space-y-1.5'>
        {entries.map((entry) => <EntryLine key={entry.id} entry={entry} ownerId={ownerId}/>)}
      </ul>
    </li>
  );
}


function Actor({ id, users, ownerId }: {id: string | null, users: Users, ownerId: string | null}) {
  if (!id) {
    return <span>The bot or a server’s data deletion</span>;
  }
  const user = users[id];
  return (
    <span className='inline-flex min-w-0 items-center gap-1'>
      {(user) ? <span className='truncate font-medium text-fg'>{user.username}</span> : null}
      <CopyableValue value={id} truncate={0} to={adminUserPath(id)} linkTitle='Open in users'/>
      {(id === ownerId) ? <Chip>Owner</Chip> : null}
    </span>
  );
}


function EntryLine({ entry, ownerId }: {entry: TagAuditEntry, ownerId: string | null}) {
  const { details } = entry;
  const kind = KIND_LABELS[details.kind ?? -1] ?? 'file';
  let summary: ReactNode;
  let body: ReactNode = null;
  switch (entry.type) {
    case TagAuditLogTypes.ASSET_ADDED:
      summary = <>Added {kind}</>;
      body = <AssetDetails entry={entry} ownerId={ownerId}/>;
      break;
    case TagAuditLogTypes.ASSET_REMOVED:
      summary = <>Removed {kind}</>;
      body = <AssetDetails entry={entry} ownerId={ownerId}/>;
      break;
    case TagAuditLogTypes.ASSET_MOVED:
      summary = <>Moved {kind} here{(details.from_tag_id) ? <> from tag <span className='font-mono'>{details.from_tag_id}</span></> : null}</>;
      body = <AssetDetails entry={entry} ownerId={ownerId}/>;
      break;
    case TagAuditLogTypes.DIRECTORY_STATE_CHANGED:
      summary = (details.to === null || details.to === undefined) ?
        <>Removed from the directory (was {stateLabel(details.from)})</> :
        <>Verification: {stateLabel(details.from)} → {stateLabel(details.to)}</>;
      break;
    case TagAuditLogTypes.STAFF_TAG_EDIT:
      summary = <>Staff edited the {[(details.content_after != null) ? 'content' : null, (details.name_after != null) ? 'name' : null].filter(Boolean).join(' and ')}</>;
      body = (
        <>
          {(details.name_after != null) ? <p className='text-xs text-subtle'>Name: <span className='font-mono text-fg'>{details.name_before}</span> → <span className='font-mono text-fg'>{details.name_after}</span></p> : null}
          {(details.content_after != null) ? <ContentChange before={details.content_before ?? ''} after={details.content_after}/> : null}
        </>
      );
      break;
    case TagAuditLogTypes.EDIT_REQUEST_REVIEWED: {
      const approved = details.status === TagDirectoryEditRequestStatuses.APPROVED;
      summary = <>{(approved) ? 'Approved' : 'Rejected'} the owner’s change request</>;
      body = (
        <>
          {(!approved && details.reason) ? <p className='text-xs break-words text-subtle'>Reason: <span className='text-fg'>{details.reason}</span></p> : null}
          {(approved && details.content_after != null) ? <ContentChange before={details.content_before ?? ''} after={details.content_after}/> : null}
        </>
      );
      break;
    }
    case TagAuditLogTypes.TAG_REMOVED:
      summary = <>Deleted the tag{(details.name) ? <> <span className='font-mono'>{details.name}</span></> : null}</>;
      body = (details.content !== undefined) ? <ContentChange before={details.content} label='Its content'/> : null;
      break;
    default:
      summary = <>Unknown entry ({entry.type})</>;
  }
  return (
    <li>
      <p className='text-fg'>{summary}</p>
      {body}
    </li>
  );
}


function stateLabel(state: number | null | undefined): string {
  return (state === null || state === undefined) ? 'off the directory' : verificationInfo(state).shortLabel;
}


// what identifies the file, which is all that's left of it once it's removed
function AssetDetails({ entry, ownerId }: {entry: TagAuditEntry, ownerId: string | null}) {
  const { details } = entry;
  const facts = [
    details.mimetype,
    (details.size) ? formatMemory(details.size, 1) : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle'>
      {(entry.asset_id) ? <CopyableValue value={entry.asset_id} truncate={0}/> : null}
      {(facts) ? <span>{facts}</span> : null}
      {(details.uploaded_by) ? (
        <span className='inline-flex items-center gap-1'>
          uploaded by{(details.uploaded_by === ownerId) ? ' the owner' : ''}
          <CopyableValue value={details.uploaded_by} truncate={0} to={adminUserPath(details.uploaded_by)} linkTitle='Open in users'/>
        </span>
      ) : null}
      {(details.requested_by) ? <span>asked for by the owner</span> : null}
      {(details.source_url) ? (
        <span className='inline-flex min-w-0 max-w-full items-center gap-1'>
          from
          <a href={details.source_url} target='_blank' rel='noreferrer noopener nofollow' title={details.source_url} className='truncate font-mono text-brand-text hover:underline'>
            {details.source_url}
          </a>
        </span>
      ) : null}
      {(details.sha256) ? <span className='inline-flex items-center gap-1'>sha256 <CopyableValue value={details.sha256} truncate={12}/></span> : null}
    </div>
  );
}


function ContentChange({ before, after, label }: {before: string, after?: string, label?: string}) {
  return (
    <details className='mt-1 text-xs'>
      <summary className='cursor-pointer text-subtle hover:text-fg'>{label ?? 'Before and after'}</summary>
      <div className={cn('mt-1 grid gap-2', (after !== undefined) && 'sm:grid-cols-2')}>
        <pre className='max-h-48 overflow-auto rounded border border-line bg-surface p-2 font-mono whitespace-pre-wrap break-words text-fg'>
          {before || <span className='text-subtle italic'>(empty)</span>}
        </pre>
        {(after !== undefined) ? (
          <pre className='max-h-48 overflow-auto rounded border border-line bg-surface p-2 font-mono whitespace-pre-wrap break-words text-fg'>
            {after || <span className='text-subtle italic'>(empty)</span>}
          </pre>
        ) : null}
      </div>
    </details>
  );
}
