import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';


// Cloudflare Turnstile, the captcha on forms people can send without logging in (anonymous reports). The widget checks
// the visitor in the background (most never see a challenge) and hands over a one-use token, which the API checks with
// Cloudflare. https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (element: HTMLElement, options: {
    sitekey: string,
    theme?: 'light' | 'dark' | 'auto',
    callback: (token: string) => void,
    'expired-callback': () => void,
    'error-callback': () => void,
  }) => string,
  reset: (widgetId: string) => void,
  remove: (widgetId: string) => void,
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// one script for the whole page, however many widgets get rendered
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    // a later widget can try again
    const fail = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error('Turnstile didn’t load'));
    };
    script.onload = () => (window.turnstile) ? resolve(window.turnstile) : fail();
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}


// - `loading`: fetching the script and rendering the widget
// - `waiting`: the widget is checking the visitor, no token yet (after a reset too)
// - `solved`: `onToken` has a token
// - `expired` / `failed`: the token expired or the check failed, `onToken` got null (the widget retries on its own)
// - `unavailable`: the script couldn't load or render, only an error message is shown
export type TurnstileState = 'loading' | 'waiting' | 'solved' | 'expired' | 'failed' | 'unavailable';


// `onToken` gets the token, or null once it expires or fails (a new one comes on its own after an expiry). Tokens
// are one use: bump `resetKey` after sending one so the next try gets a fresh token. The wrapper's `data-state` is
// the widget's `TurnstileState`
export function Turnstile({ siteKey, onToken, resetKey = 0, className }: {
  siteKey: string,
  onToken: (token: string | null) => void,
  resetKey?: number,
  className?: string,
}) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{api: TurnstileApi, id: string} | null>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  const [ state, setState ] = useState<TurnstileState>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    loadTurnstile().then((api) => {
      if (cancelled || !container.current) {
        return;
      }
      // render throws on a bad site key or options; without the catch that's an unhandled rejection and a form
      // waiting forever on a token that never comes
      try {
        const id = api.render(container.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (token) => {
            setState('solved');
            callback.current(token);
          },
          'expired-callback': () => {
            setState('expired');
            callback.current(null);
          },
          'error-callback': () => {
            setState('failed');
            callback.current(null);
          },
        });
        widget.current = {api, id};
        setState('waiting');
      } catch {
        setState('unavailable');
      }
    }, () => !cancelled && setState('unavailable'));
    return () => {
      cancelled = true;
      if (widget.current) {
        widget.current.api.remove(widget.current.id);
        widget.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && widget.current) {
      setState('waiting');
      callback.current(null);
      widget.current.api.reset(widget.current.id);
    }
  }, [resetKey]);

  return (
    <div className={className} data-state={state}>
      <div ref={container}/>
      {(state === 'unavailable') ? (
        <p className='text-xs text-warning'>{t('ui.captcha_error')}</p>
      ) : null}
    </div>
  );
}
