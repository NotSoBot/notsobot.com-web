import { StatTile } from '@/components/ui/StatTile';
import { ExactDate } from '@/components/ui/Tooltip';
import { Routes } from '@/config';
import type { AdminUserContentFlags } from '@/lib/api';
import { cn } from '@/lib/utils';

// the pieces the rest of the site uses too live in src/components/ui, re-exported here for the admin pages
export { Chip } from '@/components/ui/Chip';
export { CopyableValue, selectAllScope } from '@/components/ui/CopyableValue';
export { DETAIL_LIST_STACKED, DetailList } from '@/components/ui/DetailList';
export { FilterButton } from '@/components/ui/FilterButton';
export { FiltersButton } from '@/components/ui/FiltersButton';
export { IdFilter } from '@/components/ui/IdFilter';
export { Pagination } from '@/components/ui/Pagination';
export { StatTile } from '@/components/ui/StatTile';
export { ExactDate, Hint, InfoTip } from '@/components/ui/Tooltip';
export { UserCell } from '@/components/ui/UserCell';
export { adminTagDirectoryPath, adminTagsPath } from '@/lib/adminPaths';


// the admin server list with that server open over it
export function adminServerPath(guildId: string): string {
  return `${Routes.DASHBOARD_ADMIN_SERVERS}/${guildId}`;
}

// the admin user list with that user open over it
export function adminUserPath(userId: string): string {
  return `${Routes.DASHBOARD_ADMIN_USERS}/${userId}`;
}


// Filters live in the URL so a filtered view can be linked/bookmarked; every change resets to page 1.
// `?within=` → `flagged_within` in hours, by how long ago the last content flag was (users and servers)
export const FLAGGED_WITHIN = [
  {value: 'any', label: 'Any time', hours: null},
  {value: '1d', label: '24h', hours: 24},
  {value: '7d', label: '7 days', hours: 24 * 7},
  {value: '30d', label: '30 days', hours: 24 * 30},
] as const;

// `?blocked=`: only blocked users/servers, or only ones that aren't (users and servers)
export const BLOCKED_FILTERS = [
  {value: 'any', label: 'Any', blocked: null},
  {value: 'blocked', label: 'Blocked', blocked: true},
  {value: 'not', label: 'Not blocked', blocked: false},
] as const;


// a date tile next to `StatTile`s (exact time on hover)
export function DateTile({ className, label, value, empty = '—', title }: {
  className?: string,
  label: string,
  value: string | number | null,
  empty?: string,
  title?: string,
}) {
  return (
    <div title={title} className={cn('rounded-md border border-line bg-deep px-3 py-2', title && 'cursor-help', className)}>
      <p className='text-xs text-subtle'>{label}</p>
      <p className='mt-0.5 text-sm text-fg'>{(value) ? <ExactDate value={value}/> : <span className='text-subtle'>{empty}</span>}</p>
    </div>
  );
}


// what the safety scan found (`flagged` is hits it was sure about, the rest of `total` only asked for a human to look)
export const FLAGGED_TITLE = 'Scanner hits it was sure about (like nudity or child safety)';
export const BORDERLINE_TITLE = 'Scanner hits that weren’t flagged outright, only sent for a human to look at';
// how staff reviewed those hits, by content flag status
export const FLAG_STATUS_TITLES: Record<string, string> = {
  '0': 'Not reviewed by staff yet',
  '1': 'Staff agreed it was bad content',
  '2': 'Staff decided it was fine (a false positive)',
  '3': 'Reported outside NotSoBot (like Discord Trust & Safety or NCMEC). Only a marker, it counts as confirmed.',
  '4': 'A reviewer wasn’t sure and left it for someone else',
};

// The "Content flags" tiles of a user's or server's modal: what the safety scan found on the first row, how staff
// reviewed it on the second. `flagsPath` is the content flags list for a status (`all` for every one).
export function ContentFlagTiles({ flags, flagsPath }: {flags: AdminUserContentFlags, flagsPath: (status: string) => string}) {
  return (
    <section>
      <h3 className='section-label mb-2'>Content flags</h3>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <StatTile label='Flagged' to={flagsPath('all')} value={flags.flagged.toLocaleString()} hint={FLAGGED_TITLE}/>
        <StatTile label='Borderline' value={(flags.total - flags.flagged).toLocaleString()} hint={BORDERLINE_TITLE}/>
        <DateTile className='col-span-2 sm:col-span-3' label='Last flagged' value={flags.last_flagged_at}/>
        <StatTile label='Pending' to={flagsPath('0')} value={flags.pending.toLocaleString()} tone='text-warning' hint={FLAG_STATUS_TITLES['0']}/>
        <StatTile label='Unsure' to={flagsPath('4')} value={flags.unsure.toLocaleString()} tone='text-[#f47fbf]' hint={FLAG_STATUS_TITLES['4']}/>
        <StatTile label='Confirmed' to={flagsPath('1')} value={flags.confirmed.toLocaleString()} tone='text-danger-text' hint={FLAG_STATUS_TITLES['1']}/>
        <StatTile label='Dismissed' to={flagsPath('2')} value={flags.dismissed.toLocaleString()} tone='text-muted' hint={FLAG_STATUS_TITLES['2']}/>
        <StatTile className='col-span-2 sm:col-span-1' label='Reported' to={flagsPath('3')} value={flags.reported.toLocaleString()} tone='text-[#aab2ff]' hint={FLAG_STATUS_TITLES['3']}/>
      </div>
    </section>
  );
}
