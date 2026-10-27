import { ArrowRight, AudioLines, Clapperboard, Image, Search, Sparkles, Tags, Upload, Wand2, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { QuarantineNotice } from '@/components/ui/QuarantineNotice';
import { ReportUpdatesNotice } from '@/components/ui/ReportUpdatesNotice';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { useCommandsQuery, useInfoDiscordQuery } from '@/lib/api/queries';
import { enabledCommandVariants } from '@/lib/commandAvailability';
import { displayLocale } from '@/lib/utils';


// title and description are `home.features.<key>.title` / `.description`
const FEATURES: Array<{icon: LucideIcon, key: 'effects' | 'video' | 'audio' | 'conversion' | 'search' | 'tags'}> = [
  {icon: Wand2, key: 'effects'},
  {icon: Clapperboard, key: 'video'},
  {icon: AudioLines, key: 'audio'},
  {icon: Image, key: 'conversion'},
  {icon: Search, key: 'search'},
  {icon: Tags, key: 'tags'},
];

// `home.steps.<key>.title` / `.description`
const STEPS: Array<{icon: LucideIcon, key: 'post' | 'run' | 'result'}> = [
  {icon: Upload, key: 'post'},
  {icon: Wand2, key: 'run'},
  {icon: Sparkles, key: 'result'},
];

// Popular effects shown as a teaser; each links to a search on the commands page.
const SHOWCASE_COMMANDS = ['magik', 'deepfry', 'caption', 'explode', 'jpeg', 'reverse', 'speed', 'pixelate'];


function compactNumber(value: number): string {
  return new Intl.NumberFormat(displayLocale(), {notation: 'compact', maximumFractionDigits: 1}).format(value);
}


export function HomePage() {
  const { t } = useI18n();
  const inviteUrl = apiUrl(ApiEndpoints.HELP_DISCORD_BOT);

  return (
    <>
      {/* Hero */}
      <section className='container-page py-20 text-center'>
        <ReportUpdatesNotice className='mx-auto mb-4 max-w-3xl'/>
        <QuarantineNotice className='mx-auto mb-10 max-w-3xl'/>
        <div className='mb-4 inline-block rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5'>
          <span className='text-sm font-medium text-brand'>{t('home.badge')}</span>
        </div>
        <h1 className='mb-6 text-5xl leading-tight font-medium text-balance text-white md:text-6xl'>
          {t('home.hero.title_1')}<br className='hidden sm:block'/> {t('home.hero.title_2')}
        </h1>
        <p className='mx-auto mb-4 max-w-2xl text-xl text-balance text-muted'>
          {t('home.hero.description')}
        </p>
        <p className='mb-8 text-sm text-muted italic'>{t('home.hero.quote')}</p>
        <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
          <a href={inviteUrl} className='btn btn-discord btn-lg'>
            {t('common.add_to_discord')}
            <ArrowRight className='size-5'/>
          </a>
          <Link to={Routes.COMMANDS} className='btn btn-secondary btn-lg'>
            {t('home.view_commands')}
          </Link>
        </div>
        <div className='mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2'>
          {SHOWCASE_COMMANDS.map((name) => (
            <Link
              key={name}
              to={`${Routes.COMMANDS}?q=${encodeURIComponent(name)}`}
              className='chip font-mono transition-colors hover:bg-brand/20 hover:text-brand'
            >
              .{name}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className='container-page py-16'>
        <h2 className='mb-4 text-center text-3xl text-white'>{t('home.features.title')}</h2>
        <p className='mx-auto mb-12 max-w-2xl text-center text-muted'>
          {t('home.features.description')}
        </p>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {FEATURES.map(({ icon: Icon, key }) => (
            <div key={key} className='card card-hover p-6'>
              <div className='mb-4 flex size-12 items-center justify-center rounded-lg bg-brand/10'>
                <Icon className='size-6 text-brand'/>
              </div>
              <h3 className='mb-2 text-xl text-white'>{t(`home.features.${key}.title`)}</h3>
              <p className='text-muted'>{t(`home.features.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className='container-page py-16'>
        <h2 className='mb-12 text-center text-3xl text-white'>{t('home.steps.title')}</h2>
        <ol className='grid gap-6 md:grid-cols-3'>
          {STEPS.map(({ icon: Icon, key }, index) => (
            <li key={key} className='flex gap-4'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-semibold text-brand tabular-nums'>
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
        <div className='rounded-lg border border-brand/30 bg-gradient-to-r from-brand/20 to-brand/5 p-8 text-center md:p-12'>
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


function LiveStats() {
  const { t } = useI18n();
  const { data: info } = useInfoDiscordQuery({poll: false});
  const { data: commands } = useCommandsQuery();

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
              <div className='mb-2 text-4xl font-bold text-brand tabular-nums md:text-5xl'>{stat.value}</div>
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
