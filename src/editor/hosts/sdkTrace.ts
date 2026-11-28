import type { DiscordSDK } from '@discord/embedded-app-sdk';

import { activityLog } from '../activityLog';


// The Discord SDK's postMessage traffic while the Activity starts, into the owners' log (../activityLog, source `sdk`):
// for a start that hangs inside Discord, where there's no devtools (the half switch, notsogames-split-plan.md step 0).
// Opcodes and command/event names only, and a CLOSE's code and message: never a payload (`authenticate` carries the
// access token)

// embedded-app-sdk's opcodes (and Discord's client's, webarchive module 440454)
const OPCODES: Readonly<Record<number, string>> = {0: 'HANDSHAKE', 1: 'FRAME', 2: 'CLOSE', 3: 'HELLO'};
const MAX_TEXT = 160;

function short(value: unknown): string {
  const text = (typeof value === 'string') ? value : JSON.stringify(value);
  return (text && text.length > MAX_TEXT) ? `${text.slice(0, MAX_TEXT)}…` : String(text);
}

// one message as a line: `FRAME cmd=AUTHORIZE evt=null nonce=…`, `CLOSE code=4000 message=Already connected`
export function describeSdkMessage(message: unknown): string {
  if (!Array.isArray(message)) {
    return `not an SDK message (${typeof message})`;
  }
  const [ opcode, payload ] = message as [unknown, Record<string, unknown> | null | undefined];
  const name = (typeof opcode === 'number') ? (OPCODES[opcode] ?? `opcode ${opcode}`) : `opcode ${short(opcode)}`;
  if (!payload || typeof payload !== 'object') {
    return name;
  }
  const parts: Array<string> = [name];
  switch (name) {
    case 'HANDSHAKE':
      parts.push(`v=${short(payload.v)}`, `frame_id=${short(payload.frame_id)}`, `sdk_version=${short(payload.sdk_version)}`);
      break;
    case 'CLOSE':
      parts.push(`code=${short(payload.code)}`, `message=${short(payload.message)}`);
      break;
    case 'FRAME': {
      parts.push(`cmd=${short(payload.cmd)}`, `evt=${short(payload.evt)}`);
      // an error answer says why (its code and message only)
      const data = payload.data as Record<string, unknown> | null | undefined;
      if (payload.evt === 'ERROR' && data && typeof data === 'object') {
        parts.push(`code=${short(data.code)}`, `message=${short(data.message)}`);
      }
      break;
    }
    default:
      parts.push(`keys=${Object.keys(payload).join(',')}`);
  }
  return parts.join(' ');
}

// everything that arrives at this window while the Activity starts, from Discord or anything else. Call before the SDK
// exists, so the first answers are in it too; the returned function stops it
export function traceIncoming(): () => void {
  const listener = (event: MessageEvent) => {
    activityLog.add('sdk', `← ${event.origin || '(no origin)'} ${describeSdkMessage(event.data)}`);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

// what the SDK sends from now on (its constructor's handshake already went: logged from its fields here). Swaps the
// SDK's `source` (private in its types, a plain field at run time) for a stand-in that logs and passes every message on
export function traceOutgoing(sdk: DiscordSDK): void {
  const fields = sdk as unknown as {source: Window | null, sourceOrigin: string, frameId: string, platform: string};
  const parent = fields.source;
  activityLog.add('sdk', `→ HANDSHAKE (constructor) to ${fields.sourceOrigin || '(empty)'}, frame_id=${fields.frameId}, platform=${fields.platform}, parent ${(parent === window.parent) ? 'window.parent' : (parent) ? 'opener' : 'none'}`);
  if (!parent) {
    return;
  }
  fields.source = {
    postMessage: (message: unknown, targetOrigin: string, transfer?: Array<Transferable>) => {
      activityLog.add('sdk', `→ ${describeSdkMessage(message)} to ${targetOrigin}`);
      parent.postMessage(message, targetOrigin, transfer);
    },
  } as unknown as Window;
}

// the page's own facts before anything starts: where it is, where it came from
export function traceStart(referrer: string): void {
  const query = new URLSearchParams(window.location.search);
  activityLog.add('startup', `page ${window.location.pathname} frame_id=${query.get('frame_id')} platform=${query.get('platform')} referrer=${referrer || '(none)'}`);
}
