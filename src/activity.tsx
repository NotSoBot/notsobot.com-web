// The Discord Activity's entry (activity.html): only the media editor, no router, no site layout. The site's fonts and
// styles, and its strings: the editor's are in the dashboard bundle, loaded before the first render
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/figtree';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { setApiBase } from '@/config';
import { ActivityApp, API_BASE } from '@/editor/hosts/activity';
import { DEFAULT_LANGUAGE, languageFromLocale } from '@/i18n';
import { loadDashboardText, loadDictionary, setActiveLanguage } from '@/i18n/translate';
import { applyActivityMotion } from '@/lib/activityPrefs';


// This page inside the Activity's own games iframe (src/activity/shell.ts `GAMES_HALF_PATH`): the developer portal has
// no URL mapping `/games` → `notsogames.com/activity`, so Discord's `/` mapping served notsobot.com's page at /games/
// instead of the games half. Started anyway it would only send Discord a handshake of its own, which Discord ignores
// from a second page, and time out (seen 2026-11-27). Says what's missing instead
function insideOwnShell(): boolean {
  try {
    return window.parent !== window && Boolean(window.parent.__nsbActivityShell);
  } catch {
    // a parent on another origin isn't this Activity's page
    return false;
  }
}

function showMissingGamesMapping(): void {
  console.warn('[editor activity] notsobot.com\'s page loaded as the games half: the URL mapping /games → notsogames.com/activity is missing');
  const root = document.getElementById('root');
  if (!root) {
    return;
  }
  const box = document.createElement('div');
  box.className = 'flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center';
  const title = document.createElement('p');
  title.className = 'text-lg font-semibold text-white';
  title.textContent = 'The games couldn’t load.';
  const detail = document.createElement('p');
  detail.className = 'max-w-md font-mono text-xs text-subtle';
  detail.textContent = 'This Activity’s URL mapping /games → notsogames.com/activity is missing (Discord Developer Portal → Activities → URL Mappings).';
  box.append(title, detail);
  root.replaceChildren(box);
}


async function start(): Promise<void> {
  if (insideOwnShell()) {
    showMissingGamesMapping();
    return;
  }
  // the site's api client (the Server and Your settings' dashboard pages) through Discord's proxy, like the Activity's own
  // requests
  setApiBase(API_BASE);
  // the Activity settings' Less motion, before anything animates
  applyActivityMotion();
  // Discord's own language (its client sets the iframe's), there's no url prefix or saved choice in here
  const language = languageFromLocale(navigator.language) ?? DEFAULT_LANGUAGE;
  setActiveLanguage(language, await loadDictionary(language));
  await loadDashboardText();
  // dev mocks only: `/activity?mockSettings=1` is the server settings for the dashboard mocks' editable server, without
  // Discord. The mocks answer on the proxy path set above, links open in a new tab
  if (import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_MOCKS === 'true' && new URLSearchParams(window.location.search).has('mockSettings')) {
    const [ { installDashboardMocks }, { ServerSettingsScreen } ] = await Promise.all([
      import('@/mocks/dashboard'),
      import('@/activity-games/server/ServerSettingsScreen'),
    ]);
    installDashboardMocks();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ServerSettingsScreen
          guildId='1100000000000000001'
          siteUrl='https://notsobot.com'
          openExternal={(url) => window.open(url, '_blank', 'noopener')}
          // there's no mode choice here, Back starts it over
          onBack={() => window.location.reload()}
        />
      </StrictMode>,
    );
    return;
  }
  // dev mocks only: `/activity?mockUserSettings=1` is Your settings for the dashboard mocks' user, the same way
  if (import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_MOCKS === 'true' && new URLSearchParams(window.location.search).has('mockUserSettings')) {
    const [ { installDashboardMocks }, { UserSettingsScreen } ] = await Promise.all([
      import('@/mocks/dashboard'),
      import('@/activity-games/user/UserSettingsScreen'),
    ]);
    installDashboardMocks();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <UserSettingsScreen
          siteUrl='https://notsobot.com'
          openExternal={(url) => window.open(url, '_blank', 'noopener')}
          onBack={() => window.location.reload()}
        />
      </StrictMode>,
    );
    return;
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ActivityApp/>
    </StrictMode>,
  );
}

// a chunk or the dictionary that didn't load (a blip inside Discord's proxy) used to leave the Activity blank for good.
// Plain markup: the strings and the app are what failed to load
start().catch((error) => {
  console.warn('[editor activity] failed to start', (error instanceof Error) ? error.message : error);
  const root = document.getElementById('root');
  if (!root) {
    return;
  }
  root.textContent = '';
  const box = document.createElement('div');
  box.className = 'flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center';
  const text = document.createElement('p');
  text.className = 'text-muted';
  text.textContent = 'NotSoBot couldn’t load. Check your connection and try again.';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-primary';
  button.textContent = 'Reload';
  button.addEventListener('click', () => window.location.reload());
  box.append(text, button);
  root.append(box);
});
