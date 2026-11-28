// The two sites (notsogames-plan.md, notsogames-split-plan.md): notsobot.com (notsobot.com-web) and notsogames.com
// (notsogames.com-web), each its own repo with this same file. Plain data and functions, no browser or vite-only code:
// links between the sites and the sign-in handoff's allowlist (notsogames.com signs in through notsobot.com). Keep the
// two copies the same.

export const SiteIds = Object.freeze({
  NOTSOBOT: 'notsobot',
  GAMES: 'games',
} as const);

export type SiteId = typeof SiteIds[keyof typeof SiteIds];

export const NOTSOBOT_SITE_URL = 'https://notsobot.com';
export const GAMES_SITE_URL = 'https://notsogames.com';

// the hosts that get each site. `beta.` is the beta script's (wrangler.jsonc's env.beta)
export const SITE_HOSTS: Readonly<Record<SiteId, ReadonlyArray<string>>> = Object.freeze({
  [SiteIds.NOTSOBOT]: ['notsobot.com', 'www.notsobot.com', 'beta.notsobot.com'],
  [SiteIds.GAMES]: ['notsogames.com', 'www.notsogames.com', 'beta.notsogames.com'],
});

// `vite dev` and `vite preview` keep the request's own host: `localhost` is notsobot.com, `games.localhost` (any browser
// resolves `*.localhost` to this machine) is notsogames.com
export const LOCAL_SITE_HOSTS: Readonly<Record<SiteId, ReadonlyArray<string>>> = Object.freeze({
  [SiteIds.NOTSOBOT]: ['localhost', '127.0.0.1'],
  [SiteIds.GAMES]: ['games.localhost'],
});

// each repo's dev server's default port (their vite.config.ts), the other site's dev server for a local sign-in handoff
export const LOCAL_SITE_PORTS: Readonly<Record<SiteId, number>> = Object.freeze({
  [SiteIds.NOTSOBOT]: 5173,
  [SiteIds.GAMES]: 5175,
});

// short domains that only redirect to a site, keeping the path and query (notso.bot/invite, notso.games/play)
export const REDIRECT_HOSTS: Readonly<Record<string, SiteId>> = Object.freeze({
  'notso.bot': SiteIds.NOTSOBOT,
  'www.notso.bot': SiteIds.NOTSOBOT,
  'notso.games': SiteIds.GAMES,
  'www.notso.games': SiteIds.GAMES,
});


export interface HostSite {
  site: SiteId,
  // `site`: served there, `local`: a dev server's host for it, `redirect`: only redirects to it
  kind: 'site' | 'local' | 'redirect',
}

// which site a hostname (no port) is, null for any other host
export function siteForHost(hostname: string): HostSite | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  for (const site of Object.values(SiteIds)) {
    if (SITE_HOSTS[site].includes(host)) {
      return {site, kind: 'site'};
    }
    if (LOCAL_SITE_HOSTS[site].includes(host)) {
      return {site, kind: 'local'};
    }
  }
  const redirect = REDIRECT_HOSTS[host];
  return (redirect) ? {site: redirect, kind: 'redirect'} : null;
}


// The other site's origin for a page on one of them, in the same environment: production's for production's
// (www. too), beta's for beta's, the other repo's dev server for a dev server (`LOCAL_SITE_PORTS`, the same port when
// it's the same site). Null for an origin that's
// neither site's: nothing links or hands a sign-in anywhere else. This is the handoff's whole allowlist, the target is
// never read from a url
export function counterpartOrigin(origin: string, target: SiteId): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  const found = siteForHost(url.hostname);
  if (!found || found.kind === 'redirect') {
    return null;
  }
  if (found.kind === 'local') {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    const host = LOCAL_SITE_HOSTS[target][0];
    const port = (found.site === target) ? url.port : String(LOCAL_SITE_PORTS[target]);
    return `${url.protocol}//${host}${(port) ? `:${port}` : ''}`;
  }
  if (url.protocol !== 'https:' || url.port) {
    return null;
  }
  const beta = url.hostname.toLowerCase().startsWith('beta.');
  const apex = new URL((target === SiteIds.GAMES) ? GAMES_SITE_URL : NOTSOBOT_SITE_URL).hostname;
  return `https://${(beta) ? `beta.${apex}` : apex}`;
}


// The host pages render for: the browser's own, or the one the worker set for the request it's rendering (module
// state like the i18n's server locales: renderToString is synchronous, nothing else runs in between)
let serverOrigin: string | null = null;

export function setServerOrigin(origin: string | null): void {
  serverOrigin = origin;
}

export function currentOrigin(): string | null {
  return (typeof window === 'undefined') ? serverOrigin : window.location.origin;
}

// notsobot.com or notsogames.com's origin from the page's own, production's when the page's isn't one of them
export function siteOrigin(target: SiteId): string {
  const origin = currentOrigin();
  return ((origin) ? counterpartOrigin(origin, target) : null) ?? ((target === SiteIds.GAMES) ? GAMES_SITE_URL : NOTSOBOT_SITE_URL);
}
