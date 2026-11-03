// The worker's render of a page (renderPage in worker/index.ts): the same providers and routes as src/main.tsx, on a
// static router for the request's url. src/main.tsx hydrates it with the router state from `hydrationScript`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type HydrationState } from 'react-router';

import { AuthProvider } from '@/auth';
import { LANGUAGE_PREFIXES, type Language } from '@/i18n';
import { setServerLocales } from '@/i18n/languages';
import { loadDictionary, setActiveLanguage } from '@/i18n/translate';
import { preloadPage } from '@/lib/pagePreload';
import { HYDRATION_DATA_ID, routes } from '@/router';


export interface RenderedPage {
  // what goes in #root
  html: string,
  // goes right after #root
  hydrationScript: string,
}


// one per url prefix (`/es`, `/en` and none for English), the basename. they only hold the routes, so each isolate
// keeps them
const handlers = new Map<string, ReturnType<typeof createStaticHandler>>();

function handlerFor(prefix: string): ReturnType<typeof createStaticHandler> {
  let handler = handlers.get(prefix);
  if (!handler) {
    handler = createStaticHandler(routes, {basename: prefix || undefined});
    handlers.set(prefix, handler);
  }
  return handler;
}


// 'es-MX,es;q=0.9,en;q=0.8' -> ['es-MX', 'es', 'en']. browsers list them by preference already
function acceptedLocales(header: string | null): Array<string> {
  return (header ?? '').split(',').map((part) => part.split(';')[0].trim()).filter((locale) => locale && locale !== '*');
}


// null when the browser should render the page itself: a redirect, or a route that threw
// `prefix` is the url's (`splitLanguagePath`), the language's own when left out
export async function renderApp(request: Request, language: Language, prefix: string = LANGUAGE_PREFIXES[language]): Promise<RenderedPage | null> {
  const handler = handlerFor(prefix);
  // loads the matched routes' lazy modules too
  const context = await handler.query(request);
  if (context instanceof Response || context.errors) {
    return null;
  }
  const queryClient = new QueryClient();
  const [ dictionary ] = await Promise.all([
    loadDictionary(language),
    preloadPage(queryClient, context.matches.map(({ route }) => route.handle), language),
  ]);
  const router = createStaticRouter(handler.dataRoutes, context);

  // The active language and locales are module state, shared by every request this isolate handles. renderToString
  // is synchronous, so nothing else runs between setting them and the render reading them (useI18n() falls back to
  // the language without an I18nProvider, which only exists in the browser since it holds the browser router)
  setActiveLanguage(language, dictionary);
  setServerLocales(acceptedLocales(request.headers.get('accept-language')));
  const html = renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StaticRouterProvider router={router} context={context} hydrate={false}/>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );

  // JSON rather than the inline script StaticRouterProvider would add, which the content policy doesn't allow
  const state: HydrationState = {loaderData: context.loaderData, actionData: context.actionData};
  const json = JSON.stringify(state).replace(/</g, '\\u003c');
  return {html, hydrationScript: `<script id="${HYDRATION_DATA_ID}" type="application/json">${json}</script>`};
}
