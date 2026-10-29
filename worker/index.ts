// Serves the built site (dist/) through Workers Static Assets.
// /assets/* and other files never reach this code (see run_worker_first in wrangler.jsonc). Everything else is a
// page, so it gets dist/index.html with that page's metatags filled in for Discord/Twitter/search embeds.

import { ApiRedirect, DomainRouter, FetchRouter, HttpMethods } from 'cf-worker-router';

import {
  CommandCategories,
  CommandTypes,
  TagDirectoryCategories,
  TagDirectoryVerificationStates,
  type Command,
  type CommandMetadata,
  type CommandType,
  type TagDirectoryCategory,
  type TagDirectoryItem,
  type TagDirectoryPage,
} from '../src/lib/api/types';
import { enabledCommandVariants } from '../src/lib/commandAvailability';
import { commandTypeFromPath } from '../src/lib/commandPaths';
import { DEFAULT_LANGUAGE, LANGUAGE_PREFIXES, languagePath, Languages, splitLanguagePath, type Language } from '../src/i18n/languages';
import { Layout as EnglishLayout } from '../src/i18n/locales/en/layout';
import { Layout as SpanishLayout } from '../src/i18n/locales/es/layout';
import { Layout as PortugueseLayout } from '../src/i18n/locales/pt/layout';
import { Tags as SpanishTags } from '../src/i18n/locales/es/tags';
import { Tags as PortugueseTags } from '../src/i18n/locales/pt/tags';
import { Routes, TAG_ADD_PARAM, TAG_ADD_VALUE } from '../src/routes';
import { PAGE_ALIASES, PAGES, pageTitle, SITE_NAME, type PageKey, type PageMeta } from '../src/seo';
import { localizedPage } from '../src/seoTranslations';


interface Env {
  ASSETS: Fetcher,
  // hostname used for canonical urls, og:url and the sitemap, e.g. "notsobot.com"
  SITE_DOMAIN: string,
  // "true" lets search engines index the site. anything else (beta) marks every page noindex
  ALLOW_INDEXING: string,
  // from Umami's website settings, one per site. a secret from .dev.vars (.dev.vars.beta for beta), uploaded by
  // `npm run deploy`. empty or unset leaves analytics off
  UMAMI_WEBSITE_ID?: string,
}


// TRACKER_SCRIPT_NAME on notsobot.api's analytics-umami container. it sends events back to the same host
const UMAMI_SCRIPT_URL = 'https://oasis.notsocompany.com/drink.js';

// short domains that only redirect to SITE_DOMAIN, keeping the path and query (notso.bot/invite, notso.bot/es/premium)
const REDIRECT_DOMAINS = ['notso.bot', 'www.notso.bot'];

interface Page {
  key: PageKey,
  meta: PageMeta,
  // where the page really lives. null for paths with a `:param`, whose canonical url is the request's own path
  canonical: string | null,
  matcher: RegExp,
}

