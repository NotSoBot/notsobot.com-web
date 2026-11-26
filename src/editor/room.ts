import type { EditorDocument, EditorLobby, EditorStep } from './types';


// The Activity's shared room (activity-plan.md "Rooms protocol"): one websocket per activity instance, every stack
// change is an op the api applies in order and sends back to everyone as the whole document. Edits from here are
// shown at once (optimistic), the api's document replaces them when it arrives

export interface RoomMember {
  user_id: string,
  username: string,
  avatar_url: string | null,
  // the lobby (group document) they're editing, null when they're only in the activity
  editing?: string | null,
}

// people editing the group's document at once (the api's `ROOM_MAX_EDITORS`, it enforces it)
export const ROOM_MAX_EDITORS = 10;
// how long joining the group edit waits for the room before going ahead (saves over http still check the cap)
const EDITING_WAIT = 8000;
// the api's lobby lock codes (`EDITOR_LOBBY_LOCKED`, `EDITOR_LOBBY_PASSWORD_INVALID`)
const EDITOR_LOBBY_LOCKED = 50060;
const EDITOR_LOBBY_PASSWORD_INVALID = 50061;
const EDITOR_LOBBY_KICKED = 50062;
// how long a kick or close waits for the api's answer
const MODERATE_WAIT = 8000;

// Where someone's pointer is, for the others in their lobby: over the preview (0-1 across the media), over an effect
// tile (its picker tab, the tile, 0-1 across it) or over a step. Never saved
export type RoomCursor =
  | {at: 'preview', x: number, y: number}
  | {at: 'picker', tab: string, effect: string | null, x?: number, y?: number}
  | {at: 'step', step_id: string};

// how often a moving pointer goes out (the last position always does)
const CURSOR_INTERVAL = 66;

export type EditingResult = {result: 'ok' | 'full' | 'locked' | 'wrong' | 'kicked' | 'gone', message?: string};

// a kick or close: done, or why not
export type ModerationResult = {ok: true} | {ok: false, message: string};

export type RoomOp =
  | {op: 'add', step: EditorStep, index?: number}
  | {op: 'remove', step_id: string}
  | {op: 'move', step_id: string, to: number}
  | {op: 'set_param', step_id: string, name: string, value: unknown}
  | {op: 'toggle', step_id: string, hidden: boolean}
  | {op: 'replace', steps: Array<EditorStep>};

export type RoomEvent =
  | {t: 'ready', you: string, lobbies: Array<EditorLobby>, members: Array<RoomMember>, locks: Record<string, string>, moderator?: boolean}
  | {t: 'document', document: EditorDocument, by: string | null, op: string | null, op_id: string | null}
  | {t: 'error', op_id: string | null, code: number, message: string, index?: number}
  | {t: 'lock', step_id: string, user_id: string}
  | {t: 'unlock', step_id: string, user_id: string}
  | {t: 'members', members: Array<RoomMember>}
  // the answer to `editing`: the lobby they're in now, `full` when it had no room, `error` a lock's code (password)
  | {t: 'editing', document_id: string | null, full?: boolean, error?: number, message?: string}
  | {t: 'render', user_id: string, status: 'started' | 'done' | 'failed', url?: string, document_id?: string | null}
  // another editor's pointer in this lobby (the api sends only the lobby's, never your own), null when it left
  | {t: 'cursor', user_id: string, document_id: string, cursor: RoomCursor | null}
  // you were removed from a room (its creator or a server moderator), the api already took you out of it
  | {t: 'kicked', document_id: string, by: string | null}
  // a room was closed, everyone in it is out of it
  | {t: 'lobby_closed', document_id: string, by: string | null}
  // a room was deleted (its creator or a server moderator, `by` null when its creator was banned), everyone in it is out
  | {t: 'lobby_deleted', document_id: string, by: string | null}
  // the answer to your own `kick` / `close_lobby` / `delete_lobby`
  | {t: 'moderated', op: 'kick' | 'close_lobby' | 'delete_lobby' | 'room_settings', document_id: string, user_id?: string, error?: number, message?: string}
  // a room's creator renamed it or changed its password (who's in it stays in)
  | {t: 'lobby_updated', document_id: string, name: string | null, locked: boolean}
  | {t: 'pong'};

