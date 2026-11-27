import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { apiRequest } from '@/lib/api';


// `GET /editor/access`: the one field (the effect catalogue has it too, a couple hundred KB the navbar used to download
// on every page to read it)
type EditorAccess = {access: 'everyone' | 'owners'};

// `error`: the api didn't say (it couldn't be reached), which isn't a no
export type EditorAccessStatus = 'loading' | 'allowed' | 'denied' | 'error';


// Who the media editor is open to, the api decides (its `EDITOR_PUBLIC`, `GET /editor/access`): owners only
// until the rollout, then everyone logged in. The site's `/editor` page and its links go by it, so turning it on in the
// api is all the site needs. `allowed` is `status === 'allowed'`, for the links that only show when it is
export function useEditorAccess(): {status: EditorAccessStatus, allowed: boolean, retry: () => void} {
  const { user, isAuthenticated } = useAuth();
  const owner = isOwner(user);
  const query = useQuery({
    queryKey: ['editor', 'access'],
    queryFn: ({ signal }) => apiRequest<EditorAccess>('/editor/access', {auth: false, signal}),
    // owners can use it either way, nobody logged out can
    enabled: isAuthenticated && !owner,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.access,
  });
  // the last answer stands while a later one fails, and asking again after a failure is loading again
  const status: EditorAccessStatus = (owner) ? 'allowed'
    : (!isAuthenticated) ? 'denied'
    : (query.data !== undefined) ? ((query.data === 'everyone') ? 'allowed' : 'denied')
    // an answer that doesn't say: not allowed, as before (never a spinner for good)
    : (query.isSuccess) ? 'denied'
    : (query.isError && !query.isFetching) ? 'error'
    : 'loading';
  return {status, allowed: status === 'allowed', retry: () => void query.refetch()};
}


// Goes inside <RequireAuth/>: the editor's routes, for whoever it's open to. Everyone else goes back to the dashboard,
// but only on the api's word: when it couldn't be asked they stay here with a Retry (a link to a template isn't lost)
export function RequireEditorAccess() {
  const { t } = useI18n();
  const { status, retry } = useEditorAccess();
  switch (status) {
    case 'loading':
      return <FullPageMessage><Spinner/></FullPageMessage>;
    case 'error':
      return (
        <FullPageMessage title={t('ui.session_error.title')} description={t('ui.session_error.description')}>
          <button type='button' className='btn btn-secondary' onClick={retry}>{t('common.retry')}</button>
        </FullPageMessage>
      );
    case 'denied':
      return <Navigate to={Routes.DASHBOARD} replace/>;
    case 'allowed':
      return <Outlet/>;
  }
}
