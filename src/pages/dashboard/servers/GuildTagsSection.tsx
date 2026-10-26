import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { GuildContentUser, GuildTag, UserGuild } from '@/lib/api';
import { errorMessage, useGuildTagDeleteMutation, useGuildTagsQuery } from '@/lib/api/dashboardQueries';
import { formatDate } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { EmptyState, Panel, Skeleton } from '../ui';
import { AREA_PERMISSION } from './guildMeta';


// The tags made in the server, newest first, like `tag list` in Discord: any member can look through them, removing
// someone else's needs Manage Server or Ban Members (a moderator's `tag remove`)
export function GuildTagsSection({ guild }: {guild: UserGuild}) {
  const toast = useToast();
  const canRemove = guild.editable.tags;
  const [ search, setSearch ] = useState('');
  const query = useDebouncedValue(search.trim());
  const tags = useGuildTagsQuery(guild.id, query);
  const mutation = useGuildTagDeleteMutation(guild.id);
  const [ removing, setRemoving ] = useState<GuildTag | null>(null);

  const pages = tags.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const count = pages[0]?.count;

  return (
    <Panel
      title='Tags'
      accent='#eb459e'
      description={(canRemove)
        ? 'Every tag made in this server. You can remove any of them, like a moderator’s tag remove in Discord.'
        : `Every tag made in this server. Removing someone else’s needs the ${AREA_PERMISSION.tags} permission.`}
    >
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <SearchInput className='min-w-0 flex-1' size='sm' value={search} onValueChange={setSearch} placeholder='Search names and content...' aria-label='Search tags'/>
          {(count !== undefined) ? <p className='text-sm text-muted'>{count.toLocaleString()} tag{(count === 1) ? '' : 's'}</p> : null}
        </div>

        {(tags.isPending) ? (
          <div aria-hidden className='space-y-2'>
            <Skeleton className='h-14 w-full bg-surface-2'/>
            <Skeleton className='h-14 w-full bg-surface-2'/>
          </div>
        ) : (tags.error) ? (
          <p role='alert' className='text-sm text-danger'>{errorMessage(tags.error, 'Couldn’t load the tags.')}</p>
        ) : (items.length) ? (
          <ul className='divide-y divide-line rounded-md border border-line'>
            {items.map((tag) => (
              <li key={tag.id} className='flex items-start gap-3 px-3 py-2.5'>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <span className='truncate font-mono text-sm text-white'>{tag.name}</span>
                    {(tag.reference_tag) ? <Chip tone='neutral' title={`An alias of ${tag.reference_tag.name}`}>alias</Chip> : null}
                    {(tag.is_command) ? <Chip tone='brand' title='Runs as a custom command'>command</Chip> : null}
                    {(tag.nsfw) ? <Chip tone='danger'>nsfw</Chip> : null}
                  </div>
                  {(tag.reference_tag) ? null : <p className='line-clamp-2 text-sm break-words text-muted'>{tag.content}</p>}
                  <p className='flex flex-wrap items-center gap-x-1.5 text-xs text-subtle'>
                    <Owner user={tag.user}/>
                    <span aria-hidden>•</span>
                    <span className='tabular-nums'>{tag.uses.toLocaleString()} {(tag.uses === 1) ? 'use' : 'uses'}</span>
                    <span aria-hidden>•</span>
                    <span>{formatDate(tag.created)}</span>
                  </p>
                </div>
                {(canRemove) ? (
                  <button
                    type='button'
                    className='btn btn-secondary btn-sm shrink-0'
                    disabled={mutation.isPending}
                    onClick={() => setRemoving(tag)}
                  >
                    <Trash2 aria-hidden className='size-3.5'/>
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={(query) ? 'No tags found' : 'No tags yet'}>
            {(query) ? 'Try a different search.' : 'Members make tags here with the tag create command.'}
          </EmptyState>
        )}

        {(tags.hasNextPage) ? (
          <button type='button' className='btn btn-secondary btn-sm' disabled={tags.isFetchingNextPage} onClick={() => void tags.fetchNextPage()}>
            {(tags.isFetchingNextPage) ? <Spinner className='size-3.5'/> : null}
            Load older
          </button>
        ) : null}
      </div>

      {(removing) ? (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          description={`This deletes the tag made by ${removing.user.username} for good, with its variables and anyone’s aliases of it.`}
          confirmLabel='Remove tag'
          pending={mutation.isPending}
          onConfirm={() => {
            mutation.mutate(removing.id, {
              onSuccess: () => {
                toast(`Removed ${removing.name}`);
                setRemoving(null);
              },
              onError: (error) => toast(errorMessage(error, 'Couldn’t remove the tag.'), 'error'),
            });
          }}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </Panel>
  );
}


export function Owner({ user }: {user: GuildContentUser}) {
  return (
    <span className='inline-flex min-w-0 items-center gap-1' title={user.id}>
      <UserAvatar user={user} size={32} className='size-4 shrink-0 rounded-full'/>
      <span className='truncate'>{user.username}</span>
    </span>
  );
}
