import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useI18n } from '@/i18n';
import type { GuildContentUser, GuildTag, UserGuild } from '@/lib/api';
import { errorMessage, useGuildTagDeleteMutation, useGuildTagsQuery } from '@/lib/api/dashboardQueries';
import { formatDate } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { EmptyState, Panel, Skeleton } from '../ui';
import { AREA_PERMISSION } from './guildMeta';


// The tags made in the server, newest first, like `tag list` in Discord: any member can look through them, removing
// someone else's needs Manage Server or Ban Members (a moderator's `tag remove`)
export function GuildTagsSection({ guild }: {guild: UserGuild}) {
  const { t, plural } = useI18n();
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
      title={t('stags.title')}
      accent='#eb459e'
      description={(canRemove) ? t('stags.description_manage') : t('stags.description', {permission: AREA_PERMISSION.tags})}
    >
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <SearchInput className='min-w-0 flex-1' size='sm' value={search} onValueChange={setSearch} placeholder={t('stags.search_placeholder')} aria-label={t('stags.search_label')}/>
          {(count !== undefined) ? <p className='text-sm text-muted'>{plural('stags.count', count)}</p> : null}
        </div>

        {(tags.isPending) ? (
          <div aria-hidden className='space-y-2'>
            <Skeleton className='h-14 w-full bg-surface-2'/>
            <Skeleton className='h-14 w-full bg-surface-2'/>
          </div>
        ) : (tags.error) ? (
          <p role='alert' className='text-sm text-danger'>{errorMessage(tags.error, t('stags.load_error'))}</p>
        ) : (items.length) ? (
          <ul className='divide-y divide-line rounded-md border border-line'>
            {items.map((tag) => (
              <li key={tag.id} className='flex items-start gap-3 px-3 py-2.5'>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <span className='truncate font-mono text-sm text-white'>{tag.name}</span>
                    {(tag.reference_tag) ? <Chip tone='neutral' title={t('stags.alias_title', {name: tag.reference_tag.name})}>{t('dtags.chip.alias')}</Chip> : null}
                    {(tag.is_command) ? <Chip tone='brand' title={t('stags.command_title')}>{t('dtags.chip.command')}</Chip> : null}
                    {(tag.nsfw) ? <Chip tone='danger'>{t('stags.nsfw')}</Chip> : null}
                  </div>
                  {(tag.reference_tag) ? null : <p className='line-clamp-2 text-sm break-words text-muted'>{tag.content}</p>}
                  <p className='flex flex-wrap items-center gap-x-1.5 text-xs text-subtle'>
                    <Owner user={tag.user}/>
                    <span aria-hidden>•</span>
                    <span className='tabular-nums'>{plural('dtags.uses', tag.uses)}</span>
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
                    {t('common.remove')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t((query) ? 'stags.empty_search' : 'stags.empty')}>
            {t((query) ? 'stags.empty_search_description' : 'stags.empty_description')}
          </EmptyState>
        )}

        {(tags.hasNextPage) ? (
          <button type='button' className='btn btn-secondary btn-sm' disabled={tags.isFetchingNextPage} onClick={() => void tags.fetchNextPage()}>
            {(tags.isFetchingNextPage) ? <Spinner className='size-3.5'/> : null}
            {t('stags.load_older')}
          </button>
        ) : null}
      </div>

      {(removing) ? (
        <ConfirmDialog
          title={t('stags.remove_title', {name: removing.name})}
          description={t('stags.remove_description', {user: removing.user.username})}
          confirmLabel={t('stags.remove')}
          pending={mutation.isPending}
          onConfirm={() => {
            mutation.mutate(removing.id, {
              onSuccess: () => {
                toast(t('stags.removed', {name: removing.name}));
                setRemoving(null);
              },
              onError: (error) => toast(errorMessage(error, t('stags.remove_error')), 'error'),
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
