import { Check, Clock, Link2, MessageSquarePlus, RotateCw, UserPlus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { RoomInvite, RoomInviter } from '../invites';


// why the bot couldn't post the invite (notsobot.api's editor/sharing.py `PostCheck.reason`) as a sentence: a raw `dm`
// used to show in the message
const NOT_POSTED_KEYS = {
  dm: 'editor.invite.not_posted_dm',
  private: 'editor.invite.not_posted_private',
  permissions: 'editor.invite.not_posted_permissions',
  discord: 'editor.invite.not_posted_discord',
} as const;

function notPostedKey(reason: string | undefined) {
  return (reason && reason in NOT_POSTED_KEYS) ? NOT_POSTED_KEYS[reason as keyof typeof NOT_POSTED_KEYS] : 'editor.invite.not_posted';
}


type Outcome =
  | {kind: 'posted'}
  | {kind: 'not_posted', reason?: string}
  | {kind: 'sent'}
  | {kind: 'copied'};


// The room header's Invite (the editor's group rooms and the flag game's): one invite made when the dialog opens and
// reused for both ways of sending it while it stays open. "Share link" is Discord's share sheet, "Post in this channel"
// the bot's post with a Join button. On notsogames.com (no `post`) the link is all there is
export function RoomInviteDialog({ inviter, onClose }: {inviter: RoomInviter, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  // the room it was opened for, even if the header re-renders with a new inviter
  const [ bound ] = useState(() => inviter);
  const [ invite, setInvite ] = useState<RoomInvite | null>(null);
  const [ creating, setCreating ] = useState(true);
  const [ pending, setPending ] = useState<'share' | 'post' | null>(null);
  const [ outcome, setOutcome ] = useState<Outcome | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  // the one request making it (strict mode runs the effect twice, it makes one)
  const making = useRef<Promise<RoomInvite> | null>(null);
  const alive = useRef(true);

  const messageOf = (failure: unknown) => bound.errorOf(failure)?.message || ((failure instanceof Error && failure.message) ? failure.message : t('editor.invite.failed'));

  // the invite, made once (again after a failure)
  const ensure = async (): Promise<RoomInvite> => {
    if (invite) {
      return invite;
    }
    if (!making.current) {
      setCreating(true);
      making.current = bound.create();
      making.current.then((made) => {
        if (alive.current) {
          setInvite(made);
          setCreating(false);
        }
      }, () => {
        making.current = null;
        if (alive.current) {
          setCreating(false);
        }
      });
    }
    return making.current;
  };

  useEffect(() => {
    alive.current = true;
    ensure().catch((failure) => setError(messageOf(failure)));
    return () => {
      alive.current = false;
    };
    // made once when it opens
  }, []);

  const run = async (action: 'share' | 'post') => {
    setPending(action);
    setError(null);
    setOutcome(null);
    try {
      const { code } = await ensure();
      if (action === 'share') {
        const shared = await bound.shareLink(code);
        if (alive.current && shared !== 'none') {
          setOutcome({kind: shared});
        }
      } else {
        const result = await bound.post?.(code) ?? {posted: false};
        if (alive.current) {
          setOutcome((result.posted) ? {kind: 'posted'} : {kind: 'not_posted', reason: result.reason});
        }
      }
    } catch (failure) {
      if (alive.current) {
        setError(messageOf(failure));
      }
    } finally {
      if (alive.current) {
        setPending(null);
      }
    }
  };

  const busy = pending !== null || (creating && !error);
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <div className='flex flex-col gap-4 p-5 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>
            {(bound.kind === 'game') ? t('editor.invite.title_game') : t('editor.invite.title_editor')}
          </h2>
          <p className='mt-2 text-sm text-muted'>{t((bound.post) ? 'editor.invite.description' : 'editor.invite.description_link')}</p>
        </div>

        <div className='flex flex-col gap-2 sm:flex-row'>
          <button type='button' className='btn btn-secondary flex-1' disabled={busy} onClick={() => void run('share')}>
            {(pending === 'share') ? <Spinner className='size-4'/> : <Link2 aria-hidden className='size-4'/>}
            {t('editor.invite.share')}
          </button>
          {(bound.post) ? (
            <button type='button' className='btn btn-primary flex-1' disabled={busy} onClick={() => void run('post')}>
              {(pending === 'post') ? <Spinner className='size-4 border-white/40 border-t-white'/> : <MessageSquarePlus aria-hidden className='size-4'/>}
              {t('editor.invite.post')}
            </button>
          ) : null}
        </div>

        <p className='flex items-center gap-1.5 text-xs text-subtle'>
          {(creating && !error) ? (
            <><Spinner className='size-3.5'/>{t('editor.invite.creating')}</>
          ) : (
            <><Clock aria-hidden className='size-3.5 shrink-0'/>{t('editor.invite.expires')}</>
          )}
        </p>

        {(outcome) ? (
          <p role='status' className={cn('flex gap-1.5 text-sm', (outcome.kind === 'not_posted') ? 'text-warning-text' : 'text-success-text')}>
            {(outcome.kind !== 'not_posted') ? <Check aria-hidden className='mt-0.5 size-4 shrink-0'/> : null}
            {(outcome.kind === 'posted') ? t('editor.invite.posted')
              : (outcome.kind === 'sent') ? t('editor.invite.sent')
              : (outcome.kind === 'copied') ? t('editor.invite.copied')
              : t(notPostedKey(outcome.reason))}
          </p>
        ) : null}
        {(error) ? <DialogError>{error}</DialogError> : null}

        <div className='flex justify-end gap-2'>
          {(error && !invite && !creating) ? (
            <button type='button' className='btn btn-secondary' onClick={() => {
              setError(null);
              ensure().catch((failure) => setError(messageOf(failure)));
            }}>
              <RotateCw aria-hidden className='size-4'/>{t('common.retry')}
            </button>
          ) : null}
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('editor.invite.done')}</button>
        </div>
      </div>
    </Modal>
  );
}


// the header button that opens it. `compact`: icon only (the flag game's header), otherwise the label shows from `sm`
export function RoomInviteButton({ inviter, compact = false }: {inviter: RoomInviter, compact?: boolean}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        aria-label={t('editor.invite.button')}
        title={t('editor.invite.button')}
        onClick={() => setOpen(true)}
        className={(compact)
          ? 'flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg'
          : 'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'}
      >
        <UserPlus aria-hidden className='size-4'/>
        {(compact) ? null : <span className='hidden sm:inline'>{t('editor.invite.button')}</span>}
      </button>
      {(open) ? <RoomInviteDialog inviter={inviter} onClose={() => setOpen(false)}/> : null}
    </>
  );
}
