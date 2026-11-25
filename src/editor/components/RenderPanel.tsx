import { Check, CircleAlert, Download, Link, Share2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import type { EditorJob } from '../types';
import { isAudioMimetype, isVideoMimetype } from './media';


const JOB_POLL = 1500;
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
  | {status: 'done', url: string, filename: string, mimetype: string}
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
export function RenderPanel({ host, documentId, formats, sourceKind, empty, waitForSave }: {
  host: EditorHost,
  documentId: string,
  // the document's `render_formats`, the picker is left out without any
  formats: Array<string>,
  sourceKind: string,
  // no visible steps: the only time it's off, and the only time its hint shows (it never comes and goes while editing)
  empty: boolean,
  // the last edits saved, a render started mid-save waits for them instead of the button switching off on every edit
  waitForSave: () => Promise<boolean>,
}) {
  const { t, rich } = useI18n();
  const formatId = useId();
  const [ state, setState ] = useState<RenderState>({status: 'idle'});
  // '' is automatic: whatever the stack makes, no `convert`
  const [ format, setFormat ] = useState('');
  const runRef = useRef(0);

  useEffect(() => {
    runRef.current += 1;
    setState({status: 'idle'});
    setFormat('');
  }, [documentId]);

  // the activity's room hears about it: the stack is locked for everyone while it runs
  const announce = (status: 'started' | 'done' | 'failed', url?: string) => host.room?.render(status, url);

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
    announce('started');
    try {
      let job = await host.api.render(documentId, (formats.includes(format)) ? format : undefined);
      while (!JOB_DONE.has(job.status)) {
        if (run !== runRef.current) {
          return;
        }
        setState({status: 'running', job});
        await new Promise((resolve) => window.setTimeout(resolve, JOB_POLL));
        job = await host.api.job(job.id);
      }
      const result = resultOf(job);
      announce((result.status === 'done') ? 'done' : 'failed', (result.status === 'done') ? result.url : undefined);
      if (run === runRef.current) {
        setState(result);
      }
    } catch (error) {
      announce('failed');
      if (run === runRef.current) {
        setState({status: 'failed', message: host.errorOf(error)?.message ?? ''});
      }
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
    <div className='flex shrink-0 flex-col gap-2 border-t border-line-strong pt-3.5'>
      {(formats.length) ? (
        <div className='flex items-center gap-2'>
          <label htmlFor={formatId} className='shrink-0 text-[13px] text-muted'>{t('editor.render.format')}</label>
          <select id={formatId} value={(formats.includes(format)) ? format : ''} disabled={running} onChange={(event) => setFormat(event.target.value)} className={SELECT}>
            <option value=''>{t('editor.render.format_auto')}</option>
            {formats.map((mimetype) => (
              <option key={mimetype} value={mimetype}>
                {(sourceKind !== 'audio' && mimetype.startsWith('audio/')) ? t('editor.render.format_audio_only', {format: formatName(mimetype)}) : formatName(mimetype)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <button type='button' className='btn btn-primary min-h-11 w-full' disabled={empty || running} onClick={() => void start()}>
        {(running) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
        {(running) ? ((queued) ? t('editor.render.queued') : t('editor.render.rendering')) : t('editor.render')}
      </button>
      {(empty) ? <p className='text-xs text-subtle'>{t('editor.render.empty')}</p> : null}
      <p className='text-xs leading-relaxed text-muted'>
        {rich('editor.render.limits', {premium: (chunk) => <a href={host.premiumUrl} onClick={external(host.premiumUrl)} className='text-brand-text underline hover:text-white'>{chunk}</a>})}
      </p>
      {(state.status === 'done') ? (
        <RenderResult host={host} url={state.url} filename={state.filename} mimetype={state.mimetype} onExternal={external}/>
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


const ACTION = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';


// The finished render: what it looks like, then what to do with it. In the Activity sharing it to the channel comes
// first (Discord's own dialog), downloading and copying the link are the two smaller ones under it
function RenderResult({ host, url, filename, mimetype, onExternal }: {
  host: EditorHost,
  url: string,
  filename: string,
  mimetype: string,
  onExternal: (url: string) => (event: React.MouseEvent) => void,
}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ copyFailed, setCopyFailed ] = useState(false);
  const [ sharing, setSharing ] = useState(false);
  const [ shareError, setShareError ] = useState<string | null>(null);
  const extension = (mimetype) ? formatName(mimetype) : (url.split('.').pop() || '').toUpperCase();

  const onCopy = async () => {
    const worked = await copy(url);
    setCopyFailed(!worked);
    if (!worked) {
      window.setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  const onShare = async () => {
    if (!host.share) {
      return;
    }
    setSharing(true);
    setShareError(null);
    try {
      await host.share(url);
    } catch (error) {
      // the api's reason (too big, discord refused it), or the sdk's own message
      const message = host.errorOf(error)?.message ?? ((error instanceof Error) ? error.message : '');
      setShareError(message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div role='status' className='flex flex-col gap-3 rounded-xl border border-success/40 bg-success/10 p-3'>
      <div className='flex items-center gap-3'>
        <div className='flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-deep'>
          {(isVideoMimetype(mimetype)) ? (
            <video src={url} muted playsInline preload='metadata' className='size-full object-cover'/>
          ) : (isAudioMimetype(mimetype)) ? (
            <span className='font-mono text-[10px] text-muted'>{extension}</span>
          ) : (
            <img src={url} alt='' className='size-full object-cover'/>
          )}
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
      {(shareError !== null) ? (
        <p role='alert' className='-mt-1 flex gap-1.5 text-xs text-danger-text'>
          <CircleAlert aria-hidden className='mt-px size-3.5 shrink-0'/>
          {t('editor.render.share_failed')}{(shareError) ? `: ${shareError}` : null}
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
