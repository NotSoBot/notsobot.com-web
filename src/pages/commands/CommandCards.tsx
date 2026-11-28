import { Crown, MessageSquare, TrendingUp, User } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { useI18n } from '@/i18n';
import { CommandTypes, type CommandPremium, type CommandType } from '@/lib/api';
import { cn, formatCompact, formatNumber } from '@/lib/utils';

import { categoryMeta, commandPath, OPENED_FROM_LIST, PREFIXES, premiumMeta, TYPE_LABELS, type Entry, type StatsState } from './commandMeta';


// cards read their accent from `--cat`
export function categoryStyle(category: string): CSSProperties {
  return {'--cat': categoryMeta(category).color} as CSSProperties;
}


export function CommandName({ type, name, className }: {type: CommandType, name: string, className?: string}) {
  const Icon = (type === CommandTypes.APPLICATION_MENU_USER) ? User : (type === CommandTypes.APPLICATION_MENU_MESSAGE) ? MessageSquare : null;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 font-mono', className)}>
      {(Icon) ? <Icon aria-hidden className='size-4 shrink-0 text-muted'/> : null}
      {/* the full name on hover, long ones are cut off */}
      <span className='truncate' title={`${PREFIXES[type]}${name}`}>{(Icon) ? null : <span className='text-subtle'>{PREFIXES[type]}</span>}{name}</span>
    </span>
  );
}


// The card's name, plus a `/` when the command can also be run as a slash command (prefix and slash share a card).
// The slash name is often a different one (`.alien` is `/media-iv-face alien`), so it's in the tooltip.
function EntryName({ entry, className }: {entry: Entry, className?: string}) {
  const { t } = useI18n();
  const other = entry.variants.find((variant) => variant.metadata !== entry.metadata)?.metadata;
  const otherLabel = (other) ? `${t(TYPE_LABELS[other.type])}: ${PREFIXES[other.type]}${other.name}` : '';
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <CommandName type={entry.metadata.type} name={entry.metadata.name} className={className}/>
      {(other) ? (
        <span title={otherLabel} className='shrink-0 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-muted'>
          {/* a lone `/` or `.` says nothing to a screen reader, it gets the tooltip's text */}
          <span aria-hidden>{PREFIXES[other.type]}</span>
          <span className='sr-only'>{otherLabel}</span>
        </span>
      ) : null}
    </span>
  );
}


export function PremiumBadge({ premium, className }: {premium?: CommandPremium | null, className?: string}) {
  const { t } = useI18n();
  if (!premium) {
    return null;
  }
  const meta = premiumMeta(premium);
  return (
    <span
      title={t(meta.label)}
      className={cn('inline-flex shrink-0 items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-warning-text', className)}
    >
      <Crown aria-hidden className='size-3'/>
      {t(meta.badge)}
    </span>
  );
}


export function CategoryBadge({ category, className }: {category: string, className?: string}) {
  const { t } = useI18n();
  if (!category) {
    return null;
  }
  const meta = categoryMeta(category);
  const Icon = meta.icon;
  return (
    <span
      style={categoryStyle(category)}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        'bg-[color-mix(in_srgb,var(--cat)_16%,transparent)] text-[color-mix(in_srgb,var(--cat)_55%,white)]',
        className,
      )}
    >
      <Icon aria-hidden className='size-3'/>
      {t(meta.label)}
    </span>
  );
}


// `stats` is the usage request: a placeholder while it loads and nothing when it failed, "no uses" is only said once
// the numbers are in
function UsesLabel({ entry, stats = 'ready' }: {entry: Entry, stats?: StatsState}) {
  const { t } = useI18n();
  if (stats === 'failed') {
    return null;
  }
  if (stats === 'pending') {
    return <span aria-hidden className='h-3 w-12 animate-pulse rounded bg-surface-3'/>;
  }
  if (!entry.uses) {
    return <span className='text-xs text-subtle'>{t('commands.no_uses')}</span>;
  }
  const hot = entry.rank !== null && entry.rank <= 10;
  return (
    <span
      title={t('commands.uses_title', {uses: formatNumber(entry.uses), rank: entry.rank})}
      className={cn('inline-flex items-center gap-1 text-xs tabular-nums', hot ? 'text-white' : 'text-muted')}
    >
      {(hot) ? <TrendingUp aria-hidden className='size-3.5 text-success-text'/> : null}
      {formatCompact(entry.uses)}<span className='text-subtle'>{t('commands.per_week')}</span>
    </span>
  );
}


// A card is a link to its command's page, so it can be opened in a new tab or copied. A plain click opens the drawer
// in place: no scroll reset, filters kept in the query string, and a history entry of its own so the browser's Back
// closes the drawer instead of leaving the page
function CardLink({ entry, className, children }: {entry: Entry, className?: string, children: ReactNode}) {
  const { search } = useLocation();
  return (
    <Link
      to={{pathname: commandPath(entry.command, entry.metadata.type), search}}
      state={OPENED_FROM_LIST}
      preventScrollReset
      style={categoryStyle(entry.category)}
      className={className}
    >
      {children}
    </Link>
  );
}


export function CommandCard({ entry, stats }: {entry: Entry, stats?: StatsState}) {
  const { t } = useI18n();
  const { metadata } = entry;
  return (
    <li>
      <CardLink
        entry={entry}
        className={cn(
          'group flex h-full w-full cursor-pointer flex-col rounded-lg border border-line bg-surface p-4 text-left transition-colors',
          'hover:border-line-strong hover:bg-surface-2',
        )}
      >
        <div className='flex items-start justify-between gap-2'>
          <EntryName entry={entry} className='text-base font-semibold text-white'/>
          <CategoryBadge category={entry.category} className='mt-0.5'/>
        </div>
        <p className='mt-1.5 mb-3 line-clamp-2 text-sm text-muted'>{metadata.description || t('commands.no_description')}</p>
        <div className='mt-auto flex items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <PremiumBadge premium={metadata.premium}/>
            {(metadata.dmable) ? (
              <span title={t('commands.dms')} className='rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success-text'>
                <span aria-hidden>{t('commands.dm_badge')}</span>
                <span className='sr-only'>{t('commands.dms')}</span>
              </span>
            ) : null}
          </div>
          <UsesLabel entry={entry} stats={stats}/>
        </div>
      </CardLink>
    </li>
  );
}


export function TrendingCard({ entry, max }: {entry: Entry, max: number}) {
  const { t } = useI18n();
  const meta = categoryMeta(entry.category);
  const Icon = meta.icon;
  return (
    <li>
      <CardLink
        entry={entry}
        className='group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-[var(--cat)]'
      >
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-bold text-subtle tabular-nums'>#{entry.rank}</span>
          <span className='flex size-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--cat)_18%,transparent)]'>
            <Icon aria-hidden className='size-4 text-[var(--cat)]'/>
          </span>
        </div>
        <EntryName entry={entry} className='text-lg font-semibold text-white'/>
        <p className='mt-1 mb-4 line-clamp-1 text-sm text-muted'>{entry.metadata.description || t(meta.label)}</p>
        <div className='mt-auto'>
          <div className='mb-1.5 flex items-baseline justify-between'>
            <span className='text-xl font-bold text-white tabular-nums'>{formatCompact(entry.uses)}</span>
            <span className='text-xs text-subtle'>{t('commands.uses_this_week')}</span>
          </div>
          <div className='h-1 overflow-hidden rounded-full bg-deep'>
            <div className='h-full rounded-full bg-[var(--cat)]' style={{width: `${Math.max(4, (entry.uses / max) * 100)}%`}}/>
          </div>
        </div>
      </CardLink>
    </li>
  );
}
