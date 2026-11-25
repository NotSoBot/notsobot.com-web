// The media editor's api shapes (notsobot.api `views/editor.py`, `utilities/tools/editor`). Shared by both hosts: the
// site's /editor page and the Discord Activity.

export type EditorMediaKind = 'audio' | 'image' | 'video';
export type EditorGroup = 'effects' | 'adjust' | 'text' | 'draw' | 'audio';
export type EditorParamKind = 'boolean' | 'choice' | 'color' | 'integer' | 'number' | 'text' | 'point' | 'box' | 'strokes';

export interface EditorParam {
  name: string,
  kind: EditorParamKind,
  default: unknown,
  minimum?: number,
  maximum?: number,
  choices?: Array<string>,
  max_length?: number,
  // null is allowed (a video's text START/END), the step then leaves it out
  optional?: boolean,
}

export interface EditorThumbnail {
  url: string,
  mimetype: string,
  width: number,
  height: number,
  duration: number,
}

export interface EditorEffect {
  id: string,
  group: EditorGroup,
  name: string,
  kinds: Array<EditorMediaKind>,
  params: Array<EditorParam>,
  // moves or changes timing: can't be shown on one frame
  temporal: boolean,
  ml: boolean,
  command_id: string | null,
  // the commands page's after-preview of its command, null for a name-only tile
  thumbnail: EditorThumbnail | null,
}

export interface EditorCatalogue {
  effects: Array<EditorEffect>,
  groups: Array<EditorGroup>,
  limits: {max_stroke_points: number, max_strokes: number, max_text_length: number},
  version: number,
}

// spatial params, all fractions (0-1) of the media at that step
export interface EditorPoint {
  x: number,
  y: number,
}

export interface EditorBox {
  x: number,
  y: number,
  width: number,
  height: number,
}

export interface EditorStroke {
  // #rrggbb or #rrggbbaa
  color: string,
  // a fraction of the media's width
  width: number,
  points: Array<[number, number]>,
}

export type EditorParamValues = Record<string, unknown>;

export interface EditorStep {
  // made by the client, letters, numbers, _ and -
  id: string,
  effect: string,
  hidden: boolean,
  params: EditorParamValues,
}

export interface EditorMediaInfo {
  url: string,
  width: number,
  height: number,
  framecount: number,
  fps: number,
  duration: number,
  mimetype: string,
}

export interface EditorSourceMeta {
  kind: EditorMediaKind,
  width: number,
  height: number,
  framecount: number,
  fps: number,
  duration: number,
  mimetype: string,
}

export interface EditorSourceFile {
  id: string,
  filename: string,
  urls: {cdn: string, vanity: string},
}

export type EditorProxyStatus = 'ready' | 'pending' | 'failed';

export interface EditorDocument {
  id: string,
  user_id: string,
  steps: Array<EditorStep>,
  version: number,
  catalogue_version: number,
  proxy: EditorMediaInfo | null,
  proxy_status: EditorProxyStatus,
  source: EditorSourceFile,
  source_meta: EditorSourceMeta,
  activity_instance_id: string | null,
  guild_id: string | null,
  is_owner: boolean,
  can_edit: boolean,
  created: number,
  updated: string,
  expires_at: string,
}

// the list (`GET /editor/documents`) doesn't say how the proxy is doing
export type EditorDocumentSummary = Omit<EditorDocument, 'proxy_status' | 'is_owner'>;

export type EditorPreviewMode = 'clip' | 'frame' | 'still';

interface EditorPreviewBase {
  preview_id?: string,
  mode?: EditorPreviewMode,
  frame?: number | null,
  // frame mode stopped before this effect, it needs playback to be seen
  stopped_at?: string | null,
  version?: number,
}

export type EditorPreview =
  | (EditorPreviewBase & EditorMediaInfo & {status: 'done', cached: boolean, unedited?: boolean})
  | (EditorPreviewBase & {status: 'pending', preview_id: string})
  | (EditorPreviewBase & {status: 'preparing'})
  | (EditorPreviewBase & {status: 'superseded' | 'expired'})
  | (EditorPreviewBase & {status: 'failed', error: string});

// `GET /jobs/<id>`, only what the render panel reads
export interface EditorJob {
  id: string,
  status: 'created' | 'queued' | 'started' | 'deferred' | 'scheduled' | 'finished' | 'failed' | 'stopped' | 'canceled',
  position: number,
  stage: string | null,
  result: {
    error: string | null,
    error_code: number | null,
    response: {
      items: Array<{
        storage?: {urls: {cdn: string, vanity: string}, filename: string} | null,
        file?: {mimetype?: string, filename?: string} | null,
      }>,
    } | null,
    took: number,
  },
}

export interface EditorActivityContext {
  instance_id: string,
  guild_id: string | null,
  channel_id: string,
  users: Array<string>,
  launch: Record<string, unknown> | null,
  // the instance's shared document, null until someone picks the media
  document_id: string | null,
}
