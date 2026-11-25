import type {
  EditorActivityContext,
  EditorCatalogue,
  EditorDocument,
  EditorDocumentSummary,
  EditorJob,
  EditorPreview,
  EditorPreviewMode,
  EditorStep,
} from './types';


// How a host talks to notsobot.api. The site uses its own `apiRequest` (stored token, `config.apiBase`), the Activity
// sends its in-memory token to `/.proxy/api`. Errors are thrown as the host's own error type, `editorErrorOf` reads them
export type EditorRequest = <T>(path: string, options?: {
  method?: string,
  body?: unknown,
  headers?: Record<string, string>,
  query?: Record<string, string | number | boolean | undefined>,
  timeout?: number,
  signal?: AbortSignal,
}) => Promise<T>;


// notsobot.api's editor error codes (utilities/constants/errors.py)
export const EditorErrorCodes = Object.freeze({
  UNKNOWN_EDITOR_DOCUMENT: 10043,
  UNKNOWN_ACTIVITY_INSTANCE: 10042,
  EDITOR_DOCUMENT_VERSION_MISMATCH: 50053,
  EDITOR_INVALID_STEP: 50054,
  SERVICE_BUSY: 90008,
});


export interface EditorApiError {
  status: number,
  code: number | null,
  message: string,
  // the api's error metadata, flat in its body (a step error's `index`, `param`)
  body: Record<string, unknown> | null,
}


export function createEditorApi(request: EditorRequest) {
  return {
    effects: () => request<EditorCatalogue>('/editor/effects'),
    documents: () => request<{documents: Array<EditorDocumentSummary>}>('/editor/documents'),
    createDocument: (input: {file?: File, url?: string, activityInstanceId?: string}) => {
      const form = new FormData();
      if (input.file) {
        form.append('file', input.file);
      }
      if (input.url) {
        form.append('url', input.url);
      }
      if (input.activityInstanceId) {
        form.append('activity_instance_id', input.activityInstanceId);
      }
      // a big upload takes longer than the usual 15s
      return request<EditorDocument>('/editor/documents', {method: 'POST', body: form, timeout: 120 * 1000});
    },
    document: (documentId: string, signal?: AbortSignal) => request<EditorDocument>(`/editor/documents/${documentId}`, {signal}),
    saveSteps: (documentId: string, steps: Array<EditorStep>, version: number) => request<EditorDocument>(
      `/editor/documents/${documentId}`,
      {method: 'PATCH', body: {steps, version}, headers: {'if-match': String(version)}},
    ),
    deleteDocument: (documentId: string) => request<void>(`/editor/documents/${documentId}`, {method: 'DELETE'}),
    preview: (documentId: string, options: {mode: EditorPreviewMode, frame?: number, upto?: number}, signal?: AbortSignal) => request<EditorPreview>(
      `/editor/documents/${documentId}/previews`,
      {
        method: 'POST',
        body: {mode: (options.mode === 'frame') ? 'frame' : 'clip', frame: options.frame ?? 0, upto: options.upto},
        // the request waits up to 5s for its job before answering `pending`
        timeout: 20 * 1000,
        signal,
      },
    ),
    previewStatus: (documentId: string, previewId: string, signal?: AbortSignal) => request<EditorPreview>(
      `/editor/documents/${documentId}/previews/${previewId}`,
      {signal},
    ),
    render: (documentId: string) => request<EditorJob>(`/editor/documents/${documentId}/render`, {method: 'POST', timeout: 30 * 1000}),
    job: (jobId: string) => request<EditorJob>(`/jobs/${jobId}`),
    activity: (instanceId: string) => request<EditorActivityContext>(`/editor/activity/${instanceId}`),
  };
}

export type EditorApi = ReturnType<typeof createEditorApi>;


// The host the editor runs in. Everything the editor needs from outside goes through here
export interface EditorHost {
  api: EditorApi,
  // reads the host's thrown errors
  errorOf: (error: unknown) => EditorApiError | null,
  // where "edit another file" goes (web: the start screen, activity: nothing, it's one document)
  onLeave?: () => void,
  // `share`: the Activity's share-to-channel, absent on the web
  share?: (url: string) => Promise<void>,
  // the premium page link for the limits note
  premiumUrl: string,
}
