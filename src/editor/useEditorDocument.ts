import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EditorErrorCodes, type EditorApiError, type EditorHost } from './api';
import type { RoomMember, RoomOp } from './room';
import { applyStackChange, changedStepId, spatialTool, type StackChange } from './stack';
import type { EditorAsset, EditorCatalogue, EditorDocument, EditorPreview, EditorPreviewMode, EditorStep } from './types';


// How long the stack waits after the last change before saving (then previewing)
const SAVE_DELAY = 350;
// a frame scrub waits this long after the last move before asking for that frame
const FRAME_DELAY = 250;
// the api holds a pending preview's answer until it's over, so the next poll goes out as the last comes back. An
// answer that came straight back wasn't held: the next one waits out the rest of this
const PREVIEW_POLL = 400;
// "the small copy is still being made" comes after the api already waited a few seconds for it, asked again this soon
const PROXY_POLL = 500;
// previews were refused as busy, try again after this
const BUSY_RETRY = 5000;
// a preview replaced by nothing this request did is asked for again after these, each up to as long again. Each person
// has their own preview of a room's document, so that's one of their other tabs, or someone else's identical preview it
// was waiting on that its owner replaced. Replaced after the last one too, it's failed
const SUPERSEDED_RETRY_DELAYS = [1000, 2000];
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
// a save that failed for a passing reason (the network, a 429, the api down) is tried again after these, then it stays
// failed until the next edit or Try again
const SAVE_RETRY_DELAYS = [1000, 2500, 5000, 10000, 20000];
// someone else's render locks the stack at most this long: its end can be lost (they closed Discord mid-render)
const RENDER_LOCK_LIMIT = 5 * 60 * 1000;


export type SaveState = 'saved' | 'saving' | 'error';
export type PreviewState = 'idle' | 'updating' | 'preparing' | 'busy' | 'failed';

export interface StepError {
  index: number | null,
  message: string,
}

// one undo step: the stack on either side of it (what undo and redo show outside a room, where nobody else changes it)
// and what it did (what a room undoes and redoes on the stack as it is now, ./stack `StackChange`)
interface HistoryEntry {
  before: Array<EditorStep>,
  after: Array<EditorStep>,
  change: StackChange,
}

type DonePreview = Extract<EditorPreview, {status: 'done'}>;


// the same steps with the same settings, in the same order (as json: a stack the api wrote differently isn't "the same")
function sameSteps(a: Array<EditorStep>, b: Array<EditorStep>): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}


// the step a room op changes, null when it's the whole stack
function opStepId(op: RoomOp): string | null {
  switch (op.op) {
    case 'add':
      return op.step.id;
    case 'replace':
      return null;
    default:
      return op.step_id;
  }
}


