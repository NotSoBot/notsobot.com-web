import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';


// A hook rendered on real React in the test's document (happy-dom), without @testing-library: a component that calls
// the hook and keeps what it returned. Every render, unmount and timer step goes through `act`, so effects run and
// state updates are rendered before the test reads `result.current`. A state update that escapes `act` (a promise
// that settles between two of them) shows as React's "not wrapped in act" warning: that's a test to fix

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

// tells React it's under test: it checks updates are inside `act` and runs them there, not on its scheduler
globalThis.IS_REACT_ACT_ENVIRONMENT = true;


export interface RenderHookResult<T, P> {
  // what the hook returned on its latest render
  result: {current: T},
  // renders again, with new props (or, with none given, the same ones)
  rerender: (...props: [] | [P]) => void,
  // its effects' cleanups run, nothing renders after
  unmount: () => void,
}

// what's mounted and not yet unmounted, for `unmountAll` (a test's `afterEach`)
const mounted = new Set<() => void>();


export function renderHook<T, P = undefined>(
  hook: (props: P) => T,
  options: {initialProps?: P, strict?: boolean} = {},
): RenderHookResult<T, P> {
  const result = {current: undefined as T};
  let props = options.initialProps as P;

  function Probe(): null {
    result.current = hook(props);
    return null;
  }

  const container = document.createElement('div');
  const root: Root = createRoot(container);
  // StrictMode runs every effect, its cleanup, then the effect again on mount: what a hook's cleanup has to survive
  const tree = () => (options.strict) ? createElement(StrictMode, null, createElement(Probe)) : createElement(Probe);

  act(() => {
    root.render(tree());
  });

  let alive = true;
  const unmount = () => {
    if (!alive) {
      return;
    }
    alive = false;
    mounted.delete(unmount);
    act(() => {
      root.unmount();
    });
  };
  mounted.add(unmount);

  const rerender = (...next: [] | [P]) => {
    if (next.length) {
      props = next[0];
    }
    act(() => {
      root.render(tree());
    });
  };

  return {result, rerender, unmount};
}


// every hook still mounted, unmounted (their cleanups run inside `act`)
export function unmountAll(): void {
  for (const unmount of [...mounted]) {
    unmount();
  }
}


// Moves the fake clock (`vi.useFakeTimers()`) on by `ms` inside `act`: the timers due run in order, and the promises
// each one starts settle before the next (and before this resolves), their state updates rendered. `advance()` only
// lets what's already settling finish
export async function advance(ms: number = 0): Promise<void> {
  if (!vi.isFakeTimers()) {
    throw new Error('advance() moves the fake clock: call vi.useFakeTimers() first');
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    // a promise chain started by the last timer (or by none) finishes too
    await vi.advanceTimersByTimeAsync(0);
  });
}
