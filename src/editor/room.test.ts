import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorRoom } from './room';
import type { EditingResult, RoomEvent, RoomGameMessage, RoomStatus } from './room';


// EditorRoom against a fake WebSocket and vitest's fake clock (timers, `Date` and `performance`: the pong watchdog
// stamps with `performance.now()`). Nothing here touches the network or really waits

interface FakeSocketEvent {
  data?: string,
  code?: number,
  reason?: string,
  wasClean?: boolean,
}

// the browser's WebSocket as far as the room uses it, plus the server's side (`accept`, `say`, `drop`)
class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  // every socket made in the test, oldest first
  static all: Array<FakeSocket> = [];

  readyState = FakeSocket.CONNECTING;
  sent: Array<Record<string, unknown>> = [];
  // the code `close()` was called with, 'no code' for none, null while it wasn't
  closed: number | 'no code' | null = null;
  private handlers = new Map<string, Array<(event: FakeSocketEvent) => void>>();

  constructor(readonly url: string) {
    FakeSocket.all.push(this);
  }

  addEventListener(type: string, handler: (event: FakeSocketEvent) => void): void {
    this.handlers.set(type, [ ...(this.handlers.get(type) ?? []), handler ]);
  }

  send(text: string): void {
    this.sent.push(JSON.parse(text));
  }

  // (a real browser fires `close` later, the tests do that with `drop` when they want it)
  close(code?: number): void {
    this.closed = code ?? 'no code';
    this.readyState = FakeSocket.CLOSED;
  }

  accept(): void {
    this.readyState = FakeSocket.OPEN;
    this.fire('open', {});
  }

  say(message: object): void {
    this.sayText(JSON.stringify(message));
  }

  sayText(data: string): void {
    this.fire('message', {data});
  }

  drop(code = 1006, reason = ''): void {
    this.readyState = FakeSocket.CLOSED;
    this.fire('close', {code, reason, wasClean: false});
  }

  // the ops it was sent, in order
  ops(): Array<unknown> {
    return this.sent.map((message) => message.op);
  }

  private fire(type: string, event: FakeSocketEvent): void {
    for (const handler of this.handlers.get(type) ?? []) {
      handler(event);
    }
  }
}

const ready: RoomEvent = {t: 'ready', you: 'me', socket_id: '0123456789abcdef', lobbies: [], members: []};

function last(): FakeSocket {
  const socket = FakeSocket.all[FakeSocket.all.length - 1];
  if (!socket) {
    throw new Error('no socket was made');
  }
  return socket;
}

// every room a test makes is closed after it
let rooms: Array<EditorRoom> = [];

function newRoom(): EditorRoom {
  const room = new EditorRoom('ws://room.test/socket', 'token');
  rooms.push(room);
  return room;
}

// a room with its socket open and `ready` answered
function openRoom(): {room: EditorRoom, socket: FakeSocket} {
  const room = newRoom();
  room.connect();
  const socket = last();
  socket.accept();
  socket.say(ready);
  return {room, socket};
}

// what a promise has settled to by now, 'pending' while it hasn't (one already resolved wins the race, it's first)
function peek<T>(promise: Promise<T>): Promise<T | 'pending'> {
  return Promise.race([ promise, Promise.resolve('pending' as const) ]);
}

function statusesOf(room: EditorRoom): Array<RoomStatus> {
  const statuses: Array<RoomStatus> = [];
  room.onStatus((status) => statuses.push(status));
  return statuses;
}

