import { Send } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { GuildReminder, UserGuild } from '@/lib/api';
import { errorMessage, useGuildReminderMoveMutation, useGuildRemindersQuery } from '@/lib/api/dashboardQueries';
import { formatDateTime } from '@/lib/utils';

import { EmptyState, Panel, Skeleton } from '../ui';
import { EntryMention, useReadOnlyMessage } from './guildMeta';
import { Owner } from './GuildTagsSection';


// The reminders set to go off in the server, the soonest first, like `remind list server`. A moderator can't delete
// someone's reminder, only move it out of the server into the owner's dms (`remind delete server`), so that's the one
// action here. Seeing them needs Manage Messages, the same as moving them
export function GuildRemindersSection({ guild }: {guild: UserGuild}) {
  const toast = useToast();
  const editable = guild.editable.reminders;
  const readOnlyMessage = useReadOnlyMessage();
  const reminders = useGuildRemindersQuery(guild.id, editable);
  const mutation = useGuildReminderMoveMutation(guild.id);
  const [ moving, setMoving ] = useState<GuildReminder | null>(null);

  const pages = reminders.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const count = pages[0]?.count;

  return (
    <Panel
      title='Reminders'
      accent='#fee75c'
      description='Members’ reminders that go off in this server. Moving one sends it to its owner in DMs instead, nothing else about it changes.'
      readOnly={(editable) ? undefined : readOnlyMessage('reminders')}
    >
      {(!editable) ? (
        <p className='text-sm text-muted'>Members’ reminders are only shown to people who can manage messages.</p>
      ) : (
        <div className='space-y-3'>
          {(count !== undefined) ? <p className='text-sm text-muted'>{count.toLocaleString()} reminder{(count === 1) ? '' : 's'} in this server</p> : null}

          {(reminders.isPending) ? (
            <div aria-hidden className='space-y-2'>
              <Skeleton className='h-14 w-full bg-surface-2'/>
              <Skeleton className='h-14 w-full bg-surface-2'/>
            </div>
          ) : (reminders.error) ? (
            <p role='alert' className='text-sm text-danger'>{errorMessage(reminders.error, 'Couldn’t load the reminders.')}</p>
          ) : (items.length) ? (
            <ul className='divide-y divide-line rounded-md border border-line'>
              {items.map((reminder) => (
                <li key={reminder.id} className='flex items-start gap-3 px-3 py-2.5'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <p className='text-sm break-words whitespace-pre-wrap text-fg'>
                      {reminder.content || <span className='text-subtle italic'>No message</span>}
                    </p>
                    <p className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-subtle'>
                      <Owner user={reminder.user}/>
                      {(reminder.channel_id) ? (
                        <>
                          <span aria-hidden>•</span>
                          <EntryMention type='channel' id={reminder.channel_id}/>
                        </>
                      ) : null}
                      <span aria-hidden>•</span>
                      <span>{(reminder.timestamp_end) ? `Goes off ${formatDateTime(reminder.timestamp_end)}` : 'No end time'}</span>
                    </p>
                  </div>
                  <button
                    type='button'
                    className='btn btn-secondary btn-sm shrink-0'
                    disabled={mutation.isPending}
                    onClick={() => setMoving(reminder)}
                  >
                    <Send aria-hidden className='size-3.5'/>
                    Move to DMs
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title='No reminders here'>Members set reminders with the remind command.</EmptyState>
          )}

          {(reminders.hasNextPage) ? (
            <button type='button' className='btn btn-secondary btn-sm' disabled={reminders.isFetchingNextPage} onClick={() => void reminders.fetchNextPage()}>
              {(reminders.isFetchingNextPage) ? <Spinner className='size-3.5'/> : null}
              Load more
            </button>
          ) : null}
        </div>
      )}

      {(moving) ? (
        <ConfirmDialog
          title='Move this reminder to DMs?'
          description={`${moving.user.username}’s reminder will go off in their DMs instead of this server. It can’t be moved back from here.`}
          confirmLabel='Move to DMs'
          tone='primary'
          pending={mutation.isPending}
          onConfirm={() => {
            mutation.mutate(moving.id, {
              onSuccess: () => {
                toast('Moved the reminder to their DMs');
                setMoving(null);
              },
              onError: (error) => toast(errorMessage(error, 'Couldn’t move the reminder.'), 'error'),
            });
          }}
          onClose={() => setMoving(null)}
        />
      ) : null}
    </Panel>
  );
}
