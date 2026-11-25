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


async function start(): Promise<void> {
  // Discord's own language (its client sets the iframe's), there's no url prefix or saved choice in here
  const language = languageFromLocale(navigator.language) ?? DEFAULT_LANGUAGE;
  setActiveLanguage(language, await loadDictionary(language));
  await loadDashboardText();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ActivityApp/>
    </StrictMode>,
  );
}

void start();
