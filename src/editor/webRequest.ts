// The editor api's requests on the sites (notsobot.com/editor, notsogames.com's game host): the site's stored login
// token and api base (`apiRequest`), its errors read back as the editor's
import { apiRequest, ApiRequestError } from '@/lib/api';

import type { EditorApiError, EditorRequest } from './api';


export const webRequest: EditorRequest = (path, options = {}) => apiRequest(path, {
  method: options.method,
  body: options.body,
  headers: options.headers,
  query: options.query,
  timeout: options.timeout,
  signal: options.signal,
});

export function webErrorOf(error: unknown): EditorApiError | null {
  if (error instanceof ApiRequestError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      body: (error.body as Record<string, unknown> | null) ?? null,
    };
  }
  return null;
}