beforeEach(() => {
  vi.useFakeTimers({toFake: [ 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance' ]});
  vi.stubGlobal('WebSocket', FakeSocket);
  // no jitter unless a test asks for some: every backoff is exact
  vi.spyOn(Math, 'random').mockReturnValue(0);
  FakeSocket.all = [];
  rooms = [];
});

afterEach(() => {
  for (const room of rooms) {
    room.close();
  }
  vi.useRealTimers();
});


describe('connecting', () => {
  it('opens a socket to its url and says hello with the token once it opens', () => {
    const room = newRoom();
    const statuses = statusesOf(room);
    room.connect();
    const socket = last();
    expect(socket.url).toBe('ws://room.test/socket');
    expect(room.status).toBe('connecting');
    expect(socket.sent).toEqual([]);
    socket.accept();
    expect(socket.sent).toEqual([ {op: 'hello', token: 'token'} ]);
    // open but not `ready`: not open for the room's ops yet
    expect(room.isOpen).toBe(false);
    expect(statuses).toEqual([ 'connecting' ]);
  });

  it('is open once `ready` comes, with who it is, the members and whether it moderates', () => {
    const room = newRoom();
    const statuses = statusesOf(room);
    room.connect();
    last().accept();
    const members = [ {user_id: 'me', username: 'me', avatar_url: null} ];
    last().say({t: 'ready', you: 'me', socket_id: '0123456789abcdef', lobbies: [], members, moderator: true});
    expect(room.isOpen).toBe(true);
    expect(room.status).toBe('open');
    expect(room.you).toBe('me');
    expect(room.members).toEqual(members);
    expect(room.moderator).toBe(true);
    expect(statuses).toEqual([ 'connecting', 'open' ]);
  });

  it('queues nothing before `ready`: a message sent then is not sent later', () => {
    const room = newRoom();
    room.connect();
    last().accept();
    expect(room.sendMessage({op: 'game_join'})).toBe(false);
    last().say(ready);
    expect(last().ops()).toEqual([ 'hello' ]);
    expect(room.sendMessage({op: 'game_join'})).toBe(true);
    expect(last().ops()).toEqual([ 'hello', 'game_join' ]);
  });

  it('says the screen it is on again on every new socket', () => {
    const { room, socket } = openRoom();
    room.setScreen('games');
    expect(socket.sent.at(-1)).toEqual({op: 'screen', screen: 'games'});
    socket.drop();
    vi.advanceTimersByTime(500);
    last().accept();
    last().say(ready);
    expect(last().sent.at(-1)).toEqual({op: 'screen', screen: 'games'});
  });

  it('a socket never answered `ready` is given up on after 30 s and tried again', () => {
    const room = newRoom();
    room.connect();
    const first = last();
    first.accept();
    vi.advanceTimersByTime(29_000);
    expect(room.status).toBe('connecting');
    expect(FakeSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(1_100);
    expect(room.status).toBe('closed');
    expect(first.closed).not.toBeNull();
    expect(room.lastClose).toMatchObject({code: 1006, reason: 'not ready in time'});
    vi.advanceTimersByTime(1_600);
    expect(FakeSocket.all).toHaveLength(2);
    last().accept();
    last().say(ready);
    expect(room.lastClose).toBeNull();
    // the connect timer is off once ready: with its pings answered the socket lives on
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(20_000);
      last().say({t: 'pong', now: 1});
    }
    expect(room.isOpen).toBe(true);
    expect(room.lastClose).toBeNull();
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('a socket that never even opens is given up on after 30 s too', () => {
    const room = newRoom();
    room.connect();
    // (a network that swallows the handshake leaves a socket connecting for minutes, with nothing to say so)
    vi.advanceTimersByTime(30_000);
    expect(room.status).toBe('closed');
    expect(last().closed).not.toBeNull();
    expect(room.lastClose?.reason).toBe('not ready in time');
  });

  it('a second connect restarts the 30 s wait: the first one\'s timer never closes the second socket', () => {
    const room = newRoom();
    room.connect();
    vi.advanceTimersByTime(20_000);
    room.connect();
    const second = last();
    second.accept();
    // 30 s after the first connect, 10 s into the second's
    vi.advanceTimersByTime(10_000);
    expect(room.status).toBe('connecting');
    expect(second.closed).toBeNull();
    // and the second's own wait still runs: given up 30 s after it began
    vi.advanceTimersByTime(20_000);
    expect(room.status).toBe('closed');
    expect(second.closed).not.toBeNull();
    expect(room.lastClose?.reason).toBe('not ready in time');
  });

  it('a second connect answered `ready` stays open past the first one\'s 30 s', () => {
    const room = newRoom();
    room.connect();
    vi.advanceTimersByTime(20_000);
    room.connect();
    last().accept();
    last().say(ready);
    vi.advanceTimersByTime(15_000);
    expect(room.isOpen).toBe(true);
    expect(room.lastClose).toBeNull();
    expect(last().closed).toBeNull();
  });

  it('a second connect closes the socket it replaces', () => {
    const { room, socket } = openRoom();
    room.connect();
    // it used to stay open, with nothing listening to it
    expect(socket.closed).toBe(1000);
    expect(FakeSocket.all).toHaveLength(2);
    expect(room.status).toBe('connecting');
    last().accept();
    last().say(ready);
    expect(room.isOpen).toBe(true);
  });

  it('a second connect during the wait to reconnect takes the wait\'s place: no third socket opens over it', () => {
    const { room, socket } = openRoom();
    socket.drop();
    // 500 ms from here it would reconnect by itself
    room.connect();
    const second = last();
    second.accept();
    second.say(ready);
    vi.advanceTimersByTime(10_000);
    expect(FakeSocket.all).toHaveLength(2);
    expect(second.closed).toBeNull();
    expect(room.isOpen).toBe(true);
  });

  it('a second `ready` on the same socket keeps one ping going, not two', () => {
    const { socket } = openRoom();
    socket.say(ready);
    vi.advanceTimersByTime(20_000);
    expect(socket.ops().filter((op) => op === 'ping')).toHaveLength(1);
  });
});


describe('reconnecting', () => {
  it('a real close reconnects after the backoff; a fatal code is denied and never retried', () => {
    const { room, socket: first } = openRoom();
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(20_000);
      first.say({t: 'pong', now: 1});
    }
    expect(room.isOpen).toBe(true);
    expect(FakeSocket.all).toHaveLength(1);
    expect(room.lastClose).toBeNull();
    first.drop(4009, 'idle');
    expect(room.status).toBe('closed');
    expect(room.lastClose).toMatchObject({code: 4009, reason: 'idle'});
    vi.advanceTimersByTime(800);
    expect(FakeSocket.all).toHaveLength(2);
    last().drop(4003, 'left');
    expect(room.status).toBe('denied');
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it.each([ 4001, 4003, 4004 ])('close code %i is fatal: denied, no reconnect', (code) => {
    const { room, socket } = openRoom();
    socket.drop(code);
    expect(room.status).toBe('denied');
    expect(room.lastClose?.code).toBe(code);
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it('too many messages (4029) reconnects like any other close', () => {
    const { room, socket } = openRoom();
    socket.drop(4029, 'too many messages');
    expect(room.status).toBe('closed');
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('missed messages (1012, the api\'s pubsub dropped) reconnects and says hello again', () => {
    const { room, socket } = openRoom();
    socket.drop(1012, 'missed messages');
    expect(room.status).toBe('closed');
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(2);
    last().accept();
    expect(last().ops()).toEqual([ 'hello' ]);
  });

  it('knows its socket\'s id only while that socket is open: a reconnect is another socket', () => {
    const { room, socket } = openRoom();
    expect(room.socketId).toBe('0123456789abcdef');
    socket.drop();
    expect(room.socketId).toBeNull();
    vi.advanceTimersByTime(500);
    last().accept();
    expect(room.socketId).toBeNull();
    last().say({...ready, socket_id: 'fedcba9876543210'});
    expect(room.socketId).toBe('fedcba9876543210');
    room.close();
    expect(room.socketId).toBeNull();
  });

  it('waits 0.5, 1, 2, 5 then 10 s between tries, each up to half as long again, and starts over after `ready`', () => {
    // half the most jitter: every wait is 1.25 times its step
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const room = newRoom();
    room.connect();
    for (const wait of [ 625, 1250, 2500, 6250, 12_500, 12_500 ]) {
      const count = FakeSocket.all.length;
      last().drop();
      vi.advanceTimersByTime(wait - 1);
      expect(FakeSocket.all).toHaveLength(count);
      vi.advanceTimersByTime(1);
      expect(FakeSocket.all).toHaveLength(count + 1);
    }
    last().accept();
    last().say(ready);
    last().drop();
    vi.advanceTimersByTime(624);
    expect(FakeSocket.all).toHaveLength(7);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.all).toHaveLength(8);
    expect(room.status).toBe('connecting');
  });

  it('the jitter goes up to half as long again', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const { socket } = openRoom();
    socket.drop();
    // 749.75 ms, which timers (fake and real) cut to whole milliseconds
    vi.advanceTimersByTime(748);
    expect(FakeSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('the reconnect timer is set before `closed` goes out, so a status listener can reconnect now', () => {
    const { room, socket } = openRoom();
    room.onStatus((status) => {
      if (status === 'closed') {
        room.reconnectNow();
      }
    });
    socket.drop();
    expect(FakeSocket.all).toHaveLength(2);
    expect(room.status).toBe('connecting');
  });

  it('reconnectNow opens at once while waiting to reconnect, and the wait it skipped opens nothing later', () => {
    const { room, socket } = openRoom();
    socket.drop();
    room.reconnectNow();
    expect(FakeSocket.all).toHaveLength(2);
    expect(room.status).toBe('connecting');
    vi.advanceTimersByTime(5_000);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('reconnectNow does nothing while open, while connecting, or after close()', () => {
    const { room } = openRoom();
    room.reconnectNow();
    expect(FakeSocket.all).toHaveLength(1);
    const connecting = newRoom();
    connecting.connect();
    connecting.reconnectNow();
    expect(FakeSocket.all).toHaveLength(2);
    last().drop();
    connecting.close();
    connecting.reconnectNow();
    // (longer than any backoff, shorter than the open room's unanswered ping takes to give it up)
    vi.advanceTimersByTime(15_000);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('reconnectNow during the connect wait leaves one connect timer', () => {
    const room = newRoom();
    room.connect();
    last().drop(1006);
    room.reconnectNow();
    const second = last();
    second.accept();
    second.say(ready);
    // answered pings: only an old connect timer could give it up
    vi.advanceTimersByTime(20_000);
    second.say({t: 'pong', now: 1});
    vi.advanceTimersByTime(11_000);
    expect(room.isOpen).toBe(true);
    expect(room.lastClose).toBeNull();
    expect(FakeSocket.all).toHaveLength(2);
  });
});


describe('pong watchdog', () => {
  it('a socket that stops answering pings is given up after 30 s and reconnects', () => {
    const room = newRoom();
    const statuses = statusesOf(room);
    room.connect();
    const first = last();
    first.accept();
    first.say(ready);
    expect(room.isOpen).toBe(true);
    first.say({t: 'lock', step_id: 's', user_id: 'bo'});
    expect(room.locks).toEqual({s: 'bo'});
    vi.advanceTimersByTime(20_000);
    expect(first.ops()).toContain('ping');
    first.say({t: 'pong', now: 1});
    vi.advanceTimersByTime(20_000);
    expect(room.isOpen).toBe(true);
    expect(FakeSocket.all).toHaveLength(1);
    // from here the network swallows everything: the ping at 40s is never answered
    vi.advanceTimersByTime(29_000);
    expect(room.isOpen).toBe(true);
    // 30 s after the unanswered ping (the reconnect is 500 ms after that, no jitter)
    vi.advanceTimersByTime(1_000);
    expect(room.isOpen).toBe(false);
    expect(room.status).toBe('closed');
    expect(first.closed).not.toBeNull();
    expect(room.lastClose).toMatchObject({code: 1006, reason: 'no pong'});
    expect(room.locks).toEqual({});
    // the dead socket finally says something: ignored
    first.say({t: 'lock', step_id: 's', user_id: 'bo'});
    first.say(ready);
    expect(room.status).toBe('closed');
    expect(room.locks).toEqual({});
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(2);
    expect(room.status).toBe('connecting');
    first.drop(1006);
    // the old one closing late changes nothing
    expect(room.status).toBe('connecting');
    expect(FakeSocket.all).toHaveLength(2);
    last().accept();
    last().say(ready);
    expect(room.isOpen).toBe(true);
    expect(statuses).toEqual([ 'connecting', 'open', 'closed', 'connecting', 'open' ]);
  });

  it('pings every 20 s once open, and answered pings keep it open indefinitely', () => {
    const { room, socket } = openRoom();
    vi.advanceTimersByTime(19_999);
    expect(socket.ops()).not.toContain('ping');
    vi.advanceTimersByTime(1);
    expect(socket.ops().filter((op) => op === 'ping')).toHaveLength(1);
    socket.say({t: 'pong', now: 1});
    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(20_000);
      socket.say({t: 'pong', now: 1});
    }
    expect(socket.ops().filter((op) => op === 'ping')).toHaveLength(31);
    expect(room.isOpen).toBe(true);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it('tells pong listeners the api\'s clock and the round trip', () => {
    const { room, socket } = openRoom();
    const pongs: Array<[ number, number ]> = [];
    room.onPong((now, roundTrip) => pongs.push([ now, roundTrip ]));
    room.ping();
    vi.advanceTimersByTime(120);
    socket.say({t: 'pong', now: 12345});
    expect(pongs).toEqual([ [ 12345, 120 ] ]);
  });

  it('a pong the api skipped does not leave a stale ping at the head (two skips, far apart, on a healthy socket)', () => {
    const { room, socket } = openRoom();
    const trips: Array<number> = [];
    room.onPong((_now, roundTrip) => trips.push(roundTrip));
    // pings go out at 20s, 40s, ... The pongs for the ones at 20s and 100s are skipped, every other one comes 50ms later
    for (let second = 20; second <= 200; second += 20) {
      vi.advanceTimersByTime((second === 20) ? 20_000 : 19_950);
      vi.advanceTimersByTime(50);
      if (second !== 20 && second !== 100) {
        socket.say({t: 'pong', now: 1});
      }
    }
    expect(room.isOpen).toBe(true);
    expect(FakeSocket.all).toHaveLength(1);
    expect(room.lastClose).toBeNull();
    // a pong after a skip is taken for the skipped ping's (a ping too long, that once), then they're right again
    expect(trips).toEqual([ 20_050, 50, 50, 20_050, 50, 50, 50, 50 ]);
  });

  it('no pongs at all but the api keeps sending: alive. Once it goes quiet too: given up 30 s later', () => {
    const { room, socket } = openRoom();
    for (let i = 0; i < 12; i++) {
      vi.advanceTimersByTime(10_000);
      socket.say({t: 'members', members: []});
    }
    expect(room.isOpen).toBe(true);
    expect(FakeSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(29_000);
    expect(room.isOpen).toBe(true);
    vi.advanceTimersByTime(1_500);
    expect(room.isOpen).toBe(false);
    expect(room.lastClose?.reason).toBe('no pong');
  });

  it('a game message counts as hearing from the api too', () => {
    const { room, socket } = openRoom();
    vi.advanceTimersByTime(20_000);
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(10_000);
      socket.say({t: 'game.state', game_id: 'g'});
    }
    expect(room.isOpen).toBe(true);
  });

  it('a ping asked for by hand is watched like the others', () => {
    const { room } = openRoom();
    vi.advanceTimersByTime(5_000);
    room.ping();
    vi.advanceTimersByTime(29_999);
    expect(room.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(room.isOpen).toBe(false);
    expect(room.lastClose?.reason).toBe('no pong');
  });

  it('a ping while not open sends nothing and starts no watchdog', () => {
    const room = newRoom();
    room.connect();
    last().accept();
    room.ping();
    expect(last().ops()).toEqual([ 'hello' ]);
    last().say(ready);
    // the ping asked for before `ready` was never sent, so nothing waits for its pong
    vi.advanceTimersByTime(19_000);
    expect(room.isOpen).toBe(true);
  });
});


describe('lobbies', () => {
  it('joins a lobby: sends `editing` with its password or invite and is answered by the lobby\'s `editing`', async () => {
    const { room, socket } = openRoom();
    const join = room.setEditing('a', 'hunter2', 'inv');
    expect(socket.sent.at(-1)).toEqual({op: 'editing', document_id: 'a', password: 'hunter2', invite: 'inv'});
    expect(await peek(join)).toBe('pending');
    expect(room.editingDocument).toBeNull();
    socket.say({t: 'editing', document_id: 'a'});
    expect(await join).toEqual({result: 'ok'});
    expect(room.editingDocument).toBe('a');
    room.sendOp({op: 'remove', step_id: 's'});
    expect(socket.sent.at(-1)).toMatchObject({op: 'remove', step_id: 's', document_id: 'a'});
  });

  it('an answer for another lobby does not answer the join', async () => {
    const { room, socket } = openRoom();
    const join = room.setEditing('a');
    socket.say({t: 'editing', document_id: 'b'});
    expect(await peek(join)).toBe('pending');
  });

  it.each<[ string, object, EditingResult ]>([
    [ 'full', {full: true}, {result: 'full'} ],
    [ 'locked', {error: 50060, message: 'needs a password'}, {result: 'locked', message: 'needs a password'} ],
    [ 'wrong', {error: 50061, message: 'wrong password'}, {result: 'wrong', message: 'wrong password'} ],
    [ 'kicked', {error: 50062, message: 'kicked'}, {result: 'kicked', message: 'kicked'} ],
    [ 'gone', {error: 10001, message: 'no such lobby'}, {result: 'gone', message: 'no such lobby'} ],
  ])('a refusal (%s) answers every join still waiting and leaves it in no lobby', async (_name, answer, result) => {
    const { room, socket } = openRoom();
    const first = room.setEditing('a');
    const second = room.setEditing('b');
    socket.say({t: 'editing', document_id: null, ...answer});
    expect(await first).toEqual(result);
    expect(await second).toEqual(result);
    expect(room.editingDocument).toBeNull();
    // and it isn't asked for again on the next socket
    socket.drop();
    vi.advanceTimersByTime(500);
    last().accept();
    last().say(ready);
    expect(last().ops()).not.toContain('editing');
  });

  it('a join with no answer goes ahead after 8 s (the api still checks saves)', async () => {
    const { room } = openRoom();
    const join = room.setEditing('a');
    vi.advanceTimersByTime(7_999);
    expect(await peek(join)).toBe('pending');
    vi.advanceTimersByTime(1);
    expect(await join).toEqual({result: 'ok'});
    expect(room.editingDocument).toBe('a');
  });

  it('an earlier join\'s 8 s timeout going ahead after a later join was answered does not move it back to the earlier lobby', async () => {
    const { room, socket } = openRoom();
    const earlier = room.setEditing('a');
    vi.advanceTimersByTime(2_000);
    const later = room.setEditing('b');
    vi.advanceTimersByTime(1_000);
    socket.say({t: 'editing', document_id: 'b'});
    expect(await later).toEqual({result: 'ok'});
    expect(room.editingDocument).toBe('b');
    vi.advanceTimersByTime(5_000);
    // the earlier join still settles (its caller isn't left waiting), but the room stays in the later lobby
    expect(await earlier).toEqual({result: 'ok'});
    expect(room.editingDocument).toBe('b');
    room.sendOp({op: 'remove', step_id: 's'});
    expect(socket.sent.at(-1)).toMatchObject({op: 'remove', document_id: 'b'});
  });

  it('a join made before the socket is open is sent once `ready` comes', async () => {
    const room = newRoom();
    room.connect();
    last().accept();
    const join = room.setEditing('a', 'pw');
    expect(last().ops()).toEqual([ 'hello' ]);
    last().say(ready);
    expect(last().sent.at(-1)).toEqual({op: 'editing', document_id: 'a', password: 'pw', invite: undefined});
    last().say({t: 'editing', document_id: 'a'});
    expect(await join).toEqual({result: 'ok'});
    expect(room.editingDocument).toBe('a');
  });

  it('the lobby it is in is asked for again, with its password, on every new socket', () => {
    const { room, socket } = openRoom();
    void room.setEditing('a', 'pw', 'inv');
    socket.say({t: 'editing', document_id: 'a'});
    socket.drop();
    vi.advanceTimersByTime(500);
    last().accept();
    expect(last().ops()).toEqual([ 'hello' ]);
    last().say(ready);
    expect(last().sent.at(-1)).toEqual({op: 'editing', document_id: 'a', password: 'pw', invite: 'inv'});
  });

  it('leaving sends `editing` null, answers at once and is not asked for again on a new socket', async () => {
    const { room, socket } = openRoom();
    void room.setEditing('a');
    socket.say({t: 'editing', document_id: 'a'});
    expect(await room.setEditing(null)).toEqual({result: 'ok'});
    expect(socket.sent.at(-1)).toEqual({op: 'editing', document_id: null});
    expect(room.editingDocument).toBeNull();
    socket.drop();
    vi.advanceTimersByTime(500);
    last().accept();
    last().say(ready);
    expect(last().ops()).not.toContain('editing');
  });

  it('the answer to a leave does not let a join sent right after it through before its own refusal', async () => {
    const { room, socket } = openRoom();
    void room.setEditing(null);
    const join = room.setEditing('a');
    socket.say({t: 'editing', document_id: null});
    expect(await peek(join)).toBe('pending');
    socket.say({t: 'editing', document_id: null, full: true});
    expect(await join).toEqual({result: 'full'});
  });

  it.each([ 'kicked', 'lobby_closed', 'lobby_deleted' ] as const)('`%s` for its lobby puts it in none and it is not asked for again', (t) => {
    const { room, socket } = openRoom();
    void room.setEditing('a');
    socket.say({t: 'editing', document_id: 'a'});
    // another lobby's changes nothing
    socket.say({t, document_id: 'b', by: 'bo'});
    expect(room.editingDocument).toBe('a');
    socket.say({t, document_id: 'a', by: 'bo'});
    expect(room.editingDocument).toBeNull();
    socket.drop();
    vi.advanceTimersByTime(500);
    last().accept();
    last().say(ready);
    expect(last().ops()).not.toContain('editing');
  });
});


describe('step locks', () => {
  it('a lock is held until its holder unlocks it; someone else\'s unlock changes nothing', () => {
    const { room, socket } = openRoom();
    socket.say({t: 'lock', step_id: 's', user_id: 'bo'});
    expect(room.locks).toEqual({s: 'bo'});
    socket.say({t: 'unlock', step_id: 's', user_id: 'al'});
    expect(room.locks).toEqual({s: 'bo'});
    socket.say({t: 'unlock', step_id: 's', user_id: 'bo'});
    expect(room.locks).toEqual({});
  });

  it('a lock runs out 10 s after it was last renewed', () => {
    const { room, socket } = openRoom();
    const heard: Array<string> = [];
    room.subscribe((event) => heard.push(event.t));
    socket.say({t: 'lock', step_id: 's', user_id: 'bo'});
    vi.advanceTimersByTime(9_000);
    socket.say({t: 'lock', step_id: 's', user_id: 'bo'});
    vi.advanceTimersByTime(9_999);
    expect(room.locks).toEqual({s: 'bo'});
    vi.advanceTimersByTime(1);
    expect(room.locks).toEqual({});
    // listeners hear it run out like an unlock
    expect(heard).toEqual([ 'lock', 'lock', 'unlock' ]);
  });

  it('the answer to a join gives the lobby\'s locks, replacing the ones it had', () => {
    const { room, socket } = openRoom();
    socket.say({t: 'lock', step_id: 'old', user_id: 'bo'});
    void room.setEditing('a');
    socket.say({t: 'editing', document_id: 'a', locks: {s1: 'al', s2: 'cy'}});
    expect(room.locks).toEqual({s1: 'al', s2: 'cy'});
    // each lasts 10 s from the answer unless renewed
    vi.advanceTimersByTime(10_000);
    expect(room.locks).toEqual({});
  });

  it('locks are cleared when the socket closes, and stay clear on the new socket until a join says which are held', () => {
    const { room, socket } = openRoom();
    socket.say({t: 'lock', step_id: 's', user_id: 'bo'});
    socket.drop();
    // who holds which step can't be heard of while it's down
    expect(room.locks).toEqual({});
    vi.advanceTimersByTime(500);
    last().accept();
    last().say(ready);
    expect(room.locks).toEqual({});
  });

  it('a new socket\'s `ready` starts with no locks', () => {
    const { room, socket } = openRoom();
    socket.say({t: 'lock', step_id: 's', user_id: 'bo'});
    socket.say(ready);
    expect(room.locks).toEqual({});
  });
});


describe('listeners', () => {
  it('a throwing listener stops neither the others nor the reconnect', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const room = newRoom();
    const seen: Array<string> = [];
    room.onStatus(() => {
      throw new Error('boom');
    });
    room.onStatus((status) => seen.push(status));
    room.subscribe(() => {
      throw new Error('boom');
    });
    room.subscribe((event) => seen.push(event.t));
    room.connect();
    last().accept();
    last().say(ready);
    expect(seen).toEqual([ 'connecting', 'open', 'ready' ]);
    last().drop(1006);
    vi.advanceTimersByTime(800);
    expect(FakeSocket.all).toHaveLength(2);
    expect(room.status).toBe('connecting');
    expect(error).toHaveBeenCalledWith('[editor room] a listener failed', expect.any(Error));
  });

  it('a throwing game or pong listener stops neither the others', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { room, socket } = openRoom();
    const seen: Array<string> = [];
    room.onGame(() => {
      throw new Error('boom');
    });
    room.onGame((message) => seen.push(message.t));
    room.onPong(() => {
      throw new Error('boom');
    });
    room.onPong(() => seen.push('pong'));
    socket.say({t: 'game.state', game_id: 'g'});
    room.ping();
    socket.say({t: 'pong', now: 1});
    expect(seen).toEqual([ 'game.state', 'pong' ]);
  });

  it('game messages go to game listeners only, everything else to subscribers', () => {
    const { room, socket } = openRoom();
    const events: Array<string> = [];
    const games: Array<RoomGameMessage> = [];
    room.subscribe((event) => events.push(event.t));
    room.onGame((message) => games.push(message));
    socket.say({t: 'game.ready', game_id: 'g', now: 5});
    socket.say({t: 'members', members: []});
    expect(games).toEqual([ {t: 'game.ready', game_id: 'g', now: 5} ]);
    expect(events).toEqual([ 'members' ]);
  });

  it('a message that is not JSON is dropped without a word to anyone', () => {
    const { room, socket } = openRoom();
    const events: Array<string> = [];
    room.subscribe((event) => events.push(event.t));
    socket.sayText('{nope');
    expect(events).toEqual([]);
    expect(room.isOpen).toBe(true);
  });

  it('a listener taken off during a dispatch is not told, one added is told next time', () => {
    const room = newRoom();
    const seen: Array<string> = [];
    let offSecond: () => void = () => undefined;
    room.subscribe((event) => {
      if (event.t === 'members') {
        offSecond();
        room.subscribe(() => seen.push('late'));
      }
    });
    offSecond = room.subscribe((event) => seen.push(`second:${event.t}`));
    room.connect();
    last().accept();
    last().say(ready);
    last().say({t: 'members', members: []});
    expect(seen).toEqual([ 'second:ready' ]);
    last().say({t: 'members', members: []});
    expect(seen.filter((item) => item === 'late')).toHaveLength(1);
  });

  it('an unsubscribed listener hears nothing more', () => {
    const { room, socket } = openRoom();
    const seen: Array<string> = [];
    const off = room.subscribe((event) => seen.push(event.t));
    const offStatus = room.onStatus((status) => seen.push(status));
    socket.say({t: 'members', members: []});
    off();
    offStatus();
    socket.say({t: 'members', members: []});
    socket.drop();
    expect(seen).toEqual([ 'members' ]);
  });
});


describe('stale sockets', () => {
  it('a socket replaced by a second connect is no longer heard', () => {
    const room = newRoom();
    const events: Array<string> = [];
    room.subscribe((event) => events.push(event.t));
    room.connect();
    const first = last();
    first.accept();
    room.connect();
    const second = last();
    second.accept();
    first.say(ready);
    expect(room.status).toBe('connecting');
    expect(events).toEqual([]);
    first.drop();
    expect(room.status).toBe('connecting');
    second.say(ready);
    expect(room.isOpen).toBe(true);
    expect(events).toEqual([ 'ready' ]);
  });

  it('a socket given up on that delivers a pong late does not answer the new socket\'s ping', () => {
    const { room, socket: first } = openRoom();
    const trips: Array<number> = [];
    room.onPong((_now, roundTrip) => trips.push(roundTrip));
    // the ping at 20 s is never answered: given up on at 50 s
    vi.advanceTimersByTime(50_000);
    expect(room.lastClose?.reason).toBe('no pong');
    vi.advanceTimersByTime(500);
    last().accept();
    last().say(ready);
    vi.advanceTimersByTime(20_000);
    first.say({t: 'pong', now: 1});
    expect(trips).toEqual([]);
  });
});


describe('close', () => {
  it('close(): messages already on their way are ignored, no timers left running', () => {
    const room = newRoom();
    room.connect();
    const socket = last();
    socket.accept();
    room.close();
    expect(socket.closed).toBe(1000);
    socket.say(ready);
    expect(room.status).not.toBe('open');
    expect(room.isOpen).toBe(false);
    vi.advanceTimersByTime(120_000);
    expect(FakeSocket.all).toHaveLength(1);
    expect(socket.ops()).not.toContain('ping');
  });

  it('close() on an open room with a lock held, pings waiting and a pointer queued clears every timer', () => {
    const { room, socket } = openRoom();
    void room.setEditing('a');
    socket.say({t: 'editing', document_id: 'a', locks: {s: 'bo'}});
    vi.advanceTimersByTime(20_000);
    room.ping();
    room.sendCursor({at: 'preview', x: 0.5, y: 0.5});
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    room.close();
    expect(vi.getTimerCount()).toBe(0);
    expect(room.isOpen).toBe(false);
  });

  it('close() while waiting to reconnect clears the wait: nothing reconnects', () => {
    const { room, socket } = openRoom();
    socket.drop();
    room.close();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it('close() while connecting clears the connect timer', () => {
    const room = newRoom();
    room.connect();
    room.close();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(1);
    expect(room.lastClose).toBeNull();
  });

  it('connect() after close() starts again', () => {
    const { room } = openRoom();
    room.close();
    room.connect();
    last().accept();
    last().say(ready);
    expect(FakeSocket.all).toHaveLength(2);
    expect(room.isOpen).toBe(true);
  });

  it('close() says `closed`, once: the status used to stay open and nothing listening was told', () => {
    const { room } = openRoom();
    const statuses = statusesOf(room);
    room.close();
    expect(room.status).toBe('closed');
    expect(statuses).toEqual([ 'closed' ]);
    room.close();
    expect(statuses).toEqual([ 'closed' ]);
  });

  it('close() while waiting to reconnect is already `closed`: nothing is said twice', () => {
    const { room, socket } = openRoom();
    const statuses = statusesOf(room);
    socket.drop();
    room.close();
    expect(statuses).toEqual([ 'closed' ]);
  });

  it('close() on a room the api turned away for good leaves it `denied`', () => {
    const { room, socket } = openRoom();
    const statuses = statusesOf(room);
    socket.drop(4001);
    room.close();
    expect(room.status).toBe('denied');
    expect(statuses).toEqual([ 'denied' ]);
  });

  it('close() with a join still waiting: its wait stops, and it never "goes ahead" on the closed room', async () => {
    const { room } = openRoom();
    const join = room.setEditing('a');
    room.close();
    expect(vi.getTimerCount()).toBe(0);
    // the 8 s after which an unanswered join went ahead
    vi.advanceTimersByTime(8_000);
    expect(room.editingDocument).toBeNull();
    expect(await peek(join)).toBe('pending');
  });

  it('close() with a kick still waiting answers it "not connected", with no timer left', async () => {
    const { room } = openRoom();
    const kick = room.kick('a', 'bo');
    room.close();
    expect(vi.getTimerCount()).toBe(0);
    expect(await kick).toEqual({ok: false, message: 'Not connected, try again in a moment'});
  });

  it('close() forgets the step locks', () => {
    const { room, socket } = openRoom();
    void room.setEditing('a');
    socket.say({t: 'editing', document_id: 'a', locks: {s: 'bo'}});
    expect(room.locks).toEqual({s: 'bo'});
    room.close();
    expect(room.locks).toEqual({});
  });
});
