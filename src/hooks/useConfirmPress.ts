import { useEffect, useRef, useState } from 'react';


// how long a two-step button stays armed
const CONFIRM_PRESS_MS = 3000;
// a second press sooner than this after arming is the tail of a double-click, not a confirmation
const DOUBLE_CLICK_MS = 400;


// A light two-step for a removal that doesn't need a dialog: the first press arms `key` (its button then asks, e.g.
// "Remove?"), a second one on the same key while it's armed runs the action, otherwise it resets by itself
export function useConfirmPress(): {armed: string | null, press: (key: string, action: () => void) => void} {
  const [ armed, setArmed ] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const armedAt = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const press = (key: string, action: () => void) => {
    if (armed === key) {
      if (Date.now() - armedAt.current < DOUBLE_CLICK_MS) {
        return;
      }
      window.clearTimeout(timer.current);
      setArmed(null);
      action();
      return;
    }
    window.clearTimeout(timer.current);
    armedAt.current = Date.now();
    setArmed(key);
    timer.current = window.setTimeout(() => setArmed(null), CONFIRM_PRESS_MS);
  };
  return {armed, press};
}
