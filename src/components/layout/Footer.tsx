import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { ReportButton } from '@/components/reports/ReportButton';
import { GitHubLogo } from '@/components/ui/GitHubLogo';
import { Routes, Urls } from '@/config';
import { languagePath, useI18n } from '@/i18n';
import { ApiEndpoints, apiUrl } from '@/lib/api';
import { shuffle } from '@/lib/utils';
import { SiteIds, siteOrigin } from '@/sites';

import { LanguagePicker } from './LanguagePicker';


const QUOTES: Array<[quote: string, author: string]> = [
  ['coolest bot on discord', 'jesse'],
  ['wheres my airpod command', 'sal'],
  ['it just works', 'kyle'],
  ['it\'s the best bot, bud', 'chris'],
  ['saved my marriage', 'tess'],
  ['this bot almost got me fired from my job', 'spencer'],
  ['spencer loves notsobot!! (real customer not actor)', 'napkins'],
  ['how did you get into my house', 'jakkeri'],
  ['gets banned too much', 'arcs'],
  ['🦎', 'stryxo'],
];

const QUOTE_INTERVAL = 5000;


export function Footer() {
  const { t, language } = useI18n();
  return (
    <footer className='mt-16 border-t border-line bg-surface'>
      <div className='container-page flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center'>
        <div>
          <h2 className='mb-1 text-xl text-white'>NotSoBot</h2>
          <FooterQuote/>
          <div className='mb-3 flex gap-3'>
            <a
              href={apiUrl(ApiEndpoints.HELP_DISCORD_SERVER)}
              target='_blank'
              rel='noreferrer'
              title={t('footer.support_server')}
              aria-label={t('footer.support_server')}
              className='text-muted transition-colors hover:text-brand-text'
            >
              <MessageSquare className='size-5'/>
            </a>
            <a href={Urls.GITHUB} target='_blank' rel='noreferrer' aria-label='GitHub' className='text-muted transition-colors hover:text-white'>
              <GitHubLogo className='size-5'/>
            </a>
          </div>
          <p className='mb-4 text-xs text-subtle'>{t('footer.rights', {year: new Date().getFullYear()})}</p>
          <LanguagePicker/>
        </div>

        <nav aria-label={t('footer.label')}>
          <h3 className='section-label mb-3'>{t('footer.links')}</h3>
          <ul className='space-y-2 text-sm'>
            <li><Link to={Routes.FAQ} className='text-muted transition-colors hover:text-white'>{t('nav.faq')}</Link></li>
            <li><Link to={Routes.GUIDES} className='text-muted transition-colors hover:text-white'>{t('nav.guides')}</Link></li>
            <li><a href={`${siteOrigin(SiteIds.GAMES)}${languagePath(language, '/')}`} className='text-muted transition-colors hover:text-white'>{t('nav.games')}</a></li>
            <li><Link to={Routes.CHANGELOG} className='text-muted transition-colors hover:text-white'>{t('nav.changelog')}</Link></li>
            <li><Link to={Routes.PREMIUM} className='text-muted transition-colors hover:text-white'>{t('nav.premium')}</Link></li>
            <li><Link to={Routes.TAG_DOCS} className='text-muted transition-colors hover:text-white'>{t('footer.tag_docs')}</Link></li>
            {/* anonymous when logged out (behind a captcha), or logging in first when the site has no captcha set up.
                the button is nothing when there's no way to report, the item goes with it instead of leaving a gap */}
            <li className='empty:hidden'><ReportButton subject={{type: 'bug'}} className='cursor-pointer text-muted transition-colors hover:text-white'>{t('footer.report_bug')}</ReportButton></li>
            <li><Link to={Routes.LEGAL_PRIVACY} className='text-muted transition-colors hover:text-white'>{t('footer.privacy')}</Link></li>
            <li><Link to={Routes.LEGAL_TERMS_OF_SERVICE} className='text-muted transition-colors hover:text-white'>{t('footer.terms')}</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}


function FooterQuote() {
  // shuffled after the first render, so a page the worker rendered hydrates with the same empty line it was sent
  const [ state, setState ] = useState<{quotes: typeof QUOTES, index: number} | null>(null);

  useEffect(() => {
    setState({quotes: shuffle(QUOTES), index: 0});
    // only ticks while the tab is showing, a hidden one would keep re-rendering the footer for nobody
    let timer: number | undefined;
    const sync = () => {
      window.clearInterval(timer);
      timer = undefined;
      if (document.visibilityState !== 'hidden') {
        timer = window.setInterval(() => {
          setState((previous) => {
            return (previous && previous.index + 1 < previous.quotes.length) ? {...previous, index: previous.index + 1} : {quotes: shuffle(QUOTES), index: 0};
          });
        }, QUOTE_INTERVAL);
      }
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.clearInterval(timer);
    };
  }, []);

  const [ quote, author ] = state?.quotes[state.index] ?? [];
  return (
    <p key={`${quote}-${author}`} className='mb-3 min-h-5 animate-fade-in text-sm text-muted'>
      {(quote) ? `"${quote}" - ${author}` : null}
    </p>
  );
}
