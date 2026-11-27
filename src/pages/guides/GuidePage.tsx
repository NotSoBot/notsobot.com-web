import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useMatches } from 'react-router';

import { GuideQuickRules, GuideSectionView } from '@/components/guides/GuideBlocks';
import { PageHero } from '@/components/ui/PageHero';
import { Routes } from '@/config';
import { GUIDE_SLUGS, type GuideSlug } from '@/content/guides';
import { useI18n } from '@/i18n';
import { decodeHash } from '@/lib/utils';
import { PAGES } from '@/seo';

import { GUIDE_PAGE_KEYS, guidePath } from './guideRoutes';
import { GUIDE_ICONS, GuidesLoading, siteGuideLink, useGuides } from './shared';


// every guide's route renders this page (src/router.tsx), its handle says which guide
function useGuideSlug(): GuideSlug {
  const matches = useMatches();
  const handles = matches.map((match) => match.handle);
  return GUIDE_SLUGS.find((slug) => handles.includes(PAGES[GUIDE_PAGE_KEYS[slug]])) ?? GUIDE_SLUGS[0];
}


// /guides/<slug>: the quick rules, then every section, with an "on this page" list beside them from `lg` up (a row of
// chips above them on phones)
export function GuidePage() {
  const { t } = useI18n();
  const slug = useGuideSlug();
  const { data: book } = useGuides();
  const guide = book?.guides[slug];
  const location = useLocation();
  const Icon = GUIDE_ICONS[slug];

  // a section's link (`#scoring`) once the guide is on screen, the router only scrolls to the top on its own
  useEffect(() => {
    const id = decodeHash(location.hash);
    if (id && guide) {
      document.getElementById(id)?.scrollIntoView({block: 'start'});
    }
  }, [guide, location.hash]);

  return (
    <>
      <PageHero
        lead={(
          <Link to={Routes.GUIDES} className='mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white'>
            <ArrowLeft aria-hidden className='size-4'/>{t('guides.all')}
          </Link>
        )}
        badge={<><Icon className='size-4'/>{t('guides.badge')}</>}
        // the page's own title while another language's guides load
        title={guide?.title ?? t(`page.${GUIDE_PAGE_KEYS[slug]}`)}
        description={guide?.summary}
      />

      {(!book || !guide) ? <GuidesLoading/> : (
        <div className='container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[220px_minmax(0,1fr)]'>
          <nav aria-label={t('guides.on_this_page')} className='lg:sticky lg:top-24 lg:self-start'>
            <h2 className='section-label mb-2 hidden px-1 lg:block'>{t('guides.on_this_page')}</h2>
            <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0'>
              {guide.sections.map((section) => (
                <li key={section.id} className='shrink-0'>
                  <a
                    href={`#${section.id}`}
                    className='block rounded-md border border-line px-3 py-2 text-sm whitespace-nowrap text-muted transition-colors hover:bg-surface-2 hover:text-white lg:border-transparent lg:whitespace-normal'
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className='min-w-0 max-w-3xl space-y-10'>
            <GuideQuickRules rules={guide.quick} renderLink={siteGuideLink}/>
            {guide.sections.map((section) => (
              <GuideSectionView key={section.id} section={section} renderLink={siteGuideLink}/>
            ))}

            <aside aria-labelledby='more-guides' className='border-t border-line pt-8'>
              <h2 id='more-guides' className='section-label mb-3'>{t('guides.more')}</h2>
              <ul className='grid gap-3 sm:grid-cols-2'>
                {GUIDE_SLUGS.filter((other) => other !== slug).map((other) => {
                  const OtherIcon = GUIDE_ICONS[other];
                  return (
                    <li key={other} className='flex'>
                      <Link to={guidePath(other)} className='card card-hover group flex w-full items-center gap-3 p-4 hover:bg-surface-2/60'>
                        <OtherIcon aria-hidden className='size-5 shrink-0 text-brand-text'/>
                        <span className='min-w-0 flex-1'>
                          <span className='block font-medium text-white'>{book.guides[other].title}</span>
                          <span className='line-clamp-2 block text-sm text-muted'>{book.guides[other].summary}</span>
                        </span>
                        <ArrowRight aria-hidden className='size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5'/>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
