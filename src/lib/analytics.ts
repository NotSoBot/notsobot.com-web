// the umami script is only ever added by the worker (worker/index.ts, UMAMI_WEBSITE_ID in .dev.vars), so these calls
// do nothing under plain `npm run dev` or when the worker has no website id

import { ANALYTICS_BEFORE_SEND, cleanPayload, type AnalyticsPayload } from '@/lib/analyticsUrl';


export const AnalyticsEvents = Object.freeze({
  BOT_ADDED: 'BotAdded',
  // a link to the bot's invite was clicked, or `/invite` was opened (a link from the bot, nsb.gg, the FAQ). `src` is
  // the button, the same one `BotAdded` comes back with
  INVITE_CLICK: 'InviteClick',
  // the visitor was sent to discord to log in, and came back logged in
  LOGIN_START: 'LoginStart',
  LOGIN_DONE: 'LoginDone',
  // a link to discord's store was clicked (the checkout is on discord, so the click is all we see)
  STORE_CLICK: 'StoreClick',
});


type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: EventData) => void,
    },
  }
}


const SCRIPT_SELECTOR = 'script[data-website-id]';


// umami has no queue for calls made before its (deferred) script runs, so wait for it
function whenLoaded(): Promise<Window['umami']> {
  const script = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
  // once the page has loaded the script has too, or failed (blocked): its own events already fired and won't again
  if (window.umami || !script || document.readyState === 'complete') {
    return Promise.resolve(window.umami);
  }
  return new Promise((resolve) => {
    const done = () => resolve(window.umami);
    script.addEventListener('load', done, {once: true});
    script.addEventListener('error', done, {once: true});
    // in case it finished before these were added: a deferred script always settles before the page's load
    window.addEventListener('load', done, {once: true});
  });
}


// every page view and event goes through this before it's sent (see analyticsUrl.ts for what it changes). main.tsx
// calls it before anything else: the tracker looks the function up when it sends, and its first page view is at the
// page's load
export function installAnalyticsHook(): void {
  (window as unknown as Record<string, unknown>)[ANALYTICS_BEFORE_SEND] = (_type: string, payload: AnalyticsPayload | null) => {
    return (payload) ? cleanPayload(payload, window.location.origin) : payload;
  };
}


export function trackEvent(event: string, data?: EventData): void {
  void whenLoaded().then((umami) => umami?.track(event, data));
}
