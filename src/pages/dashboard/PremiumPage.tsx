// The user's premium tier, the servers they gave it to, and the entitlements behind it (Discord subscriptions and
// grants from staff). Subscriptions are bought, renewed and cancelled in Discord.

import { Crown } from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Routes, Urls } from '@/config';
import { useI18n } from '@/i18n';
import { EntitlementProviders, UserPremiumTypes, type Entitlement } from '@/lib/api';
import { errorMessage, useMeEntitlementsQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatExactDateTime, formatNumber, toDate } from '@/lib/utils';

import { Chip } from './admin/adminUi';
import { entitlementStatus, entitlementTierLabel, premiumLabel } from './premium';
import { PremiumServers } from './PremiumServers';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from './ui';


export function PremiumPage() {
  const { user } = useAuth();
  const { t, rich } = useI18n();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeEntitlementsQuery();
  const items = data?.items ?? [];

  if (!user) {
    return null;
  }

  return (
    <>
      <DashboardHeader
        title={t('dash.nav.premium')}
        description={t('dpremium.description')}
      >
        <Link to={Routes.PREMIUM} className='btn btn-sm btn-ghost'>
          {t('dpremium.included')}
        </Link>
      </DashboardHeader>

      <CurrentTier premiumType={user.premium_type} items={(data) ? items : null}/>

      <PremiumServers/>

      <h2 className='section-label mt-8 mb-3'>{t('dpremium.subscriptions')}</h2>
      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title={t('dpremium.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Crown className='size-10'/>} title={t('dpremium.empty')}>
          {rich('dpremium.empty_description', {store: (chunk) => <a href={Urls.DISCORD_STORE} target='_blank' rel='noreferrer' className='text-fg underline hover:text-white'>{chunk}</a>})}
        </EmptyState>
      ) : (
        <>
          <ul className='card divide-y divide-line'>
            {items.map((entitlement) => <EntitlementRow key={entitlement.id} entitlement={entitlement}/>)}
          </ul>
          {(items.length < (data?.count ?? 0)) ? (
            <p className='mt-2 text-xs text-subtle'>{t('dpremium.showing', {shown: formatNumber(items.length), count: formatNumber(data?.count ?? 0)})}</p>
          ) : null}
        </>
      )}
    </>
  );
}


function CurrentTier({ premiumType, items }: {premiumType: number, items: Array<Entitlement> | null}) {
  const { t, plural } = useI18n();
  const premium = premiumType !== UserPremiumTypes.NONE;
  const active = items?.filter((entitlement) => entitlement.active).length ?? 0;

  let detail: string | null = null;
  if (!premium) {
    detail = t('dpremium.free');
  } else if (premiumType === UserPremiumTypes.PREMIUM_FREE) {
    detail = t('dpremium.complimentary');
  } else if (active) {
    detail = plural('dpremium.from', active);
  }

  return (
    <section className='card flex items-center gap-4 p-5'>
      <span
        aria-hidden
        className={cn('flex size-12 shrink-0 items-center justify-center rounded-lg', premium ? 'bg-warning/15 text-warning' : 'bg-surface-3 text-subtle')}
      >
        <Crown className='size-6'/>
      </span>
      <div className='min-w-0'>
        <div className='text-sm text-muted'>{t('dpremium.current')}</div>
        <div className={cn('text-xl font-bold', premium ? 'text-warning' : 'text-white')}>{premiumLabel(premiumType)}</div>
        {(detail) ? <div className='mt-0.5 text-sm text-subtle'>{detail}</div> : null}
      </div>
    </section>
  );
}


function DateLabel({ label, value }: {label: string, value: string | number}) {
  return <span title={formatExactDateTime(value)}>{label} {formatDate(value)}</span>;
}


function EntitlementRow({ entitlement }: {entitlement: Entitlement}) {
  const { t, rich } = useI18n();
  const status = entitlementStatus(entitlement);
  const discord = entitlement.provider === EntitlementProviders.DISCORD;
  const started = entitlement.starts_at ?? entitlement.created_at;
  const ended = entitlement.ends_at !== null && toDate(entitlement.ends_at).getTime() < Date.now();

  return (
    <li className='flex items-start gap-3 px-4 py-3'>
      <span
        aria-hidden
        className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', entitlement.active ? 'bg-warning/15 text-warning' : 'bg-surface-3 text-subtle')}
      >
        <Crown className='size-5'/>
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-medium text-white'>{entitlementTierLabel(entitlement)}</span>
          <Chip tone={status.tone}>{status.label}</Chip>
          <Chip>{t((discord) ? 'dpremium.discord' : 'dpremium.staff')}</Chip>
        </div>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>
          {(started !== null) ? <DateLabel label={t('dpremium.started')} value={started}/> : null}
          {(entitlement.ends_at !== null) ? (
            <DateLabel label={t((ended) ? 'dpremium.ended' : (discord) ? 'dpremium.period_ends' : 'dpremium.ends')} value={entitlement.ends_at}/>
          ) : (entitlement.active) ? (
            <span>{t('dpremium.no_end')}</span>
          ) : null}
          {(entitlement.guild_id) ? <span>{rich('dpremium.server', {b: (chunk) => <span className='font-mono'>{chunk}</span>}, {id: entitlement.guild_id})}</span> : null}
          <span className='font-mono' title={t('dpremium.entitlement_id')}>#{entitlement.id}</span>
        </div>
      </div>
    </li>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-48'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
          </div>
        </div>
      ))}
    </div>
  );
}