// whether `after` is `before` with nothing but those steps changed, added, removed or moved (null: any step may be)
function onlyStepsChanged(before: Array<EditorStep>, after: Array<EditorStep>, stepIds: Set<string> | null): boolean {
  if (!stepIds) {
    return true;
  }
  const others = (steps: Array<EditorStep>) => steps.filter((step) => !stepIds.has(step.id));
  return sameSteps(others(before), others(after));
}


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
  // `reload` (Retry after a `loadError`) counts it up, the load runs again
  const [ loadAttempt, setLoadAttempt ] = useState(0);
  const [ steps, setSteps ] = useState<Array<EditorStep>>([]);
  // undo/redo stacks live in a ref (updaters must stay pure), `historyVersion` re-renders when they change
  const historyRef = useRef<{past: Array<HistoryEntry>, future: Array<HistoryEntry>}>({past: [], future: []});
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
  // a failed save's next try, and how many there were since the last one that worked
  const saveRetryTimerRef = useRef<number | null>(null);
  const saveRetriesRef = useRef(0);
  // the last http save failed and nothing has replaced it yet: for a passing reason (tried again by itself) or refused
  const saveFailedRef = useRef<'passing' | 'refused' | null>(null);
  // The version an http save says its steps were made from, while one is owed (`httpOwed`): the document's as the first
  // of those edits was made, then each save's own answer. null with nothing owed, a save then goes by the document's.
  // Not simply the document's: in a room that keeps moving with what the others do, and a save sent with their version
  // would write this stack over their change. Sent with the older one it's refused as out of date instead, and the
  // stack is reloaded with its notice
  const baseVersionRef = useRef<number | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  // the editor's gone (or its document is being loaded again): nothing asks for a preview or takes a document after
  const disposedRef = useRef(false);

  // ---- the activity's room (host.room), null on the web ----
  const room = host.room ?? null;
  const [ members, setMembers ] = useState<Array<RoomMember>>(room?.members ?? []);
  const [ locks, setLocks ] = useState<Record<string, string>>(room?.locks ?? {});
  // someone else is rendering, the stack is locked for everyone until it ends
  const [ rendering, setRendering ] = useState<string | null>(null);
  const renderingRef = useRef<string | null>(null);
  renderingRef.current = rendering;
  // a watch-only room's watchers: everyone but its creator. Their changes go nowhere (the api refuses them anyway)
  const watching = Boolean(room && document?.watch_only && room.you && document.user_id !== room.you);
  const watchingRef = useRef(watching);
  watchingRef.current = watching;
  // why nothing they do changes the stack right now, null when it does: they only watch, or someone else's render has
  // it locked (the api doesn't refuse an op for a render, so it's stopped here)
  const editLock: 'watching' | 'rendering' | null = (watching) ? 'watching' : (rendering) ? 'rendering' : null;
  const editLockRef = useRef(editLock);
  editLockRef.current = editLock;
  // ops sent and not yet seen back, the room's documents don't replace the stack until they're all in. By op id, with
  // the step each one changes (null: the whole stack, a `replace`)
  const pendingOpsRef = useRef(new Map<string, string | null>());
  // The ops that were still unanswered when the socket last went down: each may have been applied (one version each)
  // with its answer lost. `count` of them, on `steps` (null: any step), made on the stack `base` (the last one the room
  // sent). An http save that's then refused as out of date is behind by these, not by someone else's change, when the
  // api is ahead by no more versions than `count` and nothing but `steps` differs from `base` (`save`). null again once
  // a save is in, the stack is reloaded or the room settles
  const inDoubtRef = useRef<{count: number, steps: Set<string> | null, base: Array<EditorStep>} | null>(null);
  // an undo's or redo's ops still on their way, by op id: one the room refuses because its step is gone takes its
  // history entry with it, quietly
  const historyOpsRef = useRef(new Map<string, HistoryEntry>());
  // dragged params waiting to go out (the latest value per step and param, in the order they first changed), and the
  // timer that spaces them
  const paramQueueRef = useRef(new Map<string, {stepId: string, name: string, value: unknown}>());
  const paramTimerRef = useRef<number | null>(null);
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

  // `superseded`: how many times in a row this preview was asked for again because someone else's replaced it
  // (SUPERSEDED_RETRY_DELAYS), 0 for a new request
  const requestPreview = useCallback(async (superseded: number) => {
    const current = documentRef.current;
    if (!current || disposedRef.current) {
      return;
    }
    // (a request waiting to be asked again after it was replaced is one of these too: a newer one ends its wait)
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
        // the document's small copy as the api has it now: made during this request for a new document (or new media),
        // the scrubber and the unedited preview read it. It used to take a fetch of the whole document to find out
        const known = documentRef.current;
        if (result.proxy && known && known.id === current.id && known.proxy?.url !== result.proxy.url) {
          documentRef.current = {...known, proxy: result.proxy, proxy_status: 'ready'};
          setDocument(documentRef.current);
        }
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
          // a newer one replaced it. Ours: it aborted this request, the newer one shows
          if (signal.aborted) {
            return;
          }
          // Not ours: another tab of theirs, or the room member whose identical preview this one waited on (the api runs
          // it once for everyone who asks) moved on and replaced it. Another member's own preview never replaces
          // ours. Nothing shows it here, and saying "up to date" over the old picture was wrong. Asked for again in a
          // moment, and failed (with its Try again) when that keeps being replaced too
          if (SUPERSEDED_RETRY_DELAYS.length <= superseded) {
            setPreviewState('failed');
            setPreviewError(null);
            return;
          }
          await sleep(SUPERSEDED_RETRY_DELAYS[superseded] * (1 + Math.random()), signal);
          void requestPreview(superseded + 1);
          return;
        }
        if (result.status === 'preparing') {
          // (a copy that couldn't be made comes back as `failed` with why)
          setPreviewState('preparing');
          await sleep(PROXY_POLL, signal);
          result = await api.preview(current.id, {mode: requestMode, frame: requestFrame, upto: requestUpto ?? undefined}, signal);
          continue;
        }
        // pending
        const previewId = result.preview_id;
        if (!previewId) {
          // nothing to ask about again: failed, not "updating" for good
          setPreviewState('failed');
          setPreviewError(null);
          return;
        }
        const asked = Date.now();
        result = await api.previewStatus(current.id, previewId, signal);
        const left = PREVIEW_POLL - (Date.now() - asked);
        if (result.status === 'pending' && 0 < left) {
          await sleep(left, signal);
        }
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
        void requestPreview(0);
        return;
      }
      setPreviewState('failed');
      setPreviewError(apiError?.message ?? null);
    }
  }, [api, host]);

  // a preview of the stack as the api has it now, in place of whichever one was on its way
  const runPreview = useCallback(() => requestPreview(0), [requestPreview]);

  // ---- saving ----

  // Something on screen still has to reach the api over http: a save waiting out its delay, on its way, asked for again
  // meanwhile, waiting for its next try, or failed. In a room, until it's in: edits keep going over http and the room's
  // stack isn't taken (`commit`, `settleRoom`). (A watcher owes nothing, nothing of theirs can be saved)
  const httpOwed = useCallback((): boolean => !watchingRef.current && (
    saveTimerRef.current !== null
    || savingRef.current
    || dirtyRef.current
    || saveRetryTimerRef.current !== null
    || saveFailedRef.current !== null
  ), []);

  // In a room: its stack is what's shown, and that's "saved", once nothing of ours is still on its way: no op waiting
  // for its answer, no dragged param waiting for its turn, nothing owed over http. The one place that decides it (each
  // caller used to have its own version of this, not all the same)
  const settleRoom = useCallback(() => {
    const current = documentRef.current;
    if (!current || pendingOpsRef.current.size || paramTimerRef.current !== null || httpOwed()) {
      return;
    }
    // (only a watcher gets here with these still set: a save of theirs that failed is over with)
    saveFailedRef.current = null;
    baseVersionRef.current = null;
    inDoubtRef.current = null;
    stepsRef.current = current.steps;
    setSteps(current.steps);
    setSaveState('saved');
  }, [httpOwed]);

  // The api's stack takes the place of what's on screen, with the "changed somewhere else" notice: what wasn't saved is
  // given up, nothing is owed anymore
  const reloadStack = useCallback((head: EditorDocument) => {
    documentRef.current = head;
    stepsRef.current = head.steps;
    setDocument(head);
    setSteps(head.steps);
    setReloaded(true);
    // (the save that failed before it is over with, its message isn't left beside the notice)
    setStepError(null);
    setSaveState('saved');
    dirtyRef.current = false;
    saveFailedRef.current = null;
    baseVersionRef.current = null;
    inDoubtRef.current = null;
  }, []);

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
    saveFailedRef.current = null;
    if (saveRetryTimerRef.current !== null) {
      window.clearTimeout(saveRetryTimerRef.current);
      saveRetryTimerRef.current = null;
    }
    setSaveState('saving');
    const sent = stepsRef.current;
    // an http answer, unless the room already sent a later version of the document while it was on its way
    const newest = (answer: EditorDocument): EditorDocument => {
      const known = documentRef.current;
      return (known && known.id === answer.id && answer.version < known.version) ? known : answer;
    };
    const version = baseVersionRef.current ?? current.version;
    let saved: EditorDocument;
    try {
      saved = await api.saveSteps(current.id, sent, version);
    } catch (error) {
      const apiError = host.errorOf(error);
      // refused as out of date: the stack as the api has it now (null when that can't be fetched either)
      const outdated = apiError?.code === EditorErrorCodes.EDITOR_DOCUMENT_VERSION_MISMATCH;
      const latest = (outdated) ? await api.document(current.id).catch(() => null) : null;
      if (latest && !sameSteps(latest.steps, sent)) {
        const ahead = latest.version - version;
        const doubt = inDoubtRef.current;
        if (doubt && 0 < ahead && ahead <= doubt.count && onlyStepsChanged(doubt.base, latest.steps, doubt.steps)) {
          // The api is ahead by no more than our own ops that were unanswered when the socket went down (a version
          // each), and only in the steps those were about: they were applied, only their answers were lost. Nothing
          // changed elsewhere, and this stack was made on top of them: it's sent again from where the api is now. No
          // reload, no notice (a drag that went on through a dropped socket lost everything since the drop here).
          // Once: a save that's out of date again after it is someone else's change
          inDoubtRef.current = null;
          baseVersionRef.current = latest.version;
          const head = newest(latest);
          documentRef.current = head;
          setDocument(head);
          savingRef.current = false;
          void save();
          return;
        }
        // changed elsewhere: take the server's and say so, the edit since is lost (rare on the web, one tab each)
        savingRef.current = false;
        reloadStack(newest(latest));
        // what's shown is the server's stack now, its preview too (the old one still had the dropped edit)
        void runPreview();
        return;
      }
      if (!latest) {
        const invalid = apiError?.code === EditorErrorCodes.EDITOR_INVALID_STEP;
        if (invalid) {
          const index = apiError.body?.index;
          setStepError({index: (typeof index === 'number') ? index : null, message: apiError.message});
        } else {
          setStepError({index: null, message: apiError?.message ?? ''});
        }
        setSaveState('error');
        savingRef.current = false;
        // A passing failure is tried again, a refusal (a bad step, not allowed, gone) isn't. Passing too: a step
        // someone else is adjusting (theirs for a few seconds), and an out-of-date answer whose fresh stack couldn't
        // be fetched (it used to say "saved" there, with nothing saved)
        const passing = !invalid && (
          !apiError
          || apiError.status === 0
          || apiError.status === 429
          || 500 <= apiError.status
          || apiError.code === EditorErrorCodes.EDITOR_STEP_LOCKED
          || outdated
        );
        saveFailedRef.current = (passing) ? 'passing' : 'refused';
        if (dirtyRef.current) {
          // edited while it was failing: those go out now (they may be what fixes a refused step), the save used to
          // stop here and never send them
          void save();
          return;
        }
        if (passing && saveRetriesRef.current < SAVE_RETRY_DELAYS.length) {
          const delay = SAVE_RETRY_DELAYS[saveRetriesRef.current];
          saveRetriesRef.current += 1;
          saveRetryTimerRef.current = window.setTimeout(() => {
            saveRetryTimerRef.current = null;
            void save();
          }, delay);
        }
        return;
      }
      // Out of date, but the api has exactly these steps already: they went through the room and only its answers
      // were lost with the socket. Nothing changed elsewhere and nothing is reloaded, it's as good as saved (it used to
      // show "changed somewhere else" for this)
      saved = latest;
    }
    saveRetriesRef.current = 0;
    savingRef.current = false;
    inDoubtRef.current = null;
    // anything still owed (an edit made while this was on its way) was made on top of what's now saved
    baseVersionRef.current = (dirtyRef.current || saveTimerRef.current !== null) ? saved.version : null;
    const head = newest(saved);
    documentRef.current = head;
    setDocument(head);
    setStepError(null);
    setSaveState('saved');
    if (dirtyRef.current) {
      void save();
      return;
    }
    if (head !== saved) {
      // a later document the room sent while this was owed waited for it (it has what was just saved, versions go in
      // order). Otherwise the stack on screen stays as it is, a save's answer never replaces it
      settleRoom();
    }
    void runPreview();
  }, [api, host, reloadStack, runPreview, settleRoom]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    // the first edit of the ones this will save: the version they're made from (`baseVersionRef`)
    if (baseVersionRef.current === null && documentRef.current) {
      baseVersionRef.current = documentRef.current.version;
    }
    // a new edit starts the tries over, its own save replaces a waiting retry
    saveRetriesRef.current = 0;
    if (saveRetryTimerRef.current !== null) {
      window.clearTimeout(saveRetryTimerRef.current);
      saveRetryTimerRef.current = null;
    }
    setSaveState('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void save();
    }, SAVE_DELAY);
  }, [save]);

  // Try again beside a failed save
  const retrySave = useCallback(() => {
    saveRetriesRef.current = 0;
    void save();
  }, [save]);

  // ---- loading ----

  useEffect(() => {
    const controller = new AbortController();
    disposedRef.current = false;
    setDocument(null);
    setLoadError(null);
    setPreview(null);
    historyRef.current = {past: [], future: []};
    setHistoryVersion((value) => value + 1);
    setSelectedId(null);
    (async () => {
      try {
        const loaded = await api.document(documentId, controller.signal);
        const known = documentRef.current;
        if (known?.id === loaded.id && loaded.version < known.version) {
          // the room already sent a newer one while this was on its way (someone was editing as they joined)
          setDocument(known);
          setSteps(stepsRef.current);
        } else {
          documentRef.current = loaded;
          stepsRef.current = loaded.steps;
          setDocument(loaded);
          setSteps(loaded.steps);
        }
        void runPreview();
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(host.errorOf(error) ?? {status: 0, code: null, message: '', body: null});
        }
      }
    })();
    return () => {
      controller.abort();
      // no preview is asked for from here on: a scrub's wait, a save still on its way or a document the room was asked
      // for used to start one after the editor was gone, polled to its end for nobody
      disposedRef.current = true;
      previewAbortRef.current?.abort();
      if (frameTimerRef.current !== null) {
        window.clearTimeout(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      const unsaved = saveTimerRef.current !== null || saveRetryTimerRef.current !== null;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (saveRetryTimerRef.current !== null) {
        window.clearTimeout(saveRetryTimerRef.current);
        saveRetryTimerRef.current = null;
      }
      const leaving = documentRef.current;
      if (unsaved && leaving && leaving.id === documentId) {
        // left inside the save's wait (a change, then New or Back right away): it's sent now, the edit used to be gone
        // when the document was opened again
        api.saveSteps(leaving.id, stepsRef.current, baseVersionRef.current ?? leaving.version).catch(() => undefined);
      }
    };
  }, [api, documentId, host, loadAttempt, runPreview]);

  // the load again, after a `loadError` (its Retry)
  const reload = useCallback(() => setLoadAttempt((value) => value + 1), []);

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

  // the op's id, null when it wasn't sent (the socket isn't open)
  const sendOp = useCallback((op: RoomOp): string | null => {
    if (!room?.isOpen) {
      return null;
    }
    const id = room.sendOp(op);
    pendingOpsRef.current.set(id, opStepId(op));
    // the render (and "saved") waits until the room has every op from here
    setSaveState('saving');
    // (an op the room refused before this one has had its say: in a quiet room its message stayed until someone edited)
    setStepError(null);
    return id;
  }, [room]);

  useEffect(() => {
    // made watch-only while they had a step open: its settings and handles go
    if (watching) {
      setSelectedId(null);
    }
  }, [watching]);

  // a dragged param goes out at most every ROOM_PARAM_INTERVAL (the last value always), and its step is soft-locked
  // while it moves so nobody else changes it at the same time
  // the spacing timer: the next waiting param goes out and the wait starts over, with none waiting it's done
  const flushParams = useCallback(function flush() {
    paramTimerRef.current = null;
    const next = paramQueueRef.current.entries().next();
    if (next.done) {
      // nothing more to send: a document of the room's that waited on this timer is taken now
      settleRoom();
      return;
    }
    if (!room?.isOpen) {
      // the socket went meanwhile: what's waiting goes with the http save its status change starts
      return;
    }
    const [ key, entry ] = next.value;
    paramQueueRef.current.delete(key);
    sendOp({op: 'set_param', step_id: entry.stepId, name: entry.name, value: entry.value});
    paramTimerRef.current = window.setTimeout(flush, ROOM_PARAM_INTERVAL);
  }, [room, sendOp, settleRoom]);

  // `hold`: false leaves the step's soft lock alone (one finished change, a drawn stroke: nothing's being dragged)
  const sendParam = useCallback((stepId: string, name: string, value: unknown, hold: boolean = true) => {
    if (editLockRef.current) {
      return;
    }
    if (!room?.isOpen) {
      return;
    }
    // one `set_param` every ROOM_PARAM_INTERVAL for the whole socket, whatever's being dragged: the api takes 10 changes
    // a second, and a text box's corner moves two params at once. (Each param used to have its own timer, and a waiting
    // value went out right before the next move's: about 15 a second for a slider, 30 for a corner, refused after a few
    // seconds of dragging)
    // (Not while an http save is owed: `commit` put this change in that save, the whole stack goes with it. The step is
    // still held below, they're dragging it all the same)
    const key = `${stepId}:${name}`;
    if (!httpOwed()) {
      if (paramTimerRef.current !== null) {
        const waiting = paramQueueRef.current.get(key);
        if (waiting) {
          waiting.value = value;
        } else {
          paramQueueRef.current.set(key, {stepId, name, value});
        }
      } else {
        sendOp({op: 'set_param', step_id: stepId, name, value});
        paramTimerRef.current = window.setTimeout(flushParams, ROOM_PARAM_INTERVAL);
      }
    }
    if (!hold) {
      return;
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
  }, [flushParams, httpOwed, room, sendOp]);

  // `change`: what this did, for undo (`HistoryEntry`). `op`: the same thing for the room
  const commit = useCallback((next: Array<EditorStep>, change: StackChange, coalesceKey?: string, op?: RoomOp) => {
    if (editLockRef.current) {
      return;
    }
    const now = Date.now();
    const last = lastHistoryRef.current;
    const { past } = historyRef.current;
    const previous = past[past.length - 1];
    const coalesce = Boolean(coalesceKey && last && last.key === coalesceKey && now - last.at < COALESCE_WINDOW);
    if (coalesce && previous) {
      // more of the same drag: the entry it started keeps where it began and ends where this one does
      const merged: StackChange = (previous.change.kind === 'params' && change.kind === 'params')
        ? {...previous.change, after: {...previous.change.after, ...change.after}}
        : previous.change;
      historyRef.current = {past: [...past.slice(0, -1), {before: previous.before, after: next, change: merged}], future: []};
    } else {
      historyRef.current = {past: [...past, {before: stepsRef.current, after: next, change}].slice(-MAX_HISTORY), future: []};
      setHistoryVersion((value) => value + 1);
    }
    lastHistoryRef.current = (coalesceKey) ? {key: coalesceKey, at: now} : null;
    stepsRef.current = next;
    setSteps(next);
    setReloaded(false);
    // in an activity the room applies it, while its socket isn't open (connecting, nginx refusing the upgrade) it's
    // saved over http like the web, which the api announces to the room too. And for as long as an http save is still
    // owed after the socket's back (`httpOwed`): an op is only this one change, the room would answer with a stack
    // that has it and none of what that save was still to bring
    if (room?.isOpen && !httpOwed()) {
      // set_param goes through `sendParam` (throttled), everything else at once
      if (op && op.op !== 'set_param') {
        sendOp(op);
      }
      return;
    }
    scheduleSave();
  }, [httpOwed, room, scheduleSave, sendOp]);

  // Undo and redo. Outside a room nobody else touches the stack, the one on the other side of the entry is put back
  // whole. In a room the entry's change (or its opposite) is applied to the stack as it is now and sent as ordinary ops,
  // so the others' changes since stay in place and this history lives through them. One that no longer applies (its
  // step was removed by someone, say) is dropped and the one before it is tried
  const travel = useCallback((direction: 'undo' | 'redo') => {
    // not while someone's render has the stack locked: the fields are off then, the shortcut and the buttons were not
    if (watchingRef.current || renderingRef.current) {
      return;
    }
    const undoing = direction === 'undo';
    const { past, future } = historyRef.current;
    const show = (next: Array<EditorStep>) => {
      stepsRef.current = next;
      setSteps(next);
      lastHistoryRef.current = null;
      setHistoryVersion((value) => value + 1);
    };

    if (!room) {
      const entry = (undoing) ? past[past.length - 1] : future[0];
      if (!entry) {
        return;
      }
      historyRef.current = (undoing)
        ? {past: past.slice(0, -1), future: [entry, ...future].slice(0, MAX_HISTORY)}
        : {past: [...past, entry].slice(-MAX_HISTORY), future: future.slice(1)};
      show((undoing) ? entry.before : entry.after);
      scheduleSave();
      return;
    }

    // the entries still to try, nearest first
    const waiting = (undoing) ? [...past].reverse() : [...future];
    if (!waiting.length) {
      return;
    }
    // a dragged setting's last value still waiting for its turn goes out first, or it would land after the undo
    if (room.isOpen) {
      for (const queued of paramQueueRef.current.values()) {
        sendOp({op: 'set_param', step_id: queued.stepId, name: queued.name, value: queued.value});
      }
      paramQueueRef.current.clear();
    }
    let applied: ReturnType<typeof applyStackChange> = null;
    let entry: HistoryEntry | undefined;
    while (waiting.length) {
      entry = waiting[0];
      const stepId = changedStepId(entry.change);
      const holder = (stepId) ? room.locks[stepId] : undefined;
      if (holder && holder !== room.you) {
        // someone's moving that step right now: it waits, the entry stays for the next try
        entry = undefined;
        break;
      }
      waiting.shift();
      applied = applyStackChange(stepsRef.current, entry.change, direction);
      if (applied) {
        break;
      }
      entry = undefined;
    }
    const rest = (undoing) ? [...waiting].reverse() : waiting;
    if (!applied || !entry) {
      // nothing to do (or only entries that no longer apply, gone now)
      historyRef.current = (undoing) ? {past: rest, future} : {past, future: rest};
      setHistoryVersion((value) => value + 1);
      return;
    }
    historyRef.current = (undoing)
      ? {past: rest, future: [entry, ...future].slice(0, MAX_HISTORY)}
      : {past: [...past, entry].slice(-MAX_HISTORY), future: rest};
    show(applied.steps);
    setReloaded(false);
    if (!room.isOpen || httpOwed()) {
      // the socket's down (or an http save is still owed, see `commit`): saved over http like any other change meanwhile
      scheduleSave();
      return;
    }
    for (const op of applied.ops) {
      const id = sendOp(op);
      if (id) {
        historyOpsRef.current.set(id, entry);
      }
    }
  }, [httpOwed, room, scheduleSave, sendOp]);

  const undo = useCallback(() => travel('undo'), [travel]);
  const redo = useCallback(() => travel('redo'), [travel]);

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
  // false when nothing was replaced: they only watch, or someone's render has the stack locked (`editLock`)
  const replaceSteps = useCallback((next: Array<EditorStep>): boolean => {
    if (editLockRef.current) {
      return false;
    }
    commit(next, {kind: 'replace', before: stepsRef.current, after: next}, undefined, {op: 'replace', steps: next});
    setSelectedId(null);
    return true;
  }, [commit]);

  // template inputs: which params each step asks people for (param -> question), the whole stack in one change
  const setStepInputs = useCallback((inputs: Record<string, Record<string, string> | undefined>) => {
    const next = stepsRef.current.map((step) => {
      if (!(step.id in inputs)) {
        return step;
      }
      const { inputs: _, ...rest } = step;
      const asked = inputs[step.id];
      return (asked && Object.keys(asked).length) ? {...rest, inputs: asked} : rest;
    });
    commit(next, {kind: 'replace', before: stepsRef.current, after: next}, undefined, {op: 'replace', steps: next});
  }, [commit]);

  const addStep = useCallback((step: EditorStep) => {
    commit([...stepsRef.current, step], {kind: 'add', step, index: stepsRef.current.length}, undefined, {op: 'add', step});
    setSelectedId(step.id);
  }, [commit]);

  const removeStep = useCallback((stepId: string) => {
    const index = stepsRef.current.findIndex((step) => step.id === stepId);
    if (index === -1) {
      return;
    }
    commit(
      stepsRef.current.filter((step) => step.id !== stepId),
      {kind: 'remove', step: stepsRef.current[index], index},
      undefined,
      {op: 'remove', step_id: stepId},
    );
    setSelectedId((current) => (current === stepId) ? null : current);
  }, [commit]);

  const toggleStep = useCallback((stepId: string) => {
    const hidden = !stepsRef.current.find((step) => step.id === stepId)?.hidden;
    commit(
      stepsRef.current.map((step) => (step.id === stepId) ? {...step, hidden} : step),
      {kind: 'toggle', stepId, before: !hidden, after: hidden},
      undefined,
      {op: 'toggle', step_id: stepId, hidden},
    );
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
    commit(items, {kind: 'move', stepId, from, to: target}, undefined, {op: 'move', step_id: stepId, to: target});
  }, [commit]);

  // `lock: false`: the change is whole as it is (a finished stroke), the step isn't held for the others after it
  const setParam = useCallback((stepId: string, name: string, value: unknown, options?: {lock?: boolean}) => {
    const before = stepsRef.current.find((step) => step.id === stepId)?.params[name];
    commit(
      stepsRef.current.map((step) => (step.id === stepId) ? {...step, params: {...step.params, [name]: value}} : step),
      {kind: 'params', stepId, before: {[name]: before}, after: {[name]: value}},
      `${stepId}:${name}`,
      {op: 'set_param', step_id: stepId, name, value},
    );
    sendParam(stepId, name, value, options?.lock !== false);
  }, [commit, sendParam]);

  // several of a step's params from one gesture (a text box's corner is its width and its letters' size): one change,
  // so a drag is one undo step. One at a time, each move pushed two (the two names never matched the one before)
  const setParams = useCallback((stepId: string, values: Record<string, unknown>) => {
    const names = Object.keys(values).sort();
    if (!names.length) {
      return;
    }
    const params = stepsRef.current.find((step) => step.id === stepId)?.params ?? {};
    commit(
      stepsRef.current.map((step) => (step.id === stepId) ? {...step, params: {...step.params, ...values}} : step),
      {kind: 'params', stepId, before: Object.fromEntries(names.map((name) => [name, params[name]])), after: {...values}},
      `${stepId}:${names.join('+')}`,
      {op: 'set_param', step_id: stepId, name: names[0], value: values[names[0]]},
    );
    for (const name of names) {
      sendParam(stepId, name, values[name]);
    }
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
      // the picture is behind from now, not only once it's asked for (it read "up to date" for the wait)
      setPreviewState('updating');
      roomPreviewTimerRef.current = window.setTimeout(() => {
        roomPreviewTimerRef.current = null;
        void runPreview();
      }, ROOM_PREVIEW_DELAY);
    };
    const takeDocument = (next: EditorDocument) => {
      // (one that was asked for can come back after the editor's gone)
      if (disposedRef.current || next.id !== documentId) {
        return;
      }
      // a change made while joining can come again after `ready`, an older or the same version is already here
      if (documentRef.current?.id === next.id && next.version <= documentRef.current.version) {
        return;
      }
      // (someone else's change leaves this one's history alone: undo and redo go by what each entry did, on the stack
      // as it is by then)
      if (documentRef.current && documentRef.current.source.id !== next.source.id) {
        // someone replaced the media: the old one's preview and frame mean nothing now
        resetForSource();
      }
      if (saveFailedRef.current === 'refused' && saveTimerRef.current === null && !watchingRef.current) {
        // A save the api refused for good (a bad step, not allowed), with nothing done about it since: it would stay
        // owed, and the room's stack unseen under a preview that already shows it, until they did something. The room
        // has moved on, its stack is taken like any other change made elsewhere, with the notice. (One that's being
        // tried again, or edited since, still goes out and is settled by its own answer)
        reloadStack(next);
        previewSoon();
        return;
      }
      documentRef.current = next;
      setDocument(next);
      // Its stack is shown once nothing of ours is still on its way: our own ops would be undone by this older stack
      // (the last one's document has them all), and an http save that's still owed would lose what it's to bring
      settleRoom();
      previewSoon();
    };
    const unsubscribeStatus = room.onStatus((status) => {
      if (status === 'open') {
        // The socket's back, so most likely the api is too: a save waiting for its next try (or out of them) goes now.
        // Edits keep going over http until it's in (`httpOwed`)
        if (!watchingRef.current && (saveRetryTimerRef.current !== null || saveFailedRef.current === 'passing')) {
          saveRetriesRef.current = 0;
          void save();
        }
        return;
      }
      // whoever was rendering can't say it ended over a socket that's down
      setRendering(null);
      // nor can who holds which step be heard of (the room dropped them too): none are shown as held until `editing`'s
      // answer on the next socket. A step someone was dragging as it went down stayed "X is adjusting this" until then
      setLocks((current) => (Object.keys(current).length) ? {} : current);
      // our own holds went with the socket: a drag still going takes its step again with its next move on the new one
      // (after a short drop it counted as held here for up to ROOM_LOCK_RENEW, with nothing held on the api)
      for (const { release } of lockTimersRef.current.values()) {
        window.clearTimeout(release);
      }
      lockTimersRef.current.clear();
      const unanswered = [...pendingOpsRef.current.values()];
      const unsent = unanswered.length > 0 || paramQueueRef.current.size > 0;
      pendingOpsRef.current.clear();
      historyOpsRef.current.clear();
      paramQueueRef.current.clear();
      if (paramTimerRef.current !== null) {
        window.clearTimeout(paramTimerRef.current);
        paramTimerRef.current = null;
      }
      if (unsent && !watchingRef.current) {
        // ops in flight (or still waiting to go) may be lost with the socket, and what's shown has them: the whole
        // stack goes over http instead, like every edit while the socket's down. It used to say "saved" here while the
        // preview and the render used the room's stack without the edit. If the room did get them, the save is
        // refused as out of date: when the api is only ahead by those ops it's sent again from the api's version
        // (`inDoubtRef`), otherwise the room's stack is taken
        if (unanswered.length && documentRef.current) {
          inDoubtRef.current = {
            count: unanswered.length,
            steps: (unanswered.includes(null)) ? null : new Set(unanswered.filter((stepId) => stepId !== null)),
            base: documentRef.current.steps,
          };
        }
        scheduleSave();
      } else {
        // nothing to send (or a watcher, whose changes go nowhere): what's shown is the room's stack again. A document
        // that was waiting on the param timer cleared above is taken here, a watcher's "saving" ends
        settleRoom();
      }
    });
    const unsubscribe = room.subscribe((event) => {
      switch (event.t) {
        case 'ready': {
          setMembers(event.members);
          // a new socket is in no lobby yet: the lobby's locks come with `editing`'s answer
          setLocks({});
          // a render that ended while the socket was down never said so here
          setRendering(null);
          // a reconnect: what changed while the socket was down (the room only sends lobbies, not documents)
          void api.document(documentId).then((latest) => takeDocument(latest)).catch(() => undefined);
          break;
        }
        case 'document': {
          if (event.op_id) {
            pendingOpsRef.current.delete(event.op_id);
            historyOpsRef.current.delete(event.op_id);
          }
          takeDocument(event.document);
          // also when it wasn't taken (a version already here, fetched a moment before): its op is answered all the
          // same, and "saving" used to stay up with nothing left to wait for
          settleRoom();
          // (an http save's error stays until that save is in)
          if (!httpOwed()) {
            setStepError(null);
          }
          break;
        }
        case 'error': {
          // Only an op of ours that's still waiting for its answer. The api also says `error` with no op id (a lock, a
          // cursor, a message it couldn't read): none of those changed the stack, and taken for a refused op they put
          // the stack back and said "saved"
          const opId = event.op_id;
          if (!opId || !pendingOpsRef.current.delete(opId)) {
            break;
          }
          const undone = historyOpsRef.current.get(opId);
          historyOpsRef.current.delete(opId);
          if (undone && event.code === EditorErrorCodes.UNKNOWN_EDITOR_STEP) {
            // an undo or redo whose step someone removed a moment before: there's nothing to undo anymore, the entry
            // goes and nothing is said
            const { past, future } = historyRef.current;
            historyRef.current = {past: past.filter((entry) => entry !== undone), future: future.filter((entry) => entry !== undone)};
            setHistoryVersion((value) => value + 1);
          } else {
            setStepError({index: (typeof event.index === 'number') ? event.index : null, message: event.message});
          }
          // a refused op (its step's gone, a bad value): back to what the room has, once nothing else is on its way
          settleRoom();
          break;
        }
        case 'members':
          setMembers(event.members);
          break;
        case 'lobby_updated':
          // its name and lock, the steps and version are untouched
          if (event.document_id === documentId && documentRef.current) {
            const next = {...documentRef.current, lobby_name: event.name, locked: event.locked, watch_only: Boolean(event.watch_only)};
            documentRef.current = next;
            setDocument(next);
          }
          break;
        case 'lobby_edited':
          // this document changed while the join was still on its way (the api sends the document itself only to the
          // lobby's editors, this socket wasn't one yet): asked for
          if (event.document_id === documentId && (documentRef.current?.version ?? -1) < event.version) {
            void api.document(documentId).then((latest) => takeDocument(latest)).catch(() => undefined);
          }
          break;
        case 'editing':
        case 'lock':
        case 'unlock':
          setLocks({...room.locks});
          break;
        case 'render':
          if (event.user_id === room.you) {
            break;
          }
          if (event.status === 'started') {
            // another lobby's renders don't lock this one
            if (event.document_id === documentId) {
              setRendering(event.user_id);
            }
          } else if (!event.document_id || event.document_id === documentId) {
            // only whoever holds it lets go of it (an end said after they left the lobby carries no document)
            setRendering((current) => (current === event.user_id) ? null : current);
          }
          break;
        case 'cursor':
        case 'kicked':
        case 'lobby_closed':
        case 'lobby_deleted':
        case 'moderated':
        case 'game_rooms_changed':
        case 'pong':
          // not the document's: the others' pointers (./components/RoomCursors), being taken out of the room (the
          // host), the answers to moderation, the games
          break;
        default:
          // Every `RoomEvent` is named above: a new one doesn't compile until it's given a case here. Only checked when
          // it's built, a message this build doesn't know is ignored like before
          event satisfies never;
          break;
      }
    });
    return () => {
      unsubscribe();
      unsubscribeStatus();
      if (roomPreviewTimerRef.current !== null) {
        window.clearTimeout(roomPreviewTimerRef.current);
        roomPreviewTimerRef.current = null;
      }
      if (paramTimerRef.current !== null) {
        window.clearTimeout(paramTimerRef.current);
        paramTimerRef.current = null;
      }
      // a drag's last value still waiting for its turn goes out now (leaving right after letting go)
      if (room.isOpen && !watchingRef.current) {
        for (const entry of paramQueueRef.current.values()) {
          room.sendOp({op: 'set_param', step_id: entry.stepId, name: entry.name, value: entry.value});
        }
      }
      paramQueueRef.current.clear();
      for (const [ stepId, { release } ] of lockTimersRef.current) {
        window.clearTimeout(release);
        room.unlock(stepId);
      }
      lockTimersRef.current.clear();
    };
  }, [api, documentId, httpOwed, room, runPreview, save, scheduleSave, settleRoom]);

  // who else holds a step's soft lock (they're dragging it), null when it's free or it's ours
  // Resolves once every edit is saved (true), or the save failed or took too long (false). The render waits on it, so
  // its button doesn't have to be turned off while each stroke or slider move saves
  // a new source (Replace media): back to its first frame, the old preview goes
  const resetForSource = useCallback(() => {
    setPreview(null);
    setFrame(0);
    requestRef.current = {...requestRef.current, frame: 0};
  }, []);

  const whenSaved = useCallback(async (): Promise<boolean> => {
    const deadline = Date.now() + SAVE_WAIT_LIMIT;
    while (Date.now() < deadline) {
      // the state only catches up on the next render: a change made just now has its save timer, its http save or
      // its room ops pending already
      const pending = saveTimerRef.current !== null || savingRef.current || pendingOpsRef.current.size > 0 || paramTimerRef.current !== null;
      if (saveStateRef.current === 'saved' && !pending) {
        return true;
      }
      // failed for good: a save being tried again is still waited for
      if (saveStateRef.current === 'error' && !pending && saveRetryTimerRef.current === null) {
        return false;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return false;
  }, []);

  // Replace media: once every edit has saved, a new file under the same steps (the api refuses it when one of them
  // can't run on it, with that step's index)
  const replaceSource = useCallback(async (input: {file?: File, url?: string}): Promise<void> => {
    const current = documentRef.current;
    if (!current || watchingRef.current) {
      return;
    }
    if (!await whenSaved()) {
      throw new Error('unsaved');
    }
    const next = await api.replaceSource(current.id, input, documentRef.current!.version);
    resetForSource();
    documentRef.current = next;
    stepsRef.current = next.steps;
    // (a save scheduled while the file was on its way goes by this document's version, not the one before it)
    baseVersionRef.current = null;
    setDocument(next);
    setSteps(next.steps);
    setStepError(null);
    void runPreview();
  }, [api, resetForSource, runPreview, whenSaved]);


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
  // a render lock whose end never came (they left the room or closed Discord mid-render, its `done` went to another
  // lobby): it goes when they're no longer editing here, and at the latest after RENDER_LOCK_LIMIT. Everyone else
  // used to stay locked until they left and came back
  const renderingHere = Boolean(rendering && editors.some((member) => member.user_id === rendering));
  useEffect(() => {
    if (!rendering) {
      return;
    }
    if (!renderingHere) {
      setRendering(null);
      return;
    }
    const timer = window.setTimeout(() => setRendering(null), RENDER_LOCK_LIMIT);
    return () => window.clearTimeout(timer);
  }, [rendering, renderingHere]);

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
    reload,
    steps,
    effectsById,
    selectedId,
    setSelectedId,
    selectedStep,
    selectedTool,
    saveState,
    retrySave,
    whenSaved,
    stepError,
    reloaded,
    canUndo: !watching && !rendering && historyRef.current.past.length > 0,
    canRedo: !watching && !rendering && historyRef.current.future.length > 0,
    // a watch-only room they didn't make: they watch, render and fork, nothing they do changes it
    watching,
    // why their changes do nothing right now ('watching' before 'rendering': someone else's render), null when they do
    editLock,
    undo,
    redo,
    addStep,
    replaceSteps,
    setStepInputs,
    addAssets,
    uploadAsset,
    replaceSource,
    removeStep,
    toggleStep,
    moveStep,
    setParam,
    setParams,
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
    members,
    editors,
    lockedBy,
    // someone else's render locks the stack until it's done
    renderLocked: Boolean(rendering),
    renderingMember,
  };
}

export type EditorDocumentState = ReturnType<typeof useEditorDocument>;
