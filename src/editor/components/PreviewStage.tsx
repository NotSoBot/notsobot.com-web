import { Columns2, Pause, Play, RotateCw } from 'lucide-react';
import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { FRAME_MODE_MIN_FRAMES, type EditorDocumentState } from '../useEditorDocument';
import { isAudioMimetype, isVideoMimetype, MediaView } from './media';
import { SpatialOverlay, type PenSettings } from './SpatialOverlay';


export function PreviewStage({ state, pen, maxStrokes, maxPoints }: {
  state: EditorDocumentState,
  pen: PenSettings,
  maxStrokes: number,
  maxPoints: number,
}) {
  const { t } = useI18n();
  const [ showOriginal, setShowOriginal ] = useState(false);
  const { document, preview, previewState, previewError, mode, animated, frame, selectedStep, selectedTool, effectsById } = state;
  const proxy = document?.proxy ?? null;

  if (!document) {
    return null;
  }

  const proxyFailed = document.proxy_status === 'failed';
  const selectedEffect = (selectedStep) ? effectsById.get(selectedStep.effect) : undefined;
  const placing = Boolean(selectedTool && selectedStep && !showOriginal);

  // what's on screen: the original, the latest preview, or (frame mode, scrubbing) the proxy seeked to the frame
  // until that frame's preview arrives
  const framecount = proxy?.framecount ?? 1;
  const fps = proxy?.fps || 1;
  const previewMatchesFrame = mode !== 'frame' || (preview?.mode === 'frame' && preview.frame === frame);
  const scrubbing = mode === 'frame' && !previewMatchesFrame && Boolean(proxy && isVideoMimetype(proxy.mimetype));
  const shown = (showOriginal || !preview || scrubbing) ? proxy : preview;
  const seekTo = (scrubbing || (showOriginal && mode === 'frame')) ? frame / fps : null;

  const statusLabel = (proxyFailed) ? t('editor.preview.proxy_failed')
    : (previewState === 'preparing') ? t('editor.preview.preparing')
    : (previewState === 'updating' || state.saveState === 'saving') ? t('editor.preview.updating')
    : (previewState === 'busy') ? t('editor.preview.busy')
    : (previewState === 'failed') ? (previewError || t('editor.preview.failed'))
    : t('editor.preview.up_to_date');
  const statusTone = (proxyFailed || previewState === 'failed') ? 'danger'
    : (previewState === 'busy') ? 'warning'
    : (previewState === 'idle' && state.saveState !== 'saving') ? 'success' : 'busy';

  const stoppedAt = (mode === 'frame' && preview?.stopped_at) ? preview.stopped_at : null;
  const aspect = (shown && shown.width && shown.height) ? shown.height / shown.width : 1;

  return (
    <section aria-label={t('editor.preview')} className='flex min-h-[420px] min-w-0 flex-col gap-3.5 bg-deep p-4 sm:p-5 lg:sticky lg:top-0 lg:min-h-[min(100dvh,760px)]'>
      <div className='flex flex-wrap items-center gap-2'>
        {(proxy) ? (
          <span className='rounded-md bg-surface px-2 py-1 font-mono text-xs text-muted'>
            {t('editor.preview.size', {width: proxy.width || '?', height: proxy.height || '?'})}
          </span>
        ) : null}
        <span
          role='status'
          className={cn(
            'inline-flex items-center gap-1.5 text-[13px]',
            (statusTone === 'success') ? 'text-success-text' : (statusTone === 'danger') ? 'text-danger-text' : (statusTone === 'warning') ? 'text-warning' : 'text-muted',
          )}
        >
          {(statusTone === 'busy') ? <Spinner className='size-3'/> : <span aria-hidden className={cn('size-2 rounded-full', (statusTone === 'success') ? 'bg-success' : (statusTone === 'danger') ? 'bg-danger' : 'bg-warning')}/>}
          {statusLabel}
        </span>
        {(previewState === 'failed') ? (
          <button type='button' onClick={() => void state.retryPreview()} className='inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-brand-text hover:text-white'>
            <RotateCw aria-hidden className='size-3.5'/>{t('editor.preview.retry')}
          </button>
        ) : null}
        <span className='flex-1'/>
        <button
          type='button'
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal((value) => !value)}
          className={cn('inline-flex min-h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-white transition-colors', (showOriginal) ? 'bg-surface-3' : 'hover:bg-surface')}
        >
          <Columns2 aria-hidden className='size-4'/>{t('editor.preview.show_original')}
        </button>
      </div>

      {(placing && selectedEffect) ? (
        <p className='text-xs text-subtle'>{t('editor.preview.before_step', {name: selectedEffect.name})}</p>
      ) : null}

      <div className='flex flex-1 items-center justify-center'>
        {(shown) ? (
          (isAudioMimetype(shown.mimetype)) ? (
            <div className='flex w-full flex-col items-center gap-3 rounded-lg bg-surface p-6'>
              <span className='text-sm font-semibold text-fg'>{(showOriginal) ? t('editor.preview.original') : t('editor.preview.audio')}</span>
              <MediaView key={shown.url} url={shown.url} mimetype={shown.mimetype} alt={t('editor.preview.audio')}/>
            </div>
          ) : (
            <figure className='relative m-0 inline-block max-w-full overflow-hidden rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.35)]'>
              <MediaView
                key={shown.url}
                url={shown.url}
                mimetype={shown.mimetype}
                alt={(showOriginal) ? t('editor.preview.original') : t('editor.preview')}
                seekTo={seekTo}
                className='block h-auto max-h-[min(62vh,640px)] w-auto max-w-full select-none'
              />
              {(placing && selectedTool && selectedStep && selectedEffect) ? (
                <SpatialOverlay
                  tool={selectedTool}
                  step={selectedStep}
                  effectName={selectedEffect.name}
                  onChange={(param, value) => state.setParam(selectedStep.id, param, value)}
                  pen={pen}
                  aspect={aspect}
                  maxStrokes={maxStrokes}
                  maxPoints={maxPoints}
                />
              ) : null}
              {(stoppedAt && !showOriginal) ? (
                <figcaption className='absolute inset-x-0 bottom-0 bg-black/70 px-3 py-1.5 text-center text-[13px] text-white'>
                  {t('editor.preview.stopped', {name: stoppedAt})}
                </figcaption>
              ) : null}
            </figure>
          )
        ) : (
          (proxyFailed) ? (
            <p className='text-sm text-danger-text'>{t('editor.preview.proxy_failed')}</p>
          ) : (
            <Spinner label={t('editor.preview.preparing')}/>
          )
        )}
      </div>

      {(animated && proxy && FRAME_MODE_MIN_FRAMES < framecount && !isAudioMimetype(proxy.mimetype)) ? (
        <div className='flex items-center gap-3 rounded-[10px] bg-surface px-3 py-1.5'>
          <button
            type='button'
            aria-label={(state.playing) ? t('editor.preview.pause') : t('editor.preview.play')}
            onClick={() => state.setPlaying(!state.playing)}
            className='flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover'
          >
            {(state.playing) ? <Pause aria-hidden className='size-4 fill-current'/> : <Play aria-hidden className='size-4 fill-current'/>}
          </button>
          {(mode === 'frame') ? (
            <>
              <input
                type='range'
                aria-label={t('editor.preview.frame')}
                min={0}
                max={framecount - 1}
                value={frame}
                onChange={(event) => state.scrubTo(Number(event.target.value))}
                className='min-w-0 flex-1 accent-brand'
              />
              <span className='font-mono text-[13px] whitespace-nowrap text-muted tabular-nums'>{frame + 1} / {framecount}</span>
            </>
          ) : (
            <span className='text-[13px] text-muted'>{(preview?.framecount) ? `${preview.framecount} × ${Math.round(preview.fps || fps)} fps` : null}</span>
          )}
        </div>
      ) : null}
    </section>
  );
}
