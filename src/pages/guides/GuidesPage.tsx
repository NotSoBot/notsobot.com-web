import { ArrowRight, ArrowUpRight, BookOpen, Gamepad2, Rocket, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { GuideBlocks } from '@/components/guides/GuideBlocks';
import { PageHero } from '@/components/ui/PageHero';
import { guidePath, SITE_GUIDE_SLUGS, UPCOMING_GUIDE_SLUGS, type GuideBook, type GuideSlug, type UpcomingGuide } from '@/content/guides';
import { languagePath, useI18n } from '@/i18n';
import { SiteIds, siteOrigin, type SiteId } from '@/sites';

import { GUIDE_ICONS, GuidesLoading, useGuideLinkRenderer, useGuides } from './shared';


// a card per guide (`slugs`, each to its page on this site), then the games still being built. Shared with
// notsogames.com's index (src/games/pages)
export function GuideCards({ book, slugs, children }: {book: GuideBook, slugs: ReadonlyArray<GuideSlug>, children?: ReactNode}) {
  const { t } = useI18n();
  return (
    <ul aria-label={t('guides.list_label')} className='grid gap-4 sm:grid-cols-2'>
      {slugs.map((slug) => {
        const guide = book.guides[slug];
        const Icon = GUIDE_ICONS[slug];
        return (
          <li key={slug} className='flex'>
            <Link to={guidePath(slug)} className='card card-hover group flex w-full flex-col gap-3 p-5 hover:bg-surface-2/60'>
              <span className='flex size-10 items-center justify-center rounded-lg bg-surface-3'>
                <Icon aria-hidden className='size-5 text-fg'/>
              </span>
              <span>
                <span className='mb-1 block text-lg font-semibold text-white'>{guide.title}</span>
                <span className='block text-sm text-muted'>{guide.summary}</span>
              </span>
              <span className='mt-auto flex items-center gap-1.5 pt-1 text-sm font-medium text-brand-text'>
                {t('guides.read')}
                <ArrowRight aria-hidden className='size-4 transition-transform group-hover:translate-x-0.5'/>
              </span>
            </Link>
          </li>
        );
      })}
      {UPCOMING_GUIDE_SLUGS.map((slug) => {
        // typed by hand: with no upcoming guides the list is empty and its slugs are `never`
        const upcoming: UpcomingGuide = book.upcoming[slug];
        const Icon: LucideIcon = GUIDE_ICONS[slug];
        return (
          <li key={slug} className='flex'>
            <div className='flex w-full flex-col gap-3 rounded-lg border border-dashed border-line-strong p-5'>
              <span className='flex items-center justify-between gap-3'>
                <span className='flex size-10 items-center justify-center rounded-lg bg-surface-2'>
                  <Icon aria-hidden className='size-5 text-subtle'/>
                </span>
                <span className='chip text-xs'>{t('guides.coming_soon')}</span>
              </span>
              <span>
                <span className='mb-1 block text-lg font-semibold text-white'>{upcoming.title}</span>
                <span className='block text-sm text-muted'>{upcoming.summary}</span>
              </span>
            </div>
          </li>
        );
      })}
      {children}
    </ul>
  );
}


// How to open the Activity at all, under the cards on both sites' index
export function OpeningCard({ book, site }: {book: GuideBook, site: SiteId}) {
  const renderLink = useGuideLinkRenderer(site);
  return (
    <section aria-labelledby='opening-title' className='card p-5 sm:p-6'>
      <header className='mb-4 flex items-center gap-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-3'>
          <Rocket aria-hidden className='size-5 text-fg'/>
        </span>
        <h2 id='opening-title' className='text-xl font-semibold text-white'>{book.opening.title}</h2>
      </header>
      <GuideBlocks blocks={book.opening.blocks} renderLink={renderLink}/>
    </section>
  );
}


// /guides: the media editor's guide, a card for the game guides on notsogames.com, and how to open the Activity at all
export function GuidesPage() {
  const { t, language } = useI18n();
  const { data: book } = useGuides();

  return (
    <>
      <PageHero
        badge={<><BookOpen className='size-4'/>{t('guides.badge')}</>}
        title={t('guides.title')}
        description={t('guides.description')}
      />

      {(!book) ? <GuidesLoading/> : (
        <div className='container-page space-y-10 py-10'>
          <GuideCards book={book} slugs={SITE_GUIDE_SLUGS}>
            <li className='flex'>
              <a href={`${siteOrigin(SiteIds.GAMES)}${languagePath(language, '/guides')}`} className='card card-hover group flex w-full flex-col gap-3 p-5 hover:bg-surface-2/60'>
                <span className='flex size-10 items-center justify-center rounded-lg bg-surface-3'>
                  <Gamepad2 aria-hidden className='size-5 text-fg'/>
                </span>
                <span>
                  <span className='mb-1 block text-lg font-semibold text-white'>{t('guides.games_title')}</span>
                  <span className='block text-sm text-muted'>{t('guides.games_description')}</span>
                </span>
                <span className='mt-auto flex items-center gap-1.5 pt-1 text-sm font-medium text-brand-text'>
                  {t('guides.games_open')}
                  <ArrowUpRight aria-hidden className='size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5'/>
                </span>
              </a>
            </li>
          </GuideCards>
          <OpeningCard book={book} site={SiteIds.NOTSOBOT}/>
        </div>
      )}
    </>
  );
}
