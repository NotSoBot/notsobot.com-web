import { useEffect, useState } from 'react';

import type { EditorApiError, EditorHost } from './api';
import type { EditorCatalogue } from './types';


// the catalogue is the same for everyone and changes only with a deploy, fetched once per page load
let cached: Promise<EditorCatalogue> | null = null;


export function useCatalogue(host: EditorHost) {
  const [ catalogue, setCatalogue ] = useState<EditorCatalogue | null>(null);
  const [ error, setError ] = useState<EditorApiError | null>(null);
  const [ attempt, setAttempt ] = useState(0);

  useEffect(() => {
    let alive = true;
    cached ??= host.api.effects();
    cached.then((result) => {
      if (alive) {
        setCatalogue(result);
      }
    }).catch((failure) => {
      cached = null;
      if (alive) {
        setError(host.errorOf(failure) ?? {status: 0, code: null, message: '', body: null});
      }
    });
    return () => {
      alive = false;
    };
  }, [host, attempt]);

  return {
    catalogue,
    error,
    retry: () => {
      setError(null);
      setAttempt((value) => value + 1);
    },
  };
}
