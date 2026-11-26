import type { EditorApiError, EditorRequest } from '../api';
import type { EditorTemplate } from '../types';
import type { HubPage, HubQuery, HubReportReason, HubTemplate } from './types';


// an id put into a path (the same rule as `pathId` in ../api.ts, kept here so this file doesn't import it back)
function code(value: string): string {
  if (!/^[\w-]+$/.test(value)) {
    throw new Error('Invalid id');
  }
  return value;
}


// The hub's endpoints, spread into `createEditorApi` so both hosts (the site and the Activity) have them
export function hubApi(request: EditorRequest) {
  return {
    // 24 a page, `before` is the last page's `next`. Logged out works while the editor is public
    hub: (query: HubQuery, signal?: AbortSignal) => request<HubPage>('/editor/hub', {
      query: {
        query: query.query || undefined,
        kind: query.kind,
        group: query.group,
        asks: (query.asks) ? true : undefined,
        sort: query.sort,
        before: query.before,
      },
      signal,
    }),
    // a published one, a 404 otherwise
    hubTemplate: (templateCode: string, signal?: AbortSignal) => request<HubTemplate>(`/editor/hub/${code(templateCode)}`, {signal}),
    // the owner's: runs the publish check (text, drawings, a sample render) on the editor queue and waits for it
    publishTemplate: (templateCode: string, description: string) => request<EditorTemplate>(`/editor/templates/${code(templateCode)}/publish`, {
      method: 'POST',
      body: {description},
      timeout: 90 * 1000,
    }),
    unpublishTemplate: (templateCode: string) => request<EditorTemplate>(`/editor/templates/${code(templateCode)}/publish`, {method: 'DELETE'}),
    reportTemplate: (templateCode: string, reason: HubReportReason, text?: string) => request<void>(`/editor/templates/${code(templateCode)}/report`, {
      method: 'POST',
      body: {reason, text: text || undefined},
    }),
  };
}


// `EDITOR_HUB_LIMIT`: published too many (10, 50 with premium), its `limit` is in the error's metadata. Read by the
// metadata, the error's number isn't settled
export function hubLimitOf(error: EditorApiError | null): number | null {
  const limit = error?.body?.limit;
  return (typeof limit === 'number' && error?.status !== 404) ? limit : null;
}
