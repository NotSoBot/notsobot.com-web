// The user's premium tier, the servers they gave it to, and the entitlements behind it (Discord subscriptions and
// grants from staff). Subscriptions are bought, renewed and cancelled in Discord.

import { Coins, Crown } from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { Routes, Urls } from '@/config';
import { useI18n } from '@/i18n';
import { CreditTransactionTypes, EntitlementProviders, UserPremiumTypes, type CreditBalance, type CreditTransaction, type Entitlement } from '@/lib/api';
import { errorMessage, useMeCreditsQuery, useMeEntitlementsQuery } from '@/lib/api/dashboardQueries';
import { CREDITS_PER_TTS_BYTE } from '@/lib/credits';
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

      <CreditsCard/>

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


// what's left of this week's NotSoCredits and of the bought ones, what things cost, and where bought ones went
function CreditsCard() {
  const { t } = useI18n();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeCreditsQuery();

  return (
    <section className='card mt-4 p-5'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-lg font-semibold text-white'>
          <Coins className='size-5 text-brand-text' aria-hidden/>
          {t('dcredits.title')}
        </h2>
        <Link to={`${Routes.PREMIUM}#premium-credits`} className='btn btn-sm btn-ghost'>{t('dcredits.get_more')}</Link>
      </div>
      {(isPending) ? (
        <Skeleton className='h-20 w-full'/>
      ) : (isError) ? (
        <ErrorPanel title={t('dcredits.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <>
          {(data.balance) ? <CreditBalances balance={data.balance}/> : <p className='text-sm text-muted'>{t('dcredits.unlimited')}</p>}
          <p className='mt-4 text-xs text-subtle'>{t('dcredits.costs', {ai: formatNumber(data.ai_message), tts: formatNumber(CREDITS_PER_TTS_BYTE)})}</p>
          {(data.transactions.length) ? (
            <>
              <h3 className='section-label mt-5 mb-2'>{t('dcredits.recent')}</h3>
              <ul className='divide-y divide-line text-sm'>
                {data.transactions.map((transaction) => <CreditTransactionRow key={transaction.id} transaction={transaction}/>)}
              </ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}


function CreditBalances({ balance }: {balance: CreditBalance}) {
  const { t } = useI18n();
  const used = (balance.weekly) ? Math.min(100, Math.round(((balance.weekly - balance.weekly_left) / balance.weekly) * 100)) : 0;
  return (
    <div className={cn('grid gap-4', (balance.weekly) && 'sm:grid-cols-2', (balance.rollover_max) && 'lg:grid-cols-3')}>
      {(balance.weekly) ? (
        <div className='rounded-lg bg-surface-2 p-4'>
          <div className='text-sm text-muted'>{t('dcredits.weekly')}</div>
          <div className='mt-1 text-xl font-bold text-white tabular-nums'>
            {t('dcredits.weekly_value', {left: formatNumber(balance.weekly_left), weekly: formatNumber(balance.weekly)})}
          </div>
          <div
            className='mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3'
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100 - used}
            aria-label={t('dcredits.weekly')}
          >
            <div className={cn('h-full rounded-full', (80 <= used) ? 'bg-warning' : 'bg-brand')} style={{width: `${100 - used}%`}}/>
          </div>
          <div className='mt-2 text-xs text-subtle'>
            <DateLabel label={t('dcredits.resets')} value={balance.resets_at}/>
          </div>
        </div>
      ) : null}
      {(balance.rollover_max) ? (
        <div className='rounded-lg bg-surface-2 p-4'>
          <div className='text-sm text-muted'>{t('dcredits.rollover')}</div>
          <div className='mt-1 text-xl font-bold text-white tabular-nums'>
            {t('dcredits.weekly_value', {left: formatNumber(balance.rollover_left), weekly: formatNumber(balance.rollover_max)})}
          </div>
          <div className='mt-2 text-xs text-subtle'>{t('dcredits.rollover_hint')}</div>
        </div>
      ) : null}
      <div className='rounded-lg bg-surface-2 p-4'>
        <div className='text-sm text-muted'>{t('dcredits.bought')}</div>
        <div className='mt-1 text-xl font-bold text-white tabular-nums'>{formatNumber(balance.refill_left)}</div>
        <div className='mt-2 text-xs text-subtle'>{t((balance.weekly) ? 'dcredits.bought_hint' : 'dcredits.bought_hint_no_weekly')}</div>
      </div>
    </div>
  );
}


function CreditTransactionRow({ transaction }: {transaction: CreditTransaction}) {
  const { t } = useI18n();
  const amount = formatNumber(Math.abs(transaction.amount));
  let text: string;
  if (transaction.type === CreditTransactionTypes.REFILL) {
    text = t('dcredits.type.refill', {amount});
  } else if (transaction.type === CreditTransactionTypes.GIVE) {
    text = t('dcredits.type.give', {amount, server: transaction.server_id ?? ''});
  } else {
    text = (transaction.server_id) ? t('dcredits.type.revoke_server', {amount, server: transaction.server_id}) : t('dcredits.type.revoke', {amount});
  }
  return (
    <li className='flex items-center justify-between gap-3 py-2'>
      <span className={cn('min-w-0', (transaction.type === CreditTransactionTypes.REVOKE) ? 'text-[#ff8a8c]' : 'text-fg')}>{text}</span>
      <span className='shrink-0 text-xs text-subtle'>
        <DateLabel label='' value={transaction.created}/>
      </span>
    </li>
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
