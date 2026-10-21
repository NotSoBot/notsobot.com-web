// Bot owners only: numbers across the whole API, a section per `/admin/stats/<area>` so each loads (and fails) on its
// own. The window (`?range=`, in days) applies to every section that looks back over time; expiring files have their own.
// Each section has a link (`#growth`), from the jump links or its own copy button.

import { Link, useLocation } from 'react-router';

import { Segmented } from '@/components/ui/Segmented';

import { DashboardHeader } from '../ui';
import { useSearchParamState } from './adminUi';
import { FilesSection } from './stats/FilesSection';
import { ApiSection, CommandsSection } from './stats/UsageSections';
import { GrowthSection, PremiumSection } from './stats/GrowthSections';
import { ContentSection, ModerationSection } from './stats/QueueSections';


const RANGES = [
  {value: '1', label: 'Today'},
  {value: '7', label: '7 days'},
  {value: '30', label: '30 days'},
  {value: '90', label: '90 days'},
];
const DEFAULT_RANGE = '30';

// in page order, for the jump links
const SECTIONS = [
  {id: 'moderation', label: 'Moderation'},
  {id: 'commands', label: 'Commands'},
  {id: 'api', label: 'API'},
  {id: 'growth', label: 'Growth'},
  {id: 'premium', label: 'Premium'},
  {id: 'content', label: 'Content'},
  {id: 'files', label: 'Files'},
];


export function OwnerStatsPage() {
  const { searchParams, update } = useSearchParamState();
  const location = useLocation();
  const range = RANGES.find((item) => item.value === searchParams.get('range'))?.value ?? DEFAULT_RANGE;
  const days = Number(range);

  return (
    <>
      <DashboardHeader title='Stats' description='Numbers across the whole API.'>
        <div className='max-w-full overflow-x-auto'>
          <Segmented
            label='Stats window'
            value={range}
            options={RANGES}
            onChange={(value) => update({range: (value === DEFAULT_RANGE) ? null : value})}
          />
        </div>
      </DashboardHeader>

      <nav aria-label='Stats sections' className='-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0'>
        <ul className='flex gap-2'>
          {SECTIONS.map((section) => (
            <li key={section.id} className='shrink-0'>
              {/* the hash goes in the url (so it can be copied from there too), the section scrolls itself into view */}
              <Link
                to={{search: location.search, hash: section.id}}
                replace
                preventScrollReset
                className='block rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted transition-colors hover:border-line-strong hover:text-white'
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className='space-y-6'>
        <ModerationSection days={days}/>
        <CommandsSection days={days}/>
        <ApiSection days={days}/>
        <GrowthSection days={days}/>
        <PremiumSection days={days}/>
        <ContentSection days={days}/>
        <FilesSection days={days}/>
      </div>
    </>
  );
}
