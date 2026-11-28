import { matchRoutes, type RouteObject } from 'react-router';


// A page the worker rendered hydrates with its lazy route modules already loaded, or the router would render the
// HydrateFallback (nothing) over the server's markup until they arrive. Both sites' routers (src/router.tsx,
// src/games/router.tsx). Gives back the matched routes' handles
export async function loadMatchedRouteModules(routes: Array<RouteObject>, basename: string): Promise<Array<unknown>> {
  const matches = matchRoutes(routes, window.location, basename || undefined) ?? [];
  await Promise.all(matches.map(async ({ route }) => {
    if (typeof route.lazy === 'function') {
      Object.assign(route, {...await route.lazy(), lazy: undefined});
    }
  }));
  return matches.map(({ route }) => route.handle);
}
