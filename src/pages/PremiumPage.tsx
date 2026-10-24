// What each NotSoPremium tier unlocks. Not linked from the navbar or footer yet, only from the dashboard's Premium page.
// The numbers mirror notsobot.api's `utilities/constants/limits.py` and the bot's `TagLimitDefaults`, keep them in sync.

import { ArrowRight, Bot, Check, Clock, Crown, FileUp, Minus, Server, Sparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Routes, Urls } from '@/config';
import { DiscordSkus, UserPremiumTypes } from '@/lib/api';
import { cn } from '@/lib/utils';


type TierId = 'free' | 'premium' | 'plus' | 'plusAi';

interface Tier {
  id: TierId,
  name: string,
  tagline: string,
  sku: string,
  // shown as "Everything in <includes>, plus:"
  includes?: string,
  perks: Array<string>,
}

const TIERS: Array<Tier> = [
  {
    id: 'premium',
    name: 'NotSoPremium',
    tagline: 'Bigger files and more time for every command.',
    sku: DiscordSkus.USER_NOTSOPREMIUM,
    perks: [
      'Files up to 200 MB, hosted on nsb.gg when they’re too big for Discord',
      'nsb.gg files are kept for 28 days instead of 14',
      'Priority processing on premium-only workers, so you never wait behind free users',
      '60 seconds to process media instead of 30, and twice as long to run code',
      'Tags run for 70 seconds instead of 40',
      'Your own custom commands that follow you everywhere, DMs included',
      'Image commands find an image for you when there’s nothing to edit',
      'Say text to speech in your voice channel with tts play, queued like a song',
    ],
  },
  {
    id: 'plus',
    name: 'NotSoPremium Plus',
    tagline: 'Share your perks with the servers you hang out in.',
    sku: DiscordSkus.USER_NOTSOPREMIUM_PLUS,
    includes: 'NotSoPremium',
    perks: [
      '2 premium server slots: everyone in those servers or group DMs gets premium perks, and you keep yours',
      'Music perks on your premium servers: 24/7, a 1,000 song queue, album and playlist links, live effects, volume and crossfade',
      '90 seconds to process media, 100 to run tags and 45 to run code',
      'Clone a voice for text to speech',
    ],
  },
  {
    id: 'plusAi',
    name: 'NotSoPremium Plus AI',
    tagline: 'Everything, plus NotSoAI.',
    sku: DiscordSkus.USER_NOTSOPREMIUM_PLUS_AI,
    includes: 'NotSoPremium Plus',
    perks: [
      'Talk to NotSoAI by mentioning the bot or replying to it, using our smartest model',
      'AI in your tags with {ai}',
      'Your premium server slots include NotSoAI, using a faster, lighter model, with 50 messages every 12 hours for each slot (stack both on one server for 100)',
      '120 seconds to process media and 130 to run tags',
      'Clone up to 3 voices',
    ],
  },
];

const TIER_COLUMNS: Array<{id: TierId, label: string}> = [
  {id: 'free', label: 'Free'},
  {id: 'premium', label: 'Premium'},
  {id: 'plus', label: 'Plus'},
  {id: 'plusAi', label: 'Plus AI'},
];

// `true`/`false` render as a check or a dash, strings as-is. One value per column in TIER_COLUMNS
type Cell = string | boolean;

const COMPARISON: Array<{group: string, icon: LucideIcon, rows: Array<{label: string, values: [Cell, Cell, Cell, Cell]}>}> = [
  {
    group: 'Media',
    icon: FileUp,
    rows: [
      // free follows the caller's discord upload limit (nitro, server boosts), which the bot sends as `max_file_size`
      {label: 'Largest file', values: ['Your Discord limit, up to 100 MB', '200 MB', '200 MB', '200 MB']},
      {label: 'nsb.gg file lifetime', values: ['14 days', '28 days', '28 days', '28 days']},
      {label: 'Download quality', values: ['Up to 720p', 'Best available', 'Best available', 'Best available']},
      {label: 'Image search fallback', values: [false, true, true, true]},
    ],
  },
  {
    group: 'Time limits',
    icon: Clock,
    rows: [
      // premium jobs go to the `high` queue, which only the premium rq worker pool takes (free ones go to `low`)
      {label: 'Processing queue', values: ['Shared', 'Priority', 'Priority', 'Priority']},
      // each media command's whole budget, downloading its links included (the api's `command_budget.py`)
      {label: 'Media processing', values: ['30s', '60s', '90s', '120s']},
      {label: 'Running a tag', values: ['40s', '70s', '100s', '130s']},
      {label: 'Running code', values: ['15s', '30s', '45s', '45s']},
    ],
  },
  {
    group: 'Commands & servers',
    icon: Server,
    rows: [
      {label: 'Personal custom commands', values: [false, true, true, true]},
      // music is free, its perks come from a premium server slot (or `MUSIC_ACCESS`), not the user's own premium
      {label: 'Music in voice channels', values: [true, true, true, true]},
      // `tts play` (premium, premium servers, or a server staff gave `MUSIC_ACCESS`)
      {label: 'Text to speech in voice channels', values: [false, true, true, true]},
      {label: 'Premium server slots', values: [false, false, '2', '2']},
      {label: 'Voice clones', values: [false, false, '1', '3']},
    ],
  },
  {
    group: 'AI',
    icon: Bot,
    rows: [
      {label: 'NotSoAI', values: [false, false, false, 'Smartest model']},
      {label: '{ai} in tags', values: [false, false, false, true]},
    ],
  },
];

