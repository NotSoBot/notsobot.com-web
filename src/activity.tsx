// The Discord Activity's entry (activity.html): only the media editor, no router, no site layout. The site's fonts and
// styles, and its strings: the editor's are in the dashboard bundle, loaded before the first render
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/figtree';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ActivityApp } from '@/editor/hosts/activity';
import { DEFAULT_LANGUAGE, languageFromLocale } from '@/i18n';
import { loadDashboardText, loadDictionary, setActiveLanguage } from '@/i18n/translate';
import { applyActivityMotion } from '@/lib/activityPrefs';


async function start(): Promise<void> {
  // the Activity settings' Less motion, before anything animates
  applyActivityMotion();
  // Discord's own language (its client sets the iframe's), there's no url prefix or saved choice in here
  const language = languageFromLocale(navigator.language) ?? DEFAULT_LANGUAGE;
  setActiveLanguage(language, await loadDictionary(language));
  await loadDashboardText();
  // dev mocks only: `/activity?mockGame=1` plays the flag game against an in-browser fake (no Discord, no api). The
  // condition is static, production builds drop the import
  if (import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_MOCKS === 'true' && new URLSearchParams(window.location.search).has('mockGame')) {
    const { FlagGameMockApp } = await import('@/activity-games/mock/FlagGameMockApp');
    createRoot(document.getElementById('root')!).render(<StrictMode><FlagGameMockApp/></StrictMode>);
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
