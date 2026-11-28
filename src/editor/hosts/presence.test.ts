import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadDashboardText, translate } from '@/i18n';

import { PHASE_SCREENS, type Phase } from './activityPhase';
import type { PipStatus } from './pip';
import { PRESENCE_MIN_GAP, PresenceSender, presenceOf, presenceSession, type PresenceActivity } from './presence';


const editor = (changes: Partial<Extract<PipStatus, {kind: 'editor'}>> = {}): PipStatus => ({
  kind: 'editor',
  title: 'private-file-name.png',
  previewUrl: null,
  previewIsVideo: false,
  people: 1,
  watching: false,
  room: {name: null, locked: false, solo: false},
  ...changes,
});


// one phase of every kind, the way the Activity has them
const PHASES: {[K in Phase['kind']]: Extract<Phase, {kind: K}>} = {
  loading: {kind: 'loading', step: 'sdk'},
  failed: {kind: 'failed', message: 'editor.activity.failed'},
  lobbies: {kind: 'lobbies'},
  choice: {kind: 'choice'},
  games_frame: {kind: 'games_frame', launch: {screen: 'tab'}},
  start: {kind: 'start', mode: 'public'},
  editor: {kind: 'editor', documentId: 'doc1', solo: false},
  server_settings: {kind: 'server_settings', guildId: '100000000000000001'},
  user_settings: {kind: 'user_settings'},
};


