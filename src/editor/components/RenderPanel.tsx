import { Check, CircleAlert, Download, Link, Share2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorJob } from '../types';
import { cdnThumbnailUrl, isAudioMimetype, isVideoMimetype } from './media';


const JOB_POLL = 1500;
// a status poll that fails this many times in a row is the render failing, fewer is the network (the job runs on)
const JOB_POLL_FAILURES = 4;
const JOB_DONE = new Set<EditorJob['status']>(['finished', 'failed', 'stopped', 'canceled']);
const SELECT = 'h-10 w-full rounded-lg border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand disabled:opacity-60';

// `audio/mp3` → MP3, the names people know a format by (WebP and WebM aren't all capitals)
const FORMAT_NAMES: Record<string, string> = {webp: 'WebP', webm: 'WebM', mpeg: 'MP3', 'x-wav': 'WAV'};

function formatName(mimetype: string): string {
  const subtype = (mimetype.split('/')[1] || mimetype).toLowerCase();
  return FORMAT_NAMES[subtype] ?? subtype.toUpperCase();
}

type RenderState =
  | {status: 'idle'}
  | {status: 'running', job: EditorJob | null}
  // `thumbnail`: a small picture of it that was already loaded (the preview of the same stack), none for a video or sound
  | {status: 'done', url: string, filename: string, mimetype: string, thumbnail?: string}
  | {status: 'failed', message: string};


function resultOf(job: EditorJob): RenderState {
  if (job.result.error) {
    return {status: 'failed', message: job.result.error};
  }
  const item = job.result.response?.items?.[0];
  const url = item?.storage?.urls.cdn;
  if (!url) {
    return {status: 'failed', message: ''};
  }
  return {status: 'done', url, filename: item?.storage?.filename ?? '', mimetype: item?.file?.mimetype ?? ''};
}


