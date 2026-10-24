import { X } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { GuildWarning, UserGuild } from '@/lib/api';
import { errorMessage, useGuildWarningsMutation, useGuildWarningsQuery, type GuildWarningsAction } from '@/lib/api/dashboardQueries';
import { formatDate } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { isSnowflake } from '../tags/tagMeta';
import { EmptyState, Field, Panel, Skeleton } from '../ui';
import { EntryMention, formatSeconds, useReadOnlyMessage } from './guildMeta';
import { RemoveButton } from './ServerSections';


// The server's warnings from the bot's `warn`, newest first. Seeing and removing them needs Timeout Members, the same as
// the bot's commands; how long they stay active and when they're deleted are in the server settings.
export function WarningsSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.moderation;
  const readOnlyMessage = useReadOnlyMessage();

  return (
    <Panel
      title='Warnings'
      accent='#fee75c'
      description='Warnings given with the warn command. Members get theirs in a DM.'
      readOnly={(editable) ? undefined : readOnlyMessage('moderation')}
    >
      {(editable) ? <WarningsList guildId={guild.id}/> : <p className='text-sm text-muted'>Members’ warnings are only shown to moderators.</p>}
    </Panel>
  );
}


function WarningsList({ guildId }: {guildId: string}) {
  const toast = useToast();
  const [ filter, setFilter ] = useState('');
  const [ busyKey, setBusyKey ] = useState<string | null>(null);
  const [ confirmingClear, setConfirmingClear ] = useState(false);

  const trimmed = filter.trim();
  const userId = (isSnowflake(trimmed)) ? trimmed : null;
  const query = useGuildWarningsQuery(guildId, userId);
  const mutation = useGuildWarningsMutation(guildId);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const warnings = pages.flatMap((page) => page.warnings);

  const run = async (key: string, action: GuildWarningsAction, success: string): Promise<boolean> => {
    setBusyKey(key);
    try {
      await mutation.mutateAsync(action);
      toast(success);
      return true;
    } catch (error) {
      toast(errorMessage(error, 'Couldn’t remove that.'), 'error');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-end gap-3'>
        <Field
          className='min-w-0 flex-1'
          label='Member'
          error={(trimmed && !userId) ? 'Enter a user ID (17-20 digits).' : undefined}
        >
          {(props) => (
            <div className='relative'>
              <input
                {...props}
                className='input pr-9 font-mono'
                inputMode='numeric'
                placeholder='User ID, or leave empty for everyone'
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
              {(filter) ? (
                <button type='button' aria-label='Show everyone’s warnings' className='absolute inset-y-0 right-0 flex w-9 items-center justify-center text-subtle hover:text-white' onClick={() => setFilter('')}>
                  <X aria-hidden className='size-4'/>
                </button>
              ) : null}
            </div>
          )}
        </Field>
        {(userId && first && first.count) ? (
          <button type='button' className='btn btn-secondary' disabled={mutation.isPending} onClick={() => setConfirmingClear(true)}>
            Clear all of theirs
          </button>
        ) : null}
      </div>

      {(first) ? (
        <p className='text-sm text-muted'>
          {first.count.toLocaleString()} warning{(first.count === 1) ? '' : 's'}, {first.active.toLocaleString()} active (from the last {formatSeconds(first.window)})
        </p>
      ) : null}

      {(query.isPending && (!trimmed || userId)) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-14 w-full bg-surface-2'/>
          <Skeleton className='h-14 w-full bg-surface-2'/>
        </div>
      ) : (query.error) ? (
        <p role='alert' className='text-sm text-danger'>{errorMessage(query.error, 'Couldn’t load the warnings.')}</p>
      ) : (warnings.length && first) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {warnings.map((warning) => (
            <WarningRow
              key={warning.id}
              warning={warning}
              window={first.window}
              showUser={!userId}
              busy={busyKey === warning.id}
              disabled={mutation.isPending}
              onFilter={() => setFilter(warning.user_id)}
              onRemove={() => void run(warning.id, {kind: 'remove', warningId: warning.id}, 'Removed the warning')}
            />
          ))}
        </ul>
      ) : (trimmed && !userId) ? null : (
        <EmptyState title={(userId) ? 'No warnings for this member' : 'No warnings'}>Give one with the warn command in Discord.</EmptyState>
      )}

      {(query.hasNextPage) ? (
        <button type='button' className='btn btn-secondary btn-sm' disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {(query.isFetchingNextPage) ? <Spinner className='size-3.5'/> : null}
          Load older
        </button>
      ) : null}

      {(confirmingClear && userId && first) ? (
        <ConfirmDialog
          title='Clear their warnings?'
          description={`All ${first.count.toLocaleString()} of ${userId}’s warnings in this server will be deleted. This can’t be undone.`}
          confirmLabel='Clear warnings'
          pending={busyKey === userId}
          onConfirm={async () => {
            if (await run(userId, {kind: 'clear', userId}, 'Cleared their warnings')) {
              setConfirmingClear(false);
            }
          }}
          onClose={() => setConfirmingClear(false)}
        />
      ) : null}
    </div>
  );
}


function WarningRow({ warning, window, showUser, busy, disabled, onFilter, onRemove }: {
  warning: GuildWarning,
  window: number,
  showUser: boolean,
  busy: boolean,
  disabled: boolean,
  onFilter: () => void,
  onRemove: () => void,
}) {
  const created = Date.parse(warning.created);
  const inactive = created < Date.now() - window * 1000;
  return (
    <li className='flex items-start gap-3 px-3 py-2'>
      <div className='min-w-0 flex-1 space-y-0.5'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          {(showUser) ? (
            <button type='button' title='Show only their warnings' className='min-w-0 rounded hover:bg-surface-3' onClick={onFilter}>
              <EntryMention type='user' id={warning.user_id}/>
            </button>
          ) : null}
          {(inactive) ? <Chip title={`Older than ${formatSeconds(window)}, it doesn’t count as active`}>inactive</Chip> : null}
        </div>
        {(warning.reason) ? (
          <p className='text-sm break-words whitespace-pre-wrap text-fg'>{warning.reason}</p>
        ) : (
          <p className='text-sm text-muted italic'>No reason given</p>
        )}
        <p className='text-xs text-subtle'>
          by <span className='font-mono'>{warning.moderator_id}</span> · {formatDate(created)} · <span className='font-mono'>{warning.id}</span>
        </p>
      </div>
      <RemoveButton label={`Remove warning ${warning.id}`} busy={busy} disabled={disabled} onClick={onRemove}/>
    </li>
  );
}
