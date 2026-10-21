// Every user's files: how many and how big (permanent vs temporary), what's actually stored, by type and by who, uploads
// per day, and what's expiring soon (its own window, `?expiring=`, up to the 28 days temporary files last at most).

import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Segmented } from '@/components/ui/Segmented';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AdminFileStats, AdminUploadStats, CountAndSize } from '@/lib/api';
import { errorMessage, useAdminFileStatsQuery, useAdminStatsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatNumber, NO_AUTOFILL, toDate } from '@/lib/utils';

import { InlineError, Skeleton } from '../../ui';
import { adminUserPath, ExactDate, Hint, InfoTip, useSearchParamState } from '../adminUi';
import { bytes, DailyBars, dayLabel, Metric, MetricGrid, plural, RankedList, STAT_COLORS, StatsSection, SubHeading } from './statsUi';


// temporary files last 28 days at most (`MAX_FILE_UPLOAD_EXPIRE_TIME_PREMIUM`), the api caps the window there too
const MAX_EXPIRING_DAYS = 28;
const DEFAULT_EXPIRING_DAYS = 7;
const EXPIRING_PRESETS = [1, 3, 7, 14, 28];

const COLORS = {
  permanent: STAT_COLORS.primary,
  temporary: STAT_COLORS.secondary,
  unused: STAT_COLORS.neutral,
};

const TYPE_LABELS: Record<AdminFileStats['types'][number]['type'], string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  other: 'Other',
};

type Measure = 'count' | 'size';
const MEASURES = [{value: 'count', label: 'Files'}, {value: 'size', label: 'Size'}];


function parseExpiringDays(value: string | null): number {
  const days = Math.trunc(Number(value));
  return (1 <= days && days <= MAX_EXPIRING_DAYS) ? days : DEFAULT_EXPIRING_DAYS;
}


export function FilesSection({ days }: {days: number}) {
  const { searchParams, update } = useSearchParamState();
  const expiringDays = parseExpiringDays(searchParams.get('expiring'));
  const query = useAdminFileStatsQuery(expiringDays);

  return (
    <StatsSection
      id='files'
      title='Files'
      accent={COLORS.temporary}
      query={query}
      description={(query.data) ? <>As of <ExactDate value={query.data.generated_at} format={formatDateTime}/>.</> : null}
    >
      {(data) => (
        <>
          <MetricGrid>
            <Metric label='All files' value={bytes(data.size)} detail={plural(data.count, 'file')}/>
            <Metric label='Permanent' value={bytes(data.permanent.size)} detail={plural(data.permanent.count, 'file')} color={COLORS.permanent}/>
            <Metric label='Temporary' value={bytes(data.temporary.size)} detail={plural(data.temporary.count, 'file')} color={COLORS.temporary}/>
            <Metric
              label='Awaiting cleanup'
              value={bytes(data.expired.size)}
              detail={plural(data.expired.count, 'file')}
              title='Temporary files past their expiry that the cleanup job hasn’t deleted yet. Not counted in All files.'
            />
          </MetricGrid>

          <StorageBreakdown stats={data}/>

          <div className='mt-6 grid gap-6 lg:grid-cols-2'>
            <section>
              <SubHeading>By type</SubHeading>
              <RankedList items={data.types.map((type) => ({
                key: type.type,
                label: TYPE_LABELS[type.type],
                value: type.size,
                display: bytes(type.size),
                detail: plural(type.count, 'file'),
              }))}/>
            </section>
            <section>
              <SubHeading>Most storage</SubHeading>
              <RankedList
                empty='Nobody has files yet.'
                items={data.top_users.map((row) => ({
                  key: row.user_id,
                  label: (
                    <Link to={adminUserPath(row.user_id)} className='hover:underline'>
                      {row.user?.username ?? <span className='text-subtle'>Unknown user</span>}
                    </Link>
                  ),
                  value: row.size,
                  display: bytes(row.size),
                  detail: `${plural(row.count, 'object')} • ${row.user_id}`,
                }))}
              />
            </section>
          </div>

          <UploadsChart days={days}/>

          <ExpiringSection
            stats={data}
            days={expiringDays}
            onDaysChange={(value) => update({expiring: (value === DEFAULT_EXPIRING_DAYS) ? null : String(value)})}
          />
        </>
      )}
    </StatsSection>
  );
}


