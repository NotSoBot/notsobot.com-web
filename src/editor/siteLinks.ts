// Links the Activity opens to notsobot.com (docs, commands, premium, the dashboard) and notsogames.com (the game guides)
// go to the page in the
// Activity's language: `/es/` or `/pt/` before the path (src/i18n/languages.ts). The pages that stay English on the site
// (admin and owner pages, the changelog, the legal pages) and what isn't a page (the api) keep their url, and so does
// a link that already says its language (the guides' own links, an `/en/` one)
import { languagePath, splitLanguagePath, type Language } from '@/i18n/languages';


const SITE_HOSTS: ReadonlySet<string> = new Set(['notsobot.com', 'www.notsobot.com', 'notsogames.com', 'www.notsogames.com']);

const ENGLISH_ONLY_PATHS: ReadonlyArray<string> = [
  '/api',
  '/changelog',
  '/dashboard/admin',
  '/dashboard/owner',
  '/legal',
  // the old legal urls, they redirect to /legal
  '/privacy',
  '/terms',
];


function englishOnly(path: string): boolean {
  const lower = path.toLowerCase();
  return ENGLISH_ONLY_PATHS.some((prefix) => lower === prefix || lower.startsWith(`${prefix}/`));
}


// 'https://notsobot.com/premium' in Spanish -> 'https://notsobot.com/es/premium'. Anything else comes back as it was
export function localizedSiteUrl(url: string, language: Language): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== 'https:' || !SITE_HOSTS.has(parsed.hostname)) {
    return url;
  }
  const path = parsed.pathname;
  if (splitLanguagePath(path).language || englishOnly(path)) {
    return url;
  }
  const localized = languagePath(language, path);
  if (localized === path) {
    return url;
  }
  return `${parsed.origin}${localized}${parsed.search}${parsed.hash}`;
}
