// What each NotSoPremium tier unlocks, and the NotSoCredits packs, linked from the navbar, footer and the bot's
// `premium` command. The numbers mirror notsobot.api's `utilities/constants/limits.py` and the bot's
// `TagLimitDefaults` (credits are in `lib/credits.ts`), keep them in sync. NotSoAI's copy of this page is
// notsobot.api's `prompts/sections/premium.txt`, update it too when perks change.

import { ArrowRight, Bot, Check, Clock, Coins, Crown, FileUp, Link2, Minus, Music, Server, Sparkles, type LucideIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { useAuth } from '@/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Routes, Urls } from '@/config';
import { hasTranslation, useI18n, type TranslationKey } from '@/i18n';
import { DiscordSkus, UserPremiumTypes } from '@/lib/api';
import {
  CREDIT_PACKS,
  CREDITS_AI_MESSAGE,
  CREDITS_PER_TTS_BYTE,
  CREDITS_WEEKLY_PREMIUM_PLUS,
  CREDITS_ROLLOVER_PREMIUM_MAX,
  CREDITS_WEEKLY_PREMIUM_MAX,
  CREDITS_WEEKLY_SERVER_AI_SLOT,
  CREDITS_WEEKLY_SERVER_TTS_SLOT,
  MAX_SERVER_VOICE_CLONES,
  MAX_SERVER_VOICE_CLONES_MAX,
  MAX_VOICE_CLONES_CREDITS,
  MAX_VOICE_CLONES_PLUS,
  MAX_VOICE_CLONES_MAX,
  SERVER_AI_MESSAGES_PER_SLOT,
  creditsLabel,
  creditsToMessages,
  creditsToSpeechHours,
  type CreditPack,
} from '@/lib/credits';
import { cn, decodeHash, formatNumber } from '@/lib/utils';


type TierId = 'free' | 'premium' | 'plus' | 'max';

interface Tier {
  id: Exclude<TierId, 'free'>,
  name: string,
  sku: string,
  // shown as "Everything in <includes>, plus:"
  includes?: string,
  // `premium.<id>.perk_<n>`, n from 1
  perks: number,
}

// the api's `MAX_SAVED_FONTS_USER` and `MAX_SAVED_FONTS_GUILD`, fonts kept to use by name (any premium for your own, a
// premium server for the server's)
const MAX_SAVED_FONTS_USER = 10;
const MAX_SAVED_FONTS_SERVER = 25;
// the api's `MAX_SAVED_FONTS_GUILD_PREMIUM_MAX`, a server with a Max member's slot
const MAX_SAVED_FONTS_SERVER_MAX = 50;

// the tagline is `premium.<id>.tagline`
const TIERS: Array<Tier> = [
  {id: 'premium', name: 'NotSoPremium', sku: DiscordSkus.USER_NOTSOPREMIUM, perks: 8},
  {id: 'plus', name: 'NotSoPremium Plus', sku: DiscordSkus.USER_NOTSOPREMIUM_PLUS, includes: 'NotSoPremium', perks: 5},
  // NotSoPremium Plus AI until 2026-11-12
  {id: 'max', name: 'NotSoPremium Max', sku: DiscordSkus.USER_NOTSOPREMIUM_MAX, includes: 'NotSoPremium Plus', perks: 5},
];

// labels are `premium.column.<id>`
const TIER_COLUMNS: Array<TierId> = ['free', 'premium', 'plus', 'max'];

interface ComparisonColumn {
  id: string,
  label: TranslationKey,
}

const TIER_TABLE_COLUMNS: Array<ComparisonColumn> = TIER_COLUMNS.map((id) => ({id, label: `premium.column.${id}` as TranslationKey}));

// `true`/`false` render as a check or a dash, translation keys as their text and anything else as-is, `{value, sub}` the
// value with a smaller line under it (what a week's credits buy). One value per column of its table
type CellText = TranslationKey | string;
type Cell = CellText | boolean | {value: CellText, sub: CellText};

// a group of rows, one value per column of the table it's in
interface ComparisonGroup {
  group: TranslationKey,
  icon: LucideIcon,
  rows: Array<{label: TranslationKey, values: ReadonlyArray<Cell>}>,
}

const COMPARISON: Array<ComparisonGroup> = [
  {
    group: 'premium.group.media',
    icon: FileUp,
    rows: [
      // free follows the caller's discord upload limit (nitro, server boosts), which the bot sends as `max_file_size`
      {label: 'premium.row.largest_file', values: ['premium.value.discord_limit_100', '200 MB', '200 MB', '200 MB']},
      {label: 'premium.row.file_lifetime', values: ['premium.value.days_14', 'premium.value.days_28', 'premium.value.days_28', 'premium.value.days_28']},
      {label: 'premium.row.download_quality', values: ['premium.value.up_to_720', 'premium.value.up_to_1080', 'premium.value.up_to_1440', 'premium.value.up_to_1440']},
      // premium jobs (the `high`/`medium` queues) get the api's MAX_ANIMATED_FRAMES_PREMIUM
      {label: 'premium.row.animated_frames', values: ['premium.value.frames_1080', 'premium.value.frames_2160', 'premium.value.frames_2160', 'premium.value.frames_2160']},
      // a still image's size before it's shrunk, the api's MAX_WIDTH and MAX_STILL_WIDTH_PREMIUM (premium jobs)
      {label: 'premium.row.still_size', values: ['2048px', '4096px', '4096px', '4096px']},
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
      {label: 'premium.row.saved_fonts', values: [false, String(MAX_SAVED_FONTS_USER), String(MAX_SAVED_FONTS_USER), String(MAX_SAVED_FONTS_USER)]},
      {label: 'premium.row.server_slots', values: [false, false, '2', '2']},
      // without plus, bought credits clone a few
      {label: 'premium.row.voice_clones', values: ['premium.value.voices_with_credits', 'premium.value.voices_with_credits', String(MAX_VOICE_CLONES_PLUS), String(MAX_VOICE_CLONES_MAX)]},
    ],
  },
  {
    group: 'premium.group.ai',
    icon: Bot,
    rows: [
      // NotSoCredits packs let anyone use NotSoAI, Plus and Max also pay for it with their weekly credits
      {label: 'premium.row.notsoai', values: ['premium.value.credit_packs', 'premium.value.credit_packs', 'premium.value.weekly_credits', 'premium.value.weekly_credits']},
      {label: 'premium.row.ai_tags', values: ['premium.value.credit_packs', 'premium.value.credit_packs', 'premium.value.weekly_credits', 'premium.value.weekly_credits']},
      // the weekly credits with what they buy under them, all on NotSoAI or all on voices (`compare_credits_note`)
      {label: 'premium.row.weekly_credits', values: [
        false,
        false,
        {value: creditsLabel(CREDITS_WEEKLY_PREMIUM_PLUS), sub: 'premium.value.worth_plus'},
        {value: creditsLabel(CREDITS_WEEKLY_PREMIUM_MAX), sub: 'premium.value.worth_max'},
      ]},
      // the most a Max member's unused weeks bank
      {label: 'premium.row.credits_rollover', values: [false, false, false, 'premium.value.rollover_up_to']},
    ],
  },
];

// the premium servers table under the tiers': what one slot a member put on a server gives it (the api's
// `*_PREMIUM_FROM_SERVER` limits), next to none. Plus and Max slots only differ in NotSoAI, and NotSoAI messages and
// voice credits add up per slot (`compare_servers_note` says so)
const SERVER_TABLE_COLUMNS: Array<ComparisonColumn> = [
  {id: 'none', label: 'premium.server_column.none'},
  {id: 'plus', label: 'premium.server_column.plus'},
  {id: 'max', label: 'premium.server_column.max'},
];

const SERVER_COMPARISON: Array<ComparisonGroup> = [
  {
    group: 'premium.group.media',
    icon: FileUp,
    rows: [
      {label: 'premium.row.largest_file', values: ['premium.value.discord_limit', '100 MB', '100 MB']},
      // the api's `MAX_FILE_UPLOAD_EXPIRE_TIME_PREMIUM_FROM_SERVER`, a Max slot keeps them as long as premium users
      {label: 'premium.row.file_lifetime', values: ['premium.value.days_14', 'premium.value.days_21', 'premium.value.days_28']},
      {label: 'premium.row.download_quality', values: ['premium.value.up_to_720', 'premium.value.up_to_1080', 'premium.value.up_to_1080']},
      // a premium server's jobs go to the `medium` queue, which gets the premium frame and still size limits too
      {label: 'premium.row.animated_frames', values: ['premium.value.frames_1080', 'premium.value.frames_2160', 'premium.value.frames_2160']},
      {label: 'premium.row.still_size', values: ['2048px', '4096px', '4096px']},
      {label: 'premium.row.image_fallback', values: [false, true, true]},
    ],
  },
  {
    group: 'premium.group.time',
    icon: Clock,
    rows: [
      // a premium server's jobs go to the `medium` queue, between free's `low` and premium users' `high`
      {label: 'premium.row.queue', values: ['premium.value.shared', 'premium.value.medium_priority', 'premium.value.medium_priority']},
      {label: 'premium.row.media', values: ['30s', '45s', '45s']},
      {label: 'premium.row.tag', values: ['40s', '60s', '60s']},
      {label: 'premium.row.code', values: ['15s', '20s', '20s']},
    ],
  },
  {
    group: 'premium.group.commands',
    icon: Server,
    rows: [
      {label: 'premium.server_perk.custom_commands', values: [false, true, true]},
      // `server fonts add`, members with Manage Server
      {label: 'premium.row.saved_fonts', values: [false, String(MAX_SAVED_FONTS_SERVER), String(MAX_SAVED_FONTS_SERVER_MAX)]},
    ],
  },
  {
    group: 'premium.group.music',
    icon: Music,
    rows: [
      // the api's `MAX_MUSIC_QUEUE_AMOUNT` and `MAX_MUSIC_QUEUE_PREMIUM_AMOUNT`
      // the api's `MAX_MUSIC_QUEUE_PREMIUM_MAX_AMOUNT` with a Max slot
      {label: 'premium.server_perk.music_queue', values: ['premium.value.songs_100', 'premium.value.songs_1000', 'premium.value.songs_2000']},
      {label: 'premium.server_perk.music_247', values: [false, true, true]},
      // turning `pause_alone` off (the api's `update_music_settings`)
      {label: 'premium.row.music_alone', values: [false, true, true]},
      {label: 'premium.server_perk.music_playlists', values: [false, true, true]},
      {label: 'premium.server_perk.music_effects', values: [false, true, true]},
      // any speed or volume but 100% (the api's `control_guild_music`)
      {label: 'premium.row.music_speed_volume', values: [false, true, true]},
      {label: 'premium.row.music_crossfade', values: [false, true, true]},
    ],
  },
  {
    group: 'premium.group.ai',
    icon: Bot,
    rows: [
      // only Max slots give NotSoAI weekly credits, otherwise it's the credits members give it
      {label: 'premium.row.notsoai', values: ['premium.value.credit_packs', 'premium.value.credit_packs', 'premium.value.weekly_credits']},
      // without a slot, credits given to it let it have the api's `MAX_VOICE_CLONE_AMOUNT_CREDITS`
      {label: 'premium.row.server_voices', values: ['premium.value.voices_with_credits', String(MAX_SERVER_VOICE_CLONES), String(MAX_SERVER_VOICE_CLONES_MAX)]},
      // `CREDITS_WEEKLY_SERVER_AI_SLOT` (Max only) and `CREDITS_WEEKLY_SERVER_TTS_SLOT` (every slot), each its own
      // week that only buys its own thing, so what they buy adds up (`+`) instead of the tiers' `or`
      {label: 'premium.row.weekly_credits', values: [
        false,
        {value: 'premium.value.slot_credits_plus', sub: 'premium.value.worth_slot_plus'},
        {value: 'premium.value.slot_credits_max', sub: 'premium.value.worth_slot_max'},
      ]},
    ],
  },
];

// the credit numbers the perks and the credits section are written with, formatted for the reader's language
function creditVariables() {
  return {
    ai_message: formatNumber(CREDITS_AI_MESSAGE),
    tts_byte: formatNumber(CREDITS_PER_TTS_BYTE),
    max_credits: formatNumber(CREDITS_WEEKLY_PREMIUM_MAX),
    max_credits_label: creditsLabel(CREDITS_WEEKLY_PREMIUM_MAX),
    max_messages: formatNumber(creditsToMessages(CREDITS_WEEKLY_PREMIUM_MAX)),
    max_minutes: formatNumber(Math.round(creditsToSpeechHours(CREDITS_WEEKLY_PREMIUM_MAX) * 60)),
    max_rollover: formatNumber(CREDITS_ROLLOVER_PREMIUM_MAX),
    max_rollover_label: creditsLabel(CREDITS_ROLLOVER_PREMIUM_MAX),
    plus_credits: formatNumber(CREDITS_WEEKLY_PREMIUM_PLUS),
    plus_credits_label: creditsLabel(CREDITS_WEEKLY_PREMIUM_PLUS),
    plus_messages: formatNumber(creditsToMessages(CREDITS_WEEKLY_PREMIUM_PLUS)),
    plus_minutes: formatNumber(Math.round(creditsToSpeechHours(CREDITS_WEEKLY_PREMIUM_PLUS) * 60)),
    saved_fonts: formatNumber(MAX_SAVED_FONTS_USER),
    saved_fonts_server: formatNumber(MAX_SAVED_FONTS_SERVER),
    server_voice_credits: formatNumber(CREDITS_WEEKLY_SERVER_TTS_SLOT),
    server_voice_credits_label: creditsLabel(CREDITS_WEEKLY_SERVER_TTS_SLOT),
    slot_credits_label: creditsLabel(CREDITS_WEEKLY_SERVER_AI_SLOT),
    server_voice_minutes: formatNumber(Math.round(creditsToSpeechHours(CREDITS_WEEKLY_SERVER_TTS_SLOT) * 60)),
    server_voices: formatNumber(MAX_SERVER_VOICE_CLONES),
    voices_credits: formatNumber(MAX_VOICE_CLONES_CREDITS),
    voices_plus: formatNumber(MAX_VOICE_CLONES_PLUS),
    voices_max: formatNumber(MAX_VOICE_CLONES_MAX),
    slot_messages: formatNumber(SERVER_AI_MESSAGES_PER_SLOT),
    slot_messages_double: formatNumber(SERVER_AI_MESSAGES_PER_SLOT * 2),
  };
}


// a cell's text: its translation when it's a key, as-is otherwise ('30s', '200 MB')
function useCellText(): (value: string) => string {
  const { t } = useI18n();
  return (value) => (hasTranslation(value)) ? t(value, creditVariables()) : value;
}


function currentTierId(premiumType: number | undefined): TierId | null {
  switch (premiumType) {
    case UserPremiumTypes.NONE: return 'free';
    case UserPremiumTypes.PREMIUM: return 'premium';
    case UserPremiumTypes.PREMIUM_PLUS: return 'plus';
    // complimentary premium has everything max has
    case UserPremiumTypes.PREMIUM_FREE:
    case UserPremiumTypes.PREMIUM_MAX: return 'max';
  }
  return null;
}


export function PremiumPage() {
  const { user } = useAuth();
  const { t, rich } = useI18n();
  const current = currentTierId(user?.premium_type);
  const location = useLocation();

  // `/premium#premium-compare-servers` (or any section's id) jumps to it, also when the hash changes on the page
  useEffect(() => {
    const id = decodeHash(location.hash);
    if (id) {
      document.getElementById(id)?.scrollIntoView({block: 'start'});
    }
  }, [location.hash]);

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
        {/* a nod to NotSoSuper, the bot's original creator. english in every language, the pun is on the name */}
        <p className='mt-4 text-center text-sm italic text-subtle'>Isn’t this a NotSoSuper deal?</p>
      </section>

      <section id='premium-servers' aria-labelledby='premium-servers-title' className='mb-16 scroll-mt-24'>
        {/* how slots work, what they give a server is the comparison table at the bottom */}
        <div className='card p-6 md:p-8'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-lg bg-brand/10'>
            <Server className='size-6 text-brand-text'/>
          </div>
          <h2 id='premium-servers-title' className='mb-2 text-2xl text-white'>{t('premium.servers.title')}</h2>
          <div className='max-w-3xl'>
            <p className='text-muted'>
              {rich('premium.servers.description', {code: (chunk) => <code className='text-code'>{chunk}</code>})}
            </p>
            <p className='mt-3 text-muted'>{t('premium.servers.stacking', creditVariables())}</p>
            <p className='mt-3 text-sm text-subtle'>{t('premium.servers.owning')}</p>
          </div>
          <a href='#premium-compare-servers' className='mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline'>
            {t('premium.servers.compare_link')}
            <ArrowRight className='size-4' aria-hidden/>
          </a>
        </div>
      </section>

      <CreditsSection/>

      <section id='premium-compare' aria-labelledby='premium-compare-title' className='scroll-mt-24'>
        <AnchorHeading id='premium-compare-title' sectionId='premium-compare'>{t('premium.compare')}</AnchorHeading>
        <ComparisonTable columns={TIER_TABLE_COLUMNS} groups={COMPARISON} current={current}/>
        <p className='mt-3 text-xs text-subtle'>{t('premium.compare_credits_note')}</p>
        <p className='mt-1 text-xs text-subtle'>
          {rich('premium.compare_note', {terms: (chunk) => <Link to={Routes.LEGAL_TERMS_OF_SERVICE} className='underline hover:text-muted'>{chunk}</Link>})}
        </p>
      </section>

      <section id='premium-compare-servers' aria-labelledby='premium-compare-servers-title' className='mt-12 scroll-mt-24'>
        <AnchorHeading id='premium-compare-servers-title' sectionId='premium-compare-servers'>{t('premium.compare_servers')}</AnchorHeading>
        <ComparisonTable columns={SERVER_TABLE_COLUMNS} groups={SERVER_COMPARISON} current={null}/>
        <p className='mt-3 text-xs text-subtle'>{t('premium.compare_servers_note', creditVariables())}</p>
        <p className='mt-1 text-xs text-subtle'>{t('premium.compare_credits_note')}</p>
      </section>
    </div>
  );
}