export type RoomStatus = 'connecting' | 'open' | 'closed' | 'denied';

const PING_INTERVAL = 20 * 1000;
// the api doesn't say when a soft lock runs out (10s after its last renewal), it's dropped here then
const LOCK_EXPIRY = 10 * 1000;
const RECONNECT_DELAYS = [500, 1000, 2000, 5000, 10000];
// close codes that won't get better by trying again (bad token, not in the activity, unknown instance). 4029 (too many
// messages) reconnects like any other close, with the backoff
const FATAL_CLOSE_CODES = new Set([4001, 4003, 4004]);


let opCounter = 0;
function newOpId(): string {
  opCounter += 1;
  return `${Date.now().toString(36)}${opCounter.toString(36)}`.slice(0, 32);
}


export class EditorRoom {
  status: RoomStatus = 'connecting';
  you: string | null = null;
  members: Array<RoomMember> = [];
  locks: Record<string, string> = {};

  private socket: WebSocket | null = null;
  private listeners = new Set<(event: RoomEvent) => void>();
  private statusListeners = new Set<(status: RoomStatus) => void>();
  private pingTimer: number | null = null;
  private lockTimers = new Map<string, number>();
  private reconnectTimer: number | null = null;
  // the pointer waiting to go out, and when the last one did
  private cursorTimer: number | null = null;
  private cursorNext: {cursor: RoomCursor | null} | null = null;
  private cursorSentAt = 0;
  private cursorLast = 'null';
  private attempt = 0;
  private stopped = false;
  // the lobby it's editing (and its password), asked for again after every reconnect (a new socket starts outside)
  private wantEditing: {documentId: string, password?: string} | null = null;
  private editingWaiters: Array<(result: EditingResult) => void> = [];
  // the lobby its ops change, what `sendOp` sends them to
  editingDocument: string | null = null;
  // a moderator of the server the activity is in: closes anyone's room and removes anyone from one
  moderator = false;
  private moderationWaiters = new Map<string, (result: ModerationResult) => void>();

  constructor(private readonly url: string, private readonly token: string) {}

  get isOpen(): boolean {
    return this.status === 'open' && this.socket?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    this.stopped = false;
    this.open();
  }

  close(): void {
    this.stopped = true;
    this.clearTimers();
    this.socket?.close(1000);
    this.socket = null;
  }

