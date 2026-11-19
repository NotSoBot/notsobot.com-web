import { useCallback, useEffect, useRef, useState } from 'react';


// Copies text and reports `copied` for `duration` ms, for a check mark or a "Copied" label. Copying again restarts the
// timer (instead of an earlier copy's timer cutting the new one short), and unmounting clears it.
// `copy` resolves to whether the clipboard write worked, for callers that toast a failure.
export function useCopied(duration = 1500) {
  const [ copied, setCopied ] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (value: string): Promise<boolean> => {
    try {
      if (!navigator.clipboard) {
        return false;
      }
      await navigator.clipboard.writeText(value);
    } catch {
      return false;
    }
    window.clearTimeout(timer.current);
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), duration);
    return true;
  }, [duration]);

  return {copied, copy};
}
