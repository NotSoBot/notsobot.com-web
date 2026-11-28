// The worker's render of a page (renderPage in worker/index.ts): the same providers and routes as src/main.tsx (or
// src/games.tsx for notsogames.com, src/games/entry-server.tsx), on a static router for the request's url. The browser
// hydrates it with the router state from `hydrationScript`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type HydrationState, type RouteObject } from 'react-router';

import { AuthProvider } from '@/auth';
import { LANGUAGE_PREFIXES, type Language } from '@/i18n';
import { setServerLocales } from '@/i18n/languages';
import { loadDictionary, setActiveLanguage, type Translations } from '@/i18n/translate';
import { preloadPage } from '@/lib/pagePreload';
import { HYDRATION_DATA_ID, routes } from '@/router';
import { setServerOrigin } from '@/sites';


export interface RenderedPage {
  // what goes in #root
  html: string,
  // goes right after #root
  hydrationScript: string,
}


// one per site and url prefix (`/es`, `/en` and none for English), the basename. they only hold the routes, so each
// isolate keeps them
const handlers = new Map<string, ReturnType<typeof createStaticHandler>>();

function handlerFor(site: string, routes: Array<RouteObject>, prefix: string): ReturnType<typeof createStaticHandler> {
  const key = `${site}:${prefix}`;
  let handler = handlers.get(key);
  if (!handler) {
    handler = createStaticHandler(routes, {basename: prefix || undefined});
    handlers.set(key, handler);
  }
  return handler;
}


// 'es-MX,es;q=0.9,en;q=0.8' -> ['es-MX', 'es', 'en']. browsers list them by preference already
function acceptedLocales(header: string | null): Array<string> {
  return (header ?? '').split(',').map((part) => part.split(';')[0].trim()).filter((locale) => locale && locale !== '*');
}


// what differs between the two sites' renders (this file's notsobot.com, src/games/entry-server.tsx's notsogames.com)
export interface SiteRenderer {
  site: string,
  routes: Array<RouteObject>,
  hydrationId: string,
  // the providers around the router, the browser's own (src/main.tsx, src/games.tsx)
  wrap: (children: ReactNode) => ReactNode,
  // what the matched pages need loaded before they render (pagePreload)
  preload: (queryClient: QueryClient, handles: Array<unknown>, language: Language) => Promise<void>,
  // the strings: notsogames.com's need its own area too
  dictionary: (language: Language) => Promise<Translations>,
}


// null when the browser should render the page itself: a redirect, or a route that threw
// `prefix` is the url's (`splitLanguagePath`), the language's own when left out
export async function renderSite(renderer: SiteRenderer, request: Request, language: Language, prefix: string = LANGUAGE_PREFIXES[language]): Promise<RenderedPage | null> {
  const handler = handlerFor(renderer.site, renderer.routes, prefix);
  // loads the matched routes' lazy modules too
  const context = await handler.query(request);
  if (context instanceof Response || context.errors) {
    return null;
  }
  const queryClient = new QueryClient();
  const [ dictionary ] = await Promise.all([
    renderer.dictionary(language),
    renderer.preload(queryClient, context.matches.map(({ route }) => route.handle), language),
  ]);
  const router = createStaticRouter(handler.dataRoutes, context);

  // The active language, locales and origin are module state, shared by every request this isolate handles.
  // renderToString is synchronous, so nothing else runs between setting them and the render reading them (useI18n()
  // falls back to the language without an I18nProvider, which only exists in the browser since it holds the browser
  // router)
  setActiveLanguage(language, dictionary);
  setServerLocales(acceptedLocales(request.headers.get('accept-language')));
  setServerOrigin(new URL(request.url).origin);
  const html = renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {renderer.wrap(<StaticRouterProvider router={router} context={context} hydrate={false}/>)}
      </QueryClientProvider>
    </StrictMode>,
  );

  // JSON rather than the inline script StaticRouterProvider would add, which the content policy doesn't allow
  const state: HydrationState = {loaderData: context.loaderData, actionData: context.actionData};
  const json = JSON.stringify(state).replace(/</g, '\\u003c');
  return {html, hydrationScript: `<script id="${renderer.hydrationId}" type="application/json">${json}</script>`};
}


const NOTSOBOT_RENDERER: SiteRenderer = {
  site: 'notsobot',
  routes,
  hydrationId: HYDRATION_DATA_ID,
  wrap: (children) => <AuthProvider>{children}</AuthProvider>,
  preload: preloadPage,
  dictionary: (language) => loadDictionary(language),
};

// notsobot.com's pages
export function renderApp(request: Request, language: Language, prefix?: string): Promise<RenderedPage | null> {
  return renderSite(NOTSOBOT_RENDERER, request, language, prefix);
}
