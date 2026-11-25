import { Ban, Lock, LockOpen, MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { UserFlags, type ContentFlagUser } from '@/lib/api';
import { cn } from '@/lib/utils';

import { BlockUserDialog, canBlockUser } from './BlockUserDialog';
import { canToggleLegalHold, LegalHoldDialog, legalHoldTitle } from './LegalHoldDialog';
import { WarnUserDialog } from './UserWarnings';


// Warn, Block (or Unblock) and Legal hold for a user shown somewhere other than their own admin page, like a report's reporter or
// the user it's about, a flag's uploader or a tag's owner. Same rules as the user page: owners can't be warned or
// blocked, moderators can't do either to other moderators, unblocking is owner only, and bots can't be warned (`bot`
// is only on a report's users, the others don't say). `defaultReason` fills both dialogs
export function UserModerationButtons({ user, defaultReason = '', className }: {
  user: ContentFlagUser & {bot?: boolean},
  defaultReason?: string,
  className?: string,
}) {
  const { user: me } = useAuth();
  const viewerIsOwner = isOwner(me);
  const [ dialog, setDialog ] = useState<'block' | 'hold' | 'warn' | null>(null);
  const allowed = canBlockUser(user, viewerIsOwner);
  const cantReason = (allowed) ? null : ((user.flags & UserFlags.OWNER) === UserFlags.OWNER) ? 'Owners can’t be warned or blocked.' : 'Only owners can warn or block moderators.';
  const canToggleBlock = (user.blocked) ? viewerIsOwner : allowed;
  const blockTitle = (user.blocked) ? ((viewerIsOwner) ? 'Unblock them' : 'Only bot owners can unblock users.') : (cantReason ?? 'Block them from NotSoBot (also warns them)');
  const warnTitle = (user.bot) ? 'Bots can’t be warned.' : (cantReason ?? 'Warn them: a DM, and shown in place of their next command');

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <button
        type='button'
        className='btn btn-secondary btn-sm px-2'
        disabled={!allowed || !!user.bot}
        title={warnTitle}
        onClick={() => setDialog('warn')}
      >
        <MessageSquareWarning aria-hidden className='size-4'/>
        <span className='sr-only sm:not-sr-only'>Warn</span>
      </button>
      <button
        type='button'
        className={cn('btn btn-sm px-2', (user.blocked) ? 'btn-secondary' : 'btn-danger')}
        disabled={!canToggleBlock}
        title={blockTitle}
        onClick={() => setDialog('block')}
      >
        {(user.blocked) ? <ShieldCheck aria-hidden className='size-4'/> : <Ban aria-hidden className='size-4'/>}
        <span className='sr-only sm:not-sr-only'>{(user.blocked) ? 'Unblock' : 'Block'}</span>
      </button>
      <button
        type='button'
        className={cn('btn btn-sm px-2', (user.legal_hold) ? 'btn-secondary text-warning' : 'btn-secondary')}
        disabled={!canToggleLegalHold(user, viewerIsOwner)}
        title={legalHoldTitle(user, viewerIsOwner)}
        onClick={() => setDialog('hold')}
      >
        {(user.legal_hold) ? <LockOpen aria-hidden className='size-4'/> : <Lock aria-hidden className='size-4'/>}
        <span className='sr-only sm:not-sr-only'>{(user.legal_hold) ? 'Lift hold' : 'Hold'}</span>
      </button>

      {(dialog === 'warn') ? <WarnUserDialog user={user} defaultReason={defaultReason} onClose={() => setDialog(null)}/> : null}
      {(dialog === 'hold') ? <LegalHoldDialog user={user} hold={user} onClose={() => setDialog(null)}/> : null}
      {(dialog === 'block') ? (
        <BlockUserDialog
          user={user}
          blocked={user.blocked}
          blockedReason={user.blocked_reason}
          blockedUntil={user.blocked_until}
          defaultReason={defaultReason}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
