import { ArrowRight, BookOpen, Rocket, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { GuideBlocks } from '@/components/guides/GuideBlocks';
import { PageHero } from '@/components/ui/PageHero';
import { GUIDE_SLUGS, UPCOMING_GUIDE_SLUGS, type UpcomingGuide } from '@/content/guides';
import { useI18n } from '@/i18n';

import { guidePath } from './guideRoutes';
import { GUIDE_ICONS, GuidesLoading, siteGuideLink, useGuides } from './shared';


// /guides: a card per guide, the games still being built after them, and how to open the Activity at all
export function GuidesPage() {
  const { t } = useI18n();
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
          <ul aria-label={t('guides.list_label')} className='grid gap-4 sm:grid-cols-2'>
            {GUIDE_SLUGS.map((slug) => {
              const guide = book.guides[slug];
              const Icon = GUIDE_ICONS[slug];
              return (
                <li key={slug} className='flex'>
                  <Link to={guidePath(slug)} className='card card-hover group flex w-full flex-col gap-3 p-5 hover:bg-surface-2/60'>
                    <span className='flex size-10 items-center justify-center rounded-lg bg-brand/15'>
                      <Icon aria-hidden className='size-5 text-brand-text'/>
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
          </ul>

          <section aria-labelledby='opening-title' className='card p-5 sm:p-6'>
            <header className='mb-4 flex items-center gap-3'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/15'>
                <Rocket aria-hidden className='size-5 text-brand-text'/>
              </span>
              <h2 id='opening-title' className='text-xl font-semibold text-white'>{book.opening.title}</h2>
            </header>
            <GuideBlocks blocks={book.opening.blocks} renderLink={siteGuideLink}/>
          </section>
        </div>
      )}
    </>
  );
}
