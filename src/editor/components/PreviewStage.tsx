import { Columns2, Pause, Play, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { FRAME_MODE_MIN_FRAMES, type EditorDocumentState } from '../useEditorDocument';
import { isAudioMimetype, isVideoMimetype, MediaView } from './media';
import { BADGE_LABELS, previewBadge } from './previewBadge';
import { PreviewCursors, usePreviewPointer } from './RoomCursors';
import { SpatialOverlay, type PenSettings } from './SpatialOverlay';


// how big the preview can be made, to draw or place things more precisely. 1 is fitted to the stage
const ZOOMS = [1, 1.5, 2, 3, 4];


// what the stage itself shows: the media, or why there's none yet
type PreviewStageBody = 'media' | 'proxy_failed' | 'failed' | 'preparing';


export function PreviewStage({ state, pen, maxStrokes, maxPoints, maxTextLength }: {
  state: EditorDocumentState,
  pen: PenSettings,
  maxStrokes: number,
  maxPoints: number,
  maxTextLength: number,
}) {
  const { t } = useI18n();
  const [ showOriginal, setShowOriginal ] = useState(false);
  const { document, preview, previewState, previewError, mode, animated, frame, selectedStep, selectedTool, effectsById } = state;
  const proxy = document?.proxy ?? null;
  const [ zoom, setZoom ] = useState(1);
  // the fitted (100%) width, zooming scales from it
  const [ fitWidth, setFitWidth ] = useState(0);
  const figureRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // the others in the lobby see where on the picture this pointer is
  const previewPointer = usePreviewPointer();
  const figureShown = Boolean(preview || proxy);

  // (`figureShown`: there's no figure until the first picture is, while a proxy is still being made. Without it this
  // ran once on nothing and zooming changed the percentage but never the picture)
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || zoom !== 1) {
      return;
    }
    const observer = new ResizeObserver(() => setFitWidth(figure.getBoundingClientRect().width));
    observer.observe(figure);
    return () => observer.disconnect();
  }, [zoom, document?.id, figureShown]);

  // a trackpad pinch (or ctrl + scroll) zooms the preview, not the page. not passive, so the page's own zoom is stopped
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      setZoom((current) => Math.min(Math.max(Math.round(current * Math.exp(-event.deltaY * 0.01) * 100) / 100, ZOOMS[0]), ZOOMS[ZOOMS.length - 1]));
    };
    element.addEventListener('wheel', onWheel, {passive: false});
    return () => element.removeEventListener('wheel', onWheel);
  }, [document?.id]);

  const zoomBy = (direction: 1 | -1) => setZoom((current) => (direction === 1)
    ? ZOOMS.find((level) => level > current + 0.001) ?? current
    : [...ZOOMS].reverse().find((level) => level < current - 0.001) ?? current);

  if (!document) {
    return null;
  }

  const proxyFailed = document.proxy_status === 'failed';
  const selectedEffect = (selectedStep) ? effectsById.get(selectedStep.effect) : undefined;
  const placing = Boolean(selectedTool && selectedStep && !showOriginal && !state.lockedBy(selectedStep.id) && !state.renderLocked);

  // what's on screen: the original, the latest preview, or (frame mode, scrubbing) the proxy seeked to the frame
  // until that frame's preview arrives
  const framecount = proxy?.framecount ?? 1;
  const fps = proxy?.fps || 1;
  const previewMatchesFrame = mode !== 'frame' || (preview?.mode === 'frame' && preview.frame === frame);
  const scrubbing = mode === 'frame' && !previewMatchesFrame && Boolean(proxy && isVideoMimetype(proxy.mimetype));
  const shown = (showOriginal || !preview || scrubbing) ? proxy : preview;
  const seekTo = (scrubbing || (showOriginal && mode === 'frame')) ? frame / fps : null;

  const badge = previewBadge(proxyFailed, previewState, state.saveState);
  const failedLabel = previewError || t('editor.preview.failed');
  const statusLabel = (badge.kind === 'failed') ? failedLabel : t(BADGE_LABELS[badge.kind]);
  const statusTone = badge.tone;
  // nothing to show yet: a first preview that failed says so with Try again (it used to spin "preparing" for good under
  // a line that said it failed)
  const stage: PreviewStageBody = (shown) ? 'media'
    : (proxyFailed) ? 'proxy_failed'
    : (previewState === 'failed' && state.saveState !== 'saving') ? 'failed'
    : 'preparing';

  const stoppedAt = (mode === 'frame' && preview?.stopped_at) ? preview.stopped_at : null;
  const aspect = (shown && shown.width && shown.height) ? shown.height / shown.width : 1;

  return (
    <section aria-label={t('editor.preview')} data-preview-state={previewState} data-save-state={state.saveState} data-stage={stage} className='flex min-h-[420px] min-w-0 flex-col gap-3.5 bg-deep p-4 select-none sm:p-5 lg:min-h-full'>
      <div className='flex min-h-9 flex-wrap items-center gap-2'>
        {(proxy) ? (
          <span className='rounded-md bg-surface px-2 py-1 font-mono text-xs text-muted'>
            {t('editor.preview.size', {width: proxy.width || '?', height: proxy.height || '?'})}
          </span>
        ) : null}
        <span
          role='status'
          className={cn(
            // one line, it changes on every edit and mustn't change the row's height (the preview under it would jump)
            'inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap',
            (statusTone === 'success') ? 'text-success-text' : (statusTone === 'danger') ? 'text-danger-text' : (statusTone === 'warning') ? 'text-warning' : 'text-muted',
          )}
        >
          {(statusTone === 'busy') ? <Spinner className='size-3'/> : <span aria-hidden className={cn('size-2 rounded-full', (statusTone === 'success') ? 'bg-success' : (statusTone === 'danger') ? 'bg-danger' : 'bg-warning')}/>}
          {statusLabel}
        </span>
        {(badge.retry) ? (
          <button type='button' onClick={() => void state.retryPreview()} className='inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-brand-text hover:text-white'>
            <RotateCw aria-hidden className='size-3.5'/>{t('editor.preview.retry')}
          </button>
        ) : null}
        <span className='flex-1'/>
        {(shown && !isAudioMimetype(shown.mimetype)) ? (
          <div role='group' aria-label={t('editor.preview.zoom')} className='inline-flex items-center rounded-lg border border-line-strong'>
            <button type='button' aria-label={t('editor.preview.zoom_out')} title={t('editor.preview.zoom_out')} disabled={zoom <= ZOOMS[0]} onClick={() => zoomBy(-1)} className='flex size-9 items-center justify-center rounded-l-lg text-muted hover:bg-surface hover:text-fg disabled:opacity-40'>
              <ZoomOut aria-hidden className='size-4'/>
            </button>
            <button type='button' title={t('editor.preview.zoom_reset')} onClick={() => setZoom(1)} className='min-h-9 min-w-14 px-1 font-mono text-xs text-fg tabular-nums hover:bg-surface'>
              {Math.round(zoom * 100)}%
            </button>
            <button type='button' aria-label={t('editor.preview.zoom_in')} title={t('editor.preview.zoom_in')} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => zoomBy(1)} className='flex size-9 items-center justify-center rounded-r-lg text-muted hover:bg-surface hover:text-fg disabled:opacity-40'>
              <ZoomIn aria-hidden className='size-4'/>
            </button>
          </div>
        ) : null}
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

      <div ref={scrollRef} className={cn('flex flex-1 justify-center', (zoom > 1) ? 'max-h-[min(70vh,720px)] items-start overflow-auto' : 'items-center')}>
        {(shown) ? (
          (isAudioMimetype(shown.mimetype)) ? (
            <div className='flex w-full flex-col items-center gap-3 rounded-lg bg-surface p-6'>
              <span className='text-sm font-semibold text-fg'>{(showOriginal) ? t('editor.preview.original') : t('editor.preview.audio')}</span>
              <MediaView key={shown.url} url={shown.url} mimetype={shown.mimetype} alt={t('editor.preview.audio')}/>
            </div>
          ) : (
            <figure
              ref={figureRef}
              {...previewPointer}
              className={cn('relative m-0 shrink-0 overflow-hidden rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.35)]', (zoom > 1) ? 'block' : 'inline-block max-w-full')}
            >
              <MediaView
                key={shown.url}
                url={shown.url}
                mimetype={shown.mimetype}
                alt={(showOriginal) ? t('editor.preview.original') : t('editor.preview')}
                seekTo={seekTo}
                className={cn('block h-auto select-none', (zoom > 1 && fitWidth) ? 'max-w-none' : 'max-h-[min(62vh,640px)] w-auto max-w-full')}
                style={(zoom > 1 && fitWidth) ? {width: Math.round(fitWidth * zoom)} : undefined}
              />
              {(placing && selectedTool && selectedStep && selectedEffect) ? (
                <SpatialOverlay
                  tool={selectedTool}
                  step={selectedStep}
                  effectName={selectedEffect.name}
                  onChange={(param, value, options) => state.setParam(selectedStep.id, param, value, options)}
                  onChangeMany={(values) => state.setParams(selectedStep.id, values)}
                  pen={pen}
                  aspect={aspect}
                  maxStrokes={maxStrokes}
                  maxPoints={maxPoints}
                  maxTextLength={maxTextLength}
                  assets={document.assets}
                />
              ) : null}
              <PreviewCursors/>
              {(stoppedAt && !showOriginal) ? (
                <figcaption className='absolute inset-x-0 bottom-0 bg-black/70 px-3 py-1.5 text-center text-[13px] text-white'>
                  {(preview?.stopped_cut) ? t('editor.preview.cut', {name: stoppedAt}) : t('editor.preview.stopped', {name: stoppedAt})}
                </figcaption>
              ) : null}
            </figure>
          )
        ) : (
          (stage === 'proxy_failed') ? (
            <p className='text-sm text-danger-text'>{t('editor.preview.proxy_failed')}</p>
          ) : (stage === 'failed') ? (
            <div className='flex flex-col items-center gap-2'>
              <p className='text-sm text-danger-text'>{failedLabel}</p>
              <button type='button' onClick={() => void state.retryPreview()} className='inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-brand-text hover:text-white'>
                <RotateCw aria-hidden className='size-3.5'/>{t('editor.preview.retry')}
              </button>
            </div>
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
