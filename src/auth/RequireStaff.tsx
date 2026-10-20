import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';

import { Routes } from '@/config';

import { useAuth } from './AuthContext';
import { isOwner, isStaff } from './permissions';


/**
 * Route guard for staff-only pages (the dashboard's admin section, owners and moderators). Goes inside
 * <RequireAuth/>, so the user is already loaded; everyone else is sent back to the dashboard. The API enforces
 * this too (403).
 */
// `owner`: NotSoBot owners only, moderators are sent back to the dashboard too
export function RequireStaff({ owner = false, children }: {owner?: boolean, children?: ReactNode}) {
  const { user } = useAuth();
  if (!isStaff(user) || (owner && !isOwner(user))) {
    return <Navigate to={Routes.DASHBOARD} replace/>;
  }
  return children ?? <Outlet/>;
}
