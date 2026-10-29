// the umami script is only ever added by the worker (worker/index.ts, UMAMI_WEBSITE_ID in .dev.vars), so these calls
// do nothing under plain `npm run dev` or when the worker has no website id

export const AnalyticsEvents = Object.freeze({
  BOT_ADDED: 'BotAdded',
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
  if (window.umami) {
    return Promise.resolve(window.umami);
  }
  const script = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
  if (!script) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const done = () => resolve(window.umami);
    script.addEventListener('load', done, {once: true});
    script.addEventListener('error', done, {once: true});
  });
}


export function trackEvent(event: string, data?: EventData): void {
  void whenLoaded().then((umami) => umami?.track(event, data));
}
