// what umami is told a page's url is. no dom or react in here, the worker imports it too (for the hook's name)

import { DEFAULT_LANGUAGE, splitLanguagePath, type Language } from '@/i18n/languages';
import { DASHBOARD_SERVER_TABS, Routes } from '@/routes';


// the tracker's `data-before-send` (worker/index.ts): the name of a function on `window` it calls with every payload
// before sending it. src/lib/analytics.ts puts it there
export const ANALYTICS_BEFORE_SEND = 'nsbAnalyticsBeforeSend';

// what a link's `src` may be, the same as the API takes for an invite's (INVITE_SOURCE_PATTERN in src/lib/api)
const SOURCE_PATTERN = /^[a-z0-9_-]{1,32}$/;

const SOURCE_PARAM = 'src';
// The same thing for links people read before they click: the bot's, which discord shows in full in its "leaving
// discord" prompt. `?i=` is the source scrambled, so it reads as some id rather than as where they clicked.
// Not a secret (anyone can read this file), it only has to not say "bot-invite". notsobot.ts makes them with its
// `encodeSiteSource` (src/utils/tools.ts), the two have to change together
export const SOURCE_CODE_PARAM = 'i';
const SOURCE_CODE_KEY = [0x5a, 0x13, 0xc7, 0x2e, 0x91, 0x64, 0xb8, 0x3d];
const SOURCE_CODE_SEED = 0x6b;
const UTM_SOURCE_PARAM = 'utm_source';
const UTM_CAMPAIGN_PARAM = 'utm_campaign';

// what someone typed into a page's search box (`?q=` everywhere, the status page's server lookup): which page they're
// on is the point, not what they looked for, and a lookup is a server's id
const SEARCH_TEXT_PARAMS = ['q', 'lookup'];

// an id the dashboard's routes don't know about (a path that 404s), still not something to keep
const ID_SEGMENT_PATTERN = /^\d{5,}$/;
const ID_PLACEHOLDER = ':id';

// a dashboard filter that picks out someone or something (a member, a server, a tag, a command, a report, a staff
// label or prompt hash) says whose page it is, like the ids taken out of its path. filters that only say how the page
// is used (`sort`, `status`, `type`, `within`) stay. any name ending in `_id`, and any value that's an id, goes too,
// so a filter added later doesn't slip through
const ID_PARAMS: ReadonlySet<string> = new Set(['command', 'label', 'owner', 'prompt_hash', 'report', 'server', 'tag', 'what']);
const ID_PARAM_SUFFIX = '_id';


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


// one byte that depends on the whole source. it's the code's first byte and mixed into the rest, so two sources never
// share a beginning (`bot-help`, `bot-invite`), and a made up code doesn't decode to anything
function sourceCheck(source: string): number {
  let check = SOURCE_CODE_SEED;
  for (let i = 0; i < source.length; i++) {
    check = (check * 33 + source.charCodeAt(i)) & 0xff;
  }
  return check;
}

// 'bot-invite' -> 15 letters of base64url
export function encodeSource(source: string): string {
  const check = sourceCheck(source);
  let bytes = String.fromCharCode(check);
  for (let i = 0; i < source.length; i++) {
    bytes += String.fromCharCode(source.charCodeAt(i) ^ SOURCE_CODE_KEY[i % SOURCE_CODE_KEY.length] ^ check);
  }
  return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// null for anything `encodeSource` didn't make
export function decodeSource(code: string): string | null {
  let bytes: string;
  try {
    bytes = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return null;
  }
  if (bytes.length < 2) {
    return null;
  }
  const check = bytes.charCodeAt(0);
  let source = '';
  for (let i = 1; i < bytes.length; i++) {
    source += String.fromCharCode(bytes.charCodeAt(i) ^ SOURCE_CODE_KEY[(i - 1) % SOURCE_CODE_KEY.length] ^ check);
  }
  return (SOURCE_PATTERN.test(source) && sourceCheck(source) === check) ? source : null;
}

// where a link says it was, from its `?src=` or its scrambled `?i=`
export function readSource(params: URLSearchParams): string | null {
  const source = params.get(SOURCE_PARAM);
  if (source && SOURCE_PATTERN.test(source)) {
    return source;
  }
  const code = params.get(SOURCE_CODE_PARAM);
  return (code) ? decodeSource(code) : null;
}


// a link's `?src=bot-help` is its short way of saying where it was (the bot's help, nsb.gg's viewer). umami only
// knows utm parameters, so it's sent as those: the part before the first `-` is the source (`bot`) and the whole
// thing the campaign (`bot-help`). a link with real utm parameters keeps them
function addSource(params: URLSearchParams): void {
  const source = readSource(params);
  if (!source || params.has(UTM_SOURCE_PARAM)) {
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
  } else {
    for (const name of SEARCH_TEXT_PARAMS) {
      url.searchParams.delete(name);
    }
    // the bot's "edit on the web" links carry the media's url, signed discord attachment links from any channel
    if (isUnder(path, Routes.EDITOR)) {
      url.searchParams.delete('url');
    }
    if (isUnder(path, Routes.DASHBOARD)) {
      const idParams = [...url.searchParams].filter(([name, value]) => {
        return ID_PARAMS.has(name) || name.endsWith(ID_PARAM_SUFFIX) || ID_SEGMENT_PATTERN.test(value);
      }).map(([name]) => name);
      for (const name of idParams) {
        url.searchParams.delete(name);
      }
    }
    if (arrival) {
      addSource(url.searchParams);
    }
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
