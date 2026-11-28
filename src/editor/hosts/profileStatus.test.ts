import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_STATUS_SCOPE, ProfileStatusController, type ProfileStatusDeps } from './profileStatus';


const REFUSED = {code: 5012, message: 'Command not available for this application'};
const CANCELLED = {code: 5000, message: 'User cancelled authorization'};

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

// lets the controller's promise chain settle
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));


describe('ProfileStatusController', () => {
  let storage: ReturnType<typeof memoryStorage>;
  let authenticated: ReadonlyArray<string> | null;
  let authorize: ReturnType<typeof vi.fn<ProfileStatusDeps['authorize']>>;
  let resend: ReturnType<typeof vi.fn<() => void>>;
  let controller: ProfileStatusController;

  const make = () => {
    controller = new ProfileStatusController({authorize, authenticated: () => authenticated, resend, storage});
    return controller;
  };

  beforeEach(() => {
    storage = memoryStorage();
    authenticated = null;
    authorize = vi.fn(async () => {
      authenticated = ['identify', PROFILE_STATUS_SCOPE];
      return authenticated;
    });
    resend = vi.fn();
  });

  afterEach(() => {
    controller?.close();
    vi.useRealTimers();
  });

  it('asks on a join once the line was refused, then sends it again and remembers', async () => {
    make();
    controller.noteSend(REFUSED);
    expect(authorize).not.toHaveBeenCalled();
    controller.joined();
    expect(controller.snapshot().asking).toBe(true);
    await settle();
    expect(authorize).toHaveBeenCalledTimes(1);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(controller.snapshot()).toMatchObject({choice: 'on', granted: true, asking: false});
    expect(storage.values.get('nsb.activity.profile_status')).toBe('on');
  });

  it('never asks where the line is taken', async () => {
    make();
    controller.noteSend();
    controller.joined();
    await settle();
    expect(authorize).not.toHaveBeenCalled();
  });

  it('remembers a closed screen and asks no more on joins', async () => {
    authorize.mockRejectedValue(CANCELLED);
    make();
    controller.noteSend(REFUSED);
    controller.joined();
    await settle();
    expect(controller.snapshot().choice).toBe('off');
    expect(storage.values.get('nsb.activity.profile_status')).toBe('off');
    controller.joined();
    await settle();
    expect(authorize).toHaveBeenCalledTimes(1);
    // a new launch on this device doesn't either
    controller.close();
    make();
    controller.noteSend(REFUSED);
    controller.joined();
    await settle();
    expect(authorize).toHaveBeenCalledTimes(1);
  });

  it('keeps asking on joins after a failure that wasn\'t their answer', async () => {
    authorize.mockRejectedValueOnce(new Error('network'));
    make();
    controller.noteSend(REFUSED);
    controller.joined();
    await settle();
    expect(controller.snapshot().choice).toBe('ask');
    controller.joined();
    await settle();
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(controller.snapshot().choice).toBe('on');
  });

  it('waits for the first answer when a join comes before it', async () => {
    vi.useFakeTimers();
    make();
    controller.joined();
    expect(authorize).not.toHaveBeenCalled();
    controller.noteSend(REFUSED);
    expect(authorize).toHaveBeenCalledTimes(1);
  });

  it('stops waiting after a while', () => {
    vi.useFakeTimers();
    make();
    controller.joined();
    vi.advanceTimersByTime(11 * 1000);
    controller.noteSend(REFUSED);
    expect(authorize).not.toHaveBeenCalled();
  });

  it('can\'t add the scope to a connection already signed in without it', async () => {
    authenticated = ['identify'];
    make();
    controller.noteSend(REFUSED);
    controller.joined();
    await settle();
    expect(authorize).not.toHaveBeenCalled();
    // a join remembers nothing, the switch saves the pick for the next launch
    expect(controller.snapshot().choice).toBe('ask');
    await expect(controller.turnOn()).resolves.toBe('reopen');
    expect(controller.snapshot().choice).toBe('on');
  });

  it('asks by itself once a launch when turned on', async () => {
    storage = memoryStorage({'nsb.activity.profile_status': 'on'});
    authorize.mockRejectedValue(new Error('network'));
    make();
    expect(controller.wanted).toBe(true);
    controller.noteSend(REFUSED);
    await settle();
    controller.noteSend(REFUSED);
    await settle();
    expect(authorize).toHaveBeenCalledTimes(1);
  });

  it('the switch asks whatever was chosen before, and off stops the asking', async () => {
    storage = memoryStorage({'nsb.activity.profile_status': 'off'});
    make();
    controller.noteSend();
    await expect(controller.turnOn()).resolves.toBe('granted');
    expect(controller.snapshot().choice).toBe('on');
    controller.turnOff();
    expect(controller.snapshot()).toMatchObject({choice: 'off', granted: true});
    expect(controller.wanted).toBe(false);
  });

  it('a share\'s sign-in with the scope sends the refused line again', () => {
    make();
    controller.noteSend(REFUSED);
    controller.noteAuthenticated(['identify', PROFILE_STATUS_SCOPE]);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(controller.snapshot().granted).toBe(true);
  });

  it('keeps one snapshot until something changes', () => {
    make();
    const first = controller.snapshot();
    controller.noteSend(new Error('something else'));
    expect(controller.snapshot()).toBe(first);
    controller.noteSend();
    expect(controller.snapshot()).not.toBe(first);
  });
});
