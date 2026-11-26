import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EditorErrorCodes, type EditorApiError, type EditorHost } from './api';
import type { RoomMember, RoomOp, RoomStatus } from './room';
import { spatialTool } from './stack';
import type { EditorAsset, EditorCatalogue, EditorDocument, EditorPreview, EditorPreviewMode, EditorStep } from './types';


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
// how long a render waits for the last edits to save before giving up
const SAVE_WAIT_LIMIT = 15 * 1000;
// rooms: a dragged param is sent at most this often, its lock renewed this often and dropped this long after the last move
const ROOM_PARAM_INTERVAL = 120;
const ROOM_LOCK_RENEW = 4000;
const ROOM_LOCK_RELEASE = 1500;
// a document from the room asks for a preview after this long without another one
const ROOM_PREVIEW_DELAY = 200;


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
  const saveStateRef = useRef<SaveState>('saved');
  saveStateRef.current = saveState;
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

  // ---- the activity's room (host.room), null on the web ----
  const room = host.room ?? null;
  const [ roomStatus, setRoomStatus ] = useState<RoomStatus | null>(room?.status ?? null);
  const [ members, setMembers ] = useState<Array<RoomMember>>(room?.members ?? []);
  const [ locks, setLocks ] = useState<Record<string, string>>(room?.locks ?? {});
  // someone else is rendering, the stack is locked for everyone until it ends
  const [ rendering, setRendering ] = useState<string | null>(null);
  // ops sent and not yet seen back, the room's documents don't replace the stack until they're all in
  const pendingOpsRef = useRef(new Set<string>());
  const paramTimersRef = useRef(new Map<string, {timer: number, value: unknown}>());
  const lockTimersRef = useRef(new Map<string, {renewed: number, release: number}>());
  const roomPreviewTimerRef = useRef<number | null>(null);

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

  const sendOp = useCallback((op: RoomOp) => {
    if (room?.isOpen) {
      pendingOpsRef.current.add(room.sendOp(op));
      // the render (and "saved") waits until the room has every op from here
      setSaveState('saving');
    }
  }, [room]);

  // a dragged param goes out at most every ROOM_PARAM_INTERVAL (the last value always), and its step is soft-locked
  // while it moves so nobody else changes it at the same time
  const sendParam = useCallback((stepId: string, name: string, value: unknown) => {
    if (!room?.isOpen) {
      return;
    }
    const key = `${stepId}:${name}`;
    const waiting = paramTimersRef.current.get(key);
    if (waiting) {
      waiting.value = value;
    } else {
      sendOp({op: 'set_param', step_id: stepId, name, value});
      const entry = {value: undefined as unknown, timer: 0};
      entry.timer = window.setTimeout(() => {
        paramTimersRef.current.delete(key);
        if (entry.value !== undefined) {
          sendOp({op: 'set_param', step_id: stepId, name, value: entry.value});
        } else if (!pendingOpsRef.current.size && !paramTimersRef.current.size && documentRef.current) {
          // nothing more to send and the room's document already came (it waited on this timer): take it now
          stepsRef.current = documentRef.current.steps;
          setSteps(documentRef.current.steps);
          setSaveState('saved');
        }
      }, ROOM_PARAM_INTERVAL);
      paramTimersRef.current.set(key, entry);
    }

    const now = Date.now();
    const lock = lockTimersRef.current.get(stepId);
    if (!lock || now - lock.renewed > ROOM_LOCK_RENEW) {
      room.lock(stepId);
    }
    if (lock) {
      window.clearTimeout(lock.release);
    }
    lockTimersRef.current.set(stepId, {
      renewed: (!lock || now - lock.renewed > ROOM_LOCK_RENEW) ? now : lock.renewed,
      release: window.setTimeout(() => {
        lockTimersRef.current.delete(stepId);
        room.unlock(stepId);
      }, ROOM_LOCK_RELEASE),
    });
  }, [room, sendOp]);

  const commit = useCallback((next: Array<EditorStep>, coalesceKey?: string, op?: RoomOp) => {
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
    // in an activity the room applies it, while its socket isn't open (connecting, nginx refusing the upgrade) it's
    // saved over http like the web, which the api announces to the room too
    if (room?.isOpen) {
      // set_param goes through `sendParam` (throttled), everything else at once
      if (op && op.op !== 'set_param') {
        sendOp(op);
      }
      return;
    }
    scheduleSave();
  }, [room, scheduleSave, sendOp]);

  const restore = useCallback((next: Array<EditorStep>) => {
    stepsRef.current = next;
    setSteps(next);
    lastHistoryRef.current = null;
    setHistoryVersion((value) => value + 1);
    if (room?.isOpen) {
      sendOp({op: 'replace', steps: next});
      return;
    }
    scheduleSave();
  }, [room, scheduleSave, sendOp]);

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

  // files new to the document (an upload, a loaded template's), shown right away. The next document from the api has them
  // too, they're on its row already
  const addAssets = useCallback((assets: Array<EditorAsset>) => {
    const current = documentRef.current;
    if (!current) {
      return;
    }
    const known = new Set((current.assets ?? []).map((asset) => asset.id));
    const added = assets.filter((asset) => !known.has(asset.id));
    if (!added.length) {
      return;
    }
    const next = {...current, assets: [...(current.assets ?? []), ...added]};
    documentRef.current = next;
    setDocument(next);
  }, []);

  // an overlay's file, uploaded (a file or a link) and scanned by the api, then one of the document's assets
  const uploadAsset = useCallback(async (input: {file?: File, url?: string}): Promise<EditorAsset> => {
    const asset = await api.uploadAsset(documentId, input);
    addAssets([asset]);
    return asset;
  }, [addAssets, api, documentId]);

  // the whole stack at once (a template loaded onto it), one undo brings back what was there
  const replaceSteps = useCallback((next: Array<EditorStep>) => {
    commit(next, undefined, {op: 'replace', steps: next});
    setSelectedId(null);
  }, [commit]);

  const addStep = useCallback((step: EditorStep) => {
    commit([...stepsRef.current, step], undefined, {op: 'add', step});
    setSelectedId(step.id);
  }, [commit]);

  const removeStep = useCallback((stepId: string) => {
    commit(stepsRef.current.filter((step) => step.id !== stepId), undefined, {op: 'remove', step_id: stepId});
    setSelectedId((current) => (current === stepId) ? null : current);
  }, [commit]);

  const toggleStep = useCallback((stepId: string) => {
    const hidden = !stepsRef.current.find((step) => step.id === stepId)?.hidden;
    commit(stepsRef.current.map((step) => (step.id === stepId) ? {...step, hidden} : step), undefined, {op: 'toggle', step_id: stepId, hidden});
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
    commit(items, undefined, {op: 'move', step_id: stepId, to: target});
  }, [commit]);

  const setParam = useCallback((stepId: string, name: string, value: unknown) => {
    commit(
      stepsRef.current.map((step) => (step.id === stepId) ? {...step, params: {...step.params, [name]: value}} : step),
      `${stepId}:${name}`,
      {op: 'set_param', step_id: stepId, name, value},
    );
    sendParam(stepId, name, value);
  }, [commit, sendParam]);

  // ---- room events ----

  useEffect(() => {
    if (!room) {
      return;
    }
    const previewSoon = () => {
      if (roomPreviewTimerRef.current !== null) {
        window.clearTimeout(roomPreviewTimerRef.current);
      }
      roomPreviewTimerRef.current = window.setTimeout(() => {
        roomPreviewTimerRef.current = null;
        void runPreview();
      }, ROOM_PREVIEW_DELAY);
    };
    const takeDocument = (next: EditorDocument) => {
      if (next.id !== documentId) {
        return;
      }
      // a change made while joining can come again after `ready`, an older or the same version is already here
      if (documentRef.current?.id === next.id && next.version <= documentRef.current.version) {
        return;
      }
      documentRef.current = next;
      setDocument(next);
      // our own ops still on their way would be undone by this older stack, the last one's document has them all
      if (!pendingOpsRef.current.size && !paramTimersRef.current.size) {
        stepsRef.current = next.steps;
        setSteps(next.steps);
        setSaveState('saved');
      }
      previewSoon();
    };
    const unsubscribeStatus = room.onStatus((status) => {
      setRoomStatus(status);
      if (status !== 'open' && pendingOpsRef.current.size) {
        // ops in flight are lost with the socket, the next document (or the http save from here on) is the truth.
        // only then, an http save running now keeps its own state
        pendingOpsRef.current.clear();
        setSaveState('saved');
      }
    });
    const unsubscribe = room.subscribe((event) => {
      switch (event.t) {
        case 'ready': {
          setMembers(event.members);
          setLocks(event.locks);
          // a reconnect: what changed while the socket was down (the room only sends lobbies, not documents)
          void api.document(documentId).then(takeDocument).catch(() => undefined);
          break;
        }
        case 'document': {
          if (event.op_id) {
            pendingOpsRef.current.delete(event.op_id);
          }
          takeDocument(event.document);
          setStepError(null);
          break;
        }
        case 'error': {
          if (event.op_id) {
            pendingOpsRef.current.delete(event.op_id);
          }
          setStepError({index: (typeof event.index === 'number') ? event.index : null, message: event.message});
          // a refused op (its step's gone, a bad value): back to what the room has
          if (!pendingOpsRef.current.size && documentRef.current) {
            stepsRef.current = documentRef.current.steps;
            setSteps(documentRef.current.steps);
            setSaveState('saved');
          }
          break;
        }
        case 'members':
          setMembers(event.members);
          break;
        case 'lobby_updated':
          // its name and lock, the steps and version are untouched
          if (event.document_id === documentId && documentRef.current) {
            const next = {...documentRef.current, lobby_name: event.name, locked: event.locked};
            documentRef.current = next;
            setDocument(next);
          }
          break;
        case 'lock':
        case 'unlock':
          setLocks({...room.locks});
          break;
        case 'render':
          // another lobby's renders don't lock this one
          if (event.user_id !== room.you && (!event.document_id || event.document_id === documentId)) {
            setRendering((event.status === 'started') ? event.user_id : null);
          }
          break;
        default:
          break;
      }
    });
    return () => {
      unsubscribe();
      unsubscribeStatus();
      for (const { timer } of paramTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      paramTimersRef.current.clear();
      for (const [ stepId, { release } ] of lockTimersRef.current) {
        window.clearTimeout(release);
        room.unlock(stepId);
      }
      lockTimersRef.current.clear();
    };
  }, [api, documentId, room, runPreview]);

  // who else holds a step's soft lock (they're dragging it), null when it's free or it's ours
  // Resolves once every edit is saved (true), or the save failed or took too long (false). The render waits on it, so
  // its button doesn't have to be turned off while each stroke or slider move saves
  const whenSaved = useCallback(async (): Promise<boolean> => {
    const deadline = Date.now() + SAVE_WAIT_LIMIT;
    while (Date.now() < deadline) {
      if (saveStateRef.current === 'saved') {
        return true;
      }
      if (saveStateRef.current === 'error') {
        return false;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return false;
  }, []);

  const lockedBy = useCallback((stepId: string): RoomMember | null => {
    const userId = locks[stepId];
    if (!room || !userId || userId === room.you) {
      return null;
    }
    return members.find((member) => member.user_id === userId) ?? {user_id: userId, username: userId, avatar_url: null};
  }, [locks, members, room]);
  // who's editing this document (the lobby), everyone else in the activity is elsewhere
  const editors = useMemo(() => members.filter((member) => member.editing === documentId), [documentId, members]);
  const renderingMember = (rendering) ? (members.find((member) => member.user_id === rendering) ?? null) : null;

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
    // the host's reading of an api error, for controls that call the api themselves (an overlay's upload)
    errorOf: host.errorOf,
    document,
    loadError,
    steps,
    effectsById,
    selectedId,
    setSelectedId,
    selectedStep,
    selectedTool,
    saveState,
    whenSaved,
    stepError,
    reloaded,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    undo,
    redo,
    addStep,
    replaceSteps,
    addAssets,
    uploadAsset,
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
    room,
    roomStatus,
    members,
    editors,
    lockedBy,
    // someone else's render locks the stack until it's done
    renderLocked: Boolean(rendering),
    renderingMember,
  };
}

export type EditorDocumentState = ReturnType<typeof useEditorDocument>;
