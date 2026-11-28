// The sign-in handoff between the sites (notsogames-plan.md "Sign-in"). notsogames.com never sees Discord: its "Sign in
// with Discord" sends the tab to notsobot.com/auth/handoff with a nonce (`state`) it keeps in this tab's sessionStorage.
// notsobot.com logs in if it needs to, asks the api for a one-time code bound to the user and sha256(state), and sends
// the tab back to notsogames.com/auth/callback with the code and the state. The callback only redeems a code whose state
// is the one this tab is waiting for (`consumeHandoff`), so nobody can send a link that signs a visitor in to their
// account, and the long-lived token never goes in a url: the redeem answers with it.
// Plain functions, the same file in both repos (notsobot.com-web and notsogames.com-web, src/auth/handoff.ts): notsobot.com's
// page is its src/pages/auth/HandoffPage.tsx, notsogames.com's callback its src/games/pages/AuthCallbackPage.tsx
import { languagePath, type Language } from '@/i18n/languages';


const STORAGE_KEY = 'games:handoff';
// as long as a Discord login can reasonably take (the api's own code lasts 60s once it's made)
export const HANDOFF_MAX_AGE = 15 * 60 * 1000;
// 32 random bytes, base64url
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export const HANDOFF_PATH = '/auth/handoff';
export const HANDOFF_CALLBACK_PATH = '/auth/callback';
// `/auth/handoff?reauth=guilds`: log in with Discord again for the `guilds` scope even when already logged in (the
// games site's server list needs it, "Sign in again")
export const HANDOFF_REAUTH_PARAM = 'reauth';


interface PendingHandoff {
  state: string,
  returnTo: string,
  at: number,
}


export function isHandoffState(value: unknown): value is string {
  return typeof value === 'string' && STATE_PATTERN.test(value);
}

export function newHandoffState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


// a path on this site to come back to: never another origin, never the auth pages (they'd loop)
export function sanitizeGamesReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || /^(\/[a-z]{2})?\/auth(\/|$)/i.test(value)) {
    return '/';
  }
  return value;
}


// the one this tab is waiting for, replacing any before it
export function saveHandoff(state: string, returnTo: string, now: number = Date.now()): void {
  const pending: PendingHandoff = {state, returnTo: sanitizeGamesReturnTo(returnTo), at: now};
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // storage unavailable: the callback refuses it, like a link from somewhere else
  }
}


// One use: whether `state` is the handoff this tab started (and recently), with where to go after. Anything else (no
// handoff waiting, another state, too old, storage that throws) is refused
export function consumeHandoff(state: string | null, now: number = Date.now()): {ok: true, returnTo: string} | {ok: false} {
  let pending: PendingHandoff | null = null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    pending = (raw) ? JSON.parse(raw) as PendingHandoff : null;
  } catch {
    return {ok: false};
  }
  if (!pending || !isHandoffState(state) || pending.state !== state || typeof pending.at !== 'number' || HANDOFF_MAX_AGE < now - pending.at || now < pending.at) {
    return {ok: false};
  }
  return {ok: true, returnTo: sanitizeGamesReturnTo(pending.returnTo)};
}


// what notsobot.com sends the api instead of the state itself: sha256, lowercase hex
export async function handoffStateHash(state: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}


// notsobot.com's handoff page for this state, in the games site's language
export function handoffStartUrl(notsobotOrigin: string, language: Language, state: string, reauth: boolean = false): string {
  const url = new URL(languagePath(language, HANDOFF_PATH), notsobotOrigin);
  url.searchParams.set('state', state);
  if (reauth) {
    url.searchParams.set(HANDOFF_REAUTH_PARAM, 'guilds');
  }
  return url.toString();
}

// the games site's callback with the code, in notsobot.com's language
export function handoffCallbackUrl(gamesOrigin: string, language: Language, code: string, state: string): string {
  const url = new URL(languagePath(language, HANDOFF_CALLBACK_PATH), gamesOrigin);
  url.searchParams.set('code', code);
  url.searchParams.set('state', state);
  return url.toString();
}
