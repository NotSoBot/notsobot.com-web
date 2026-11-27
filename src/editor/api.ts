import { hubApi } from './hub/api';
import { createInvitesApi, type RoomInviter } from './invites';
import type { EditorRoom } from './room';
import type {
  EditorActivityContext,
  EditorAsset,
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
// seconds the api holds an unfinished job's answer (`GET /jobs/<id>?wait=`, its most is 10)
const JOB_POLL_WAIT = 8;


export const EditorErrorCodes = Object.freeze({
  UNKNOWN_EDITOR_DOCUMENT: 10043,
  UNKNOWN_ACTIVITY_INSTANCE: 10042,
  // a room op naming a step someone else removed, the op is dropped
  UNKNOWN_EDITOR_STEP: 10044,
  UNKNOWN_EDITOR_TEMPLATE: 10045,
  // a room invite's room is gone (an editor lobby's is UNKNOWN_EDITOR_DOCUMENT), or the invite is unknown or expired
  UNKNOWN_ACTIVITY_GAME_ROOM: 10046,
  UNKNOWN_ACTIVITY_INVITE: 10047,
  // a locked template needs its password, or it was the wrong one (5 wrong a minute, then a 429)
  EDITOR_TEMPLATE_LOCKED: 50057,
  EDITOR_TEMPLATE_PASSWORD_INVALID: 50058,
  // a password room (an editor lobby or a game room) they haven't given the password of
  EDITOR_LOBBY_LOCKED: 50060,
  EDITOR_DOCUMENT_VERSION_MISMATCH: 50053,
  EDITOR_INVALID_STEP: 50054,
  // a room's step someone else is adjusting right now, the api refuses anyone else's change to it
  EDITOR_STEP_LOCKED: 50064,
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
    createDocument: (input: {file?: File, url?: string, activityInstanceId?: string, templateCode?: string, templatePassword?: string, lobbyPassword?: string, lobbyName?: string, lobbyWatchOnly?: boolean}) => {
      const form = new FormData();
      // the new document starts with the template's steps (a locked one's need its password)
      if (input.templateCode) {
        form.append('template_code', input.templateCode);
      }
      if (input.templatePassword) {
        form.append('template_password', input.templatePassword);
      }
      // a password lobby, with `activityInstanceId`
      if (input.lobbyPassword) {
        form.append('lobby_password', input.lobbyPassword);
      }
      if (input.lobbyWatchOnly) {
        form.append('lobby_watch_only', 'true');
      }
      if (input.lobbyName) {
        form.append('lobby_name', input.lobbyName);
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
    // a document whose source a generator makes (the api waits for it, up to ~40s on a busy queue)
    generateDocument: (input: {generator: string, params: Record<string, unknown>, activityInstanceId?: string, templateCode?: string, templatePassword?: string, lobbyPassword?: string, lobbyName?: string, lobbyWatchOnly?: boolean}) => request<EditorDocument>(
      '/editor/documents/generate',
      {
        method: 'POST',
        body: {
          generator: input.generator,
          params: input.params,
          activity_instance_id: input.activityInstanceId,
          template_code: input.templateCode,
          template_password: input.templatePassword,
          lobby_password: input.lobbyPassword,
          lobby_name: input.lobbyName,
          lobby_watch_only: input.lobbyWatchOnly || undefined,
        },
        timeout: 60 * 1000,
      },
    ),
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
    // a pending one's answer is held by the api until it's over (8s at most), so this is asked again as it comes back
    previewStatus: (documentId: string, previewId: string, signal?: AbortSignal) => request<EditorPreview>(
      `/editor/documents/${pathId(documentId)}/previews/${pathId(previewId)}`,
      {signal, timeout: 25 * 1000},
    ),
    // `mimetype`: one of the document's `render_formats`, none keeps whatever the stack makes
    render: (documentId: string, mimetype?: string) => request<EditorJob>(
      `/editor/documents/${pathId(documentId)}/render`,
      {method: 'POST', body: (mimetype) ? {mimetype} : undefined, timeout: 30 * 1000},
    ),
    // the api holds an unfinished job's answer up to JOB_POLL_WAIT seconds, so the next poll goes out as this one comes back
    job: (jobId: string) => request<EditorJob>(`/jobs/${pathId(jobId)}`, {query: {wait: JOB_POLL_WAIT}, timeout: 25 * 1000}),
    // a render put on Discord's cdn with the user's own Discord token (the Activity's share dialog only takes those)
    shareAttachment: (url: string, accessToken: string, filename?: string) => request<{url: string}>('/editor/share', {
      method: 'POST',
      body: {url, access_token: accessToken, filename},
      timeout: 60 * 1000,
    }),
    // "Post in chat": the bot posts a render or a template card in the activity's channel, when they could post there
    activityPost: (instanceId: string, body: ActivityPostBody) => request<{posted: boolean, reason?: string}>(
      `/editor/activity/${pathId(instanceId)}/post`,
      {method: 'POST', body, timeout: 60 * 1000},
    ),
    // an overlay's file (a picture, gif or video) for the document, scanned like an upload
    uploadAsset: (documentId: string, input: {file?: File, url?: string}) => {
      const form = new FormData();
      if (input.file) {
        form.append('file', input.file);
      }
      if (input.url) {
        form.append('url', input.url);
      }
      return request<EditorAsset>(`/editor/documents/${pathId(documentId)}/assets`, {method: 'POST', body: form, timeout: 120 * 1000});
    },
    // Replace media: a new source (a file or a link, scanned like an upload) under the same steps. `version`: the one the
    // client has, a change meanwhile is a 409; a step that doesn't work on the new file is EDITOR_INVALID_STEP
    replaceSource: (documentId: string, input: {file?: File, url?: string}, version: number) => {
      const form = new FormData();
      if (input.file) {
        form.append('file', input.file);
      }
      if (input.url) {
        form.append('url', input.url);
      }
      form.append('version', String(version));
      return request<EditorDocument>(`/editor/documents/${pathId(documentId)}/source`, {method: 'PUT', body: form, timeout: 120 * 1000});
    },
    // a template's overlay files onto the document, before its steps are loaded onto it
    importTemplateAssets: (documentId: string, templateCode: string) => request<{assets: Array<EditorAsset>}>(
      `/editor/documents/${pathId(documentId)}/assets/template`,
      {method: 'POST', body: {template_code: templateCode}},
    ),
    // the visible steps as mediascript: `lines` on the key `media`, and `tag`, a whole tag running them on `{iv}`
    mediascript: (documentId: string) => request<{lines: Array<string>, tag: string, line_count: number, max_lines: number}>(`/editor/documents/${pathId(documentId)}/mediascript`),
    activity: (instanceId: string) => request<EditorActivityContext>(`/editor/activity/${pathId(instanceId)}`),
    // opened in an App Channel (no instance there): the same context, `instance_id` is the channel's stand-in for the rest
    appChannel: () => request<EditorActivityContext>('/editor/app-channel'),
    createTemplate: (documentId: string, name: string, password?: string) => request<EditorTemplate>(
      '/editor/templates',
      {method: 'POST', body: {document_id: documentId, name, password: password || undefined}},
    ),
    // a locked template's steps (the password is checked, wrong ones are limited)
    unlockTemplate: (templateCode: string, password: string) => request<EditorTemplate>(
      `/editor/templates/${pathId(templateCode)}/unlock`,
      {method: 'POST', body: {password}},
    ),
    // the owner locks it (a new password) or takes the lock off (null)
    setTemplatePassword: (templateCode: string, password: string | null) => request<EditorTemplate>(
      `/editor/templates/${pathId(templateCode)}`,
      {method: 'PATCH', body: {password}},
    ),
    templates: () => request<{templates: Array<EditorTemplate>}>('/editor/templates'),
    // one of their own templates takes the document's saved steps ("Save template" after loading it)
    saveTemplateSteps: (templateCode: string, documentId: string) => request<EditorTemplate>(`/editor/templates/${pathId(templateCode)}/steps`, {
      method: 'PUT',
      body: {document_id: documentId},
    }),
    template: (templateCode: string) => request<EditorTemplate>(`/editor/templates/${pathId(templateCode)}`),
    deleteTemplate: (templateCode: string) => request<void>(`/editor/templates/${pathId(templateCode)}`, {method: 'DELETE'}),
    // the template hub: browse, publish, report (./hub/api.ts)
    ...hubApi(request),
    // room invites (./invites.ts): make one for a room they're in, open one they were sent
    invites: createInvitesApi(request),
  };
}

export type EditorApi = ReturnType<typeof createEditorApi>;


// The host the editor runs in. Everything the editor needs from outside goes through here
// a new room's settings (the start screen's and Fork's): who it's for, its name, and a password room's password
export interface RoomSettings {
  mode: 'solo' | 'public' | 'password',
  name: string,
  password: string,
  // only its creator changes it
  watchOnly?: boolean,
}


// `posted`: the bot posted it in the activity's channel, `dialog`: Discord's (or the device's) own share opened
export type ShareOutcome = 'posted' | 'dialog';


// `POST /editor/activity/<id>/post`: what the bot posts for them, `posted: false` with why when it can't. `invite`: a
// room invite with a Join button (`invite_code`)
export interface ActivityPostBody {
  kind: 'render' | 'template' | 'invite',
  document_id?: string,
  template_code?: string,
  invite_code?: string,
  url?: string,
  filename?: string,
  locale?: string,
}


export interface EditorHost {
  api: EditorApi,
  // reads the host's thrown errors
  errorOf: (error: unknown) => EditorApiError | null,
  // where "edit another file" goes (web: the start screen, activity: nothing, it's one document)
  onLeave?: () => void,
  // the leave button's text, "New" when absent
  leaveLabel?: string,
  // `share`: the Activity's share-to-channel, absent on the web. `filename`: the document's file name, what it's called
  // in chat. `posted`: the bot posted it in the channel ("Post in chat"), otherwise Discord's own dialog opened
  share?: (url: string, filename: string, documentId: string) => Promise<ShareOutcome>,
  // links leaving the editor (download, premium): the Activity has to ask Discord to open them
  openExternal?: (url: string) => void,
  // the Activity's shared room, every change goes through it
  room?: EditorRoom,
  // the premium page link for the limits note
  premiumUrl: string,
  // a template's share link, always the site's (`https://notsobot.com/editor/template/<code>`), even from inside Discord
  templateUrl: (templateCode: string) => string,
  // "Share in chat": the Activity's Discord share dialog (a link that opens the Activity on the template), or the
  // device's share sheet on the web where there is one. Absent: copying the link is the only way
  // `exampleUrl`: something made with it (the current preview), shown in the bot's post
  shareTemplate?: (template: EditorTemplate, exampleUrl?: string | null) => Promise<ShareOutcome>,
  // the share goes to a Discord chat ("Share in chat", the Activity), not the device's share sheet ("Share")
  shareTemplateInChat?: boolean,
  // the editor is the whole window (the Activity), not a page under the site's navbar
  fullscreen?: boolean,
  // the Activity's Fork: this media and its steps (`document`, with the saved ones) as a new room with `settings`, or
  // their own edit for `solo`, then opens it
  fork?: (document: EditorDocument, settings: RoomSettings) => Promise<void>,
  // the template hub's page (the site's `/editor/hub`). Absent in the Activity, where the start screen shows it as a
  // panel and Try puts the template on the start screen. With a code: that template's view on it
  openHub?: (templateCode?: string) => void,
  // the Activity's group rooms: the header's Invite for this lobby (./invites.ts). Absent for solo edits and the web
  inviter?: (documentId: string) => RoomInviter,
}
