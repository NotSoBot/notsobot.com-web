import { CircleAlert, Download, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CopyButton } from '@/components/ui/CopyButton';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';
import type { EditorJob } from '../types';


const JOB_POLL = 1500;
const JOB_DONE = new Set<EditorJob['status']>(['finished', 'failed', 'stopped', 'canceled']);

type RenderState =
  | {status: 'idle'}
  | {status: 'running', job: EditorJob | null}
  | {status: 'done', url: string, filename: string}
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
  return {status: 'done', url, filename: item?.storage?.filename ?? ''};
}


// The full quality render: the whole stack on the original, a normal job on the user's tier queue. Polled through
// `/jobs/<id>` like a command. Only the newest one counts, a new render or leaving the document drops the old poll
export function RenderPanel({ host, documentId, disabled }: {host: EditorHost, documentId: string, disabled: boolean}) {
  const { t, rich } = useI18n();
  const [ state, setState ] = useState<RenderState>({status: 'idle'});
  const runRef = useRef(0);

  useEffect(() => {
    runRef.current += 1;
    setState({status: 'idle'});
  }, [documentId]);

  const start = async () => {
    const run = ++runRef.current;
    setState({status: 'running', job: null});
    try {
      let job = await host.api.render(documentId);
      while (!JOB_DONE.has(job.status)) {
        if (run !== runRef.current) {
          return;
        }
        setState({status: 'running', job});
        await new Promise((resolve) => window.setTimeout(resolve, JOB_POLL));
        job = await host.api.job(job.id);
      }
      if (run === runRef.current) {
        setState(resultOf(job));
      }
    } catch (error) {
      if (run === runRef.current) {
        setState({status: 'failed', message: host.errorOf(error)?.message ?? ''});
      }
    }
  };

  const running = state.status === 'running';
  const queued = running && state.job?.status === 'queued';

  return (
    <div className='flex flex-col gap-2 border-t border-line-strong pt-3.5'>
      <button type='button' className='btn btn-primary min-h-11 w-full' disabled={disabled || running} onClick={() => void start()}>
        {(running) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
        {(running) ? ((queued) ? t('editor.render.queued') : t('editor.render.rendering')) : t('editor.render')}
      </button>
      {(disabled) ? <p className='text-xs text-subtle'>{t('editor.render.empty')}</p> : null}
      <p className='text-xs leading-relaxed text-muted'>
        {rich('editor.render.limits', {premium: (chunk) => <a href={host.premiumUrl} className='text-brand-text underline hover:text-white'>{chunk}</a>})}
      </p>
      {(state.status === 'done') ? (
        <div role='status' className='flex flex-col gap-2 rounded-lg border border-success/50 bg-success/10 p-3'>
          <p className='text-sm font-semibold text-success-text'>{t('editor.render.done')}</p>
          <div className='flex flex-wrap items-center gap-2'>
            <a href={state.url} download={state.filename || true} target='_blank' rel='noreferrer' className='btn btn-secondary btn-sm'>
              <Download aria-hidden className='size-4'/>{t('editor.render.download')}
            </a>
            <CopyButton value={state.url} label={t('editor.render.copy')}/>
            {(host.share) ? (
              <button type='button' className='btn btn-secondary btn-sm' onClick={() => void host.share?.(state.url)}>
                <Share2 aria-hidden className='size-4'/>{t('editor.render.share')}
              </button>
            ) : null}
          </div>
        </div>
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
