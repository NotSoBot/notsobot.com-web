import { ArrowRight, Crown, Sparkles, Upload, Wand2, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ImageComparison } from '@/components/ui/ImageComparison';
import { QuarantineNotice } from '@/components/ui/QuarantineNotice';
import { ReportUpdatesNotice } from '@/components/ui/ReportUpdatesNotice';
import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';
import { ApiEndpoints, apiUrl, CommandMediaTypes, type Command, type CommandMedia } from '@/lib/api';
import { useCommandsQuery, useInfoDiscordQuery } from '@/lib/api/queries';
import { enabledCommandVariants } from '@/lib/commandAvailability';
import { cn, displayLocale, shuffle } from '@/lib/utils';

import { commandPath, PREFIXES } from './commands/commandMeta';


// what the gallery doesn't show, `home.features.<key>.title` / `.description`, two rows of four on wide screens
// shown in alphabetical order of their translated titles
const FEATURES = ['ai', 'audio', 'conversion', 'moderation', 'music', 'search', 'tags', 'tts', 'voices'] as const;
// NotSoAI needs Plus AI and cloning a voice needs Plus (`.ai` / `tts voice create` in the bot)
const FEATURE_PREMIUM = {ai: 'home.features.premium_plus_ai', voices: 'home.features.premium_plus'} as const;

// `home.steps.<key>.title` / `.description`
const STEPS: Array<{icon: LucideIcon, key: 'post' | 'run' | 'result'}> = [
  {icon: Upload, key: 'post'},
  {icon: Wand2, key: 'run'},
  {icon: Sparkles, key: 'result'},
];

// the hero's before/after slider picks from these (by prefix name), in this order, when their preview fits a slider
const HERO_COMMANDS = ['magik', 'deepfry', 'swirl', 'jpeg', 'pixelate', 'explode'];
const GALLERY_SIZE = 8;
// phones show the first two rows, so the feature list isn't three screens down
const GALLERY_PHONE_SIZE = 4;

// a command's real preview from the api (the same media the commands page shows)
interface Showcase {
  after: CommandMedia,
  // the single input when there's exactly one, which is what the slider needs
  before: CommandMedia | null,
  command: Command,
  example: string | null,
  name: string,
  path: string,
}

function buildShowcases(commands: Array<Command>): Array<Showcase> {
  return commands.flatMap((command) => {
    const after = command.media.find((media) => media.type === CommandMediaTypes.AFTER);
    const [ variant ] = enabledCommandVariants(command).sort((a, b) => a.type - b.type);
    if (!after || !variant || after.mimetype.startsWith('audio/')) {
      return [];
    }
    const inputs = command.media.filter((media) => media.type === CommandMediaTypes.BEFORE);
    return [{
      after,
      before: (inputs.length === 1) ? inputs[0] : null,
      command,
      example: command.preview_example,
      name: `${PREFIXES[variant.type]}${variant.name}`,
      path: commandPath(command, variant.type),
    }];
  });
}

// an image result over an image input of about the same shape, like the commands page's slider
function fitsSlider(showcase: Showcase): showcase is Showcase & {before: CommandMedia} {
  const { after, before } = showcase;
  if (!before || !before.mimetype.startsWith('image/') || !after.mimetype.startsWith('image/') || !before.height || !after.height) {
    return false;
  }
  const ratio = after.width / after.height;
  return Math.abs(before.width / before.height - ratio) / ratio <= 0.05;
}


function compactNumber(value: number): string {
  return new Intl.NumberFormat(displayLocale(), {notation: 'compact', maximumFractionDigits: 1}).format(value);
}


