import { ArrowRight, RefreshCw, Reply, SquareTerminal, Upload, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { BotInviteLink } from '@/components/BotInviteLink';
import { ImageComparison } from '@/components/ui/ImageComparison';
import { PrefixSunsetNotice } from '@/components/ui/PrefixSunsetNotice';
import { QuarantineNotice, useQuarantineNoticeDismissed } from '@/components/ui/QuarantineNotice';
import { ReportUpdatesNotice } from '@/components/ui/ReportUpdatesNotice';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';
import { CommandTypes, type HomeMedia, type HomeShowcase } from '@/lib/api';
import { useHomeQuery } from '@/lib/api/queries';
import { commandPath } from '@/lib/commandPaths';
import { cn, displayLocale, formatCompact, shuffle } from '@/lib/utils';

import { PREFIXES } from './commands/commandMeta';


// what the gallery doesn't show, `home.features.<key>.title` / `.description`, two rows of four on wide screens
// shown in alphabetical order of their translated titles
const FEATURES = ['ai', 'audio', 'conversion', 'moderation', 'music', 'search', 'tags', 'tts', 'voices'] as const;

// `home.steps.<key>.title` / `.description`
const STEPS: Array<{icon: LucideIcon, key: 'post' | 'run' | 'result'}> = [
  {icon: Upload, key: 'post'},
  {icon: SquareTerminal, key: 'run'},
  {icon: Reply, key: 'result'},
];

const GALLERY_SIZE = 8;
// phones show the first two rows, so the feature list isn't three screens down. the other tiles aren't rendered there
// rather than hidden: a hidden <video autoPlay> still downloads
const GALLERY_PHONE_SIZE = 4;

// a command's real preview from the api (the same media the commands page shows). `GET /home` picks them: every command
// with a result that isn't audio (no flag overlays), and the hero slider's (magik, deepfry, swirl, ... when their
// input and result fit a slider)
interface Showcase {
  after: HomeMedia,
  id: string,
  // as it's run, `/media-iv-distort magik`
  name: string,
  path: string,
}

interface HeroShowcase extends Showcase {
  before: HomeMedia,
  example: string | null,
}

function toShowcase(showcase: HomeShowcase): Showcase {
  return {
    after: showcase.after,
    id: showcase.id,
    // shown as its slash command when it has one, prefix commands are ending
    name: `${PREFIXES[showcase.type]}${showcase.name}`,
    // the api picks the command's first variant, which is its plain /commands/:commandId
    path: commandPath(showcase.id, showcase.type, [ showcase.type ]),
  };
}

// the slider's tabs only name the effect (`/media-iv-distort magik` → `magik`), the "made with" line under it has the
// full command, so the six tabs stay narrow enough for the hero's side column
function effectName(name: string): string {
  return name.split(' ').pop() ?? name;
}


export function HomePage() {
  const { t, language } = useI18n();
  const home = useHomeQuery(language);

  const { sliders, showcases } = useMemo(() => {
    const sliders: Array<HeroShowcase> = (home.data?.hero ?? []).map((item) => ({...toShowcase(item), before: item.before, example: item.example}));
    // the ones the slider doesn't already show first (the api leaves those out of `showcases`), so the gallery adds
    // something. shuffled once per load so a refresh shows other commands
    const rest = shuffle((home.data?.showcases ?? []).map(toShowcase));
    return {sliders, showcases: [ ...rest, ...sliders ]};
  }, [home.data]);
  // "show other commands" walks this one order a visible page at a time, wrapping at the end, so nothing repeats
  // until every showcase has had its turn. tailwind's `md`: the grid is four columns from there, two below it.
  // `wide` is false on the worker and while its page hydrates, which is fine: the commands (so the tiles) only arrive
  // after that
  const wide = useMediaQuery('(min-width: 48rem)');
  const step = (wide) ? GALLERY_SIZE : GALLERY_PHONE_SIZE;
  const [ galleryOffset, setGalleryOffset ] = useState(0);
  const gallery = Array.from({length: Math.min(step, showcases.length)}, (_, index) => showcases[(galleryOffset + index) % showcases.length]);
  // the slider (or its placeholder while the commands load) sits beside the headline on large screens
  const hasSlider = home.isPending || sliders.length > 0;
  const collator = new Intl.Collator(displayLocale());
  const features = [ ...FEATURES ].sort((a, b) => collator.compare(t(`home.features.${a}.title`), t(`home.features.${b}.title`)));
  const [ quarantineDismissed, setQuarantineDismissed ] = useQuarantineNoticeDismissed();

  return (
    <>
      {/* Hero */}
      <section className='container-page py-12 sm:py-20'>
        {/* one box holds the gap to the headline, so whichever notices are left after closing some keep it (and with
            none left it takes no room) */}
        <div className='mx-auto mb-6 flex max-w-3xl flex-col gap-4 empty:hidden sm:mb-10 lg:max-w-5xl'>
          <ReportUpdatesNotice/>
          <PrefixSunsetNotice/>
          {(quarantineDismissed) ? null : <QuarantineNotice onDismiss={() => setQuarantineDismissed(true)}/>}
        </div>
        {/* a real before/after under the buttons, or beside the text on large screens. kept to max-w-5xl so the two
            don't drift to opposite edges of a wide screen */}
        <div className={cn('mx-auto max-w-5xl text-center', (hasSlider) && 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:gap-12 lg:text-left')}>
          <div>
            <h1 className={cn('mb-6 text-4xl leading-tight font-medium text-balance text-white sm:text-5xl md:text-6xl', (hasSlider) && 'lg:text-5xl xl:text-6xl')}>
              {t('home.hero.title_1')}<br className='hidden sm:block'/> {t('home.hero.title_2')}
            </h1>
            <p className={cn('mx-auto mb-4 max-w-2xl text-lg text-balance text-muted sm:text-xl', (hasSlider) && 'lg:mx-0')}>
              {t('home.hero.description')}
            </p>
            <p className='mb-8 text-sm text-muted italic'>{t('home.hero.quote')}</p>
            <div className={cn('flex flex-col items-center justify-center gap-4 sm:flex-row', (hasSlider) && 'lg:justify-start')}>
              <BotInviteLink source='hero' className='btn btn-discord btn-lg'>
                {t('common.add_to_discord')}
                <ArrowRight className='size-5'/>
              </BotInviteLink>
              <Link to={Routes.COMMANDS} className='btn btn-secondary btn-lg'>
                {t('home.view_commands')}
              </Link>
            </div>
          </div>
          {(home.isPending) ? (
            <div aria-hidden className='mx-auto mt-10 aspect-square w-full max-w-xs animate-pulse rounded-lg bg-surface-2 sm:mt-14 lg:mt-0'/>
          ) : (sliders.length) ? (
            <HeroComparison showcases={sliders}/>
          ) : null}
        </div>
      </section>

      {/* real results from the commands' previews, then what the pictures can't show. phones get the list first */}
      <section className='container-page flex flex-col py-16 md:block'>
        <h2 className='mb-4 text-center text-3xl text-white'>{t('home.features.title')}</h2>
        <p className='mx-auto mb-10 max-w-2xl text-center text-muted'>
          {t('home.features.description')}
        </p>
        {(gallery.length) ? (
          <div className='order-last mt-10 md:mt-0 md:mb-12'>
            <ul className='grid grid-cols-2 gap-3 md:grid-cols-4'>
              {gallery.map((showcase, index) => (
                // the class only matters for the moment between a window getting narrower and `wide` hearing of it
                <li key={showcase.id} className={cn(GALLERY_PHONE_SIZE <= index && 'max-md:hidden')}>
                  <GalleryTile showcase={showcase}/>
                </li>
              ))}
            </ul>
            {(step < showcases.length) ? (
              <div className='mt-4 text-center'>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() => setGalleryOffset((offset) => (offset + step) % showcases.length)}
                >
                  <RefreshCw aria-hidden className='size-3.5'/>
                  {t('home.gallery.more')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <dl className='grid gap-x-8 gap-y-6 sm:grid-cols-2 md:border-t md:border-line md:pt-8 lg:grid-cols-3'>
          {features.map((key) => (
            <div key={key}>
              <dt className='mb-1 font-semibold text-white'>{t(`home.features.${key}.title`)}</dt>
              <dd className='text-sm text-muted'>{t(`home.features.${key}.description`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section className='container-page py-16'>
        <h2 className='mb-12 text-center text-3xl text-white'>{t('home.steps.title')}</h2>
        <ol className='grid gap-6 md:grid-cols-3'>
          {STEPS.map(({ icon: Icon, key }, index) => (
            <li key={key} className='flex gap-4'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-fg tabular-nums'>
                {index + 1}
              </div>
              <div>
                <h3 className='mb-1 flex items-center gap-2 text-lg text-white'>
                  {t(`home.steps.${key}.title`)}
                  <Icon className='size-4 text-muted' aria-hidden/>
                </h3>
                <p className='text-muted'>{t(`home.steps.${key}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Live stats */}
      <section className='container-page py-16'>
        <LiveStats/>
      </section>

      {/* CTA */}
      <section className='container-page py-16'>
        <div className='rounded-lg border border-line bg-surface p-8 text-center md:p-12'>
          <h2 className='mb-4 text-3xl text-white md:text-4xl'>{t('home.cta.title')}</h2>
          <p className='mx-auto mb-8 max-w-2xl text-xl text-muted'>
            {t('home.cta.description')}
          </p>
          <BotInviteLink source='home-bottom' className='btn btn-discord btn-lg'>
            {t('common.add_to_discord')}
            <ArrowRight className='size-5'/>
          </BotInviteLink>
        </div>
      </section>
    </>
  );
}


// drag between an effect's input and its result, with a switch for the other effects
function HeroComparison({ showcases }: {showcases: Array<HeroShowcase>}) {
  const { t, rich } = useI18n();
  const [ selected, setSelected ] = useState(showcases[0].id);
  const showcase = showcases.find((item) => item.id === selected) ?? showcases[0];
  return (
    <div className='mt-10 space-y-3 sm:mt-14 lg:mt-0'>
      <ImageComparison
        key={showcase.id}
        before={showcase.before.url}
        after={showcase.after.url}
        aspectRatio={showcase.after.width / showcase.after.height}
        className='mx-auto rounded-lg'
      />
      {(showcases.length > 1) ? (
        <div className='-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0'>
          <div className='mx-auto w-max'>
            <Segmented
              label={t('home.compare.label')}
              value={showcase.id}
              options={showcases.map((item) => ({value: item.id, label: effectName(item.name)}))}
              onChange={setSelected}
            />
          </div>
        </div>
      ) : null}
      <p className='text-center text-xs text-subtle'>
        <Link to={showcase.path} className='transition-colors hover:text-white'>
          {rich('commands.preview.made_with', {code: (chunk) => <code className='font-mono text-code'>{chunk}</code>}, {example: (showcase.example) ? `${PREFIXES[CommandTypes.MENTION]}${showcase.example}` : showcase.name})}
        </Link>
      </p>
    </div>
  );
}


function GalleryTile({ showcase }: {showcase: Showcase}) {
  const { t } = useI18n();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { after } = showcase;
  const alt = t('home.gallery.alt', {command: showcase.name});
  const media = 'size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]';
  return (
    <Link to={showcase.path} className='group block overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong'>
      <div className='aspect-square overflow-hidden bg-deep'>
        {(after.mimetype.startsWith('video/')) ? (
          // a looping clip like a gif, a still frame with reduced motion
          <video src={after.url} aria-label={alt} muted loop playsInline autoPlay={!reducedMotion} preload='metadata' className={media}/>
        ) : (
          <img src={after.url} alt={alt} loading='lazy' width={after.width || undefined} height={after.height || undefined} className={media}/>
        )}
      </div>
      <div className='truncate px-3 py-2 font-mono text-sm text-white'>{showcase.name}</div>
    </Link>
  );
}


function LiveStats() {
  const { t, language } = useI18n();
  // the same query as the page's, asked once
  const { data, isError } = useHomeQuery(language);
  const counts = data?.counts;
  // no cluster has reported yet, those two aren't coming either
  const discordMissing = !!counts && (counts.guilds === null || counts.users === null);

  // `failed` is its request giving up: a number that isn't coming gets a dash instead of loading forever
  const stats = [
    // floored with a plus (`1.2M+`) like the status page's, so the two never disagree about the same count
    {label: t('home.stats.servers'), value: (counts?.guilds != null) ? formatCompact(counts.guilds) : null, failed: isError || discordMissing},
    {label: t('home.stats.users'), value: (counts?.users != null) ? formatCompact(counts.users) : null, failed: isError || discordMissing},
    {label: t('home.stats.commands'), value: (counts?.commands) ? counts.commands.toLocaleString(displayLocale()) : null, failed: isError},
  ];

  return (
    <div className='card p-8 md:p-12'>
      <div className='grid gap-8 text-center md:grid-cols-3'>
        {stats.map((stat) => (
          <div key={stat.label}>
            {(stat.value) ? (
              <div className='mb-2 text-4xl font-bold text-brand-text tabular-nums md:text-5xl'>{stat.value}</div>
            ) : (stat.failed) ? (
              <div className='mb-2 text-4xl font-bold text-subtle md:text-5xl'>—</div>
            ) : (
              <div className='mx-auto mb-2 h-12 w-32 animate-pulse rounded bg-surface-3 md:h-14'/>
            )}
            <div className='text-muted'>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
