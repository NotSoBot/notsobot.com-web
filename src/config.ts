function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}


export const config = Object.freeze({
  apiBase: (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, ''),
  // the old site only exposed login on the beta build, so default it to dev-only
  authEnabled: parseBoolean(import.meta.env.VITE_AUTH_ENABLED, import.meta.env.DEV),
  // cloudflare turnstile, the captcha on the report forms when logged out. Without it, reporting needs a login. The
  // mocks fall back to cloudflare's test key that always passes
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY
    || ((import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_MOCKS === 'true') ? '1x00000000000000000000AA' : null),
});


export const Urls = Object.freeze({
  GITHUB: 'https://github.com/notsobot',
  FOXBOT: 'https://discord.com/users/66078337084162048',
  // the bot's store tab in discord's app directory, lists every premium sku
  DISCORD_STORE: 'https://discord.com/application-directory/439205512425504771/store',
  CONTACT_EMAIL: 'privacy@notsocompany.com',
});


// in its own module so the worker can import it (this file reads import.meta.env)
export { Routes, TAG_ADD_PARAM, TAG_ADD_VALUE } from './routes';