describe('presenceOf', () => {
  // the editor's and the games' strings are the dashboard's chunk, the Activity has it loaded before any screen
  beforeAll(async () => {
    await loadDashboardText();
  });

  it('says a password room is private and a solo one is solo, never their names', () => {
    const locked = presenceOf(PHASES.editor, editor({room: {name: 'secret edit', locked: true, solo: false}}), translate);
    expect(locked?.details).toBe('Media Editor • Private room');
    expect(JSON.stringify(locked)).not.toContain('secret');
    expect(presenceOf(PHASES.editor, editor({room: {name: null, locked: false, solo: true}}), translate)?.details).toBe('Media Editor • Solo');
  });

  it('leaves the party out when they are alone', () => {
    expect(presenceOf(PHASES.editor, editor(), translate)?.party).toBeUndefined();
  });

  it('says editing or watching an edit and the lobby’s name, never the file name', () => {
    expect(presenceOf(PHASES.editor, editor({people: 3}), translate)).toEqual({type: 0, details: 'Media Editor', state: 'Editing', party: {size: [3, 10]}});
    expect(presenceOf(PHASES.editor, editor({room: {name: 'Meme lab', locked: false, solo: false}}), translate)?.details).toBe('Media Editor • Meme lab');
    expect(presenceOf(PHASES.editor, editor({watching: true}), translate)?.state).toBe('Watching an edit');
    expect(JSON.stringify(presenceOf(PHASES.editor, editor(), translate))).not.toContain('private');
  });

  it('goes by the screen when the status is a leftover from another one', () => {
    // the edit's status is still there for a render after leaving it
    expect(presenceOf(PHASES.lobbies, editor(), translate)).toEqual({type: 0, details: 'Media Editor', state: 'Starting an edit'});
  });

  it('says nothing while the games half is on: it says its own through the shell', () => {
    expect(presenceOf(PHASES.games_frame, null, translate)).toBeNull();
    expect(presenceOf(PHASES.games_frame, editor(), translate)).toBeNull();
  });

  it('says the main menu and the settings', () => {
    expect(presenceOf(PHASES.choice, null, translate)).toEqual({type: 0, details: 'Main menu', state: 'Choosing what to do'});
    expect(presenceOf(PHASES.server_settings, null, translate)).toEqual({type: 0, details: 'Settings', state: 'Server settings'});
    expect(presenceOf(PHASES.user_settings, null, translate)).toEqual({type: 0, details: 'Settings', state: 'Personal settings'});
  });

  it('keeps an edit’s timer through a rename', () => {
    const before = presenceOf(PHASES.editor, editor({room: {name: 'Meme lab', locked: false, solo: false}}), translate)!;
    const after = presenceOf(PHASES.editor, editor({room: {name: 'Meme lab 2', locked: false, solo: false}}), translate)!;
    expect(before.details).not.toBe(after.details);
    expect(presenceSession(PHASES.editor, before)).toBe(presenceSession(PHASES.editor, after));
    expect(presenceSession(PHASES.choice, presenceOf(PHASES.choice, null, translate)!)).not.toBe(presenceSession(PHASES.editor, before));
  });

  it('has a line for every screen but startup, failure and the games half, inside Discord’s lengths', () => {
    for (const screen of Object.keys(PHASE_SCREENS) as Array<keyof typeof PHASE_SCREENS>) {
      const activity = presenceOf(PHASES[screen], null, translate);
      if (screen === 'loading' || screen === 'failed' || screen === 'games_frame') {
        expect(activity).toBeNull();
        continue;
      }
      expect(activity?.details.length).toBeGreaterThanOrEqual(2);
      expect(activity?.details.length).toBeLessThanOrEqual(128);
      expect(activity?.state?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});


describe('PresenceSender', () => {
  let now = 1_000_000;
  let sent: Array<PresenceActivity>;
  let sender: PresenceSender;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 1_000_000;
    sent = [];
    sender = new PresenceSender(async (activity) => {
      sent.push(activity);
    }, () => now);
  });

  afterEach(() => {
    sender.close();
    vi.useRealTimers();
  });

  const advance = (ms: number) => {
    now += ms;
    vi.advanceTimersByTime(ms);
  };

  it('sends the first one at once, with the time it started', () => {
    sender.update({type: 0, details: 'Flag Guesser', state: 'In the lobby'});
    expect(sent).toEqual([{type: 0, details: 'Flag Guesser', state: 'In the lobby', timestamps: {start: 1_000_000}}]);
  });

  it('sends the same one once', () => {
    sender.update({type: 0, details: 'Flag Guesser'});
    advance(PRESENCE_MIN_GAP);
    sender.update({type: 0, details: 'Flag Guesser'});
    advance(PRESENCE_MIN_GAP);
    expect(sent).toHaveLength(1);
  });

  it('waits out the gap and sends only the newest', () => {
    sender.update({type: 0, details: 'Flag Guesser', state: 'Flag 1 of 10'});
    sender.update({type: 0, details: 'Flag Guesser', state: 'Flag 2 of 10'});
    sender.update({type: 0, details: 'Flag Guesser', state: 'Flag 3 of 10'});
    expect(sent).toHaveLength(1);
    advance(PRESENCE_MIN_GAP);
    expect(sent.map((activity) => activity.state)).toEqual(['Flag 1 of 10', 'Flag 3 of 10']);
  });

  it('keeps the timer while the session is the same, whatever the first line says', () => {
    sender.update({type: 0, details: 'Flag Guesser • Friday flags'}, 'game:room1');
    advance(10_000);
    sender.update({type: 0, details: 'Flag Guesser • Saturday flags'}, 'game:room1');
    advance(10_000);
    sender.update({type: 0, details: 'Flag Guesser • Saturday flags'}, 'game:room2');
    expect(sent.map((activity) => activity.timestamps?.start)).toEqual([1_000_000, 1_000_000, 1_020_000]);
  });

  it('keeps the timer through a game and starts it again on another', () => {
    sender.update({type: 0, details: 'Flag Guesser', state: 'In the lobby'});
    advance(10_000);
    sender.update({type: 0, details: 'Flag Guesser', state: 'Flag 1 of 10'});
    advance(10_000);
    sender.update({type: 0, details: 'Picking a game'});
    expect(sent.map((activity) => activity.timestamps?.start)).toEqual([1_000_000, 1_000_000, 1_020_000]);
  });

  it('sends the same one again after a failure', async () => {
    let fail = true;
    const send = vi.fn(async () => {
      if (fail) {
        throw new Error('rpc');
      }
    });
    const flaky = new PresenceSender(send, () => now);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    flaky.update({type: 0, details: 'Media Editor'});
    // the rejection's handler runs
    await Promise.resolve();
    await Promise.resolve();
    fail = false;
    advance(PRESENCE_MIN_GAP);
    flaky.update({type: 0, details: 'Media Editor'});
    expect(send).toHaveBeenCalledTimes(2);
    flaky.close();
    warn.mockRestore();
  });

  it('sends nothing after close', () => {
    sender.update({type: 0, details: 'Flag Guesser', state: 'Flag 1 of 10'});
    sender.update({type: 0, details: 'Flag Guesser', state: 'Flag 2 of 10'});
    sender.close();
    advance(PRESENCE_MIN_GAP * 2);
    sender.update({type: 0, details: 'Media Editor'});
    expect(sent).toHaveLength(1);
  });
});
