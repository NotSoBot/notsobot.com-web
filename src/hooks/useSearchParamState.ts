import { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';


// List filters, search and page live in the URL so a filtered view can be linked/bookmarked: `update` sets or clears
// keys (null/'' clears) and goes back to page 1 unless the change is the page itself, replacing the history entry.
//
// Lists shown inside a modal over another list (the server sections in the admin server modal) keep their search, filters
// and page to themselves, the url's are the page's behind it
export const LocalSearchParamsContext = createContext(false);

export function useSearchParamState() {
  const local = useContext(LocalSearchParamsContext);
  const [ urlParams, setUrlParams ] = useSearchParams();
  const [ localParams, setLocalParams ] = useState(() => new URLSearchParams());
  const searchParams = (local) ? localParams : urlParams;
  const page = Math.max(0, (Number(searchParams.get('page')) || 1) - 1);

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const apply = (previous: URLSearchParams) => {
      const next = new URLSearchParams(previous);
      for (const [ key, value ] of Object.entries(changes)) {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (resetPage && !('page' in changes)) {
        next.delete('page');
      }
      return next;
    };
    if (local) {
      setLocalParams(apply);
    } else {
      setUrlParams(apply, {replace: true, preventScrollReset: true});
    }
  };

  const setPage = (value: number) => {
    update({page: (value <= 0) ? null : String(value + 1)}, false);
    // the modal's own scroll isn't the window's
    if (!local) {
      window.scrollTo({top: 0});
    }
  };

  return {searchParams, page, update, setPage};
}


// Acting on the last item of the last page (or a refetch shrinking the list) can leave you on a page that's now
// empty, which would show the empty state with no pagination to go back. Jump to the last page that has items
// instead; returns true while that's happening so the caller can keep showing its skeleton.
export function useStepBackFromEmptyPage({ page, setPage, data, isPlaceholderData, pageSize }: {
  page: number,
  setPage: (page: number) => void,
  data: {items: Array<unknown>, count: number} | undefined,
  isPlaceholderData: boolean,
  pageSize: number,
}): boolean {
  const stepBack = 0 < page && !!data && !isPlaceholderData && !data.items.length;
  const lastPage = (data) ? Math.max(0, Math.ceil(data.count / pageSize) - 1) : 0;
  useEffect(() => {
    if (stepBack) {
      setPage(Math.min(page - 1, lastPage));
    }
    // setPage is recreated every render
  }, [stepBack, page, lastPage]);
  return stepBack;
}


