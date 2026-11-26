import { FileUp, Link2, Music, Ratio } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { ADD_AUDIO_EFFECT_ID, assetFits, fileAccepts, fileForAudio, fileInputAccept } from '../stack';
import type { EditorAsset, EditorBox, EditorFileAccept, EditorStep } from '../types';
import type { EditorDocumentState } from '../useEditorDocument';
import { FileSteps } from './FileSteps';


// a new overlay's box: its file's own shape, 40% of the width (less when it would be too tall), centered
function fittedBox(asset: EditorAsset, mediaAspect: number): EditorBox {
  const assetAspect = (asset.height || 1) / (asset.width || 1);
  let width = 0.4;
  let height = width * assetAspect / mediaAspect;
  if (0.9 < height) {
    height = 0.9;
    width = height * mediaAspect / assetAspect;
  }
  const round = (value: number) => Math.round(value * 10000) / 10000;
  width = round(Math.min(width, 1));
  height = round(Math.min(height, 1));
  return {x: round((1 - width) / 2), y: round((1 - height) / 2), width, height};
}


// the box back to its file's shape: the same width (less when that would be too tall) around the same center
function reshapedBox(box: EditorBox | undefined, asset: EditorAsset, mediaAspect: number): EditorBox {
  const current = box ?? {x: 0.3, y: 0.3, width: 0.4, height: 0.4};
  const assetAspect = (asset.height || 1) / (asset.width || 1);
  let width = current.width;
  let height = width * assetAspect / mediaAspect;
  if (1 < height) {
    height = 1;
    width = height * mediaAspect / assetAspect;
  }
  width = Math.min(width, 1);
  const round = (value: number) => Math.round(value * 10000) / 10000;
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;
  // kept inside the media, like any box
  const x = Math.min(Math.max(centerX - width / 2, 0), 1 - width);
  const y = Math.min(Math.max(centerY - height / 2, 0), 1 - height);
  return {x: round(x), y: round(y), width: round(width), height: round(height)};
}


// The part of the file that's used: a start and an end on the file's own length (the end at its length is "to the end")
function ClipRange({ state, step, duration }: {state: EditorDocumentState, step: EditorStep, duration: number}) {
  const { t } = useI18n();
  const startId = useId();
  const endId = useId();
  const start = Math.min(Number(step.params.clip_start ?? 0), duration);
  const end = (typeof step.params.clip_end === 'number') ? Math.min(step.params.clip_end, duration) : duration;
  const minimum = 0.1;
  const round = (value: number) => Math.round(value * 100) / 100;
  return (
    <div className='flex flex-col gap-1.5 rounded-lg border border-line-strong p-2.5'>
      <span className='flex justify-between text-[13px] text-muted'>
        {t('editor.clip.part')}
        <span className='font-mono text-xs text-subtle tabular-nums'>{formatLength(start)} – {formatLength(end)} · {formatLength(end - start)}</span>
      </span>
      <label htmlFor={startId} className='text-xs text-subtle'>{t('editor.clip.start')}</label>
      <input
        id={startId}
        type='range'
        min={0}
        max={Math.max(duration - minimum, 0)}
        step={0.05}
        value={start}
        onChange={(event) => state.setParam(step.id, 'clip_start', round(Math.min(Number(event.target.value), end - minimum)))}
        className='accent-brand'
      />
      <label htmlFor={endId} className='text-xs text-subtle'>{t('editor.clip.end')}</label>
      <input
        id={endId}
        type='range'
        min={minimum}
        max={duration}
        step={0.05}
        value={end}
        onChange={(event) => {
          const value = round(Math.max(Number(event.target.value), start + minimum));
          // all the way to its end is "to the end", it then follows a file of any length
          state.setParam(step.id, 'clip_end', (duration - 0.05 <= value) ? null : value);
        }}
        className='accent-brand'
      />
    </div>
  );
}


function formatLength(seconds: number): string {
  const tenths = Math.round(seconds * 10) / 10;
  const minutes = Math.floor(tenths / 60);
  return `${minutes}:${(tenths - minutes * 60).toFixed(1).padStart(4, '0')}`;
}


function AssetThumb({ asset, className }: {asset: EditorAsset, className?: string}) {
  if (asset.kind === 'audio') {
    return <span aria-hidden className={cn('flex items-center justify-center bg-deep text-muted', className)}><Music aria-hidden className='size-5'/></span>;
  }
  if (asset.mimetype.startsWith('video/')) {
    return <video aria-hidden src={asset.url} muted autoPlay loop playsInline className={cn('bg-deep object-contain', className)}/>;
  }
  return <img src={asset.url} alt='' draggable={false} className={cn('bg-deep object-contain', className)}/>;
}


// a file that fits the step: what its effect's file param accepts (an overlay's shows something, Add Audio's has sound)
function fitsStep(asset: EditorAsset, accepts: Array<EditorFileAccept>): boolean {
  return assetFits(asset, accepts);
}


