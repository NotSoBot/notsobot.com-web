// What each NotSoPremium tier unlocks. Not linked from the navbar or footer yet, only from the dashboard's Premium page.
// The numbers mirror notsobot.api's `utilities/constants/limits.py` and the bot's `TagLimitDefaults`, keep them in sync.

import { ArrowRight, Bot, Check, Clock, Crown, FileUp, Minus, Server, Sparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Routes, Urls } from '@/config';
import { hasTranslation, useI18n, type TranslationKey } from '@/i18n';
import { DiscordSkus, UserPremiumTypes } from '@/lib/api';
import { cn } from '@/lib/utils';


type TierId = 'free' | 'premium' | 'plus' | 'plusAi';

interface Tier {
  id: Exclude<TierId, 'free'>,
  name: string,
  sku: string,
  // shown as "Everything in <includes>, plus:"
  includes?: string,
  // `premium.<id>.perk_<n>`, n from 1
  perks: number,
}

// the tagline is `premium.<id>.tagline`
const TIERS: Array<Tier> = [
  {id: 'premium', name: 'NotSoPremium', sku: DiscordSkus.USER_NOTSOPREMIUM, perks: 8},
  {id: 'plus', name: 'NotSoPremium Plus', sku: DiscordSkus.USER_NOTSOPREMIUM_PLUS, includes: 'NotSoPremium', perks: 4},
  {id: 'plusAi', name: 'NotSoPremium Plus AI', sku: DiscordSkus.USER_NOTSOPREMIUM_PLUS_AI, includes: 'NotSoPremium Plus', perks: 5},
];

// labels are `premium.column.<id>`
const TIER_COLUMNS: Array<TierId> = ['free', 'premium', 'plus', 'plusAi'];

// `true`/`false` render as a check or a dash, translation keys as their text and anything else as-is. One value per
// column in TIER_COLUMNS
type Cell = TranslationKey | string | boolean;

const COMPARISON: Array<{group: TranslationKey, icon: LucideIcon, rows: Array<{label: TranslationKey, values: [Cell, Cell, Cell, Cell]}>}> = [
  {
    group: 'premium.group.media',
    icon: FileUp,
    rows: [
      // free follows the caller's discord upload limit (nitro, server boosts), which the bot sends as `max_file_size`
      {label: 'premium.row.largest_file', values: ['premium.value.discord_limit_100', '200 MB', '200 MB', '200 MB']},
      {label: 'premium.row.file_lifetime', values: ['premium.value.days_14', 'premium.value.days_28', 'premium.value.days_28', 'premium.value.days_28']},
      {label: 'premium.row.download_quality', values: ['premium.value.up_to_720', 'premium.value.up_to_1440', 'premium.value.up_to_1440', 'premium.value.up_to_1440']},
      {label: 'premium.row.image_fallback', values: [false, true, true, true]},
    ],
  },
  {
    group: 'premium.group.time',
    icon: Clock,
    rows: [
      // premium jobs go to the `high` queue, which only the premium rq worker pool takes (free ones go to `low`)
      {label: 'premium.row.queue', values: ['premium.value.shared', 'premium.value.priority', 'premium.value.priority', 'premium.value.priority']},
      // each media command's whole budget, downloading its links included (the api's `command_budget.py`)
      {label: 'premium.row.media', values: ['30s', '60s', '90s', '120s']},
      {label: 'premium.row.tag', values: ['40s', '70s', '100s', '130s']},
      {label: 'premium.row.code', values: ['15s', '30s', '45s', '45s']},
    ],
  },
  {
    group: 'premium.group.commands',
    icon: Server,
    rows: [
      {label: 'premium.row.custom_commands', values: [false, true, true, true]},
      // music is free, its perks come from a premium server slot (or `MUSIC_ACCESS`), not the user's own premium
      {label: 'premium.row.music', values: [true, true, true, true]},
      // `tts play` (premium, premium servers, or a server staff gave `MUSIC_ACCESS`)
      {label: 'premium.row.tts', values: [false, true, true, true]},
      {label: 'premium.row.server_slots', values: [false, false, '2', '2']},
      {label: 'premium.row.voice_clones', values: [false, false, '1', '3']},
    ],
  },
  {
    group: 'premium.group.ai',
    icon: Bot,
    rows: [
      {label: 'premium.row.notsoai', values: [false, false, false, true]},
      {label: 'premium.row.ai_tags', values: [false, false, false, true]},
    ],
  },
];