// what a server gets from a member who gave it their premium (the api's `*_PREMIUM_FROM_SERVER` limits), next to what
// it has without. perks with no `free` are things a server can't have at all without premium
const SERVER_PERKS: Array<{label: string, free?: string, server?: string}> = [
  {label: 'Media processing', free: '30s', server: '45s'},
  {label: 'Running a tag', free: '40s', server: '60s'},
  {label: 'Running code', free: '15s', server: '20s'},
  {label: 'Largest file', free: 'Discord limit', server: '100 MB'},
  {label: 'nsb.gg file lifetime', free: '14 days', server: '28 days'},
  {label: 'Download quality', free: '720p', server: '1080p'},
  {label: 'Processing queue', free: 'Shared', server: 'Priority'},
  {label: 'Custom commands for the server'},
  // the api's `MAX_MUSIC_QUEUE_AMOUNT` and `MAX_MUSIC_QUEUE_PREMIUM_AMOUNT`
  {label: 'Music queue', free: '100 songs', server: '1,000 songs'},
  {label: 'Music stays in voice 24/7'},
  {label: 'Album and playlist links in music'},
  {label: 'Live music effects like nightcore, slowed + reverb and 8D'},
  {label: 'Music volume and crossfade between songs'},
  {label: 'Text to speech in voice channels for everyone in the server'},
  {label: 'Image commands find an image for you when there’s nothing to edit'},
  // the api's `MAX_SERVER_AI_MESSAGES` every `SERVER_AI_MESSAGES_WINDOW`, shared by everyone in the server
  {label: 'NotSoAI with a faster, lighter model, 50 messages every 12 hours for each Plus AI slot on the server'},
];


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
        description='An optional subscription that gives NotSoBot more room to work: bigger files, longer time limits, custom commands, voice cloning and NotSoAI. It’s bought through Discord.'
      >
        <HowToSubscribe signedIn={!!user}/>
      </PageHeader>

      <section id='premium-tiers' aria-labelledby='premium-tiers-title' className='mb-16 scroll-mt-24'>
        <h2 id='premium-tiers-title' className='section-label mb-4'>Tiers</h2>
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
            <h2 id='premium-servers-title' className='mb-2 text-2xl text-white'>Premium servers</h2>
            <p className='text-muted'>
              Plus and Plus AI come with 2 premium server slots. Put one on a server or group DM and everyone there gets
              these perks while they use NotSoBot, and you keep your own premium. Add one with <code className='text-code'>/settings premium-servers add</code> in
              the server, or from the dashboard. A slot can be moved to another server 24 hours after it was added.
            </p>
            <p className='mt-3 text-muted'>
              With Plus AI, slots stack: every Plus AI slot on a server adds 50 NotSoAI messages every 12 hours, so
              putting both of yours on one server (or two members adding theirs) gives it 100.
            </p>
            <p className='mt-3 text-sm text-subtle'>Owning a server doesn’t give it premium on its own.</p>
          </div>
          <div>
            <div aria-hidden className='mb-1 flex justify-end gap-2 px-1 text-xs text-subtle'>
              <span>Without</span>
              <ArrowRight className='size-3.5'/>
              <span className='text-warning'>With premium</span>
            </div>
            <ul className='divide-y divide-line'>
              {SERVER_PERKS.map((perk) => <ServerPerk key={perk.label} {...perk}/>)}
            </ul>
          </div>
        </div>
      </section>

      <section id='premium-compare' aria-labelledby='premium-compare-title' className='scroll-mt-24'>
        <h2 id='premium-compare-title' className='section-label mb-4'>Compare tiers</h2>
        <ComparisonTable current={current}/>
        <p className='mt-3 text-xs text-subtle'>
          Limits are per command, and media processing includes downloading any links you give it. Without premium, the largest file follows your Discord upload limit, so Nitro and
          server boosts raise it, up to 100 MB. Perks may change over time, see the <Link to={Routes.LEGAL_TERMS_OF_SERVICE} className='underline hover:text-muted'>Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
}