// The file of an effect that takes one (Overlay, Add Audio, and since 2026-11-26 Blend, Face Swap, Vocoder...): one
// already uploaded to this edit, a new upload, or a link. Only the files its `accepts` takes are offered. Picking one for
// an effect placed in a box (Overlay, Green Screen Overlay) sizes the box to the file's shape
export function OverlayMediaControl({ state, step, value }: {state: EditorDocumentState, step: EditorStep, value: string | null}) {
  const { t } = useI18n();
  const effect = state.effectsById.get(step.effect);
  const isOverlay = step.effect === 'overlay';
  const isAddAudio = step.effect === ADD_AUDIO_EFFECT_ID;
  const accepts: Array<EditorFileAccept> = (effect) ? fileAccepts(effect) : (isAddAudio) ? ['sound'] : ['image', 'video'];
  const forAudio = (effect) ? fileForAudio(effect) : isAddAudio;
  const hasBox = Boolean(effect?.params.some((param) => param.kind === 'box'));
  const videoOnly = accepts.length === 1 && accepts[0] === 'video';
  const notFit = (forAudio) ? t('editor.audio.no_sound') : (isOverlay) ? t('editor.overlay.not_visual') : (videoOnly) ? t('editor.file.not_video') : t('editor.file.not_visual');
  const fileRef = useRef<HTMLInputElement>(null);
  const linkId = useId();
  const [ link, setLink ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const assets = (state.document?.assets ?? []).filter((asset) => fitsStep(asset, accepts));
  const current = assets.find((asset) => asset.id === value) ?? null;
  const meta = state.document?.source_meta;
  const mediaAspect = (meta?.height || 1) / (meta?.width || 1);

  const pick = (asset: EditorAsset) => {
    state.setParam(step.id, 'media', asset.id);
    if (hasBox) {
      state.setParam(step.id, 'region', fittedBox(asset, mediaAspect));
    }
  };
  const upload = async (input: {file?: File, url?: string}) => {
    setPending(true);
    setError(null);
    try {
      const asset = await state.uploadAsset(input);
      if (!fitsStep(asset, accepts)) {
        // it's this edit's file now, just not one this step can use
        throw new Error(notFit);
      }
      pick(asset);
      setLink('');
    } catch (failure) {
      setError(state.errorOf(failure)?.message || ((failure instanceof Error && failure.message) ? failure.message : t('editor.overlay.upload_failed')));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='flex flex-col gap-2.5'>
      <span className='text-[13px] text-muted'>{(forAudio) ? t('editor.audio.file') : (isOverlay) ? t('editor.overlay.file') : t('editor.file.file')}</span>
      {(current) ? (
        <div className='flex items-center gap-2.5 rounded-lg border border-line-strong bg-deep p-2'>
          <AssetThumb asset={current} className='size-12 shrink-0 rounded'/>
          <span className='flex min-w-0 flex-col'>
            <span className='truncate text-sm text-fg'>{current.filename}</span>
            <span className='text-xs text-subtle'>
              {(current.kind === 'audio') ? formatLength(current.duration) : `${current.width}×${current.height}`}
              {(current.kind !== 'audio' && current.framecount > 1) ? ` · ${t('editor.overlay.animated')}` : ''}
            </span>
          </span>
        </div>
      ) : (
        <p className='text-xs text-subtle'>{(forAudio) ? t('editor.audio.pick_hint') : (isOverlay) ? t('editor.overlay.pick_hint') : (videoOnly) ? t('editor.file.pick_hint_video') : t('editor.file.pick_hint')}</p>
      )}
      {(assets.length) ? (
        <div role='group' aria-label={t('editor.overlay.uploaded')} className='flex flex-wrap gap-1.5'>
          {assets.map((asset) => (
            <button
              key={asset.id}
              type='button'
              aria-pressed={asset.id === value}
              aria-label={asset.filename}
              title={asset.filename}
              onClick={() => pick(asset)}
              className={cn('size-11 overflow-hidden rounded-md border-2', (asset.id === value) ? 'border-brand' : 'border-line-strong hover:border-muted')}
            >
              <AssetThumb asset={asset} className='size-full'/>
            </button>
          ))}
        </div>
      ) : null}
      <input
        ref={fileRef}
        type='file'
        accept={fileInputAccept(accepts)}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void upload({file});
          }
        }}
      />
      <button type='button' className='btn btn-secondary w-full' disabled={pending} onClick={() => fileRef.current?.click()}>
        {(pending) ? <Spinner className='size-4'/> : <FileUp aria-hidden className='size-4'/>}
        {(pending) ? t('editor.overlay.uploading') : t('editor.overlay.upload')}
      </button>
      <form
        className='flex gap-1.5'
        onSubmit={(event) => {
          event.preventDefault();
          if (link.trim() && !pending) {
            void upload({url: link.trim()});
          }
        }}
      >
        <label htmlFor={linkId} className='sr-only'>{t('editor.overlay.link')}</label>
        <input
          id={linkId}
          type='url'
          value={link}
          placeholder={t('editor.overlay.link')}
          onChange={(event) => setLink(event.target.value)}
          className='h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand'
        />
        <button type='submit' aria-label={t('editor.overlay.add_link')} title={t('editor.overlay.add_link')} disabled={!link.trim() || pending} className='flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-muted hover:text-fg disabled:opacity-40'>
          <Link2 aria-hidden className='size-4'/>
        </button>
      </form>
      {(error) ? <p role='alert' className='text-xs text-danger-text'>{error}</p> : null}
      {(current && 0 < current.duration) ? <ClipRange state={state} step={step} duration={current.duration}/> : null}
      {(current) ? <FileSteps state={state} step={step} asset={current} forAudio={forAudio} generic={!isOverlay && !forAudio}/> : null}
      {(current && hasBox) ? (
        <button
          type='button'
          className='btn btn-secondary w-full'
          onClick={() => state.setParam(step.id, 'region', reshapedBox(step.params.region as EditorBox | undefined, current, mediaAspect))}
        >
          <Ratio aria-hidden className='size-4'/>{t('editor.overlay.reshape')}
        </button>
      ) : null}
      {(current && (isAddAudio || hasBox)) ? <p className='text-xs text-subtle'>{(isAddAudio) ? t('editor.audio.note') : t('editor.overlay.place')}</p> : null}
      {(current && !forAudio && !hasBox && !videoOnly) ? <p className='text-xs text-subtle'>{t('editor.file.still_note')}</p> : null}
    </div>
  );
}
