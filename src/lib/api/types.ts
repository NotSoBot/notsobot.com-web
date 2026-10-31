// Raw response shapes from notsobot.api (see `models/pg.py` `to_dict` methods).

export const CommandTypes = {
  PREFIXED: 0,
  APPLICATION_SLASH: 1,
  APPLICATION_MENU_USER: 2,
  APPLICATION_MENU_MESSAGE: 3,
} as const;
export type CommandType = (typeof CommandTypes)[keyof typeof CommandTypes];

// Mirrors `CommandCategories` in notsobot.ts (src/constants.ts).
export const CommandCategories = {
  AI: 'AI',
  AUDIO: 'AUDIO',
  CONVERSION: 'CONVERSION',
  EFFECTS: 'EFFECTS',
  FUN: 'FUN',
  INFO: 'INFO',
  MODERATION: 'MODERATION',
  MUSIC: 'MUSIC',
  OWNER: 'OWNER',
  PERSONAL: 'PERSONAL',
  SEARCH: 'SEARCH',
  SERVER: 'SERVER',
  TAGS: 'TAGS',
  UTILITY: 'UTILITY',
} as const;

// What the API returns until the bot re-uploads its commands with the new set above.
export const LegacyCommandCategories = {
  IMAGE: 'IMAGE',
  SAY: 'SAY',
  SETTINGS: 'SETTINGS',
  TOOLS: 'TOOLS',
  UTILS: 'UTILS',
} as const;
export type CommandCategory = (typeof CommandCategories)[keyof typeof CommandCategories];

export const ShardStatuses = {
  CLOSED: 'CLOSED',
  CONNECTING: 'CONNECTING',
  IDENTIFYING: 'IDENTIFYING',
  OPEN: 'OPEN',
  READY: 'READY',
  RESUMING: 'RESUMING',
} as const;
export type ShardStatus = (typeof ShardStatuses)[keyof typeof ShardStatuses];


export interface ApiErrorBody {
  code: number,
  message: string,
  status: number,
  [key: string]: unknown,
}


export const CommandMediaTypes = {
  AFTER: 0,
  BEFORE: 1,
} as const;

// a command's preview (made by the api from the bot's `PREVIEW`): the inputs are `BEFORE` in `position` order, the
// result is the one `AFTER`. width/height are 0 for audio, duration is 0 for still images
export interface CommandMedia {
  duration: number,
  height: number,
  mimetype: string,
  position: number,
  type: (typeof CommandMediaTypes)[keyof typeof CommandMediaTypes],
  url: string,
  width: number,
}

export interface Command {
  enabled: boolean,
  id: string,
  media: Array<CommandMedia>,
  metadata: Array<CommandMetadata>,
  // what the preview shows, as typed without the prefix (`caption when the bot works`)
  preview_example: string | null,
}

export interface CommandArgChoice {
  // readable label, empty when the value is readable enough
  description: string,
  value: string,
}

export interface CommandArg {
  aliases: Array<string>,
  // missing on commands uploaded before choices were sent
  choices?: Array<CommandArgChoice>,
  description: string,
  name: string,
  // empty for slash command options
  prefix: string,
  // slash command options only (prefixed args are all optional), missing on commands uploaded before it was sent
  required?: boolean | null,
}

export interface CommandMetadata {
  aliases: Array<string>,
  args: Array<CommandArg>,
  category: CommandCategory | string,
  // who made the command (or the program behind it). missing from commands uploaded before it existed
  credits?: Array<{id?: string, name: string, url?: string}>,
  // the english `name`, which `</name:id>` mentions need when `name` is translated. missing from older api versions
  default_name?: string,
  description: string | null,
  dmable: boolean,
  enabled: boolean,
  examples: Array<string>,
  // the discord application command's id, slash/context menu commands only (a subcommand has its top-level
  // command's), for mentioning it as `</name:id>`. missing from commands uploaded before it existed
  external_id?: string | null,
  // translated into the requested language for slash/context menu commands (what discord shows in that language)
  name: string,
  // who can use it, null/missing for everyone (commands uploaded before it existed have none)
  premium?: CommandPremium | null,
  ratelimits: Array<{duration: number, key: string | null, limit: number, type: string}>,
  type: CommandType,
  usage: string,
}

// `premium_server`: NotSoPremium, or a Premium Server (or one bot staff gave access)
export type CommandPremium = 'premium' | 'premium_plus' | 'premium_server';


// `GET /commands/stats`: usage per (command id, command type), optionally since a timestamp
export interface CommandStat {
  count: number,
  id: string,
  name: string,
  since: number,
  type: CommandType,
}


export interface InfoDiscord {
  clusters: Array<InfoDiscordCluster>,
  shard_count: number,
  shards_per_cluster: number,
}

export interface InfoDiscordCluster {
  cluster_id: number,
  last_refresh: string,
  ram_usage: number,
  shards: Array<InfoDiscordShard>,
}

export interface InfoDiscordShard {
  cluster_id: number,
  counts: {
    applications: number,
    channel_threads: number,
    channels: number,
    emojis: number,
    events: number,
    guild_scheduled_events: number,
    guilds: number,
    member_count: number,
    members: number,
    messages: number,
    permission_overwrites: number,
    presence_activities: number,
    presences: number,
    roles: number,
    stage_instances: number,
    typings: number,
    users: number,
    voice_states: number,
  },
  shard_id: number,
  status: ShardStatus,
}


// `GET /info/voice`: the music nodes for the status page, enabled ones and disabled ones still draining players
export interface InfoVoice {
  nodes: Array<InfoVoiceNode>,
}

export interface InfoVoiceNode {
  enabled: boolean,
  id: string,
  // milliseconds, the api asking it
  latency: number | null,
  name: string,
  // null when the api couldn't reach it
  stats: {
    // load average over its cores, 1 is fully busy
    cpu: number,
    // players decoding for live effects
    effects: number,
    // bytes (rss)
    memory: number,
    paused: number,
    players: number,
    playing: number,
    // milliseconds
    uptime: number,
    version: string,
  } | null,
}

export interface User {
  avatar: string | null,
  blocked: boolean,
  blocked_on: string | null,
  blocked_reason: string | null,
  // a timed block's end, null when it's permanent (or they aren't blocked)
  blocked_until: string | null,
  bot: boolean,
  discriminator: string,
  flags: number,
  id: string,
  username: string,
}

export interface UserMe extends User {
  // discord profile banner color as an rgb int, null when they have none (or haven't logged in since it was added)
  accent_color: number | null,
  channel_id: string | null,
  premium_type: number,
}

export interface UserSession {
  id: string,
  user_agent: string,
}


// `TagDirectorySortByFilters`; everything but NEWEST pages by `offset`
export const TagDirectorySortByFilters = {
  NEWEST: 0,
  OLDEST: 1,
  VERIFIED: 2,
  USES: 3,
  NAME: 4,
  SERVERS: 5,
  // uses in the last 7/30/365 days, items then carry `recent_uses`
  USES_WEEK: 6,
  USES_MONTH: 7,
  USES_YEAR: 8,
} as const;

export type TagDirectorySortBy = typeof TagDirectorySortByFilters[keyof typeof TagDirectorySortByFilters];

export interface TagDirectoryFilters {
  query: string,
  category: TagDirectoryCategory | null,
  sortBy: TagDirectorySortBy,
  verified: number | null,
  nsfw: boolean | null,
}

// `TagDirectoryCategories`, a listing has exactly one (`OTHER` by default)
export const TagDirectoryCategories = {
  OTHER: 0,
  AI: 1,
  CLIPS: 2,
  FILTERS: 3,
  GAMES: 4,
  MEMES: 5,
  UTILITY: 6,
  LOGO_EDITING: 7,
} as const;

export type TagDirectoryCategory = typeof TagDirectoryCategories[keyof typeof TagDirectoryCategories];

const TAG_DIRECTORY_CATEGORY_VALUES: ReadonlySet<number> = new Set(Object.values(TagDirectoryCategories));

// a category the frontend doesn't know (retired, or added to the api first) is treated as `OTHER`
export function toTagDirectoryCategory(value: unknown): TagDirectoryCategory {
  return (typeof value === 'number' && TAG_DIRECTORY_CATEGORY_VALUES.has(value)) ? value as TagDirectoryCategory : TagDirectoryCategories.OTHER;
}

export const TagDirectoryVerificationStates = {
  NOT_VERIFIED: 0,
  PENDING_VERIFICATION: 1,
  VERIFIED: 2,
} as const;

export interface TagDirectoryAsset {
  filename: string,
  filename_base: string,
  id: string,
  metadata: {
    duration: number,
    extension: string,
    framecount: number,
    height: number,
    mimetype: string,
    size: number,
    width: number,
  },
  position: number,
  // where the file came from, only on the admin routes (`asset_provenance_dict`). Every field is null on files from
  // before it was recorded
  provenance?: AssetProvenance,
  urls: {cdn: string},
}

export interface AssetProvenance {
  created: ApiTimestamp | null,
  // `TagAssets` only: the asset an edit in the dashboard saved this one over
  replaces_id?: string | null,
  // `TagAssets` only: the tag's owner, when they asked staff to archive it
  requested_by?: string | null,
  sha256: string | null,
  // null for uploads, the url it was downloaded from otherwise
  source_url: string | null,
  uploaded_by: string | null,
}

// `TagAssets.to_dict()`, same shape as a directory listing's assets
export type TagAsset = TagDirectoryAsset & {
  // text, json, code, etc, which staff can edit (missing from an api older than the field)
  is_text?: boolean,
};

// the listing's own thumbnail for the directory card, always a small png (videos give their first frame)
export interface TagDirectoryThumbnail {
  id: string,
  urls: {cdn: string},
}

