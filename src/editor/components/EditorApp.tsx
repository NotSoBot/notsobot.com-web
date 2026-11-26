import { ArrowLeft, Eye, MessageCircleQuestion, Redo2, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import { FormulaContext, valuesBefore, VALUE_EFFECT_ID, type FormulaContextValue } from '../formulas';
import { addsAudio, newStep, stackKind, stepTimeline } from '../stack';
import type { EditorCatalogue, EditorEffect, EditorTemplate } from '../types';
import { useEditorDocument } from '../useEditorDocument';
import { EffectPicker } from './EffectPicker';
import { ForkButton } from './ForkRoom';
import { LobbyPeople } from './LobbyPeople';
import { MediaScriptButton } from './MediaScriptCopy';
import { PreviewStage } from './PreviewStage';
import { ReplaceMediaButton } from './ReplaceMedia';
import { RoomInviteButton } from './RoomInvite';
import { RenderPanel } from './RenderPanel';
import { CursorProvider } from './RoomCursors';
import { SaveTemplateButton } from './SaveTemplate';
import { askedInputs, FillInputsDialog } from './TemplateInputs';
import { StepList } from './StepList';
import { StepSettings, type TimeContext } from './StepSettings';
import { SaveLoadedTemplateButton, TemplatesButton } from './TemplatePicker';
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
export function EditorApp({ host, documentId, catalogue, addEffectId = null, onEffectAdded, askInputs = false, onInputsAsked }: {
  host: EditorHost,
  documentId: string,
  catalogue: EditorCatalogue,
  // just started from a template: its questions are asked once the document's here (`FillInputsDialog`)
  askInputs?: boolean,
  onInputsAsked?: () => void,
  // the commands page's Try it: this effect goes on once the document's here (only on one with no steps yet)
  addEffectId?: string | null,
  onEffectAdded?: () => void,
}) {
  const { t, plural } = useI18n();
  const state = useEditorDocument(host, documentId, catalogue);
  const [ pen, setPen ] = useState<PenSettings>({color: '#ff3b3b', width: 0.01});
  // one of their templates they loaded here, "Save template" writes changes back into it
  const [ loadedTemplate, setLoadedTemplate ] = useState<EditorTemplate | null>(null);
  const { document, loadError, selectedStep, effectsById } = state;

  // the template's questions: after starting from one, or loading one from Templates
  const [ filling, setFilling ] = useState(false);
  const askedRef = useRef(false);
  useEffect(() => {
    if (!askInputs || askedRef.current || !document) {
      return;
    }
    askedRef.current = true;
    if (askedInputs(document.steps, effectsById).length) {
      setFilling(true);
    }
    onInputsAsked?.();
  }, [askInputs, document, effectsById, onInputsAsked]);

  const addedRef = useRef(false);
  const { addStep } = state;
  useEffect(() => {
    if (!addEffectId || addedRef.current || !document) {
      return;
    }
    addedRef.current = true;
    const effect = effectsById.get(addEffectId);
    if (effect && !document.steps.length) {
      addStep(newStep(effect));
    }
    onEffectAdded?.();
  }, [addEffectId, addStep, document, effectsById, onEffectAdded]);

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
  // recorded since 2026-11-25, before that: gifs and other animated images have no sound, videos usually do
  const hasAudio = meta.kind === 'audio' || (meta.kind === 'video' && (meta.audio ?? meta.mimetype.startsWith('video/'))) || addsAudio(state.steps);
  // after a Still Frame it's an image, only image effects can follow
  const pickerKind = stackKind(meta.kind, state.steps);
  const proxy = document.proxy;
  // a gif's own probe can lack these, its proxy (a video) has them
  const sourceDuration = meta.duration || proxy?.duration || 0;
  const sourceFps = meta.fps || proxy?.fps || 0;
  const timeline = (selectedStep) ? stepTimeline(state.steps, selectedStep.id, sourceDuration) : null;
  // the scrubbed frame (frame previews only) on the selected step's clip, for "Use current frame"
  const scrubbed = (state.mode === 'frame' && proxy?.fps) ? state.frame / proxy.fps - (timeline?.offset ?? 0) : null;
  const time: TimeContext | null = (timeline) ? {
    duration: timeline.duration,
    fps: sourceFps,
    current: (scrubbed !== null && 0 <= scrubbed && scrubbed < timeline.duration) ? Math.round(scrubbed * 1000) / 1000 : null,
  } : null;
  const selectedEffect = (selectedStep) ? effectsById.get(selectedStep.effect) : undefined;
  // the values the selected step's formulas can use, and a Value step's own range for its number
  const formulaContext: FormulaContextValue = {
    values: valuesBefore(state.steps, selectedStep?.id ?? null),
    range: (selectedStep?.effect === VALUE_EFFECT_ID) ? {minimum: Number(selectedStep.params.minimum ?? 0), maximum: Number(selectedStep.params.maximum ?? 100)} : undefined,
  };
  const addEffect = (effect: EditorEffect) => state.addStep(newStep(effect));
  const saveLabel = (state.saveState === 'saving') ? t('editor.save.saving') : (state.saveState === 'error') ? t('editor.save.error') : t('editor.save.saved');

  return (
    <CursorProvider room={state.room ?? null} documentId={document.id} editors={state.editors}>
    {/* on wide screens the editor is the window's height (under the site's navbar on the web) and each column scrolls on
        its own, so a long effect list never pushes Render out of reach. narrow screens scroll as one page */}
    <div className={cn('flex flex-col bg-bg text-fg', (host.fullscreen) ? 'min-h-[var(--editor-height,100dvh)] lg:h-[var(--editor-height,100dvh)]' : 'min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem-1px)]')}>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-strong bg-deep px-4 py-2.5 sm:px-5'>
        {(host.onLeave) ? (
          <button type='button' onClick={host.onLeave} className='inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
            <ArrowLeft aria-hidden className='size-4'/>{host.leaveLabel ?? t('editor.new')}
          </button>
        ) : null}
        <div className='flex min-w-0 flex-[1_1_240px] items-center gap-2'>
          <h1 className='truncate text-sm font-semibold text-white'>{document.lobby_name || document.source.filename}</h1>
          <span className='rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-xs whitespace-nowrap text-muted'>{mediaChip(meta, (count) => plural('editor.chip.frames', count))}</span>
          {(!state.watching) ? <ReplaceMediaButton state={state}/> : null}
        </div>
        {(state.room) ? <LobbyPeople editors={state.editors} room={state.room} documentId={document.id} ownerId={document.user_id} roomName={document.lobby_name || document.source.filename} lobbyName={document.lobby_name ?? null} locked={Boolean(document.locked)} watchOnly={Boolean(document.watch_only)}/> : null}
        {(state.room && state.roomStatus !== 'open') ? <span role='status' className='text-xs text-warning'>{t('editor.room.reconnecting')}</span> : null}
        <span role='status' className={cn('text-xs', (state.saveState === 'error') ? 'text-danger-text' : 'text-subtle')}>{saveLabel}</span>
        <div className='flex items-center gap-1'>
          {/* a group room's Invite (the Activity's, never a solo edit) */}
          {(state.room && host.inviter) ? <RoomInviteButton inviter={host.inviter(document.id)}/> : null}
          {/* the saved steps are what a template copies, so not while a change is still saving */}
          {(host.fork) ? <ForkButton host={host} state={state}/> : null}
          <MediaScriptButton host={host} documentId={document.id} disabled={!state.steps.length || state.saveState !== 'saved'}/>
          {(!state.watching) ? (
            <TemplatesButton host={host} state={state} onLoad={(template) => {
              setLoadedTemplate(template);
              if (template.steps.some((step) => step.inputs && Object.keys(step.inputs).length)) {
                setFilling(true);
              }
            }}/>
          ) : null}
          {(loadedTemplate && !state.watching) ? <SaveLoadedTemplateButton host={host} state={state} documentId={document.id} template={loadedTemplate}/> : null}
          <SaveTemplateButton host={host} state={state} documentId={document.id} exampleUrl={(state.preview && !state.preview.unedited) ? state.preview.url : null} disabled={!state.steps.length || state.saveState !== 'saved'}/>
          <button type='button' aria-label={t('editor.undo')} title={t('editor.undo')} disabled={!state.canUndo} onClick={undo} className='flex size-10 items-center justify-center rounded-lg text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40'>
            <Undo2 aria-hidden className='size-5'/>
          </button>
          <button type='button' aria-label={t('editor.redo')} title={t('editor.redo')} disabled={!state.canRedo} onClick={redo} className='flex size-10 items-center justify-center rounded-lg text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40'>
            <Redo2 aria-hidden className='size-5'/>
          </button>
        </div>
      </div>

      {(state.renderLocked) ? (
        <p role='status' className='border-b border-warning/40 bg-warning/10 px-5 py-2 text-sm text-warning'>
          {t('editor.room.rendering', {name: state.renderingMember?.username ?? t('editor.room.someone')})}
        </p>
      ) : null}

      {(state.watching) ? (
        <div role='status' className='flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-brand/40 bg-brand/10 px-5 py-2 text-sm text-fg'>
          <Eye aria-hidden className='size-4 shrink-0 text-brand-text'/>
          <span className='min-w-0 flex-1'>{t('editor.room.watching', {name: state.members.find((member) => member.user_id === document.user_id)?.username ?? t('editor.room.creator')})}</span>
          {(host.fork) ? <ForkButton host={host} state={state}/> : null}
        </div>
      ) : null}

      {(state.reloaded) ? (
        <p role='status' className='border-b border-warning/40 bg-warning/10 px-5 py-2 text-sm text-warning'>{t('editor.reloaded')}</p>
      ) : null}

      {/* another person's final render locks the stack for everyone in the activity until it's done */}
      <fieldset disabled={state.renderLocked} className='contents'>
      <div className='flex flex-1 flex-col lg:min-h-0 lg:flex-row'>
        <div className='order-3 w-full shrink-0 border-line bg-surface p-4 lg:order-1 lg:w-[300px] lg:overflow-y-auto lg:border-r xl:w-[340px]'>
          {(state.watching) ? <p className='mb-3 text-xs text-subtle'>{t('editor.room.watching_picker')}</p> : null}
          <fieldset disabled={state.watching} className={cn('contents', state.watching && '[&_button]:opacity-60')}>
          <EffectPicker effects={catalogue.effects} kind={pickerKind} hasAudio={hasAudio && pickerKind !== 'image'} onAdd={addEffect}/>
          </fieldset>
        </div>
        <div className='order-1 min-w-0 flex-1 bg-deep lg:order-2 lg:overflow-y-auto'>
          <PreviewStage state={state} pen={pen} maxStrokes={catalogue.limits.max_strokes} maxPoints={catalogue.limits.max_stroke_points} maxTextLength={catalogue.limits.max_text_length}/>
        </div>
        <aside aria-label={t('editor.edits')} className='order-2 flex w-full shrink-0 flex-col gap-3 border-line bg-surface p-4 lg:order-3 lg:min-h-0 lg:w-[320px] lg:border-l xl:w-[360px]'>
          {/* the steps and their settings scroll, Render stays at the bottom */}
          <div className='flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto'>
          <div className='flex items-baseline justify-between'>
            <h2 className='font-display text-lg font-bold text-white'>{t('editor.edits')}</h2>
            <span className='font-mono text-xs text-muted'>{state.steps.length}</span>
          </div>
          <fieldset disabled={state.watching} className='contents'>
          <StepList state={state}/>
          </fieldset>
          {(selectedStep?.inputs && Object.keys(selectedStep.inputs).length && !state.watching) ? (
            <div className='flex flex-col gap-1.5 rounded-lg border border-brand/30 bg-brand/10 p-2.5'>
              <span className='text-xs text-muted'>{t('editor.inputs.step_asks')}</span>
              {Object.entries(selectedStep.inputs).map(([ name, question ]) => (
                <span key={name} className='flex items-center gap-1.5 text-sm text-fg'>
                  <MessageCircleQuestion aria-hidden className='size-3.5 shrink-0 text-brand-text'/>
                  <span className='min-w-0 flex-1 truncate'>{question}</span>
                  <button
                    type='button'
                    aria-label={t('editor.inputs.remove', {question})}
                    title={t('editor.inputs.remove', {question})}
                    onClick={() => {
                      const { [name]: _, ...rest } = selectedStep.inputs!;
                      state.setStepInputs({[selectedStep.id]: (Object.keys(rest).length) ? rest : undefined});
                    }}
                    className='flex size-7 items-center justify-center rounded text-muted hover:text-fg'
                  >
                    <X aria-hidden className='size-3.5'/>
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <FormulaContext.Provider value={formulaContext}>
          {(selectedStep && selectedEffect && !state.watching) ? (
            <StepSettings
              state={state}
              effect={selectedEffect}
              step={selectedStep}
              pen={pen}
              setPen={setPen}
              maxStrokes={catalogue.limits.max_strokes}
              duration={(meta.kind === 'video' && meta.mimetype.startsWith('video/')) ? meta.duration : 0}
              time={time}
            />
          ) : null}
          </FormulaContext.Provider>
          </div>
          <RenderPanel
            host={host}
            documentId={document.id}
            documentFilename={document.source.filename}
            formats={document.render_formats ?? []}
            sourceKind={document.source_meta.kind}
            empty={!state.steps.some((step) => !step.hidden)}
            waitForSave={state.whenSaved}
          />
        </aside>
      </div>
      </fieldset>
      {(filling && !state.watching) ? <FillInputsDialog state={state} onClose={() => setFilling(false)}/> : null}
    </div>
    </CursorProvider>
  );
}
