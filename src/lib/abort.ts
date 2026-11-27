// `AbortSignal.timeout` and `AbortSignal.any` where the browser has them, the same thing by hand where it doesn't.
// `any` only came with Safari 17.4, and inside Discord on an iPhone the Activity runs in the system's web view: on iOS
// 16 to 17.3 every request that was handed a signal threw before it was sent

// aborts after `ms` with a `TimeoutError`, like the browser's own
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms);
  return controller.signal;
}

// aborts as soon as one of `signals` does, with its reason
export function anySignal(signals: Array<AbortSignal>): AbortSignal {
  if (signals.length === 1) {
    return signals[0];
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {once: true, signal: controller.signal});
  }
  return controller.signal;
}
