// served from our own domain rather than Google Fonts, so visiting the site sends nothing to anyone else
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/figtree';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { HydrationState } from 'react-router';

import { AuthProvider } from '@/auth';
import { activeLanguage, I18nProvider, initI18n, splitLanguagePath } from '@/i18n';
import { ApiRequestError } from '@/lib/api';
import { reloadForNewBuild } from '@/lib/chunkReload';
import { preloadPage } from '@/lib/pagePreload';
import { createRouter, HYDRATION_DATA_ID, loadRouteModules } from '@/router';


// a lazy chunk from an older deploy failed to load (see chunkReload.ts)
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewBuild()) {
    event.preventDefault();
  }
});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // client errors (4xx) won't fix themselves on retry
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});


// Dev-only fake backend for the dashboard (see .env.example). The condition is static, so production
// builds drop the import (and the fixtures) entirely.
async function enableDashboardMocks(): Promise<void> {
  if (import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_MOCKS === 'true') {
    const { installDashboardMocks } = await import('@/mocks/dashboard');
    installDashboardMocks();
  }
}


// A page the worker rendered (src/entry-server.tsx) comes with the router's state after #root
function readHydrationData(): HydrationState | null {
  const script = document.getElementById(HYDRATION_DATA_ID);
  if (!script?.textContent) {
    return null;
  }
  try {
    return JSON.parse(script.textContent) as HydrationState;
  } catch {
    return null;
  }
}


// Whether to hydrate the worker's markup rather than render over it. Not when initI18n moved the url to another
// language than the worker rendered, or a page's code failed to load (that renders the error page instead)
async function start(hydrationData: HydrationState | null): Promise<boolean> {
  const path = window.location.pathname;
  await Promise.all([enableDashboardMocks(), initI18n()]);
  if (!hydrationData || window.location.pathname !== path) {
    return false;
  }
  const handles = await loadRouteModules(splitLanguagePath(window.location.pathname).prefix);
  await preloadPage(queryClient, handles, activeLanguage());
  return true;
}


const hydrationData = readHydrationData();

void start(hydrationData).catch(() => false).then((hydrate) => {
  // only the first router takes the worker's state, one made later for a language switch starts fresh
  let pending = (hydrate) ? hydrationData ?? undefined : undefined;
  const create = (basename: string) => {
    const data = pending;
    pending = undefined;
    return createRouter(basename, data);
  };

  const app = (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider createRouter={create}/>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  );
  const root = document.getElementById('root')!;
  if (hydrate) {
    hydrateRoot(root, app);
  } else {
    createRoot(root).render(app);
  }
});
