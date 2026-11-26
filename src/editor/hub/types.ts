// The template hub's api shapes (activity-plan.md "Template hub"): published editor templates anyone can browse, search
// and try. Publishing is opt-in per template and checked first (its text, drawings and a sample render)

import type { EditorGroup, EditorMediaKind, EditorTemplateInput } from '../types';


// `none`: unlisted (only its link), `review`: waiting on staff, `hidden`: taken down by staff, `rejected`: the check
// refused it (`reason` says why, to its owner)
export type HubStatus = 'none' | 'review' | 'published' | 'hidden' | 'rejected';

// the kinds a hub search filters by: a GIF is its own here, the editor calls it a video
export type HubKind = 'image' | 'gif' | 'video' | 'audio';
export const HUB_KINDS: ReadonlyArray<HubKind> = ['image', 'gif', 'video', 'audio'];

export type HubSort = 'popular' | 'new' | 'trending';
export const HUB_SORTS: ReadonlyArray<HubSort> = ['popular', 'trending', 'new'];

export type HubReportReason = 'sexual' | 'hate' | 'violence' | 'spam' | 'other';
export const HUB_REPORT_REASONS: ReadonlyArray<HubReportReason> = ['sexual', 'hate', 'violence', 'spam', 'other'];

// a published template's example: the template run on our own sample media for its kind, kept while it's published
export interface HubPreview {
  url: string,
  mimetype: string,
  width: number,
  height: number,
  file_id?: string,
}

// `EditorTemplate.hub`, its owner's view of where it stands on the hub
export interface EditorTemplateHub {
  status: HubStatus,
  description: string | null,
  // why it was rejected or hidden, only its owner sees it
  reason?: string | null,
  // unix ms
  published_at: number | null,
  preview: HubPreview | null,
  // unique people who used it
  users: number,
}

// `GET /editor/hub`'s items: a published template without its step settings
export interface HubTemplate {
  code: string,
  name: string,
  user: {id: string, username: string, avatar_url: string | null},
  // the visible steps' effect ids, in order
  effects: Array<string>,
  // how many visible steps it has
  step_count: number,
  inputs?: Array<EditorTemplateInput>,
  // every use, `users` (unique people) is what it's ranked by
  uses: number,
  // unix ms
  created: number,
  description: string | null,
  preview: HubPreview | null,
  users: number,
  // unique people in the last 7 days, `trending`'s order
  users_week: number,
  // unix ms
  published_at: number | null,
  kinds: Array<HubKind | EditorMediaKind>,
  groups: Array<EditorGroup>,
}

export interface HubQuery {
  query?: string,
  kind?: HubKind,
  group?: EditorGroup,
  asks?: boolean,
  sort?: HubSort,
  before?: string,
}

export interface HubPage {
  templates: Array<HubTemplate>,
  next: string | null,
}
