import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthProvider } from '@/auth';
import { I18nProvider, initI18n } from '@/i18n';
import { ApiRequestError } from '@/lib/api';
import { initAnalytics } from '@/lib/analytics';
import { reloadForNewBuild } from '@/lib/chunkReload';
import { createRouter } from '@/router';


initAnalytics();

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


void Promise.all([enableDashboardMocks(), initI18n()]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider createRouter={createRouter}/>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