export function HomePage() {
  const { t, language } = useI18n();
  const inviteUrl = apiUrl(ApiEndpoints.HELP_DISCORD_BOT);
  const commands = useCommandsQuery(language);

  const { sliders, gallery } = useMemo(() => {
    const showcases = buildShowcases(commands.data ?? []);
    const sliders = HERO_COMMANDS
      .map((name) => showcases.find((showcase) => showcase.name === `.${name}`))
      .filter((showcase): showcase is Showcase & {before: CommandMedia} => !!showcase && fitsSlider(showcase));
    // the ones the slider doesn't already show first, so the gallery adds something. shuffled once per load so a
    // refresh shows other commands
    const rest = shuffle(showcases.filter((showcase) => !sliders.includes(showcase as Showcase & {before: CommandMedia})));
    return {sliders, gallery: [ ...rest, ...sliders ].slice(0, GALLERY_SIZE)};
  }, [commands.data]);
  // the slider (or its placeholder while the commands load) sits beside the headline on large screens
  const hasSlider = commands.isPending || sliders.length > 0;
  const collator = new Intl.Collator(displayLocale());
  const features = [ ...FEATURES ].sort((a, b) => collator.compare(t(`home.features.${a}.title`), t(`home.features.${b}.title`)));

  return (
    <>
      {/* Hero */}
      <section className='container-page py-12 sm:py-20'>
        <ReportUpdatesNotice className='mx-auto mb-4 max-w-3xl lg:max-w-5xl'/>
        <QuarantineNotice className='mx-auto mb-6 max-w-3xl sm:mb-10 lg:max-w-5xl'/>
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
              <a href={inviteUrl} className='btn btn-discord btn-lg'>
                {t('common.add_to_discord')}
                <ArrowRight className='size-5'/>
              </a>
              <Link to={Routes.COMMANDS} className='btn btn-secondary btn-lg'>
                {t('home.view_commands')}
              </Link>
            </div>
          </div>
          {(commands.isPending) ? (
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
          <ul className='order-last mt-10 grid grid-cols-2 gap-3 md:mt-0 md:mb-12 md:grid-cols-4'>
            {gallery.map((showcase, index) => (
              <li key={showcase.command.id} className={cn(GALLERY_PHONE_SIZE <= index && 'max-md:hidden')}>
                <GalleryTile showcase={showcase}/>
              </li>
            ))}
          </ul>
        ) : null}
        <dl className='grid gap-x-8 gap-y-6 sm:grid-cols-2 md:border-t md:border-line md:pt-8 lg:grid-cols-3'>
          {features.map((key) => (
            <div key={key}>
              <dt className='mb-1 flex flex-wrap items-center gap-2 font-semibold text-white'>
                {t(`home.features.${key}.title`)}
                {(key in FEATURE_PREMIUM) ? (
                  <span className='inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning'>
                    <Crown aria-hidden className='size-3'/>
                    {t(FEATURE_PREMIUM[key as keyof typeof FEATURE_PREMIUM])}
                  </span>
                ) : null}
              </dt>
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
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-semibold text-brand-text tabular-nums'>
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
          <a href={inviteUrl} className='btn btn-discord btn-lg'>
            {t('common.add_to_discord')}
            <ArrowRight className='size-5'/>
          </a>
        </div>
      </section>
    </>
  );
}


// drag between an effect's input and its result, with a switch for the other effects
function HeroComparison({ showcases }: {showcases: Array<Showcase & {before: CommandMedia}>}) {
  const { t, rich } = useI18n();
  const [ selected, setSelected ] = useState(showcases[0].command.id);
  const showcase = showcases.find((item) => item.command.id === selected) ?? showcases[0];
  return (
    <div className='mt-10 space-y-3 sm:mt-14 lg:mt-0'>
      <ImageComparison
        key={showcase.command.id}
        before={showcase.before.url}
        after={showcase.after.url}
        aspectRatio={showcase.after.width / showcase.after.height}
        className='mx-auto rounded-lg'
      />
      {(showcases.length > 1) ? (
        <div className='-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible'>
          <div className='mx-auto w-max'>
            <Segmented
              label={t('home.compare.label')}
              value={showcase.command.id}
              options={showcases.map((item) => ({value: item.command.id, label: item.name}))}
              onChange={setSelected}
            />
          </div>
        </div>
      ) : null}
      <p className='text-center text-xs text-subtle'>
        <Link to={showcase.path} className='transition-colors hover:text-white'>
          {rich('commands.preview.made_with', {code: (chunk) => <code className='font-mono text-code'>{chunk}</code>}, {example: showcase.example || showcase.name.slice(1)})}
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
  const { data: info } = useInfoDiscordQuery({poll: false});
  const { data: commands } = useCommandsQuery(language);

  const totals = useMemo(() => {
    if (!info) {
      return null;
    }
    let guilds = 0;
    let users = 0;
    for (const cluster of info.clusters) {
      for (const shard of cluster.shards) {
        guilds += shard.counts.guilds;
        users += shard.counts.users;
      }
    }
    return {guilds, users};
  }, [info]);

  const commandCount = commands?.filter((command) => enabledCommandVariants(command).length).length;

  const stats = [
    {label: t('home.stats.servers'), value: (totals) ? compactNumber(totals.guilds) : null},
    {label: t('home.stats.users'), value: (totals) ? compactNumber(totals.users) : null},
    {label: t('home.stats.commands'), value: (commandCount) ? commandCount.toLocaleString(displayLocale()) : null},
  ];

  return (
    <div className='card p-8 md:p-12'>
      <div className='grid gap-8 text-center md:grid-cols-3'>
        {stats.map((stat) => (
          <div key={stat.label}>
            {(stat.value) ? (
              <div className='mb-2 text-4xl font-bold text-brand-text tabular-nums md:text-5xl'>{stat.value}</div>
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
