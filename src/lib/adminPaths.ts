// Links into the admin panel, for the public pages that show them to staff: on their own here so those pages don't
// pull the admin panel's ui module in for everyone. src/pages/dashboard/admin/adminUi.tsx re-exports them for the admin pages

import { Routes } from '@/routes';


// the Tags tab searching `query`, like `user:<id>`
export function adminTagsPath(query: string): string {
  return `${Routes.DASHBOARD_ADMIN_TAGS}?${new URLSearchParams({q: query}).toString()}`;
}

// the admin directory list with that listing open over it
export function adminTagDirectoryPath(tagId: string): string {
  return `${Routes.DASHBOARD_ADMIN_TAG_DIRECTORY}/${tagId}`;
}
