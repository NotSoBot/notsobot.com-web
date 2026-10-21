import { useEffect, useRef, useState } from 'react';


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
    script.onload = () => (window.turnstile) ? resolve(window.turnstile) : reject(new Error('Turnstile didn’t load'));
    script.onerror = () => {
      // a later widget can try again
      scriptPromise = null;
      script.remove();
      reject(new Error('Turnstile didn’t load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}


// `onToken` gets the token, or null once it expires or fails (a new one comes on its own after an expiry). Tokens
// are one use: bump `resetKey` after sending one so the next try gets a fresh token
export function Turnstile({ siteKey, onToken, resetKey = 0, className }: {
  siteKey: string,
  onToken: (token: string | null) => void,
  resetKey?: number,
  className?: string,
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{api: TurnstileApi, id: string} | null>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  const [ failed, setFailed ] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile().then((api) => {
      if (cancelled || !container.current) {
        return;
      }
      const id = api.render(container.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (token) => callback.current(token),
        'expired-callback': () => callback.current(null),
        'error-callback': () => callback.current(null),
      });
      widget.current = {api, id};
    }, () => !cancelled && setFailed(true));
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
      callback.current(null);
      widget.current.api.reset(widget.current.id);
    }
  }, [resetKey]);

  return (
    <div className={className}>
      <div ref={container}/>
      {(failed) ? (
        <p className='text-xs text-warning'>The captcha couldn’t load. Check that nothing is blocking challenges.cloudflare.com, or log in instead.</p>
      ) : null}
    </div>
  );
}
