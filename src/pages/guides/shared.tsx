import { useQuery } from '@tanstack/react-query';
import { Flag, LetterText, Trophy, Wand2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Spinner } from '@/components/ui/Spinner';
import type { GuideLinkRenderer } from '@/components/guides/GuideBlocks';
import { guidePath, guidesQuery, guideUrl, isGameGuide, parseGuideLink, type GuideSlug, type UpcomingGuideSlug } from '@/content/guides';
import { languagePath, useI18n } from '@/i18n';
import { SiteIds, siteOrigin, type SiteId } from '@/sites';


export const GUIDE_ICONS: Readonly<Record<GuideSlug | UpcomingGuideSlug, LucideIcon>> = Object.freeze({
  'flag-guesser': Flag,
  'game-points': Trophy,
  'media-editor': Wand2,
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

// A guide's links on one of the sites (`site`): a `guide:` link is that guide's page (with its section as the hash), in
// the app when it's this site's and on the other site when it isn't; a `/path` is notsobot.com's page
export function useGuideLinkRenderer(site: SiteId): GuideLinkRenderer {
  const { language } = useI18n();
  return (href: string, children: ReactNode) => {
    const guide = parseGuideLink(href);
    const external = (url: string) => <a href={url} className={LINK_CLASS}>{children}</a>;
    if (guide) {
      const hash = (guide.section) ? `#${guide.section}` : '';
      if (isGameGuide(guide.slug) === (site === SiteIds.GAMES)) {
        return <Link to={`${guidePath(guide.slug)}${hash}`} className={LINK_CLASS}>{children}</Link>;
      }
      return external(`${guideUrl(guide.slug, language)}${hash}`);
    }
    if (href.startsWith('/')) {
      return (site === SiteIds.NOTSOBOT) ? <Link to={href} className={LINK_CLASS}>{children}</Link> : external(`${siteOrigin(SiteIds.NOTSOBOT)}${languagePath(language, href)}`);
    }
    return <a href={href} target='_blank' rel='noreferrer' className={LINK_CLASS}>{children}</a>;
  };
}
