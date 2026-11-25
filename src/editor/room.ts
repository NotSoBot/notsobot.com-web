import type { EditorDocument, EditorStep } from './types';


// The Activity's shared room (activity-plan.md "Rooms protocol"): one websocket per activity instance, every stack
// change is an op the api applies in order and sends back to everyone as the whole document. Edits from here are
// shown at once (optimistic), the api's document replaces them when it arrives

export interface RoomMember {
  user_id: string,
  username: string,
  avatar_url: string | null,
}

export type RoomOp =
  | {op: 'add', step: EditorStep, index?: number}
  | {op: 'remove', step_id: string}
  | {op: 'move', step_id: string, to: number}
  | {op: 'set_param', step_id: string, name: string, value: unknown}
  | {op: 'toggle', step_id: string, hidden: boolean}
  | {op: 'replace', steps: Array<EditorStep>};

export type RoomEvent =
  | {t: 'ready', you: string, document: EditorDocument | null, members: Array<RoomMember>, locks: Record<string, string>}
  | {t: 'document', document: EditorDocument, by: string | null, op: string | null, op_id: string | null}
  | {t: 'error', op_id: string | null, code: number, message: string, index?: number}
  | {t: 'lock', step_id: string, user_id: string}
  | {t: 'unlock', step_id: string, user_id: string}
  | {t: 'members', members: Array<RoomMember>}
  | {t: 'render', user_id: string, status: 'started' | 'done' | 'failed', url?: string}
  | {t: 'pong'};

export type RoomStatus = 'connecting' | 'open' | 'closed' | 'denied';

const PING_INTERVAL = 20 * 1000;
// the api doesn't say when a soft lock runs out (10s after its last renewal), it's dropped here then
const LOCK_EXPIRY = 10 * 1000;
const RECONNECT_DELAYS = [500, 1000, 2000, 5000, 10000];
// close codes that won't get better by trying again (bad token, not in the activity, unknown instance)
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
  private attempt = 0;
  private stopped = false;
  // ops sent before the socket opened (or while it reconnects), sent once it's ready
  private queue: Array<string> = [];

  constructor(private readonly url: string, private readonly token: string) {}

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
    this.send({...op, op_id: opId});
    return opId;
  }

  lock(stepId: string): void {
    this.send({op: 'lock', step_id: stepId});
  }

  unlock(stepId: string): void {
    this.send({op: 'unlock', step_id: stepId});
  }

  render(status: 'started' | 'done' | 'failed', url?: string): void {
    this.send({op: 'render', status, url});
  }

  private send(message: Record<string, unknown>): void {
    const text = JSON.stringify(message);
    if (this.status === 'open' && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(text);
    } else if (message.op !== 'lock' && message.op !== 'unlock') {
      this.queue.push(text);
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
        this.members = event.members;
        this.locks = event.locks;
        this.setStatus('open');
        this.pingTimer = window.setInterval(() => this.send({op: 'ping'}), PING_INTERVAL);
        const queued = this.queue;
        this.queue = [];
        for (const text of queued) {
          this.socket?.send(text);
        }
        break;
      }
      case 'members': {
        this.members = event.members;
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
