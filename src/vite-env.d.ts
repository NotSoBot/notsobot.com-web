/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_DASHBOARD_MOCKS?: string;
  // the Discord Activity's app, only when it isn't run from `<client_id>.discordsays.com` (src/editor/hosts/activity.tsx)
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
