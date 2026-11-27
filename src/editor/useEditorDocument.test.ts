import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { advance, renderHook, unmountAll } from '@/test/renderHook';

import { EditorErrorCodes, type EditorApi, type EditorApiError, type EditorHost } from './api';
import type { EditorRoom, RoomEvent, RoomMember, RoomOp, RoomStatus } from './room';
import type { EditorCatalogue, EditorDocument, EditorPreview, EditorStep } from './types';
import { useEditorDocument } from './useEditorDocument';


// useEditorDocument against a fake api and a fake room, on real React with Vitest's fake clock. Ported from the scratch
// scenario script that ran it on a hand-written hook shim: here effects, batching and cleanup are React's own

// ---- the fake world ----

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// what the host's request throws, read back by `errorOf`
class FakeApiError extends Error {
  constructor(readonly apiError: EditorApiError) {
    super(apiError.message);
  }
}

function apiError(status: number, code: number | null, message: string = 'nope', body: Record<string, unknown> | null = null): FakeApiError {
  return new FakeApiError({status, code, message, body});
}

// what a real request rejects with once its signal is aborted
function aborted(): Error {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function step(id: string, amount: number = 1): EditorStep {
  return {id, effect: 'blur', hidden: false, params: {amount}};
}

const ids = (steps: Array<EditorStep>): string => steps.map((item) => item.id).join();

function makeDocument(steps: Array<EditorStep>): EditorDocument {
  return {
    id: 'd1',
    user_id: 'me',
    steps,
    version: 1,
    catalogue_version: 1,
    proxy: null,
    proxy_status: 'ready',
    source: {id: 's1', filename: 'a.png', urls: {cdn: '', vanity: ''}},
    source_meta: {kind: 'image', width: 1, height: 1, framecount: 1, fps: 0, duration: 0, mimetype: 'image/png'},
    activity_instance_id: null,
    guild_id: null,
    assets: [],
    is_owner: true,
    can_edit: true,
    created: 0,
    updated: '',
    expires_at: '',
  };
}

function donePreview(url: string = 'p'): EditorPreview {
  return {status: 'done', url, mimetype: 'image/png', width: 1, height: 1, framecount: 1, fps: 0, duration: 0, cached: false};
}

// the api as far as the hook calls it, answering from `server`
interface FakeServer {
  doc: EditorDocument,
  // throws for each save while set
  saveFails: (() => Error) | null,
  // throws for each document fetch while set
  documentFails: (() => Error) | null,
  // saves wait for `release()` while set (one on its way, for as long as the test wants)
  holdSaves: boolean,
  release: () => void,
  saves: Array<{steps: Array<EditorStep>, version: number}>,
  documentCalls: number,
  previews: number,
  previewAnswer: () => EditorPreview,
  previewStatusAnswer: () => EditorPreview,
  // answers the Replace media that's on its way
  finishReplace: (() => void) | null,
}

type FakeApi = Pick<EditorApi, 'document' | 'saveSteps' | 'preview' | 'previewStatus' | 'replaceSource'>;

function makeApi(server: FakeServer): FakeApi {
  let held: Array<() => void> = [];
  server.release = () => {
    const waiting = held;
    held = [];
    waiting.forEach((resume) => resume());
  };
  return {
    document: async (_documentId, signal) => {
      server.documentCalls += 1;
      // an answer takes a moment, and an aborted request never gets it (fetch rejects)
      await Promise.resolve();
      if (signal?.aborted) {
        throw aborted();
      }
      if (server.documentFails) {
        throw server.documentFails();
      }
      return clone(server.doc);
    },
    saveSteps: async (_documentId, sent, version) => {
      server.saves.push({steps: clone(sent), version});
      if (server.holdSaves) {
        await new Promise<void>((resume) => held.push(resume));
      }
      if (server.saveFails) {
        throw server.saveFails();
      }
      if (version !== server.doc.version) {
        throw apiError(409, EditorErrorCodes.EDITOR_DOCUMENT_VERSION_MISMATCH, 'out of date');
      }
      server.doc = {...server.doc, steps: clone(sent), version: server.doc.version + 1};
      return clone(server.doc);
    },
    preview: async (_documentId, _options, signal) => {
      server.previews += 1;
      if (signal?.aborted) {
        throw aborted();
      }
      return server.previewAnswer();
    },
    previewStatus: async () => server.previewStatusAnswer(),
    // answered when the test calls `server.finishReplace()`
    replaceSource: (_documentId, _input, _version) => new Promise((resolve) => {
      server.finishReplace = () => {
        server.doc = {...server.doc, source: {...server.doc.source, id: 's2'}, version: server.doc.version + 1};
        resolve(clone(server.doc));
      };
    }),
  };
}

// The room's socket as far as the hook uses it. `emit` and `status` are the socket talking: each is handled inside
// `act`, like an event React didn't start
class FakeRoom implements Pick<EditorRoom, 'isOpen' | 'you' | 'members' | 'locks' | 'subscribe' | 'onStatus' | 'sendOp' | 'lock' | 'unlock'> {
  isOpen = true;
  you: string | null = 'me';
  members: Array<RoomMember> = [
    {user_id: 'me', username: 'me', avatar_url: null, editing: 'd1'},
    {user_id: 'bo', username: 'bo', avatar_url: null, editing: 'd1'},
  ];
  locks: Record<string, string> = {};
  ops: Array<RoomOp & {id: string}> = [];
  lockCalls: Array<string> = [];
  unlockCalls: Array<string> = [];
  readonly listeners = new Set<(event: RoomEvent) => void>();
  readonly statusListeners = new Set<(status: RoomStatus) => void>();

  subscribe(listener: (event: RoomEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (status: RoomStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  sendOp(op: RoomOp): string {
    const id = `op${this.ops.length + 1}`;
    this.ops.push({...op, id});
    return id;
  }

  lock(stepId: string): void {
    this.lockCalls.push(stepId);
  }

  unlock(stepId: string): void {
    this.unlockCalls.push(stepId);
  }

  emit(event: RoomEvent): void {
    act(() => {
      for (const listener of [...this.listeners]) {
        listener(event);
      }
    });
  }

  status(status: RoomStatus): void {
    act(() => {
      this.isOpen = status === 'open';
      for (const listener of [...this.statusListeners]) {
        listener(status);
      }
    });
  }

  // a reconnect: the socket's open again and the room says `ready`
  reconnect(): void {
    this.status('open');
    this.emit({t: 'ready', you: 'me', socket_id: '0123456789abcdef', lobbies: [], members: this.members});
  }
}

const catalogue: EditorCatalogue = {effects: [], groups: [], limits: {max_stroke_points: 0, max_strokes: 0, max_text_length: 0}, version: 1};

function makeServer(steps: Array<EditorStep>): FakeServer {
  return {
    doc: makeDocument(steps),
    saveFails: null,
    documentFails: null,
    holdSaves: false,
    release: () => undefined,
    saves: [],
    documentCalls: 0,
    previews: 0,
    previewAnswer: () => donePreview(),
    previewStatusAnswer: () => donePreview(),
    finishReplace: null,
  };
}

function mount(server: FakeServer, room: FakeRoom | undefined, options: {strict?: boolean} = {}) {
  const host: EditorHost = {
    // the hook only calls these five (FakeApi), and only these of the room (FakeRoom)
    api: makeApi(server) as unknown as EditorApi,
    errorOf: (error) => (error instanceof FakeApiError) ? error.apiError : null,
    room: room as unknown as EditorRoom | undefined,
    premiumUrl: '',
    templateUrl: () => '',
  };
  const hook = renderHook(() => useEditorDocument(host, 'd1', catalogue), {strict: options.strict});
  return {hook, state: () => hook.result.current};
}

// the website, or a solo edit: no room, every edit saved over http
function webWorld({steps = []}: {steps?: Array<EditorStep>} = {}) {
  const server = makeServer(steps);
  return {server, ...mount(server, undefined)};
}

// a group room with its socket open
function roomWorld({steps = [], strict = false}: {steps?: Array<EditorStep>, strict?: boolean} = {}) {
  const server = makeServer(steps);
  const room = new FakeRoom();
  return {server, room, ...mount(server, room, {strict})};
}

type RoomWorld = ReturnType<typeof roomWorld>;

// the room applies an op like the api would (a version each) and, with `send`, answers everyone with the document
function roomApplies(world: RoomWorld, steps: Array<EditorStep>, {by = 'bo', opId = null, send = true}: {by?: string, opId?: string | null, send?: boolean} = {}): void {
  world.server.doc = {...world.server.doc, steps: clone(steps), version: world.server.doc.version + 1};
  if (send) {
    world.room.emit({t: 'document', document: clone(world.server.doc), by, op: 'add', op_id: opId});
  }
}

// a call into the hook as a click would make it: its updates are rendered before the next line
function user<T>(fn: () => T): T {
  let value!: T;
  act(() => {
    value = fn();
  });
  return value;
}

// a promise's outcome, read once the clock has moved on (awaiting it outside `advance` would settle it outside `act`)
function track<T>(promise: Promise<T>): {settled: boolean, value?: T} {
  const outcome: {settled: boolean, value?: T} = {settled: false};
  void promise.then((value) => {
    outcome.settled = true;
    outcome.value = value;
  });
  return outcome;
}


// React's "not wrapped in act(...)" warning (a state update that escaped `act`) and anything else it complains about.
// Counted, not hidden: a run can show no console at all (vitest's agent reporter), so it fails the test instead
let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']});
  // retry and preview waits are `delay * (1 + Math.random())`: exactly 1.5x here
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  unmountAll();
  vi.clearAllTimers();
  vi.useRealTimers();
  expect(consoleError).not.toHaveBeenCalled();
});


describe('http saves', () => {
  it('an edit made while a save is in flight is sent after it, with the version that save returned', async () => {
    const { server, state } = webWorld();
    await advance();
    expect(state().document?.version).toBe(1);
    user(() => state().addStep(step('a')));
    expect(state().saveState).toBe('saving');
    // the 350 ms wait, then the save goes and is held on its way
    server.holdSaves = true;
    await advance(349);
    expect(server.saves).toHaveLength(0);
    await advance(1);
    expect(server.saves).toHaveLength(1);
    user(() => state().addStep(step('b')));
    await advance(400);
    // still one: the second waits for the first's answer
    expect(server.saves).toHaveLength(1);
    server.holdSaves = false;
    await act(async () => {
      server.release();
    });
    await advance();
    expect(server.saves.map((save) => save.version)).toEqual([ 1, 2 ]);
    expect(ids(server.doc.steps)).toBe('a,b');
    expect(state().saveState).toBe('saved');
    expect(ids(state().steps)).toBe('a,b');
  });

  it('a 423 (step locked) is retried, and a 409 whose refetch fails is an error that is retried, never "saved"', async () => {
    const { server, state } = webWorld();
    await advance();
    server.saveFails = () => apiError(423, EditorErrorCodes.EDITOR_STEP_LOCKED, 'Someone else is adjusting that step');
    user(() => state().addStep(step('a')));
    await advance(400);
    expect(state().saveState).toBe('error');
    expect(state().stepError?.message).toBe('Someone else is adjusting that step');
    server.saveFails = null;
    await advance(1100);
    expect(state().saveState).toBe('saved');
    expect(server.doc.steps).toHaveLength(1);

    // someone else's tab moved it on, and the refetch fails
    server.doc = {...server.doc, steps: [ step('z') ], version: 9};
    server.documentFails = () => apiError(0, null);
    user(() => state().addStep(step('b')));
    await advance(400);
    expect(state().saveState).toBe('error');
    expect(state().reloaded).toBe(false);
    server.documentFails = null;
    await advance(1100);
    // the retry finds the change and reloads with the notice
    expect(state().reloaded).toBe(true);
    expect(ids(state().steps)).toBe('z');
    expect(state().saveState).toBe('saved');
  });

  it('a load that failed is shown as loadError, and reload() runs the load again', async () => {
    const { server, state } = webWorld();
    server.documentFails = () => apiError(500, null);
    await advance();
    expect(state().loadError?.status).toBe(500);
    expect(state().document).toBeNull();
    server.documentFails = null;
    user(() => state().reload());
    await advance();
    expect(state().loadError).toBeNull();
    expect(state().document?.id).toBe('d1');
    expect(server.documentCalls).toBe(2);
  });

  it('a save scheduled while Replace media was on its way goes with the replaced document\'s version', async () => {
    const { server, state } = webWorld({steps: [ step('a') ]});
    await advance();
    const replacing = user(() => state().replaceSource({url: 'https://cdn.nsb.gg/samples/b.png'}));
    await advance(150);
    expect(server.finishReplace).toBeTypeOf('function');
    user(() => state().setParam('a', 'amount', 9));
    await act(async () => {
      server.finishReplace?.();
      await replacing;
    });
    await advance(600);
    expect(server.saves.map((save) => save.version)).toEqual([ 2 ]);
    expect(state().reloaded).toBe(false);
  });
});


describe('conflicts', () => {
  it('a 409 whose fresh stack is what was sent (ops that landed before a socket blip) is "saved" with no notice', async () => {
    const world = roomWorld();
    const { server, room, state } = world;
    await advance();
    user(() => state().addStep(step('a')));
    expect(room.ops).toHaveLength(1);
    expect(state().saveState).toBe('saving');
    // the api applied it, the answer is lost with the socket
    roomApplies(world, [ step('a') ], {send: false});
    room.status('closed');
    await advance(400);
    expect(server.saves[0]?.version).toBe(1);
    expect(state().reloaded).toBe(false);
    expect(state().saveState).toBe('saved');
    expect(state().steps).toHaveLength(1);
    // the next http edit is on the right version
    user(() => state().addStep(step('b')));
    await advance(400);
    expect(server.doc.steps).toHaveLength(2);
    expect(state().saveState).toBe('saved');
  });

  it('someone else\'s change while an offline edit is still owed is a conflict: the old version is sent, then reload + notice', async () => {
    const world = roomWorld();
    const { server, room, state } = world;
    await advance();
    room.status('closed');
    server.saveFails = () => apiError(502, null);
    user(() => state().addStep(step('a')));
    await advance(400);
    // owed: failed, its retry waiting
    expect(state().saveState).toBe('error');
    room.status('open');
    await advance(10);
    expect(state().saveState).toBe('error');
    // bo's change lands first
    roomApplies(world, [ step('x') ]);
    // their stack is not put over the unsaved edit, and it's still not "saved"
    expect(ids(state().steps)).toBe('a');
    expect(state().saveState).toBe('error');
    server.saveFails = null;
    await advance(3000);
    // the owed save went with the version its edit was made on (1), not the room's (2)
    expect(server.saves.at(-1)?.version).toBe(1);
    expect(state().reloaded).toBe(true);
    expect(ids(state().steps)).toBe('x');
    expect(state().saveState).toBe('saved');
    // their change was not overwritten
    expect(ids(server.doc.steps)).toBe('x');
  });

  // A slider drag that goes on through a dropped socket. `landed`: the op in flight when it dropped was applied by the
  // api (its answer lost). `others`: someone else changed the stack too before this one's save got there
  async function droppedDrag({landed, others}: {landed: boolean, others: boolean}) {
    const world = roomWorld({steps: [ step('a') ]});
    const { server, room, state } = world;
    await advance();
    user(() => state().setParam('a', 'amount', 2));
    if (landed) {
      roomApplies(world, [ step('a', 2) ], {send: false});
    }
    room.status('closed');
    user(() => state().setParam('a', 'amount', 3));
    await advance(100);
    user(() => state().setParam('a', 'amount', 4));
    await advance(100);
    if (others) {
      roomApplies(world, [ ...server.doc.steps, step('x') ], {send: false});
    }
    room.reconnect();
    await advance(10);
    user(() => state().setParam('a', 'amount', 5));
    await advance(1500);
    return world;
  }

  it('a drag through a dropped socket whose op in flight had landed rebases and keeps the final value, no notice', async () => {
    // (the reviewer's sequence)
    const { server, room, state } = await droppedDrag({landed: true, others: false});
    expect(room.ops).toHaveLength(1);
    // the first save went with the version it knew (1), the second from the api's (2)
    expect(server.saves.map((save) => save.version)).toEqual([ 1, 2 ]);
    expect(state().steps[0].params.amount).toBe(5);
    expect(server.doc.steps[0].params.amount).toBe(5);
    expect(state().reloaded).toBe(false);
    expect(state().saveState).toBe('saved');
  });

  it('a drag through a dropped socket whose op in flight had not landed is one save, final value kept', async () => {
    const { server, state } = await droppedDrag({landed: false, others: false});
    expect(server.saves.map((save) => save.version)).toEqual([ 1 ]);
    expect(state().steps[0].params.amount).toBe(5);
    expect(server.doc.steps[0].params.amount).toBe(5);
    expect(state().reloaded).toBe(false);
    expect(state().saveState).toBe('saved');
  });

  it('a dropped drag whose op landed while someone else also edited (a gap bigger than our ops) is a real conflict', async () => {
    const { server, state } = await droppedDrag({landed: true, others: true});
    expect(state().reloaded).toBe(true);
    expect(state().saveState).toBe('saved');
    expect(ids(state().steps)).toBe('a,x');
    expect(ids(server.doc.steps)).toBe('a,x');
  });

  it('a dropped drag whose op had not landed, with someone else\'s edit to another step (a gap of 1, not our step), is a real conflict', async () => {
    const { server, state } = await droppedDrag({landed: false, others: true});
    expect(state().reloaded).toBe(true);
    // not written over
    expect(ids(server.doc.steps)).toBe('a,x');
  });

  it('a stale save error goes away with the reload notice', async () => {
    const { server, state } = webWorld();
    await advance();
    server.saveFails = () => apiError(500, null, 'The api is having a moment');
    user(() => state().addStep(step('a')));
    await advance(400);
    expect(state().stepError?.message).toBe('The api is having a moment');
    server.saveFails = null;
    server.doc = {...server.doc, steps: [ step('z') ], version: 7};
    await advance(1100);
    expect(state().reloaded).toBe(true);
    expect(state().stepError).toBeNull();
  });
});


describe('room ops and settling', () => {
  it('an echo for a version already here (fetched by a reconnect first) still ends "saving"', async () => {
    const world = roomWorld();
    const { server, room, state } = world;
    await advance();
    user(() => state().addStep(step('a')));
    const opId = room.ops[0].id;
    // the api applied it; a reconnect's refetch brings that version before the op's own answer
    roomApplies(world, [ step('a') ], {send: false});
    room.emit({t: 'ready', you: 'me', socket_id: '0123456789abcdef', lobbies: [], members: room.members});
    await advance(10);
    // the op is unanswered
    expect(state().saveState).toBe('saving');
    room.emit({t: 'document', document: clone(server.doc), by: 'me', op: 'add', op_id: opId});
    expect(state().saveState).toBe('saved');
    expect(state().steps).toHaveLength(1);
    const saved = track(state().whenSaved());
    await advance(300);
    expect(saved).toEqual({settled: true, value: true});
  });

  it('room errors that are not for our own op do nothing; ours revert to the room\'s stack and say why', async () => {
    const { room, state } = roomWorld();
    await advance();
    user(() => state().addStep(step('a')));
    room.emit({t: 'error', op_id: null, code: 50063, message: 'Only this room\'s creator can change it'});
    room.emit({t: 'error', op_id: 'someone-elses', code: 1, message: 'x'});
    expect(state().steps).toHaveLength(1);
    expect(state().saveState).toBe('saving');
    expect(state().stepError).toBeNull();
    room.emit({t: 'error', op_id: room.ops[0].id, code: EditorErrorCodes.EDITOR_STEP_LOCKED, message: 'Someone else is adjusting that step'});
    expect(state().steps).toHaveLength(0);
    expect(state().saveState).toBe('saved');
    expect(state().stepError).toEqual({index: null, message: 'Someone else is adjusting that step'});
  });

  it('a refused op\'s message goes when our next op is sent', async () => {
    const { room, state } = roomWorld();
    await advance();
    user(() => state().addStep(step('a')));
    room.emit({t: 'error', op_id: room.ops[0].id, code: EditorErrorCodes.EDITOR_INVALID_STEP, message: 'No'});
    expect(state().stepError?.message).toBe('No');
    user(() => state().addStep(step('b')));
    expect(state().stepError).toBeNull();
    expect(room.ops).toHaveLength(2);
  });

  it('a param drag adopts the room\'s document only once its timer runs out, and {lock: false} sends without a lock', async () => {
    const world = roomWorld({steps: [ step('a') ]});
    const { room, state } = world;
    await advance();
    user(() => state().setParam('a', 'amount', 2));
    expect(room.ops).toHaveLength(1);
    expect(room.lockCalls).toEqual([ 'a' ]);
    roomApplies(world, [ step('a', 2), step('x') ], {by: 'me', opId: room.ops[0].id});
    // remote documents wait on the param timer
    expect(state().steps).toHaveLength(1);
    expect(state().saveState).toBe('saving');
    await advance(130);
    expect(state().steps).toHaveLength(2);
    expect(state().saveState).toBe('saved');
    // the drag's hold is let go 1500 ms after its last move: from here a held change would take the lock again
    await advance(1500);
    expect(room.unlockCalls).toEqual([ 'a' ]);
    user(() => state().setParam('a', 'amount', 3, {lock: false}));
    expect(room.ops).toHaveLength(2);
    expect(room.lockCalls).toEqual([ 'a' ]);
  });
});


describe('reconnects', () => {
  it('an edit made while a save is owed stays on http after the socket reopens, and the owed save goes at once', async () => {
    // an edit made while the socket was down survives the next edit once it's back
    const { server, room, state } = roomWorld();
    await advance();
    room.status('closed');
    server.saveFails = () => apiError(502, null, 'bad gateway');
    user(() => state().addStep(step('a')));
    await advance(400);
    // the http save failed, its retry waiting
    expect(state().saveState).toBe('error');
    expect(server.saves).toHaveLength(1);
    // the socket is back, the api still isn't answering saves
    room.reconnect();
    await advance(10);
    expect(server.saves).toHaveLength(2);
    // the second edit must not go through the room alone
    user(() => state().addStep(step('b')));
    expect(room.ops).toHaveLength(0);
    server.saveFails = null;
    await advance(400);
    expect(ids(server.doc.steps)).toBe('a,b');
    expect(state().saveState).toBe('saved');
    expect(ids(state().steps)).toBe('a,b');
    expect(state().reloaded).toBe(false);
    // and from here edits go through the room again
    user(() => state().addStep(step('c')));
    expect(room.ops).toHaveLength(1);
    expect(room.ops[0].op).toBe('add');
  });

  it('a save refused for good is replaced by the room\'s next document, with the notice (a retryable one waits instead)', async () => {
    const world = roomWorld();
    const { server, room, state } = world;
    await advance();
    room.status('closed');
    server.saveFails = () => apiError(400, EditorErrorCodes.EDITOR_INVALID_STEP, 'Blur can\'t be that strong', {index: 0});
    user(() => state().addStep(step('a')));
    await advance(400);
    expect(state().saveState).toBe('error');
    expect(state().stepError?.index).toBe(0);
    room.status('open');
    await advance(10_000);
    // not tried again by itself
    expect(server.saves).toHaveLength(1);
    server.saveFails = null;
    roomApplies(world, [ step('x') ]);
    expect(state().reloaded).toBe(true);
    expect(ids(state().steps)).toBe('x');
    expect(state().saveState).toBe('saved');
    expect(state().stepError).toBeNull();
    // edits go through the room again
    user(() => state().addStep(step('b')));
    expect(room.ops).toHaveLength(1);
  });

  it('the socket closing clears the locks shown and drops our own soft locks, so the next drag takes its lock again', async () => {
    const { room, state } = roomWorld({steps: [ step('a') ]});
    await advance();
    room.locks = {a: 'bo'};
    room.emit({t: 'lock', step_id: 'a', user_id: 'bo'});
    expect(state().lockedBy('a')?.user_id).toBe('bo');
    room.locks = {};
    room.status('closed');
    // not shown as held while down
    expect(state().lockedBy('a')).toBeNull();
    room.status('open');
    user(() => state().setParam('a', 'amount', 2));
    room.status('closed');
    room.status('open');
    user(() => state().setParam('a', 'amount', 3));
    expect(room.lockCalls).toEqual([ 'a', 'a' ]);
  });
});


describe('locks', () => {
  it('editLock stops commits and params: rendering, then watching, which wins over rendering', async () => {
    const { server, room, state } = roomWorld({steps: [ step('a') ]});
    await advance();
    expect(state().editLock).toBeNull();
    expect(state().renderLocked).toBe(false);
    room.emit({t: 'render', user_id: 'bo', status: 'started', document_id: 'd1'});
    expect(state().editLock).toBe('rendering');
    expect(state().renderLocked).toBe(true);
    user(() => {
      state().addStep(step('b'));
      state().setParam('a', 'amount', 5);
    });
    // nothing changed or sent
    expect(state().steps).toHaveLength(1);
    expect(state().steps[0].params.amount).toBe(1);
    expect(room.ops).toHaveLength(0);
    expect(room.lockCalls).toHaveLength(0);
    room.emit({t: 'render', user_id: 'bo', status: 'done', document_id: 'd1'});
    expect(state().editLock).toBeNull();
    room.emit({t: 'lobby_updated', document_id: 'd1', name: null, locked: false, watch_only: true});
    // (the document's user_id is 'me', so not a watcher yet: it becomes someone else's below)
    expect(state().editLock).toBeNull();
    // someone renders again, then the room is made watch-only by its creator (bo)
    room.emit({t: 'render', user_id: 'bo', status: 'started', document_id: 'd1'});
    room.emit({t: 'document', document: {...clone(server.doc), version: 5, watch_only: true, user_id: 'bo'}, by: 'bo', op: 'patch', op_id: null});
    expect(state().renderLocked).toBe(true);
    expect(state().watching).toBe(true);
    expect(state().editLock).toBe('watching');
  });

  it('replaceSteps returns false and changes nothing while someone renders, true otherwise', async () => {
    const { room, state } = roomWorld({steps: [ step('a') ]});
    await advance();
    room.emit({t: 'render', user_id: 'bo', status: 'started', document_id: 'd1'});
    expect(user(() => state().replaceSteps([]))).toBe(false);
    expect(state().steps).toHaveLength(1);
    room.emit({t: 'render', user_id: 'bo', status: 'done', document_id: 'd1'});
    expect(user(() => state().replaceSteps([]))).toBe(true);
    expect(state().steps).toHaveLength(0);
    expect(room.ops[0]?.op).toBe('replace');
  });
});


describe('previews', () => {
  it('a preview someone else replaced is asked for twice more with growing waits, then failed', async () => {
    const { server, state } = roomWorld();
    await advance();
    expect(state().previewState).toBe('idle');
    expect(server.previews).toBe(1);
    server.previewAnswer = () => ({status: 'superseded'});
    user(() => void state().retryPreview());
    await advance();
    // waiting, shown as updating (not "up to date")
    expect(state().previewState).toBe('updating');
    expect(server.previews).toBe(2);
    // 1000 ms * 1.5
    await advance(1499);
    expect(server.previews).toBe(2);
    await advance(1);
    expect(server.previews).toBe(3);
    expect(state().previewState).toBe('updating');
    // 2000 ms * 1.5
    await advance(2999);
    expect(server.previews).toBe(3);
    await advance(1);
    expect(server.previews).toBe(4);
    expect(state().previewState).toBe('failed');
    await advance(10_000);
    expect(server.previews).toBe(4);
  });

  it('the latest request wins: our own new request cancels a waiting retry', async () => {
    const { server, state } = roomWorld();
    await advance();
    server.previewAnswer = () => ({status: 'superseded'});
    user(() => void state().retryPreview());
    await advance(10);
    // replaced by someone else's: its retry is waiting
    expect(server.previews).toBe(2);
    expect(state().previewState).toBe('updating');
    server.previewAnswer = () => donePreview('q');
    user(() => void state().retryPreview());
    await advance(10);
    expect(server.previews).toBe(3);
    expect(state().previewState).toBe('idle');
    expect(state().preview?.url).toBe('q');
    await advance(10_000);
    // the cancelled wait asked nothing
    expect(server.previews).toBe(3);
  });

  it('a pending preview without an id is failed, not "updating" for good', async () => {
    const { server, state } = roomWorld();
    await advance();
    // (the api's type says a pending one always has its id; the hook doesn't trust it)
    server.previewAnswer = () => ({status: 'pending'}) as unknown as EditorPreview;
    user(() => void state().retryPreview());
    await advance(10);
    expect(state().previewState).toBe('failed');
  });
});


describe('cleanup', () => {
  it('nothing asks for a preview after the editor is gone', async () => {
    const world = roomWorld();
    const { server, room, hook, state } = world;
    await advance();
    user(() => state().scrubTo(3));
    roomApplies(world, [ step('x') ]);
    // the badge says updating right away
    expect(state().previewState).toBe('updating');
    const before = server.previews;
    hook.unmount();
    expect(room.listeners.size).toBe(0);
    expect(room.statusListeners.size).toBe(0);
    // the scrub's wait and the room's preview delay went with it
    expect(vi.getTimerCount()).toBe(0);
    room.emit({t: 'document', document: {...clone(server.doc), version: 99}, by: 'bo', op: 'add', op_id: null});
    await advance(5000);
    expect(server.previews).toBe(before);
  });

  it('unmounting inside the save\'s wait sends the save at once and leaves no timer behind', async () => {
    const { server, room, hook, state } = roomWorld({steps: [ step('a') ]});
    await advance();
    // a drag (param timer, soft lock's release) with the socket down (a save waiting out its delay)
    user(() => state().setParam('a', 'amount', 2));
    room.status('closed');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    expect(server.saves).toHaveLength(0);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(server.saves).toEqual([ {steps: [ step('a', 2) ], version: 1} ]);
  });

  it('under StrictMode the load runs once to the end and one room subscription is left', async () => {
    const { server, room, state } = roomWorld({strict: true});
    await advance();
    // the first mount's load was aborted by its cleanup, the second one's answered
    expect(server.documentCalls).toBe(2);
    expect(state().document?.version).toBe(1);
    expect(server.previews).toBe(1);
    expect(room.listeners.size).toBe(1);
    expect(room.statusListeners.size).toBe(1);
  });
});