// react router matches case-insensitively and ignores trailing slashes
function matcherFor(path: string): RegExp {
  const source = path.split('/').map((segment) => {
    return (segment.startsWith(':')) ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return new RegExp(`^${(source === '/') ? '' : source}/*$`, 'i');
}

// every path src/router.tsx renders a page (or redirect) for, from the same metadata the client uses.
// anything else gets the not-found page and a 404, like the client-side `*` route
const PAGE_LIST: Array<Page> = [
  ...(Object.keys(PAGES) as Array<PageKey>).map((key) => ({
    key,
    meta: PAGES[key],
    canonical: (Routes[key].includes(':')) ? null : Routes[key],
    matcher: matcherFor(Routes[key]),
  })),
  ...Object.entries(PAGE_ALIASES).map(([ path, key ]) => ({
    key,
    meta: PAGES[key],
    canonical: Routes[key],
    matcher: matcherFor(path),
  })),
];

const SITEMAP_PATHS = (Object.keys(PAGES) as Array<PageKey>)
  .filter((key) => PAGES[key].index && !Routes[key].includes(':'))
  .map((key) => Routes[key]);


function findPage(pathname: string): Page | null {
  return PAGE_LIST.find((page) => page.matcher.test(pathname)) ?? null;
}


interface Embed {
  meta: PageMeta,
  siteName: string,
  // a small thumbnail beside the text
  image: string | null,
  // discord's component embed (https://docs.discord.com/developers/link-previews/component-embeds), which it shows
  // instead of the og tags. those stay as the fallback for everything else
  components: DiscordContainer | null,
}


// the logo's gray (public/favicon.svg). every page's `theme-color` (the stripe on a plain discord embed) is set from
// it too, so plain and component embeds always match
const EMBED_ACCENT_COLOR = 0x848484;
const THEME_COLOR = `#${EMBED_ACCENT_COLOR.toString(16).padStart(6, '0')}`;

// the subset of discord's message components a component embed may use
type DiscordTextDisplay = {type: 10, content: string};
type DiscordThumbnail = {type: 11, media: {url: string}};
type DiscordLinkButton = {type: 2, style: 5, label: string, url: string};
// the accessory always sits to the right of the text
type DiscordSection = {type: 9, components: Array<DiscordTextDisplay>, accessory: DiscordThumbnail | DiscordLinkButton};
type DiscordContainer = {type: 17, accent_color: number, components: Array<DiscordTextDisplay | DiscordSection>};

// the bot's ids for `tag get` and `tag show` (Formatter.Commands.TagGet/TagShow.COMMAND_ID in notsobot.ts). their slash
// variants' `external_id` makes the clickable mention, which puts the command in the message box. it can't fill in
// the option, so the embed shows the id to paste into it (`/tag show` also suggests tags linked in the channel)
const TAG_GET_COMMAND_ID = 'tag.add';
const TAG_SHOW_COMMAND_ID = 'tag.show';

// discord drops the whole component embed past this, the og tags are used instead
const COMPONENT_EMBED_MAX_BYTES = 3000;


// user-written text goes into discord markdown as-is otherwise. `<` too, or `<@id>`, `<#id>`, `<t:...>` and
// `<:emoji:id>` render as mentions, timestamps and emojis
function escapeMarkdown(value: string): string {
  return value
    .replace(/[\\*_~`|[\]<]/g, '\\$&')
    .replace(/^(\s*)([#>-])/gm, '$1\\$2')
    // `1. item` is a numbered list
    .replace(/^(\s*\d+)\./gm, '$1\\.');
}

// inside a <script>, `</script>` or `<!--` in user text would end it early
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}


// The embeds' own words in each language. The tag labels match src/pages/tags/tagDirectory.tsx, which can't be
// imported here (react), so English is repeated and the other languages come from the site's dictionaries.
interface EmbedText {
  tagCategories: Record<TagDirectoryCategory, string>,
  verified: string,
  pending: string,
  unverified: string,
  uses: (count: number) => string,
  servers: (count: number) => string,
  by: (username: string) => string,
  // `tagShow` and `tagGet` are mentions or code
  tagHowTo: (tagShow: string, tagGet: string, id: string) => string,
  addToServer: string,
  tagSiteName: string,
  commandTypes: Record<CommandType, string>,
  // the label before each way to run a command, then the context menu path to it
  usage: {prefix: string, slash: string, userApp: string, messageApp: string, userMenu: string, messageMenu: string},
  commandFallback: (type: string) => string,
  commandSiteName: string,
}

function countOf(language: Language, count: number, one: string, other: string): string {
  return `${count.toLocaleString((language === Languages.ENGLISH) ? 'en-US' : language)} ${(count === 1) ? one : other}`;
}

// a translated language's tag labels, straight from its dictionary
function tagLabels(tags: Readonly<Record<keyof typeof SpanishTags, string>>): Pick<EmbedText, 'tagCategories' | 'verified' | 'pending' | 'unverified'> {
  return {
    tagCategories: {
      [TagDirectoryCategories.OTHER]: tags['tag_category.other'],
      [TagDirectoryCategories.AI]: tags['tag_category.ai'],
      [TagDirectoryCategories.CLIPS]: tags['tag_category.clips'],
      [TagDirectoryCategories.FILTERS]: tags['tag_category.filters'],
      [TagDirectoryCategories.GAMES]: tags['tag_category.games'],
      [TagDirectoryCategories.MEMES]: tags['tag_category.memes'],
      [TagDirectoryCategories.UTILITY]: tags['tag_category.utility'],
      [TagDirectoryCategories.LOGO_EDITING]: tags['tag_category.logo-editing'],
    },
    verified: tags['tags.verified'],
    pending: tags['tags.pending'],
    unverified: tags['tags.unverified'],
  };
}

const EMBED_TEXT: Readonly<Record<Language, EmbedText>> = {
  [Languages.ENGLISH]: {
    tagCategories: {
      [TagDirectoryCategories.OTHER]: 'Other',
      [TagDirectoryCategories.AI]: 'AI',
      [TagDirectoryCategories.CLIPS]: 'Clips',
      [TagDirectoryCategories.FILTERS]: 'Filters',
      [TagDirectoryCategories.GAMES]: 'Games',
      [TagDirectoryCategories.MEMES]: 'Memes',
      [TagDirectoryCategories.UTILITY]: 'Utility',
      [TagDirectoryCategories.LOGO_EDITING]: 'Logo Editing',
    },
    verified: 'Verified',
    pending: 'Pending Verification',
    unverified: 'Unverified',
    uses: (count) => countOf(Languages.ENGLISH, count, 'use', 'uses'),
    servers: (count) => countOf(Languages.ENGLISH, count, 'server', 'servers'),
    by: (username) => `by ${username}`,
    tagHowTo: (tagShow, tagGet, id) => `-# Run ${tagShow} to try it or ${tagGet} to add it with \`${id}\`, or`,
    addToServer: 'Add to Server',
    tagSiteName: `${SITE_NAME} Tag Directory`,
    commandTypes: {
      [CommandTypes.PREFIXED]: 'Prefix command',
      [CommandTypes.APPLICATION_SLASH]: 'Slash command',
      [CommandTypes.APPLICATION_MENU_USER]: 'User context menu',
      [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Message context menu',
    },
    usage: {
      prefix: 'Prefix',
      slash: 'Slash',
      userApp: 'User app',
      messageApp: 'Message app',
      userMenu: 'right-click a user → Apps →',
      messageMenu: 'right-click a message → Apps →',
    },
    commandFallback: (type) => `A NotSoBot ${type.toLowerCase()}.`,
    commandSiteName: `${SITE_NAME} Commands`,
  },
  [Languages.SPANISH]: {
    ...tagLabels(SpanishTags),
    uses: (count) => countOf(Languages.SPANISH, count, 'uso', 'usos'),
    servers: (count) => countOf(Languages.SPANISH, count, 'servidor', 'servidores'),
    by: (username) => `de ${username}`,
    tagHowTo: (tagShow, tagGet, id) => `-# Usa ${tagShow} para probarlo o ${tagGet} para añadirlo con \`${id}\`, o`,
    addToServer: 'Añadir al servidor',
    tagSiteName: `Directorio de tags de ${SITE_NAME}`,
    commandTypes: {
      [CommandTypes.PREFIXED]: 'Comando con prefijo',
      [CommandTypes.APPLICATION_SLASH]: 'Comando de barra',
      [CommandTypes.APPLICATION_MENU_USER]: 'Menú contextual de usuario',
      [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Menú contextual de mensaje',
    },
    usage: {
      prefix: 'Prefijo',
      slash: 'Barra',
      userApp: 'App de usuario',
      messageApp: 'App de mensaje',
      userMenu: 'clic derecho en un usuario → Aplicaciones →',
      messageMenu: 'clic derecho en un mensaje → Aplicaciones →',
    },
    commandFallback: (type) => `Un ${type.charAt(0).toLowerCase()}${type.slice(1)} de ${SITE_NAME}.`,
    commandSiteName: `Comandos de ${SITE_NAME}`,
  },
  [Languages.PORTUGUESE]: {
    ...tagLabels(PortugueseTags),
    uses: (count) => countOf(Languages.PORTUGUESE, count, 'uso', 'usos'),
    servers: (count) => countOf(Languages.PORTUGUESE, count, 'servidor', 'servidores'),
    by: (username) => `por ${username}`,
    tagHowTo: (tagShow, tagGet, id) => `-# Use ${tagShow} para testar ou ${tagGet} para adicionar com \`${id}\`, ou`,
    addToServer: 'Adicionar ao servidor',
    tagSiteName: `Diretório de tags do ${SITE_NAME}`,
    commandTypes: {
      [CommandTypes.PREFIXED]: 'Comando com prefixo',
      [CommandTypes.APPLICATION_SLASH]: 'Comando de barra',
      [CommandTypes.APPLICATION_MENU_USER]: 'Menu de contexto de usuário',
      [CommandTypes.APPLICATION_MENU_MESSAGE]: 'Menu de contexto de mensagem',
    },
    usage: {
      prefix: 'Prefixo',
      slash: 'Barra',
      userApp: 'App de usuário',
      messageApp: 'App de mensagem',
      userMenu: 'botão direito num usuário → Apps →',
      messageMenu: 'botão direito numa mensagem → Apps →',
    },
    commandFallback: (type) => `Um ${type.charAt(0).toLowerCase()}${type.slice(1)} do ${SITE_NAME}.`,
    commandSiteName: `Comandos do ${SITE_NAME}`,
  },
};

// discord cuts embed descriptions off around here anyway, this keeps the stats line after it visible
const EMBED_DESCRIPTION_MAX_LENGTH = 280;


function truncate(value: string, length: number): string {
  return (value.length <= length) ? value : `${value.slice(0, length - 1).trimEnd()}…`;
}


// a public api GET, null when it fails or doesn't answer in time so the page's generic embed is used instead.
// cached, since discord, twitter etc. often fetch a link several times in a row
async function fetchApi<T>(env: Env, path: string, query: Record<string, string>, cacheTtl: number): Promise<T | null> {
  // notsobot.com/api/* skips workers, so this goes straight to the api origin
  const url = new URL(`https://${env.SITE_DOMAIN}/api${path}`);
  for (const [ key, value ] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  try {
    const response = await fetch(url, {
      headers: {accept: 'application/json'},
      signal: AbortSignal.timeout(3000),
      cf: {cacheTtl, cacheEverything: true},
    });
    return (response.ok) ? await response.json<T>() : null;
  } catch {
    return null;
  }
}


// same lookup as the client's api.fetchTagDirectoryItem: there's no single-item endpoint, so ask for the first listing
// before `id + 1`. null when it isn't listed
async function fetchTagDirectoryItem(env: Env, tagId: string): Promise<TagDirectoryItem | null> {
  if (!/^\d{1,21}$/.test(tagId)) {
    return null;
  }
  const page = await fetchApi<TagDirectoryPage>(env, '/tags/directory', {before: (BigInt(tagId) + 1n).toString(), limit: '1'}, 60);
  const item = page?.items[0];
  return (item && item.id === tagId) ? item : null;
}


// a mention is null while the bot hasn't uploaded that command's id, it's plain text then
function tagEmbed(
  env: Env,
  language: Language,
  item: TagDirectoryItem,
  mentions: {tagGet: string | null, tagShow: string | null},
): Embed {
  const { tag } = item;
  const words = EMBED_TEXT[language];
  const verification: Record<number, string> = {
    [TagDirectoryVerificationStates.VERIFIED]: words.verified,
    [TagDirectoryVerificationStates.PENDING_VERIFICATION]: words.pending,
  };
  const stats = [
    verification[item.verified] ?? words.unverified,
    words.tagCategories[item.category] ?? words.tagCategories[TagDirectoryCategories.OTHER],
    words.uses(tag.uses),
    words.servers(item.server_count),
    words.by(tag.user.username),
  ];
  if (tag.nsfw) {
    stats.unshift('NSFW');
  }
  const description = item.description.trim();

  const title = item.title.trim();

  // the directory card's thumbnail, or the cover when it's a picture. nothing for nsfw tags, discord would show it
  // to everyone in the channel
  let image: string | null = null;
  if (!tag.nsfw) {
    const cover = item.assets[0];
    image = item.thumbnail?.urls.cdn ?? ((cover?.metadata.mimetype.startsWith('image/')) ? cover.urls.cdn : null);
  }

  const text: Array<DiscordTextDisplay> = [
    {type: 10, content: `## ${escapeMarkdown(tag.name)}${(title) ? `\n${escapeMarkdown(title)}` : ''}`},
  ];
  if (description) {
    text.push({type: 10, content: escapeMarkdown(truncate(description, EMBED_DESCRIPTION_MAX_LENGTH))});
  }
  text.push({type: 10, content: `-# ${escapeMarkdown(stats.join(' · '))}`});

  const addUrl = new URL(languagePath(language, Routes.TAG_DIRECTORY_ITEM.replace(':tagId', item.id)), `https://${env.SITE_DOMAIN}`);
  addUrl.searchParams.set(TAG_ADD_PARAM, TAG_ADD_VALUE);

  const components: DiscordContainer = {
    type: 17,
    accent_color: EMBED_ACCENT_COLOR,
    components: [
      // a section needs an accessory, without a thumbnail the text goes in the container directly
      ...((image) ? [{type: 9, components: text, accessory: {type: 11, media: {url: image}}} as const] : text),
      // the button on the same line as the command, discord has no way to put it on the left
      {
        type: 9,
        components: [{
          type: 10,
          content: words.tagHowTo(mentions.tagShow ?? '`/tag show`', mentions.tagGet ?? '`/tag get`', item.id),
        }],
        accessory: {type: 2, style: 5, label: words.addToServer, url: addUrl.toString()},
      },
    ],
  };
  return {
    meta: {
      title: (title) ? `${tag.name} — ${title}` : tag.name,
      description: [ (description) ? truncate(description, EMBED_DESCRIPTION_MAX_LENGTH) : null, stats.join(' · ') ].filter(Boolean).join('\n\n'),
    },
    siteName: words.tagSiteName,
    image,
    components,
  };
}


// how a variant is written on the site (src/pages/commands/commandMeta.ts PREFIXES, which can't be imported here)
const COMMAND_NAME_PREFIXES: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: '.',
  [CommandTypes.APPLICATION_SLASH]: '/',
  [CommandTypes.APPLICATION_MENU_USER]: '',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: '',
};


// the list only changes when the bot uploads its commands
const COMMANDS_CACHE_TTL = 5 * 60;

// the edge cache (cacheTtl) saves the trip to the api, this saves downloading and parsing the whole list again on
// every request this isolate handles. the parsed value rather than the promise: workers don't like one request
// waiting on another's. one list per language, since the descriptions are translated
const cachedCommands = new Map<Language, {commands: Array<Command>, expires: number}>();

// the whole list, there's no single-command endpoint
async function fetchCommands(env: Env, language: Language): Promise<Array<Command> | null> {
  const cached = cachedCommands.get(language);
  if (cached && Date.now() < cached.expires) {
    return cached.commands;
  }
  const query: Record<string, string> = (language === DEFAULT_LANGUAGE) ? {} : {language};
  const commands = await fetchApi<Array<Command>>(env, '/commands', query, COMMANDS_CACHE_TTL);
  // a failure isn't kept, the next request tries again
  if (!Array.isArray(commands)) {
    return null;
  }
  cachedCommands.set(language, {commands, expires: Date.now() + COMMANDS_CACHE_TTL * 1000});
  return commands;
}


// a slash variant as a clickable `</name:id>`, null until the bot has uploaded its `external_id`. discord needs the english
// name in it (it shows the reader's own translation by itself), `name` is translated on other languages' pages
function mentionFor(slash: CommandMetadata | undefined): string | null {
  return (slash?.external_id) ? `</${slash.default_name ?? slash.name}:${slash.external_id}>` : null;
}

function slashCommandMention(command: Command | undefined): string | null {
  return mentionFor((command) ? enabledCommandVariants(command).find((item) => item.type === CommandTypes.APPLICATION_SLASH) : undefined);
}


// how to run one variant, labelled so it's clear they're all the same command under different names
function commandUsage(language: Language, metadata: CommandMetadata): string {
  const name = escapeMarkdown(metadata.name);
  const { usage } = EMBED_TEXT[language];
  switch (metadata.type) {
    // with its arguments, like `.caption ?<emoji,user:id|mention,url> <...text>`. usage never has a backtick in it
    case CommandTypes.PREFIXED: return `**${usage.prefix}** \`${[ `.${metadata.name}`, metadata.usage.trim() ].filter(Boolean).join(' ')}\``;
    case CommandTypes.APPLICATION_SLASH: return `**${usage.slash}** ${mentionFor(metadata) ?? `\`/${metadata.name}\``}`;
    case CommandTypes.APPLICATION_MENU_USER: return `**${usage.userApp}** ${usage.userMenu} ${name}`;
    case CommandTypes.APPLICATION_MENU_MESSAGE: return `**${usage.messageApp}** ${usage.messageMenu} ${name}`;
  }
}


// the variant /commands/:commandId(/:commandType) shows, null for an unknown, hidden (owner) or disabled command
async function fetchCommandMetadata(env: Env, language: Language, commandId: string, slug: string | undefined): Promise<[Command, CommandMetadata] | null> {
  const commands = await fetchCommands(env, language);
  const command = commands?.find((item) => item.id === commandId);
  if (!command) {
    return null;
  }
  const variants = enabledCommandVariants(command);
  const type = commandTypeFromPath(slug, variants.map((metadata) => metadata.type));
  const metadata = variants.find((item) => item.type === type);
  return (metadata && metadata.category !== CommandCategories.OWNER) ? [command, metadata] : null;
}


// the description comes from the api, translated when the bot has the page's language (English otherwise)
function commandEmbed(language: Language, command: Command, metadata: CommandMetadata): Embed {
  const words = EMBED_TEXT[language];
  const name = `${COMMAND_NAME_PREFIXES[metadata.type]}${metadata.name}`;
  const description = metadata.description?.trim() || '';

  const text: Array<DiscordTextDisplay> = [{type: 10, content: `## ${escapeMarkdown(name)}`}];
  if (description) {
    text.push({type: 10, content: truncate(description, EMBED_DESCRIPTION_MAX_LENGTH)});
  }
  // every way to run it, whichever variant the link is for: prefix, then slash, then the context menus
  const variants = enabledCommandVariants(command).sort((x, y) => x.type - y.type);
  text.push({type: 10, content: variants.map((variant) => `-# ${commandUsage(language, variant)}`).join('\n')});

  return {
    meta: {title: name, description: description || words.commandFallback(words.commandTypes[metadata.type])},
    siteName: words.commandSiteName,
    image: null,
    components: {type: 17, accent_color: EMBED_ACCENT_COLOR, components: text},
  };
}


function renderRobots(env: Env): string {
  if (env.ALLOW_INDEXING !== 'true') {
    return 'User-agent: *\nDisallow: /\n';
  }
  return `User-agent: *\nAllow: /\n\nSitemap: https://${env.SITE_DOMAIN}/sitemap.xml\n`;
}


const LANGUAGES = Object.keys(LANGUAGE_PREFIXES) as Array<Language>;

// every language's copy of a page, plus x-default (English, the site's root) for visitors whose language isn't one
function alternateUrls(env: Env, path: string): Array<[string, string]> {
  return [
    ...LANGUAGES.map((language): [string, string] => [language, `https://${env.SITE_DOMAIN}${languagePath(language, path)}`]),
    ['x-default', `https://${env.SITE_DOMAIN}${path}`],
  ];
}

// each page once per language, each entry listing the others so search engines know they're translations
function renderSitemap(env: Env): string {
  const urls = SITEMAP_PATHS.flatMap((path) => {
    const alternates = alternateUrls(env, path).map(([ hreflang, href ]) => {
      return `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}"/>`;
    }).join('');
    return LANGUAGES.map((language) => {
      return `<url><loc>${escapeHtml(`https://${env.SITE_DOMAIN}${languagePath(language, path)}`)}</loc>${alternates}</url>`;
    });
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`;
}


// enforced: nothing may frame the site (the admin pages have one-click actions). frame-ancestors only works when
// enforced, so it lives here rather than in the report-only policy below
const FRAME_POLICY = 'frame-ancestors \'none\'; object-src \'none\'; base-uri \'self\'';
// report-only for now: command previews come from the API and can point at any image host, so this can't be
// enforced until it's been watched in production for a while. once the browser console stays quiet, move it
// into Content-Security-Policy (and add a report endpoint to hear about breakage)
// cloudflare turnstile (the captcha on the report forms when logged out) loads its script and renders in an iframe
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const CONTENT_POLICY = [
  'default-src \'self\'',
  `script-src 'self' ${new URL(UMAMI_SCRIPT_URL).origin} ${TURNSTILE_ORIGIN}`,
  'style-src \'self\'',
  'font-src \'self\'',
  'img-src \'self\' data: https://cdn.discordapp.com https://media.discordapp.net https://cdn.nsb.gg',
  `connect-src 'self' ${new URL(UMAMI_SCRIPT_URL).origin}`,
  `frame-src ${TURNSTILE_ORIGIN}`,
  'form-action \'self\'',
].join('; ');


// a year of https only, also set on static files in public/_headers. no includeSubDomains or preload, those would
// also lock every other notsobot.com subdomain to https
const STRICT_TRANSPORT_SECURITY = 'max-age=31536000';
// nothing on the site uses these, so pages (and anything embedded in them, like the captcha) can't ask for them
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=()';


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


// the navbar's and footer's links (src/components/layout/navLinks.ts, Footer.tsx), as plain links
const STATIC_NAV = [
  [Routes.COMMANDS, 'nav.commands'],
  [Routes.TAG_DIRECTORY, 'nav.tags'],
  [Routes.TAG_DOCS, 'nav.docs'],
  [Routes.STATUS, 'nav.status'],
  [Routes.CHANGELOG, 'nav.changelog'],
  [Routes.FAQ, 'nav.faq'],
] as const;
const STATIC_FOOTER = [
  [Routes.LEGAL_PRIVACY, 'footer.privacy'],
  [Routes.LEGAL_TERMS_OF_SERVICE, 'footer.terms'],
] as const;
const LAYOUT_WORDS: Record<Language, Record<keyof typeof EnglishLayout, string>> = {
  [Languages.ENGLISH]: EnglishLayout,
  [Languages.SPANISH]: SpanishLayout,
  [Languages.PORTUGUESE]: PortugueseLayout,
};

// What goes in #root before the app runs: the page's landmarks, its title and description, and the site's links, so
// crawlers that don't run javascript (AI crawlers, link previews, page checkers) see a real page instead of an empty
// div. react's createRoot replaces it all on its first render, so visitors only see it until the app loads
function renderStaticBody(language: Language, meta: PageMeta): string {
  const words = LAYOUT_WORDS[language];
  const link = (path: string, label: string) => `<a href="${escapeHtml(languagePath(language, path))}">${escapeHtml(label)}</a>`;
  return [
    `<header><a href="${escapeHtml(languagePath(language, Routes.HOME))}">${SITE_NAME}</a>`,
    `<nav aria-label="${escapeHtml(words['nav.main'])}">${STATIC_NAV.map(([ path, key ]) => link(path, words[key])).join(' ')}</nav></header>`,
    `<main><h1>${escapeHtml(meta.title ?? SITE_NAME)}</h1><p>${escapeHtml(meta.description)}</p></main>`,
    `<footer><nav aria-label="${escapeHtml(words['footer.label'])}">${STATIC_FOOTER.map(([ path, key ]) => link(path, words[key])).join(' ')}</nav></footer>`,
  ].join('');
}


// the html for one of the site's pages (or the not-found page) with its metatags filled in, or a file from static assets
async function renderPage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // `/es/premium` is the Spanish copy of `/premium`, everything below works on the path without the prefix
  const split = splitLanguagePath(url.pathname);
  const language = split.language ?? DEFAULT_LANGUAGE;
  const path = split.path;

  // anything else that looks like a file is served as-is, unless it's a page: command ids have dots in them
  // (/commands/media.iv.manipulation.caption)
  const page = findPage(path);
  if ((!page && /\.[a-z0-9]+$/i.test(url.pathname)) || (request.method !== 'GET' && request.method !== 'HEAD')) {
    return env.ASSETS.fetch(request);
  }

  // "/" rather than "/index.html": static assets redirects the latter to the former
  const shell = await env.ASSETS.fetch(new Request(new URL('/', url)));
  if (!shell.ok) {
    return shell;
  }

  const fallback: Embed = {meta: localizedPage(page?.key ?? 'NOT_FOUND', language), siteName: SITE_NAME, image: null, components: null};
  let embed = fallback;
  // the path's segments after the page's own, like the tag id in /tags/directory/:tagId
  const segments = path.replace(/\/+$/, '').split('/');
  // api responses aren't validated, so one in an unexpected shape throws here. the page still renders, with the
  // generic embed
  try {
    if (page?.meta === PAGES.TAG_DIRECTORY_ITEM) {
      const [ item, commands ] = await Promise.all([ fetchTagDirectoryItem(env, segments[3] ?? ''), fetchCommands(env, language) ]);
      if (item) {
        embed = tagEmbed(env, language, item, {
          tagGet: slashCommandMention(commands?.find((command) => command.id === TAG_GET_COMMAND_ID)),
          tagShow: slashCommandMention(commands?.find((command) => command.id === TAG_SHOW_COMMAND_ID)),
        });
      }
    } else if (page?.meta === PAGES.COMMAND || page?.meta === PAGES.COMMAND_TYPE) {
      let commandId = segments[2] ?? '';
      try {
        commandId = decodeURIComponent(commandId);
      } catch {
        // left as-is, it won't match a command
      }
      const found = await fetchCommandMetadata(env, language, commandId, segments[3]);
      if (found) {
        embed = commandEmbed(language, ...found);
      }
    }
  } catch (error) {
    console.error('embed failed', url.pathname, error);
    embed = fallback;
  }
  const { meta, image } = embed;
  const indexable = (env.ALLOW_INDEXING === 'true') && Boolean(page?.meta.index);
  // always the main domain (not www.) and the real path (not a redirect like /privacy), so duplicates don't split
  // search ranking. each language is its own page, so its canonical keeps the prefix. the not-found page gets none
  const canonicalPath = (page) ? (page.canonical ?? (path.replace(/\/+$/, '') || '/')) : null;
  const canonical = (canonicalPath) ? `https://${env.SITE_DOMAIN}${languagePath(language, canonicalPath)}` : null;

  // `name` for regular and twitter tags, `property` for open graph ones (facebook/linkedin ignore `name="og:*"`)
  const metatags: Array<['name' | 'property', string, string]> = [
    ['name', 'description', meta.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', embed.siteName],
    ['property', 'og:title', meta.title ?? SITE_NAME],
    ['property', 'og:description', meta.description],
    ['name', 'twitter:card', 'summary'],
  ];
  if (image) {
    metatags.push(['property', 'og:image', image]);
  }
  if (canonical) {
    metatags.push(['property', 'og:url', canonical]);
  }
  if (!indexable) {
    metatags.push(['name', 'robots', 'noindex']);
  }

  let head = metatags.map(([ attribute, key, content ]) => {
    return `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}"/>`;
  }).join('');
  if (canonical && canonicalPath) {
    head += `<link rel="canonical" href="${escapeHtml(canonical)}"/>`;
    for (const [ hreflang, href ] of alternateUrls(env, canonicalPath)) {
      head += `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}"/>`;
    }
  }
  // discord would drop an oversized one anyway, the og tags are used instead
  const componentEmbed = (embed.components) ? scriptJson({component: embed.components}) : null;
  if (componentEmbed && new TextEncoder().encode(componentEmbed).length <= COMPONENT_EMBED_MAX_BYTES) {
    head += `<script id="discord:component-embed" type="application/json">${componentEmbed}</script>`;
  }
  if (env.UMAMI_WEBSITE_ID) {
    // the only place the script is added, src/lib/analytics.ts waits for it (data-website-id) to send its events
    head += `<script defer data-website-id="${escapeHtml(env.UMAMI_WEBSITE_ID)}" src="${UMAMI_SCRIPT_URL}"></script>`;
  }

  const response = new HTMLRewriter()
    .on('html', {element: (element) => { element.setAttribute('lang', language); }})
    .on('meta[name="description"]', {element: (element) => { element.remove(); }})
    .on('meta[name="theme-color"]', {element: (element) => { element.setAttribute('content', THEME_COLOR); }})
    // setInnerContent escapes text by default
    .on('title', {element: (element) => { element.setInnerContent(pageTitle(meta)); }})
    .on('head', {element: (element) => { element.append(head, {html: true}); }})
    .on('div#root', {element: (element) => { element.setInnerContent(renderStaticBody(language, meta), {html: true}); }})
    .transform(shell);

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-cache');
  // the html now depends on the path, the shell's etag no longer describes it
  headers.delete('etag');
  headers.set('content-security-policy', FRAME_POLICY);
  headers.set('content-security-policy-report-only', CONTENT_POLICY);
  headers.set('x-frame-options', 'DENY');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('strict-transport-security', STRICT_TRANSPORT_SECURITY);
  headers.set('permissions-policy', PERMISSIONS_POLICY);
  // unknown paths still get the app, so its not-found page renders, but as a real 404
  return new Response(response.body, {headers, status: (page === null) ? 404 : 200});
}


const router = new FetchRouter();

// the hosts that get the site. production's route catches every subdomain of notsobot.com (wrangler.jsonc), anything
// not here or in REDIRECT_DOMAINS matches no route and gets cf-worker-router's 404, like nsb.gg. beta.notsobot.com is
// the beta script's (`wrangler deploy --env beta`), and `wrangler dev` sends requests in as notsobot.com
const SITE_HOSTS = ['notsobot.com', 'www.notsobot.com', 'beta.notsobot.com'];

for (const host of SITE_HOSTS) {
  const site = new DomainRouter(host);

  // normally the zone's notsobot.com/api/* route skips workers entirely, this is just in case
  site.route(['/api', '/api/:path...'], '*', (event) => fetch(event.request), {priority: 1});

  site.route('/robots.txt', [HttpMethods.GET, HttpMethods.HEAD], (event) => {
    return new Response(renderRobots(getEnv(event)), {headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600'}});
  }, {priority: 1});

  site.route('/sitemap.xml', [HttpMethods.GET, HttpMethods.HEAD], (event) => {
    return new Response(renderSitemap(getEnv(event)), {headers: {'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600'}});
  }, {priority: 1});

  // every other path, the routes above win by priority (a catch-all listing every method would otherwise sort first)
  site.route('/:path...', '*', (event) => renderPage(event.request, getEnv(event)));
  router.addRouter(site);
}

// notso.bot is a short name for the site
for (const domain of REDIRECT_DOMAINS) {
  const redirect = new DomainRouter(domain);
  redirect.route('/:path...', '*', (event) => {
    return new ApiRedirect(`https://${getEnv(event).SITE_DOMAIN}${event.url.pathname}${event.url.search}`, {status: 301});
  });
  router.addRouter(redirect);
}


function getEnv(event: {environment: Record<string, any>}): Env {
  return event.environment as Env;
}


export default {
  async fetch(request, env, context): Promise<Response> {
    return router.onFetch(request, env, context);
  },
} satisfies ExportedHandler<Env>;
