import { useQuery } from '@tanstack/react-query';
import { Flag, LetterText, Trophy, WandSparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Spinner } from '@/components/ui/Spinner';
import type { GuideLinkRenderer } from '@/components/guides/GuideBlocks';
import { guidesQuery, parseGuideLink, type GuideSlug, type UpcomingGuideSlug } from '@/content/guides';
import { useI18n } from '@/i18n';

import { guidePath } from './guideRoutes';


export const GUIDE_ICONS: Readonly<Record<GuideSlug | UpcomingGuideSlug, LucideIcon>> = Object.freeze({
  'flag-guesser': Flag,
  'game-points': Trophy,
  'media-editor': WandSparkles,
  'letter-trail': LetterText,
});


// The guides in the site's language. The router's loader (or pagePreload, for a page the worker rendered) has them
// loaded already, so this only waits after a language switch, when the page shows a spinner rather than English
export function useGuides() {
  const { language } = useI18n();
  return useQuery(guidesQuery(language));
}


export function GuidesLoading() {
  const { t } = useI18n();
  return (
    <div className='container-page flex min-h-[50vh] items-center justify-center py-10'>
      <Spinner className='size-8' label={t('common.loading')}/>
    </div>
  );
}


const LINK_CLASS = 'font-medium text-brand-text underline-offset-4 hover:underline';

// on the site a `guide:` link is that guide's page (with its section as the hash), a `/path` the site's page
export const siteGuideLink: GuideLinkRenderer = (href: string, children: ReactNode) => {
  const guide = parseGuideLink(href);
  if (guide) {
    const to = `${guidePath(guide.slug)}${(guide.section) ? `#${guide.section}` : ''}`;
    return <Link to={to} className={LINK_CLASS}>{children}</Link>;
  }
  if (href.startsWith('/')) {
    return <Link to={href} className={LINK_CLASS}>{children}</Link>;
  }
  return <a href={href} target='_blank' rel='noreferrer' className={LINK_CLASS}>{children}</a>;
};
