// The media editor's api shapes (notsobot.api `views/editor.py`, `utilities/tools/editor`). Shared by both hosts: the
// site's /editor page and the Discord Activity.

import type { EditorTemplateHub } from './hub/types';

export type EditorMediaKind = 'audio' | 'image' | 'video';
// the picker's tabs (the api's `EffectGroups`), in its order
export type EditorGroup = 'style' | 'distort' | 'animate' | 'text' | 'faces' | 'scenes' | 'adjust' | 'edit' | 'draw' | 'audio';
// `time`: seconds into the media as the steps before it left it (Trim, Still Frame)
// `media`: one of the document's uploaded files (`assets`) by id, an overlay's
// `steps`: effects run on an uploaded file before it's used (an overlay's, Add Audio's)
export type EditorParamKind = 'boolean' | 'choice' | 'color' | 'integer' | 'number' | 'text' | 'point' | 'box' | 'strokes' | 'time' | 'media' | 'steps';

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
  // `width`: a fraction of the media's width, shown as a percentage of it (Text's size and box)
  // `percent`: a 0-1 fraction shown as a percentage (Overlay's opacity)
  unit?: 'width' | 'percent',
  // a number setting that can be a formula on values (`{expr: 'crunch * 2'}`), the api's `formula_params`
  formula?: boolean,
  // a `media` param's: the uploaded files it takes (`sound`: anything with sound). Absent from an api before it
  accepts?: Array<EditorFileAccept>,
}

// what a `media` param can take (the api's `FILE_ACCEPTS`, 2026-11-26)
export type EditorFileAccept = 'image' | 'video' | 'audio' | 'sound';

// a file uploaded to a document for its overlays (or carried over from a template): what an overlay step's `media` is
export interface EditorAsset {
  id: string,
  url: string,
  filename: string,
  mimetype: string,
  kind: EditorMediaKind,
  width: number,
  height: number,
  framecount: number,
  duration: number,
  // has sound, what Add Audio takes
  audio?: boolean,
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
  // heavy AI: works in the editor, can't be in a template yet
  template_blocked?: boolean,
  command_id: string | null,
  // the commands page's after-preview of its command, null for a name-only tile
  thumbnail: EditorThumbnail | null,
}

// makes a document's starting media from its params (the start screen's "Make one"), not a step
export interface EditorGenerator {
  id: string,
  name: string,
  kind: EditorMediaKind,
  params: Array<EditorParam>,
  // the text's lines are separate lines on the media (neon, tombstone)
  multiline: boolean,
  command_id: string | null,
  thumbnail: EditorThumbnail | null,
  // takes a picture too (Lucia's portrait): it's uploaded as the source and starts with this effect
  portrait_effect?: string | null,
}

export interface EditorCatalogue {
  effects: Array<EditorEffect>,
  // absent from an api before them
  generators?: Array<EditorGenerator>,
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
  // a template input: param name -> the question people are asked for it when the template's used
  inputs?: Record<string, string>,
}

// one question a template asks (the api's `template_inputs`): `key` is its MediaScript name (`template ... KEY=value`)
export interface EditorTemplateInput {
  key: string,
  label: string,
  step_id: string,
  param: string,
  kind: string,
  default: unknown,
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
  // has an audio stream (absent on documents made before it was recorded)
  audio?: boolean,
  // Replace media: who picked this file and how (the file itself is the document owner's), absent on a document's
  // first source. The link it came from stays on the api
  added_by?: {at: string, user_id: string | null, via: 'upload' | 'url'},
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
  // what the render can be converted to (`render`'s `mimetype`), absent from an api before it
  render_formats?: Array<string>,
  activity_instance_id: string | null,
  guild_id: string | null,
  // a password room in the Activity
  locked?: boolean,
  // a watch-only room: only its creator (`user_id`) changes it
  watch_only?: boolean,
  // its overlays' files
  assets?: Array<EditorAsset>,
  // a room's name in the Activity (`lobby_name`), null for an unnamed one and everything else
  lobby_name?: string | null,
  is_owner: boolean,
  can_edit: boolean,
  created: number,
  updated: string,
  expires_at: string,
}

// the list (`GET /editor/documents`) doesn't say how the proxy is doing
export type EditorDocumentSummary = Omit<EditorDocument, 'proxy_status' | 'is_owner' | 'render_formats'>;

export type EditorPreviewMode = 'clip' | 'frame' | 'still';

interface EditorPreviewBase {
  preview_id?: string,
  mode?: EditorPreviewMode,
  frame?: number | null,
  // frame mode stopped before this effect, it needs playback to be seen
  stopped_at?: string | null,
  // a Trim cut the scrubbed frame away (`stopped_at` is the Trim), not a step that moves
  stopped_cut?: boolean,
  version?: number,
  // the document's small copy as the api has it now (it may have been made during this request)
  proxy?: EditorMediaInfo | null,
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
  // the caller's own launch: `surface` (./hosts/activityLaunch's `ActivityLaunchSurface`), `media_url`, `template_code`
  launch: Record<string, unknown> | null,
  // its group edits (lobbies), newest first
  lobbies: Array<EditorLobby>,
  // a NotSoBot owner: a game's header has the connection logs (./activityLog)
  owner: boolean,
  // what its language is picked from after sign-in (./activityLanguage)
  locales: EditorActivityLocales,
}

// raw locales, null when there's none (or the lookup failed). A dm's activity has no server ones
export interface EditorActivityLocales {
  // their NotSoBot setting (`/settings set locale`)
  setting: string | null,
  // the server's NotSoBot setting (`/server set locale`)
  server_setting: string | null,
  // the server's Discord `preferred_locale`
  server_discord: string | null,
}


// one group edit in an activity: a group document with up to `limit` editors. A locked one (password) shows no file
// name, steps or picture until you're in, except to its creator
export interface EditorLobby {
  id: string,
  // its creator's name for it (safety scanned), the file's name stands in without one
  name: string | null,
  filename: string | null,
  // its creator, the room list searches by them
  creator: {user_id: string, username: string, avatar_url: string | null},
  kind: EditorMediaKind | null,
  // effect ids, in order
  steps: Array<string>,
  editors: Array<{user_id: string, username: string, avatar_url: string | null, editing?: string | null}>,
  limit: number,
  locked: boolean,
  watch_only?: boolean,
  preview: EditorMediaInfo | null,
  user_id: string,
  created: number,
}


// a document's steps without its media, shared by link (`/editor/template/<code>`), applied to someone's own file
export interface EditorTemplate {
  // the link's letters (`/editor/template/<code>`): its id in base 52, Instagram style
  code: string,
  name: string,
  steps: Array<EditorStep>,
  catalogue_version: number,
  uses: number,
  // unix ms
  created: number,
  user: {id: string, username: string, avatar_url: string | null},
  is_owner: boolean,
  // password-locked: its steps are empty for anyone else until it's unlocked
  locked: boolean,
  // its overlays' files, loaded onto a document with its steps
  assets?: Array<EditorAsset>,
  // what it asks people for when it's used
  inputs?: Array<EditorTemplateInput>,
  // where it stands on the template hub (its owner's view, absent from an api before the hub)
  hub?: EditorTemplateHub,
}