// a section heading that links to its own section (`/premium#premium-compare`), like the changelog's days, so it can be
// shared. The icon shows on hover and focus
function AnchorHeading({ id, sectionId, children }: {id: string, sectionId: string, children: ReactNode}) {
  return (
    <h2 id={id} className='section-label mb-4'>
      <a href={`#${sectionId}`} className='group inline-flex items-center gap-1.5 transition-colors hover:text-white'>
        {children}
        <Link2 className='size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100' aria-hidden/>
      </a>
    </h2>
  );
}


function HowToSubscribe({ signedIn }: {signedIn: boolean}) {
  const { t, rich } = useI18n();
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
      {/* the hint wraps instead of the buttons, which keep their text on one line */}
      <div className='flex min-w-0 items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm'>
        <Sparkles className='size-5 shrink-0 text-warning' aria-hidden/>
        <span className='text-fg'>
          {rich('premium.how.store', {b: (chunk) => <span className='font-semibold text-white'>{chunk}</span>})}
        </span>
      </div>
      <a href={Urls.DISCORD_STORE} target='_blank' rel='noreferrer' className='btn btn-primary shrink-0 whitespace-nowrap'>{t('premium.how.open_store')}</a>
      {(signedIn) ? (
        <Link to={Routes.DASHBOARD_PREMIUM} className='btn btn-secondary shrink-0 whitespace-nowrap'>{t('premium.how.manage')}</Link>
      ) : (
        <Link to={`${Routes.FAQ}#premium`} className='btn btn-ghost shrink-0 whitespace-nowrap'>{t('premium.how.faq')}</Link>
      )}
    </div>
  );
}


