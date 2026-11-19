import { useCallback, useMemo, useState } from 'react';


// Form state layered over saved values: `values` shows the saved data until something is edited,
// `changes` is only what differs from it, and `reset()` drops the edits. Because nothing is copied
// into state up front, fresh server data shows through automatically while the form is untouched.
export function useDraft<T extends Record<string, unknown>>(saved: T) {
  const [ edits, setEdits ] = useState<Partial<T>>({});

  const changes = useMemo(() => {
    const result: Partial<T> = {};
    for (const key of Object.keys(edits) as Array<keyof T>) {
      if (edits[key] !== saved[key]) {
        result[key] = edits[key];
      }
    }
    return result;
  }, [edits, saved]);

  const values = useMemo(() => ({...saved, ...edits}), [saved, edits]);
  const dirty = 0 < Object.keys(changes).length;

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setEdits((previous) => ({...previous, [key]: value}));
  }, []);

  const reset = useCallback(() => setEdits({}), []);

  // After `sent` (a snapshot of `changes` taken when saving) was saved: drop the edits that still hold the value that
  // was sent, keeping anything changed while the save was in flight. Use this instead of `reset()` in a save's
  // onSuccess, so typing during a save isn't wiped.
  const commit = useCallback((sent: Partial<T>) => {
    setEdits((previous) => {
      const next: Partial<T> = {...previous};
      for (const key of Object.keys(sent) as Array<keyof T>) {
        if (Object.is(next[key], sent[key])) {
          delete next[key];
        }
      }
      return next;
    });
  }, []);

  return {values, changes, dirty, set, reset, commit, restore: setEdits};
}