function HowToSubscribe({ signedIn }: {signedIn: boolean}) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
      <div className='flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm'>
        <Sparkles className='size-5 shrink-0 text-warning' aria-hidden/>
        <span className='text-fg'>
          In Discord, open NotSoBot’s profile and pick <span className='font-semibold text-white'>Store</span>.
        </span>
      </div>
      <a href={Urls.DISCORD_STORE} target='_blank' rel='noreferrer' className='btn btn-primary'>Open the store</a>
      {(signedIn) ? (
        <Link to={Routes.DASHBOARD_PREMIUM} className='btn btn-secondary'>Manage your premium</Link>
      ) : (
        <Link to={`${Routes.FAQ}#premium`} className='btn btn-ghost'>Premium FAQ</Link>
      )}
    </div>
  );
}


function TierCard({ tier, current }: {tier: Tier, current: boolean}) {
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
        {(current) ? <span className='chip bg-warning/15 text-xs text-warning'>Your tier</span> : null}
      </div>
      <p className='mb-5 text-muted'>{tier.tagline}</p>
      {(tier.includes) ? (
        <p className='mb-3 text-sm text-subtle'>Everything in <span className='text-fg'>{tier.includes}</span>, plus:</p>
      ) : null}
      <ul className='mb-6 grid gap-3'>
        {tier.perks.map((perk) => <Perk key={perk}>{perk}</Perk>)}
      </ul>
      <a
        href={`${Urls.DISCORD_STORE}/${tier.sku}`}
        target='_blank'
        rel='noreferrer'
        className={cn('btn mt-auto w-full', (ai) ? 'btn-primary' : 'btn-secondary')}
      >
        {(current) ? 'View in the store' : `Get ${tier.name}`}
      </a>
    </article>
  );
}


function ServerPerk({ label, free, server }: {label: string, free?: string, server?: string}) {
  return (
    <li className='flex items-center justify-between gap-4 px-1 py-2 text-sm'>
      <span className='flex items-center gap-2.5 text-fg'>
        <Check className='size-4 shrink-0 text-success' aria-hidden/>
        {label}
      </span>
      {(free && server) ? (
        <span className='flex shrink-0 items-center gap-2 tabular-nums'>
          <span className='text-subtle'>{free}</span>
          <ArrowRight className='size-3.5 text-subtle' aria-label='becomes'/>
          <span className='font-medium text-warning'>{server}</span>
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
  return (
    <div className='card overflow-x-auto'>
      <table className='w-full min-w-[36rem] text-sm'>
        <thead>
          <tr className='border-b border-line text-left'>
            <th scope='col' className='px-4 py-3 font-medium text-muted'><span className='sr-only'>Perk</span></th>
            {TIER_COLUMNS.map((column) => (
              <th
                key={column.id}
                scope='col'
                className={cn('px-4 py-3 text-center font-semibold', (current === column.id) ? 'text-warning' : 'text-white')}
              >
                {column.label}
                {(current === column.id) ? <span className='block text-xs font-normal'>You</span> : null}
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
                  {group}
                </span>
              </th>
            </tr>
            {rows.map((row) => (
              <tr key={row.label} className='border-t border-line/60'>
                <th scope='row' className='px-4 py-2.5 text-left font-normal text-fg'>{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={TIER_COLUMNS[index].id} className={cn('px-4 py-2.5 text-center whitespace-nowrap tabular-nums', (current === TIER_COLUMNS[index].id) && 'bg-warning/5')}>
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
  if (value === true) {
    return <Check className='mx-auto size-4 text-success' aria-label='Included'/>;
  }
  if (value === false) {
    return <Minus className='mx-auto size-4 text-subtle' aria-label='Not included'/>;
  }
  return <span className='text-fg'>{value}</span>;
}
