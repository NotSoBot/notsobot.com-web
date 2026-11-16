// What someone gets, from the api's `limits_summary` (picked the way jobs pick them): the caller's own on the Premium
// page, what a server's slots give everyone there on its Credits page. Counts are what's kept against how much fits.
// The bot's `premium` shows the same for wherever it's used.

import { Gauge } from 'lucide-react';

import { useI18n } from '@/i18n';
import { UserPremiumTypes, type LimitCount, type LimitsSummary as Limits, type UserGuild } from '@/lib/api';
import { errorMessage, useGuildLimitsQuery, useMeLimitsQuery } from '@/lib/api/dashboardQueries';
import { formatMemory, formatNumber } from '@/lib/utils';

import { StatTile } from './admin/adminUi';
import { premiumLabel } from './premium';
import { ErrorPanel, Panel, Skeleton } from './ui';


const TIER_TYPES: Record<string, number> = {
  premium: UserPremiumTypes.PREMIUM,
  premium_plus: UserPremiumTypes.PREMIUM_PLUS,
  premium_max: UserPremiumTypes.PREMIUM_MAX,
};

function tierLabel(tier: string | null): string {
  return premiumLabel((tier && TIER_TYPES[tier]) || UserPremiumTypes.NONE);
}

function LimitsGrid({ limits }: {limits: Limits}) {
  const { t } = useI18n();
  const seconds = (value: number) => t('dlimits.seconds', {count: formatNumber(value)});
  const count = (value: LimitCount) => t('dlimits.count', {count: formatNumber(value.count), max: formatNumber(value.limit)});

  let source: string;
  if (limits.source === 'user') {
    source = t('dlimits.source_user', {tier: tierLabel(limits.tier)});
  } else if (limits.source === 'server') {
    source = t('dlimits.source_server', {tier: tierLabel(limits.server_tier)});
  } else {
    source = t('dlimits.source_free');
  }

  return (
    <>
      <p className='mb-3 text-sm text-muted'>{source}</p>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <StatTile
          label={t('dlimits.file_size')}
          value={(limits.file_size === null) ? t('dlimits.file_size_discord', {size: formatMemory(limits.file_size_discord_max)}) : formatMemory(limits.file_size)}
        />
        <StatTile label={t('dlimits.file_days')} value={t('dlimits.days', {count: formatNumber(limits.file_days)})}/>
        <StatTile label={t('dlimits.download_quality')} value={limits.download_quality}/>
        <StatTile label={t('dlimits.frames')} value={formatNumber(limits.frames)}/>
        <StatTile label={t('dlimits.still_size')} value={`${formatNumber(limits.still_size)}px`}/>
        <StatTile label={t('dlimits.media_time')} value={seconds(limits.media_seconds)}/>
        <StatTile label={t('dlimits.tag_time')} value={seconds(limits.tag_seconds)}/>
        <StatTile label={t('dlimits.code_time')} value={seconds(limits.code_seconds)}/>
        {(limits.voices) ? <StatTile label={t('dlimits.voices')} value={count(limits.voices)}/> : null}
        {(limits.fonts) ? (
          <StatTile label={t('dlimits.fonts')} value={(limits.fonts.available) ? count(limits.fonts) : t('dlimits.needs_premium')}/>
        ) : null}
        {(limits.server_voices) ? <StatTile label={t('dlimits.server_voices')} value={count(limits.server_voices)}/> : null}
        {(limits.server_fonts) ? (
          <StatTile label={t('dlimits.server_fonts')} value={(limits.server_fonts.available) ? count(limits.server_fonts) : t('dlimits.needs_slot')}/>
        ) : null}
      </div>
    </>
  );
}


// the Premium page's, the caller's own wherever no premium slot applies
export function MyLimitsCard() {
  const { t } = useI18n();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeLimitsQuery();

  return (
    <section className='card mt-4 p-5'>
      <h2 className='mb-1 flex items-center gap-2 text-lg font-semibold text-white'>
        <Gauge className='size-5 text-brand-text' aria-hidden/>
        {t('dlimits.title')}
      </h2>
      <p className='mb-4 text-xs text-subtle'>{t('dlimits.description')}</p>
      {(isPending) ? (
        <Skeleton className='h-28 w-full'/>
      ) : (isError) ? (
        <ErrorPanel title={t('dlimits.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <LimitsGrid limits={data}/>
      )}
    </section>
  );
}


// a server's Credits page (and the staff server view): what its premium slots give everyone in it, members with their
// own premium get whichever is better
export function ServerLimitsSection({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const { data, isPending, error } = useGuildLimitsQuery(guild.id);

  return (
    <Panel title={t('dlimits.server_title')} accent='#5865f2' description={t('dlimits.server_description')}>
      {(isPending) ? (
        <Skeleton className='h-28 w-full bg-surface-2'/>
      ) : (error) ? (
        <p role='alert' className='text-sm text-danger-text'>{errorMessage(error, t('dlimits.load_error'))}</p>
      ) : (
        <LimitsGrid limits={data}/>
      )}
    </Panel>
  );
}
