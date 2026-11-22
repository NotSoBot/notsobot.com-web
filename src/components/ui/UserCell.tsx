import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';

import type { AdminUserRef } from '@/lib/api';
import { userDisplayTag } from '@/lib/discord';
import { cn } from '@/lib/utils';

import { CopyableValue } from './CopyableValue';
import { UserAvatar } from './UserAvatar';


// avatar + name + id; avatars come from Discord's CDN (never from user-submitted content).
// With `to` the avatar and name link to that user's admin page and the id gets a copy button.
export function UserCell({ user, fallbackId, size = 'md', to }: {user: AdminUserRef | null, fallbackId?: string | null, size?: 'sm' | 'md', to?: string}) {
  if (!user) {
    return (
      <span className='text-sm text-subtle'>
        Unknown user{(fallbackId) ? (
          <> • {(to) ? <CopyableValue value={fallbackId} truncate={0} to={to} linkTitle='Open in users' className='relative z-10'/> : <span className='font-mono'>{fallbackId}</span>}</>
        ) : null}
      </span>
    );
  }
  const name = userDisplayTag(user);
  const avatar = (
    <UserAvatar
      user={user}
      size={64}
      loading='lazy'
      className={cn('shrink-0 rounded-full bg-surface-3', (size === 'sm') ? 'size-6' : 'size-8')}
    />
  );
  if (to) {
    return (
      <span className='flex min-w-0 items-center gap-2'>
        <Link to={to} tabIndex={-1} aria-hidden className='relative z-10 shrink-0'>{avatar}</Link>
        <span className='min-w-0'>
          <Link to={to} title='Open in users' className='group/user relative z-10 flex min-w-0 items-center gap-1 text-sm font-medium text-white underline-offset-2 hover:underline'>
            <span className='truncate'>{name}</span>
            <ArrowUpRight aria-hidden className='size-3.5 shrink-0 text-subtle transition-colors group-hover/user:text-brand-text'/>
          </Link>
          <CopyableValue value={user.id} truncate={0} className='relative z-10 max-w-full'/>
        </span>
      </span>
    );
  }
  return (
    <span className='flex min-w-0 items-center gap-2'>
      {avatar}
      <span className='min-w-0'>
        <span className='block truncate text-sm font-medium text-white'>{name}</span>
        <span className='block truncate font-mono text-xs text-subtle'>{user.id}</span>
      </span>
    </span>
  );
}
