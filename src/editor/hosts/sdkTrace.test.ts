import { describe, expect, it } from 'vitest';

import { describeSdkMessage } from './sdkTrace';


describe('describeSdkMessage', () => {
  it('names the opcode and the handshake’s fields', () => {
    expect(describeSdkMessage([0, {v: 1, encoding: 'json', client_id: '1', frame_id: 'f-1', sdk_version: '2.5.0'}]))
      .toBe('HANDSHAKE v=1 frame_id=f-1 sdk_version=2.5.0');
  });

  it('keeps a CLOSE’s code and message: why Discord refused', () => {
    expect(describeSdkMessage([2, {code: 4000, message: 'Already connected'}])).toBe('CLOSE code=4000 message=Already connected');
  });

  it('never logs a frame’s arguments (authenticate carries the access token)', () => {
    const line = describeSdkMessage([1, {cmd: 'AUTHENTICATE', nonce: 'n', args: {access_token: 'secret-token'}}]);
    expect(line).toBe('FRAME cmd=AUTHENTICATE evt=undefined');
    expect(line).not.toContain('secret-token');
  });

  it('keeps an error answer’s code and message', () => {
    expect(describeSdkMessage([1, {cmd: 'AUTHORIZE', evt: 'ERROR', data: {code: 4006, message: 'Not authenticated or invalid scope'}}]))
      .toBe('FRAME cmd=AUTHORIZE evt=ERROR code=4006 message=Not authenticated or invalid scope');
  });

  it('lists only the keys of a HELLO or anything unknown', () => {
    expect(describeSdkMessage([3, {frame_id: 'f-1', platform: 'desktop'}])).toBe('HELLO keys=frame_id,platform');
    expect(describeSdkMessage('hi')).toBe('not an SDK message (string)');
  });
});
