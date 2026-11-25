import { ArrowLeft, Redo2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import { newStep } from '../stack';
import type { EditorCatalogue, EditorEffect } from '../types';
import { useEditorDocument } from '../useEditorDocument';
import { EffectPicker } from './EffectPicker';
import { PreviewStage } from './PreviewStage';
import { RenderPanel } from './RenderPanel';
import { StepList } from './StepList';
import { StepSettings } from './StepSettings';
import type { PenSettings } from './SpatialOverlay';


function mediaChip(
  meta: {mimetype: string, width: number, height: number, framecount: number, duration: number},
  frames: (count: number) => string,
): string {
  const type = meta.mimetype.split('/')[1]?.toUpperCase() ?? '';
  const parts = [type];
  if (meta.width && meta.height) {
    parts.push(`${meta.width}×${meta.height}`);
  }
  if (meta.framecount > 1) {
    parts.push(frames(meta.framecount));
  } else if (meta.duration) {
    parts.push(`${meta.duration.toFixed(1)}s`);
  }
  return parts.join(' · ');
}


// The editor itself, the same in both hosts. The host gives it the api and what's different about where it runs
export function EditorApp({ host, documentId, catalogue }: {host: EditorHost, documentId: string, catalogue: EditorCatalogue}) {
  const { t, plural } = useI18n();
  const state = useEditorDocument(host, documentId, catalogue);
  const [ pen, setPen ] = useState<PenSettings>({color: '#ff3b3b', width: 0.01});
  const { document, loadError, selectedStep, effectsById } = state;

  // ctrl/cmd+z and shift+ctrl/cmd+z (or ctrl+y), not while typing in a field
  const { undo, redo } = state;
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      redo();
    }
  }, [undo, redo]);
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  if (loadError) {
    return (
      <FullPageMessage title={t('editor.load_error')}>
        {(host.onLeave) ? <button type='button' className='btn btn-secondary' onClick={host.onLeave}>{t('editor.back')}</button> : null}
      </FullPageMessage>
    );
  }
  if (!document) {
    return (
      <FullPageMessage>
        <Spinner/>
      </FullPageMessage>
    );
  }

  const meta = document.source_meta;
  // gifs and other animated images have no sound, videos usually do
  const hasAudio = meta.kind === 'audio' || (meta.kind === 'video' && meta.mimetype.startsWith('video/'));
  const selectedEffect = (selectedStep) ? effectsById.get(selectedStep.effect) : undefined;
  const addEffect = (effect: EditorEffect) => state.addStep(newStep(effect));
  const saveLabel = (state.saveState === 'saving') ? t('editor.save.saving') : (state.saveState === 'error') ? t('editor.save.error') : t('editor.save.saved');

  return (
    <div className='flex min-h-[calc(100dvh-4rem)] flex-col bg-bg text-fg'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-strong bg-deep px-4 py-2.5 sm:px-5'>
        {(host.onLeave) ? (
          <button type='button' onClick={host.onLeave} className='inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
            <ArrowLeft aria-hidden className='size-4'/>{t('editor.new')}
          </button>
        ) : null}
        <div className='flex min-w-0 flex-[1_1_240px] items-center gap-2'>
          <h1 className='truncate text-sm font-semibold text-white'>{document.source.filename}</h1>
          <span className='rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-xs whitespace-nowrap text-muted'>{mediaChip(meta, (count) => plural('editor.chip.frames', count))}</span>
        </div>
        <span role='status' className={cn('text-xs', (state.saveState === 'error') ? 'text-danger-text' : 'text-subtle')}>{saveLabel}</span>
        <div className='flex items-center gap-1'>
          <button type='button' aria-label={t('editor.undo')} title={t('editor.undo')} disabled={!state.canUndo} onClick={undo} className='flex size-10 items-center justify-center rounded-lg text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40'>
            <Undo2 aria-hidden className='size-5'/>
          </button>
          <button type='button' aria-label={t('editor.redo')} title={t('editor.redo')} disabled={!state.canRedo} onClick={redo} className='flex size-10 items-center justify-center rounded-lg text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40'>
            <Redo2 aria-hidden className='size-5'/>
          </button>
        </div>
      </div>

      {(state.reloaded) ? (
        <p role='status' className='border-b border-warning/40 bg-warning/10 px-5 py-2 text-sm text-warning'>{t('editor.reloaded')}</p>
      ) : null}

      <div className='flex flex-1 flex-col lg:flex-row'>
        <div className='order-3 w-full shrink-0 border-line bg-surface p-4 lg:order-1 lg:w-[300px] lg:border-r xl:w-[340px]'>
          <EffectPicker effects={catalogue.effects} kind={meta.kind} hasAudio={hasAudio} onAdd={addEffect}/>
        </div>
        <div className='order-1 min-w-0 flex-1 bg-deep lg:order-2'>
          <PreviewStage state={state} pen={pen} maxStrokes={catalogue.limits.max_strokes} maxPoints={catalogue.limits.max_stroke_points}/>
        </div>
        <aside aria-label={t('editor.edits')} className='order-2 flex w-full shrink-0 flex-col gap-3 border-line bg-surface p-4 lg:order-3 lg:w-[320px] lg:border-l xl:w-[360px]'>
          <div className='flex items-baseline justify-between'>
            <h2 className='font-display text-lg font-bold text-white'>{t('editor.edits')}</h2>
            <span className='font-mono text-xs text-muted'>{state.steps.length}</span>
          </div>
          <StepList state={state}/>
          {(selectedStep && selectedEffect) ? (
            <StepSettings
              state={state}
              effect={selectedEffect}
              step={selectedStep}
              pen={pen}
              setPen={setPen}
              maxStrokes={catalogue.limits.max_strokes}
              duration={(meta.kind === 'video' && meta.mimetype.startsWith('video/')) ? meta.duration : 0}
            />
          ) : null}
          <div className='flex-1'/>
          <RenderPanel
            host={host}
            documentId={document.id}
            disabled={!state.steps.some((step) => !step.hidden) || state.saveState !== 'saved'}
          />
        </aside>
      </div>
    </div>
  );
}
