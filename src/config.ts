function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}


// where the api is: the site's own `/api`, or the Discord Activity's proxy mapping (`setApiBase`)
let apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');


export const config = Object.freeze({
  // a getter, read on every request: the Activity sets its base after this module has loaded
  get apiBase(): string {
    return apiBase;
  },
  // the old site only exposed login on the beta build, so default it to dev-only
  authEnabled: parseBoolean(import.meta.env.VITE_AUTH_ENABLED, import.meta.env.DEV),
  // cloudflare turnstile, the captcha on the report forms when logged out. Without it, reporting needs a login. The
  // mocks fall back to cloudflare's test key that always passes
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY
    || ((import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_MOCKS === 'true') ? '1x00000000000000000000AA' : null),
});


// The Discord Activity (src/activity.tsx) reaches the api through Discord's proxy (`/.proxy/api`), not the site's `/api`.
// Set at its startup, before the site's api client (src/lib/api/client.ts) makes any request
export function setApiBase(base: string): void {
  apiBase = base.replace(/\/+$/, '');
}


export const Urls = Object.freeze({
  GITHUB: 'https://github.com/notsobot',
  FOXBOT: 'https://discord.com/users/66078337084162048',
  // the bot's store tab in discord's app directory, lists every premium sku
  DISCORD_STORE: 'https://discord.com/application-directory/439205512425504771/store',
  CONTACT_EMAIL: 'privacy@notsocompany.com',
});


// in its own module so the worker can import it (this file reads import.meta.env)
export { DASHBOARD_SERVER_TABS, Routes, TAG_ADD_PARAM, TAG_ADD_VALUE } from './routes';