// The full quality render: the whole stack on the original, a normal job on the user's tier queue. Polled through
// `/jobs/<id>` like a command. Only the newest one counts, a new render or leaving the document drops the old poll
export function RenderPanel({ host, documentId, documentFilename, formats, sourceKind, empty, locked = false, waitForSave, preview }: {
  host: EditorHost,
  documentId: string,
  // the document's file name, a shared render keeps it (with the render's own extension)
  documentFilename: string,
  // the document's `render_formats`, the picker is left out without any
  formats: Array<string>,
  sourceKind: string,
  // no visible steps: the only time it's off, and the only time its hint shows (it never comes and goes while editing)
  empty: boolean,
  // someone else's render has the stack: no render or format change of their own until it ends. A finished render's
  // Share, Download and Copy link stay as they are
  locked?: boolean,
  // the last edits saved, a render started mid-save waits for them instead of the button switching off on every edit
  waitForSave: () => Promise<boolean>,
  // the editor's preview of the stack as it is now (the small proxy's), what a rendered picture's thumbnail shows
  preview: {url: string, mimetype: string} | null,
}) {
  const { t, rich } = useI18n();
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const formatId = useId();
  const [ state, setState ] = useState<RenderState>({status: 'idle'});
  // '' is automatic: whatever the stack makes, no `convert`
  const [ format, setFormat ] = useState('');
  const runRef = useRef(0);
  // a render the room was told started and not yet that it ended
  const announcedRef = useRef(false);
  const roomRef = useRef(host.room);
  roomRef.current = host.room;

  useEffect(() => {
    runRef.current += 1;
    setState({status: 'idle'});
    setFormat('');
    return () => {
      // leaving the document (or the editor): the poll stops, and the room's lock on everyone else's stack goes with
      // it. The loop used to run on and say `done` to whatever room the socket was in by then
      runRef.current += 1;
      if (announcedRef.current) {
        announcedRef.current = false;
        roomRef.current?.render('failed');
      }
    };
  }, [documentId]);

  // the activity's room hears how it ended (that it started the api says itself, as it takes the render): the stack
  // is locked for everyone while it runs
  const announce = (status: 'done' | 'failed', url?: string) => {
    announcedRef.current = false;
    host.room?.render(status, url);
  };

  const start = async () => {
    const run = ++runRef.current;
    setState({status: 'running', job: null});
    if (!(await waitForSave())) {
      if (run === runRef.current) {
        setState({status: 'failed', message: t('editor.render.unsaved')});
      }
      return;
    }
    if (run !== runRef.current) {
      return;
    }
    try {
      // in a room, the socket it's asked from: the api tells the room, and only that socket's word ends it
      const socketId = host.room?.socketId ?? null;
      let job = await host.api.render(documentId, (formats.includes(format)) ? format : undefined, socketId);
      // the room was told by the api just now, its end is this panel's to say (also when it's left mid-render). A
      // socket that reconnected since is another one, the api ends it itself when the old one goes
      announcedRef.current = Boolean(host.room && socketId);
      let failures = 0;
      while (!JOB_DONE.has(job.status)) {
        if (run !== runRef.current) {
          return;
        }
        setState({status: 'running', job});
        // the api holds the answer while the job runs (a few seconds at most), so it's asked again as it comes back.
        // Only an answer that came straight back (or failed) waits out the rest of JOB_POLL before the next one
        const asked = Date.now();
        try {
          job = await host.api.job(job.id);
          failures = 0;
        } catch (error) {
          // one timed-out poll isn't the render failing, it's asked again
          failures += 1;
          if (JOB_POLL_FAILURES <= failures) {
            throw error;
          }
        }
        const left = JOB_POLL - (Date.now() - asked);
        if (!JOB_DONE.has(job.status) && 0 < left) {
          await new Promise((resolve) => window.setTimeout(resolve, left));
        }
      }
      if (run !== runRef.current) {
        return;
      }
      const result = resultOf(job);
      announce((result.status === 'done') ? 'done' : 'failed', (result.status === 'done') ? result.url : undefined);
      // a rendered picture's thumbnail: the preview on screen when it finished is the same stack, small and already
      // loaded (the render itself can be a gif of many MB, and the cdn only keeps thumbnails of videos and sounds)
      const shown = previewRef.current;
      const still = shown && !isVideoMimetype(shown.mimetype) && !isAudioMimetype(shown.mimetype);
      setState((result.status === 'done' && still) ? {...result, thumbnail: shown.url} : result);
    } catch (error) {
      if (run !== runRef.current) {
        return;
      }
      announce('failed');
      setState({status: 'failed', message: host.errorOf(error)?.message ?? ''});
    }
  };

  // inside Discord a plain link can't leave the activity, the host opens it through the sdk
  const external = (url: string) => (event: React.MouseEvent) => {
    if (host.openExternal) {
      event.preventDefault();
      host.openExternal(url);
    }
  };

  const running = state.status === 'running';
  const queued = running && state.job?.status === 'queued';

  return (
    <div
      data-state={state.status}
      data-job-status={(state.status === 'running' && state.job) ? state.job.status : undefined}
      className='flex shrink-0 flex-col gap-2 border-t border-line-strong pt-3.5'
    >
      {(formats.length) ? (
        <div className='flex items-center gap-2'>
          <label htmlFor={formatId} className='shrink-0 text-[13px] text-muted'>{t('editor.render.format')}</label>
          <select id={formatId} value={(formats.includes(format)) ? format : ''} disabled={running || locked} onChange={(event) => setFormat(event.target.value)} className={SELECT}>
            <option value=''>{t('editor.render.format_auto')}</option>
            {formats.map((mimetype) => (
              <option key={mimetype} value={mimetype}>
                {(sourceKind !== 'audio' && mimetype.startsWith('audio/')) ? t('editor.render.format_audio_only', {format: formatName(mimetype)}) : formatName(mimetype)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <button type='button' className='btn btn-primary min-h-11 w-full' disabled={empty || running || locked} onClick={() => void start()}>
        {(running) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
        {(running) ? ((queued) ? t('editor.render.queued') : t('editor.render.rendering')) : t('editor.render')}
      </button>
      {(empty) ? <p className='text-xs text-subtle'>{t('editor.render.empty')}</p> : null}
      <p className='text-xs leading-relaxed text-muted'>
        {rich('editor.render.limits', {premium: (chunk) => <a href={host.premiumUrl} onClick={external(host.premiumUrl)} className='text-brand-text underline hover:text-white'>{chunk}</a>})}
      </p>
      {(state.status === 'done') ? (
        <RenderResult host={host} documentId={documentId} url={state.url} thumbnail={state.thumbnail} filename={state.filename} shareName={documentFilename} mimetype={state.mimetype} onExternal={external}/>
      ) : null}
      {(state.status === 'failed') ? (
        <p role='alert' className='flex gap-1.5 text-sm text-danger-text'>
          <CircleAlert aria-hidden className='mt-0.5 size-4 shrink-0'/>
          {t('editor.render.failed')}{(state.message) ? `: ${state.message}` : null}
        </p>
      ) : null}
    </div>
  );
}


// The render in 56px, without loading the render for it: a video's or a sound's is the cdn's own small png of the file
// (what's there without it when it isn't made yet: the video's first frame, the sound's format), a picture's the
// preview of the same stack. Only a picture with neither (not our cdn's, no preview) is the file itself
function RenderThumbnail({ url, thumbnail, mimetype, extension }: {url: string, thumbnail?: string, mimetype: string, extension: string}) {
  const video = isVideoMimetype(mimetype);
  const audio = isAudioMimetype(mimetype);
  const small = (video || audio) ? cdnThumbnailUrl(url) : thumbnail ?? null;
  const [ failed, setFailed ] = useState(false);
  useEffect(() => setFailed(false), [small]);
  if (small && !failed) {
    return <img src={small} alt='' className='size-full object-cover' onError={() => setFailed(true)}/>;
  }
  if (video) {
    return <video src={url} muted playsInline preload='metadata' className='size-full object-cover'/>;
  }
  if (audio) {
    return <span className='font-mono text-[10px] text-muted'>{extension}</span>;
  }
  return <img src={url} alt='' className='size-full object-cover'/>;
}


// sharing a finished render: one thing at a time. `posted`: the bot posted it in the channel (Discord's own dialog says
// nothing back, that's `idle` again)
type ShareState =
  | {status: 'idle'}
  | {status: 'sharing'}
  | {status: 'posted'}
  | {status: 'failed', message: string};

const ACTION = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';


// The finished render: what it looks like, then what to do with it. In the Activity sharing it to the channel comes
// first (Discord's own dialog), downloading and copying the link are the two smaller ones under it
function RenderResult({ host, documentId, url, thumbnail, filename, shareName, mimetype, onExternal }: {
  host: EditorHost,
  documentId: string,
  url: string,
  thumbnail?: string,
  filename: string,
  // what a shared render is called in chat: the document's file name, not the render's storage name
  shareName: string,
  mimetype: string,
  onExternal: (url: string) => (event: React.MouseEvent) => void,
}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ copyFailed, setCopyFailed ] = useState(false);
  const copyFailedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copyFailedTimer.current), []);
  const [ share, setShare ] = useState<ShareState>({status: 'idle'});
  const sharing = share.status === 'sharing';
  const extension = (mimetype) ? formatName(mimetype) : (url.split('.').pop() || '').toUpperCase();

  const onCopy = async () => {
    const worked = await copy(url);
    // a second failure starts its two seconds over (the first one's timer used to cut it short)
    window.clearTimeout(copyFailedTimer.current);
    setCopyFailed(!worked);
    if (!worked) {
      copyFailedTimer.current = window.setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  const onShare = async () => {
    if (!host.share || sharing) {
      return;
    }
    // (an earlier try's "posted" goes with it: a share that failed after one that worked used to show both)
    setShare({status: 'sharing'});
    try {
      const outcome = await host.share(url, shareName, documentId);
      setShare((outcome === 'posted') ? {status: 'posted'} : {status: 'idle'});
    } catch (error) {
      // the api's reason (too big, discord refused it), or the sdk's own message
      setShare({status: 'failed', message: host.errorOf(error)?.message ?? ((error instanceof Error) ? error.message : '')});
    }
  };

  return (
    <div role='status' data-share-state={share.status} className='flex flex-col gap-3 rounded-xl border border-success/40 bg-success/10 p-3'>
      <div className='flex items-center gap-3'>
        <div className='flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-deep'>
          <RenderThumbnail url={url} thumbnail={thumbnail} mimetype={mimetype} extension={extension}/>
        </div>
        <div className='flex min-w-0 flex-col'>
          <p className='flex items-center gap-1.5 text-sm font-semibold text-success-text'>
            <Check aria-hidden className='size-4 shrink-0'/>{t('editor.render.done')}
          </p>
          <p className='truncate font-mono text-xs text-muted'>{[filename, extension].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {(host.share) ? (
        <button type='button' disabled={sharing} onClick={() => void onShare()} className={cn(ACTION, 'w-full bg-brand text-white hover:bg-brand-hover')}>
          {(sharing) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Share2 aria-hidden className='size-4'/>}
          {(sharing) ? t('editor.render.sharing') : t('editor.render.share')}
        </button>
      ) : null}
      {(share.status === 'posted') ? (
        <p role='status' className='-mt-1 flex gap-1.5 text-xs text-success-text'>
          <Check aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.render.posted')}
        </p>
      ) : null}
      {(share.status === 'failed') ? (
        <p role='alert' className='-mt-1 flex gap-1.5 text-xs text-danger-text'>
          <CircleAlert aria-hidden className='mt-px size-3.5 shrink-0'/>
          {t('editor.render.share_failed')}{(share.message) ? `: ${share.message}` : null}
        </p>
      ) : null}

      <div className='grid grid-cols-2 gap-2'>
        <a
          href={url}
          download={filename || true}
          target='_blank'
          rel='noreferrer'
          onClick={onExternal(url)}
          className={cn(ACTION, (host.share) ? 'bg-surface-3 text-fg hover:bg-[#4f545c]' : 'bg-brand text-white hover:bg-brand-hover')}
        >
          <Download aria-hidden className='size-4'/>{t('editor.render.download')}
        </a>
        <button type='button' onClick={() => void onCopy()} className={cn(ACTION, 'bg-surface-3 text-fg hover:bg-[#4f545c]')}>
          {(copyFailed) ? <X aria-hidden className='size-4 text-danger-text'/> : (copied) ? <Check aria-hidden className='size-4 text-success-text'/> : <Link aria-hidden className='size-4'/>}
          {(copyFailed) ? t('editor.render.copy_failed') : (copied) ? t('editor.render.copied') : t('editor.render.copy')}
        </button>
      </div>
    </div>
  );
}