// what a server gets from a member who gave it their premium (the api's `*_PREMIUM_FROM_SERVER` limits), next to what
// it has without. perks with no `free` are things a server can't have at all without premium
const SERVER_PERKS: Array<{label: TranslationKey, free?: Cell, server?: Cell}> = [
  {label: 'premium.row.media', free: '30s', server: '45s'},
  {label: 'premium.row.tag', free: '40s', server: '60s'},
  {label: 'premium.row.code', free: '15s', server: '20s'},
  {label: 'premium.row.largest_file', free: 'premium.value.discord_limit', server: '100 MB'},
  {label: 'premium.row.file_lifetime', free: 'premium.value.days_14', server: 'premium.value.days_28'},
  {label: 'premium.row.download_quality', free: '720p', server: '1080p'},
  {label: 'premium.row.queue', free: 'premium.value.shared', server: 'premium.value.priority'},
  {label: 'premium.server_perk.custom_commands'},
  // the api's `MAX_MUSIC_QUEUE_AMOUNT` and `MAX_MUSIC_QUEUE_PREMIUM_AMOUNT`
  {label: 'premium.server_perk.music_queue', free: 'premium.value.songs_100', server: 'premium.value.songs_1000'},
  {label: 'premium.server_perk.music_247'},
  {label: 'premium.server_perk.music_playlists'},
  {label: 'premium.server_perk.music_effects'},
  {label: 'premium.server_perk.music_volume'},
  {label: 'premium.server_perk.tts'},
  {label: 'premium.server_perk.image_fallback'},
  // the api's `MAX_SERVER_AI_MESSAGES` every `SERVER_AI_MESSAGES_WINDOW`, shared by everyone in the server
  {label: 'premium.server_perk.notsoai'},
];


// a cell's text: its translation when it's a key, as-is otherwise ('30s', '200 MB')
function useCellText(): (value: string) => string {
  const { t } = useI18n();
  return (value) => (hasTranslation(value)) ? t(value) : value;
}


function currentTierId(premiumType: number | undefined): TierId | null {
  switch (premiumType) {
    case UserPremiumTypes.NONE: return 'free';
    case UserPremiumTypes.PREMIUM: return 'premium';
    case UserPremiumTypes.PREMIUM_PLUS: return 'plus';
    // complimentary premium has everything plus ai has
    case UserPremiumTypes.PREMIUM_FREE:
    case UserPremiumTypes.PREMIUM_PLUS_AI: return 'plusAi';
  }
  return null;
}