// `TagDirectoryEditRequestStatuses`: a verified listing's change request, drafted by the owner and reviewed by staff
export const TagDirectoryEditRequestStatuses = {
  DRAFT: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;

// `TagDirectoryEditRequestThumbnailModes`, what the request does to the listing's thumbnail
export const TagDirectoryEditRequestThumbnailModes = {
  KEEP: 0,
  REPLACE: 1,
  REMOVE: 2,
} as const;

export interface TagDirectoryEditRequestAsset extends TagDirectoryAsset {
  // uploaded with the request, the others are the listing's own (kept, maybe moved)
  is_new: boolean,
}

// `TagDirectoryEditRequest.to_dict()`
export interface TagDirectoryEditRequest {
  // the media the listing would have, in order, the first is the cover
  assets: Array<TagDirectoryEditRequestAsset>,
  // the proposed tag content, null leaves it unchanged
  content: string | null,
  created: string,
  edited: string | null,
  id: string,
  note: string,
  // staff's, when rejected
  reason: string | null,
  reviewed: string | null,
  status: number,
  submitted: string | null,
  // the uploaded replacement, only when `thumbnail_mode` is REPLACE
  thumbnail: TagDirectoryThumbnail | null,
  thumbnail_mode: number,
}

// `Tag.to_dict(directory_view=True)` — content/guild_id are always blanked out
export interface DirectoryTag {
  assets: Array<unknown>,
  content: string,
  created: string,
  edited: string | null,
  guild_id: string | null,
  id: string,
  is_command: boolean,
  is_on_directory: boolean,
  last_used: string | null,
  locked: boolean,
  name: string,
  nsfw: boolean,
  reference_tag: DirectoryTag | null,
  scanned: number,
  server_id: string | null,
  user: User,
  uses: number,
}

export interface TagDirectoryItem {
  // in order, the first is the cover. Public responses only have them once the listing is verified,
  // the owner's (`/users/@me/tags/:id/directory`) and staff's have them at every stage
  assets: Array<TagDirectoryAsset>,
  category: TagDirectoryCategory,
  // the owner shows `tag.content` publicly, it's '' otherwise
  content_public: boolean,
  created: string,
  description: string,
  edited: string | null,
  id: string,
  server_count: number,
  tag: DirectoryTag,
  // shown on the directory card instead of the cover, same visibility as `assets`
  thumbnail: TagDirectoryThumbnail | null,
  // the owner's (`/users/@me/tags/:id/directory`): the open change request, otherwise the last one
  edit_request?: TagDirectoryEditRequest | null,
  // the tag's uses in the window when sorted by recent uses (`USES_WEEK` and so on)
  recent_uses?: number,
  title: string,
  verified: number,
}

// `GET /users/@me/tags/:id/servers` (owner): how widely the tag has been added, counts only, which servers is staff only
export interface TagServerCounts {
  // every alias of the tag, a server can have it under more than one name
  alias_count: number,
  // servers, DMs and personal tags alike, the same as the listing's
  server_count: number,
}

// `GET /admin/tags/:id/servers` (staff): where the tag has been added
export interface TagServer {
  // when the server first added the tag
  added: string,
  icon: string | null,
  id: string,
  name: string,
  // what the tag is called there, usually just one
  names: Array<string>,
}

export interface TagServers extends TagServerCounts {
  // DMs, personal tags and servers NotSoBot has no record of, only counted
  other_count: number,
  servers: Array<TagServer>,
  // more servers than the API lists (it caps the list, newest first)
  truncated: boolean,
}

export interface TagDirectoryPage {
  count: number,
  items: Array<TagDirectoryItem>,
}


// --- Dashboard (`/users/@me/...`, see docs/dashboard-api.md) ---

// notsobot.api `ApiErrorCodes` the dashboard reacts to
export const ApiErrorCodes = {
  UNKNOWN_APPLICATION: 10001,
  UNKNOWN_JOB: 10006,
  UNKNOWN_TAG: 10009,
  UNKNOWN_TAG_DIRECTORY_ITEM: 10011,
  UNKNOWN_CONTENT_FLAG: 10016,
  UNKNOWN_TAG_ASSET: 10019,
  UNKNOWN_TAG_DIRECTORY_ASSET: 10020,
  UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST: 10021,
  UNKNOWN_GUILD_LIST_ITEM: 10022,
  UNKNOWN_LLM_MEMORY: 10023,
  UNKNOWN_PREMIUM_SERVER: 10025,
  UNKNOWN_IDENTITY: 10027,
  UNKNOWN_SERVER: 10012,
  UNKNOWN_REPORT: 10017,
  UNKNOWN_REMINDER: 10007,
  UNKNOWN_FILE: 10002,
  UNKNOWN_VOICE: 10003,
  UNKNOWN_VOICE_CLIP: 10028,
  MAX_VOICE_CLIPS: 30026,
  UNKNOWN_GUILD_LLM_KNOWLEDGE: 10029,
  MAX_GUILD_LLM_KNOWLEDGE: 30027,
  UNKNOWN_VOICE_NODE: 10031,
  UNKNOWN_MUSIC_QUEUE_ITEM: 10030,
  UNKNOWN_MUSIC_SESSION: 10032,
  UNKNOWN_GUILD_WARNING: 10033,
  UNKNOWN_GUILD_REPORT: 10034,
  MAX_GUILD_WARNINGS: 30029,
  // queuing an album or playlist link needs a premium server
  MUSIC_PREMIUM_REQUIRED: 50048,
  // a voice can't lose its last audio clip, it's deleted with the bot instead
  VOICE_CLIP_LAST: 50042,
  // a voice cloned before its audio was kept can't be moved to another cloning service
  VOICE_HAS_NO_CLIPS: 50043,
  MISSING_ACCESS: 20004,
  PREMIUM_REQUIRED: 20005,
  MAX_APPLICATIONS: 30001,
  TEXT_BLOCKED_GUIDELINES: 40030,
  INVALID_FILE_TYPE: 40001,
  FILE_TOO_LARGE: 40004,
  UNSUPPORTED_UPLOAD_TYPE: 40005,
  SAFETY_SCAN_FAILED: 60004,
  INVALID_FORM_BODY: 50001,
  TAG_LOCKED: 50011,
  TAG_NAME_TAKEN: 50015,
  TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS: 50016,
  TAG_DIRECTORY_PENDING_VERIFICATION: 50017,
  TAG_DIRECTORY_NAME_TAKEN: 50018,
  TAG_DIRECTORY_ALREADY_PENDING: 50019,
  TAG_DIRECTORY_ALREADY_VERIFIED: 50020,
  TAG_DIRECTORY_ALREADY_UNVERIFIED: 50021,
  TAG_DIRECTORY_CANNOT_UNVERIFY_VERIFIED: 50022,
  TAG_DIRECTORY_VERIFICATION_REQUIRES_DESCRIPTION: 50032,
  TAG_DIRECTORY_VERIFICATION_REQUIRES_CATEGORY: 50033,
  TAG_DIRECTORY_ASSETS_REQUIRE_PENDING: 50034,
  TAG_DIRECTORY_EDIT_REQUEST_REQUIRES_VERIFIED: 50035,
  TAG_DIRECTORY_EDIT_REQUEST_NOT_DRAFT: 50036,
  TAG_DIRECTORY_EDIT_REQUEST_NOT_PENDING: 50037,
  TAG_DIRECTORY_EDIT_REQUEST_NO_CHANGES: 50038,
  MAX_TAG_DIRECTORY: 30013,
  MAX_TAG_DIRECTORY_ASSETS: 30018,
  // reports sent, per hour and per day (`metadata.scope`), the bot's and the tag directory's together
  MAX_REPORTS: 30015,
  // the reporter's replies on their reports, per hour
  MAX_REPORT_MESSAGES: 30019,
  // reporting your own tag from the tag directory
  CANNOT_REPORT_YOURSELF: 50040,
  // the turnstile token on an anonymous report was used, expired or failed
  CAPTCHA_INVALID: 50041,
  // e.g. anonymous reports without the api's turnstile secret
  SERVER_MISCONFIGURED: 90001,
  MAX_LLM_MEMORIES: 30020,
  MAX_PREMIUM_SERVERS: 30022,
  // a server can't have a premium server slot taken off until a while after it got it (`removable_at` in the body)
  PREMIUM_SERVER_COOLDOWN: 30023,
  // the session's Discord grant was revoked/expired (not the site session itself)
  DISCORD_OAUTH_ERROR: 60001,
  DISCORD_OAUTH_SCOPE_MISMATCH: 60002,
  DISCORD_FETCH_FAILED: 60003,
  EXTERNAL_SERVICE_TIMEOUT: 60008,
  DISCORD_RATELIMITED: 60011,
  // our own rate limits (`app_limiter`), e.g. one listing upload per 2 seconds
  RATELIMITED: 30016,
  DISCORD_API_ERROR: 60012,
} as const;


export const UserPremiumTypes = {
  NONE: 0,
  PREMIUM_FREE: 1,
  PREMIUM: 2,
  PREMIUM_PLUS: 3,
  PREMIUM_PLUS_AI: 4,
} as const;


// `DiscordSkus`, the store sku for each tier
export const DiscordSkus = {
  USER_NOTSOPREMIUM: '1182569865735831582',
  USER_NOTSOPREMIUM_PLUS: '1318864356179710044',
  USER_NOTSOPREMIUM_PLUS_AI: '1492322196146618429',
} as const;


// `UserSettings.to_dict()`
export interface UserSettings {
  application_command_response_type: number,
  // the servers pinned to the top of the Servers page, in the order they were pinned (the dashboard's own, up to 100)
  dashboard_pinned_guilds: Array<string>,
  download_quality: string | null,
  fallbacks_media_image: number,
  file_upload_name: string | null,
  file_upload_threshold: number,
  file_upload_type: number,
  file_upload_vanity: string | null,
  locale: string | null,
  ml_diffusion_model: string | null,
  // NotSoAI doesn't see or save memories when this is on
  ml_llm_memory_disabled: boolean,
  ml_llm_model: string | null,
  ml_llm_personality: string | null,
  response_display: number | null,
  // `UserSettingsSearchProviders`, null follows the server's setting
  search_provider_images: number | null,
  search_provider_web: number | null,
  timezone: string | null,
  tts_voice: string | null,
  units: string | null,
}

// `file_upload_name` is read-only
export type UserSettingsPatch = Partial<Omit<UserSettings, 'file_upload_name'>>;


// `Tag.to_dict()` (with content)
export interface Tag {
  assets: Array<unknown>,
  content: string,
  created: string,
  edited: string | null,
  guild_id: string | null,
  id: string,
  is_command: boolean,
  is_on_directory: boolean,
  last_used: string | null,
  locked: boolean,
  name: string,
  nsfw: boolean,
  reference_tag: Tag | null,
  scanned: number,
  server_id: string | null,
  user: User,
  uses: number,
  // only on `GET /users/@me/tags` items: the tag's directory listing, if it has one
  directory?: {title: string, verified: number} | null,
  // only on `GET /users/@me/tags` items sorted by recent uses (`uses_week` and so on): its uses in that window
  recent_uses?: number,
}

export interface TagsPage {
  count: number,
  items: Array<Tag>,
}

// `uses_<period>`: uses in the last 7/30/365 days
export type MeTagsSortBy = 'newest' | 'oldest' | 'uses' | 'uses_week' | 'uses_month' | 'uses_year' | 'name' | 'last_used';

// `listed`: only tags listed on the tag directory (`verified` narrows it to one `TagDirectoryVerificationStates`), false: only the rest
export type MeTagsDirectoryFilter = {listed: true, verified: number | null} | {listed: false} | null;

export interface TagPatch {
  name?: string,
  content?: string,
  nsfw?: boolean,
}


// `VoiceCloneTypes`: where the cloned voice lives
export const VoiceCloneTypes = {
  ELEVENLABS: 0,
  FISH_AUDIO: 1,
} as const;

// a reminder made with the bot's `reminder` commands, read-only on the dashboard
export interface Reminder {
  // the channel it gets sent in, null when it goes to the user's dms
  channel_id: string | null,
  content: string,
  guild_id: string | null,
  id: string,
  is_all_day: boolean,
  // the message that created it (for the jump link), null when it wasn't made from a message
  message_id: string | null,
  // the number the bot's `reminder delete <position>` uses
  position: number,
  timestamp_end: string | null,
  timestamp_start: string,
}

export interface RemindersPage {
  count: number,
  items: Array<Reminder>,
}

// who made a server's tag or reminder, on the moderator routes (no NotSoBot block status, that's staff only)
export type GuildContentUser = Pick<User, 'avatar' | 'bot' | 'discriminator' | 'id' | 'username'>;

// `GET /users/@me/guilds/<id>/tags`, any member. Removing one needs `editable.tags`
export interface GuildTag extends Omit<Tag, 'user' | 'reference_tag'> {
  user: GuildContentUser,
  reference_tag: (Omit<Tag, 'user' | 'reference_tag'> & {user: GuildContentUser, reference_tag: null}) | null,
}

export interface GuildTagsPage {
  count: number,
  items: Array<GuildTag>,
}

// `GET /users/@me/guilds/<id>/reminders`, needs `editable.reminders` (Manage Messages)
export interface GuildReminder extends Reminder {
  user: GuildContentUser,
}

export interface GuildRemindersPage {
  count: number,
  items: Array<GuildReminder>,
}

// `next`/`last` by when it goes off, `newest`/`oldest` by when it was made
export type GuildReminderSort = 'next' | 'last' | 'newest' | 'oldest';
// goes off within that long from now
export type GuildReminderWithin = 'day' | 'week' | 'month';

// `content` max 512; `move_to_dms` moves a server reminder to the owner's dms (it can't be moved back from here)
export interface ReminderPatch {
  content?: string,
  move_to_dms?: boolean,
}

// something NotSoAI remembers about the user, it saves these when asked to (`{ai.memory.add}`)
export interface LLMMemory {
  content: string,
  created: string,
  // the server it's only used in, null when it's used everywhere
  guild: {icon: string | null, id: string, name: string | null} | null,
  guild_id: string | null,
  id: string,
}

export interface LLMMemoriesPage {
  items: Array<LLMMemory>,
  // how many global memories the user can have, and how many more for each server
  limits: {global: number, server: number},
}

// `content` max 200
export interface LLMMemoryPatch {
  content: string,
}

// something a server's admins told NotSoAI about it, in every NotSoAI prompt there
export interface GuildLLMKnowledge {
  content: string,
  created: string,
  guild_id: string,
  id: string,
  // who added it, or last edited it
  user_id: string,
}

// `warn` in the bot, a note on a member's record in a server
export interface GuildWarning {
  created: string,
  guild_id: string,
  id: string,
  moderator_id: string,
  reason: string | null,
  user_id: string,
  // how many warnings it counts as (an auto-warn rule's `warnings`), 1 otherwise
  weight: number,
}

// newest first; `count`/`active` are for every warning that matched, not only this page, adding up their `weight`s, and
// `total` is how many of them there are (for the pages)
export interface GuildWarningsPage {
  active: number,
  count: number,
  total: number,
  // the warned members and moderators on this page NotSoBot has seen, anyone else is just their id
  users: Record<string, GuildContentUser>,
  warnings: Array<GuildWarning>,
  // the server's `warnings_window`, older ones aren't active
  window: number,
}

// a member's `report` (or "Report to Mods") to the server's moderators, not NotSoBot's own `Report`s. `status` is the
// same `ReportStatuses`
export const GuildReportTypes = {
  USER: 0,
  MESSAGE: 1,
} as const;

export interface GuildReport {
  // message reports only, where it was and its text when it was reported (`null` when it had none)
  channel_id: string | null,
  created: string,
  guild_id: string,
  // who resolved or dismissed it and when, `null` while it's open
  handled_at: string | null,
  handled_by: string | null,
  id: string,
  message_content: string | null,
  // the text was cleared 30 days after the report, not a message that never had any
  message_content_deleted: boolean,
  // when the text (and image) gets cleared, while there's still something to clear
  message_content_expires_at: string | null,
  message_id: string | null,
  // an image of the reported message drawn like `quote` (its images, embed and author too) is kept, from
  // `REPORT_QUOTE`. Drawn without any images when the safety scan flagged it; cleared with the text
  message_quote: boolean,
  reason: string,
  status: ReportStatus,
  // the reporter turned off the bot's DMs about it (the moderators' replies and status changes), they only see those on
  // their dashboard
  reporter_muted: boolean,
  // the reported member, or the reported message's author
  target_id: string,
  // member reports only, an image of the reported member as they looked (avatar, name, username) is kept, from
  // `REPORT_MEMBER`. Same rules and lifetime as `message_quote`
  target_quote: boolean,
  type: number,
  // the reporter
  user_id: string,
  // replies between the reporter and the moderators (not status changes), and who sent the last one
  last_reply: {author: GuildReportMessageAuthor, created: ApiTimestamp} | null,
  replies: number,
}

// a report's kept images: the reported message (`message_quote`) and the reported member (`target_quote`)
export type GuildReportImageKind = 'member' | 'message';

// the moderators are only ever "the moderators" to the reporter, the bot DMs them the moderators' side
export type GuildReportMessageAuthor = 'moderator' | 'reporter';

// one entry in a member's report's conversation with the moderators: a reply (`content`) or a status change (`status`).
// From the bot's Respond buttons (the reports logger's for moderators, the reporter's DMs) or the dashboard
export interface GuildReportMessage {
  author: GuildReportMessageAuthor,
  // which moderator (or the reporter) it was
  author_id: string,
  content: string | null,
  created: ApiTimestamp,
  id: string,
  status: ReportStatus | null,
}

export interface GuildReportMessagesPage {
  items: Array<GuildReportMessage>,
}

// a report the user sent to a server's moderators, as they see it on their own Reports page: never which moderator handled
// it (they're only ever "the moderators"), with the server it's in (`null` once NotSoBot forgot it)
export type SentGuildReport = Omit<GuildReport, 'handled_by'> & {
  guild: {icon: string | null, id: string, name: string} | null,
};

export interface SentGuildReportsPage {
  count: number,
  items: Array<SentGuildReport>,
}

// newest first; `count` is every report that matched, not only this page. `users` are the reporters, reported members and
// moderators who handled them by id, only the ones NotSoBot has seen
// one report (`GET .../reports/<id>`), for links to it from the bot's logger messages
export interface GuildReportItem {
  report: GuildReport,
  users: Record<string, GuildContentUser>,
}

export interface GuildReportsPage {
  count: number,
  reports: Array<GuildReport>,
  users: Record<string, GuildContentUser>,
}

export interface GuildLLMKnowledgePage {
  items: Array<GuildLLMKnowledge>,
  // how many a server can have, and how many characters all of them can add up to
  limits: {amount: number, total_length: number},
}

export type GuildMusicLoop = 'off' | 'track' | 'queue';

// something queued in a server's music queue (the playing item is position 0)
export interface GuildMusicQueueItem {
  // the album/playlist it was queued with, its songs share it (each time it's queued). The name is only shown, two can
  // have the same one
  batch_id: string | null,
  batch_name: string | null,
  // when it was queued (unix milliseconds)
  created: number,
  guild_id: string,
  id: string,
  // 1 is next
  position: number,
  // `opus` for a song found by a search or a service link, `url` for a link (converted when it's next)
  source: 'opus' | 'url',
  status: 'converting' | 'playing' | 'queued' | 'ready',
  // a link has none until it's converted
  track: null | {
    album: string | null,
    artist: string | null,
    // milliseconds
    duration: number,
    isrc: string | null,
    thumbnail: string | null,
    title: string,
    url: string | null,
  },
  // where it's from (a song's service page, can be empty)
  url: string,
  // who queued it
  user_id: string,
}

// how far back a server's music stats count (the last 7, 30 or 365 days, or since they started) and what the top lists
// rank by
export type GuildMusicStatsPeriod = 'week' | 'month' | 'year' | 'all';
export type GuildMusicStatsSort = 'plays' | 'time';

// `plays` counts a queued song once (it finished, or played 30 seconds before a skip). A loop playing it again is a
// repeat (counted the same way), early skips only add `played_ms`
export interface GuildMusicStatsCounts {
  played_ms: number,
  plays: number,
  // 0 for loops from before repeats were recorded
  repeats: number,
}

// what a server's music played over a period: totals, then the top songs, members (by what they queued) and artists
export interface GuildMusicStats {
  artists: Array<GuildMusicStatsCounts & {name: string}>,
  period: GuildMusicStatsPeriod,
  sort: GuildMusicStatsSort,
  totals: GuildMusicStatsCounts & {
    // the oldest play in the period (unix milliseconds), null with none
    first_played: null | number,
    tracks: number,
    users: number,
  },
  // each song as it last played, like a queue item's (`track.url` is always null)
  tracks: Array<GuildMusicStatsCounts & Pick<GuildMusicQueueItem, 'source' | 'track' | 'url'>>,
  // null for someone NotSoBot hasn't seen
  users: Array<GuildMusicStatsCounts & {user: GuildContentUser | null, user_id: string}>,
}

// what's playing in a server and what's queued. `session` is the bot being in a voice channel for it, null otherwise
export interface GuildMusic {
  // seconds the end of a song fades into the next (0 off, up to 12), only with `premium` (kept without it)
  crossfade: number,
  current: GuildMusicQueueItem | null,
  // DJ mode (on by default): controlling the music in Discord needs Manage Server or the DJ role, with no votes;
  // anyone can still add songs
  dj_only: boolean,
  // the role that makes people DJs, null for roles with "NotSoMusic" in their name
  dj_role_id: null | string,
  // the queue takes turns between who queued (everyone's first song, then everyone's second...), a server setting
  fair_queue: boolean,
  // paused too long, the bot left: `current` carries on from here (milliseconds) with the next `music play`
  held_position: null | number,
  // goes back to off when the bot leaves or the queue runs out
  loop: GuildMusicLoop,
  // the longest song that can be queued (seconds), null for no limit
  max_duration: null | number,
  // a song can't be queued while it's queued or playing already
  no_duplicates: boolean,
  // with 24/7: paused while nobody else is in the voice channel, it carries on when someone's back (off by default)
  pause_alone: boolean,
  // a premium server slot or `MUSIC_ACCESS`: 24/7 and the bigger `queue_limit`
  premium: boolean,
  queue: Array<GuildMusicQueueItem>,
  // how many songs the queue holds (100, 1,000 with premium)
  queue_limit: number,
  // the server's saved effects, speed (`tempo`) and volume, what the bot's next session starts with (with `premium`)
  // until someone changes them. A playing `session` has its own (the same, once the bot's caught up)
  sound: {
    effects: Array<string>,
    // percent of the song's tempo, its pitch kept (100 is normal, 50 to 200)
    tempo: number,
    // percent (100 is normal, up to 200)
    volume: number,
  },
  session: null | {
    channel_id: string,
    // the stacked live effects in order (the bot's `MusicEffects` values), up to 5, the same one more than once too. They
    // stay on for the next songs until they're taken off or the bot leaves
    effects: Array<string>,
    // the track would have ended by now
    finished: boolean,
    guild_id: string,
    node_id: string | null,
    paused: boolean,
    // milliseconds into the track (its own time), when it was fetched
    position: number,
    // how fast it plays with the effects and `tempo` together (1 for neither), `position` moves on at it and a song
    // takes `duration / speed` to hear
    speed: number,
    // 24/7, it stays when the queue runs out
    stay: boolean,
    // `music speed`, percent of the song's own tempo with its pitch kept (100 is normal, 50 to 200)
    tempo: number,
    // the node's volume, percent (100 is the file as it is, up to 200)
    volume: number,
  },
  // 24/7 (on by default): the bot stays in voice when the queue runs out or it's paused. Only does anything with
  // `premium`, kept for when it comes back
  stay: boolean,
  // without DJ mode, skipping/pausing/resuming someone else's song in Discord is a vote (half of who's listening)
  vote_pause: boolean,
  vote_resume: boolean,
  vote_skip: boolean,
}

// what PATCH changes, the ones given. `max_duration` 0 clears it
export interface GuildMusicSettings {
  crossfade?: number,
  dj_only?: boolean,
  // null clears it
  dj_role_id?: null | string,
  fair_queue?: boolean,
  loop?: GuildMusicLoop,
  max_duration?: number,
  no_duplicates?: boolean,
  pause_alone?: boolean,
  stay?: boolean,
  vote_pause?: boolean,
  vote_resume?: boolean,
  vote_skip?: boolean,
}

export type GuildMusicControl = 'leave' | 'pause' | 'resume' | 'skip';

// the live effects, done by the bot like the other controls. Adding needs `premium`, what doesn't stack is left out
export type GuildMusicEffectControl =
  | {action: 'effect_add', effect: string}
  // the one at `index` when it's still `effect` there, otherwise the last of it
  | {action: 'effect_remove', effect: string, index: number}
  | {action: 'effect_clear'};

// the speed (tempo, 50 to 200) and volume (0 to 200), percent. The server keeps them for the next session too, so they
// change with nothing playing. Anything but 100 needs `premium`
export type GuildMusicSoundControl = {action: 'speed' | 'volume', value: number};

// a music node (notsobot.voice), owners only. Its password (the node's `VOICE_PASSWORD`) only comes back when it's made,
// reset or revealed
export interface VoiceNode {
  created: ApiTimestamp,
  enabled: boolean,
  id: string,
  name: string,
  // `http://host:2333`
  url: string,
}

export interface VoiceNodeWithPassword extends VoiceNode {
  password: string,
}

export interface VoiceNodeCreate {
  enabled?: boolean,
  name: string,
  // a random one without it
  password?: string,
  url: string,
}

export type VoiceNodeEdit = Partial<VoiceNodeCreate>;

// a node's live counts (its `GET /stats`), asked for by the api
export interface VoiceNodeStats {
  cpu: {cores: number, load: number},
  // bytes
  memory: {heap: number, rss: number, system_free: number, system_total: number},
  // paused ones, the node has the bot leave after a while (`VOICE_PAUSE_TIMEOUT`)
  paused: number,
  players: number,
  // players sending audio (not paused or waiting)
  playing: number,
  sessions: number,
  // milliseconds
  uptime: number,
  version: string,
  workers: Array<{paused: number, players: number, playing: number}>,
}

export interface VoiceNodeStatsItem {
  // why it couldn't be asked (down, a wrong password, an untrusted certificate)
  error: string | null,
  id: string,
  latency: number | null,
  stats: VoiceNodeStats | null,
}

// the api asking the node for its `/stats` with its password, the version is its package.json one
export interface VoiceNodeTest {
  // why it isn't ok (unreachable, a wrong password, an untrusted certificate)
  error: string | null,
  // milliseconds, when it answered at all
  latency: number | null,
  ok: boolean,
  version: string | null,
}

// `ApplicationFlags` bits on `Application.flags`
export const ApplicationFlags = {
  // the bot's own application, only changed in the database
  NOTSOBOT: 1 << 0,
  // staff turned it off, its token doesn't work (it doesn't either while the owner has no API access)
  DISABLED: 1 << 1,
  // notsobot.voice, the music node: gets the next track of a server's music queue, only changed in the database
  NOTSOMUSIC: 1 << 2,
} as const;

// an API application, for calling notsobot.api with `Authorization: Bot <token>`
export interface Application {
  created: ApiTimestamp,
  flags: number,
  id: string,
  name: string,
  owner_id: string,
}

// creating one, revealing its token or resetting it answers with the token
export interface ApplicationWithToken extends Application {
  token: string,
}

export interface ApplicationsPage {
  // whether the caller has API access (`UserFlags.API_ACCESS`, owners always do)
  can_create: boolean,
  count: number,
  items: Array<Application>,
  // most applications one user can have
  limit: number,
}

// a voice cloned with the bot's `tts voice create` command
export interface Voice {
  created: ApiTimestamp,
  id: string,
  name: string,
  platform_type: number,
}

// the audio a voice was cloned from, kept by the api so the voice can be moved to another cloning service
export interface VoiceClip {
  created: ApiTimestamp,
  // ms, only the first minute of an upload is kept
  duration: number,
  id: string,
  // what it was uploaded as
  name: string,
  size: number,
}

// `/users/@me/voices` voices come with their clips, oldest first (voices cloned before clips were kept can have none)
export interface MeVoice extends Voice {
  clips: Array<VoiceClip>,
}

export interface VoicesPage {
  count: number,
  items: Array<MeVoice>,
}

// only the name can be changed from the dashboard (max 128)
export interface VoicePatch {
  name: string,
}

// `VoiceCloneTypes`, the service it gets cloned on again from its clips
export interface VoiceTransfer {
  platform_type: number,
}


// a file the bot uploaded to the file host (nsb.gg) for the user, `File.to_dict()` without the owner
export interface UserFile {
  created: ApiTimestamp,
  // set on temporary uploads, which stop working (and get cleaned up) after it
  expires_at: string | null,
  // with the extension, `filename_base` is without it
  filename: string,
  filename_base: string,
  id: string,
  metadata: {
    // ms, 0 for images and other files
    duration: number,
    extension: string,
    framecount: number,
    height: number,
    mimetype: string,
    size: number,
    width: number,
  },
  temporary: boolean,
  urls: {
    cdn: string,
    vanity: string,
  },
  vanity: string,
}

export interface UserFilesPage {
  // what the search matched (everything without one)
  count: number,
  items: Array<UserFile>,
  size: number,
  // every file the user has, whatever the search
  total: {count: number, size: number},
}

export type UserFilesSortBy = 'newest' | 'oldest' | 'largest' | 'name';


// `TagVariableStorageTypes` / `TagBlobStorageTypes` (same values)
export const TagStorageTypes = {
  USER: 0,
  CHANNEL: 1,
  GUILD: 2,
  GLOBAL: 3,
} as const;
export type TagStorageType = (typeof TagStorageTypes)[keyof typeof TagStorageTypes];

// which storage ids to read/write besides global; omitted ids leave those buckets empty
export interface TagStorageScope {
  user_id?: string,
  channel_id?: string,
  guild_id?: string,
}

// `GET .../variables`: storage type -> {name: value}
export type TagVariables = Record<`${TagStorageType}`, Record<string, string>>;

export interface TagVariable {
  name: string,
  storage_id: string,
  storage_type: TagStorageType,
  value: string,
}

// `GET .../blobs`: storage type -> base64 blob (or null)
export type TagBlobs = Record<`${TagStorageType}`, string | null>;

export interface TagBlobsPut extends TagStorageScope {
  blobs: Array<{storage_id: string, storage_type: TagStorageType, value: string}>,
}


export interface UserGuildSummary {
  can_manage: boolean,
  icon: string | null,
  id: string,
  name: string,
  owner: boolean,
  permissions: string,
}

// `GET /users/@me/guilds`. `complete` is their whole server list from Discord (the `guilds` scope); without it it's the
// servers NotSoBot has seen them in, which can miss some. `addable` is the servers they can manage that NotSoBot isn't in
// (only with the `guilds` scope)
export interface UserGuildListing {
  addable: Array<UserGuildSummary>,
  complete: boolean,
  guilds: Array<UserGuildSummary>,
}

export type GuildRuleTargetType = 'channel' | 'guild' | 'role' | 'user';

// `GuildRule.to_dict()`: who can use what, the most specific rule that matches decides
export interface GuildRule {
  action: 'access',
  added: string,
  // if the server owner and admins skip this rule, null follows the server's `rules_admin_bypass`
  admin_bypass: boolean | null,
  // what it covers, a command category, a command, or (both null) everything
  category: string | null,
  command: string | null,
  id: string,
  // the server's id for `guild`
  target_id: string,
  target_type: GuildRuleTargetType,
  user_id: string | null,
  value: {allow: boolean, message: string | null},
}

// `PUT .../rules`, a rule that already exists for the same target and command/category gets the new value instead
export interface GuildRuleInput {
  action: 'access',
  // only changed on an existing rule when given
  admin_bypass?: boolean | null,
  category?: string | null,
  command?: string | null,
  target_id: string,
  target_type: GuildRuleTargetType,
  value: {allow: boolean, message?: string | null},
}

// `GuildLogger.to_dict()` (the dashboard never gets the webhook)
export interface GuildLogger {
  added: string,
  channel_id: string,
  disabled_events: number,
  guild_id: string,
  // channel ids (messages, voice, channels: a category covers its channels, a channel its threads) or role ids (roles)
  ignored_ids: Array<string>,
  type: number,
  user_id: string | null,
}

export interface GuildPrefix {
  added: string,
  guild_id: string,
  prefix: string,
  user_id: string | null,
}

// a server's `moderation_dm_disabled` bits, the dms about what moderators (or auto-warn) did that members don't get
export const GuildModerationDmFlags = {
  BAN: 1 << 0,
  KICK: 1 << 1,
  MUTE: 1 << 2,
  WARN: 1 << 3,
  AUTOWARN: 1 << 4,
} as const;

export interface GuildSettings {
  // seconds of a member's messages the bot's `ban` deletes when the moderator doesn't pick, 0: none
  ban_clean: number,
  ml_diffusion_model: string | null,
  ml_llm_model: string | null,
  ml_llm_personality: string | null,
  // the `GuildModerationDmFlags` members don't get dm'd about, 0: every one
  moderation_dm_disabled: number,
  response_display: number | null,
  // if the server owner and admins skip the rules (rules can override it)
  rules_admin_bypass: boolean,
  // `UserSettingsSearchProviders`, null is DuckDuckGo for web and Google for images
  search_provider_images: number | null,
  search_provider_web: number | null,
  // the warning ladder sorted by threshold, empty: off
  warnings_actions: Array<GuildWarningAction>,
  // the auto-warn rules sorted by trigger, server-wide first, empty: off
  warnings_auto: Array<GuildWarningAuto>,
  // who every auto-warn rule skips, null: nobody
  warnings_auto_exempt: GuildWarningAutoExempt | null,
  // seconds until a warning gets deleted, null: never
  warnings_expire: number | null,
  // seconds a warning counts towards a member's active warnings
  warnings_window: number,
}

// a step of the warning ladder: what the bot does once a warning brings a member's active warnings to `threshold` or
// past it, skipped when the moderator couldn't do it themselves
export interface GuildWarningAction {
  action: 'ban' | 'kick' | 'mute',
  // seconds of their messages to delete (kick/ban), 0: none
  clean: number,
  // seconds, a mute's length (required, up to 28 days) or a ban's (null: permanent, 1 minute to 365 days), null for kicks
  duration: number | null,
  // 1-100, unique within the ladder
  threshold: number,
}

// when the bot warns a member itself: `mentions` for a message mentioning more than `limit` users and roles,
// `blocked_command` for running a command the server's rules block for them, `automod` for setting off one of the
// server's Discord AutoMod rules
export interface GuildWarningAuto {
  // `automod` only (null for the others): one AutoMod rule's id, null: any of them. Where both are set, the one for that
  // AutoMod rule goes first. Missing on older rules
  automod_rule_id?: string | null,
  // null: anywhere in the server, a channel also covers its threads (a category, its channels). One rule per
  // trigger, channel and AutoMod rule
  channel_id: string | null,
  // `blocked_command` only (null for the others): the bot also deletes the blocked command's message and its replies to
  // it after 10 seconds. Null or missing on older rules: true
  delete_message?: boolean | null,
  // who this rule skips on top of the server's `warnings_auto_exempt`, null (or missing on older rules): nobody. Saving
  // the list replaces every rule, so it has to be sent back as it came
  exempt?: GuildWarningAutoExempt | null,
  // 1-50 for `mentions`, null for the others
  limit: number | null,
  trigger: 'automod' | 'blocked_command' | 'mentions',
  // 1-10, how many warnings it counts as
  warnings: number,
}

// a member with any of these permissions (discord's bitfield, as a decimal string) or any of these roles (up to 25) is
// skipped. The bot drops deleted roles (and rules for deleted channels) when it loads the settings
export interface GuildWarningAutoExempt {
  permissions: string,
  role_ids: Array<string>,
}

// `rules` covers command and category rules, `rules_admin` rules covering everything and the owner/admin bypass,
// `moderation` the server's warnings (Timeout Members)
export type GuildEditableArea = 'prefixes' | 'rules' | 'rules_admin' | 'loggers' | 'settings' | 'music' | 'moderation' | 'reminders' | 'tags';

// `Guild.to_dict()` + the caller's permissions and what they may edit
export interface UserGuild {
  blocked: boolean,
  blocked_reason: string | null,
  blocked_until: string | null,
  disabled_logger_events: number,
  editable: Record<GuildEditableArea, boolean>,
  features: Array<string>,
  icon: string | null,
  id: string,
  locale: string | null,
  loggers: Array<GuildLogger>,
  name: string,
  owner: boolean,
  permissions: string,
  prefixes: Array<GuildPrefix>,
  rules: Array<GuildRule>,
  settings: GuildSettings,
  timezone: string | null,
}

// owner only: the server's settings and its tags. Logger webhook URLs, tag variables/blobs and the content of
// directory tags (including what aliases here point to outside the server) are left out, `notes` says so inside the file
export interface UserGuildDataExport {
  guild: Omit<UserGuild, 'editable' | 'owner' | 'permissions'>,
  llm_knowledge: Array<GuildLLMKnowledge>,
  notes: Array<string>,
  tags: Array<Tag>,
  timestamp: number,
  version: number,
  warnings: Array<GuildWarning>,
}

export interface UserGuildDataDelete {
  tags_deleted: number,
}

// `GET /users/@me/data/export`, saved as a file. No tokens, file/voice clip bytes, other people's tag storage or staff
// notes, `notes` says what's left out inside the file
export interface UserDataExport {
  applications: Array<Application>,
  // per command, hourly rollup. null when the stats database couldn't be reached
  command_usage: Array<{command_id: string, command_type: number, first_used: string | null, last_used: string | null, uses: number}> | null,
  entitlements: Array<Entitlement>,
  files: Array<UserFile>,
  llm: {
    memories: Array<Omit<LLMMemory, 'guild'>>,
    // newest first, the api keeps them for 30 days
    responses: Array<{
      content: string,
      created: ApiTimestamp,
      error: string | null,
      guild_id: string | null,
      id: string,
      model: string,
      parent_id: string | null,
      prompt: string,
      prompt_file_count: number,
      server_id: string | null,
      tokens_input: number,
      tokens_output: number,
    }>,
  },
  notes: Array<string>,
  premium_servers: Omit<PremiumServersPage, 'items'> & {items: Array<Omit<PremiumServer, 'guild'>>},
  reminders: Array<Reminder>,
  reports: Array<Omit<MeReport, 'unread'> & {messages: Array<ReportMessage>}>,
  sessions: Array<UserSession>,
  settings: UserSettings,
  // theirs only: what tags keep for them, and the global storage of their own tags
  tag_storage: {
    blobs: Array<{storage_id: string, storage_type: TagStorageType, tag_id: string, value: string}>,
    variables: Array<TagVariable & {tag_id: string}>,
  },
  tags: Array<Omit<Tag, 'assets' | 'directory' | 'user'> & {
    assets: Array<Omit<TagAsset, 'provenance'>>,
    directory: {
      category: number,
      content_public: boolean,
      created: string,
      description: string,
      edited: string | null,
      title: string,
      verified: number,
    } | null,
  }>,
  timestamp: number,
  user: UserMe,
  version: number,
  voices: Array<MeVoice>,
}

// `rules_admin_bypass` needs the `rules_admin` area, null resets it to true
export interface UserGuildPatch {
  // seconds (0 to 7 days), null resets it to 1 day
  ban_clean?: number | null,
  // null resets it to 0 (every dm)
  moderation_dm_disabled?: number | null,
  locale?: string | null,
  timezone?: string | null,
  ml_llm_personality?: string | null,
  ml_llm_model?: string | null,
  ml_diffusion_model?: string | null,
  response_display?: number | null,
  search_provider_images?: number | null,
  search_provider_web?: number | null,
  rules_admin_bypass?: boolean | null,
  // replaces the whole ladder (up to 10 steps), null or empty turns it off
  warnings_actions?: Array<GuildWarningAction> | null,
  // replaces every auto-warn rule (up to 20), null or empty turns them off
  warnings_auto?: Array<GuildWarningAuto> | null,
  // null or empty: every rule skips nobody (besides their own `exempt`)
  warnings_auto_exempt?: GuildWarningAutoExempt | null,
  // seconds, null: warnings never expire
  warnings_expire?: number | null,
  // seconds, null resets it to 30 days
  warnings_window?: number | null,
}


// `/admin/guilds`: a server NotSoBot knows, from its `guilds` row and/or `bot_guilds`
export interface AdminGuildBot {
  shard_id: number,
  // when the bot last reported it (a shard's full sync or the join)
  updated: ApiTimestamp | null,
}

export interface AdminGuildSummary {
  blocked: boolean,
  blocked_reason: string | null,
  blocked_until: string | null,
  // null when the bot isn't in it
  bot: AdminGuildBot | null,
  // the detail's counts, minus reminders
  counts: Omit<AdminGuild['counts'], 'reminders'>,
  icon: string | null,
  id: string,
  // null when the bot is in it but it was never saved (no settings yet)
  name: string | null,
}

export interface AdminGuildsPage {
  count: number,
  items: Array<AdminGuildSummary>,
}

export type AdminGuildsSortBy = 'newest' | 'oldest' | 'name' | 'flags_most' | 'flags_least' | 'reports_most' | 'reports_least';

// `/admin/guilds/<id>`: the `UserGuild` shape (every area editable) plus where the bot is and what's linked to it
export interface AdminGuild extends UserGuild {
  bot: AdminGuildBot | null,
  // commands run in it, ever, and when the first one was (clickhouse `command_stats`), null if none ever were
  commands: number,
  // the same breakdown as a user's
  content_flags: AdminUserContentFlags,
  counts: {content_flags: number, reminders: number, reports: number, tags: number},
  first_seen: ApiTimestamp | null,
}

// what a server's `features` turn on, set by bot owners (`GuildFeatures` in the api)
export const GuildFeatures = {
  AI_ACCESS: 'AI_ACCESS',
  FREE_CUSTOM_COMMANDS: 'FREE_CUSTOM_COMMANDS',
  MUSIC_ACCESS: 'MUSIC_ACCESS',
} as const;
export type GuildFeature = (typeof GuildFeatures)[keyof typeof GuildFeatures];

// unblocking and `features` (which replaces the list) are owner only
export interface AdminGuildPatch extends UserGuildPatch {
  blocked?: boolean,
  blocked_reason?: string | null,
  // iso time the block lifts on its own, null for permanent. making a block end sooner is owner only
  blocked_until?: string | null,
  features?: Array<GuildFeature>,
}



// title/description/category of a tag's directory listing (images aren't editable from the dashboard yet)
export interface TagDirectoryListingInput {
  title?: string,
  description?: string,
  category?: TagDirectoryCategory,
  content_public?: boolean,
}

export const TAG_DIRECTORY_TITLE_MAX = 128;
export const TAG_DIRECTORY_DESCRIPTION_MAX = 2000;
// `MAX_TAG_DIRECTORY_ASSETS_AMOUNT`/`MAX_TAG_DIRECTORY_ASSET_SIZE`, the first asset is the listing's cover
export const TAG_DIRECTORY_ASSETS_MAX = 6;
export const TAG_DIRECTORY_ASSET_SIZE_MAX = 10 * 1024 * 1024;


// --- Admin (`/admin/...`, owners and moderators, see docs/dashboard-api.md) ---

// `UserFlags` bits on `User.flags`
export const UserFlags = {
  OWNER: 1 << 0,
  MODERATOR: 1 << 1,
  // can create API applications, and their tokens only work while they have it (owners always do)
  API_ACCESS: 1 << 2,
} as const;

// bigint ids come back as strings, timestamps as ISO strings (be tolerant of epoch numbers too)
export type ApiTimestamp = string | number;

export interface AdminUserRef {
  avatar: string | null,
  discriminator: string,
  id: string,
  username: string,
}

// `Tag.to_dict()` with content, as the admin directory returns it
export interface AdminDirectoryTag {
  // files staff archived for the tag (`TagAssets`), served from `cdn.nsb.gg/assets/tags/...`
  assets?: Array<TagAsset>,
  content: string,
  created: ApiTimestamp,
  edited?: ApiTimestamp | null,
  guild_id?: string | null,
  id: string,
  is_command?: boolean,
  last_used?: ApiTimestamp | null,
  locked: boolean,
  name: string,
  nsfw: boolean,
  reference_tag?: unknown,
  server_id: string | null,
  user_id?: string | null,
  uses: number,
  [key: string]: unknown,
}

export interface AdminTagDirectoryItem {
  assets: Array<TagDirectoryAsset>,
  category: TagDirectoryCategory,
  created?: ApiTimestamp,
  description: string,
  edited?: ApiTimestamp | null,
  id: string,
  server_count: number,
  tag: AdminDirectoryTag,
  thumbnail?: TagDirectoryThumbnail | null,
  // a change request waiting for review
  edit_request?: TagDirectoryEditRequest | null,
  title: string,
  user: AdminUserRef | null,
  verified: number,
}

export interface AdminTagDirectoryPage {
  count: number,
  items: Array<AdminTagDirectoryItem>,
}

export interface AdminUser extends AdminUserRef {
  blocked: boolean,
  blocked_reason: string | null,
  blocked_until: string | null,
  flags: number,
  premium_type: number | null,
}

export interface AdminUserPatch {
  blocked?: boolean,
  blocked_reason?: string | null,
  // iso time the block lifts on its own, null for permanent. making a block end sooner is owner only
  blocked_until?: string | null,
  // owner only; the OWNER bit can't be changed from the dashboard
  flags?: number,
  premium_type?: number,
}

export interface AdminUserContentFlags {
  confirmed: number,
  dismissed: number,
  flagged: number,
  last_flagged_at: ApiTimestamp | null,
  pending: number,
  reported: number,
  total: number,
  unsure: number,
}

export interface AdminUserEntry {
  // commands they've run, ever, and when they ran their first (clickhouse `command_stats`), null if they never have
  commands: number,
  first_seen: ApiTimestamp | null,
  content_flags: AdminUserContentFlags,
  // reports about the user (`GET /admin/reports?target_id=`)
  reports: number,
  // reports the user sent (`GET /admin/reports?user_id=`)
  reports_sent: number,
  // what they have (files that expired aren't counted)
  owned: {applications: number, files: number, reminders: number, tags: number, voices: number},
  // bytes their files take up in storage (the same file uploaded twice is stored once)
  files_size: number,
  user: AdminUser,
  // warnings NotSoBot staff gave them (`owner warn`, the Warn button)
  warnings: number,
}

// a warning from NotSoBot staff. The user gets a DM, sees it in place of their next command, and has a banner on the
// dashboard until they dismiss it (any of those `acknowledged` it). Nothing acts on how many they have. Every block
// makes one too (`block`), with the block's reason
export interface UserWarning {
  acknowledged: ApiTimestamp | null,
  block: boolean,
  created: ApiTimestamp,
  id: string,
  // only a block's can be null
  reason: string | null,
  user_id: string,
}

// staff see who gave it and whether the DM made it
export interface AdminUserWarning extends UserWarning {
  dm_sent: boolean,
  moderator_id: string,
}

export interface AdminUserWarnings {
  items: Array<AdminUserWarning>,
  // the moderators, by id
  users: Record<string, AdminUserRef | null>,
}

export interface AdminUserWarningCreated {
  count: number,
  warning: AdminUserWarning,
}

export interface UserWarnings {
  items: Array<UserWarning>,
}

export interface AdminUsersPage {
  count: number,
  items: Array<AdminUserEntry>,
}

export type AdminUsersSortBy = 'blocked' | 'confirmed' | 'flags' | 'last_flagged' | 'newest' | 'oldest' | 'pending' | 'reported' | 'username';
export type AdminTagsSortBy = 'newest' | 'oldest' | 'uses' | 'name' | 'last_used';

// `GET /admin/tags`, every tag (personal, server and aliases), not just directory listings
export interface AdminTagItem {
  // the tag's directory listing, if it has one
  directory: {title: string, verified: number} | null,
  tag: AdminDirectoryTag,
  // `channel_id` is the owner's DM channel with the bot, so a DM tag can be told apart from a group DM one
  user: (AdminUserRef & {channel_id: string | null}) | null,
}

export interface AdminTagsPage {
  count: number,
  items: Array<AdminTagItem>,
}

// `GET /admin/tags/<id>/duplicates`, other tags with the exact same content (aliases aside). `global` is everyone's,
// the owner's `user` ones included; `global_protected` of them can't be deleted by the caller and are skipped
export interface AdminTagDuplicates {
  global: number,
  global_protected: number,
  user: number,
}

// `DELETE /admin/tags/<id>`: `count` deleted (the tag included), `skipped` duplicates the caller can't delete
export interface AdminTagDeleteResult {
  count: number,
  skipped: number,
}

// Why staff remove something, for the tag audit log (`AdminRemovalFields`). No reason is a plain delete, `copyright`
// counts as a strike against the owner
export type AdminRemovalReason = 'copyright' | 'rules';
export interface AdminRemoval {
  reason: AdminRemovalReason | null,
  // who sent the notice and where it is
  notice: string,
}
export const ADMIN_REMOVAL_NOTICE_MAX = 2000;

// `TagAuditLogTypes`
export const TagAuditLogTypes = {
  ASSET_ADDED: 0,
  ASSET_REMOVED: 1,
  ASSET_MOVED: 2,
  DIRECTORY_STATE_CHANGED: 3,
  STAFF_TAG_EDIT: 4,
  EDIT_REQUEST_REVIEWED: 5,
  TAG_REMOVED: 6,
} as const;
export type TagAuditLogType = (typeof TagAuditLogTypes)[keyof typeof TagAuditLogTypes];

// `TagAuditAssetKinds`, which file an asset entry is about
export const TagAuditAssetKinds = {
  TAG_ASSET: 0,
  DIRECTORY_ASSET: 1,
  DIRECTORY_THUMBNAIL: 2,
  EDIT_REQUEST_ASSET: 3,
  EDIT_REQUEST_THUMBNAIL: 4,
} as const;

// `TagRemovalReasons`
export const TagRemovalReasons = {
  DELETED: 0,
  COPYRIGHT: 1,
  RULES: 2,
  REPLACED: 3,
  DATA_DELETION: 4,
} as const;
export type TagRemovalReason = (typeof TagRemovalReasons)[keyof typeof TagRemovalReasons];

// `TagAuditLog.to_dict()`, `details` depends on `type` (the fields are all optional for that reason)
export interface TagAuditEntry {
  action_id: string,
  actor_id: string | null,
  asset_id: string | null,
  created: ApiTimestamp,
  details: {
    // asset entries
    kind?: number,
    extension?: string | null,
    mimetype?: string | null,
    sha256?: string | null,
    size?: number | null,
    source_url?: string | null,
    uploaded_by?: string | null,
    replaces_id?: string | null,
    requested_by?: string | null,
    request_id?: string,
    from_tag_id?: string,
    to_tag_id?: string,
    // verification state changes (`to` null is off the directory) and edit request reviews (`reason` is a rejection's)
    from?: number,
    to?: number | null,
    status?: number,
    reason?: string | null,
    // staff edits, approved change requests and removed tags
    content?: string,
    content_before?: string | null,
    content_after?: string | null,
    name?: string,
    name_before?: string | null,
    name_after?: string | null,
  },
  directory_id: string | null,
  id: string,
  notice: string | null,
  owner_id: string | null,
  reason: TagRemovalReason | null,
  tag_id: string | null,
  type: TagAuditLogType,
}

// `GET /admin/tags/<tag_id>/audit`, newest first; `users` has everyone the entries mention
export interface AdminTagAuditPage {
  entries: Array<TagAuditEntry>,
  users: Record<string, AdminUserRef | null>,
}

// `GET /admin/users/<user_id>/copyright-strikes`, newest first. One strike per staff action (a tag taken down with its
// files is one); `users` has the staff who did them
export interface AdminCopyrightStrike {
  action_id: string,
  actor_id: string | null,
  asset_ids: Array<string>,
  created: ApiTimestamp,
  notice: string | null,
  tag_ids: Array<string>,
}
export interface AdminCopyrightStrikes {
  count: number,
  strikes: Array<AdminCopyrightStrike>,
  users: Record<string, AdminUserRef | null>,
}

// `POST /admin/tags/<id>/merge`, what replacing a tag with another moves (or would, for a dry run). Variables and blobs
// move per storage scope (a user, channel, server or global): `dropped` are in scopes the target already has something in
export interface AdminTagMergeSummary {
  aliases: number,
  assets: number,
  blobs: {dropped: number, moved: number},
  // the source's directory listing: `moved` onto the target, `dropped` (deleted with it) when the target has its own,
  // null when the source isn't listed
  directory: 'dropped' | 'moved' | null,
  // the target takes the listing over from a server, so it moves to its owner's personal tags (an alias keeps its name there)
  directory_moves_target: boolean,
  // rows of use history
  use_records: number,
  uses: number,
  variables: {dropped: number, moved: number},
  source: AdminDirectoryTag,
  target: AdminDirectoryTag,
}

// a tag's variables/blobs across every storage, read-only; `counts` is per storage type over the whole tag
export interface AdminTagVariable {
  name: string,
  storage_id: string,
  storage_type: TagStorageType,
  value: string,
}

export interface AdminTagBlob {
  // bytes, the whole blob
  size: number,
  storage_id: string,
  storage_type: TagStorageType,
  // only the first 16kb are sent
  truncated: boolean,
  // base64
  value: string,
}

export interface AdminTagStoragePage<T> {
  count: number,
  counts: Partial<Record<`${TagStorageType}`, number>>,
  items: Array<T>,
}
export type AdminTagDirectorySortBy = 'newest' | 'oldest' | 'uses' | 'servers' | 'name' | 'title';

export const ContentFlagStatuses = {
  PENDING: 0,
  CONFIRMED: 1,
  DISMISSED: 2,
  REPORTED: 3,
  // a reviewer couldn't decide and left it for someone else, counts as neither confirmed nor dismissed
  UNSURE: 4,
} as const;
export type ContentFlagStatus = (typeof ContentFlagStatuses)[keyof typeof ContentFlagStatuses];

export const ContentFlagCategories = ['unsafe', 'unsafe_child_safety', 'unsafe_nudity', 'review_child_safety', 'review'] as const;
export const ContentFlagTypes = ['media', 'text'] as const;
export type ContentFlagType = (typeof ContentFlagTypes)[number];
// text flags (filtered tag outputs, prompts) are stored with this mimetype, the text itself is in `query`
export const CONTENT_FLAG_TEXT_MIMETYPE = 'text/plain';
export const ContentFlagActions = ['blocked', 'replaced', 'logged', 'not_hosted'] as const;
// what a media flag's `query` is: an imagine/edit prompt, or the mediascript code that made the media
export const ContentFlagQueryTypes = ['prompt', 'mediascript'] as const;
export type ContentFlagQueryType = (typeof ContentFlagQueryTypes)[number];
// `GET /admin/content-flags?auto_review=`: the daily model review `applied` the status, only `suggested` one, `failed`
// (no media, fetch failed, refused), or `none` hasn't reviewed it
export const ContentFlagAutoReviewFilters = ['applied', 'suggested', 'failed', 'none'] as const;
export type ContentFlagAutoReviewFilter = (typeof ContentFlagAutoReviewFilters)[number];

// the daily model review's verdict, or `error` when it couldn't review the flag. `applied` means it set `status`
export interface ContentFlagAutoReview {
  applied: boolean,
  categories?: Array<string>,
  confidence?: 'low' | 'medium' | 'high',
  decision?: 'confirm' | 'dismiss' | 'escalate',
  error?: string,
  model?: string,
  reason?: string,
  reviewed_at: ApiTimestamp,
  // whether the media it fetched was the exact file that got flagged, null for text flags or when nothing was fetched
  sha256_match: boolean | null,
}

export interface ContentFlag {
  action: string | null,
  // the confirmed flag this one was auto-confirmed from (same sha256 or a close pdq), cleared once a reviewer sets a status
  auto_confirmed_from?: string | null,
  auto_review?: ContentFlagAutoReview | null,
  category: string | null,
  channel_id: string | null,
  command_id: string | null,
  created: ApiTimestamp,
  flagged: Array<string> | null,
  flagged_for_review: Array<string> | null,
  frames: number | null,
  frames_flagged: Array<number> | null,
  guild_id: string | null,
  id: string,
  message_id: string | null,
  mimetype: string | null,
  model: string | null,
  needs_human_review: boolean,
  notes: string | null,
  pdq: string | null,
  // the safety scanner's prompts and settings this was scanned with (InternalSafetyApi.prompt_hash), dismissing it only lets
  // the same content (sha256) through again while scans still hash the same. null for flags from before it was recorded
  prompt_hash?: string | null,
  query: string | null,
  // null on text flags (`query` is the flagged text) and media flags from before it was recorded
  query_type?: ContentFlagQueryType | null,
  reviewed_at: ApiTimestamp | null,
  // TODO: make this a user object (`{id, username, discriminator, avatar}` like `user`) instead of just the id
  reviewed_by: string | null,
  scores_worst: Record<string, unknown> | null,
  sha256: string | null,
  size: number | null,
  // never rendered as media or a link, see AdminContentFlagsPage
  source_url: string | null,
  status: number,
  tag_id: string | null,
  // english translation of `query` from `POST /admin/content-flags/<id>/translate`, `translation_language` is the detected
  // source language (`en` with no `translation` means it was already english)
  translation?: string | null,
  translation_language?: string | null,
  user: ContentFlagUser | null,
  user_id: string | null,
}

// the flag's user, with what the page needs to block them: `flags` (`UserFlags`) since owners can't be blocked and
// moderators can only be blocked by owners
export interface ContentFlagUser extends AdminUserRef {
  blocked: boolean,
  blocked_reason: string | null,
  blocked_until: string | null,
  flags: number,
}

export interface ContentFlagsPage {
  count: number,
  items: Array<ContentFlag>,
}

export interface ContentFlagPatch {
  status?: ContentFlagStatus,
  notes?: string | null,
  // also set `status` on the other pending flags `ContentFlagMatches` counted
  match_sha256?: boolean,
  match_pdq?: boolean,
}

export interface ContentFlagMatchCounts {
  pending: number,
  confirmed: number,
  dismissed: number,
  reported: number,
  unsure: number,
}

// `GET /admin/content-flags/<id>/matches`: the other flags of the same media, per status. `sha256` is the exact same
// file, `pdq` is visually similar media (within `pdq_distance` bits) that isn't a sha256 match too; null when the flag
// has no hash of that kind (text has no pdq)
export interface ContentFlagMatches {
  sha256: ContentFlagMatchCounts | null,
  pdq: ContentFlagMatchCounts | null,
  pdq_distance: number,
}

// `GET /jobs/<id>`, also what endpoints that start a job return (only the fields the dashboard reads). `status` is rq's
// ('queued', 'started', 'finished', 'failed', ...), a failed job has `result.error`
export interface JobResponse {
  id: string,
  status: string,
  result: {
    error: string | null,
    error_code: number | null,
    response: {
      file: {value: string | null, metadata: {mimetype: string}},
      // content flag media jobs only: the flag's `frames_flagged` (at most 8) as base64 jpegs, extracted like the
      // scanner did, with where each one is in the media (seconds, null if unknown). Empty for single frame media
      flagged_frames?: Array<{frame: number, mimetype: string, timestamp: number | null, value: string}>,
    } | null,
  },
}

// what users send with the bot's `/bot report` command
export const ReportTypes = {
  BUG: 0,
  USER: 1,
  SERVER: 2,
  MESSAGE: 3,
  TAG: 4,
} as const;
export type ReportType = (typeof ReportTypes)[keyof typeof ReportTypes];

export const ReportStatuses = {
  OPEN: 0,
  RESOLVED: 1,
  DISMISSED: 2,
} as const;
export type ReportStatus = (typeof ReportStatuses)[keyof typeof ReportStatuses];

export interface Report {
  channel_id: string | null,
  content: string,
  created: ApiTimestamp,
  guild_id: string | null,
  id: string,
  message_id: string | null,
  notes: string | null,
  reviewed_at: ApiTimestamp | null,
  reviewed_by: string | null,
  status: number,
  // message reports of a tag's output have the tag here (the tag the alias points to for an alias)
  tag_id: string | null,
  // the reported user (USER), guild (SERVER), whoever used the command for a bot response (MESSAGE) or tag (TAG); null for bugs
  // message reports have the reported message in channel_id/message_id instead of where the report was sent from
  target_id: string | null,
  type: number,
  // the reporter, null for an anonymous report from the website (no replies, they can't get them)
  user: User | null,
  // admin routes only: an anonymous report's sender, the same hash on several means they came from the same place
  ip_hash?: string | null,
  // admin routes only: the reported user of user and message reports, null when they aren't in our database
  target_user?: User | null,
  // replies in the report's conversation (status changes don't count) and who sent the last one
  replies: number,
  last_reply: {author: ReportMessageAuthor, created: ApiTimestamp} | null,
  // the newest reply or status change, null when nothing's happened since it was sent
  last_activity: ApiTimestamp | null,
}

// what the website's report forms send (`POST /users/@me/reports`, or `/reports/anonymous` with `turnstile_token` when
// logged out): bugs, and tags from the tag directory (`target_id` is the tag)
export interface WebsiteReportBody {
  content: string,
  target_id?: string,
  type: typeof ReportTypes.BUG | typeof ReportTypes.TAG,
}

// `POST /reports/anonymous` answers with just what was sent
export interface AnonymousReport {
  content: string,
  id: string,
  target_id: string | null,
  type: number,
}

export interface ReportsPage {
  count: number,
  items: Array<Report>,
}

// `/users/@me/commands`: one command attempt the bot reported for the caller, newest first
export interface MeCommandUse {
  channel_id: string,
  command_id: string,
  // null when the command (or that variant of it) isn't in the bot's command list anymore
  command_name: string | null,
  command_type: CommandType,
  // null in DMs
  guild_id: string | null,
  // how it ended, the bot's `CommandResults` (null from before it was tracked)
  result: MeCommandResult | string | null,
  timestamp: string,
}

export const MeCommandResults = {
  ARGUMENT_ERROR: 'argument_error',
  BLOCKED: 'blocked',
  BOT_MISSING_PERMISSIONS: 'bot_missing_permissions',
  CANCELLED: 'cancelled',
  // the api's nsfw/guidelines filter blocked the media or text
  CONTENT_BLOCKED: 'content_blocked',
  FAIL: 'fail',
  MISSING_PERMISSIONS: 'missing_permissions',
  RAN: 'ran',
  RATELIMITED: 'ratelimited',
  RUN_ERROR: 'run_error',
  // the user's own tag or code erroring, not ours
  SCRIPT_ERROR: 'script_error',
} as const;
export type MeCommandResult = (typeof MeCommandResults)[keyof typeof MeCommandResults];

export interface MeCommandsPage {
  // matching the filters
  count: number,
  // the caller's first command ever (ignores the filters), null if they've never used one
  first_used: string | null,
  items: Array<MeCommandUse>,
  // how many ended each way (`untracked` for ones from before that was reported), matching every filter but the result's;
  // most first
  results: Array<{count: number, result: string}>,
  // every command they've used, ignoring the filters
  total: number,
}


// the caller's own reports, without the reporter (it's them) or the staff-only notes and reviewer.
// `unread`: staff sent something (a reply or status change) since they last opened its conversation or last replied
export type MeReport = Omit<Report, 'notes' | 'reviewed_by' | 'user'> & {unread: boolean};

// how many of the caller's reports are `unread`, for the dashboard's badge
export interface MeReportsUnread {
  count: number,
}

// `updated` is the newest reply or status change (or when it was sent, with neither)
export type MeReportsSortBy = 'updated' | 'newest' | 'oldest';

export interface MeReportsPage {
  count: number,
  items: Array<MeReport>,
}

export interface ReportPatch {
  status?: ReportStatus,
  notes?: string | null,
}

// the reporter can only reopen their report
export interface MeReportPatch {
  status: typeof ReportStatuses.OPEN,
}

// staff replies are only ever "NotSoAdmin" to the reporter
export type ReportMessageAuthor = 'staff' | 'reporter';

// one entry in a report's conversation between the reporter and staff (dashboard only): a reply (`content`) or a
// status change (`status`)
export interface ReportMessage {
  author: ReportMessageAuthor,
  // admin routes only, which staff member (or the reporter) it was
  author_id?: string,
  content: string | null,
  created: ApiTimestamp,
  id: string,
  status: ReportStatus | null,
}

export interface ReportMessagesPage {
  items: Array<ReportMessage>,
}

// `POST /admin/reports/<id>/translate` (or a message's): the text in english, not stored. Like a content flag's,
// `translation_language` is the detected source language, `en` with no `translation` means it was already english
export interface ReportTranslation {
  translation: string | null,
  translation_language: string | null,
}


// `/admin/voices`: every cloned voice, with the platform's own id and the owner
export interface AdminVoice extends Voice {
  platform_id: string,
  user: AdminUserRef | null,
}

export interface AdminVoicesPage {
  count: number,
  items: Array<AdminVoice>,
}


// `/admin/applications`: every API application, with its owner (staff never get the token)
export interface AdminApplication extends Application {
  user: AdminUserRef | null,
}

// `GET /admin/applications/<id>`: requests made with its token in the last `days` days (clickhouse `endpoint_uses`),
// `endpoints` the five it used most
export interface AdminApplicationUsage {
  days: number,
  endpoints: Array<{count: number, endpoint: string}>,
  errors: number,
  first_request_at: ApiTimestamp | null,
  last_request_at: ApiTimestamp | null,
  requests: number,
}

export interface AdminApplicationDetail extends AdminApplication {
  usage: AdminApplicationUsage,
}

export interface AdminApplicationsPage {
  count: number,
  items: Array<AdminApplication>,
}

export interface AdminApplicationPatch {
  disabled?: boolean,
  name?: string,
}

// `/admin/applications/access`: a user with `UserFlags.API_ACCESS` and how many applications they have
export interface ApplicationAccessItem {
  applications: number,
  user: AdminUserRef & {flags: number},
}

export interface ApplicationAccessPage {
  count: number,
  items: Array<ApplicationAccessItem>,
}


// `/admin/identities` (owners only): an account on a site plus the one proxy it's always used through, and the proxies
// themselves (added in bulk, labeled, then assigned to services). timestamps are epoch ms
// pending: made by assigning a proxy to a service with accounts, never used until it gets its cookies
export type IdentityStatus = 'active' | 'dead' | 'disabled' | 'pending';
export type ProxyScheme = 'http' | 'https' | 'socks5' | 'socks5h';

export interface IdentityProxy {
  id: number,
  scheme: ProxyScheme,
  host: string,
  port: number,
  username: string,
  // the password itself only comes from `POST /admin/identities/proxies/<id>/reveal`
  has_password: boolean,
  labels: Array<string>,
  exit_ip: string | null,
  status: 'active' | 'disabled',
  // refused connections recently, everything on it waits a couple of minutes
  down: boolean,
  created: number | null,
}

// what each identity on a proxy is, one per service
export interface IdentityProxyItem extends IdentityProxy {
  identities: Array<{id: string, service: string, status: IdentityStatus}>,
}

export interface IdentityLabel {
  id: number,
  name: string,
  proxies: number,
}

export interface Identity {
  id: string,
  service: string,
  kind: 'cookies' | 'none',
  status: IdentityStatus,
  proxy: IdentityProxy,
  // in the rotation, `next_at` is when it may be used again (in the past means ready)
  in_pool: boolean,
  next_at: number | null,
  // a download is using it, for this many more ms at most
  leased_ms: number,
  // ip flags in a row (each one benches it longer) and cookie failures in a row (enough of them kill it)
  streak: number,
  strikes: number,
  last_ok: number | null,
  last_error: string | null,
  last_error_at: number | null,
  secret_updated: number | null,
  has_secret: boolean,
  // a saved login, for signing in again to export new cookies. only whether there is one, revealing it is audited
  has_login: boolean,
  login_updated: number | null,
  created: number | null,
}

export interface IdentityLogin {
  username: string,
  password: string,
  recovery_email?: string | null,
  // as typed, spaces and dashes kept
  recovery_phone?: string | null,
  // the youtube channel's own email (a brand account's), next to its link
  channel_email?: string | null,
  channel_url?: string | null,
  // the authenticator secret (base32, the dashboard shows its current code) or backup codes
  two_factor?: string | null,
  notes?: string | null,
}

export type IdentityAuditEntry = {
  action: 'login_reveal' | 'login_set' | 'login_clear' | 'proxy_reveal',
  // "0" is the cli script
  user_id: string,
  created: number | null,
};

// `POST /admin/identities/<id>/login/reveal`, the history includes this reveal
export interface IdentityLoginReveal {
  login: IdentityLogin,
  updated: number | null,
  history: Array<IdentityAuditEntry>,
}

// `POST /admin/identities/proxies/<id>/reveal`, audited the same way
export interface ProxyReveal {
  username: string,
  password: string | null,
  url: string,
  history: Array<IdentityAuditEntry>,
}

export interface IdentityService {
  service: string,
  kind: Identity['kind'],
  counts: Record<IdentityStatus, number>,
  pool: number,
  available: number,
  flagged_recently: number,
  // seconds left on a pause, after too many of its identities got flagged at once
  paused_for: number,
  cooldown: number,
  backoff: Array<number>,
  cookie_strikes: number,
  // a cookies service whose identities earn their jar (google's captcha clearances) instead of having one uploaded
  secret_optional: boolean,
  // never leased or rate limited, every use picks one at random (`global`, the general proxy)
  shared: boolean,
}

export interface AdminIdentities {
  identities: Array<Identity>,
  labels: Array<IdentityLabel>,
  proxies: Array<IdentityProxyItem>,
  services: Array<IdentityService>,
}

export interface AdminIdentityCreate {
  service: string,
  name: string,
  proxy_id: number,
  cookies?: string,
  status?: 'active' | 'disabled',
  login?: IdentityLogin,
}

// accounts from pasted logins, each on the proxy the dashboard picked; without cookies they're `pending`
export interface AdminIdentitiesBulkCreate {
  service: string,
  items: Array<{name: string, proxy_id: number, login?: IdentityLogin}>,
  status?: 'active' | 'disabled',
}

export interface AdminIdentitiesBulkResult {
  results: Array<{name: string, identity_id?: string, status?: IdentityStatus, error?: string}>,
}

export interface AdminIdentityPatch {
  cookies?: string,
  status?: IdentityStatus,
  // re-pairing with another proxy
  proxy_id?: number,
}

// `POST /admin/identities/proxies/bulk`: a pasted list, one proxy per line, previewed unless `apply`
export interface AdminProxiesBulk {
  proxies: string,
  labels?: Array<string>,
  scheme?: ProxyScheme,
  // an existing one gets the pasted password and the labels instead of being skipped
  update_existing?: boolean,
  apply: boolean,
}

export interface AdminProxiesBulkResult {
  applied: boolean,
  added: number,
  updated: number,
  skipped: number,
  failed: number,
  // never the line or a password
  results: Array<{
    line: number,
    outcome: 'would_add' | 'added' | 'would_update' | 'updated' | 'skipped' | 'failed',
    proxy?: string,
    proxy_id?: number,
    has_password?: boolean,
    error?: string,
  }>,
}

// `PATCH /admin/identities/proxies`, the same change on every one of them
export interface AdminProxiesPatch {
  proxy_ids: Array<number>,
  status?: 'active' | 'disabled',
  username?: string,
  password?: string,
  clear_password?: boolean,
  add_labels?: Array<string>,
  remove_labels?: Array<string>,
}

export interface AdminProxyPatch {
  scheme?: ProxyScheme,
  host?: string,
  port?: number,
  username?: string,
  password?: string,
  clear_password?: boolean,
  // the whole set
  labels?: Array<string>,
  status?: 'active' | 'disabled',
  exit_ip?: string | null,
}


// where an entitlement came from: a Discord subscription, or premium given from the admin dashboard
export const EntitlementProviders = {
  DISCORD: 'discord',
  MANUAL: 'manual',
} as const;
export type EntitlementProvider = (typeof EntitlementProviders)[keyof typeof EntitlementProviders];

// `/users/@me/entitlements`: the caller's premium subscriptions and grants, newest first
export interface Entitlement {
  // counts right now: not deleted, consumed, expired or not started yet
  active: boolean,
  consumed: boolean,
  created_at: ApiTimestamp | null,
  // cancelled on Discord, or a manual grant that was replaced or removed
  deleted: boolean,
  ends_at: ApiTimestamp | null,
  // the staff member who gave a manual one
  granted_by: string | null,
  guild_id: string | null,
  id: string,
  // the `UserPremiumTypes` the sku gives, null for a sku NotSoBot doesn't sell
  premium_type: number | null,
  provider: string,
  sku_id: string,
  starts_at: ApiTimestamp | null,
  type: number,
  updated_at: ApiTimestamp | null,
}

export interface EntitlementsPage {
  count: number,
  items: Array<Entitlement>,
}

// `/users/@me/premium/servers`: a server the caller gave their premium plus perks to (a premium server slot)
export interface PremiumServer {
  created: ApiTimestamp,
  // the guild as NotSoBot knows it, null for group dms (added from the bot) and guilds it hasn't seen
  guild: {icon: string | null, id: string, name: string | null} | null,
  // when it can be taken off, a server is locked in for a while after getting it
  removable_at: ApiTimestamp,
  server_id: string,
  // how many of the caller's slots are on it, Plus AI subscribers can stack them to raise its NotSoAI limit
  slots: number,
  user_id: string,
}

export interface PremiumServersPage {
  // the servers only get anything while the caller has premium plus
  active: boolean,
  items: Array<PremiumServer>,
  // slots, not servers. null for owners, they can give as many as they want
  limit: number | null,
  // slots in use, stacked ones included
  used: number,
}

// `/admin/entitlements`: everyone's, with Discord's own id and the owner (null for guild-only ones)
export interface AdminEntitlement extends Entitlement {
  external_id: string | null,
  user: AdminUserRef | null,
}

export interface AdminEntitlementsPage {
  count: number,
  items: Array<AdminEntitlement>,
}


export interface CountAndSize {
  count: number,
  // bytes
  size: number,
}

// `/admin/stats/files`: everyone's files. The top-level numbers add up each file (the same content uploaded twice
// counts twice), `expired` is temporary files the cleanup hasn't deleted yet (not in `count`/`size`). `storage` is
// what's actually stored, each object once, split by what keeps it: a permanent file, only unexpired temporary ones,
// or nothing (waiting for the cleanup)
export interface AdminFileStats {
  count: number,
  size: number,
  permanent: CountAndSize,
  temporary: CountAndSize,
  expired: CountAndSize,
  storage: CountAndSize & {
    permanent: CountAndSize,
    temporary: CountAndSize,
    unused: CountAndSize,
  },
  // temporary files expiring before `ends_at` (`expiring_days` from now); `freed` is the stored objects that go with
  // them (nothing outside the window keeps them), `days` a bucket per 24 hours from now
  expiring: CountAndSize & {
    ends_at: string,
    freed: CountAndSize,
    days: Array<CountAndSize & {starts_at: string}>,
  },
  // live files by mimetype (`image/...`, `video/...`, `audio/...`, the rest is `other`)
  types: Array<CountAndSize & {type: 'image' | 'video' | 'audio' | 'other'}>,
  // who stores the most: their stored objects a live file uses, each once. `user` is null if the row is gone
  top_users: Array<CountAndSize & {user_id: string, user: AdminUserRef | null}>,
  generated_at: string,
}

// the other `/admin/stats/<area>` routes cover the last `days` UTC calendar days (today included, from `starts_at`),
// and their `series` have one item per day, oldest first
export interface AdminStatsWindow {
  days: number,
  starts_at: string,
}

type DailySeries<T> = Array<T & {date: string}>;

// `/admin/stats/uploads`: files uploaded per day (expired temporary ones that were cleaned up don't count anymore)
export interface AdminUploadStats extends AdminStatsWindow {
  permanent: CountAndSize,
  temporary: CountAndSize,
  series: DailySeries<{permanent: CountAndSize, temporary: CountAndSize}>,
}

// `/admin/stats/commands`: commands run, by how many users and servers. `results` is how attempts ended (the bot's
// `CommandResults`, `untracked` from before that was recorded), most first; `types` by `CommandTypes`
export interface AdminCommandStats extends AdminStatsWindow {
  count: number,
  users: number,
  servers: number,
  series: DailySeries<{count: number}>,
  top: Array<{command_id: string, count: number, users: number}>,
  types: Array<{type: CommandType, count: number}>,
  results: Array<{result: string, count: number}>,
}

// `/users/@me/guilds/<id>/commands/stats` (Manage Server): commands run in one server over the window, counts only.
// `name` is null for a command the bot no longer has
export interface GuildCommandStats extends AdminStatsWindow {
  count: number,
  users: number,
  series: DailySeries<{count: number}>,
  top: Array<{command_id: string, command_type: CommandType, count: number, name: string | null, users: number}>,
}

// `/admin/stats/api`: requests the api logged. Times are ms; `application: null` is requests without an application
// token (the dashboard and the site), `name` is null when the application is gone
export interface AdminApiStats extends AdminStatsWindow {
  requests: number,
  client_errors: number,
  server_errors: number,
  took_avg: number,
  took_p95: number,
  users: number,
  series: DailySeries<{requests: number, server_errors: number}>,
  endpoints: Array<{method: string, endpoint: string, requests: number, server_errors: number, took_avg: number}>,
  applications: Array<{application: {id: string, name: string | null} | null, requests: number, server_errors: number}>,
}

// `/admin/stats/growth`: `users.total` is every (non-bot) user row, `active_ever` everyone who's run a command, `new`
// the ones whose first command was in the window. `servers.current` is the servers the bot is in now. `ghosts` are servers
// the bot had already left that discord still lists when a shard identifies, then removes again: not leaves, but how
// often shards identified
export interface AdminGrowthStats extends AdminStatsWindow {
  users: {
    total: number,
    blocked: number,
    active_ever: number,
    new: number,
    series: DailySeries<{count: number}>,
  },
  servers: {
    current: number,
    joins: number,
    leaves: number,
    // missing from an api from before they were counted
    ghosts?: number,
    series: DailySeries<{joins: number, leaves: number, ghosts?: number}>,
  },
}

// `/admin/stats/premium`: active entitlements by tier (`premium_type` null for a sku we don't sell) and provider,
// `users` by their `premium_type` (owners can give premium without an entitlement), and what started or ended in the
// window
export interface AdminPremiumStats extends AdminStatsWindow {
  active: {
    count: number,
    users: number,
    tiers: Array<{premium_type: number | null, count: number, discord: number, manual: number}>,
  },
  users: Array<{premium_type: number, count: number}>,
  started: number,
  ended: number,
  premium_servers: number,
  series: DailySeries<{started: number, ended: number}>,
}

// `/admin/stats/moderation`: what's waiting on staff (pending flags leave out blocked users', like the flags page),
// with the oldest of each; `created`/`reviewed` are in the window
export interface AdminModerationStats extends AdminStatsWindow {
  content_flags: {pending: number, needs_human_review: number, oldest_pending_at: string | null, unsure: number, oldest_unsure_at: string | null, created: number, reviewed: number},
  reports: {open: number, awaiting_reply: number, oldest_open_at: string | null, created: number},
  directory: {pending: number, oldest_pending_at: string | null, edit_requests: number, oldest_edit_request_at: string | null},
}

// `/admin/stats/content`: how much of everything there is, `users` is how many users have any, `new` made in the window
export interface AdminContentStats extends AdminStatsWindow {
  tags: {
    total: number,
    users: number,
    new: number,
    // where they live: personal (on their owner), a server, or a DM
    personal: number,
    server: number,
    dm: number,
    aliases: number,
    commands: number,
    nsfw: number,
    directory: {verified: number, pending: number, unverified: number},
  },
  reminders: {total: number, users: number, new: number, next_day: number},
  voices: {total: number, users: number, new: number},
  ai_memories: {total: number, users: number, new: number},
  applications: {total: number, users: number, new: number, disabled: number},
}