// what's actually stored (each object once) as one bar split by what keeps it
function StorageBreakdown({ stats }: {stats: AdminFileStats}) {
  const { storage } = stats;
  const parts: Array<{key: keyof typeof COLORS, label: string, value: CountAndSize, title: string}> = [
    {key: 'permanent', label: 'Permanent', value: storage.permanent, title: 'Objects at least one permanent file uses'},
    {key: 'temporary', label: 'Temporary only', value: storage.temporary, title: 'Objects only unexpired temporary files use, freed once they all expire'},
    {key: 'unused', label: 'Unused', value: storage.unused, title: 'Objects no file uses anymore, deleted by the next cleanup'},
  ];
  // what dedupe saves: the same content uploaded more than once is only stored once
  const saved = Math.max(0, stats.size - storage.permanent.size - storage.temporary.size);

  return (
    <section aria-labelledby='file-stats-storage' className='mt-6'>
      <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
        <h3 id='file-stats-storage' className='text-sm font-semibold text-white'>Storage</h3>
        <p className='text-sm text-muted tabular-nums'>
          <span className='font-semibold text-white'>{bytes(storage.size)}</span> in {plural(storage.count, 'object')}
          {(saved) ? <span className='text-subtle'> • dedupe saves {bytes(saved)}</span> : null}
        </p>
      </div>
      {/* widths by share of the stored bytes, 2px gaps between the parts */}
      <div className='mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-3'>
        {parts.filter((part) => part.value.size).map((part) => (
          <div key={part.key} className='h-full min-w-1' style={{flexBasis: `${(part.value.size / storage.size) * 100}%`}}>
            <Hint text={`${part.label}: ${bytes(part.value.size)}, ${plural(part.value.count, 'object')}`} className='block h-full'>
              <span className='block h-full' style={{background: COLORS[part.key]}}/>
            </Hint>
          </div>
        ))}
      </div>
      <ul className='mt-3 grid gap-2 sm:grid-cols-3'>
        {parts.map((part) => (
          <li key={part.key} className='flex items-start gap-2 text-sm'>
            <span aria-hidden className='mt-1.5 size-2 shrink-0 rounded-full' style={{background: COLORS[part.key]}}/>
            <span className='min-w-0'>
              <span className='flex items-center gap-1.5 text-muted'>{part.label}<InfoTip text={part.title}/></span>
              <span className='block font-semibold text-white tabular-nums'>{bytes(part.value.size)}</span>
              <span className='block text-xs text-subtle tabular-nums'>{plural(part.value.count, 'object')}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}


// uploads per day over the page's window, its own request
function UploadsChart({ days }: {days: number}) {
  const { data, isPending, isError, error } = useAdminStatsQuery<AdminUploadStats>('uploads', days);
  const [ measure, setMeasure ] = useState<Measure>('count');
  const format = (value: number) => (measure === 'count') ? formatNumber(value) : bytes(value);

  return (
    <section className='mt-6 border-t border-line pt-5'>
      <SubHeading actions={<Segmented label='Uploads chart measure' value={measure} onChange={(value) => setMeasure(value as Measure)} options={MEASURES}/>}>
        Uploads
      </SubHeading>
      {(isPending) ? (
        <Skeleton className='h-40 w-full bg-surface-2'/>
      ) : (isError && !data) ? (
        <InlineError>{errorMessage(error, 'Couldn’t load uploads.')}</InlineError>
      ) : (data) ? (
        <>
          <p className='mb-2 text-sm text-muted tabular-nums'>
            {plural(data.permanent.count + data.temporary.count, 'file')} ({bytes(data.permanent.size + data.temporary.size)}) in {plural(data.days, 'day')}
            <span className='text-subtle'> • temporary ones only while they’re still around</span>
          </p>
          <DailyBars
            items={data.series}
            format={format}
            series={[
              {label: 'Permanent', color: COLORS.permanent, value: (item) => item.permanent[measure]},
              {label: 'Temporary', color: COLORS.temporary, value: (item) => item.temporary[measure]},
            ]}
            describe={(item) => `${dayLabel(item.date)}: ${plural(item.permanent.count, 'permanent file')} (${bytes(item.permanent.size)}), ${plural(item.temporary.count, 'temporary file')} (${bytes(item.temporary.size)})`}
          />
        </>
      ) : null}
    </section>
  );
}


function ExpiringSection({ stats, days, onDaysChange }: {stats: AdminFileStats, days: number, onDaysChange: (days: number) => void}) {
  const { expiring } = stats;
  const [ measure, setMeasure ] = useState<Measure>('count');

  return (
    <section aria-labelledby='file-stats-expiring' className='mt-6 border-t border-line pt-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h3 id='file-stats-expiring' className='text-sm font-semibold text-white'>Expiring soon</h3>
        <DaysFilter days={days} onChange={onDaysChange}/>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3'>
        <Metric
          label={`In the next ${plural(days, 'day')}`}
          value={plural(expiring.count, 'file')}
          detail={`${bytes(expiring.size)} of uploads`}
          color={COLORS.temporary}
        />
        <Metric
          label='Storage freed'
          value={bytes(expiring.freed.size)}
          detail={plural(expiring.freed.count, 'object')}
          title='What the cleanup deletes once these expire: objects no permanent file, and no temporary file expiring later, still uses'
        />
        <Metric
          label='Window ends'
          value={formatDate(expiring.ends_at, {month: 'short', day: 'numeric'})}
          detail={toDate(expiring.ends_at).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}
        />
      </div>

      {(1 < days) ? (
        <div className='mt-4'>
          <SubHeading actions={<Segmented label='Expiring chart measure' value={measure} onChange={(value) => setMeasure(value as Measure)} options={MEASURES}/>}>
            <span className='text-xs font-normal text-subtle'>Per day from now</span>
          </SubHeading>
          <DailyBars
            // a bucket per 24 hours from now, not calendar days, so it's keyed by when each starts
            items={expiring.days.map((bucket) => ({...bucket, date: bucket.starts_at}))}
            format={(value) => (measure === 'count') ? formatNumber(value) : bytes(value)}
            series={[{label: 'Expiring', color: COLORS.temporary, value: (bucket) => bucket[measure]}]}
            axis={(bucket, index) => (index === 0) ? 'Now' : formatDate(bucket.starts_at, {month: 'short', day: 'numeric'})}
            describe={(bucket) => {
              const when = (bucket.starts_at === expiring.days[0].starts_at) ? 'Next 24 hours' : `From ${formatDateTime(bucket.starts_at)}`;
              return `${when}: ${plural(bucket.count, 'file')}, ${bytes(bucket.size)}`;
            }}
          />
        </div>
      ) : null}
    </section>
  );
}


// presets plus any number of days up to the cap, typed in
function DaysFilter({ days, onChange }: {days: number, onChange: (days: number) => void}) {
  const [ text, setText ] = useState(String(days));
  const debounced = useDebouncedValue(text, 400);

  // follows the presets (and back/forward), unless what's typed already means the same
  useEffect(() => {
    setText((previous) => (parseExpiringDays(previous) === days && previous !== '') ? previous : String(days));
  }, [days]);

  useEffect(() => {
    const value = Math.trunc(Number(debounced));
    if (1 <= value && value <= MAX_EXPIRING_DAYS && value !== days) {
      onChange(value);
    }
    // only when the typed value settles
  }, [debounced]);

  const typed = Math.trunc(Number(text));
  const invalid = text !== '' && !(1 <= typed && typed <= MAX_EXPIRING_DAYS);

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='max-w-full overflow-x-auto'>
        <Segmented
          label='Expiring within'
          value={(EXPIRING_PRESETS.includes(days)) ? String(days) : ''}
          onChange={(value) => {
            setText(value);
            onChange(Number(value));
          }}
          options={EXPIRING_PRESETS.map((value) => ({value: String(value), label: `${value}d`}))}
        />
      </div>
      <label className='flex items-center gap-1.5 text-sm text-muted'>
        <input
          {...NO_AUTOFILL}
          type='number'
          inputMode='numeric'
          min={1}
          max={MAX_EXPIRING_DAYS}
          aria-label={`Days, 1 to ${MAX_EXPIRING_DAYS}`}
          aria-invalid={invalid || undefined}
          className={cn('input w-16 py-1.5 tabular-nums', invalid && 'border-danger focus:border-danger')}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        days
      </label>
    </div>
  );
}