function TierCard({ tier, current }: {tier: Tier, current: boolean}) {
  const { t, rich } = useI18n();
  const ai = tier.id === 'max';
  return (
    <article
      className={cn(
        'card flex flex-col p-6',
        (current) ? 'border-warning/60' : (ai) ? 'border-brand/40' : null,
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
          return <Perk key={key}>{t(key, creditVariables())}</Perk>;
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


function CreditsSection() {
  const { t, rich } = useI18n();
  return (
    <section id='premium-credits' aria-labelledby='premium-credits-title' className='mb-16 scroll-mt-24'>
      <div className='card grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_1.4fr]'>
        <div>
          <div className='mb-4 flex size-12 items-center justify-center rounded-lg bg-brand/10'>
            <Coins className='size-6 text-brand-text'/>
          </div>
          <h2 id='premium-credits-title' className='mb-2 text-2xl text-white'>{t('premium.credits.title')}</h2>
          <p className='text-muted'>{t('premium.credits.description', creditVariables())}</p>
          <p className='mt-3 text-muted'>{t('premium.credits.packs')}</p>
          <ul className='mt-2 grid gap-2'>
            <Perk>{t('premium.credits.packs_1', creditVariables())}</Perk>
            <Perk>{t('premium.credits.packs_2')}</Perk>
            <Perk>{rich('premium.credits.packs_3', {code: (chunk) => <code className='text-code'>{chunk}</code>}, creditVariables())}</Perk>
          </ul>
        </div>
        <ul className='grid content-start gap-4 sm:grid-cols-2'>
          {CREDIT_PACKS.map((pack) => <CreditPackCard key={pack.sku} pack={pack}/>)}
        </ul>
      </div>
    </section>
  );
}


function CreditPackCard({ pack }: {pack: CreditPack}) {
  const { t } = useI18n();
  // minutes under an hour and a half, half hours above
  const minutes = Math.round(creditsToSpeechHours(pack.credits) * 60);
  const hours = Math.round(minutes / 30) / 2;
  return (
    <li className='flex flex-col rounded-lg border border-line bg-surface-2 p-4'>
      <div className='mb-3 flex items-start justify-between gap-2'>
        <h3 className='font-semibold text-white'>{t('premium.credits.pack_name', {amount: creditsLabel(pack.credits)})}</h3>
        {(pack.bonus) ? (
          <span className='chip shrink-0 bg-warning/15 text-xs text-warning'>{t('premium.credits.bonus', {percent: pack.bonus})}</span>
        ) : null}
      </div>
      <ul className='mb-4 grid gap-2'>
        <Perk>{t('premium.credits.pack_messages', {count: formatNumber(creditsToMessages(pack.credits))})}</Perk>
        <Perk>
          {(minutes < 90) ? t('premium.credits.pack_speech_minutes', {count: formatNumber(minutes)}) : t('premium.credits.pack_speech_hours', {count: formatNumber(hours)})}
        </Perk>
      </ul>
      <a
        href={`${Urls.DISCORD_STORE}/${pack.sku}`}
        target='_blank'
        rel='noreferrer'
        className='btn btn-secondary btn-sm mt-auto w-full'
      >
        {t('premium.credits.get')}
      </a>
    </li>
  );
}


function Perk({ children }: {children: ReactNode}) {
  return (
    <li className='flex gap-2.5 text-sm text-fg'>
      <Check className='mt-0.5 size-4 shrink-0 text-success-text' aria-hidden/>
      <span>{children}</span>
    </li>
  );
}


// `current` highlights the reader's own column (the tiers' table)
function ComparisonTable({ columns, groups, current }: {columns: Array<ComparisonColumn>, groups: Array<ComparisonGroup>, current: string | null}) {
  const { t } = useI18n();
  return (
    <div className='card overflow-x-auto'>
      <table className='w-full min-w-[36rem] text-sm'>
        <thead>
          <tr className='border-b border-line text-left'>
            <th scope='col' className='px-4 py-3 font-medium text-muted'><span className='sr-only'>{t('premium.perk')}</span></th>
            {columns.map((column) => (
              <th
                key={column.id}
                scope='col'
                className={cn('px-4 py-3 text-center font-semibold', (current === column.id) ? 'text-warning' : 'text-white')}
              >
                {t(column.label)}
                {(current === column.id) ? <span className='block text-xs font-normal'>{t('premium.column.you')}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map(({ group, icon: Icon, rows }) => (
          <tbody key={group} className='border-b border-line last:border-b-0'>
            <tr>
              <th scope='colgroup' colSpan={columns.length + 1} className='bg-surface-2 px-4 py-2 text-left'>
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
                  <td key={columns[index].id} className={cn('px-4 py-2.5 text-center whitespace-nowrap tabular-nums', (current === columns[index].id) && 'bg-warning/5')}>
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
    return <Check className='mx-auto size-4 text-success-text' aria-label={t('premium.included')}/>;
  }
  if (value === false) {
    return <Minus className='mx-auto size-4 text-subtle' aria-label={t('premium.not_included')}/>;
  }
  if (typeof value === 'object') {
    return (
      <>
        <span className='block text-fg'>{text(value.value)}</span>
        <span className='mt-0.5 block whitespace-normal text-xs text-subtle'>{text(value.sub)}</span>
      </>
    );
  }
  return <span className='text-fg'>{text(value)}</span>;
}
