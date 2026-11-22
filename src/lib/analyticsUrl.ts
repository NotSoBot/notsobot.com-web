// what umami is told a page's url is. no dom or react in here, the worker imports it too (for the hook's name)

import { DEFAULT_LANGUAGE, splitLanguagePath, type Language } from '@/i18n/languages';
import { DASHBOARD_SERVER_TABS, Routes } from '@/routes';


// the tracker's `data-before-send` (worker/index.ts): the name of a function on `window` it calls with every payload
// before sending it. src/lib/analytics.ts puts it there
export const ANALYTICS_BEFORE_SEND = 'nsbAnalyticsBeforeSend';

// what a link's `src` may be, the same as the API takes for an invite's (INVITE_SOURCE_PATTERN in src/lib/api)
const SOURCE_PATTERN = /^[a-z0-9_-]{1,32}$/;

export const SOURCE_PARAM = 'src';
const UTM_SOURCE_PARAM = 'utm_source';
const UTM_CAMPAIGN_PARAM = 'utm_campaign';

// an id the dashboard's routes don't know about (a path that 404s), still not something to keep
const ID_SEGMENT_PATTERN = /^\d{5,}$/;
const ID_PLACEHOLDER = ':id';


function toSegments(path: string): Array<string> {
  return path.split('/').filter(Boolean);
}

// every dashboard path, with a server's tabs. their ids (servers, tags, reports, users) are whose page it is, not
// which page, so those are sent as the route itself: `/dashboard/servers/:guildId/music`
const DASHBOARD_ROUTES: ReadonlyArray<ReadonlyArray<string>> = [
  ...Object.values(Routes).filter((route) => route === Routes.DASHBOARD || route.startsWith(`${Routes.DASHBOARD}/`)),
  ...DASHBOARD_SERVER_TABS.map((tab) => `${Routes.DASHBOARD_SERVER}/${tab}`),
].map(toSegments);

const AUTH_PREFIX = '/auth';


function isUnder(path: string, prefix: string): boolean {
  const lower = path.toLowerCase();
  return lower === prefix || lower.startsWith(`${prefix}/`);
}

// the route with the most segments spelled out wins, like react router: `/dashboard/admin/tags/directory` is the
// directory, not `/dashboard/admin/tags/:itemId`
function dashboardRoute(segments: ReadonlyArray<string>): ReadonlyArray<string> | null {
  let best: ReadonlyArray<string> | null = null;
  let bestStatic = -1;
  for (const route of DASHBOARD_ROUTES) {
    if (route.length !== segments.length) {
      continue;
    }
    let count = 0;
    const matches = route.every((part, i) => {
      if (part.startsWith(':')) {
        return true;
      }
      count++;
      return part === segments[i].toLowerCase();
    });
    if (matches && bestStatic < count) {
      best = route;
      bestStatic = count;
    }
  }
  return best;
}


// `/es/dashboard/servers/123/music/` -> {path: '/dashboard/servers/:guildId/music', language: 'es'}
// the language comes off so a page is one row whatever it's read in, it's sent as the payload's `tag` instead. public
// pages keep their ids (`/commands/:commandId`, `/tags/directory/:tagId`): which command or tag is the point there
export function cleanPath(pathname: string): {language: Language, path: string} {
  const split = splitLanguagePath(pathname);
  const language = split.language ?? DEFAULT_LANGUAGE;
  const segments = toSegments(split.path);
  let path = `/${segments.join('/')}`;
  if (isUnder(path, Routes.DASHBOARD)) {
    const route = dashboardRoute(segments);
    path = `/${(route ?? segments.map((part) => (ID_SEGMENT_PATTERN.test(part)) ? ID_PLACEHOLDER : part.toLowerCase())).join('/')}`;
  }
  return {language, path};
}


// a link's `?src=bot-help` is its short way of saying where it was (the bot's help, nsb.gg's viewer). umami only
// knows utm parameters, so it's sent as those: the part before the first `-` is the source (`bot`) and the whole
// thing the campaign (`bot-help`). a link with real utm parameters keeps them
function addSource(params: URLSearchParams): void {
  const source = params.get(SOURCE_PARAM);
  if (!source || !SOURCE_PATTERN.test(source) || params.has(UTM_SOURCE_PARAM)) {
    return;
  }
  params.set(UTM_SOURCE_PARAM, source.split('-')[0] || source);
  if (!params.has(UTM_CAMPAIGN_PARAM)) {
    params.set(UTM_CAMPAIGN_PARAM, source);
  }
}


// one of our own urls (absolute, or a path) as umami should see it, null when it isn't a url at all.
// `arrival` is whether the visitor came to it from somewhere else, only then is its `src` where they came from
export function cleanUrl(raw: string, origin: string, arrival: boolean): {language: Language, url: URL} | null {
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  const { language, path } = cleanPath(url.pathname);
  // discord's oauth `code` and `state` are on these, nothing analytics should ever hold
  if (isUnder(path, AUTH_PREFIX)) {
    url.search = '';
    url.hash = '';
  } else if (arrival) {
    addSource(url.searchParams);
  }
  url.pathname = path;
  return {language, url};
}


// the parts of the tracker's payload this touches, the rest passes through
export interface AnalyticsPayload {
  referrer?: string,
  tag?: string,
  url?: string,
  [key: string]: unknown,
}

// `url` is the page's full address. `referrer` is a path when it's the page before this one on the site (the tracker
// already took its origin off), anything else is another site's address and stays as it is.
// a `src` on a link between our own pages (the FAQ's `/invite?src=faq`) is only the invite's, not a visit's source
export function cleanPayload<T extends AnalyticsPayload>(payload: T, origin: string): T {
  const cleaned: AnalyticsPayload = {...payload};
  const fromOwnPage = typeof payload.referrer === 'string' && payload.referrer.startsWith('/');
  if (typeof payload.url === 'string') {
    const page = cleanUrl(payload.url, origin, !fromOwnPage);
    if (page) {
      cleaned.url = page.url.toString();
      cleaned.tag = page.language;
    }
  }
  if (typeof payload.referrer === 'string' && fromOwnPage) {
    const referrer = cleanUrl(payload.referrer, origin, false);
    if (referrer) {
      cleaned.referrer = `${referrer.url.pathname}${referrer.url.search}${referrer.url.hash}`;
    }
  }
  return cleaned as T;
}
