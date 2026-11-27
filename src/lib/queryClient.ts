import { QueryClient } from '@tanstack/react-query';

import { ApiRequestError } from '@/lib/api/client';


// the site's (src/main.tsx) and the Discord Activity's dashboard screens (src/activity-games/settings), same defaults
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // client errors (4xx) won't fix themselves on retry
        retry: (failureCount, error) => {
          if (error instanceof ApiRequestError && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}
