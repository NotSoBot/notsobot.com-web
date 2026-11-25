import type { EditorRoom } from './room';
import type {
  EditorActivityContext,
  EditorCatalogue,
  EditorDocument,
  EditorDocumentSummary,
  EditorJob,
  EditorPreview,
  EditorPreviewMode,
  EditorStep,
  EditorTemplate,
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
  // a room op naming a step someone else removed, the op is dropped
  UNKNOWN_EDITOR_STEP: 10044,
  UNKNOWN_EDITOR_TEMPLATE: 10045,
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


// an id put into an api path. Ids come from the url (`/editor/:documentId`, which react router decodes, so `..%2F`
// arrives as `../`) and from the activity's `?instance_id=`, never let one walk to another endpoint with the user's token
export function pathId(value: string): string {
  if (!/^[\w-]+$/.test(value)) {
    throw new Error('Invalid id');
  }
  return value;
}


export function createEditorApi(request: EditorRequest) {
  return {
    effects: () => request<EditorCatalogue>('/editor/effects'),
    documents: () => request<{documents: Array<EditorDocumentSummary>}>('/editor/documents'),
    createDocument: (input: {file?: File, url?: string, activityInstanceId?: string, templateId?: string}) => {
      const form = new FormData();
      // the new document starts with the template's steps
      if (input.templateId) {
        form.append('template_id', input.templateId);
      }
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
    document: (documentId: string, signal?: AbortSignal) => request<EditorDocument>(`/editor/documents/${pathId(documentId)}`, {signal}),
    saveSteps: (documentId: string, steps: Array<EditorStep>, version: number) => request<EditorDocument>(
      `/editor/documents/${pathId(documentId)}`,
      {method: 'PATCH', body: {steps, version}, headers: {'if-match': String(version)}},
    ),
    deleteDocument: (documentId: string) => request<void>(`/editor/documents/${pathId(documentId)}`, {method: 'DELETE'}),
    preview: (documentId: string, options: {mode: EditorPreviewMode, frame?: number, upto?: number}, signal?: AbortSignal) => request<EditorPreview>(
      `/editor/documents/${pathId(documentId)}/previews`,
      {
        method: 'POST',
        body: {mode: (options.mode === 'frame') ? 'frame' : 'clip', frame: options.frame ?? 0, upto: options.upto},
        // the request waits up to 5s for its job before answering `pending`
        timeout: 20 * 1000,
        signal,
      },
    ),
    previewStatus: (documentId: string, previewId: string, signal?: AbortSignal) => request<EditorPreview>(
      `/editor/documents/${pathId(documentId)}/previews/${pathId(previewId)}`,
      {signal},
    ),
    // `mimetype`: one of the document's `render_formats`, none keeps whatever the stack makes
    render: (documentId: string, mimetype?: string) => request<EditorJob>(
      `/editor/documents/${pathId(documentId)}/render`,
      {method: 'POST', body: (mimetype) ? {mimetype} : undefined, timeout: 30 * 1000},
    ),
    job: (jobId: string) => request<EditorJob>(`/jobs/${pathId(jobId)}`),
    // a render put on Discord's cdn with the user's own Discord token (the Activity's share dialog only takes those)
    shareAttachment: (url: string, accessToken: string) => request<{url: string}>('/editor/share', {
      method: 'POST',
      body: {url, access_token: accessToken},
      timeout: 60 * 1000,
    }),
    activity: (instanceId: string) => request<EditorActivityContext>(`/editor/activity/${pathId(instanceId)}`),
    createTemplate: (documentId: string, name: string) => request<EditorTemplate>('/editor/templates', {method: 'POST', body: {document_id: documentId, name}}),
    templates: () => request<{templates: Array<EditorTemplate>}>('/editor/templates'),
    template: (templateId: string) => request<EditorTemplate>(`/editor/templates/${pathId(templateId)}`),
    deleteTemplate: (templateId: string) => request<void>(`/editor/templates/${pathId(templateId)}`, {method: 'DELETE'}),
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
  // links leaving the editor (download, premium): the Activity has to ask Discord to open them
  openExternal?: (url: string) => void,
  // the Activity's shared room, every change goes through it
  room?: EditorRoom,
  // the premium page link for the limits note
  premiumUrl: string,
  // a template's share link, always the site's (`https://notsobot.com/editor/t/<id>`), even from inside Discord
  templateUrl: (templateId: string) => string,
  // the editor is the whole window (the Activity), not a page under the site's navbar
  fullscreen?: boolean,
}