export function PremiumPage() {
  const { user } = useAuth();
  const { t, rich } = useI18n();
  const current = currentTierId(user?.premium_type);

  return (
    <div className='container-page pb-16'>
      <PageHeader
        title={(
          <span className='flex items-center gap-3'>
            <Crown className='size-8 text-warning' aria-hidden/>
            NotSoPremium
          </span>
        )}
        description={t('premium.description')}
      >
        <HowToSubscribe signedIn={!!user}/>
      </PageHeader>

      <section id='premium-tiers' aria-labelledby='premium-tiers-title' className='mb-16 scroll-mt-24'>
        <h2 id='premium-tiers-title' className='section-label mb-4'>{t('premium.tiers')}</h2>
        <div className='grid gap-6 lg:grid-cols-3'>
          {TIERS.map((tier) => <TierCard key={tier.id} tier={tier} current={current === tier.id}/>)}
        </div>
      </section>

      <section id='premium-servers' aria-labelledby='premium-servers-title' className='mb-16 scroll-mt-24'>
        <div className='card grid gap-6 p-6 md:grid-cols-[1fr_1.4fr] md:p-8'>
          <div>
            <div className='mb-4 flex size-12 items-center justify-center rounded-lg bg-brand/10'>
              <Server className='size-6 text-brand'/>
            </div>
            <h2 id='premium-servers-title' className='mb-2 text-2xl text-white'>{t('premium.servers.title')}</h2>
            <p className='text-muted'>
              {rich('premium.servers.description', {code: (chunk) => <code className='text-code'>{chunk}</code>})}
            </p>
            <p className='mt-3 text-muted'>{t('premium.servers.stacking')}</p>
            <p className='mt-3 text-sm text-subtle'>{t('premium.servers.owning')}</p>
          </div>
          <div>
            <div aria-hidden className='mb-1 flex justify-end gap-2 px-1 text-xs text-subtle'>
              <span>{t('premium.servers.without')}</span>
              <ArrowRight className='size-3.5'/>
              <span className='text-warning'>{t('premium.servers.with')}</span>
            </div>
            <ul className='divide-y divide-line'>
              {SERVER_PERKS.map((perk) => <ServerPerk key={perk.label} {...perk}/>)}
            </ul>
          </div>
        </div>
      </section>

      <section id='premium-compare' aria-labelledby='premium-compare-title' className='scroll-mt-24'>
        <h2 id='premium-compare-title' className='section-label mb-4'>{t('premium.compare')}</h2>
        <ComparisonTable current={current}/>
        <p className='mt-3 text-xs text-subtle'>
          {rich('premium.compare_note', {terms: (chunk) => <Link to={Routes.LEGAL_TERMS_OF_SERVICE} className='underline hover:text-muted'>{chunk}</Link>})}
        </p>
      </section>
    </div>
  );
}


function HowToSubscribe({ signedIn }: {signedIn: boolean}) {
  const { t, rich } = useI18n();
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
      <div className='flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm'>
        <Sparkles className='size-5 shrink-0 text-warning' aria-hidden/>
        <span className='text-fg'>
          {rich('premium.how.store', {b: (chunk) => <span className='font-semibold text-white'>{chunk}</span>})}
        </span>
      </div>
      <a href={Urls.DISCORD_STORE} target='_blank' rel='noreferrer' className='btn btn-primary'>{t('premium.how.open_store')}</a>
      {(signedIn) ? (
        <Link to={Routes.DASHBOARD_PREMIUM} className='btn btn-secondary'>{t('premium.how.manage')}</Link>
      ) : (
        <Link to={`${Routes.FAQ}#premium`} className='btn btn-ghost'>{t('premium.how.faq')}</Link>
      )}
    </div>
  );
}


function TierCard({ tier, current }: {tier: Tier, current: boolean}) {
  const { t, rich } = useI18n();
  const ai = tier.id === 'plusAi';
  return (
    <article
      className={cn(
        'card flex flex-col p-6',
        (current) ? 'border-warning/60' : (ai) ? 'border-brand/40 bg-gradient-to-b from-brand/10 to-surface' : null,
      )}
    >
      <div className='mb-1 flex items-center justify-between gap-2'>
        <h3 className='text-xl font-semibold text-white'>{tier.name}</h3>
        {(current) ? <span className='chip bg-warning/15 text-xs text-warning'>{t('premium.tier.yours')}</span> : null}
      </div>
      <p className='mb-5 text-muted'>{t(`premium.${tier.id}.tagline`)}</p>
      {(tier.includes) ? (
        <p className='mb-3 text-sm text-subtle'>
          {rich('premium.tier.includes', {b: (chunk) => <span className='text-fg'>{chunk}</span>}, {tier: tier.includes})}
        </p>
      ) : null}
      <ul className='mb-6 grid gap-3'>
        {Array.from({length: tier.perks}, (_, index) => {
          const key = `premium.${tier.id}.perk_${index + 1}` as TranslationKey;
          return <Perk key={key}>{t(key)}</Perk>;
        })}
      </ul>
      <a
        href={`${Urls.DISCORD_STORE}/${tier.sku}`}
        target='_blank'
        rel='noreferrer'
        className={cn('btn mt-auto w-full', (ai) ? 'btn-primary' : 'btn-secondary')}
      >
        {(current) ? t('premium.tier.view_store') : t('premium.tier.get', {tier: tier.name})}
      </a>
    </article>
  );
}


