import { AudioLines, ChevronDown, Fish, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { api, VoiceCloneTypes, type MeVoice, type VoiceClip } from '@/lib/api';
import {
  errorMessage,
  useDeleteMeVoiceClipMutation,
  useDeleteMeVoiceMutation,
  useMeVoicesQuery,
  usePatchMeVoiceMutation,
  useTransferMeVoiceMutation,
  useUploadMeVoiceClipMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatMemory } from '@/lib/utils';

import { Chip } from '../admin/adminUi';
import { hasPremiumPlus } from '../premium';
import { DashboardHeader, EmptyState, ErrorPanel, InlineError, Skeleton } from '../ui';
import { RenameVoiceDialog, voicePlatformLabel } from './RenameVoiceDialog';


// the api's `MAX_VOICE_CLIPS`
const VOICE_CLIPS_MAX = 10;


function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}


export function VoicesPage() {
  const { user } = useAuth();
  const { t, rich, plural } = useI18n();
  const toast = useToast();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeVoicesQuery();
  const rename = usePatchMeVoiceMutation();
  const remove = useDeleteMeVoiceMutation();
  const transfer = useTransferMeVoiceMutation();
  const [ renaming, setRenaming ] = useState<MeVoice | null>(null);
  const [ deleting, setDeleting ] = useState<MeVoice | null>(null);
  const [ transferring, setTransferring ] = useState<MeVoice | null>(null);
  const items = data?.items ?? [];
  const canUpload = hasPremiumPlus(user);

  return (
    <>
      <DashboardHeader
        title={t('page.DASHBOARD_VOICES')}
        description={rich('voices.description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
      />

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title={t('voices.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<AudioLines className='size-10'/>} title={t('voices.empty')}>
          {rich('voices.empty_description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
        </EmptyState>
      ) : (
        <>
          {(!canUpload) ? (
            <p className='mb-3 text-sm text-muted'>{t('voices.needs_plus')}</p>
          ) : null}
          <ul className='space-y-3'>
            {items.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                canUpload={canUpload}
                onRename={() => setRenaming(voice)}
                onTransfer={(voice.platform_type === VoiceCloneTypes.ELEVENLABS) ? () => {
                  transfer.reset();
                  setTransferring(voice);
                } : undefined}
                onDelete={() => {
                  remove.reset();
                  setDeleting(voice);
                }}
              />
            ))}
          </ul>
        </>
      )}

      {(renaming) ? <RenameVoiceDialog voice={renaming} mutation={rename} onClose={() => setRenaming(null)}/> : null}

      {(transferring) ? (
        <ConfirmDialog
          title={t('voices.move_title', {name: transferring.name})}
          description={plural('voices.move_description', transferring.clips.length)}
          confirmLabel={t('voices.move')}
          tone='primary'
          pending={transfer.isPending}
          error={(transfer.isError) ? errorMessage(transfer.error, t('voices.move_error')) : null}
          onConfirm={() => {
            transfer.mutate({voiceId: transferring.id, platformType: VoiceCloneTypes.FISH_AUDIO}, {
              onSuccess: (voice) => {
                toast(t('voices.moved', {name: voice.name}));
                setTransferring(null);
              },
            });
          }}
          onClose={() => {
            transfer.reset();
            setTransferring(null);
          }}
        />
      ) : null}

      {(deleting) ? (
        <ConfirmDialog
          title={t('voices.delete_title', {name: deleting.name})}
          description={t('voices.delete_description', {platform: voicePlatformLabel(deleting.platform_type)})}
          confirmLabel={t('voices.delete')}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, t('voices.delete_error')) : null}
          onConfirm={() => {
            remove.mutate(deleting.id, {
              onSuccess: () => {
                toast(t('voices.deleted'));
                setDeleting(null);
              },
            });
          }}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}


// `onTransfer` only for voices that can be moved to fish.audio
function VoiceCard({ voice, canUpload, onRename, onTransfer, onDelete }: {
  voice: MeVoice,
  canUpload: boolean,
  onRename: () => void,
  onTransfer?: () => void,
  onDelete: () => void,
}) {
  const { t, plural } = useI18n();
  const toast = useToast();
  const upload = useUploadMeVoiceClipMutation();
  const remove = useDeleteMeVoiceClipMutation();
  const fileInput = useRef<HTMLInputElement>(null);
  // the clip the next picked file replaces, null adds one
  const replacing = useRef<string | null>(null);
  const [ deleting, setDeleting ] = useState<VoiceClip | null>(null);
  const [ showClips, setShowClips ] = useState(false);

  const full = VOICE_CLIPS_MAX <= voice.clips.length;
  const pendingClipId = (upload.isPending) ? (upload.variables?.clipId ?? null) : undefined;

  const pickFile = (clipId: string | null) => {
    replacing.current = clipId;
    upload.reset();
    fileInput.current?.click();
  };

  const uploadFile = (file: File) => {
    const clipId = replacing.current ?? undefined;
    upload.mutate({voiceId: voice.id, clipId, file}, {
      onSuccess: () => {
        toast(t((clipId) ? 'voices.clip_replaced' : 'voices.clip_added'));
        // shown so the added clip is visible
        setShowClips(true);
      },
    });
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }
    remove.mutate({voiceId: voice.id, clipId: deleting.id}, {
      onSuccess: () => {
        toast(t('voices.clip_deleted'));
        setDeleting(null);
      },
    });
  };

  return (
    <li className='card'>
      <div className='flex flex-wrap items-center gap-3 px-4 py-3'>
        <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eb459e]/15'>
          <AudioLines className='size-5 text-[#eb459e]'/>
        </span>
        <div className='min-w-0 flex-1'>
          <div className='truncate font-medium text-white'>{voice.name}</div>
          <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
            <Chip>{voicePlatformLabel(voice.platform_type)}</Chip>
            <span>{plural('voices.cloned', voice.clips.length, {date: formatDate(voice.created)})}</span>
          </div>
        </div>
        {/* their own row on phones, the name gets the whole width */}
        <div className='flex basis-full gap-2 sm:basis-auto'>
          <button type='button' className='btn btn-sm btn-secondary' onClick={onRename}>
            <Pencil className='size-4'/>
            {t('voices.rename')}
          </button>
          {(canUpload) ? (
            <button
              type='button'
              className='btn btn-sm btn-secondary'
              disabled={upload.isPending || full}
              title={(full) ? t('voices.clips_full', {max: VOICE_CLIPS_MAX}) : undefined}
              onClick={() => pickFile(null)}
            >
              {(pendingClipId === null) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Plus className='size-4'/>}
              {t('voices.add_clip')}
            </button>
          ) : null}
          {(onTransfer) ? (
            <button
              type='button'
              className='btn btn-sm btn-secondary'
              disabled={upload.isPending || !voice.clips.length}
              aria-label={t('voices.move_label', {name: voice.name})}
              title={t((voice.clips.length) ? 'voices.move_hint' : 'voices.move_needs_clips')}
              onClick={onTransfer}
            >
              <Fish className='size-4'/>
              <span className='hidden sm:inline'>{t('voices.move_button')}</span>
            </button>
          ) : null}
          <button type='button' className='btn btn-sm btn-danger' disabled={upload.isPending} aria-label={t('voices.delete_label', {name: voice.name})} onClick={onDelete}>
            <Trash2 className='size-4'/>
            <span className='hidden sm:inline'>{t('common.delete')}</span>
          </button>
        </div>
        <input
          ref={fileInput}
          type='file'
          accept='audio/*,video/*'
          className='hidden'
          onChange={(event) => {
            const file = event.target.files?.[0];
            // cleared so picking the same file again still fires
            event.target.value = '';
            if (file) {
              uploadFile(file);
            }
          }}
        />
      </div>

      {(upload.isError) ? (
        <div className='px-4 pb-3'>
          <InlineError>{errorMessage(upload.error, t('voices.upload_error'))}</InlineError>
        </div>
      ) : null}

      {(voice.clips.length) ? (
        <button
          type='button'
          aria-expanded={showClips}
          onClick={() => setShowClips((value) => !value)}
          className='flex w-full cursor-pointer items-center justify-between gap-2 border-t border-line px-4 py-2 text-xs text-muted transition-colors hover:text-white'
        >
          {(showClips) ? t('voices.hide_clips') : plural('voices.show_clips', voice.clips.length)}
          <ChevronDown className={cn('size-3.5 transition-transform', showClips && 'rotate-180')}/>
        </button>
      ) : null}

      {(!voice.clips.length) ? (
        <p className='border-t border-line px-4 py-3 text-sm text-muted'>
          {t('voices.no_clips')}
        </p>
      ) : (showClips) ? (
        <ul className='divide-y divide-line border-t border-line'>
          {voice.clips.map((clip) => (
            <ClipRow
              key={clip.id}
              voiceId={voice.id}
              clip={clip}
              canUpload={canUpload}
              canDelete={1 < voice.clips.length}
              busy={upload.isPending}
              replacing={pendingClipId === clip.id}
              onReplace={() => pickFile(clip.id)}
              onDelete={() => {
                remove.reset();
                setDeleting(clip);
              }}
            />
          ))}
        </ul>
      ) : null}

      {(deleting) ? (
        <ConfirmDialog
          title={t('voices.delete_title', {name: deleting.name})}
          description={t('voices.clip_delete_description', {voice: voice.name, platform: voicePlatformLabel(voice.platform_type)})}
          confirmLabel={t('voices.clip_delete')}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, t('voices.clip_delete_error')) : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}
    </li>
  );
}


function ClipRow({ voiceId, clip, canUpload, canDelete, busy, replacing, onReplace, onDelete }: {
  voiceId: string,
  clip: VoiceClip,
  canUpload: boolean,
  canDelete: boolean,
  busy: boolean,
  replacing: boolean,
  onReplace: () => void,
  onDelete: () => void,
}) {
  const { t } = useI18n();
  return (
    <li className='flex items-center gap-3 px-4 py-2.5'>
      <ClipPlayer voiceId={voiceId} clip={clip}/>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm text-fg'>{clip.name}</div>
        <div className='mt-0.5 text-xs text-subtle'>
          {formatDuration(clip.duration)} • {formatMemory(clip.size, (clip.size < 1024 * 1024) ? 0 : 1)} • {t('voices.clip_added_on', {date: formatDate(clip.created)})}
        </div>
      </div>
      <div className='flex shrink-0 gap-2'>
        {(canUpload) ? (
          <button type='button' className='btn btn-sm btn-secondary' disabled={busy} aria-label={t('voices.replace_label', {name: clip.name})} onClick={onReplace}>
            {(replacing) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <RefreshCw className='size-4'/>}
            <span className='hidden sm:inline'>{t('voices.replace')}</span>
          </button>
        ) : null}
        <button
          type='button'
          className='btn btn-sm btn-secondary'
          disabled={!canDelete || replacing}
          aria-label={t('voices.delete_label', {name: clip.name})}
          title={t((canDelete) ? 'voices.clip_delete' : 'voices.last_clip')}
          onClick={onDelete}
        >
          <Trash2 className='size-4'/>
        </button>
      </div>
    </li>
  );
}


// the audio is only fetched once it's played, with the token (the api doesn't serve it to links)
function ClipPlayer({ voiceId, clip }: {voiceId: string, clip: VoiceClip}) {
  const { t } = useI18n();
  const audio = useRef<HTMLAudioElement>(null);
  const [ url, setUrl ] = useState<string | null>(null);
  const [ loading, setLoading ] = useState(false);
  const [ playing, setPlaying ] = useState(false);
  const [ failed, setFailed ] = useState(false);

  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const toggle = async () => {
    const element = audio.current;
    if (!element) {
      return;
    }
    if (playing) {
      element.pause();
      return;
    }
    if (!url) {
      setLoading(true);
      setFailed(false);
      try {
        const blob = await api.fetchMeVoiceClipAudio(voiceId, clip.id);
        const objectUrl = URL.createObjectURL(blob);
        element.src = objectUrl;
        setUrl(objectUrl);
      } catch {
        setFailed(true);
        return;
      } finally {
        setLoading(false);
      }
    }
    element.play().catch(() => setFailed(true));
  };

  return (
    <>
      <button
        type='button'
        className='btn btn-sm btn-secondary size-9 shrink-0 justify-center p-0'
        aria-label={t((playing) ? 'voices.pause' : 'voices.play', {name: clip.name})}
        title={(failed) ? t('voices.play_error') : undefined}
        disabled={loading}
        onClick={toggle}
      >
        {(loading) ? (
          <Spinner className='size-4 border-white/40 border-t-white'/>
        ) : (playing) ? (
          <Pause className='size-4'/>
        ) : (
          <Play className={(failed) ? 'size-4 text-danger' : 'size-4'}/>
        )}
      </button>
      <audio
        ref={audio}
        preload='none'
        className='hidden'
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='space-y-3'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='card'>
          <div className='flex items-center gap-3 px-4 py-3'>
            <Skeleton className='size-9 rounded-md'/>
            <div className='flex-1'>
              <Skeleton className='h-4 w-40'/>
              <Skeleton className='mt-1.5 h-3 w-28 bg-surface-2'/>
            </div>
            <Skeleton className='h-8 w-24 bg-surface-2'/>
          </div>
          <div className='flex items-center gap-3 border-t border-line px-4 py-2.5'>
            <Skeleton className='size-9 rounded-md bg-surface-2'/>
            <Skeleton className='h-3 w-48 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