  subscribe(listener: (event: RoomEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (status: RoomStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // a stack op, its `op_id` comes back on the document (or error) it caused
  sendOp(op: RoomOp): string {
    const opId = newOpId();
    // the lobby it's for, the api refuses ops on any other
    this.send({...op, op_id: opId, document_id: this.editingDocument});
    return opId;
  }

  lock(stepId: string): void {
    this.send({op: 'lock', step_id: stepId});
  }

  unlock(stepId: string): void {
    this.send({op: 'unlock', step_id: stepId});
  }

  // join a lobby (its password for a locked one) or, null, leave it: 'full' at `ROOM_MAX_EDITORS`, 'locked'/'wrong'
  // for a missing or wrong password. Before the room's open it's sent once it is, and given up on after EDITING_WAIT
  // (going ahead, the api still checks saves)
  setEditing(documentId: string | null, password?: string): Promise<EditingResult> {
    // the api hides their pointer when they change lobby
    this.cursorLast = 'null';
    if (documentId === null) {
      this.wantEditing = null;
      this.editingDocument = null;
      this.send({op: 'editing', document_id: null});
      return Promise.resolve({result: 'ok'});
    }
    this.wantEditing = {documentId, password};
    return new Promise((resolve) => {
      let done = false;
      const finish = (result: EditingResult) => {
        if (!done) {
          done = true;
          if (result.result === 'ok') {
            this.editingDocument = documentId;
          }
          resolve(result);
        }
      };
      this.editingWaiters.push(finish);
      window.setTimeout(() => finish({result: 'ok'}), EDITING_WAIT);
      this.send({op: 'editing', document_id: documentId, password});
    });
  }

  // who's editing that lobby now, one per person
  editorsOf(documentId: string | null): Array<RoomMember> {
    return (documentId) ? this.members.filter((member) => member.editing === documentId) : [];
  }

  // their pointer, for the others in the lobby they're editing: at most every CURSOR_INTERVAL, the latest one wins
  sendCursor(cursor: RoomCursor | null): void {
    if (!this.editingDocument || !this.isOpen) {
      return;
    }
    this.cursorNext = {cursor};
    if (this.cursorTimer !== null) {
      return;
    }
    const wait = Math.max(0, this.cursorSentAt + CURSOR_INTERVAL - Date.now());
    this.cursorTimer = window.setTimeout(() => {
      this.cursorTimer = null;
      const next = this.cursorNext;
      this.cursorNext = null;
      if (!next) {
        return;
      }
      const text = JSON.stringify(next.cursor);
      // the same spot again (a pointer resting) isn't news
      if (text === this.cursorLast) {
        return;
      }
      this.cursorLast = text;
      this.cursorSentAt = Date.now();
      this.send({op: 'cursor', cursor: next.cursor});
    }, wait);
  }

  // remove someone from a room and keep them out of it (the room's creator or a server moderator)
  kick(documentId: string, userId: string): Promise<ModerationResult> {
    return this.moderate(`kick:${documentId}:${userId}`, {op: 'kick', document_id: documentId, user_id: userId});
  }

  // end a room, everyone in it goes back to the room list (the room's creator or a server moderator)
  closeLobby(documentId: string): Promise<ModerationResult> {
    return this.moderate(`close_lobby:${documentId}:`, {op: 'close_lobby', document_id: documentId});
  }

  // delete a room outright, everyone in it goes back to the room list and its edit is gone (the room's creator or a
  // server moderator)
  deleteLobby(documentId: string): Promise<ModerationResult> {
    return this.moderate(`delete_lobby:${documentId}:`, {op: 'delete_lobby', document_id: documentId});
  }

  // its creator's name and visibility for it: public, or a password room (no password keeps the one it has)
  updateRoomSettings(documentId: string, settings: {name: string, mode: 'public' | 'password', password?: string}): Promise<ModerationResult> {
    return this.moderate(`room_settings:${documentId}:`, {
      op: 'room_settings',
      document_id: documentId,
      name: settings.name.trim() || null,
      mode: settings.mode,
      password: settings.password || undefined,
    });
  }

  private moderate(key: string, message: Record<string, unknown>): Promise<ModerationResult> {
    if (!this.isOpen) {
      return Promise.resolve({ok: false, message: 'Not connected, try again in a moment'});
    }
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.moderationWaiters.delete(key);
        resolve({ok: false, message: 'No answer, try again'});
      }, MODERATE_WAIT);
      this.moderationWaiters.get(key)?.({ok: false, message: 'Tried again'});
      this.moderationWaiters.set(key, (result) => {
        window.clearTimeout(timer);
        resolve(result);
      });
      this.send(message);
    });
  }

  render(status: 'started' | 'done' | 'failed', url?: string): void {
    this.send({op: 'render', status, url});
  }

  private send(message: Record<string, unknown>): void {
    // nothing is queued while it's not open: the editor saves over http meanwhile (`isOpen`), an op sent later would
    // apply the same change twice
    if (this.isOpen) {
      this.socket!.send(JSON.stringify(message));
    }
  }

  private setStatus(status: RoomStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private clearTimers(): void {
    for (const timer of this.lockTimers.values()) {
      window.clearTimeout(timer);
    }
    this.lockTimers.clear();
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.cursorTimer !== null) {
      window.clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
    this.cursorNext = null;
    // a new socket starts without a cursor showing
    this.cursorLast = 'null';
  }

  private open(): void {
    this.setStatus('connecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.addEventListener('open', () => {
      // a socket can't carry an authorization header, the token is the first message
      socket.send(JSON.stringify({op: 'hello', token: this.token}));
    });
    socket.addEventListener('message', (message) => {
      let event: RoomEvent;
      try {
        event = JSON.parse(String(message.data));
      } catch {
        return;
      }
      this.handle(event);
    });
    socket.addEventListener('close', (close) => {
      if (this.socket !== socket) {
        return;
      }
      this.clearTimers();
      this.socket = null;
      if (this.stopped) {
        this.setStatus('closed');
        return;
      }
      if (FATAL_CLOSE_CODES.has(close.code)) {
        this.setStatus('denied');
        return;
      }
      this.setStatus('closed');
      const delay = RECONNECT_DELAYS[Math.min(this.attempt, RECONNECT_DELAYS.length - 1)];
      this.attempt += 1;
      this.reconnectTimer = window.setTimeout(() => this.open(), delay);
    });
  }

  private handle(event: RoomEvent): void {
    switch (event.t) {
      case 'ready': {
        this.attempt = 0;
        this.you = event.you;
        this.moderator = Boolean(event.moderator);
        this.members = event.members;
        this.locks = event.locks;
        this.setStatus('open');
        this.pingTimer = window.setInterval(() => this.send({op: 'ping'}), PING_INTERVAL);
        if (this.wantEditing) {
          this.send({op: 'editing', document_id: this.wantEditing.documentId, password: this.wantEditing.password});
        }
        break;
      }
      case 'members': {
        this.members = event.members;
        break;
      }
      case 'kicked':
      case 'lobby_closed':
      case 'lobby_deleted': {
        // the api took this socket out of it already
        if (event.document_id === this.editingDocument) {
          this.wantEditing = null;
          this.editingDocument = null;
        }
        break;
      }
      case 'moderated': {
        const key = `${event.op}:${event.document_id}:${event.user_id ?? ''}`;
        const waiter = this.moderationWaiters.get(key);
        this.moderationWaiters.delete(key);
        waiter?.((event.error !== undefined) ? {ok: false, message: event.message || 'That didn’t work'} : {ok: true});
        break;
      }
      case 'editing': {
        const result: EditingResult = (event.full) ? {result: 'full'}
          : (event.error === EDITOR_LOBBY_LOCKED) ? {result: 'locked', message: event.message}
          : (event.error === EDITOR_LOBBY_PASSWORD_INVALID) ? {result: 'wrong', message: event.message}
          : (event.error === EDITOR_LOBBY_KICKED) ? {result: 'kicked', message: event.message}
          : (event.error !== undefined) ? {result: 'gone', message: event.message}
          : {result: 'ok'};
        if (result.result !== 'ok') {
          this.wantEditing = null;
          this.editingDocument = null;
        }
        const waiters = this.editingWaiters;
        this.editingWaiters = [];
        for (const waiter of waiters) {
          waiter(result);
        }
        break;
      }
      case 'lock': {
        this.locks = {...this.locks, [event.step_id]: event.user_id};
        // a take or a renewal (or, for a lock we asked for, who holds it instead), it lasts LOCK_EXPIRY from now
        const previous = this.lockTimers.get(event.step_id);
        if (previous !== undefined) {
          window.clearTimeout(previous);
        }
        this.lockTimers.set(event.step_id, window.setTimeout(() => {
          this.lockTimers.delete(event.step_id);
          this.handle({t: 'unlock', step_id: event.step_id, user_id: event.user_id});
        }, LOCK_EXPIRY));
        break;
      }
      case 'unlock': {
        if (this.locks[event.step_id] === event.user_id) {
          const { [event.step_id]: _, ...rest } = this.locks;
          this.locks = rest;
          const timer = this.lockTimers.get(event.step_id);
          if (timer !== undefined) {
            window.clearTimeout(timer);
            this.lockTimers.delete(event.step_id);
          }
        }
        break;
      }
      default:
        break;
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
