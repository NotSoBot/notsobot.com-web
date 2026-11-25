import { useCallback, useEffect, useRef, useState } from 'react';


// The clipboard api isn't there (or is refused) in some frames, Discord's activity iframe among them: the old way,
// selecting a hidden textarea and `execCommand('copy')`, still works there from a click
function copyBySelection(value: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  const selection = document.getSelection();
  const previous = (selection && selection.rangeCount) ? selection.getRangeAt(0) : null;
  textarea.select();
  let worked = false;
  try {
    worked = document.execCommand('copy');
  } catch {
    worked = false;
  }
  textarea.remove();
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return worked;
}


// Copies text and reports `copied` for `duration` ms, for a check mark or a "Copied" label. Copying again restarts the
// timer (instead of an earlier copy's timer cutting the new one short), and unmounting clears it.
// `copy` resolves to whether the clipboard write worked, for callers that toast a failure.
export function useCopied(duration = 1500) {
  const [ copied, setCopied ] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (value: string): Promise<boolean> => {
    let worked = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        worked = true;
      }
    } catch {
      worked = false;
    }
    if (!worked && !copyBySelection(value)) {
      return false;
    }
    window.clearTimeout(timer.current);
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), duration);
    return true;
  }, [duration]);

  return {copied, copy};
}
