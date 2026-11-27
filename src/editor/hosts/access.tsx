import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { apiRequest } from '@/lib/api';


// `GET /editor/access`: the one field (the effect catalogue has it too, a couple hundred KB the navbar used to download
// on every page to read it)
type EditorAccess = {access: 'everyone' | 'owners'};


// Who the media editor is open to, the api decides (its `EDITOR_PUBLIC`, `GET /editor/access`): owners only
// until the rollout, then everyone logged in. The site's `/editor` page and its links go by it, so turning it on in the
// api is all the site needs
export function useEditorAccess(): {allowed: boolean, loading: boolean} {
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
  if (owner) {
    return {allowed: true, loading: false};
  }
  return {allowed: isAuthenticated && query.data === 'everyone', loading: isAuthenticated && query.isPending};
}


// Goes inside <RequireAuth/>: the editor's routes, for whoever it's open to. Everyone else goes back to the dashboard
export function RequireEditorAccess() {
  const { allowed, loading } = useEditorAccess();
  if (loading) {
    return <FullPageMessage><Spinner/></FullPageMessage>;
  }
  if (!allowed) {
    return <Navigate to={Routes.DASHBOARD} replace/>;
  }
  return <Outlet/>;
}
