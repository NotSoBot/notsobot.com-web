import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import { InfoTip } from './Tooltip';


// A count tile in an item's modal (a user's, a server's), linking to the list behind it when there is one (`to`), or
// doing something else on click (`onClick`, e.g. showing a list under it). Muted when it's 0.
// `hint` explains the number in an ⓘ next to the label, like the stats page's `Metric` (the link or button is stretched
// under it, a button can't go inside one). `title` is what clicking the tile does ("Show their warnings"): it names the
// stretched link or button and is its tooltip, with `expanded` for a button that shows and hides something. On a tile
// that isn't clickable there's nothing to name, so `title` is its explanation, like `hint`.
export function StatTile({ className, label, value, to, onClick, tone = 'text-white', title, hint, expanded }: {
  className?: string,
  label: string,
  value: string,
  to?: string,
  onClick?: () => void,
  tone?: string,
  title?: string,
  hint?: string,
  expanded?: boolean,
}) {
  const interactive = !!(to || onClick);
  const tip = hint ?? ((interactive) ? undefined : title);
  const action = (interactive) ? title : undefined;
  // the count stays in the name, it's what tabbing to the tile reads out
  const name = (action) ? `${label}: ${value}, ${action}` : `${label}: ${value}`;
  return (
    <div className={cn('relative rounded-md border border-line bg-deep px-3 py-2', interactive && 'group/stat transition-colors hover:border-brand', className)}>
      <p className={cn('text-xs text-subtle', tip && 'flex items-center gap-1.5')}>
        {label}
        {(tip) ? <InfoTip text={tip} className='relative z-10'/> : null}
      </p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', interactive && 'group-hover/stat:underline', (value === '0') ? 'text-subtle' : tone)}>{value}</p>
      {/* after the text, so the label stays the tile's first child for callers styling it */}
      {(onClick) ? (
        <button type='button' aria-label={name} aria-expanded={expanded} title={action} onClick={onClick} className='absolute inset-0 cursor-pointer rounded-md'/>
      ) : (to) ? (
        <Link to={to} aria-label={name} title={action} className='absolute inset-0 rounded-md'/>
      ) : null}
    </div>
  );
}