function ServerPerk({ label, free, server }: {label: TranslationKey, free?: Cell, server?: Cell}) {
  const { t } = useI18n();
  const text = useCellText();
  return (
    <li className='flex items-center justify-between gap-4 px-1 py-2 text-sm'>
      <span className='flex items-center gap-2.5 text-fg'>
        <Check className='size-4 shrink-0 text-success' aria-hidden/>
        {t(label)}
      </span>
      {(typeof free === 'string' && typeof server === 'string') ? (
        <span className='flex shrink-0 items-center gap-2 tabular-nums'>
          <span className='text-subtle'>{text(free)}</span>
          <ArrowRight className='size-3.5 text-subtle' aria-label={t('premium.servers.becomes')}/>
          <span className='font-medium text-warning'>{text(server)}</span>
        </span>
      ) : null}
    </li>
  );
}


function Perk({ children }: {children: ReactNode}) {
  return (
    <li className='flex gap-2.5 text-sm text-fg'>
      <Check className='mt-0.5 size-4 shrink-0 text-success' aria-hidden/>
      <span>{children}</span>
    </li>
  );
}


function ComparisonTable({ current }: {current: TierId | null}) {
  const { t } = useI18n();
  return (
    <div className='card overflow-x-auto'>
      <table className='w-full min-w-[36rem] text-sm'>
        <thead>
          <tr className='border-b border-line text-left'>
            <th scope='col' className='px-4 py-3 font-medium text-muted'><span className='sr-only'>{t('premium.perk')}</span></th>
            {TIER_COLUMNS.map((column) => (
              <th
                key={column}
                scope='col'
                className={cn('px-4 py-3 text-center font-semibold', (current === column) ? 'text-warning' : 'text-white')}
              >
                {t(`premium.column.${column}`)}
                {(current === column) ? <span className='block text-xs font-normal'>{t('premium.column.you')}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        {COMPARISON.map(({ group, icon: Icon, rows }) => (
          <tbody key={group} className='border-b border-line last:border-b-0'>
            <tr>
              <th scope='colgroup' colSpan={TIER_COLUMNS.length + 1} className='bg-surface-2 px-4 py-2 text-left'>
                <span className='section-label flex items-center gap-2'>
                  <Icon className='size-3.5' aria-hidden/>
                  {t(group)}
                </span>
              </th>
            </tr>
            {rows.map((row) => (
              <tr key={row.label} className='border-t border-line/60'>
                <th scope='row' className='px-4 py-2.5 text-left font-normal text-fg'>{t(row.label)}</th>
                {row.values.map((value, index) => (
                  <td key={TIER_COLUMNS[index]} className={cn('px-4 py-2.5 text-center whitespace-nowrap tabular-nums', (current === TIER_COLUMNS[index]) && 'bg-warning/5')}>
                    <CellValue value={value}/>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}


function CellValue({ value }: {value: Cell}) {
  const { t } = useI18n();
  const text = useCellText();
  if (value === true) {
    return <Check className='mx-auto size-4 text-success' aria-label={t('premium.included')}/>;
  }
  if (value === false) {
    return <Minus className='mx-auto size-4 text-subtle' aria-label={t('premium.not_included')}/>;
  }
  return <span className='text-fg'>{text(value)}</span>;
}
