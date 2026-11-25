import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EditorErrorCodes, type EditorApiError, type EditorHost } from './api';
import { spatialTool } from './stack';
import type { EditorCatalogue, EditorDocument, EditorPreview, EditorPreviewMode, EditorStep } from './types';


// How long the stack waits after the last change before saving (then previewing)
const SAVE_DELAY = 350;
// a frame scrub waits this long after the last move before asking for that frame
const FRAME_DELAY = 250;
const PREVIEW_POLL = 500;
const PROXY_POLL = 1500;
// previews were refused as busy, try again after this
const BUSY_RETRY = 5000;
// two changes to the same param within this long are one undo step (a slider drag)
const COALESCE_WINDOW = 800;
const MAX_HISTORY = 50;
// animated media with more frames than this preview one frame at a time until play is pressed (the api's frame mode)
export const FRAME_MODE_MIN_FRAMES = 48;


export type SaveState = 'saved' | 'saving' | 'error';
export type PreviewState = 'idle' | 'updating' | 'preparing' | 'busy' | 'failed';

export interface StepError {
  index: number | null,
  message: string,
}

type DonePreview = Extract<EditorPreview, {status: 'done'}>;


function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(signal.reason);
    }, {once: true});
  });
}


export function useEditorDocument(host: EditorHost, documentId: string, catalogue: EditorCatalogue | undefined) {
  const { api } = host;

  const [ document, setDocument ] = useState<EditorDocument | null>(null);
  const [ loadError, setLoadError ] = useState<EditorApiError | null>(null);
  const [ steps, setSteps ] = useState<Array<EditorStep>>([]);
  // undo/redo stacks live in a ref (updaters must stay pure), `historyVersion` re-renders when they change
  const historyRef = useRef<{past: Array<Array<EditorStep>>, future: Array<Array<EditorStep>>}>({past: [], future: []});
  const [ , setHistoryVersion ] = useState(0);
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  const [ saveState, setSaveState ] = useState<SaveState>('saved');
  const [ stepError, setStepError ] = useState<StepError | null>(null);
  // the server changed it under us (someone else's edit), the stack was reloaded
  const [ reloaded, setReloaded ] = useState(false);

  const [ preview, setPreview ] = useState<DonePreview | null>(null);
  const [ previewState, setPreviewState ] = useState<PreviewState>('idle');
  const [ previewError, setPreviewError ] = useState<string | null>(null);
  const [ playing, setPlaying ] = useState(false);
  const [ frame, setFrame ] = useState(0);

  // what async work reads, always the latest
  const documentRef = useRef<EditorDocument | null>(null);
  const stepsRef = useRef<Array<EditorStep>>([]);
  const lastHistoryRef = useRef<{key: string, at: number} | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const previewAbortRef = useRef<AbortController | null>(null);
  const frameTimerRef = useRef<number | null>(null);

  const effectsById = useMemo(() => new Map((catalogue?.effects ?? []).map((effect) => [effect.id, effect])), [catalogue]);

  // ---- preview ----

  const visibleIndexOf = useCallback((stepId: string | null): number | null => {
    if (!stepId) {
      return null;
    }
    let count = 0;
    for (const step of stepsRef.current) {
      if (step.id === stepId) {
        return count;
      }
      if (!step.hidden) {
        count += 1;
      }
    }
    return null;
  }, []);

  const animated = (document?.proxy?.framecount ?? document?.source_meta.framecount ?? 1) > 1;
  const frameMode = animated && !playing && (document?.proxy?.framecount ?? 0) > FRAME_MODE_MIN_FRAMES;
  const mode: EditorPreviewMode = (!animated) ? 'still' : (frameMode) ? 'frame' : 'clip';

  const selectedStep = steps.find((step) => step.id === selectedId) ?? null;
  const selectedTool = spatialTool(selectedStep ? effectsById.get(selectedStep.effect) : undefined);
  // a spatial step is placed on what goes into it, so the preview stops right before it
  const upto = (selectedTool && selectedStep) ? visibleIndexOf(selectedStep.id) : null;

  const requestRef = useRef({mode, frame, upto});
  requestRef.current = {mode, frame, upto};

  const runPreview = useCallback(async () => {
    const current = documentRef.current;
    if (!current) {
      return;
    }
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    const { signal } = controller;
    const { mode: requestMode, frame: requestFrame, upto: requestUpto } = requestRef.current;

    setPreviewState('updating');
    setPreviewError(null);
    try {
      let result = await api.preview(current.id, {mode: requestMode, frame: requestFrame, upto: requestUpto ?? undefined}, signal);
      for (;;) {
        if (result.status === 'done') {
          setPreview(result);
          setPreviewState('idle');
          return;
        }
        if (result.status === 'failed') {
          setPreviewState('failed');
          setPreviewError(result.error);
          return;
        }
        if (result.status === 'superseded' || result.status === 'expired') {
          // a newer one replaced it (ours, or someone else's in an activity), that one shows
          if (!signal.aborted) {
            setPreviewState('idle');
          }
          return;
        }
        if (result.status === 'preparing') {
          setPreviewState('preparing');
          await sleep(PROXY_POLL, signal);
          const latest = await api.document(current.id, signal);
          if (latest.proxy) {
            documentRef.current = {...documentRef.current ?? latest, proxy: latest.proxy, proxy_status: latest.proxy_status};
            setDocument(documentRef.current);
          }
          if (latest.proxy_status === 'failed') {
            setPreviewState('failed');
            setPreviewError(null);
            return;
          }
          result = await api.preview(current.id, {mode: requestMode, frame: requestFrame, upto: requestUpto ?? undefined}, signal);
          continue;
        }
        // pending
        const previewId = result.preview_id;
        if (!previewId) {
          return;
        }
        await sleep(PREVIEW_POLL, signal);
        result = await api.previewStatus(current.id, previewId, signal);
      }
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      const apiError = host.errorOf(error);
      if (apiError?.code === EditorErrorCodes.SERVICE_BUSY || apiError?.status === 429) {
        // keep the last good preview up, try again in a bit
        setPreviewState('busy');
        try {
          await sleep(BUSY_RETRY, signal);
        } catch {
          return;
        }
        void runPreview();
        return;
      }
      setPreviewState('failed');
      setPreviewError(apiError?.message ?? null);
    }
  }, [api, host]);

  // ---- saving ----

  const save = useCallback(async () => {
    const current = documentRef.current;
    if (!current) {
      return;
    }
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState('saving');
    const sent = stepsRef.current;
    try {
      const saved = await api.saveSteps(current.id, sent, current.version);
      documentRef.current = saved;
      setDocument(saved);
      setStepError(null);
      setSaveState('saved');
    } catch (error) {
      const apiError = host.errorOf(error);
      if (apiError?.code === EditorErrorCodes.EDITOR_DOCUMENT_VERSION_MISMATCH) {
        // changed elsewhere: take the server's and say so, the edit since is lost (rare on the web, one tab each)
        const latest = await api.document(current.id).catch(() => null);
        if (latest) {
          documentRef.current = latest;
          stepsRef.current = latest.steps;
          setDocument(latest);
          setSteps(latest.steps);
          setReloaded(true);
        }
        setSaveState('saved');
      } else if (apiError?.code === EditorErrorCodes.EDITOR_INVALID_STEP) {
        const index = apiError.body?.index;
        setStepError({index: (typeof index === 'number') ? index : null, message: apiError.message});
        setSaveState('error');
      } else {
        setStepError({index: null, message: apiError?.message ?? ''});
        setSaveState('error');
      }
      savingRef.current = false;
      return;
    }
    savingRef.current = false;
    if (dirtyRef.current) {
      void save();
      return;
    }
    void runPreview();
  }, [api, host, runPreview]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    setSaveState('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void save();
    }, SAVE_DELAY);
  }, [save]);

  // ---- loading ----

  useEffect(() => {
    const controller = new AbortController();
    setDocument(null);
    setLoadError(null);
    setPreview(null);
    historyRef.current = {past: [], future: []};
    setHistoryVersion((value) => value + 1);
    setSelectedId(null);
    (async () => {
      try {
        const loaded = await api.document(documentId, controller.signal);
        documentRef.current = loaded;
        stepsRef.current = loaded.steps;
        setDocument(loaded);
        setSteps(loaded.steps);
        void runPreview();
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(host.errorOf(error) ?? {status: 0, code: null, message: '', body: null});
        }
      }
    })();
    return () => {
      controller.abort();
      previewAbortRef.current?.abort();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [api, documentId, host, runPreview]);

  // a different selection (spatial steps preview what goes into them), playing or a mode change asks again
  const previewKey = `${mode}:${upto ?? 'all'}`;
  const previewKeyRef = useRef(previewKey);
  useEffect(() => {
    if (previewKeyRef.current === previewKey) {
      return;
    }
    previewKeyRef.current = previewKey;
    if (documentRef.current && !savingRef.current && saveTimerRef.current === null) {
      void runPreview();
    }
  }, [previewKey, runPreview]);

  // ---- editing ----

  const commit = useCallback((next: Array<EditorStep>, coalesceKey?: string) => {
    const now = Date.now();
    const last = lastHistoryRef.current;
    const coalesce = Boolean(coalesceKey && last && last.key === coalesceKey && now - last.at < COALESCE_WINDOW);
    if (!coalesce) {
      historyRef.current = {past: [...historyRef.current.past, stepsRef.current].slice(-MAX_HISTORY), future: []};
      setHistoryVersion((value) => value + 1);
    }
    lastHistoryRef.current = (coalesceKey) ? {key: coalesceKey, at: now} : null;
    stepsRef.current = next;
    setSteps(next);
    setReloaded(false);
    scheduleSave();
  }, [scheduleSave]);

  const restore = useCallback((next: Array<EditorStep>) => {
    stepsRef.current = next;
    setSteps(next);
    lastHistoryRef.current = null;
    setHistoryVersion((value) => value + 1);
    scheduleSave();
  }, [scheduleSave]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) {
      return;
    }
    historyRef.current = {past: past.slice(0, -1), future: [stepsRef.current, ...future].slice(0, MAX_HISTORY)};
    restore(past[past.length - 1]);
  }, [restore]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) {
      return;
    }
    historyRef.current = {past: [...past, stepsRef.current].slice(-MAX_HISTORY), future: future.slice(1)};
    restore(future[0]);
  }, [restore]);

  const addStep = useCallback((step: EditorStep) => {
    commit([...stepsRef.current, step]);
    setSelectedId(step.id);
  }, [commit]);

  const removeStep = useCallback((stepId: string) => {
    commit(stepsRef.current.filter((step) => step.id !== stepId));
    setSelectedId((current) => (current === stepId) ? null : current);
  }, [commit]);

  const toggleStep = useCallback((stepId: string) => {
    commit(stepsRef.current.map((step) => (step.id === stepId) ? {...step, hidden: !step.hidden} : step));
  }, [commit]);

  const moveStep = useCallback((stepId: string, to: number) => {
    const items = [...stepsRef.current];
    const from = items.findIndex((step) => step.id === stepId);
    if (from === -1) {
      return;
    }
    const target = Math.min(Math.max(to, 0), items.length - 1);
    if (target === from) {
      return;
    }
    const [ step ] = items.splice(from, 1);
    items.splice(target, 0, step);
    commit(items);
  }, [commit]);

  const setParam = useCallback((stepId: string, name: string, value: unknown) => {
    commit(
      stepsRef.current.map((step) => (step.id === stepId) ? {...step, params: {...step.params, [name]: value}} : step),
      `${stepId}:${name}`,
    );
  }, [commit]);

  // ---- playback / frames ----

  const scrubTo = useCallback((value: number) => {
    setFrame(value);
    if (frameTimerRef.current !== null) {
      window.clearTimeout(frameTimerRef.current);
    }
    frameTimerRef.current = window.setTimeout(() => {
      frameTimerRef.current = null;
      requestRef.current = {...requestRef.current, frame: value};
      void runPreview();
    }, FRAME_DELAY);
  }, [runPreview]);

  return {
    document,
    loadError,
    steps,
    effectsById,
    selectedId,
    setSelectedId,
    selectedStep,
    selectedTool,
    saveState,
    stepError,
    reloaded,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    undo,
    redo,
    addStep,
    removeStep,
    toggleStep,
    moveStep,
    setParam,
    preview,
    previewState,
    previewError,
    mode,
    animated,
    frame,
    scrubTo,
    playing,
    setPlaying,
    retryPreview: runPreview,
  };
}

export type EditorDocumentState = ReturnType<typeof useEditorDocument>;
