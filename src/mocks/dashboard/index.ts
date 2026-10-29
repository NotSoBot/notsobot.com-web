// Dev-only fake backend for the dashboard routes in docs/dashboard-api.md, used until notsobot.api
// ships them. Loaded from main.tsx only when `import.meta.env.DEV && VITE_DASHBOARD_MOCKS === 'true'`,
// so none of this ends up in production bundles.
//
// It wraps `window.fetch`: requests to the routes below get an in-memory answer, everything else
// (commands, status, ...) goes to the real API as usual. Writes persist until the page reloads.
//
// In the console: `__dashboardMocks.guildsError('scope' | 'grant' | 'ratelimit' | 'refreshing' | null)`: `scope` makes
// `/users/@me/guilds` answer like the real API without the `guilds` scope (`complete: false`, only some servers), the
// others make `/users/@me/guilds*` fail like it used to (revoked Discord grant, Discord 429, token refresh in progress); `__dashboardMocks.latency(ms)` changes the fake delay; `__dashboardMocks.owner(false)`
// (then reload) drops the owner flag so the admin section disappears and `/admin/*` answers 403; `__dashboardMocks.moderator(true)`
// (then reload) makes the mock user a moderator, so the owner-only admin parts answer 403 and are hidden;
// `__dashboardMocks.blocked('reason' | true | false)` (then reload) marks the mock user as blocked by staff.
// A logger webhook URL whose token contains "invalid" is rejected like a webhook from another channel.

import { tokenStorage } from '@/auth/tokenStorage';
import { config } from '@/config';
import {
  ApiErrorCodes,
  CONTENT_FLAG_TEXT_MIMETYPE,
  TAG_DIRECTORY_ASSET_SIZE_MAX,
  TAG_DIRECTORY_ASSETS_MAX,
  TagDirectoryCategories,
  TagDirectoryVerificationStates,
  VoiceCloneTypes,
  type AdminCopyrightStrike,
  type AdminDirectoryTag,
  type AdminTagDirectoryItem,
  type AdminUserRef,
  type ContentFlag,
  type GuildLLMKnowledge,
  type GuildContentUser,
  type GuildReport,
  type GuildReportMessage,
  type GuildWarning,
  type GuildMusic,
  type GuildMusicStats,
  type GuildMusicQueueItem,
  type GuildRule,
  type GuildRuleInput,
  type Identity,
  type IdentityLogin,
  type IdentityLoginReveal,
  type IdentityProxyItem,
  type Reminder,
  type Report,
  type ReportMessage,
  type Tag,
  type TagDirectoryCategory,
  type TagDirectoryEditRequest,
  type TagDirectoryItem,
  type TagAuditEntry,
  type TagStorageType,
  type UserDataExport,
  type UserGuild,
  type UserGuildSummary,
  type UserMe,
  type VoiceClip,
} from '@/lib/api/types';
import { toDate } from '@/lib/utils';

import {
  adminUserEntries,
  createApplications,
  createAdminDirectory,
  createAdminGuilds,
  createAdminUsers,
  createBlobs,
  createCommandUses,
  createContentFlags,
  createEntitlements,
  createFiles,
  createLLMMemories,
  createReminders,
  createReportMessages,
  createReports,
  syncReportReplies,
  createGuilds,
  createSettings,
  createTags,
  createVoices,
  createVariables,
  emptyBlobs,
  emptyVariables,
  createGuildSettings,
  guildEditable,
  MOCK_TOKEN,
  mockRule,
  mockUser,
  sampleDirectoryAssets,
} from './fixtures';
import { MOCK_COMMAND_PREVIEWS } from './commandPreviews';


const adminUsers = createAdminUsers();
const guilds = createGuilds();

const state = {
  settings: createSettings(),
  adminUsers,
  adminDirectory: createAdminDirectory(adminUsers),
  contentFlags: createContentFlags(adminUsers),
  files: createFiles(),
  commandUses: createCommandUses(),
  llmMemories: createLLMMemories(),
  // what each server told NotSoAI, by guild id; the first server starts with a couple
  guildLLMKnowledge: new Map<string, Array<GuildLLMKnowledge>>([[guilds[0].summary.id, [
    {content: 'The #support channel is for help with the bot, staff usually answer within a day.', created: new Date(Date.now() - 9 * 86400000).toISOString(), guild_id: guilds[0].summary.id, id: '1300000000000000101', user_id: '1000000000000000001'},
    {content: 'Members get the Regular role after a week of chatting.', created: new Date(Date.now() - 2 * 86400000).toISOString(), guild_id: guilds[0].summary.id, id: '1300000000000000102', user_id: '1000000000000000001'},
  ]]]),
  // each server's warnings by guild id, newest last; the first server starts with a few (one past the 30 day window, one
  // from an auto-warn rule that counts as 3)
  guildWarnings: new Map<string, Array<GuildWarning>>([[guilds[0].summary.id, [
    {created: new Date(Date.now() - 45 * 86400000).toISOString(), guild_id: guilds[0].summary.id, id: '1300000000000000301', moderator_id: mockUser.id, reason: 'Spamming in #general', user_id: '1000000000000000002', weight: 1},
    {created: new Date(Date.now() - 6 * 86400000).toISOString(), guild_id: guilds[0].summary.id, id: '1300000000000000302', moderator_id: mockUser.id, reason: 'Posting memes in #support', user_id: '1000000000000000002', weight: 1},
    {created: new Date(Date.now() - 2 * 3600000).toISOString(), guild_id: guilds[0].summary.id, id: '1300000000000000303', moderator_id: '1000000000000000003', reason: null, user_id: '1000000000000000004', weight: 1},
    {created: new Date(Date.now() - 20 * 60000).toISOString(), guild_id: guilds[0].summary.id, id: '1300000000000000304', moderator_id: '1000000000000000003', reason: 'Mentioned 14 users and roles in one message (the limit is 8)', user_id: '1000000000000000006', weight: 3},
  ]]]),
  // members' reports to each server's moderators by guild id, newest last; the first server (which gets a reports logger
  // below) starts with open, resolved and dismissed ones, one of them a message without text
  guildReports: new Map<string, Array<GuildReport>>([[guilds[0].summary.id, [
    mockGuildReport({channel_id: '1200000000000000011', created: new Date(Date.now() - 35 * 86400000).toISOString(), handled_at: new Date(Date.now() - 34 * 86400000).toISOString(), handled_by: mockUser.id, id: '1300000000000000400', message_content_deleted: true, target_quote: false, message_id: '1250000000000000400', reason: 'Spamming the same message in every channel', status: 1, target_id: '1000000000000000006', type: 1, user_id: '1000000000000000002'}),
    mockGuildReport({created: new Date(Date.now() - 12 * 86400000).toISOString(), handled_at: new Date(Date.now() - 11 * 86400000).toISOString(), handled_by: mockUser.id, id: '1300000000000000401', reason: 'Keeps DMing me invite links after I asked them to stop', status: 1, target_id: '1000000000000000002', user_id: '1000000000000000005'}),
    mockGuildReport({channel_id: '1200000000000000011', created: new Date(Date.now() - 5 * 86400000).toISOString(), handled_at: new Date(Date.now() - 4 * 86400000).toISOString(), handled_by: '1000000000000000003', id: '1300000000000000402', message_content: 'lol imagine needing help with a discord bot', message_id: '1250000000000000402', reason: 'Being rude in #support', status: 2, target_id: '1000000000000000004', type: 1, user_id: '1000000000000000005'}),
    mockGuildReport({channel_id: '1200000000000000012', created: new Date(Date.now() - 26 * 3600000).toISOString(), id: '1300000000000000403', message_id: '1250000000000000403', reason: 'NSFW image in a SFW channel', target_id: '1000000000000000002', type: 1, user_id: '1000000000000000004'}),
    mockGuildReport({channel_id: '1200000000000000011', created: new Date(Date.now() - 40 * 60000).toISOString(), id: '1300000000000000404', message_content: 'FREE NITRO!!! claim here before it runs out -> discord-gift.example/claim\nonly 50 left', message_id: '1250000000000000404', message_quote: true, reason: 'Scam link, probably a hacked account', target_id: '1000000000000000006', type: 1, user_id: '1000000000000000002'}),
    mockGuildReport({created: new Date(Date.now() - 5 * 60000).toISOString(), id: '1300000000000000405', reason: 'Their username and avatar are a slur', target_id: '1000000000000000007', user_id: '1000000000000000004'}),
    // sent by the mock user, for their own Reports page's Servers tab
    mockGuildReport({channel_id: '1200000000000000011', created: new Date(Date.now() - 2 * 86400000).toISOString(), handled_at: new Date(Date.now() - 86400000).toISOString(), handled_by: '1000000000000000003', id: '1300000000000000406', message_content: 'everyone go spam the other server lol', message_id: '1250000000000000406', reason: 'Trying to start a raid', status: 1, target_id: '1000000000000000006', type: 1, user_id: mockUser.id}),
    mockGuildReport({created: new Date(Date.now() - 3 * 3600000).toISOString(), id: '1300000000000000407', reason: 'Impersonating a moderator', target_id: '1000000000000000002', user_id: mockUser.id}),
  ]]]),
  // the conversations on members' reports by report id, oldest first: the open scam link report has a back and forth
  guildReportMessages: new Map<string, Array<GuildReportMessage>>([
    ['1300000000000000406', [
      {author: 'moderator', author_id: '1000000000000000003', content: null, created: new Date(Date.now() - 86400000).toISOString(), id: '1300000000000000506', status: 1},
      {author: 'moderator', author_id: '1000000000000000003', content: 'Thanks, they\'ve been banned.', created: new Date(Date.now() - 86000000).toISOString(), id: '1300000000000000507', status: null},
    ]],
    ['1300000000000000404', [
      {author: 'moderator', author_id: mockUser.id, content: 'Thanks, do you know if anyone clicked it?', created: new Date(Date.now() - 30 * 60000).toISOString(), id: '1300000000000000504', status: null},
      {author: 'reporter', author_id: '1000000000000000002', content: 'Not sure, a couple people reacted to it before it got buried', created: new Date(Date.now() - 20 * 60000).toISOString(), id: '1300000000000000505', status: null},
    ]],
  ]),
  // each server's music, made when it's first asked for (`guildMusic`)
  guildMusic: new Map<string, GuildMusic>(),
  reminders: createReminders(),
  reports: createReports(adminUsers),
  reportMessages: new Map<string, Array<ReportMessage>>(),
  // the api's `reporter_read_at`, set when the mock user opens a report's conversation
  reportReadAt: new Map<string, string>(),
  // the reports the mock user sent, filled in below
  ownReportIds: new Set<string>(),
  voices: createVoices(adminUsers),
  // the clips the mock user's voices are made from, filled in below; the audio itself is in `voiceClipAudio`
  voiceClips: new Map<string, Array<VoiceClip>>(),
  applications: createApplications(adminUsers),
  entitlements: createEntitlements(adminUsers),
  // premium server slots, a guild added two days ago (still locked) and a group dm from the bot three weeks ago
  premiumServers: [
    {created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), server_id: guilds[1].summary.id, slots: 1},
    {created: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), server_id: '1290000000000000001', slots: 1},
  ] as Array<{created: string, server_id: string, slots: number}>,
  // the mock user is a NotSoBot owner unless turned off (kept across reloads like guildsError)
  owner: sessionStorage.getItem('dashboardMocks:notOwner') !== '1',
  // a moderator instead of an owner (`__dashboardMocks.moderator(true)`, then reload), kept across reloads like owner
  moderator: sessionStorage.getItem('dashboardMocks:moderator') === '1',
  // the block reason ('' for blocked without one), or null when not blocked; kept across reloads like owner
  blocked: sessionStorage.getItem('dashboardMocks:blocked'),
  tags: createTags(),
  variables: createVariables(),
  blobs: createBlobs(),
  guilds,
  adminGuilds: createAdminGuilds(guilds),
  directory: new Map<string, TagDirectoryItem>(),
  // kept in sessionStorage so it survives the reload needed to see it
  guildsError: (sessionStorage.getItem('dashboardMocks:guildsError') || null) as GuildsError,
  // browse as a logged out visitor (`__dashboardMocks.loggedOut(true)`), for the anonymous report forms
  loggedOut: sessionStorage.getItem('dashboardMocks:loggedOut') === '1',
  latency: 350,
};


type GuildsError = 'scope' | 'grant' | 'ratelimit' | 'refreshing' | null;


// ---- tag audit log (`GET /admin/tags/<id>/audit`) ----

// newest last, per tag; a tag's is made up from its listing the first time it's asked for
const tagAudit = new Map<string, Array<TagAuditEntry>>();
let auditCounter = 0;

function fakeSha256(seed: string): string {
  let hash = 0;
  let out = '';
  for (let i = 0; out.length < 64; i++) {
    hash = (Math.imul(hash ^ seed.charCodeAt(i % seed.length), 2654435761) + i) >>> 0;
    out += hash.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

function auditId(): string {
  auditCounter += 1;
  return String(Date.now() * 1000 + auditCounter);
}

// the api's `reason`/`notice` query params to the stored reason (null on things that aren't removals)
function removalFromQuery(query: URLSearchParams): {reason: TagAuditEntry['reason'], notice: string | null} {
  const reason = query.get('reason');
  return {
    reason: (reason === 'copyright') ? 1 : (reason === 'rules') ? 2 : 0,
    notice: (reason) ? (query.get('notice') || null) : null,
  };
}

function logAudit(tagId: string, entries: Array<Partial<TagAuditEntry> & Pick<TagAuditEntry, 'type'>>, actorId: string | null = mockUser.id) {
  const list = auditFor(tagId);
  const actionId = auditId();
  const ownerId = state.adminDirectory.find((item) => item.id === tagId)?.tag.user_id ?? null;
  for (const entry of entries) {
    list.push({
      action_id: actionId,
      actor_id: actorId,
      asset_id: null,
      created: new Date().toISOString(),
      details: {},
      directory_id: null,
      id: auditId(),
      notice: null,
      owner_id: ownerId,
      reason: null,
      tag_id: tagId,
      ...entry,
    });
  }
}

function auditFor(tagId: string): Array<TagAuditEntry> {
  let list = tagAudit.get(tagId);
  if (list) {
    return list;
  }
  list = [];
  tagAudit.set(tagId, list);
  const item = state.adminDirectory.find((other) => other.id === tagId);
  if (item) {
    const ownerId = item.tag.user_id ?? item.user?.id ?? null;
    const listed = new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString();
    for (const asset of item.assets ?? []) {
      list.push({
        action_id: `seed-${asset.id}`,
        actor_id: ownerId,
        asset_id: asset.id,
        created: listed,
        details: {
          kind: 1,
          extension: asset.metadata.extension,
          mimetype: asset.metadata.mimetype,
          sha256: asset.provenance?.sha256 ?? null,
          size: asset.metadata.size,
          source_url: asset.provenance?.source_url ?? null,
          uploaded_by: ownerId,
        },
        directory_id: tagId,
        id: auditId(),
        notice: null,
        owner_id: ownerId,
        reason: null,
        tag_id: tagId,
        type: 0,
      });
    }
    if (item.verified !== TagDirectoryVerificationStates.NOT_VERIFIED) {
      list.push({
        action_id: `seed-verify-${tagId}`,
        actor_id: ownerId,
        asset_id: null,
        created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        details: {from: 0, to: 1},
        directory_id: tagId,
        id: auditId(),
        notice: null,
        owner_id: ownerId,
        reason: null,
        tag_id: tagId,
        type: 3,
      });
    }
  }
  return list;
}

// the listings' media say where they came from (the owner uploaded them, some from a url)
for (const item of state.adminDirectory) {
  const ownerId = item.tag.user_id ?? item.user?.id ?? null;
  item.assets = (item.assets ?? []).map((asset, index) => ({
    ...asset,
    provenance: {
      created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      sha256: fakeSha256(asset.id),
      source_url: (index % 2) ? `https://cdn.discordapp.com/attachments/1/2/${asset.filename}` : null,
      uploaded_by: ownerId,
    },
  }));
}

state.reportMessages = createReportMessages(state.reports);
// every other fixture report stands in for the mock user's own (bug, message and tag ones), plus the ones they send
state.reports.forEach((report, index) => (index % 2 === 0) && state.ownReportIds.add(report.id));
for (const report of state.reports) {
  syncReportReplies(report, state.reportMessages.get(report.id) ?? []);
}


// errors carry their extra fields flat in the body, like notsobot.api's `ApiError(metadata=...)`
class MockError extends Error {
  constructor(readonly status: number, readonly code: number, message: string, readonly metadata?: Record<string, unknown>) {
    super(message);
  }
}


function json(status: number, body?: unknown): Response {
  if (status === 204 || body === undefined) {
    return new Response(null, {status});
  }
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
}


type Handler = (match: RegExpMatchArray, request: {method: string, query: URLSearchParams, body: Record<string, unknown>}) => unknown;

interface Route {
  method: string,
  pattern: RegExp,
  handler: Handler,
}

const routes: Array<Route> = [];
function route(method: string, pattern: string, handler: Handler) {
  routes.push({method, pattern: new RegExp(`^${pattern}$`), handler});
}


function findTag(tagId: string): Tag {
  const tag = state.tags.find((item) => item.id === tagId);
  if (!tag) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  return tag;
}

function findGuild(guildId: string) {
  const entry = state.guilds.find((item) => item.summary.id === guildId);
  if (!entry) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_SERVER, 'Unknown Server');
  }
  return entry;
}

function requireEditable(guildId: string, area: keyof ReturnType<typeof guildEditable>) {
  const entry = findGuild(guildId);
  if (!guildEditable(entry.summary)[area]) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Missing Access');
  }
  return entry;
}

function scopeIds(query: URLSearchParams | Record<string, unknown>): Record<TagStorageType, string | null> {
  const get = (key: string) => {
    const value = (query instanceof URLSearchParams) ? query.get(key) : query[key];
    return (value) ? String(value) : null;
  };
  const guildId = get('guild_id') || get('channel_id');
  return {0: get('user_id'), 1: get('channel_id'), 2: guildId, 3: '0'};
}


/* user */

function meUser(): UserMe {
  return {
    ...mockUser,
    ...((state.blocked !== null) ? {blocked: true, blocked_on: '2026-09-02T17:41:08.000Z', blocked_reason: state.blocked || null} : {}),
    flags: (state.owner) ? ((mockUser.flags | 1) & ~2) : (state.moderator) ? ((mockUser.flags | 2) & ~1) : (mockUser.flags & ~3),
  };
}

route('GET', '/users/@me', () => meUser());
route('GET', '/auth/logout', () => undefined);
route('GET', '/users/@me/settings', () => state.settings);
route('PATCH', '/users/@me/settings', (_match, { body }) => {
  const personality = body.ml_llm_personality;
  if (typeof personality === 'string' && 1024 < personality.length) {
    throw new MockError(400, 50001, 'Invalid Form Body', {errors: {ml_llm_personality: 'Too long'}});
  }
  if (body.file_upload_vanity === 'error') {
    throw new MockError(400, 50030, 'Invalid Vanity');
  }
  const { file_upload_name: _readOnly, ...writable } = body;
  state.settings = {...state.settings, ...writable};
  return state.settings;
});

// mirrors `utilities/tools/user_data.py` `export_user_data`, built from the other mocks' state
route('GET', '/users/@me/data/export', (): UserDataExport => {
  const tags = state.tags.filter((tag) => tag.user.id === mockUser.id);
  const ownTagIds = new Set(tags.map((tag) => tag.id));
  // theirs only: what tags keep for them (anyone's tag) and their own tags' global storage
  const isTheirs = (tagId: string, key: string) => key === `0:${mockUser.id}` || (key === '3:0' && ownTagIds.has(tagId));
  const storage = <T>(stored: Map<string, Map<string, T>>) => [...stored].flatMap(([ tagId, buckets ]) => [...buckets]
    .filter(([ key ]) => isTheirs(tagId, key))
    .map(([ key, value ]) => {
      const [ type, storageId ] = key.split(':');
      return {storage_id: storageId, storage_type: Number(type) as TagStorageType, tag_id: tagId, value};
    }));
  const usage = new Map<string, NonNullable<UserDataExport['command_usage']>[number]>();
  for (const use of state.commandUses) {
    const key = `${use.command_id}:${use.command_type}`;
    const entry = usage.get(key) ?? {command_id: use.command_id, command_type: use.command_type, first_used: use.timestamp, last_used: use.timestamp, uses: 0};
    entry.uses += 1;
    entry.first_used = (toDate(use.timestamp) < toDate(entry.first_used ?? use.timestamp)) ? use.timestamp : entry.first_used;
    entry.last_used = (toDate(entry.last_used ?? use.timestamp) < toDate(use.timestamp)) ? use.timestamp : entry.last_used;
    usage.set(key, entry);
  }
  const { items: premiumServers, ...premiumServersRest } = premiumServersPage();
  return {
    applications: state.applications.filter((application) => application.owner_id === mockUser.id).map(meApplication),
    command_usage: [...usage.values()].sort((a, b) => b.uses - a.uses),
    entitlements: state.entitlements
      .filter((entitlement) => entitlement.user?.id === mockUser.id)
      .map(({ external_id: _externalId, user: _user, ...entitlement }) => entitlement),
    files: state.files,
    llm: {
      memories: state.llmMemories.map(({ guild: _guild, ...memory }) => memory),
      responses: [{
        content: 'A group of flamingos is called a flamboyance.',
        created: new Date(Date.now() - 3 * 86400000).toISOString(),
        error: null,
        guild_id: guilds[0].summary.id,
        id: '1430000000000000001',
        model: 'CLAUDE_SONNET',
        parent_id: null,
        prompt: 'what is a group of flamingos called',
        prompt_file_count: 0,
        server_id: guilds[0].summary.id,
        tokens_input: 812,
        tokens_output: 14,
      }],
    },
    notes: [
      'Tokens are left out: your API applications\' tokens, the website\'s login sessions and its access to your Discord account. Anyone with one of them could act as you.',
      'Uploaded files, tag assets and voice clips are listed with their details and links, not their contents.',
    ],
    premium_servers: {...premiumServersRest, items: premiumServers.map(({ guild: _guild, ...server }) => server)},
    reminders: state.reminders,
    reports: ownReports().map((report) => {
      const { unread: _unread, ...payload } = ownReportPayload(report);
      const messages = (state.reportMessages.get(report.id) ?? []).map(({ author_id: _authorId, ...message }) => message);
      return {...payload, messages};
    }),
    sessions: [{id: '1290000000000000500', user_agent: navigator.userAgent.slice(0, 128)}],
    settings: state.settings,
    tag_storage: {
      blobs: storage(state.blobs),
      variables: storage(state.variables).flatMap(({ value, ...scope }) => Object.entries(value).map(([ name, item ]) => ({...scope, name, value: item}))),
    },
    tags: tags.map(({ user: _user, directory: _directory, ...tag }) => {
      const listing = state.directory.get(tag.id);
      const reference = tag.reference_tag;
      return {
        ...tag,
        assets: [],
        directory: (listing) ? {
          category: listing.category,
          content_public: listing.content_public,
          created: listing.created,
          description: listing.description,
          edited: listing.edited,
          title: listing.title,
          verified: listing.verified,
        } : null,
        reference_tag: (reference && reference.user.id !== mockUser.id) ? {...reference, content: ''} : reference,
      };
    }),
    timestamp: Date.now(),
    user: meUser(),
    version: 1,
    voices: state.voices.filter((voice) => voice.user?.id === mockUser.id).map(meVoice),
  };
});
// 204, the dashboard logs out right after (nothing is reset here, the mock state comes back on reload anyway)
route('DELETE', '/users/@me', () => {});


/* tags */

route('GET', '/users/@me/tags', (_match, { query }) => {
  const needle = (query.get('query') || '').toLowerCase();
  const before = query.get('before');
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 100));
  const newest = (a: Tag, b: Tag) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1;
  // `uses_<period>`: made-up uses in that window (`mockRecentUses`), the api counts them in clickhouse
  const recentDays = MOCK_RECENT_USES_DAYS[query.get('sort_by') || ''];
  const recent = (tag: Tag) => mockRecentUses(tag.id, tag.uses, recentDays ?? 0);
  const sorters: Record<string, (a: Tag, b: Tag) => number> = {
    newest,
    oldest: (a, b) => newest(b, a),
    uses: (a, b) => b.uses - a.uses || newest(a, b),
    uses_week: (a, b) => recent(b) - recent(a) || newest(a, b),
    uses_month: (a, b) => recent(b) - recent(a) || newest(a, b),
    uses_year: (a, b) => recent(b) - recent(a) || newest(a, b),
    name: (a, b) => a.name.localeCompare(b.name) || newest(b, a),
    last_used: (a, b) => (b.last_used ? Date.parse(b.last_used) : -Infinity) - (a.last_used ? Date.parse(a.last_used) : -Infinity) || newest(a, b),
  };
  const directory = query.get('directory');
  const verified = query.get('directory_verified');
  const serverId = query.get('server_id');
  const matching = state.tags
    .filter((tag) => !serverId || tag.server_id === serverId)
    .filter((tag) => !needle || tag.name.includes(needle) || tag.content.toLowerCase().includes(needle))
    .filter((tag) => {
      const listing = state.directory.get(tag.id);
      if (verified !== null) {
        return listing?.verified === Number(verified);
      }
      return directory === null || !!listing === (directory === 'true');
    })
    .sort(sorters[query.get('sort_by') || 'newest'] ?? newest);
  const items = matching
    .filter((tag) => !before || BigInt(tag.id) < BigInt(before))
    .slice(offset, offset + limit)
    .map((tag) => {
      const listing = state.directory.get(tag.id);
      return {
        ...tag,
        directory: (listing) ? {title: listing.title, verified: listing.verified} : null,
        ...((recentDays) ? {recent_uses: recent(tag)} : {}),
      };
    });
  return {count: matching.length, items};
});

// a steady made-up share of a tag's uses for the recent-uses sorts (`uses_week`, `TagDirectorySortByFilters.USES_WEEK`...)
const MOCK_RECENT_USES_DAYS: Record<string, number> = {uses_week: 7, uses_month: 30, uses_year: 365, 6: 7, 7: 30, 8: 365};

function mockRecentUses(tagId: string, uses: number, days: number): number {
  if (!days) {
    return 0;
  }
  const weight = Number(BigInt(tagId) % 7n + 1n) / 7;
  return Math.round(uses * Math.min(days / 365, 1) * weight);
}

route('GET', '/users/@me/tags/(\\d+)', ([ , tagId ]) => findTag(tagId));

route('PATCH', '/users/@me/tags/(\\d+)', ([ , tagId ], { body }) => {
  const tag = findTag(tagId);
  if (tag.locked) {
    throw new MockError(400, ApiErrorCodes.TAG_LOCKED, 'Tag cannot be updated currently');
  }
  if (typeof body.name === 'string') {
    const name = body.name.toLowerCase().replace(/[\r\n]/g, '');
    if (!name || 64 < name.length) {
      throw new MockError(400, 50001, 'Tag name must be between 1 and 64 characters');
    }
    if (state.tags.some((other) => other.id !== tag.id && other.name === name && other.server_id === tag.server_id)) {
      throw new MockError(400, ApiErrorCodes.TAG_NAME_TAKEN, 'Tag name is already taken here');
    }
    tag.name = name;
  }
  if (typeof body.content === 'string') {
    if (2000 < body.content.length) {
      throw new MockError(400, 50001, 'Tag content must be 2000 characters or fewer');
    }
    if (body.content !== tag.content) {
      tag.content = body.content;
      tag.edited = new Date().toISOString();
    }
  }
  if (typeof body.nsfw === 'boolean') {
    tag.nsfw = body.nsfw;
  }
  return tag;
});

// ---- directory listing (mirrors utilities/tools/tags.py publish/edit rules) ----

type DirectoryFields = {title?: string, description?: string, category?: TagDirectoryCategory, content_public?: boolean};

const CATEGORY_VALUES: ReadonlyArray<number> = Object.values(TagDirectoryCategories);

// `null`/missing is no filter, anything else has to be a known category like the api's enum validator
function parseCategory(value: unknown): TagDirectoryCategory | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const category = Number(value);
  if (!CATEGORY_VALUES.includes(category)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `category must be one of ${CATEGORY_VALUES.join(', ')}`, {field: 'category'});
  }
  return category as TagDirectoryCategory;
}

function directoryItem(tag: Tag, fields: DirectoryFields, verified: number = TagDirectoryVerificationStates.NOT_VERIFIED): TagDirectoryItem {
  const contentPublic = !!fields.content_public;
  return {
    assets: [],
    category: fields.category ?? TagDirectoryCategories.OTHER,
    content_public: contentPublic,
    created: new Date().toISOString(),
    description: fields.description ?? '',
    edited: null,
    id: tag.id,
    server_count: 0,
    tag: {...tag, content: (contentPublic) ? tag.content : '', guild_id: null},
    thumbnail: null,
    title: fields.title ?? '',
    verified,
  };
}

// a few of the personal tags start out listed: one unverified, one under review and one verified (for change requests)
const SEED_LISTINGS = [
  {title: 'Says hello back', description: 'Replies with a friendly hello. Pass text to add it after the greeting.', category: TagDirectoryCategories.GAMES, verified: TagDirectoryVerificationStates.NOT_VERIFIED},
  {title: 'Pong, but slower', description: '', category: TagDirectoryCategories.UTILITY, verified: TagDirectoryVerificationStates.PENDING_VERIFICATION},
  {title: 'Rolls the dice', description: 'Rolls dice with modifiers, like 2d6+3.', category: TagDirectoryCategories.GAMES, verified: TagDirectoryVerificationStates.VERIFIED},
];
state.tags.filter((tag) => tag.server_id === mockUser.id).slice(0, SEED_LISTINGS.length).forEach((tag, i) => {
  const { verified, ...fields } = SEED_LISTINGS[i];
  state.directory.set(tag.id, directoryItem(tag, fields, verified));
  if (verified !== TagDirectoryVerificationStates.NOT_VERIFIED) {
    tag.locked = true;
  }
});
// the ones under review (or verified) already have a file, so the media editor has something to move around
[...state.directory.values()].filter((item) => item.verified !== TagDirectoryVerificationStates.NOT_VERIFIED).forEach((item) => {
  item.assets = sampleDirectoryAssets(item.id, item.tag.name, 1);
});

function directoryFields(body: Record<string, unknown>) {
  const fields: DirectoryFields = {};
  if (typeof body.content_public === 'boolean') {
    fields.content_public = body.content_public;
  }
  fields.category = parseCategory(body.category);
  if (typeof body.title === 'string') {
    if (128 < body.title.length) {
      throw new MockError(400, 50001, 'Title must be 128 characters or fewer');
    }
    fields.title = body.title;
  }
  if (typeof body.description === 'string') {
    if (2000 < body.description.length) {
      throw new MockError(400, 50001, 'Description must be 2000 characters or fewer');
    }
    fields.description = body.description;
  }
  return fields;
}

// mirrors `check_can_verify_tag_directory`
function checkCanVerify(description: string | null, category: number | null) {
  if (!description?.trim()) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_DESCRIPTION, 'A description is required for verification');
  }
  if (!category || category === TagDirectoryCategories.OTHER) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_CATEGORY, 'A category is required for verification');
  }
}

function editDirectory(item: TagDirectoryItem, fields: DirectoryFields) {
  if ((fields.title !== undefined || fields.description !== undefined || fields.category !== undefined) && item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_PENDING_VERIFICATION, 'Cannot edit a tag that is currently undergoing verification');
  }
  if ((fields.description !== undefined || fields.category !== undefined) && item.verified === TagDirectoryVerificationStates.VERIFIED) {
    checkCanVerify(fields.description ?? item.description, fields.category ?? item.category);
  }
  // showing/hiding the content is allowed while under review, the listing's text isn't
  if (fields.content_public !== undefined) {
    item.content_public = fields.content_public;
    const source = state.tags.find((tag) => tag.id === item.id);
    item.tag.content = (item.content_public && source) ? source.content : '';
  }
  const changed = (fields.title !== undefined && fields.title !== item.title) || (fields.description !== undefined && fields.description !== item.description) ||
    (fields.category !== undefined && fields.category !== item.category);
  const { title, description, category } = fields;
  Object.assign(item, Object.fromEntries(Object.entries({title, description, category}).filter(([ , value ]) => value !== undefined)));
  if (changed) {
    item.edited = new Date().toISOString();
  }
  return item;
}

route('GET', '/users/@me/tags/(\\d+)/directory', ([ , tagId ]) => {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  return item;
});

route('PUT', '/users/@me/tags/(\\d+)/directory', ([ , tagId ], { body }) => {
  const tag = findTag(tagId);
  const fields = directoryFields(body);
  const existing = state.directory.get(tagId);
  if (existing) {
    return editDirectory(existing, fields);
  }
  if (tag.reference_tag) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS, 'Cannot publish a tag alias or a tag from the tag directory');
  }
  if (state.tags.some((other) => other.id !== tag.id && other.server_id === mockUser.id && other.name === tag.name)) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_NAME_TAKEN, 'Already have a tag in the directory with that name');
  }
  // publishing moves the tag into the owner's personal tags
  tag.server_id = mockUser.id;
  tag.guild_id = null;
  tag.is_on_directory = true;
  const item = directoryItem(tag, fields);
  state.directory.set(tagId, item);
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory', ([ , tagId ], { body }) => {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  return editDirectory(item, directoryFields(body));
});

// mirrors `utilities/tools/tag_assets.py`: the owner changes the listing's media only while it's pending, each call answers
// with the listing. Uploads are served from an object url so they show up.
function findOwnPendingListing(tagId: string): TagDirectoryItem {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (item.verified !== TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ASSETS_REQUIRE_PENDING, 'Assets can only be changed while the listing is pending verification');
  }
  return item;
}

function findListingAsset(item: TagDirectoryItem, assetId: string) {
  const asset = item.assets.find((other) => other.id === assetId);
  if (!asset) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET, 'Unknown Tag Directory Asset');
  }
  return asset;
}

function renumberAssets(item: TagDirectoryItem) {
  item.assets = item.assets.map((asset, position) => ({...asset, position}));
}

route('POST', '/users/@me/tags/(\\d+)/directory/assets', ([ , tagId ], { body }) => {
  const item = findOwnPendingListing(tagId);
  if (TAG_DIRECTORY_ASSETS_MAX <= item.assets.length) {
    throw new MockError(400, ApiErrorCodes.MAX_TAG_DIRECTORY_ASSETS, `Tag directory listing has reached the asset limit (${TAG_DIRECTORY_ASSETS_MAX})`, {limit: TAG_DIRECTORY_ASSETS_MAX});
  }
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video|audio)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'File must be an image, video, or audio', {mimetype: file?.type});
  }
  if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
    throw new MockError(400, ApiErrorCodes.FILE_TOO_LARGE, 'File too large');
  }
  const extension = (/\.([a-z0-9]{1,12})$/i.exec(file.name)?.[1] ?? 'bin').toLowerCase();
  const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  item.assets.push({
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype: file.type, size: file.size, width: 0},
    position: item.assets.length,
    urls: {cdn: URL.createObjectURL(file)},
  });
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory/assets/(\\d+)', ([ , tagId, assetId ], { body }) => {
  const item = findOwnPendingListing(tagId);
  const asset = findListingAsset(item, assetId);
  const position = Number(body.position);
  if (!Number.isInteger(position) || position < 0 || TAG_DIRECTORY_ASSETS_MAX <= position) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Invalid Form Body', {field: 'position'});
  }
  const rest = item.assets.filter((other) => other.id !== assetId);
  rest.splice(Math.min(position, rest.length), 0, asset);
  item.assets = rest;
  renumberAssets(item);
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/assets/(\\d+)', ([ , tagId, assetId ]) => {
  const item = findOwnPendingListing(tagId);
  findListingAsset(item, assetId);
  item.assets = item.assets.filter((other) => other.id !== assetId);
  renumberAssets(item);
  return item;
});

// the real api shrinks it to a png (a video's first frame), the mock just shows the file
route('PUT', '/users/@me/tags/(\\d+)/directory/thumbnail', ([ , tagId ], { body }) => {
  const item = findOwnPendingListing(tagId);
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'Thumbnail must be an image or video', {mimetype: file?.type});
  }
  if (TAG_DIRECTORY_ASSET_SIZE_MAX < file.size) {
    throw new MockError(400, ApiErrorCodes.FILE_TOO_LARGE, 'File too large');
  }
  const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  item.thumbnail = {id, urls: {cdn: URL.createObjectURL(file)}};
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/thumbnail', ([ , tagId ]) => {
  const item = findOwnPendingListing(tagId);
  item.thumbnail = null;
  return item;
});

// mirrors `utilities/tools/tag_directory_edit_requests.py`: a verified listing's change request, each call answers with
// the listing (`edit_request` included). Uploads are served from an object url so they show up.
const EDIT_DRAFT = 0;
const EDIT_PENDING = 1;
const EDIT_APPROVED = 2;
const EDIT_REJECTED = 3;

function mockId() {
  return String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

function findOwnListing(tagId: string): TagDirectoryItem {
  findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  return item;
}

function openEditRequest(item: TagDirectoryItem, draftOnly = false): TagDirectoryEditRequest {
  const request = item.edit_request;
  if (!request || (request.status !== EDIT_DRAFT && request.status !== EDIT_PENDING)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST, 'Unknown Change Request');
  }
  if (draftOnly && request.status !== EDIT_DRAFT) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_DRAFT, 'The change request can only be changed while it\'s a draft');
  }
  return request;
}

function touchEditRequest(request: TagDirectoryEditRequest) {
  request.edited = new Date().toISOString();
  request.assets = request.assets.map((asset, position) => ({...asset, position}));
}

route('PUT', '/users/@me/tags/(\\d+)/directory/edit-request', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  if (item.verified !== TagDirectoryVerificationStates.VERIFIED) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_REQUIRES_VERIFIED, 'Only verified listings can request changes');
  }
  const current = item.edit_request;
  if (!current || (current.status !== EDIT_DRAFT && current.status !== EDIT_PENDING)) {
    item.edit_request = {
      assets: item.assets.map((asset) => ({...asset, is_new: false})),
      content: null,
      created: new Date().toISOString(),
      edited: null,
      id: mockId(),
      note: '',
      reason: null,
      reviewed: null,
      status: EDIT_DRAFT,
      submitted: null,
      thumbnail: null,
      thumbnail_mode: 0,
    };
  }
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory/edit-request', ([ , tagId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  if ('content' in body) {
    const content = (typeof body.content === 'string') ? body.content : null;
    request.content = (content === null || content === findTag(tagId).content) ? null : content;
  }
  if (typeof body.note === 'string') {
    request.note = body.note;
  }
  if (body.thumbnail_mode !== undefined && body.thumbnail_mode !== null) {
    request.thumbnail_mode = Number(body.thumbnail_mode);
    request.thumbnail = null;
  }
  touchEditRequest(request);
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/edit-request', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  openEditRequest(item);
  item.edit_request = null;
  return item;
});

route('POST', '/users/@me/tags/(\\d+)/directory/edit-request/submit', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  const mediaChanged = request.assets.map((asset) => asset.id).join() !== item.assets.map((asset) => asset.id).join();
  if (request.content === null && request.thumbnail_mode === 0 && !mediaChanged) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NO_CHANGES, 'The change request doesn\'t change anything yet');
  }
  request.status = EDIT_PENDING;
  request.submitted = new Date().toISOString();
  return item;
});

route('POST', '/users/@me/tags/(\\d+)/directory/edit-request/withdraw', ([ , tagId ]) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item);
  if (request.status !== EDIT_PENDING) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_PENDING, 'The change request isn\'t waiting for review');
  }
  request.status = EDIT_DRAFT;
  request.submitted = null;
  return item;
});

route('POST', '/users/@me/tags/(\\d+)/directory/edit-request/assets', ([ , tagId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  if (TAG_DIRECTORY_ASSETS_MAX <= request.assets.length) {
    throw new MockError(400, ApiErrorCodes.MAX_TAG_DIRECTORY_ASSETS, `Tag directory listing has reached the asset limit (${TAG_DIRECTORY_ASSETS_MAX})`, {limit: TAG_DIRECTORY_ASSETS_MAX});
  }
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video|audio)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'File must be an image, video, or audio', {mimetype: file?.type});
  }
  const extension = (/\.([a-z0-9]{1,12})$/i.exec(file.name)?.[1] ?? 'bin').toLowerCase();
  const id = mockId();
  request.assets.push({
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    is_new: true,
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype: file.type, size: file.size, width: 0},
    position: request.assets.length,
    urls: {cdn: URL.createObjectURL(file)},
  });
  touchEditRequest(request);
  return item;
});

route('PATCH', '/users/@me/tags/(\\d+)/directory/edit-request/assets/(\\d+)', ([ , tagId, assetId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  const asset = request.assets.find((other) => other.id === assetId);
  if (!asset) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET, 'Unknown Tag Directory Asset');
  }
  const rest = request.assets.filter((other) => other.id !== assetId);
  rest.splice(Math.min(Number(body.position), rest.length), 0, asset);
  request.assets = rest;
  touchEditRequest(request);
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/edit-request/assets/(\\d+)', ([ , tagId, assetId ]) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  if (!request.assets.some((other) => other.id === assetId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET, 'Unknown Tag Directory Asset');
  }
  request.assets = request.assets.filter((other) => other.id !== assetId);
  touchEditRequest(request);
  return item;
});

route('PUT', '/users/@me/tags/(\\d+)/directory/edit-request/thumbnail', ([ , tagId ], { body }) => {
  const item = findOwnListing(tagId);
  const request = openEditRequest(item, true);
  const file = (body.file instanceof File) ? body.file : null;
  if (!file || !/^(image|video)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'Thumbnail must be an image or video', {mimetype: file?.type});
  }
  request.thumbnail = {id: mockId(), urls: {cdn: URL.createObjectURL(file)}};
  request.thumbnail_mode = 1;
  touchEditRequest(request);
  return item;
});

function pendingEditRequest(tagId: string): [TagDirectoryItem, TagDirectoryEditRequest] {
  const item = state.directory.get(tagId);
  const request = item?.edit_request;
  if (!item || !request || request.status !== EDIT_PENDING) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST, 'Unknown Change Request');
  }
  return [item, request];
}

route('POST', '/admin/tags/directory/(\\d+)/edit-request/approve', ([ , tagId ]) => {
  requireStaff();
  const [ item, request ] = pendingEditRequest(tagId);
  if (request.content !== null) {
    const source = findTag(tagId);
    source.content = request.content;
    item.tag.content = (item.content_public) ? request.content : '';
  }
  item.assets = request.assets.map(({ is_new: _isNew, ...asset }, position) => ({...asset, position}));
  if (request.thumbnail_mode === 1) {
    item.thumbnail = request.thumbnail;
  } else if (request.thumbnail_mode === 2) {
    item.thumbnail = null;
  }
  item.edited = new Date().toISOString();
  item.edit_request = {...request, assets: [], status: EDIT_APPROVED, reviewed: new Date().toISOString(), thumbnail: null};
  return ownListingAsAdmin(item);
});

route('POST', '/admin/tags/directory/(\\d+)/edit-request/reject', ([ , tagId ], { body }) => {
  requireStaff();
  const [ item, request ] = pendingEditRequest(tagId);
  const reason = (typeof body.reason === 'string' && body.reason) ? body.reason : null;
  item.edit_request = {...request, assets: [], status: EDIT_REJECTED, reason, reviewed: new Date().toISOString(), thumbnail: null};
  return ownListingAsAdmin(item);
});

// mirrors `request_tag_directory_verification`/`cancel_tag_directory_verification`, the tag is locked while pending
route('POST', '/users/@me/tags/(\\d+)/directory/verify', ([ , tagId ]) => {
  const tag = findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (item.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ALREADY_PENDING, 'Already Pending Verification');
  }
  if (item.verified === TagDirectoryVerificationStates.VERIFIED) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ALREADY_VERIFIED, 'Already Verified');
  }
  checkCanVerify(item.description, item.category);
  item.verified = TagDirectoryVerificationStates.PENDING_VERIFICATION;
  tag.locked = true;
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)/directory/verify', ([ , tagId ]) => {
  const tag = findTag(tagId);
  const item = state.directory.get(tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (item.verified === TagDirectoryVerificationStates.VERIFIED) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_CANNOT_UNVERIFY_VERIFIED, 'Cannot unverify a verified tag directory item');
  }
  if (item.verified !== TagDirectoryVerificationStates.PENDING_VERIFICATION) {
    throw new MockError(400, ApiErrorCodes.TAG_DIRECTORY_ALREADY_UNVERIFIED, 'Already Unverified');
  }
  item.verified = TagDirectoryVerificationStates.NOT_VERIFIED;
  tag.locked = false;
  return item;
});

route('DELETE', '/users/@me/tags/(\\d+)', ([ , tagId ]) => {
  findTag(tagId);
  state.tags = state.tags.filter((tag) => tag.id !== tagId);
  return undefined;
});

route('GET', '/users/@me/tags/(\\d+)/variables', ([ , tagId ], { query }) => {
  findTag(tagId);
  const stored = state.variables.get(tagId);
  const ids = scopeIds(query);
  const response = emptyVariables();
  for (const type of [0, 1, 2, 3] as const) {
    const id = ids[type];
    if (id && stored?.has(`${type}:${id}`)) {
      response[type] = {...stored.get(`${type}:${id}`)};
    }
  }
  return response;
});

route('PUT', '/users/@me/tags/(\\d+)/variables/(\\d)/(\\d+)', ([ , tagId, type, id ], { body }) => {
  findTag(tagId);
  const storageId = (type === '3') ? '0' : id;
  // like the API's pydantic models (str_strip_whitespace)
  const name = String(body.name || '').trim();
  const value = String(body.value ?? '').trim();
  if (!name || 128 < name.length) {
    throw new MockError(400, 50001, 'Variable name must be between 1 and 128 characters');
  }
  if (16 * 1024 < value.length) {
    throw new MockError(400, 50001, 'Variable value must be 16384 characters or fewer');
  }
  const stored = state.variables.get(tagId) ?? new Map<string, Record<string, string>>();
  state.variables.set(tagId, stored);
  const bucket = stored.get(`${type}:${storageId}`) ?? {};
  if (value) {
    if (!(name in bucket) && 5 <= Object.keys(bucket).length) {
      throw new MockError(400, 30010, 'Variables exceeded max amount (5)', {limit: 5});
    }
    bucket[name] = value;
  } else {
    delete bucket[name];
  }
  stored.set(`${type}:${storageId}`, bucket);
  return {name, storage_id: storageId, storage_type: Number(type), value};
});

route('DELETE', '/users/@me/tags/(\\d+)/variables/(\\d)/(\\d+)', ([ , tagId, type, id ], { query }) => {
  findTag(tagId);
  const storageId = (type === '3') ? '0' : id;
  const bucket = state.variables.get(tagId)?.get(`${type}:${storageId}`);
  if (bucket) {
    delete bucket[query.get('name') || ''];
  }
  return undefined;
});

route('GET', '/users/@me/tags/(\\d+)/blobs', ([ , tagId ], { query }) => {
  findTag(tagId);
  const stored = state.blobs.get(tagId);
  const ids = scopeIds(query);
  const response = emptyBlobs();
  for (const type of [0, 1, 2, 3] as const) {
    const id = ids[type];
    if (id) {
      response[type] = stored?.get(`${type}:${id}`) ?? null;
    }
  }
  return response;
});

route('PUT', '/users/@me/tags/(\\d+)/blobs', ([ , tagId ], { body }) => {
  findTag(tagId);
  const ids = scopeIds(body);
  const stored = state.blobs.get(tagId) ?? new Map<string, string>();
  state.blobs.set(tagId, stored);
  const response = emptyBlobs();
  for (const type of [0, 1, 2, 3] as const) {
    if (ids[type]) {
      stored.delete(`${type}:${ids[type]}`);
    }
  }
  for (const blob of (body.blobs as Array<{storage_id: string, storage_type: TagStorageType, value: string}>) || []) {
    if (!blob.value) {
      continue;
    }
    if (256 * 1024 < atob(blob.value).length) {
      throw new MockError(400, 50010, 'Blob exceeded 256kb', {max_size: 256 * 1024});
    }
    const storageId = (blob.storage_type === 3) ? '0' : String(blob.storage_id);
    stored.set(`${blob.storage_type}:${storageId}`, blob.value);
    response[blob.storage_type] = blob.value;
  }
  return response;
});


/* servers */

function throwGuildsError() {
  switch (state.guildsError) {
    case 'grant':
      throw new MockError(401, ApiErrorCodes.DISCORD_OAUTH_ERROR, 'Discord OAuth grant is invalid');
    case 'ratelimit':
      throw new MockError(429, ApiErrorCodes.DISCORD_RATELIMITED, 'Discord is rate limiting requests');
    case 'refreshing':
      throw new MockError(503, ApiErrorCodes.EXTERNAL_SERVICE_TIMEOUT, 'Token refresh in progress');
  }
}

function guildDetail(guildId: string) {
  const entry = findGuild(guildId);
  return {...entry.detail, owner: entry.summary.owner, permissions: entry.summary.permissions, editable: guildEditable(entry.summary)};
}

function requireOwner(guildId: string) {
  const entry = findGuild(guildId);
  if (!entry.summary.owner) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Only the server owner can do this');
  }
  return entry;
}

// `/admin/guilds/<id>/...` reuse the routes below: any server, every area editable (staff only)
function findAdminGuild(guildId: string) {
  requireStaff();
  const item = state.adminGuilds.find((other) => other.entry.summary.id === guildId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_SERVER, 'Unknown Server');
  }
  return item;
}

// looking is for any staff
function scopedGuildRead(scope: string, guildId: string) {
  return (scope === 'admin') ? findAdminGuild(guildId).entry : findGuild(guildId);
}

function scopedGuild(scope: string, guildId: string, area: keyof ReturnType<typeof guildEditable>) {
  if (scope === 'admin') {
    // editing any server is owners only
    requireBotOwner();
    return findAdminGuild(guildId).entry;
  }
  return requireEditable(guildId, area);
}

// servers the mock user can manage that the bot isn't in
const ADDABLE_GUILDS: Array<UserGuildSummary> = [
  {can_manage: true, icon: null, id: '1300000000000000901', name: 'Weekend Raid Group', owner: true, permissions: '2251799813685247'},
  {can_manage: true, icon: null, id: '1300000000000000902', name: 'Pixel Art Club', owner: false, permissions: '32'},
];

route('GET', '/users/@me/guilds', () => {
  throwGuildsError();
  const guilds = state.guilds.map((entry) => entry.summary);
  // without the scope it's the servers the bot has seen them in, so some are missing
  if (state.guildsError === 'scope') {
    return {addable: [], complete: false, guilds: guilds.filter((_, index) => index % 2 === 0)};
  }
  return {addable: ADDABLE_GUILDS, complete: true, guilds};
});

route('GET', '/users/@me/guilds/(\\d+)', ([ , guildId ]) => {
  throwGuildsError();
  return guildDetail(guildId);
});

const ADMIN_BYPASS_SETTINGS = ['rules_admin_bypass'] as const;

// null resets one to true
function applyAdminBypassSettings(detail: {settings: UserGuild['settings']}, body: Record<string, unknown>) {
  for (const key of ADMIN_BYPASS_SETTINGS) {
    if (key in body) {
      detail.settings[key] = (body[key] === null) ? true : !!body[key];
    }
  }
}

// `GuildWarningAuto` in the api's guild validators: one rule per trigger and channel, sorted by trigger, server-wide first
function applyWarningsAuto(detail: {settings: UserGuild['settings']}, body: Record<string, unknown>) {
  if (!('warnings_auto' in body)) {
    return;
  }
  const rules = (body.warnings_auto as UserGuild['settings']['warnings_auto'] | null) || [];
  const invalid = (message: string) => new MockError(400, 50001, 'Invalid Form Body', {errors: {warnings_auto: message}});
  if (20 < rules.length) {
    throw invalid('Up to 20 rules');
  }
  const keys = new Set<string>();
  for (const rule of rules) {
    const integer = (value: unknown, max: number) => Number.isInteger(value) && 1 <= (value as number) && (value as number) <= max;
    if ((rule.trigger !== 'mentions' && rule.trigger !== 'blocked_command') || !integer(rule.warnings, 10) || (rule.channel_id !== null && !/^\d{15,21}$/.test(rule.channel_id))) {
      throw invalid('Invalid rule');
    }
    if (rule.trigger === 'mentions' && !integer(rule.limit, 50)) {
      throw invalid('A mentions rule needs a limit');
    }
    const key = `${rule.trigger}:${rule.channel_id}`;
    if (keys.has(key)) {
      throw invalid('Each auto-warn trigger can only have one rule per channel');
    }
    keys.add(key);
  }
  detail.settings.warnings_auto = rules
    .map((rule) => ({channel_id: rule.channel_id, limit: (rule.trigger === 'mentions') ? rule.limit : null, trigger: rule.trigger, warnings: rule.warnings}))
    .sort((x, y) => x.trigger.localeCompare(y.trigger) || Number(x.channel_id !== null) - Number(y.channel_id !== null) || Number(BigInt(x.channel_id ?? 0) - BigInt(y.channel_id ?? 0)));
}

route('PATCH', '/users/@me/guilds/(\\d+)', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'settings');
  if (ADMIN_BYPASS_SETTINGS.some((key) => key in body)) {
    requireEditable(guildId, 'rules_admin');
  }
  const settingsKeys = ['ml_diffusion_model', 'ml_llm_model', 'ml_llm_personality', 'response_display', 'search_provider_images', 'search_provider_web', 'warnings_expire'] as const;
  if ('warnings_actions' in body) {
    // the api sorts the ladder, null turns it off
    detail.settings.warnings_actions = [...((body.warnings_actions as UserGuild['settings']['warnings_actions'] | null) || [])].sort((x, y) => x.threshold - y.threshold);
  }
  applyWarningsAuto(detail, body);
  for (const key of settingsKeys) {
    if (key in body) {
      (detail.settings as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  if ('warnings_window' in body) {
    // null resets it to 30 days
    detail.settings.warnings_window = (body.warnings_window as number | null) ?? 30 * 24 * 60 * 60;
  }
  applyAdminBypassSettings(detail, body);
  if ('locale' in body) {
    detail.locale = (body.locale as string | null) || null;
  }
  if ('timezone' in body) {
    detail.timezone = (body.timezone as string | null) || null;
  }
  return guildDetail(guildId);
});

route('PUT', '/(users/@me|admin)/guilds/(\\d+)/prefixes', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'prefixes');
  const prefix = String(body.prefix || '').trim();
  if (!prefix || 128 < prefix.length) {
    throw new MockError(400, 50001, 'Prefix must be between 1 and 128 characters');
  }
  if (5 <= detail.prefixes.length) {
    throw new MockError(400, 30006, 'Guild has reached the prefix limit (5)', {limit: 5});
  }
  if (!detail.prefixes.some((item) => item.prefix === prefix)) {
    detail.prefixes.push({added: new Date().toISOString(), guild_id: guildId, prefix, user_id: mockUser.id});
  }
  return detail.prefixes;
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/prefixes/delete', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'prefixes');
  detail.prefixes = detail.prefixes.filter((item) => item.prefix !== body.prefix);
  return detail.prefixes;
});

const MAX_MOCK_RULES = 500;

function ruleCoversEverything(rule: {category?: string | null, command?: string | null}): boolean {
  return !rule.command && !rule.category;
}

// rules covering everything and turning off the admin bypass need administrator, like the API
function requireRulesAdmin(scope: string, guildId: string, needed: boolean) {
  if (needed && scope !== 'admin') {
    requireEditable(guildId, 'rules_admin');
  }
}

route('PUT', '/(users/@me|admin)/guilds/(\\d+)/rules', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'rules');
  const items = (Array.isArray(body.rules)) ? body.rules as Array<GuildRuleInput> : [];
  if (!items.length) {
    throw new MockError(400, 50001, 'Invalid Form Body');
  }
  requireRulesAdmin(scope, guildId, items.some((item) => ruleCoversEverything(item) || item.admin_bypass !== undefined));
  for (const item of items) {
    if (item.command === 'notacommand') {
      throw new MockError(404, 10005, 'Unknown Command');
    }
    const existing = detail.rules.find((rule) => {
      return rule.target_type === item.target_type && rule.target_id === item.target_id && rule.command === (item.command ?? null) && rule.category === (item.category ?? null);
    });
    const value = {allow: item.value.allow, message: (item.value.allow) ? null : item.value.message || null};
    if (existing) {
      existing.value = value;
      if (item.admin_bypass !== undefined) {
        existing.admin_bypass = item.admin_bypass;
      }
    } else {
      if (MAX_MOCK_RULES <= detail.rules.length) {
        throw new MockError(400, 30024, `Reached Max Rules (${MAX_MOCK_RULES})`, {limit: MAX_MOCK_RULES});
      }
      detail.rules.push(mockRule({...item, allow: value.allow, message: value.message}));
    }
  }
  return detail.rules;
});

route('PATCH', '/(users/@me|admin)/guilds/(\\d+)/rules/(\\d+)', ([ , scope, guildId, ruleId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'rules');
  const rule = detail.rules.find((item) => item.id === ruleId);
  if (!rule) {
    throw new MockError(404, 10026, 'Unknown Rule');
  }
  requireRulesAdmin(scope, guildId, ruleCoversEverything(rule) || 'admin_bypass' in body);
  if ('admin_bypass' in body) {
    rule.admin_bypass = (typeof body.admin_bypass === 'boolean') ? body.admin_bypass : null;
  }
  if (body.value && typeof body.value === 'object') {
    const value = body.value as GuildRule['value'];
    rule.value = {allow: !!value.allow, message: (value.allow) ? null : value.message || null};
  }
  return detail.rules;
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/rules/delete', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'rules');
  const ids = new Set((Array.isArray(body.ids)) ? body.ids as Array<string> : []);
  requireRulesAdmin(scope, guildId, detail.rules.some((rule) => ids.has(rule.id) && ruleCoversEverything(rule)));
  detail.rules = detail.rules.filter((rule) => !ids.has(rule.id));
  return detail.rules;
});

route('PUT', '/users/@me/guilds/(\\d+)/loggers', ([ , guildId ], { body }) => {
  const { detail } = requireEditable(guildId, 'loggers');
  const channelId = String(body.channel_id);
  const type = Number(body.type);
  if (String(body.webhook_token).includes('invalid')) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Unknown Webhook', {field: 'webhook_id'});
  }
  if (detail.loggers.some((item) => item.type === type && item.channel_id !== channelId)) {
    throw new MockError(400, 50019, 'Channels cannot share the same logging type');
  }
  detail.loggers = detail.loggers.filter((item) => !(item.channel_id === channelId && item.type === type));
  detail.loggers.push({
    added: new Date().toISOString(),
    channel_id: channelId,
    disabled_events: Number(body.disabled_events) || 0,
    guild_id: guildId,
    type,
    user_id: mockUser.id,
  });
  return detail.loggers;
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/loggers/delete', ([ , scope, guildId ], { body }) => {
  const { detail } = scopedGuild(scope, guildId, 'loggers');
  detail.loggers = detail.loggers.filter((item) => !(item.channel_id === String(body.channel_id) && item.type === Number(body.type)));
  return undefined;
});


route('GET', '/(users/@me|admin)/guilds/(\\d+)/data/export', ([ , scope, guildId ]) => {
  if (scope === 'admin') {
    requireBotOwner();
  }
  const { detail } = (scope === 'admin') ? findAdminGuild(guildId).entry : requireOwner(guildId);
  // loggers never carry webhook urls here, same as the real api
  const tags = state.tags.filter((tag) => tag.server_id === guildId).map((tag) => ({
    ...tag,
    reference_tag: (tag.reference_tag && tag.reference_tag.server_id !== guildId) ? {...tag.reference_tag, content: ''} : tag.reference_tag,
  }));
  return {
    guild: detail,
    llm_knowledge: state.guildLLMKnowledge.get(guildId) ?? [],
    reports: state.guildReports.get(guildId) ?? [],
    notes: [
      'Logger webhook URLs (webhook id and token) are left out because they are sensitive data: anyone with a webhook URL can post messages in that channel.',
      'Content of directory tags is left out, including the directory or DM tags that aliases in this server point to.',
      'Tag variables and tag blobs are left out.',
    ],
    tags,
    timestamp: Date.now(),
    version: 1,
    warnings: state.guildWarnings.get(guildId) ?? [],
  };
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/data/delete', ([ , scope, guildId ]) => {
  if (scope === 'admin') {
    requireBotOwner();
  }
  const { detail } = (scope === 'admin') ? findAdminGuild(guildId).entry : requireOwner(guildId);
  const before = state.tags.length;
  state.tags = state.tags.filter((tag) => tag.server_id !== guildId);
  state.guildLLMKnowledge.delete(guildId);
  state.guildWarnings.delete(guildId);
  state.guildReports.delete(guildId);
  Object.assign(detail, {
    disabled_logger_events: 0,
    locale: null,
    loggers: [],
    prefixes: [],
    rules: [],
    settings: createGuildSettings(),
    timezone: null,
  });
  return {tags_deleted: before - state.tags.length};
});


/* admin (staff: owners and moderators) */

function requireStaff() {
  if (!state.owner && !state.moderator) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Missing Access');
  }
}

// the api's `staff_only(owner=True)`, moderators get a 403 too. Only the parts that are owner only for privacy or
// because they can't be undone use this here (entitlements, editing/exporting servers, deleting applications and all of
// a user's tags, features)
function requireBotOwner() {
  requireStaff();
  if (!state.owner) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Only bot owners can do this');
  }
}

function pageOf<T>(items: Array<T>, query: URLSearchParams) {
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 25));
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  return {count: items.length, items: items.slice(offset, offset + limit)};
}

function parseBool(value: string | null): boolean | null {
  return (value === 'true' || value === '1') ? true : (value === 'false' || value === '0') ? false : null;
}

// mirrors `utilities/tools/tags.py` `tag_directory_search_condition`
function matchesDirectorySearch(query: string, tag: {id: string, user_id?: string | null, user?: {id: string}}, texts: Array<string>): boolean {
  const text = query.trim();
  if (!text) {
    return true;
  }
  const ownerId = tag.user_id ?? tag.user?.id;
  const prefixed = /^(id|tag|user|owner):(\d+)$/i.exec(text);
  if (prefixed) {
    return (['id', 'tag'].includes(prefixed[1].toLowerCase())) ? tag.id === prefixed[2] : ownerId === prefixed[2];
  }
  if (/^\d+$/.test(text) && (tag.id === text || ownerId === text)) {
    return true;
  }
  const needle = text.toLowerCase();
  return texts.some((value) => value.toLowerCase().includes(needle));
}

// The real directory is one table: staff see the mock user's own listings too, and the public directory shows everyone's.
// The mock user's listings live in `state.directory`, everyone else's in `state.adminDirectory`; these convert between them.
function ownListingAsAdmin(item: TagDirectoryItem): AdminTagDirectoryItem {
  const source = state.tags.find((tag) => tag.id === item.id);
  return {
    ...item,
    // staff only see a request once it's submitted
    edit_request: (item.edit_request?.status === 1) ? item.edit_request : null,
    tag: {...item.tag, assets: [], content: source?.content ?? '', locked: source?.locked ?? false, user_id: mockUser.id},
    user: {avatar: mockUser.avatar, discriminator: mockUser.discriminator, id: mockUser.id, username: mockUser.username},
  };
}

function adminListingAsPublic(item: AdminTagDirectoryItem): TagDirectoryItem {
  const { tag } = item;
  const user = item.user ?? {avatar: null, discriminator: '0', id: tag.user_id ?? '0', username: 'Deleted User'};
  const timestamp = (value: unknown) => (value === undefined || value === null) ? null : toDate(value as string).toISOString();
  return {
    assets: item.assets,
    category: item.category,
    thumbnail: item.thumbnail ?? null,
    // fixtures never show their content publicly
    content_public: false,
    created: timestamp(item.created) ?? new Date(0).toISOString(),
    description: item.description,
    edited: timestamp(item.edited),
    id: item.id,
    server_count: item.server_count,
    tag: {
      assets: [],
      content: '',
      created: timestamp(tag.created)!,
      edited: timestamp(tag.edited),
      guild_id: null,
      id: tag.id,
      is_command: !!tag.is_command,
      is_on_directory: true,
      last_used: timestamp(tag.last_used),
      locked: tag.locked,
      name: tag.name,
      nsfw: tag.nsfw,
      reference_tag: null,
      scanned: 0,
      server_id: tag.server_id,
      user: {...user, blocked: false, blocked_on: null, blocked_reason: null, bot: false, flags: 0},
      uses: tag.uses,
    },
    title: item.title,
    verified: item.verified,
  };
}

route('GET', '/admin/tags/directory', (_match, { query }) => {
  requireStaff();
  const search = query.get('query') || '';
  const verified = query.get('verified');
  const nsfw = parseBool(query.get('nsfw'));
  const editRequest = parseBool(query.get('edit_request'));
  const category = parseCategory(query.get('category'));
  const matching = [...state.adminDirectory, ...[...state.directory.values()].map(ownListingAsAdmin)]
    .filter((item) => category === undefined || item.category === category)
    .filter((item) => verified === null || verified === '' || item.verified === Number(verified))
    .filter((item) => nsfw === null || item.tag.nsfw === nsfw)
    .filter((item) => editRequest === null || !!item.edit_request === editRequest)
    .filter((item) => matchesDirectorySearch(search, item.tag, [item.title, item.tag.name, item.tag.content ?? '', item.description]));
  const createdMs = (item: typeof matching[number]) => (item.created === undefined) ? 0 : toDate(item.created).getTime();
  const byCreated = (a: typeof matching[number], b: typeof matching[number]) => createdMs(b) - createdMs(a);
  const sorters: Record<string, (a: typeof matching[number], b: typeof matching[number]) => number> = {
    oldest: (a, b) => byCreated(b, a),
    uses: (a, b) => b.tag.uses - a.tag.uses,
    servers: (a, b) => b.server_count - a.server_count,
    name: (a, b) => a.tag.name.localeCompare(b.tag.name),
    title: (a, b) => a.title.localeCompare(b.title),
  };
  const pendingFirst = (a: typeof matching[number], b: typeof matching[number]) => Number(b.verified === 1) - Number(a.verified === 1) || byCreated(a, b);
  matching.sort(sorters[query.get('sort_by') || ''] ?? pendingFirst);
  return pageOf(matching, query);
});

// mirrors `GET /admin/tags`: the mock user's tags plus every directory tag
route('GET', '/admin/tags', (_match, { query }) => {
  requireStaff();
  const search = query.get('query') || '';
  const searchContent = parseBool(query.get('search_content')) === true;
  const nsfw = parseBool(query.get('nsfw'));
  const serverId = query.get('server_id');
  const ref = (user: {id: string, username: string, discriminator: string, avatar: string | null}) => ({avatar: user.avatar, discriminator: user.discriminator, id: user.id, username: user.username});
  const items = [
    ...state.tags.map((tag) => ({
      directory: (state.directory.get(tag.id)) ? {title: state.directory.get(tag.id)!.title, verified: state.directory.get(tag.id)!.verified} : null,
      tag: {...tag, user_id: mockUser.id},
      user: {...ref(mockUser), channel_id: mockUser.channel_id},
    })),
    ...state.adminDirectory.map((item) => ({
      directory: {title: item.title, verified: item.verified},
      tag: item.tag,
      user: (item.user) ? {...item.user, channel_id: null} : null,
    })),
  ]
    .filter((item) => nsfw === null || item.tag.nsfw === nsfw)
    .filter((item) => !serverId || item.tag.server_id === serverId)
    .filter((item) => {
      // a bare id also matches the server id here
      if (/^\d+$/.test(search.trim()) && item.tag.server_id === search.trim()) {
        return true;
      }
      return matchesDirectorySearch(search, item.tag, [item.tag.name, ...(searchContent ? [item.tag.content ?? ''] : [])]);
    });
  const time = (value: unknown) => (value) ? toDate(value as string).getTime() : 0;
  const byId = (a: typeof items[number], b: typeof items[number]) => (BigInt(b.tag.id) > BigInt(a.tag.id)) ? 1 : -1;
  const sorters: Record<string, (a: typeof items[number], b: typeof items[number]) => number> = {
    oldest: (a, b) => byId(b, a),
    uses: (a, b) => (b.tag.uses - a.tag.uses) || byId(a, b),
    name: (a, b) => a.tag.name.localeCompare(b.tag.name),
    last_used: (a, b) => (time(b.tag.last_used) - time(a.tag.last_used)) || byId(a, b),
  };
  items.sort(sorters[query.get('sort_by') || ''] ?? byId);
  return pageOf(items, query);
});

route('PATCH', '/admin/tags/directory/(\\d+)', ([ , tagId ], { body }) => {
  requireStaff();
  // checked against the listing as it'll be after this request, same as the api
  const current = state.directory.get(tagId) ?? state.adminDirectory.find((other) => other.id === tagId);
  if (current) {
    const verified = (body.verified !== undefined) ? Number(body.verified) : current.verified;
    if (verified === TagDirectoryVerificationStates.VERIFIED && (body.verified !== undefined || typeof body.description === 'string' || body.category !== undefined)) {
      checkCanVerify((typeof body.description === 'string') ? body.description : current.description, (body.category !== undefined) ? Number(body.category) : current.category);
    }
    const contentBefore = ('tag' in current) ? (current.tag as {content?: string}).content ?? '' : '';
    logAudit(tagId, [
      (typeof body.content === 'string' && body.content !== contentBefore) ? {type: 4 as const, details: {content_before: contentBefore, content_after: body.content}} : null,
      (body.verified !== undefined && Number(body.verified) !== current.verified) ? {type: 3 as const, directory_id: tagId, details: {from: current.verified, to: Number(body.verified)}} : null,
    ].filter((entry) => entry !== null));
  }
  // the mock user's own listing: apply the same edits to `state.directory` and its source tag
  const own = state.directory.get(tagId);
  if (own) {
    const source = findTag(tagId);
    if (body.verified !== undefined) {
      own.verified = Number(body.verified);
      source.locked = own.verified !== TagDirectoryVerificationStates.NOT_VERIFIED;
    }
    if (typeof body.content === 'string') {
      if (!body.content || 2000 < body.content.length) {
        throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1 to 2000 characters', {field: 'content'});
      }
      source.content = body.content;
      own.tag.content = (own.content_public) ? body.content : '';
    }
    if (typeof body.name === 'string') {
      source.name = body.name.trim().toLowerCase();
      own.tag.name = source.name;
    }
    if (typeof body.title === 'string' || typeof body.description === 'string' || body.category !== undefined) {
      const fields = directoryFields({title: body.title, description: body.description, category: body.category});
      Object.assign(own, Object.fromEntries(Object.entries(fields).filter(([ , value ]) => value !== undefined)));
      own.edited = new Date().toISOString();
    }
    return ownListingAsAdmin(own);
  }
  const item = state.adminDirectory.find((other) => other.id === tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  if (body.verified !== undefined) {
    const verified = Number(body.verified);
    if (![0, 1, 2].includes(verified)) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'verified must be 0, 1 or 2', {field: 'verified'});
    }
    item.verified = verified;
  }
  if (typeof body.content === 'string') {
    if (!body.content || 2000 < body.content.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1 to 2000 characters', {field: 'content'});
    }
    item.tag.content = body.content;
  }
  if (typeof body.name === 'string') {
    const name = body.name.trim().toLowerCase();
    if (!name || 64 < name.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'name must be 1 to 64 characters', {field: 'name'});
    }
    item.tag.name = name;
  }
  if (typeof body.title === 'string') {
    if (128 < body.title.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'title must be at most 128 characters', {field: 'title'});
    }
    item.title = body.title;
  }
  if (typeof body.description === 'string') {
    if (2000 < body.description.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'description must be at most 2000 characters', {field: 'description'});
    }
    item.description = body.description;
  }
  const category = parseCategory(body.category);
  if (category !== undefined) {
    item.category = category;
  }
  return item;
});

// mirror `GET /admin/tags/<tag_id>/variables|blobs`: every storage the tag has, read-only, paged
function adminStoragePage<T extends {storage_type: number}>(entries: Array<T>, query: URLSearchParams) {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    counts[entry.storage_type] = (counts[entry.storage_type] ?? 0) + 1;
  }
  const type = query.get('storage_type');
  const filtered = (type === null) ? entries : entries.filter((entry) => `${entry.storage_type}` === type);
  const offset = Number(query.get('offset') ?? 0);
  const limit = Number(query.get('limit') ?? 50);
  return {count: filtered.length, counts, items: filtered.slice(offset, offset + limit)};
}

route('GET', '/admin/tags/(\\d+)/variables', ([ , tagId ], { query }) => {
  requireStaff();
  const entries = [...(state.variables.get(tagId) ?? new Map<string, Record<string, string>>()).entries()]
    .flatMap(([ key, values ]) => {
      const [ type, id ] = key.split(':');
      return Object.entries(values).map(([ name, value ]) => ({name, storage_id: id, storage_type: Number(type) as TagStorageType, value}));
    })
    .sort((a, b) => a.storage_type - b.storage_type || a.storage_id.localeCompare(b.storage_id) || a.name.localeCompare(b.name));
  return adminStoragePage(entries, query);
});

route('GET', '/admin/tags/(\\d+)/blobs', ([ , tagId ], { query }) => {
  requireStaff();
  const entries = [...(state.blobs.get(tagId) ?? new Map<string, string>()).entries()]
    .map(([ key, value ]) => {
      const [ type, id ] = key.split(':');
      return {size: atob(value).length, storage_id: id, storage_type: Number(type) as TagStorageType, truncated: false, value};
    })
    .sort((a, b) => a.storage_type - b.storage_type || a.storage_id.localeCompare(b.storage_id));
  return adminStoragePage(entries, query);
});

// mirror `/admin/tags/<tag_id>/servers` (and the counts of `GET /users/@me/tags/<tag_id>/servers`): made-up servers that added the tag,
// as many as the listing's `server_count` (a few of them are only counted, like DMs)
const MOCK_SERVER_WORDS = ['Pixel', 'Meme', 'Cozy', 'Gamer', 'Art', 'Late Night', 'Study', 'Anime', 'Retro', 'Chill', 'Bot Testing', 'Music'];

function tagServers(tagId: string) {
  const listing = state.directory.get(tagId) ?? state.adminDirectory.find((item) => item.id === tagId);
  const total = listing?.server_count ?? 0;
  const otherCount = Math.min(total, total % 3);
  const name = listing?.tag.name ?? 'tag';
  const servers = Array.from({length: total - otherCount}, (_, i) => {
    const known = state.guilds[i]?.summary;
    return {
      added: new Date(Date.now() - (i + 1) * 36e5 * 31).toISOString(),
      icon: null,
      id: known?.id ?? String(1200000000000000000n + BigInt(tagId.slice(-6)) * 1000n + BigInt(i)),
      name: known?.name ?? `${MOCK_SERVER_WORDS[i % MOCK_SERVER_WORDS.length]} Club ${i + 1}`,
      names: (i % 5 === 2) ? [name, `${name}2`] : [name],
    };
  });
  const aliasCount = otherCount + servers.reduce((sum, server) => sum + server.names.length, 0);
  return {alias_count: aliasCount, other_count: otherCount, server_count: total, servers, truncated: false};
}

route('GET', '/users/@me/tags/(\\d+)/servers', ([ , tagId ]) => {
  findTag(tagId);
  const { alias_count, server_count } = tagServers(tagId);
  return {alias_count, server_count};
});

// mirrors `GET /admin/tags/<tag_id>/audit`: newest first, `before` an entry id
route('GET', '/admin/tags/(\\d+)/audit', ([ , tagId ], { query }) => {
  requireStaff();
  const limit = Number(query.get('limit') || 50);
  const before = query.get('before');
  let entries = [...auditFor(tagId)].reverse();
  if (before) {
    const index = entries.findIndex((entry) => entry.id === before);
    entries = (index === -1) ? [] : entries.slice(index + 1);
  }
  entries = entries.slice(0, limit);
  return {entries, users: auditUsers(entries.flatMap((entry) => [entry.actor_id, entry.owner_id]))};
});

// `users` of the audit responses, a summary of each id
function auditUsers(ids: Array<string | null>) {
  return Object.fromEntries([...new Set(ids.filter((id): id is string => !!id))].map((id) => {
    const user = (id === mockUser.id) ? mockUser : state.adminUsers.find((other) => other.id === id);
    return [id, (user) ? {avatar: user.avatar ?? null, discriminator: String(user.discriminator ?? '0'), id, username: user.username} : null];
  }));
}

route('GET', '/admin/tags/(\\d+)/servers', ([ , tagId ]) => {
  requireStaff();
  return tagServers(tagId);
});

// mirrors `POST /admin/tags/directory/<tag_id>/assets`, nothing is stored so the cdn url won't load
route('POST', '/admin/tags/directory/(\\d+)/assets', ([ , tagId ], { body, query }) => {
  requireStaff();
  const item = state.adminDirectory.find((other) => other.id === tagId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  const file = (body.file instanceof File) ? body.file : null;
  const name = file?.name ?? String(body.url || '').split(/[?#]/)[0].split('/').pop() ?? '';
  const extension = (/\.([a-z0-9]{1,12})$/i.exec(name)?.[1] ?? 'png').toLowerCase();
  const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  const mimetype = file?.type || `image/${extension}`;
  const sourceUrl = (file) ? null : String(body.url || '') || null;
  const provenance = {
    created: new Date().toISOString(),
    replaces_id: query.get('replaces_id'),
    requested_by: (parseBool(query.get('owner_requested'))) ? item.tag.user_id ?? null : null,
    sha256: fakeSha256(`${id}${name}`),
    source_url: sourceUrl,
    uploaded_by: mockUser.id,
  };
  const asset = {
    filename: `${id}.${extension}`,
    filename_base: id,
    id,
    // roughly `Mimetyper.is_text`
    is_text: /^text\/|^application\/(json|javascript|xml)$|^application\/(?!lottie).*\+(json|xml)$/.test(mimetype),
    metadata: {duration: 0, extension, framecount: 1, height: 0, mimetype, size: file?.size ?? 0, width: 0},
    position: item.tag.assets?.length ?? 0,
    provenance,
    urls: {cdn: `https://cdn.nsb.gg/assets/tags/${tagId}/${id}.${extension}`},
  };
  item.tag.assets = [...(item.tag.assets ?? []), asset];
  logAudit(tagId, [{type: 0, asset_id: id, details: {kind: 0, extension, mimetype, size: asset.metadata.size, ...provenance}}]);
  return asset;
});

route('DELETE', '/admin/tags/directory/(\\d+)/assets/(\\d+)', ([ , tagId, assetId ], { query }) => {
  requireStaff();
  const item = state.adminDirectory.find((other) => other.id === tagId);
  const asset = item?.tag.assets?.find((other) => other.id === assetId);
  if (!item?.tag.assets || !asset) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_ASSET, 'Unknown Tag Asset');
  }
  item.tag.assets = item.tag.assets.filter((other) => other.id !== assetId);
  logAudit(tagId, [{
    type: 1,
    asset_id: assetId,
    details: {kind: 0, extension: asset.metadata.extension, mimetype: asset.metadata.mimetype, size: asset.metadata.size, ...asset.provenance},
    ...removalFromQuery(query),
  }]);
  return undefined;
});

route('DELETE', '/admin/tags/directory/(\\d+)', ([ , tagId ], { query }) => {
  requireStaff();
  // the mock user's own listings live in `state.directory`, everyone else's in `state.adminDirectory`
  if (!state.adminDirectory.some((other) => other.id === tagId) && !state.directory.has(tagId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
  }
  const listing = state.adminDirectory.find((other) => other.id === tagId);
  const removal = removalFromQuery(query);
  const deleteTag = parseBool(query.get('delete_tag'));
  logAudit(tagId, [
    ...(listing?.assets ?? []).map((asset) => ({type: 1 as const, asset_id: asset.id, directory_id: tagId, details: {kind: 1, mimetype: asset.metadata.mimetype, size: asset.metadata.size, ...asset.provenance}, ...removal})),
    (deleteTag) ?
      {type: 6 as const, details: {name: listing?.tag.name, content: listing?.tag.content}, ...removal} :
      {type: 3 as const, directory_id: tagId, details: {from: listing?.verified, to: null}, ...removal},
  ]);
  state.adminDirectory = state.adminDirectory.filter((other) => other.id !== tagId);
  state.directory.delete(tagId);
  if (deleteTag) {
    state.tags = state.tags.filter((tag) => tag.id !== tagId);
  }
  return undefined;
});

route('PATCH', '/admin/users/(\\d+)', ([ , userId ], { body }) => {
  requireStaff();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (!user) {
    throw new MockError(404, 10013, 'Unknown User');
  }
  if (body.blocked !== undefined) {
    user.blocked = !!body.blocked;
  }
  if (body.blocked_reason !== undefined) {
    user.blocked_reason = (body.blocked_reason as string | null) || null;
  }
  // the OWNER bit can't be changed from the dashboard
  if (typeof body.flags === 'number') {
    user.flags = (body.flags & ~1) | (user.flags & 1);
  }
  if (typeof body.premium_type === 'number') {
    user.premium_type = body.premium_type;
  }
  return user;
});

// mirrors `DELETE /admin/users/<user_id>/tags`: the mock user's tags and every directory tag they own
// mirrors `POST /admin/tags/<tag_id>/merge`: the tag's uses go onto `target_id`, its aliases point there, its directory
// listing moves there when the target isn't listed, then it's deleted
route('POST', '/admin/tags/(\\d+)/merge', ([ , tagId ], { body }) => {
  requireStaff();
  const find = (id: string) => {
    const mine = state.tags.find((tag) => tag.id === id);
    if (mine) {
      return {tag: mine as unknown as AdminDirectoryTag, user: mockUser as AdminUserRef};
    }
    const listed = state.adminDirectory.find((item) => item.tag.id === id);
    return (listed) ? {tag: listed.tag, user: listed.user} : null;
  };
  const source = find(tagId);
  const target = find(String(body.target_id ?? ''));
  if (!source) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  if (!target) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Target Tag');
  }
  if (source.tag.id === target.tag.id) {
    throw new MockError(400, 50012, 'Cannot replace a tag with itself');
  }
  if (target.tag.reference_tag) {
    throw new MockError(400, 50014, 'Cannot replace a tag with a Tag Alias, use the tag it points at');
  }
  const aliases = state.tags.filter((tag) => (tag.reference_tag as {id?: string} | null | undefined)?.id === source.tag.id);
  const isListed = (id: string) => state.directory.has(id) || state.adminDirectory.some((item) => item.tag.id === id);
  const directoryOutcome = () => {
    if (!isListed(source.tag.id)) {
      return null;
    }
    return (isListed(target.tag.id)) ? 'dropped' as const : 'moved' as const;
  };
  const summary = {
    aliases: aliases.length,
    assets: source.tag.assets?.length ?? 0,
    blobs: {dropped: 0, moved: state.blobs.get(source.tag.id)?.size ?? 0},
    directory: directoryOutcome(),
    directory_moves_target: directoryOutcome() === 'moved' && target.tag.server_id !== target.tag.user_id,
    use_records: source.tag.uses,
    uses: source.tag.uses,
    variables: {dropped: 0, moved: state.variables.get(source.tag.id)?.size ?? 0},
  };
  const payload = (entry: NonNullable<ReturnType<typeof find>>) => ({...entry.tag, user: entry.user});
  if (body.dry_run) {
    return {...summary, source: payload(source), target: payload(target)};
  }
  target.tag.uses += source.tag.uses;
  for (const alias of aliases) {
    alias.reference_tag = {...alias.reference_tag!, id: target.tag.id, name: target.tag.name, content: target.tag.content};
  }
  if (summary.directory === 'moved') {
    const listing = state.directory.get(source.tag.id);
    if (listing) {
      state.directory.set(target.tag.id, {...listing, id: target.tag.id, tag: {...listing.tag, id: target.tag.id, name: target.tag.name}});
    }
    state.adminDirectory = state.adminDirectory.map((item) => (item.tag.id === source.tag.id) ? {...item, tag: target.tag, user: target.user} : item);
  }
  state.tags = state.tags.filter((tag) => tag.id !== source.tag.id);
  state.adminDirectory = state.adminDirectory.filter((item) => item.tag.id !== source.tag.id);
  state.directory.delete(source.tag.id);
  return {...summary, source: payload(source), target: payload(target)};
});

// every tag the mock knows with its owner: the mock user's plus every directory tag, like `GET /admin/tags`
function adminTagOwners() {
  return [
    ...state.tags.map((tag) => ({tag, userId: mockUser.id})),
    ...state.adminDirectory.map((item) => ({tag: item.tag as unknown as Tag, userId: item.user?.id ?? item.tag.user_id ?? ''})),
  ];
}

// mirrors the API's duplicate lookup: other non-alias tags with the exact same content, split into ones staff can
// delete and ones they can't (bot owners', the mock user aside so the mock can delete its own)
function adminTagDuplicates(tagId: string) {
  const all = adminTagOwners();
  const source = all.find((entry) => entry.tag.id === tagId);
  if (!source) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  const duplicates = (source.tag.reference_tag || !source.tag.content) ? [] : all.filter((entry) => (
    entry.tag.id !== tagId && !entry.tag.reference_tag && entry.tag.content === source.tag.content
  ));
  const isProtected = (userId: string) => userId !== mockUser.id && !!((state.adminUsers.find((user) => user.id === userId)?.flags ?? 0) & 1);
  return {
    source,
    allowed: duplicates.filter((entry) => !isProtected(entry.userId)),
    protected: duplicates.filter((entry) => isProtected(entry.userId)),
  };
}

route('GET', '/admin/tags/(\\d+)/duplicates', ([ , tagId ]) => {
  requireStaff();
  const { source, allowed, protected: blocked } = adminTagDuplicates(tagId);
  return {
    global: allowed.length + blocked.length,
    global_protected: blocked.length,
    user: [...allowed, ...blocked].filter((entry) => entry.userId === source.userId).length,
  };
});

// mirrors `DELETE /admin/tags/<tag_id>`: the tag (plus the duplicates asked for), their listings and the mock user's
// aliases of them
route('DELETE', '/admin/tags/(\\d+)', ([ , tagId ], { query }) => {
  requireStaff();
  const { source, allowed, protected: blocked } = adminTagDuplicates(tagId);
  const globalDuplicates = parseBool(query.get('global_duplicates')) === true;
  const userDuplicates = parseBool(query.get('user_duplicates')) === true;
  const duplicates = (globalDuplicates) ? allowed : (userDuplicates) ? allowed.filter((entry) => entry.userId === source.userId) : [];
  const ids = new Set([tagId, ...duplicates.map((entry) => entry.tag.id)]);
  const removal = removalFromQuery(query);
  // one action like the api's, with the owner of tags that aren't listed too
  const actionId = auditId();
  const owners = new Map([source, ...duplicates].map((entry) => [entry.tag.id, entry.userId]));
  for (const id of ids) {
    const listing = state.adminDirectory.find((item) => item.tag.id === id);
    logAudit(id, [{
      type: 6,
      details: {name: listing?.tag.name ?? source.tag.name, content: listing?.tag.content},
      action_id: actionId,
      owner_id: owners.get(id) || null,
      ...removal,
    }]);
  }
  state.tags = state.tags.filter((tag) => !ids.has(tag.id) && !ids.has((tag.reference_tag as {id?: string} | null | undefined)?.id ?? ''));
  state.adminDirectory = state.adminDirectory.filter((item) => !ids.has(item.tag.id));
  for (const id of ids) {
    state.directory.delete(id);
  }
  return {count: ids.size, skipped: (globalDuplicates) ? blocked.length : 0};
});

route('DELETE', '/admin/users/(\\d+)/tags', ([ , userId ]) => {
  requireBotOwner();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (user && (user.flags & 1)) {
    throw new MockError(400, 50035, 'Bot owners\' tags can\'t be deleted');
  }
  const owned = state.adminDirectory.filter((item) => item.tag.user_id === userId || item.user?.id === userId);
  state.adminDirectory = state.adminDirectory.filter((item) => !owned.includes(item));
  let count = owned.length;
  if (userId === mockUser.id) {
    count += state.tags.length;
    state.tags = [];
    state.directory.clear();
  }
  return {count};
});

// mirrors `GET /admin/users/<user_id>/copyright-strikes`: their copyright removals in every tag's audit log, one per
// action, newest first
route('GET', '/admin/users/(\\d+)/copyright-strikes', ([ , userId ]) => {
  requireStaff();
  const entries = [...tagAudit.values()].flat()
    .filter((entry) => entry.owner_id === userId && entry.reason === 1)
    .sort((a, b) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1);
  const strikes = new Map<string, AdminCopyrightStrike>();
  for (const entry of entries) {
    let strike = strikes.get(entry.action_id);
    if (!strike) {
      strike = {action_id: entry.action_id, actor_id: entry.actor_id, created: entry.created, notice: entry.notice, asset_ids: [], tag_ids: []};
      strikes.set(entry.action_id, strike);
    }
    if (entry.asset_id && !strike.asset_ids.includes(entry.asset_id)) {
      strike.asset_ids.push(entry.asset_id);
    }
    if (entry.tag_id && !strike.tag_ids.includes(entry.tag_id)) {
      strike.tag_ids.push(entry.tag_id);
    }
  }
  return {count: strikes.size, strikes: [...strikes.values()], users: auditUsers(entries.map((entry) => entry.actor_id))};
});

route('GET', '/admin/users', (_match, { query }) => {
  requireStaff();
  const needle = (query.get('query') || '').toLowerCase();
  const sortBy = query.get('sort_by') || 'flags';
  let entries = adminUserEntries(state.adminUsers, state.contentFlags, state.reports)
    .filter((entry) => !needle || entry.user.username.toLowerCase().includes(needle) || entry.user.id === needle);
  if (parseBool(query.get('only_flagged'))) {
    entries = entries.filter((entry) => entry.content_flags.total);
  }
  const blocked = parseBool(query.get('blocked'));
  if (blocked !== null) {
    entries = entries.filter((entry) => entry.user.blocked === blocked);
  }
  const flaggedWithin = Number(query.get('flagged_within')) || 0;
  if (flaggedWithin) {
    const since = Date.now() - flaggedWithin * 3600000;
    entries = entries.filter((entry) => entry.content_flags.last_flagged_at && since <= toDate(entry.content_flags.last_flagged_at).getTime());
  }
  const lastFlagged = (entry: typeof entries[number]) => (entry.content_flags.last_flagged_at) ? toDate(entry.content_flags.last_flagged_at).getTime() : -Infinity;
  entries.sort((a, b) => {
    const newest = (BigInt(b.user.id) > BigInt(a.user.id)) ? 1 : -1;
    if (sortBy === 'username') {
      return a.user.username.localeCompare(b.user.username);
    }
    if (sortBy === 'newest') {
      return newest;
    }
    if (sortBy === 'oldest') {
      return -newest;
    }
    if (sortBy === 'confirmed') {
      return (b.content_flags.confirmed - a.content_flags.confirmed) || (b.content_flags.flagged - a.content_flags.flagged);
    }
    if (sortBy === 'pending') {
      return (b.content_flags.pending - a.content_flags.pending) || (b.content_flags.flagged - a.content_flags.flagged);
    }
    if (sortBy === 'reported') {
      return (b.reports - a.reports) || newest;
    }
    if (sortBy === 'last_flagged') {
      return (lastFlagged(b) - lastFlagged(a)) || newest;
    }
    if (sortBy === 'blocked') {
      // the fixtures don't keep when someone was blocked, so just blocked users first
      return (Number(b.user.blocked) - Number(a.user.blocked)) || newest;
    }
    return (b.content_flags.flagged - a.content_flags.flagged) || (b.content_flags.total - a.content_flags.total);
  });
  return pageOf(entries, query);
});

// the flag with its user as they are now, like the api's join (blocking happens after the fixtures are made)
function withUser(flag: ContentFlag): ContentFlag {
  const user = state.adminUsers.find((other) => other.id === flag.user_id);
  return (user && flag.user) ? {...flag, user: {...flag.user, blocked: user.blocked, blocked_reason: user.blocked_reason, flags: user.flags}} : flag;
}

route('GET', '/admin/content-flags/(\\d+)', ([ , flagId ]) => {
  requireStaff();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_CONTENT_FLAG, 'Unknown Content Flag');
  }
  return flag;
});

route('GET', '/admin/content-flags', (_match, { query }) => {
  requireStaff();
  const userId = query.get('user_id');
  const status = query.get('status');
  const category = query.get('category');
  const needsReview = parseBool(query.get('needs_human_review'));
  const autoConfirmed = parseBool(query.get('auto_confirmed'));
  const autoReview = query.get('auto_review');
  const promptHash = (query.get('prompt_hash') || '').toLowerCase();
  const type = query.get('type');
  const guildId = query.get('guild_id');
  const channelId = query.get('channel_id');
  const tagId = query.get('tag_id');
  const includeBlocked = parseBool(query.get('include_blocked')) ?? false;
  // mirrors `_content_flag_command_condition`
  const commandId = (query.get('command_id') || '').trim().toLowerCase().split(/\s+/).join('.');
  const search = (query.get('search') || '').trim().toLowerCase();
  // mirrors `_content_flag_search_condition`
  const matchesSearch = (flag: ContentFlag) => {
    if (!search) {
      return true;
    }
    const caseId = (search.startsWith('#')) ? search.slice(1) : search;
    if (search.startsWith('#') && /^\d+$/.test(caseId)) {
      return flag.id === caseId;
    }
    if (/^\d+$/.test(caseId) && (flag.id === caseId || flag.message_id === caseId || flag.tag_id === caseId)) {
      return true;
    }
    if ([flag.query, flag.source_url, flag.command_id].some((value) => value && value.toLowerCase().includes(search))) {
      return true;
    }
    if (search.length >= 6 && /^[0-9a-f]+$/.test(search)) {
      return [flag.sha256, flag.pdq].some((hash) => hash && ((search.length === 64) ? hash === search : hash.startsWith(search)));
    }
    return false;
  };
  const matching = state.contentFlags
    .map(withUser)
    .filter((flag) => includeBlocked || !flag.user?.blocked)
    .filter((flag) => !userId || flag.user_id === userId)
    .filter((flag) => !guildId || flag.guild_id === guildId)
    .filter((flag) => !channelId || flag.channel_id === channelId)
    .filter((flag) => !tagId || flag.tag_id === tagId)
    .filter((flag) => {
      const value = (flag.command_id || '').toLowerCase();
      return !commandId || value === commandId || value.startsWith(`${commandId}.`);
    })
    .filter((flag) => status === null || status === '' || flag.status === Number(status))
    .filter((flag) => !category || flag.category === category)
    .filter((flag) => needsReview === null || flag.needs_human_review === needsReview)
    .filter((flag) => autoConfirmed === null || !!flag.auto_confirmed_from === autoConfirmed)
    .filter((flag) => {
      // mirrors `_content_flag_auto_review_condition`
      const review = flag.auto_review;
      switch (autoReview) {
        case 'none': return !review;
        case 'failed': return !!review?.error;
        case 'applied': return !!review && !review.error && review.applied;
        case 'suggested': return !!review && !review.error && !review.applied;
        default: return true;
      }
    })
    .filter((flag) => {
      // mirrors the `prompt_hash` filter in `admin_get_content_flags`
      if (promptHash === 'none') {
        return !flag.prompt_hash;
      }
      return !promptHash || (!!flag.prompt_hash && ((promptHash.length === 64) ? flag.prompt_hash === promptHash : flag.prompt_hash.startsWith(promptHash)));
    })
    .filter((flag) => !type || (flag.mimetype === 'text/plain') === (type === 'text'))
    .filter(matchesSearch);
  return pageOf(matching, query);
});

// mirrors `_content_flag_match_condition`
const PDQ_MATCH_DISTANCE = 31;

function hexDistance(a: string, b: string): number {
  let bits = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    for (; xor; xor &= xor - 1) {
      bits++;
    }
  }
  return bits;
}

function contentFlagMatches(flag: ContentFlag, sha256: boolean, pdq: boolean): Array<ContentFlag> {
  return state.contentFlags.filter((other) => other.id !== flag.id && (
    (sha256 && other.sha256 === flag.sha256) ||
    (pdq && !!flag.pdq && !!other.pdq && other.sha256 !== flag.sha256 && hexDistance(other.pdq, flag.pdq) <= PDQ_MATCH_DISTANCE)
  ));
}

function statusCounts(flags: Array<ContentFlag>) {
  const count = (status: number) => flags.filter((flag) => flag.status === status).length;
  return {pending: count(0), confirmed: count(1), dismissed: count(2), reported: count(3), unsure: count(4)};
}

route('GET', '/admin/content-flags/(\\d+)/matches', ([ , flagId ]) => {
  requireStaff();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  return {
    sha256: (flag.sha256) ? statusCounts(contentFlagMatches(flag, true, false)) : null,
    pdq: (flag.pdq) ? statusCounts(contentFlagMatches(flag, false, true)) : null,
    pdq_distance: PDQ_MATCH_DISTANCE,
  };
});

// a placeholder image instead of the source media, so its sha256 never matches (shows the "not the same file" warning)
// the media viewer's jobs: queued when started, then started on the first `GET /jobs/<id>` and finished on the second,
// which hands over the file once and deletes the job (like the api)
const mediaJobs = new Map<string, {flagId: string, polls: number}>();

function mockJobResponse(id: string, status: string, response: unknown = null) {
  return {id, position: 0, status, user_id: null, result: {error: null, error_code: null, response, took: 0}};
}

route('POST', '/admin/content-flags/(\\d+)/media', ([ , flagId ]) => {
  requireStaff();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (['unsafe_child_safety', 'review_child_safety'].includes(flag.category ?? '') || (flag.flagged ?? []).includes('child_safety') || (flag.flagged_for_review ?? []).includes('child_safety')) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Media flagged for child safety can\'t be viewed');
  }
  if (!flag.source_url) {
    throw new MockError(404, 40008, 'Content flag has no source url');
  }
  const jobId = crypto.randomUUID();
  mediaJobs.set(jobId, {flagId, polls: 0});
  return mockJobResponse(jobId, 'queued');
});

// a placeholder image instead of the source media, so its sha256 never matches (shows the "not the same file" warning)
route('GET', '/jobs/([0-9a-f-]+)', ([ , jobId ]) => {
  const job = mediaJobs.get(jobId);
  if (!job) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_JOB, 'Unknown Job');
  }
  job.polls += 1;
  if (job.polls < 2) {
    return mockJobResponse(jobId, 'started');
  }
  mediaJobs.delete(jobId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#5865f2"/>` +
    `<text x="320" y="190" font-family="sans-serif" font-size="32" fill="#fff" text-anchor="middle">mock media #${job.flagId}</text></svg>`;
  // the api only extracts frames for multi-frame media
  const flag = state.contentFlags.find((other) => other.id === job.flagId);
  const flaggedFrames = ((flag && 1 < (flag.frames ?? 0)) ? (flag.frames_flagged ?? []) : []).slice(0, 8).map((frame) => ({
    frame,
    mimetype: 'image/svg+xml',
    timestamp: frame * 2,
    value: btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#eb459e"/>` +
      `<text x="320" y="190" font-family="sans-serif" font-size="32" fill="#fff" text-anchor="middle">frame ${frame}</text></svg>`),
  }));
  return mockJobResponse(jobId, 'finished', {file: {value: btoa(svg), metadata: {mimetype: 'image/svg+xml'}}, flagged_frames: flaggedFrames});
});

route('DELETE', '/jobs/([0-9a-f-]+)', ([ , jobId ]) => {
  if (!mediaJobs.delete(jobId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_JOB, 'Unknown Job');
  }
});

route('PATCH', '/admin/content-flags/(\\d+)', ([ , flagId ], { body }) => {
  requireStaff();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (body.status !== undefined) {
    const status = Number(body.status);
    if (![0, 1, 2, 3, 4].includes(status)) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'status must be 0-4', {field: 'status'});
    }
    const others = contentFlagMatches(flag, !!body.match_sha256, !!body.match_pdq).filter((other) => other.status === 0);
    // a reviewer set it, so it isn't an auto-confirm anymore
    flag.auto_confirmed_from = null;
    for (const target of [flag, ...others]) {
      target.status = status;
      target.reviewed_at = (status) ? new Date().toISOString() : null;
      target.reviewed_by = (status) ? mockUser.id : null;
    }
  }
  if (body.notes !== undefined) {
    flag.notes = (typeof body.notes === 'string' && body.notes) ? body.notes : null;
  }
  return withUser(flag);
});

// mirrors `admin_post_content_flag_prompt`
route('POST', '/admin/content-flags/(\\d+)/prompt', ([ , flagId ]) => {
  requireStaff();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (flag.mimetype === CONTENT_FLAG_TEXT_MIMETYPE) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content flag is already a text flag');
  }
  if (!flag.query) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content flag has no prompt to flag');
  }
  // not a real sha256, the mock only needs it to differ from the media's
  flag.sha256 = Array.from(flag.query).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7).toString(16).padStart(64, '0');
  flag.pdq = null;
  flag.mimetype = CONTENT_FLAG_TEXT_MIMETYPE;
  flag.size = new TextEncoder().encode(flag.query).length;
  flag.frames = 0;
  flag.frames_flagged = [];
  flag.source_url = null;
  flag.query_type = null;
  return withUser(flag);
});

route('POST', '/admin/content-flags/(\\d+)/translate', ([ , flagId ]) => {
  requireStaff();
  const flag = state.contentFlags.find((other) => other.id === flagId);
  if (!flag) {
    throw new MockError(404, 10000, 'Unknown Content Flag');
  }
  if (!flag.query) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content flag has no text to translate');
  }
  // anything ascii counts as english already
  const english = !/[^\x00-\x7f]/.test(flag.query);
  flag.translation = (english) ? null : `[mock english] ${flag.query}`;
  flag.translation_language = (english) ? 'en' : 'ja';
  return withUser(flag);
});

function findReport(reportId: string): Report {
  const report = state.reports.find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report');
  }
  return report;
}

// mirrors `utilities/tools/reports.py` `create_report_message`
function addReportMessage(report: Report, message: Omit<ReportMessage, 'created' | 'id'>): ReportMessage {
  const thread = state.reportMessages.get(report.id) ?? [];
  const created: ReportMessage = {...message, created: new Date().toISOString(), id: `${report.id}${Date.now()}`};
  thread.push(created);
  state.reportMessages.set(report.id, thread);
  syncReportReplies(report, thread);
  return created;
}

function reportMessageContent(body: Record<string, unknown>): string {
  const content = (typeof body.content === 'string') ? body.content.trim() : '';
  if (!content || content.length > 2000) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1-2000 characters', {field: 'content'});
  }
  return content;
}

// the reporter's view of a message, without which staff member it was
function reporterMessage({ author_id: _authorId, ...message }: ReportMessage) {
  return message;
}

route('GET', '/admin/reports/(\\d+)', ([ , reportId ]) => {
  requireStaff();
  return findReport(reportId);
});

route('GET', '/admin/reports/(\\d+)/messages', ([ , reportId ]) => {
  requireStaff();
  const report = findReport(reportId);
  return {items: state.reportMessages.get(report.id) ?? []};
});

route('POST', '/admin/reports/(\\d+)/messages', ([ , reportId ], { body }) => {
  requireStaff();
  const report = findReport(reportId);
  return addReportMessage(report, {author: 'staff', author_id: mockUser.id, content: reportMessageContent(body), status: null});
});

// like the content flags' translate: anything ascii counts as english already
function mockReportTranslation(text: string) {
  const english = !/[^\x00-\x7f]/.test(text);
  return {translation: (english) ? null : `[mock english] ${text}`, translation_language: (english) ? 'en' : 'ja'};
}

route('POST', '/admin/reports/(\\d+)/translate', ([ , reportId ]) => {
  requireStaff();
  return mockReportTranslation(findReport(reportId).content);
});

route('POST', '/admin/reports/(\\d+)/messages/(\\d+)/translate', ([ , reportId, messageId ]) => {
  requireStaff();
  const report = findReport(reportId);
  const message = state.reportMessages.get(report.id)?.find((other) => other.id === messageId);
  if (!message) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report Message');
  }
  if (!message.content) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Report message has no text to translate');
  }
  return mockReportTranslation(message.content);
});

route('GET', '/admin/reports', (_match, { query }) => {
  requireStaff();
  const type = query.get('type');
  const status = query.get('status');
  const search = (query.get('query') ?? '').trim();
  const awaitingReply = parseBool(query.get('awaiting_reply'));
  const anonymous = parseBool(query.get('anonymous'));
  // mirrors the api's `_report_search_condition`: an id (`#`, `id:`, `user:`, `target:`, `server:` or bare), else the text
  const idSearch = /^(?:(id|user|reporter|target|server|guild)\s*:\s*|#)?(\d{1,20})$/i.exec(search);
  const matchesSearch = (report: Report) => {
    if (!search) {
      return true;
    }
    if (!idSearch) {
      return report.content.toLowerCase().includes(search.toLowerCase());
    }
    const scope = (idSearch[1] ?? (search.startsWith('#') ? 'id' : '')).toLowerCase();
    const value = idSearch[2];
    const checks: Record<string, boolean> = {
      id: report.id === value,
      user: report.user?.id === value,
      target: report.target_id === value,
      server: reportInGuild(report, value),
    };
    const key = ({reporter: 'user', guild: 'server'} as Record<string, string>)[scope] ?? scope;
    return (key) ? checks[key] : Object.values(checks).some(Boolean);
  };
  const matching = state.reports
    .filter((report) => awaitingReply === null || (report.last_reply?.author === 'reporter') === awaitingReply)
    .filter((report) => anonymous === null || (report.user === null) === anonymous)
    .filter((report) => type === null || type === '' || report.type === Number(type))
    .filter((report) => status === null || status === '' || report.status === Number(status))
    .filter(matchesSearch);
  return pageOf(matching, query);
});

// like the api, any patch stamps reviewed_at/reviewed_by
route('PATCH', '/admin/reports/(\\d+)', ([ , reportId ], { body }) => {
  requireStaff();
  const report = state.reports.find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report');
  }
  if (body.status !== undefined && body.status !== null) {
    const status = Number(body.status);
    if (![0, 1, 2].includes(status)) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'status must be 0-2', {field: 'status'});
    }
    if (report.status !== status) {
      report.status = status;
      addReportMessage(report, {author: 'staff', author_id: mockUser.id, content: null, status: status as ReportMessage['status']});
    }
  }
  if (body.notes !== undefined) {
    report.notes = (typeof body.notes === 'string' && body.notes) ? body.notes : null;
  }
  report.reviewed_at = new Date().toISOString();
  report.reviewed_by = mockUser.id;
  return report;
});


// sent from the server, or a server report about it (same as the api's `guild_id` filter)
function reportInGuild(report: {guild_id: string | null, target_id: string | null, type: number}, guildId: string) {
  return report.guild_id === guildId || (report.type === 2 && report.target_id === guildId);
}


/* admin servers */

function adminGuildCounts(guildId: string) {
  return {
    content_flags: state.contentFlags.filter((flag) => flag.guild_id === guildId).length,
    reports: state.reports.filter((report) => reportInGuild(report, guildId)).length,
    tags: state.tags.filter((tag) => tag.server_id === guildId).length,
  };
}

function adminGuildDetail(guildId: string) {
  const item = findAdminGuild(guildId);
  // opening one the bot never saved creates its row from Discord, like the api
  item.saved = true;
  const { entry } = item;
  const flags = state.contentFlags.filter((flag) => flag.guild_id === guildId);
  // made up but stable per server, like the users' (servers the bot left were busy before it did, ones never saved weren't)
  const commands = (item.saved) ? 200 + Number(BigInt(guildId) % 90000n) : 0;
  return {
    ...entry.detail,
    bot: item.bot,
    commands,
    content_flags: {
      confirmed: flags.filter((flag) => flag.status === 1).length,
      dismissed: flags.filter((flag) => flag.status === 2).length,
      flagged: flags.filter((flag) => flag.flagged?.length).length,
      last_flagged_at: flags.map((flag) => String(flag.created)).sort().pop() ?? null,
      pending: flags.filter((flag) => flag.status === 0).length,
      reported: flags.filter((flag) => flag.status === 3).length,
      total: flags.length,
      unsure: flags.filter((flag) => flag.status === 4).length,
    },
    first_seen: (commands) ? new Date(Date.UTC(2020, Number(BigInt(guildId) % 48n), 1)).toISOString() : null,
    counts: {
      ...adminGuildCounts(guildId),
      // the mock user's own, or a made up count for servers they aren't in (staff only see a count anyway)
      reminders: state.reminders.filter((reminder) => reminder.guild_id === guildId).length || Number(BigInt(guildId) % 9n),
    },
    // owners can edit every area, moderators none
    editable: {loggers: state.owner, moderation: state.owner, music: state.owner, prefixes: state.owner, reminders: state.owner, rules: state.owner, rules_admin: state.owner, settings: state.owner, tags: state.owner},
    owner: false,
    permissions: '0',
  };
}

route('GET', '/admin/guilds', (_match, { query }) => {
  requireStaff();
  const search = (query.get('query') || '').trim().toLowerCase();
  const inBot = parseBool(query.get('in_bot'));
  const blocked = parseBool(query.get('blocked'));
  const byId = (a: string, b: string) => (BigInt(a) > BigInt(b)) ? 1 : (BigInt(a) < BigInt(b)) ? -1 : 0;
  const items = state.adminGuilds
    .map(({ entry, bot, saved }) => ({
      blocked: entry.detail.blocked,
      blocked_reason: entry.detail.blocked_reason,
      bot,
      counts: adminGuildCounts(entry.detail.id),
      icon: (saved) ? entry.detail.icon : null,
      id: entry.detail.id,
      name: (saved) ? entry.detail.name : null,
    }))
    .filter((item) => !search || (item.name ?? '').toLowerCase().includes(search) || item.id === search)
    .filter((item) => inBot === null || !!item.bot === inBot)
    .filter((item) => blocked === null || item.blocked === blocked)
    .filter((item) => {
      // mirrors `flagged_within`: the server's last content flag is that recent
      const hours = Number(query.get('flagged_within')) || 0;
      if (!hours) {
        return true;
      }
      const since = Date.now() - hours * 3600000;
      return state.contentFlags.some((flag) => flag.guild_id === item.id && since <= toDate(flag.created).getTime());
    });
  const sortBy = query.get('sort_by');
  items.sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name === null) ? 1 : (b.name === null) ? -1 : a.name.localeCompare(b.name) || byId(a.id, b.id);
    }
    if (sortBy === 'flags_most' || sortBy === 'flags_least') {
      const difference = a.counts.content_flags - b.counts.content_flags;
      return ((sortBy === 'flags_most') ? -difference : difference) || byId(b.id, a.id);
    }
    if (sortBy === 'reports_most' || sortBy === 'reports_least') {
      const difference = a.counts.reports - b.counts.reports;
      return ((sortBy === 'reports_most') ? -difference : difference) || byId(b.id, a.id);
    }
    return (sortBy === 'oldest') ? byId(a.id, b.id) : byId(b.id, a.id);
  });
  return pageOf(items, query);
});

route('GET', '/admin/guilds/(\\d+)', ([ , guildId ]) => adminGuildDetail(guildId));

route('PATCH', '/admin/guilds/(\\d+)', ([ , guildId ], { body }) => {
  // moderators can only block, changing its settings is owners only
  if (Object.keys(body).some((key) => key !== 'blocked' && key !== 'blocked_reason')) {
    requireBotOwner();
  }
  const { detail } = findAdminGuild(guildId).entry;
  const settingsKeys = ['ml_diffusion_model', 'ml_llm_model', 'ml_llm_personality', 'response_display', 'search_provider_images', 'search_provider_web', 'warnings_expire'] as const;
  if ('warnings_actions' in body) {
    // the api sorts the ladder, null turns it off
    detail.settings.warnings_actions = [...((body.warnings_actions as UserGuild['settings']['warnings_actions'] | null) || [])].sort((x, y) => x.threshold - y.threshold);
  }
  applyWarningsAuto(detail, body);
  for (const key of settingsKeys) {
    if (key in body) {
      (detail.settings as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  if ('warnings_window' in body) {
    // null resets it to 30 days
    detail.settings.warnings_window = (body.warnings_window as number | null) ?? 30 * 24 * 60 * 60;
  }
  applyAdminBypassSettings(detail, body);
  if ('locale' in body) {
    detail.locale = (body.locale as string | null) || null;
  }
  if ('timezone' in body) {
    detail.timezone = (body.timezone as string | null) || null;
  }
  if (typeof body.blocked === 'boolean' && body.blocked !== detail.blocked) {
    detail.blocked = body.blocked;
    if (!body.blocked) {
      detail.blocked_reason = null;
    }
  }
  if (detail.blocked && 'blocked_reason' in body) {
    detail.blocked_reason = (typeof body.blocked_reason === 'string' && body.blocked_reason) ? body.blocked_reason : null;
  }
  if (Array.isArray(body.features)) {
    // owners only, like the api
    requireBotOwner();
    detail.features = [...new Set(body.features as Array<string>)];
  }
  return adminGuildDetail(guildId);
});


// entitlements: read only, newest first like the api
route('GET', '/users/@me/entitlements', () => {
  const items = state.entitlements
    .filter((entitlement) => entitlement.user?.id === mockUser.id)
    .map(({ external_id: _externalId, user: _user, ...entitlement }) => entitlement);
  return {count: items.length, items};
});

route('GET', '/admin/entitlements', (_match, { query }) => {
  requireBotOwner();
  const userId = query.get('user_id');
  const provider = query.get('provider');
  const premiumType = query.get('premium_type');
  const active = parseBool(query.get('active'));
  const matching = state.entitlements
    .filter((entitlement) => !userId || entitlement.user?.id === userId)
    .filter((entitlement) => !provider || entitlement.provider === provider)
    .filter((entitlement) => !premiumType || entitlement.premium_type === Number(premiumType))
    .filter((entitlement) => active === null || entitlement.active === active)
    .sort((a, b) => (BigInt(b.id) > BigInt(a.id)) ? 1 : -1);
  return pageOf(matching, query);
});


// stats: made up from the day count, shaped like `GET /admin/stats/files`
route('GET', '/admin/stats/files', (_match, { query }) => {
  requireBotOwner();
  const days = Math.min(28, Math.max(1, Math.trunc(Number(query.get('expiring_days'))) || 7));
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const MB = 1024 * 1024;
  // fewer files expire the further out you look (most are uploaded with the default 14 days), with a bump at 14
  const buckets = Array.from({length: days}, (_, day) => {
    const count = Math.round(4200 / (day + 1)) + ((day === 13) ? 6100 : 0);
    return {count, size: count * 2.3 * MB, starts_at: new Date(now + day * DAY).toISOString()};
  });
  const sum = (key: 'count' | 'size') => buckets.reduce((total, bucket) => total + bucket[key], 0);
  const permanent = {count: 182_402, size: 612 * 1024 * MB};
  const temporary = {count: 48_913, size: 141 * 1024 * MB};
  return {
    count: permanent.count + temporary.count,
    size: permanent.size + temporary.size,
    permanent,
    temporary,
    expired: {count: 1_207, size: 3.1 * 1024 * MB},
    storage: {
      count: 201_884,
      size: 688 * 1024 * MB,
      permanent: {count: 160_115, size: 548 * 1024 * MB},
      temporary: {count: 40_552, size: 136 * 1024 * MB},
      unused: {count: 1_217, size: 4 * 1024 * MB},
    },
    expiring: {
      count: sum('count'),
      size: sum('size'),
      ends_at: new Date(now + days * DAY).toISOString(),
      freed: {count: Math.round(sum('count') * 0.86), size: sum('size') * 0.84},
      days: buckets,
    },
    types: [
      {type: 'image', count: 151_220, size: 398 * 1024 * MB},
      {type: 'video', count: 38_904, size: 301 * 1024 * MB},
      {type: 'audio', count: 9_118, size: 22 * 1024 * MB},
      {type: 'other', count: 32_073, size: 32 * 1024 * MB},
    ],
    top_users: state.adminUsers.slice(0, 10).map((user, i) => ({
      user_id: user.id,
      user,
      count: Math.round(4100 / (i + 1)),
      size: Math.round(38 * 1024 * MB / (i + 1)),
    })),
    generated_at: new Date(now).toISOString(),
  };
});


// the other stats areas: the last `days` UTC days, made up but steady (the same day always gets the same numbers)
function statsWindow(query: URLSearchParams) {
  const days = Math.min(90, Math.max(1, Math.trunc(Number(query.get('days'))) || 30));
  const today = new Date();
  const first = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - (days - 1) * 24 * 60 * 60 * 1000;
  const dates = Array.from({length: days}, (_, i) => new Date(first + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  return {days, starts_at: new Date(first).toISOString(), dates};
}

// 0..1, steady per date and key
function wobble(date: string, key: string): number {
  let hash = 2166136261;
  for (const char of `${date}:${key}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return (hash % 1000) / 1000;
}

// weekends are busier, plus some noise
function daily(date: string, key: string, base: number): number {
  const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? 1.25 : 1;
  return Math.round(base * weekend * (0.8 + wobble(date, key) * 0.4));
}

function sumOf<T>(items: Array<T>, value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

route('GET', '/admin/stats/uploads', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at, dates } = statsWindow(query);
  const MB = 1024 * 1024;
  const series = dates.map((date, i) => {
    // temporary uploads from more than 14 days back have mostly expired and been cleaned up
    const left = (dates.length - i <= 14) ? 1 : 0.15;
    const permanent = daily(date, 'uploads-permanent', 2100);
    const temporary = Math.round(daily(date, 'uploads-temporary', 3400) * left);
    return {date, permanent: {count: permanent, size: permanent * 2.6 * MB}, temporary: {count: temporary, size: temporary * 2.1 * MB}};
  });
  return {
    days,
    starts_at,
    permanent: {count: sumOf(series, (x) => x.permanent.count), size: sumOf(series, (x) => x.permanent.size)},
    temporary: {count: sumOf(series, (x) => x.temporary.count), size: sumOf(series, (x) => x.temporary.size)},
    series,
  };
});

route('GET', '/admin/stats/commands', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at, dates } = statsWindow(query);
  const series = dates.map((date) => ({date, count: daily(date, 'commands', 412_000)}));
  const count = sumOf(series, (x) => x.count);
  const top = ['magik', 'tag.show', 'imagine', 'deepfry', 'meme', 'help', 'ai', 'gif.speed', 'caption', 'tts'];
  const results: Array<[string, number]> = [['ran', 0.86], ['argument_error', 0.05], ['run_error', 0.012], ['ratelimited', 0.03], ['blocked', 0.02], ['cancelled', 0.015], ['missing_permissions', 0.008], ['fail', 0.005]];
  return {
    days,
    starts_at,
    count,
    users: Math.round(count / 21),
    servers: Math.round(count / 58),
    series,
    top: top.map((command_id, i) => ({command_id, count: Math.round(count * 0.18 / (i + 1)), users: Math.round(count * 0.02 / (i + 1))})),
    types: [{type: 0, count: Math.round(count * 0.71)}, {type: 1, count: Math.round(count * 0.26)}, {type: 2, count: Math.round(count * 0.01)}, {type: 3, count: Math.round(count * 0.02)}],
    results: results.map(([ result, share ]) => ({result, count: Math.round(count * share)})).sort((a, b) => b.count - a.count),
  };
});

route('GET', '/admin/stats/api', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at, dates } = statsWindow(query);
  const series = dates.map((date) => ({date, requests: daily(date, 'requests', 88_000), server_errors: daily(date, 'server-errors', 140)}));
  const requests = sumOf(series, (x) => x.requests);
  const endpoints: Array<[string, string, number]> = [
    ['GET', '/users/@me', 40], ['GET', '/users/@me/guilds', 140], ['POST', '/image/manipulation/magik', 2400], ['GET', '/tags/directory', 85],
    ['POST', '/generate/imagine', 9800], ['GET', '/info/discord', 12], ['POST', '/files', 620], ['GET', '/users/@me/commands', 95],
  ];
  return {
    days,
    starts_at,
    requests,
    client_errors: Math.round(requests * 0.034),
    server_errors: sumOf(series, (x) => x.server_errors),
    took_avg: 412,
    took_p95: 3180,
    users: Math.round(requests / 160),
    series,
    endpoints: endpoints.map(([ method, endpoint, took ], i) => ({method, endpoint, requests: Math.round(requests * 0.3 / (i + 1)), server_errors: Math.round(requests * 0.0004 / (i + 1)), took_avg: took})),
    applications: [
      {application: null, requests: Math.round(requests * 0.6), server_errors: 41},
      ...state.applications.slice(0, 5).map((item, i) => ({application: {id: item.id, name: item.name}, requests: Math.round(requests * 0.1 / (i + 1)), server_errors: 3})),
      {application: {id: '1111111111111111111', name: null}, requests: 42, server_errors: 0},
    ],
  };
});

route('GET', '/admin/stats/growth', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at, dates } = statsWindow(query);
  const usersSeries = dates.map((date) => ({date, count: daily(date, 'new-users', 3_900)}));
  // ghost leaves come in bursts, about 1,800 whenever every shard identifies (a restart) and a few dozen otherwise
  const serversSeries = dates.map((date) => ({
    date,
    joins: daily(date, 'joins', 640),
    leaves: daily(date, 'leaves', 410),
    ghosts: (wobble(date, 'restart') < 0.3) ? daily(date, 'ghosts-restart', 1800) : daily(date, 'ghosts', 40),
  }));
  return {
    days,
    starts_at,
    users: {total: 9_412_007, blocked: 3_118, active_ever: 7_602_311, new: sumOf(usersSeries, (x) => x.count), series: usersSeries},
    servers: {
      current: 1_082_455,
      joins: sumOf(serversSeries, (x) => x.joins),
      leaves: sumOf(serversSeries, (x) => x.leaves),
      ghosts: sumOf(serversSeries, (x) => x.ghosts),
      series: serversSeries,
    },
  };
});

route('GET', '/admin/stats/premium', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at, dates } = statsWindow(query);
  const series = dates.map((date) => ({date, started: daily(date, 'started', 14), ended: daily(date, 'ended', 9)}));
  const active = state.entitlements.filter((item) => item.active);
  const tiers = [2, 3, 4].map((premiumType) => {
    const matching = active.filter((item) => item.premium_type === premiumType);
    return {
      premium_type: premiumType,
      count: matching.length,
      discord: matching.filter((item) => item.provider === 'discord').length,
      manual: matching.filter((item) => item.provider === 'manual').length,
    };
  }).filter((tier) => tier.count);
  return {
    days,
    starts_at,
    active: {count: active.length, users: new Set(active.map((item) => item.user?.id)).size, tiers},
    users: [{premium_type: 1, count: 12}, {premium_type: 2, count: 1_840}, {premium_type: 3, count: 911}, {premium_type: 4, count: 203}],
    started: sumOf(series, (x) => x.started),
    ended: sumOf(series, (x) => x.ended),
    premium_servers: 604,
    series,
  };
});

// from the fixtures, so the numbers match the admin pages they link to
route('GET', '/admin/stats/moderation', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at } = statsWindow(query);
  const since = new Date(starts_at).getTime();
  const time = (value: string | number | null | undefined) => (value === null || value === undefined) ? NaN : toDate(value).getTime();
  const oldest = (values: Array<string | number | undefined>) => {
    const times = values.map(time).filter((value) => !Number.isNaN(value));
    return (times.length) ? new Date(Math.min(...times)).toISOString() : null;
  };
  const pendingFlags = state.contentFlags.filter((flag) => flag.status === 0 && !flag.user?.blocked);
  const unsureFlags = state.contentFlags.filter((flag) => flag.status === 4 && !flag.user?.blocked);
  const openReports = state.reports.filter((report) => report.status === 0);
  const pendingListings = state.adminDirectory.filter((item) => item.verified === 1);
  const editRequests = state.adminDirectory.filter((item) => item.edit_request?.status === 1);
  return {
    days,
    starts_at,
    content_flags: {
      pending: pendingFlags.length,
      needs_human_review: pendingFlags.filter((flag) => flag.needs_human_review).length,
      oldest_pending_at: oldest(pendingFlags.map((flag) => flag.created)),
      unsure: unsureFlags.length,
      oldest_unsure_at: oldest(unsureFlags.map((flag) => flag.created)),
      created: state.contentFlags.filter((flag) => since <= time(flag.created)).length,
      reviewed: state.contentFlags.filter((flag) => flag.status !== 0).length,
    },
    reports: {
      open: openReports.length,
      awaiting_reply: state.reports.filter((report) => report.last_reply?.author === 'reporter').length,
      oldest_open_at: oldest(openReports.map((report) => report.created)),
      created: state.reports.filter((report) => since <= time(report.created)).length,
    },
    directory: {
      pending: pendingListings.length,
      oldest_pending_at: oldest(pendingListings.map((item) => item.created)),
      edit_requests: editRequests.length,
      oldest_edit_request_at: null,
    },
  };
});

route('GET', '/admin/stats/content', (_match, { query }) => {
  requireBotOwner();
  const { days, starts_at } = statsWindow(query);
  const scale = Math.max(1, days / 30);
  return {
    days,
    starts_at,
    tags: {
      total: 6_204_118, users: 1_420_330, new: Math.round(51_000 * scale), personal: 2_310_442, server: 3_604_871, dm: 288_805,
      aliases: 912_004, commands: 48_120, nsfw: 71_552,
      directory: {
        verified: state.adminDirectory.filter((item) => item.verified === 2).length,
        pending: state.adminDirectory.filter((item) => item.verified === 1).length,
        unverified: state.adminDirectory.filter((item) => item.verified === 0).length,
      },
    },
    reminders: {total: 182_330, users: 61_209, new: Math.round(9_100 * scale), next_day: 4_812},
    voices: {total: state.voices.length, users: new Set(state.voices.map((voice) => voice.user?.id)).size, new: 2},
    ai_memories: {total: 412_660, users: 88_014, new: Math.round(12_400 * scale)},
    applications: {
      total: state.applications.length,
      users: new Set(state.applications.map((item) => item.user?.id)).size,
      new: 1,
      disabled: state.applications.filter((item) => item.flags & 2).length,
    },
  };
});


// voices: the name can be changed from either side, the clips only by the owner (`/users/@me/voices/.../clips`)
function findVoice(voiceId: string) {
  const voice = state.voices.find((other) => other.id === voiceId);
  if (!voice) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_VOICE, 'Unknown Voice Clone');
  }
  return voice;
}

function renameVoice(voiceId: string, body: Record<string, unknown>) {
  const voice = findVoice(voiceId);
  const name = (typeof body.name === 'string') ? body.name.replace(/[\r\n]+/g, ' ').trim() : '';
  if (!name || 128 < name.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'name must be 1-128 characters', {field: 'name'});
  }
  voice.name = name;
  return voice;
}

function ownReports(): Array<Report> {
  return state.reports.filter((report) => state.ownReportIds.has(report.id));
}

function findOwnReport(reportId: string): Report {
  const report = ownReports().find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REPORT, 'Unknown Report');
  }
  return report;
}

// mirrors the api's `report_unread_expression`: staff sent something after the reporter last opened it or last sent something
function reportUnread(report: Report): boolean {
  const time = (value: Parameters<typeof toDate>[0] | undefined) => (value === undefined) ? 0 : toDate(value).getTime();
  const messages = state.reportMessages.get(report.id) ?? [];
  const latest = (author: ReportMessage['author']) => Math.max(0, ...messages.filter((message) => message.author === author).map((message) => time(message.created)));
  return Math.max(time(state.reportReadAt.get(report.id)), latest('reporter')) < latest('staff');
}

function ownReportPayload(report: Report) {
  const { notes: _notes, reviewed_by: _reviewedBy, user: _user, ip_hash: _ipHash, ...rest } = report;
  return {...rest, unread: reportUnread(report)};
}

route('GET', '/users/@me/reports/unread', () => ({count: ownReports().filter(reportUnread).length}));

// mirrors `views/me_reports.py` `create_me_report` and `views/reports.py` `create_anonymous_report`: bugs, and tags
// listed on the directory (not the caller's own when logged in). No limits or real captcha here, any token passes
function createWebsiteReport(body: Record<string, unknown>, user: Report['user']): Report {
  const type = Number(body.type);
  if (type !== 0 && type !== 4) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'type must be 0 or 4', {field: 'type'});
  }
  const targetId = (type === 4 && typeof body.target_id === 'string') ? body.target_id : null;
  if (type === 4) {
    const listing = [...state.directory.values(), ...state.adminDirectory.map(adminListingAsPublic)].find((item) => item.id === targetId);
    if (!listing) {
      throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM, 'Unknown Tag Directory Item');
    }
    if (user && listing.tag.user.id === user.id) {
      throw new MockError(400, ApiErrorCodes.CANNOT_REPORT_YOURSELF, 'You cannot report your own tag');
    }
  }
  const report: Report = {
    channel_id: null,
    content: reportMessageContent(body),
    created: new Date().toISOString(),
    guild_id: null,
    id: String(Math.max(0, ...state.reports.map((other) => Number(other.id))) + 1),
    ip_hash: (user) ? null : 'mock'.padEnd(64, '0'),
    message_id: null,
    notes: null,
    reviewed_at: null,
    reviewed_by: null,
    status: 0,
    tag_id: null,
    target_id: targetId,
    type,
    replies: 0,
    last_reply: null,
    last_activity: null,
    user,
  };
  state.reports.unshift(report);
  return report;
}

route('POST', '/users/@me/reports', (_match, { body }) => {
  const report = createWebsiteReport(body, mockUser);
  state.ownReportIds.add(report.id);
  return ownReportPayload(report);
});

route('POST', '/reports/anonymous', (_match, { body }) => {
  if (typeof body.turnstile_token !== 'string' || !body.turnstile_token) {
    throw new MockError(400, ApiErrorCodes.CAPTCHA_INVALID, 'The captcha expired or failed, try it again');
  }
  const { content, id, target_id: targetId, type } = createWebsiteReport(body, null);
  return {content, id, target_id: targetId, type};
});

route('GET', '/users/@me/reports/(\\d+)', ([ , reportId ]) => ownReportPayload(findOwnReport(reportId)));

// reopening is all the reporter can do
route('PATCH', '/users/@me/reports/(\\d+)', ([ , reportId ], { body }) => {
  const report = findOwnReport(reportId);
  if (body.status !== 0) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'status must be 0', {field: 'status'});
  }
  if (report.status !== 0) {
    report.status = 0;
    addReportMessage(report, {author: 'reporter', author_id: report.user?.id ?? mockUser.id, content: null, status: 0});
  }
  return ownReportPayload(report);
});

route('GET', '/users/@me/reports/(\\d+)/messages', ([ , reportId ]) => {
  const report = findOwnReport(reportId);
  state.reportReadAt.set(report.id, new Date().toISOString());
  return {items: (state.reportMessages.get(report.id) ?? []).map(reporterMessage)};
});

route('POST', '/users/@me/reports/(\\d+)/messages', ([ , reportId ], { body }) => {
  const report = findOwnReport(reportId);
  const message = addReportMessage(report, {author: 'reporter', author_id: report.user?.id ?? mockUser.id, content: reportMessageContent(body), status: null});
  return reporterMessage(message);
});

route('GET', '/users/@me/reports', (_match, { query }) => {
  // staff fields left out like the api does
  // mirrors `views/me_reports.py`, `updated` is the newest message or when it was sent
  const status = query.get('status');
  const search = (query.get('query') ?? '').trim().toLowerCase();
  const sortBy = query.get('sort_by') ?? 'updated';
  const time = (value: Parameters<typeof toDate>[0]) => toDate(value).getTime();
  const updated = (report: Report) => Math.max(time(report.created), (report.last_activity) ? time(report.last_activity) : 0);
  const matching = ownReports()
    .filter((report) => status === null || status === '' || report.status === Number(status))
    .filter((report) => !search || report.content.toLowerCase().includes(search) || report.id === search.replace(/^#/, ''))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return time(a.created) - time(b.created) || Number(a.id) - Number(b.id);
        case 'newest': return time(b.created) - time(a.created) || Number(b.id) - Number(a.id);
        default: return updated(b) - updated(a) || Number(b.id) - Number(a.id);
      }
    })
    .map(ownReportPayload);
  return pageOf(matching, query);
});

// mirrors `views/me_files.py`
route('GET', '/users/@me/files', (_match, { query }) => {
  const search = (query.get('query') ?? '').toLowerCase();
  const sortBy = query.get('sort_by') ?? 'newest';
  const temporary = query.get('temporary');
  const matching = state.files
    .filter((file) => !search || file.filename_base.toLowerCase().includes(search) || file.vanity.toLowerCase().includes(search))
    .filter((file) => temporary === null || (file.expires_at !== null) === (temporary === 'true'));
  const byId = (a: (typeof state.files)[number], b: (typeof state.files)[number]) => a.id.length - b.id.length || a.id.localeCompare(b.id);
  matching.sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return byId(a, b);
      case 'largest': return b.metadata.size - a.metadata.size || byId(b, a);
      case 'name': return a.filename_base.toLowerCase().localeCompare(b.filename_base.toLowerCase()) || byId(a, b);
      default: return byId(b, a);
    }
  });
  const sizeOf = (files: typeof state.files) => files.reduce((sum, file) => sum + file.metadata.size, 0);
  return {
    ...pageOf(matching, query),
    size: sizeOf(matching),
    total: {count: state.files.length, size: sizeOf(state.files)},
  };
});

route('DELETE', '/users/@me/files/(\\d+)', ([ , fileId ]) => {
  if (!state.files.some((file) => file.id === fileId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_FILE, 'Unknown File');
  }
  state.files = state.files.filter((file) => file.id !== fileId);
});

route('POST', '/users/@me/files/delete', (_match, { body }) => {
  const fileIds = new Set((Array.isArray(body.file_ids)) ? body.file_ids.map(String) : []);
  if (!fileIds.size || 100 < fileIds.size) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'file_ids needs 1 to 100 ids');
  }
  const before = state.files.length;
  state.files = state.files.filter((file) => !fileIds.has(file.id));
  return {deleted: before - state.files.length};
});

// mirrors `views/me_commands.py`
route('GET', '/users/@me/commands', (_match, { query }) => {
  const guildId = query.get('guild_id');
  const channelId = query.get('channel_id');
  const commandId = (query.get('command_id') ?? '').trim().toLowerCase().split(/\s+/).join('.');
  const commandType = query.get('command_type');
  const result = query.get('result');
  // mirrors `views/me_commands.py`: the breakdown matches every filter but the result's
  const unresulted = state.commandUses.filter((use) => {
    return (guildId === null || (use.guild_id ?? '0') === guildId)
      && (channelId === null || use.channel_id === channelId)
      && (!commandId || use.command_id === commandId || use.command_id.startsWith(`${commandId}.`))
      && (commandType === null || use.command_type === Number(commandType));
  });
  const resultOf = (use: (typeof state.commandUses)[number]) => use.result ?? 'untracked';
  const matching = unresulted.filter((use) => result === null || resultOf(use) === result);
  const counts = new Map<string, number>();
  for (const use of unresulted) {
    counts.set(resultOf(use), (counts.get(resultOf(use)) ?? 0) + 1);
  }
  const first = state.commandUses[state.commandUses.length - 1];
  return {
    ...pageOf(matching, query),
    first_used: first?.timestamp ?? null,
    results: [...counts].map(([ value, count ]) => ({count, result: value})).sort((a, b) => b.count - a.count),
    total: state.commandUses.length,
  };
});

route('GET', '/users/@me/reminders', () => {
  return {count: state.reminders.length, items: state.reminders};
});

function findReminder(reminderId: string) {
  const reminder = state.reminders.find((other) => other.id === reminderId);
  if (!reminder) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REMINDER, 'Unknown Reminder');
  }
  return reminder;
}

route('PATCH', '/users/@me/reminders/(\\d+)', ([ , reminderId ], { body }) => {
  const reminder = findReminder(reminderId);
  const content = body.content;
  if (content === undefined && !body.move_to_dms) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Nothing to change');
  }
  if (typeof content === 'string' && content !== reminder.content) {
    if (512 < content.length) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content is too long');
    }
    // stands in for the content scanner: "scanfail" acts like the scanner being down, "blockme" gets blocked
    if (content.toLowerCase().includes('scanfail')) {
      throw new MockError(400, ApiErrorCodes.SAFETY_SCAN_FAILED, 'The safety scan failed, try again in a moment');
    }
    if (content.toLowerCase().includes('blockme')) {
      throw new MockError(400, ApiErrorCodes.TEXT_BLOCKED_GUIDELINES, 'The text was blocked because it may violate Discord\'s Community Guidelines');
    }
    reminder.content = content;
  }
  if (body.move_to_dms) {
    reminder.channel_id = mockUser.channel_id;
    reminder.guild_id = null;
    reminder.message_id = null;
  }
  return reminder;
});

route('DELETE', '/users/@me/reminders/(\\d+)', ([ , reminderId ]) => {
  findReminder(reminderId);
  state.reminders = state.reminders.filter((other) => other.id !== reminderId);
});

// what a server told NotSoAI: mirrors the `/llm/knowledge` routes in `views/me_guilds.py` (and `views/admin.py`)
const GUILD_LLM_KNOWLEDGE_LIMITS = {amount: 10, total_length: 1000};

function guildLLMKnowledge(guildId: string): Array<GuildLLMKnowledge> {
  let items = state.guildLLMKnowledge.get(guildId);
  if (!items) {
    state.guildLLMKnowledge.set(guildId, items = []);
  }
  return items;
}

function guildLLMKnowledgeContent(body: Record<string, unknown>): string {
  const content = (typeof body.content === 'string') ? body.content.trim() : '';
  if (!content || GUILD_LLM_KNOWLEDGE_LIMITS.total_length < content.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `Content must be 1 to ${GUILD_LLM_KNOWLEDGE_LIMITS.total_length} characters`);
  }
  // same stand-ins for the content scanner as reminders
  if (content.toLowerCase().includes('blockme')) {
    throw new MockError(400, ApiErrorCodes.TEXT_BLOCKED_GUIDELINES, 'The ai knowledge was blocked because it may violate Discord\'s Community Guidelines');
  }
  return content;
}

// every entry's characters together, `content` replacing the one being edited
function checkGuildLLMKnowledgeRoom(guildId: string, content: string, excluding?: string) {
  const used = guildLLMKnowledge(guildId).filter((other) => other.id !== excluding).reduce((total, other) => total + other.content.length, 0);
  if (GUILD_LLM_KNOWLEDGE_LIMITS.total_length < used + content.length) {
    const remaining = Math.max(GUILD_LLM_KNOWLEDGE_LIMITS.total_length - used, 0);
    throw new MockError(400, ApiErrorCodes.MAX_GUILD_LLM_KNOWLEDGE, `NotSoAI can only know ${GUILD_LLM_KNOWLEDGE_LIMITS.total_length} characters about a server, ${remaining} are left`, {remaining, total_length: GUILD_LLM_KNOWLEDGE_LIMITS.total_length});
  }
}

function findGuildLLMKnowledge(guildId: string, knowledgeId: string): GuildLLMKnowledge {
  const item = guildLLMKnowledge(guildId).find((other) => other.id === knowledgeId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_LLM_KNOWLEDGE, 'Unknown AI Knowledge');
  }
  return item;
}

// a server's tags and reminders for its moderators: mirrors the `/tags` and `/reminders` routes in `views/me_guilds.py`
function guildContentUser(user: {avatar: string | null, bot: boolean, discriminator: string, id: string, username: string}) {
  return {avatar: user.avatar, bot: user.bot, discriminator: user.discriminator, id: user.id, username: user.username};
}

route('GET', '/users/@me/guilds/(\\d+)/tags', ([ , guildId ], { query }) => {
  findGuild(guildId);
  const search = (query.get('query') || '').toLowerCase();
  const before = query.get('before');
  const limit = Number(query.get('limit')) || 25;
  const matching = state.tags
    .filter((tag) => tag.server_id === guildId)
    .filter((tag) => !search || tag.name.toLowerCase().includes(search) || tag.content.toLowerCase().includes(search))
    .sort((a, b) => (BigInt(b.id) < BigInt(a.id)) ? -1 : 1);
  const page = matching.filter((tag) => !before || BigInt(tag.id) < BigInt(before)).slice(0, limit);
  return {
    count: matching.length,
    items: page.map(({ directory: _directory, ...tag }) => ({
      ...tag,
      user: guildContentUser(tag.user),
      reference_tag: (tag.reference_tag) ? {...tag.reference_tag, user: guildContentUser(tag.reference_tag.user), reference_tag: null} : null,
    })),
  };
});

route('DELETE', '/users/@me/guilds/(\\d+)/tags/(\\d+)', ([ , guildId, tagId ]) => {
  requireEditable(guildId, 'tags');
  const index = state.tags.findIndex((tag) => tag.id === tagId && tag.server_id === guildId);
  if (index === -1) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  state.tags.splice(index, 1);
  return undefined;
});

route('GET', '/users/@me/guilds/(\\d+)/reminders', ([ , guildId ], { query }) => {
  requireEditable(guildId, 'reminders');
  const offset = Number(query.get('offset')) || 0;
  const limit = Number(query.get('limit')) || 25;
  const search = (query.get('query') ?? '').trim().toLowerCase();
  const allDay = query.get('all_day');
  const within = ({day: 1, week: 7, month: 30} as Record<string, number>)[query.get('within') ?? ''];
  const sort = query.get('sort') ?? 'next';
  const owner = guildContentUser(mockUser);
  const byStart = (a: Reminder, b: Reminder) => Date.parse(a.timestamp_start) - Date.parse(b.timestamp_start);
  const byId = (a: Reminder, b: Reminder) => (BigInt(a.id) < BigInt(b.id)) ? -1 : 1;
  const sorter = ({next: byStart, last: (a, b) => byStart(b, a), newest: (a, b) => byId(b, a), oldest: byId} as Record<string, (a: Reminder, b: Reminder) => number>)[sort] ?? byStart;
  // a looser stand-in for the api's search: any id it mentions, else the text or the owner's name
  const ids = [...search.matchAll(/\d{5,20}/g)].map((match) => match[0]);
  const matching = state.reminders
    .filter((reminder) => reminder.guild_id === guildId)
    .filter((reminder) => allDay === null || String(reminder.is_all_day) === allDay)
    .filter((reminder) => !within || Date.parse(reminder.timestamp_start) <= Date.now() + within * 86_400_000)
    .filter((reminder) => {
      if (!search) {
        return true;
      }
      if (ids.length) {
        return ids.some((id) => [reminder.id, owner.id, reminder.channel_id].includes(id));
      }
      return reminder.content.toLowerCase().includes(search) || owner.username.toLowerCase().includes(search);
    })
    .sort(sorter);
  return {
    count: matching.length,
    items: matching.slice(offset, offset + limit).map((reminder) => ({...reminder, user: guildContentUser(mockUser)})),
  };
});

route('POST', '/users/@me/guilds/(\\d+)/reminders/(\\d+)/move-to-dms', ([ , guildId, reminderId ]) => {
  requireEditable(guildId, 'reminders');
  const reminder = state.reminders.find((item) => item.id === reminderId && item.guild_id === guildId);
  if (!reminder) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_REMINDER, 'Unknown Reminder');
  }
  Object.assign(reminder, {channel_id: null, guild_id: null, message_id: null});
  return {...reminder, user: guildContentUser(mockUser)};
});

// a server's command stats: mirrors `/commands/stats` in `views/me_guilds.py`, made up but steady for each server
const MOCK_GUILD_TOP_COMMANDS: Array<[string, number, string]> = [
  ['media.iv.manipulation.magik', 0, 'magik'],
  ['fun.tag', 0, 'tag'],
  ['media.iv.manipulation.caption', 1, 'caption'],
  ['tools.ai', 1, 'ai'],
  ['music.play', 0, 'play'],
  ['search.google', 0, 'google'],
  ['media.iv.manipulation.deepfry', 0, 'deepfry'],
  ['utils.help', 1, 'help'],
];

route('GET', '/users/@me/guilds/(\\d+)/commands/stats', ([ , guildId ], { query }) => {
  scopedGuild('users/@me', guildId, 'settings');
  const days = Math.min(Math.max(Number(query.get('days')) || 30, 1), 90);
  const seed = Number(BigInt(guildId) % 97n);
  const today = new Date();
  const series = Array.from({length: days}, (_, i) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1 - i)));
    return {date: date.toISOString().slice(0, 10), count: 20 + ((seed * 7 + i * 13) % 60) + ((date.getUTCDay() % 6 === 0) ? 35 : 0)};
  });
  const count = series.reduce((sum, item) => sum + item.count, 0);
  const top = MOCK_GUILD_TOP_COMMANDS.map(([ command_id, command_type, name ], i) => ({
    command_id,
    command_type,
    count: Math.round(count / (2.2 + i * 1.6)),
    name,
    users: Math.max(1, 14 - i * 2),
  }));
  return {count, days, series, starts_at: `${series[0].date}T00:00:00+00:00`, top, users: 23 + (seed % 9)};
});

route('GET', '/(users/@me|admin)/guilds/(\\d+)/llm/knowledge', ([ , scope, guildId ]) => {
  scopedGuildRead(scope, guildId);
  return {items: guildLLMKnowledge(guildId), limits: GUILD_LLM_KNOWLEDGE_LIMITS};
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/llm/knowledge', ([ , scope, guildId ], { body }) => {
  scopedGuild(scope, guildId, 'settings');
  const items = guildLLMKnowledge(guildId);
  if (GUILD_LLM_KNOWLEDGE_LIMITS.amount <= items.length) {
    throw new MockError(400, ApiErrorCodes.MAX_GUILD_LLM_KNOWLEDGE, `Servers can only give NotSoAI ${GUILD_LLM_KNOWLEDGE_LIMITS.amount} things to know`);
  }
  const content = guildLLMKnowledgeContent(body);
  checkGuildLLMKnowledgeRoom(guildId, content);
  const item: GuildLLMKnowledge = {
    content,
    created: new Date().toISOString(),
    guild_id: guildId,
    id: String(Math.max(1300000000000000200, ...items.map((other) => Number(other.id))) + 1),
    user_id: mockUser.id,
  };
  items.push(item);
  return item;
});

route('PATCH', '/(users/@me|admin)/guilds/(\\d+)/llm/knowledge/(\\d+)', ([ , scope, guildId, knowledgeId ], { body }) => {
  scopedGuild(scope, guildId, 'settings');
  const item = findGuildLLMKnowledge(guildId, knowledgeId);
  const content = guildLLMKnowledgeContent(body);
  if (content !== item.content) {
    checkGuildLLMKnowledgeRoom(guildId, content, knowledgeId);
    item.content = content;
    item.user_id = mockUser.id;
  }
  return item;
});

route('DELETE', '/(users/@me|admin)/guilds/(\\d+)/llm/knowledge/(\\d+)', ([ , scope, guildId, knowledgeId ]) => {
  scopedGuild(scope, guildId, 'settings');
  findGuildLLMKnowledge(guildId, knowledgeId);
  state.guildLLMKnowledge.set(guildId, guildLLMKnowledge(guildId).filter((other) => other.id !== knowledgeId));
});

// the server's warnings: mirrors `me_guild_warnings` in `views/guild_warnings.py` (there are no staff routes for them)
function guildWarnings(guildId: string): Array<GuildWarning> {
  return state.guildWarnings.get(guildId) ?? [];
}

route('GET', '/users/@me/guilds/(\\d+)/warnings', ([ , guildId ], { query }) => {
  const { detail } = requireEditable(guildId, 'moderation');
  const userId = query.get('user_id');
  const before = query.get('before');
  const limit = Number(query.get('limit')) || 25;
  const { warnings_expire: expire, warnings_window: window } = detail.settings;
  // expired ones are hidden before the cleaner deletes them
  const matched = guildWarnings(guildId)
    .filter((warning) => (!userId || warning.user_id === userId) && (!expire || Date.now() - expire * 1000 <= Date.parse(warning.created)))
    .reverse();
  const page = matched.filter((warning) => !before || BigInt(warning.id) < BigInt(before)).slice(0, limit);
  return {
    // weighted, a warning from an auto-warn rule can count as several
    active: matched.filter((warning) => Date.now() - window * 1000 <= Date.parse(warning.created)).reduce((total, warning) => total + warning.weight, 0),
    count: matched.reduce((total, warning) => total + warning.weight, 0),
    warnings: page,
    window,
  };
});

route('DELETE', '/users/@me/guilds/(\\d+)/warnings/(\\d+)', ([ , guildId, warningId ]) => {
  requireEditable(guildId, 'moderation');
  const warning = guildWarnings(guildId).find((other) => other.id === warningId);
  if (!warning) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_WARNING, 'Unknown Warning');
  }
  state.guildWarnings.set(guildId, guildWarnings(guildId).filter((other) => other !== warning));
  return warning;
});

route('POST', '/users/@me/guilds/(\\d+)/warnings/delete', ([ , guildId ], { body }) => {
  requireEditable(guildId, 'moderation');
  const userIds = (Array.isArray(body.user_ids)) ? body.user_ids.map(String) : [];
  const deleted = Object.fromEntries(userIds.map((userId: string) => [userId, guildWarnings(guildId).filter((warning) => warning.user_id === userId).length]));
  state.guildWarnings.set(guildId, guildWarnings(guildId).filter((warning) => !userIds.includes(warning.user_id)));
  return {deleted};
});

// members' reports to the server's moderators: mirrors `me_guild_reports` in `views/guild_reports.py` (there are no staff
// routes for them either). Members can only report in a server with a reports logger, so the first server has one
function mockGuildReport(report: Partial<GuildReport> & Pick<GuildReport, 'created' | 'id' | 'reason' | 'target_id' | 'user_id'>): GuildReport {
  // like the api, only while there's text to clear
  const expires = (report.message_content || report.message_quote || (!report.type && report.target_quote !== false)) ? new Date(Date.parse(report.created) + 30 * 86400000).toISOString() : null;
  return {channel_id: null, guild_id: guilds[0].summary.id, handled_at: null, handled_by: null, last_reply: null, message_content: null, message_content_deleted: false, message_content_expires_at: expires, message_id: null, message_quote: false, replies: 0, reporter_muted: false, status: 0, type: 0, ...report, target_quote: report.target_quote ?? !report.type};
}

// mirrors `guild_report_reply_stats` in `utilities/tools/guild_reports.py`, status changes don't count
function guildReportPayload(report: GuildReport): GuildReport {
  const replies = (state.guildReportMessages.get(report.id) ?? []).filter((message) => message.content !== null);
  const last = replies[replies.length - 1];
  return {...report, last_reply: (last) ? {author: last.author, created: last.created} : null, replies: replies.length};
}

function addGuildReportMessage(report: GuildReport, message: Omit<GuildReportMessage, 'created' | 'id'>): GuildReportMessage {
  const thread = state.guildReportMessages.get(report.id) ?? [];
  const created: GuildReportMessage = {...message, created: new Date().toISOString(), id: `${report.id}${Date.now()}`};
  thread.push(created);
  state.guildReportMessages.set(report.id, thread);
  return created;
}

function findGuildReport(guildId: string, reportId: string): GuildReport {
  const report = guildReports(guildId).find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_REPORT, 'Unknown Report');
  }
  return report;
}

guilds[0].detail.loggers.push({added: new Date(Date.now() - 30 * 86400000).toISOString(), channel_id: '1200000000000000023', disabled_events: 0, guild_id: guilds[0].summary.id, type: 8, user_id: mockUser.id});

function guildReports(guildId: string): Array<GuildReport> {
  return state.guildReports.get(guildId) ?? [];
}

// mirrors `search_guild_reports_payload` in `utilities/tools/guild_reports.py`
function mockGuildReportMatches(report: GuildReport, search: string): boolean {
  let text = search;
  const scoped: Array<boolean> = [];
  text = text.replace(/(?<!\S)(?:(id|user|reporter|target)\s*:\s*|#)(\d{1,20})(?!\S)/gi, (_match, scope: string | undefined, id: string) => {
    const kind = (scope || 'id').toLowerCase();
    scoped.push((kind === 'id') ? report.id === id : (kind === 'target') ? report.target_id === id : report.user_id === id);
    return ' ';
  }).trim();
  if (scoped.some((matched) => !matched)) {
    return false;
  }
  if (/^\d+$/.test(text)) {
    return [report.id, report.user_id, report.target_id].includes(text);
  }
  const needle = text.toLowerCase();
  return !needle || report.reason.toLowerCase().includes(needle) || (report.message_content ?? '').toLowerCase().includes(needle);
}

// the people on the mock reports NotSoBot "has seen", the last reported member hasn't so it shows as just their id
const MOCK_REPORT_USERS: Record<string, string> = {
  '1000000000000000002': 'slimeking',
  '1000000000000000003': 'quietmod',
  '1000000000000000004': 'reporterbob',
  '1000000000000000005': 'nightowl',
  '1000000000000000006': 'hackedfriend',
};

function mockReportUsers(reports: Array<GuildReport>) {
  const users: Record<string, GuildContentUser> = {};
  for (const id of reports.flatMap((report) => [report.user_id, report.target_id, report.handled_by])) {
    if (id === mockUser.id) {
      users[id] = {avatar: mockUser.avatar ?? null, bot: false, discriminator: mockUser.discriminator, id, username: mockUser.username};
    } else if (id && MOCK_REPORT_USERS[id]) {
      users[id] = {avatar: null, bot: false, discriminator: '0', id, username: MOCK_REPORT_USERS[id]};
    }
  }
  return users;
}

route('GET', '/users/@me/guilds/(\\d+)/reports', ([ , guildId ], { query }) => {
  requireEditable(guildId, 'moderation');
  const status = query.get('status');
  const type = query.get('type');
  const awaiting = query.get('awaiting_reply');
  const search = (query.get('query') ?? '').trim();
  const offset = Number(query.get('offset')) || 0;
  const limit = Number(query.get('limit')) || 25;
  const matched = guildReports(guildId).map(guildReportPayload).filter((report) => {
    return (status === null || report.status === Number(status)) &&
      (type === null || report.type === Number(type)) &&
      (awaiting === null || (report.last_reply?.author === 'reporter') === (awaiting === 'true')) &&
      (!search || mockGuildReportMatches(report, search));
  }).reverse();
  const page = matched.slice(offset, offset + limit);
  return {count: matched.length, reports: page, users: mockReportUsers(page)};
});

route('GET', '/users/@me/guilds/(\\d+)/reports/(\\d+)', ([ , guildId, reportId ]) => {
  requireEditable(guildId, 'moderation');
  const report = guildReportPayload(findGuildReport(guildId, reportId));
  return {report, users: mockReportUsers([report])};
});

route('PATCH', '/users/@me/guilds/(\\d+)/reports/(\\d+)', ([ , guildId, reportId ], { body }) => {
  requireEditable(guildId, 'moderation');
  const report = findGuildReport(guildId, reportId);
  const status = Number(body.status) as GuildReport['status'];
  if (report.status !== status) {
    // reopening forgets who handled it
    Object.assign(report, {
      handled_at: (status === 0) ? null : new Date().toISOString(),
      handled_by: (status === 0) ? null : mockUser.id,
      status,
    });
    addGuildReportMessage(report, {author: 'moderator', author_id: mockUser.id, content: null, status});
  }
  return guildReportPayload(report);
});

// the api's is a png drawn like `quote`, an svg of the same thing here (the routes can't wait on a canvas)
function mockQuoteImage(report: GuildReport): Blob {
  const escape = (value: string) => value.replace(/[&<>]/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[char]!);
  const lines = (report.message_content ?? '').split('\n').map((line, i) => `<text x="72" y="${58 + i * 22}" fill="#dbdee1" font-size="16">${escape(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${88 + (report.message_content ?? '').split('\n').length * 22}" font-family="sans-serif"><rect width="100%" height="100%" fill="#313338"/><circle cx="36" cy="38" r="20" fill="#5865f2"/><text x="72" y="34" fill="#f2f3f5" font-size="16" font-weight="600">hackedfriend</text><text x="190" y="34" fill="#949ba4" font-size="12">${escape(new Date(Date.parse(report.created)).toLocaleString())}</text>${lines}</svg>`;
  return new Blob([svg], {type: 'image/svg+xml'});
}

route('GET', '/users/@me/guilds/(\\d+)/reports/(\\d+)/quote', ([ , guildId, reportId ]) => {
  requireEditable(guildId, 'moderation');
  const report = findGuildReport(guildId, reportId);
  if (!report.message_quote) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_REPORT, 'Unknown Report Quote');
  }
  return new Response(mockQuoteImage(report), {status: 200, headers: {'content-type': 'image/svg+xml'}});
});

// like the quote's, an svg of the api's png: the member's avatar, then their nickname over their username
function mockMemberImage(report: GuildReport): Blob {
  const suffix = report.target_id.slice(-2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="88" font-family="sans-serif"><rect width="100%" height="100%" fill="#313338"/><circle cx="44" cy="44" r="28" fill="#5865f2"/><text x="84" y="40" fill="#f2f3f5" font-size="16" font-weight="600">Member ${suffix}</text><text x="84" y="60" fill="#949ba4" font-size="14">member${suffix}</text></svg>`;
  return new Blob([svg], {type: 'image/svg+xml'});
}

route('GET', '/users/@me/guilds/(\\d+)/reports/(\\d+)/member', ([ , guildId, reportId ]) => {
  requireEditable(guildId, 'moderation');
  const report = findGuildReport(guildId, reportId);
  if (!report.target_quote) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_REPORT, 'Unknown Report Image');
  }
  return new Response(mockMemberImage(report), {status: 200, headers: {'content-type': 'image/svg+xml'}});
});

// mirrors `me_sent_guild_reports` in `views/guild_reports.py`: the mock user's own reports to servers' moderators
function sentGuildReports(): Array<GuildReport> {
  return [...state.guildReports.values()].flat().filter((report) => report.user_id === mockUser.id);
}

function findSentGuildReport(reportId: string): GuildReport {
  const report = sentGuildReports().find((other) => other.id === reportId);
  if (!report) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_GUILD_REPORT, 'Unknown Report');
  }
  return report;
}

route('GET', '/users/@me/guild-reports', (_match, { query }) => {
  const status = query.get('status');
  const search = (query.get('query') ?? '').trim().replace(/^#/, '').toLowerCase();
  const offset = Number(query.get('offset')) || 0;
  const limit = Number(query.get('limit')) || 25;
  const matched = sentGuildReports().filter((report) => {
    return (status === null || report.status === Number(status)) &&
      (!search || report.id === search || report.reason.toLowerCase().includes(search) || (report.message_content ?? '').toLowerCase().includes(search));
  }).reverse();
  const items = matched.slice(offset, offset + limit).map((report) => {
    const { handled_by: _handledBy, ...rest } = guildReportPayload(report);
    const entry = state.guilds.find((other) => other.summary.id === report.guild_id);
    return {...rest, guild: (entry) ? {icon: entry.summary.icon, id: entry.summary.id, name: entry.summary.name} : null};
  });
  return {count: matched.length, items};
});

route('PATCH', '/users/@me/guild-reports/(\\d+)', ([ , reportId ], { body }) => {
  const report = findSentGuildReport(reportId);
  report.reporter_muted = !!body.muted;
  const { handled_by: _handledBy, ...rest } = guildReportPayload(report);
  const entry = state.guilds.find((other) => other.summary.id === report.guild_id);
  return {...rest, guild: (entry) ? {icon: entry.summary.icon, id: entry.summary.id, name: entry.summary.name} : null};
});

route('GET', '/users/@me/guild-reports/(\\d+)/messages', ([ , reportId ]) => {
  const report = findSentGuildReport(reportId);
  return {items: (state.guildReportMessages.get(report.id) ?? []).map(({ author_id: _authorId, ...message }) => message)};
});

route('POST', '/users/@me/guild-reports/(\\d+)/messages', ([ , reportId ], { body }) => {
  const report = findSentGuildReport(reportId);
  const content = (typeof body.content === 'string') ? body.content.trim() : '';
  if (!content || content.length > 1000) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1-1000 characters', {field: 'content'});
  }
  const { author_id: _authorId, ...message } = addGuildReportMessage(report, {author: 'reporter', author_id: mockUser.id, content, status: null});
  return message;
});

route('GET', '/users/@me/guilds/(\\d+)/reports/(\\d+)/messages', ([ , guildId, reportId ]) => {
  requireEditable(guildId, 'moderation');
  const report = findGuildReport(guildId, reportId);
  return {items: state.guildReportMessages.get(report.id) ?? []};
});

route('POST', '/users/@me/guilds/(\\d+)/reports/(\\d+)/messages', ([ , guildId, reportId ], { body }) => {
  requireEditable(guildId, 'moderation');
  const report = findGuildReport(guildId, reportId);
  const content = (typeof body.content === 'string') ? body.content.trim() : '';
  if (!content || content.length > 1000) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'content must be 1-1000 characters', {field: 'content'});
  }
  return addGuildReportMessage(report, {author: 'moderator', author_id: mockUser.id, content, status: null});
});

// what's playing: mirrors the `/music` routes in `views/me_guilds.py` (and `views/admin.py`). The first server is playing something, the
// bot's controls (`MUSIC_CONTROL`) are acted on right away here
function mockMusicItem(guildId: string, id: string, position: number, track: Partial<NonNullable<GuildMusicQueueItem['track']>> | null, url = ''): GuildMusicQueueItem {
  return {
    batch_id: null,
    batch_name: null,
    // queued a few minutes apart, the first longest ago
    created: Date.now() - (10 - Math.min(position, 9)) * 5 * 60 * 1000,
    guild_id: guildId,
    id,
    position,
    source: (track) ? 'opus' : 'url',
    status: (position) ? ((track) ? 'ready' : 'queued') : 'playing',
    track: (track) ? {album: null, artist: null, duration: 0, isrc: null, thumbnail: null, title: '', url: null, ...track} : null,
    url,
    user_id: '1000000000000000001',
  };
}

// a premium server slot (the second server has one) or `MUSIC_ACCESS`, checked every time like the API so taking the
// slot off shows up right away
function guildMusicPremium(guildId: string): boolean {
  const features = state.adminGuilds.find((other) => other.entry.summary.id === guildId)?.entry.detail.features ?? [];
  return state.premiumServers.some((server) => server.server_id === guildId) || features.includes('MUSIC_ACCESS');
}

// nothing playing, with the server's settings (they stay when the bot leaves)
type GuildMusicSettingKey = 'crossfade' | 'dj_only' | 'dj_role_id' | 'fair_queue' | 'max_duration' | 'no_duplicates' | 'pause_alone' | 'stay' | 'vote_pause' | 'vote_resume' | 'vote_skip';

const MUSIC_BOOLEAN_SETTINGS = ['dj_only', 'fair_queue', 'no_duplicates', 'pause_alone', 'stay', 'vote_pause', 'vote_resume', 'vote_skip'] as const;

function emptyGuildMusic(settings: Pick<GuildMusic, GuildMusicSettingKey>): GuildMusic {
  const { crossfade, dj_only, dj_role_id, fair_queue, max_duration, no_duplicates, pause_alone, stay, vote_pause, vote_resume, vote_skip } = settings;
  return {crossfade, current: null, dj_only, dj_role_id, fair_queue, held_position: null, loop: 'off', max_duration, no_duplicates, pause_alone, premium: false, queue: [], queue_limit: 100, session: null, sound: {effects: [], tempo: 100, volume: 100}, stay, vote_pause, vote_resume, vote_skip};
}

function guildMusic(guildId: string): GuildMusic {
  let music = state.guildMusic.get(guildId);
  if (!music) {
    const playing = guildId === guilds[0].summary.id;
    music = emptyGuildMusic({crossfade: 0, dj_only: true, dj_role_id: null, fair_queue: false, max_duration: null, no_duplicates: false, pause_alone: false, stay: true, vote_pause: true, vote_resume: true, vote_skip: true});
    if (playing) {
      music.current = mockMusicItem(guildId, '1400000000000000001', 0, {album: 'Melodrama', artist: 'Lorde', duration: 228000, thumbnail: 'https://placehold.co/96x96/1db954/fff?text=M', title: 'Green Light'}, 'https://open.spotify.com/track/6ie2Bw3xLj2JcGowOlcMhb');
      music.queue = [
        mockMusicItem(guildId, '1400000000000000002', 1, {album: 'Pure Heroine', artist: 'Lorde', duration: 190000, title: 'Royals'}, 'https://open.spotify.com/track/2dLLR6qlu5UJ5gk0dKz0h3'),
        mockMusicItem(guildId, '1400000000000000003', 2, {artist: 'Lorde', duration: 211000, title: 'Ribs'}, 'https://open.spotify.com/track/2MvvoeRt8NcOXWESkxWn3g'),
        mockMusicItem(guildId, '1400000000000000004', 3, null, 'https://notsobot.com/some/audio/file.mp3'),
      ];
      music.session = {channel_id: '1100000000000000001', effects: ['bassboost', 'nightcore'], finished: false, guild_id: guildId, node_id: null, paused: false, position: 64000, speed: 1.25 * 1.2, stay: false, tempo: 120, volume: 100};
    }
    state.guildMusic.set(guildId, music);
  }
  music.premium = guildMusicPremium(guildId);
  music.queue_limit = (music.premium) ? 1000 : 100;
  if (music.session) {
    music.session.stay = music.stay && music.premium;
  }
  return music;
}

function renumberMusicQueue(music: GuildMusic) {
  music.queue.forEach((item, index) => {
    item.position = index + 1;
  });
}

function findMusicQueueItem(music: GuildMusic, itemId: string): GuildMusicQueueItem {
  const item = music.queue.find((other) => other.id === itemId);
  if (!item) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_MUSIC_QUEUE_ITEM, 'Unknown Music Queue Item');
  }
  return item;
}

route('GET', '/(users/@me|admin)/guilds/(\\d+)/music', ([ , scope, guildId ]) => {
  scopedGuildRead(scope, guildId);
  return guildMusic(guildId);
});

// a server's music stats: mirrors `/music/stats` (`utilities.tools.music_stats`), made up but steady for each server and
// period. Sorted like the api, the shorter periods are a share of all time
const MOCK_MUSIC_STATS_TRACKS: Array<[string, string, number]> = [
  ['Daft Punk', 'Harder, Better, Faster, Stronger', 224000],
  ['Gorillaz', 'Feel Good Inc.', 222000],
  ['Tame Impala', 'The Less I Know The Better', 216000],
  ['Kendrick Lamar', 'HUMBLE.', 177000],
  ['Daft Punk', 'Get Lucky', 369000],
  ['Radiohead', 'Weird Fishes/Arpeggi', 318000],
];
const MOCK_MUSIC_STATS_SHARE: Record<string, number> = {all: 1, year: 0.6, month: 0.12, week: 0.03};

route('GET', '/(users/@me|admin)/guilds/(\\d+)/music/stats', ([ , scope, guildId ], { query }): GuildMusicStats => {
  scopedGuildRead(scope, guildId);
  const period = (query.get('period') || 'all') as GuildMusicStats['period'];
  const sort = (query.get('sort') || 'plays') as GuildMusicStats['sort'];
  const share = MOCK_MUSIC_STATS_SHARE[period] ?? 1;
  const seed = Number(BigInt(guildId) % 13n);
  const order = (a: {plays: number, played_ms: number}, b: {plays: number, played_ms: number}) => (sort === 'time') ? b.played_ms - a.played_ms : b.plays - a.plays;
  const tracks = MOCK_MUSIC_STATS_TRACKS.map(([ artist, title, duration ], i) => {
    const plays = Math.round((60 + seed - i * 9) * share);
    // the first two got looped
    const repeats = (i < 2) ? Math.round((12 - i * 5) * share) : 0;
    return {
      played_ms: Math.round((plays + repeats) * duration * 0.9),
      plays,
      repeats,
      source: 'opus' as const,
      track: {album: null, artist, duration, isrc: null, thumbnail: null, title, url: null},
      url: `https://open.spotify.com/track/mock${i}`,
    };
  }).filter((item) => item.plays).sort(order);
  const listeners = [mockUser.id, ...Object.keys(MOCK_REPORT_USERS).slice(0, 4)];
  const users = listeners.map((id, i) => {
    const plays = Math.round((140 - i * 25 + seed) * share);
    const repeats = (i === 0) ? Math.round(17 * share) : 0;
    return {
      played_ms: (plays + repeats) * 231000,
      plays,
      repeats,
      user: (id === mockUser.id) ?
        {avatar: mockUser.avatar ?? null, bot: false, discriminator: mockUser.discriminator, id, username: mockUser.username} :
        (i < 3) ? {avatar: null, bot: false, discriminator: '0', id, username: MOCK_REPORT_USERS[id]} : null,
      user_id: id,
    };
  }).filter((item) => item.plays).sort(order);
  const artists = new Map<string, {name: string, played_ms: number, plays: number, repeats: number}>();
  for (const track of tracks) {
    const artist = artists.get(track.track.artist) ?? {name: track.track.artist, played_ms: 0, plays: 0, repeats: 0};
    artist.plays += track.plays;
    artist.repeats += track.repeats;
    artist.played_ms += track.played_ms;
    artists.set(track.track.artist, artist);
  }
  const plays = users.reduce((sum, item) => sum + item.plays, 0);
  return {
    artists: [...artists.values()].sort(order),
    period,
    sort,
    totals: {
      first_played: (plays) ? Date.now() - ((period === 'all') ? 75 : (period === 'year') ? 75 : (period === 'month') ? 29 : 6) * 86400000 : null,
      played_ms: users.reduce((sum, item) => sum + item.played_ms, 0),
      plays,
      repeats: users.reduce((sum, item) => sum + item.repeats, 0),
      tracks: tracks.length + Math.round(180 * share),
      users: users.length,
    },
    tracks,
    users,
  };
});

route('PATCH', '/(users/@me|admin)/guilds/(\\d+)/music', ([ , scope, guildId ], { body }) => {
  scopedGuild(scope, guildId, 'music');
  const music = guildMusic(guildId);
  if (body.loop !== undefined && body.loop !== 'off' && body.loop !== 'track' && body.loop !== 'queue') {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Loop must be off, track or queue');
  }
  for (const key of MUSIC_BOOLEAN_SETTINGS) {
    if (body[key] !== undefined && typeof(body[key]) !== 'boolean') {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `${key} must be a boolean`);
    }
  }
  // like the api, any snowflake (it doesn't check it's a role, the dashboard keeps @everyone out)
  if (body.dj_role_id !== undefined && body.dj_role_id !== null && !/^\d{15,21}$/.test(String(body.dj_role_id))) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'dj_role_id must be a snowflake or null');
  }
  // a premium perk like 24/7, it can be set either way
  if (body.crossfade !== undefined && (typeof(body.crossfade) !== 'number' || !Number.isInteger(body.crossfade) || body.crossfade < 0 || 12 < body.crossfade)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'crossfade must be 0 to 12 seconds');
  }
  if (body.max_duration !== undefined && (typeof(body.max_duration) !== 'number' || !Number.isInteger(body.max_duration) || body.max_duration < 0 || 24 * 60 * 60 < body.max_duration)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'max_duration must be 0 to 86400 seconds');
  }
  if (body.loop !== undefined) {
    music.loop = body.loop;
  }
  // 24/7 can be set either way, it only does anything with premium
  for (const key of MUSIC_BOOLEAN_SETTINGS) {
    if (body[key] !== undefined) {
      music[key] = body[key] as boolean;
    }
  }
  if (body.dj_role_id !== undefined) {
    music.dj_role_id = (body.dj_role_id as string | null);
  }
  if (body.crossfade !== undefined) {
    music.crossfade = body.crossfade as number;
  }
  if (body.max_duration !== undefined) {
    music.max_duration = (body.max_duration as number) || null;
  }
  return guildMusic(guildId);
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/music/control', ([ , scope, guildId ], { body }) => {
  scopedGuild(scope, guildId, 'music');
  const music = guildMusic(guildId);
  // the server's speed and volume, saved with nothing playing too
  if (body.action === 'speed' || body.action === 'volume') {
    const value = Number(body.value);
    if (value !== 100 && !music.premium) {
      throw new MockError(403, ApiErrorCodes.MUSIC_PREMIUM_REQUIRED, 'The speed and volume need a premium server');
    }
    const field = (body.action === 'speed') ? 'tempo' : 'volume';
    music.sound = {...music.sound, [field]: value};
    if (music.session) {
      music.session[field] = value;
      const effectSpeeds: Record<string, number> = {daycore: 0.8, nightcore: 1.25, slowed: 0.85, vaporwave: 0.8};
      music.session.speed = music.session.effects.reduce((total, effect) => total * (effectSpeeds[effect] ?? 1), music.session.tempo / 100);
    }
    return;
  }
  if (!music.session) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_MUSIC_SESSION, 'Nothing is playing in this server');
  }
  switch (body.action) {
    case 'pause':
    case 'resume': {
      music.session.paused = body.action === 'pause';
    }; break;
    case 'skip': {
      const next = music.queue.shift();
      if (music.loop === 'queue' && music.current) {
        music.queue.push(music.current);
      }
      music.current = (next) ? {...next, position: 0, status: 'playing'} : null;
      music.session.position = 0;
      music.session.paused = false;
      if (!music.current) {
        music.session = null;
        music.loop = 'off';
      }
      renumberMusicQueue(music);
    }; break;
    case 'leave': {
      state.guildMusic.set(guildId, emptyGuildMusic(music));
    }; break;
    // the api checks premium for adding, the bot what stacks (the page doesn't offer ones that don't)
    case 'effect_add': {
      if (!music.premium) {
        throw new MockError(403, ApiErrorCodes.MUSIC_PREMIUM_REQUIRED, 'Effects need a premium server');
      }
      if (music.session.effects.length < 5) {
        music.session.effects = [...music.session.effects, String(body.effect)];
      }
    }; break;
    case 'effect_remove': {
      const effects = music.session.effects, effect = String(body.effect), at = Number(body.index);
      const index = (effects[at] === effect) ? at : effects.lastIndexOf(effect);
      music.session.effects = effects.filter((_, position) => position !== index);
    }; break;
    case 'effect_clear': {
      music.session.effects = [];
    }; break;
    default: throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Unknown action');
  }
  // the node's speed: the speed effects' times the tempo
  if (music.session && body.action.startsWith('effect_')) {
    const effectSpeeds: Record<string, number> = {daycore: 0.8, nightcore: 1.25, slowed: 0.85, vaporwave: 0.8};
    music.session.speed = music.session.effects.reduce((total, effect) => total * (effectSpeeds[effect] ?? 1), music.session.tempo / 100);
  }
});

route('PATCH', '/(users/@me|admin)/guilds/(\\d+)/music/queue/(\\d+)', ([ , scope, guildId, itemId ], { body }) => {
  scopedGuild(scope, guildId, 'music');
  const music = guildMusic(guildId);
  const item = findMusicQueueItem(music, itemId);
  music.queue = music.queue.filter((other) => other !== item);
  music.queue.splice(Math.min(Math.max(Number(body.position) - 1, 0), music.queue.length), 0, item);
  renumberMusicQueue(music);
  return music;
});

route('DELETE', '/(users/@me|admin)/guilds/(\\d+)/music/queue/(\\d+)', ([ , scope, guildId, itemId ]) => {
  scopedGuild(scope, guildId, 'music');
  const music = guildMusic(guildId);
  const item = findMusicQueueItem(music, itemId);
  music.queue = music.queue.filter((other) => other !== item);
  renumberMusicQueue(music);
  return music;
});

route('POST', '/(users/@me|admin)/guilds/(\\d+)/music/queue/delete', ([ , scope, guildId ]) => {
  scopedGuild(scope, guildId, 'music');
  const music = guildMusic(guildId);
  music.queue = [];
  return music;
});

// ai memory: mirrors `views/me_llm_memories.py`
route('GET', '/users/@me/llm/memories', () => {
  return {items: state.llmMemories, limits: {global: 25, server: 15}};
});

function findLLMMemory(memoryId: string) {
  const memory = state.llmMemories.find((other) => other.id === memoryId);
  if (!memory) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_LLM_MEMORY, 'Unknown Memory');
  }
  return memory;
}

route('PATCH', '/users/@me/llm/memories/(\\d+)', ([ , memoryId ], { body }) => {
  const memory = findLLMMemory(memoryId);
  const content = (typeof body.content === 'string') ? body.content.trim() : '';
  if (!content || 200 < content.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Content must be 1 to 200 characters');
  }
  // same stand-ins for the content scanner as reminders
  if (content.toLowerCase().includes('blockme')) {
    throw new MockError(400, ApiErrorCodes.TEXT_BLOCKED_GUIDELINES, 'The memory was blocked because it may violate Discord\'s Community Guidelines');
  }
  memory.content = content;
  return memory;
});

route('DELETE', '/users/@me/llm/memories/(\\d+)', ([ , memoryId ]) => {
  findLLMMemory(memoryId);
  state.llmMemories = state.llmMemories.filter((other) => other.id !== memoryId);
});

route('DELETE', '/users/@me/llm/memories', () => {
  const count = state.llmMemories.length;
  state.llmMemories = [];
  return {count};
});

// premium server slots: mirrors `views/me_premium_servers.py` (the mock user has premium plus, and can stack slots
// like plus ai). The limit is counted in slots so stacking shows up even though the mock user is an owner
const MAX_PREMIUM_SERVERS = 3;
const PREMIUM_SERVER_LOCK = 24 * 60 * 60 * 1000;

function premiumServersPage() {
  return {
    active: true,
    items: state.premiumServers.map((server) => {
      const guild = state.guilds.find((entry) => entry.summary.id === server.server_id)?.summary;
      return {
        ...server,
        guild: (guild) ? {icon: guild.icon, id: guild.id, name: guild.name} : null,
        removable_at: new Date(toDate(server.created).getTime() + PREMIUM_SERVER_LOCK).toISOString(),
        user_id: mockUser.id,
      };
    }),
    limit: MAX_PREMIUM_SERVERS,
    used: state.premiumServers.reduce((total, server) => total + server.slots, 0),
  };
}

route('GET', '/users/@me/premium/servers', () => premiumServersPage());

route('PUT', '/users/@me/premium/servers/(\\d+)', ([ , guildId ]) => {
  throwGuildsError();
  if (!state.guilds.some((entry) => entry.summary.id === guildId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_SERVER, 'Unknown Server');
  }
  if (MAX_PREMIUM_SERVERS <= premiumServersPage().used) {
    throw new MockError(400, ApiErrorCodes.MAX_PREMIUM_SERVERS, `You already used all ${MAX_PREMIUM_SERVERS} of your premium server slots, remove one first`, {limit: MAX_PREMIUM_SERVERS});
  }
  const existing = state.premiumServers.find((server) => server.server_id === guildId);
  if (existing) {
    // stacked, locked in again like a new slot
    existing.slots += 1;
    existing.created = new Date().toISOString();
  } else {
    state.premiumServers.push({created: new Date().toISOString(), server_id: guildId, slots: 1});
  }
  return {...premiumServersPage(), created: true};
});

route('DELETE', '/users/@me/premium/servers/(\\d+)', ([ , serverId ]) => {
  const server = state.premiumServers.find((other) => other.server_id === serverId);
  if (!server) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_PREMIUM_SERVER, 'Unknown Premium Server');
  }
  const removableAt = toDate(server.created).getTime() + PREMIUM_SERVER_LOCK;
  if (Date.now() < removableAt) {
    throw new MockError(400, ApiErrorCodes.PREMIUM_SERVER_COOLDOWN, 'This server got your premium too recently to take it off yet', {removable_at: new Date(removableAt).toISOString()});
  }
  if (1 < server.slots) {
    server.slots -= 1;
  } else {
    state.premiumServers = state.premiumServers.filter((other) => other !== server);
  }
  return premiumServersPage();
});

// applications: mirrors `views/me_applications.py` and the applications part of `views/admin.py`
const MAX_APPLICATIONS = 5;
const API_ACCESS = 1 << 2;

function mockHasApiAccess() {
  return state.owner || (mockUser.flags & API_ACCESS) === API_ACCESS;
}

function findApplication(applicationId: string) {
  const application = state.applications.find((other) => other.id === applicationId);
  if (!application) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_APPLICATION, 'Unknown Application');
  }
  return application;
}

function findMeApplication(applicationId: string) {
  const application = findApplication(applicationId);
  if (application.owner_id !== mockUser.id) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_APPLICATION, 'Unknown Application');
  }
  return application;
}

function requireMockApiAccess() {
  if (!mockHasApiAccess()) {
    throw new MockError(403, ApiErrorCodes.MISSING_ACCESS, 'Missing API Access');
  }
}

function applicationName(body: Record<string, unknown>) {
  const name = (typeof body.name === 'string') ? body.name.replace(/[\r\n]+/g, ' ').trim() : '';
  if (name.length < 3 || 32 < name.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'name must be 3-32 characters', {field: 'name'});
  }
  return name;
}

function mockToken(application: {id: string}) {
  return `${btoa(JSON.stringify({alg: 'HS512'}))}.${btoa(JSON.stringify({id: application.id}))}.${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

// the dashboard shape leaves out the owner
function meApplication({ user: _user, ...application }: (typeof state.applications)[number]) {
  return application;
}

function requireNotNotSoBot(application: {flags: number}) {
  if (application.flags & 1) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'NotSoBot\'s own applications can only be changed in the database');
  }
}

route('GET', '/users/@me/applications', () => {
  const items = state.applications.filter((application) => application.owner_id === mockUser.id).map(meApplication);
  return {can_create: mockHasApiAccess(), count: items.length, items, limit: MAX_APPLICATIONS};
});

route('POST', '/users/@me/applications', (_match, { body }) => {
  requireMockApiAccess();
  const name = applicationName(body);
  if (MAX_APPLICATIONS <= state.applications.filter((application) => application.owner_id === mockUser.id).length) {
    throw new MockError(400, ApiErrorCodes.MAX_APPLICATIONS, `Exceeded Max Applications (${MAX_APPLICATIONS})`, {limit: MAX_APPLICATIONS});
  }
  const application = {
    created: new Date().toISOString(),
    flags: 0,
    id: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
    name,
    owner_id: mockUser.id,
    user: {avatar: mockUser.avatar, discriminator: mockUser.discriminator, id: mockUser.id, username: mockUser.username},
  };
  state.applications.unshift(application);
  return {...meApplication(application), token: mockToken(application)};
});

route('PATCH', '/users/@me/applications/(\\d+)', ([ , applicationId ], { body }) => {
  const application = findMeApplication(applicationId);
  application.name = applicationName(body);
  return meApplication(application);
});

route('DELETE', '/users/@me/applications/(\\d+)', ([ , applicationId ]) => {
  findMeApplication(applicationId);
  state.applications = state.applications.filter((other) => other.id !== applicationId);
});

route('GET', '/users/@me/applications/(\\d+)/token', ([ , applicationId ]) => {
  requireMockApiAccess();
  const application = findMeApplication(applicationId);
  return {...meApplication(application), token: mockToken(application)};
});

route('POST', '/users/@me/applications/(\\d+)/token-reset', ([ , applicationId ]) => {
  requireMockApiAccess();
  const application = findMeApplication(applicationId);
  return {...meApplication(application), token: mockToken(application)};
});

route('GET', '/admin/applications', (_match, { query }) => {
  requireStaff();
  const text = (query.get('query') || '').trim().toLowerCase();
  const userId = query.get('user_id');
  const disabled = query.get('disabled');
  const matching = state.applications
    .filter((application) => !userId || application.owner_id === userId)
    .filter((application) => disabled === null || ((application.flags & 2) === 2) === (disabled === 'true'))
    .filter((application) => !text || application.name.toLowerCase().includes(text) || !!application.user?.username.toLowerCase().includes(text)
      || application.id === text || application.owner_id === text);
  return pageOf(matching, query);
});

route('GET', '/admin/applications/(\\d+)', ([ , applicationId ]) => {
  requireStaff();
  const application = findApplication(applicationId);
  // made up but stable per application, the bot's own ones the busiest
  const seed = Number(BigInt(applicationId) % 9973n);
  const requests = (application.flags & 2) ? seed % 40 : ((application.flags & 1) ? 250000 : 0) + seed * 17;
  const endpoints = ['/image/imagine', '/tags/render', '/image/deepfry', '/users/@me', '/image/caption', '/search/google'];
  return {
    ...application,
    usage: {
      days: 30,
      endpoints: (requests) ? endpoints.slice(seed % 2, (seed % 2) + 5).map((endpoint, i) => ({count: Math.round(requests / (2 + i * 1.7)), endpoint})) : [],
      errors: Math.round(requests * ((seed % 7) / 100)),
      first_request_at: (requests) ? new Date(Date.now() - 86400000 * 29.5).toISOString() : null,
      last_request_at: (requests) ? new Date(Date.now() - 60000 * (seed % 300)).toISOString() : null,
      requests,
    },
  };
});

route('PATCH', '/admin/applications/(\\d+)', ([ , applicationId ], { body }) => {
  requireStaff();
  const application = findApplication(applicationId);
  if (typeof body.disabled === 'boolean') {
    requireNotNotSoBot(application);
    application.flags = (body.disabled) ? (application.flags | 2) : (application.flags & ~2);
  }
  if (body.name !== undefined) {
    application.name = applicationName(body);
  }
  return application;
});

route('POST', '/admin/applications/(\\d+)/token-reset', ([ , applicationId ]) => {
  requireStaff();
  const application = findApplication(applicationId);
  requireNotNotSoBot(application);
  return application;
});

route('DELETE', '/admin/applications/(\\d+)', ([ , applicationId ]) => {
  requireBotOwner();
  requireNotNotSoBot(findApplication(applicationId));
  state.applications = state.applications.filter((other) => other.id !== applicationId);
});

function applicationAccessItem(user: (typeof state.adminUsers)[number]) {
  return {
    applications: state.applications.filter((application) => application.owner_id === user.id).length,
    user: {avatar: user.avatar, discriminator: user.discriminator, flags: user.flags, id: user.id, username: user.username},
  };
}

route('GET', '/admin/applications/access', (_match, { query }) => {
  requireBotOwner();
  const text = (query.get('query') || '').trim().toLowerCase();
  const matching = state.adminUsers
    .filter((user) => (user.flags & API_ACCESS) === API_ACCESS)
    .filter((user) => !text || user.username.toLowerCase().includes(text) || user.id === text)
    .sort((a, b) => a.username.localeCompare(b.username))
    .map(applicationAccessItem);
  return pageOf(matching, query);
});

route('PUT', '/admin/applications/access/(\\d+)', ([ , userId ]) => {
  requireStaff();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (!user) {
    throw new MockError(404, 10008, 'Unknown User');
  }
  if (user.blocked) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Blocked users can\'t have API access');
  }
  user.flags |= API_ACCESS;
  return applicationAccessItem(user);
});

route('DELETE', '/admin/applications/access/(\\d+)', ([ , userId ]) => {
  requireStaff();
  const user = state.adminUsers.find((other) => other.id === userId);
  if (!user) {
    throw new MockError(404, 10008, 'Unknown User');
  }
  if (user.flags & 1) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Bot owners always have API access');
  }
  user.flags &= ~API_ACCESS;
  return applicationAccessItem(user);
});

// owner only identities and proxies (`/admin/identities`): 30 static proxies (24 with a youtube account, a few in
// geopy, google, google_images and strict too), 6 geo proxies only in geopy, 1 rotating proxy in global, and a couple
// unused
type MockProxy = IdentityProxyItem & {password: string | null};
const MOCK_IDENTITY_SERVICES = {
  youtube: {kind: 'cookies', cooldown: 60, backoff: [300, 1200, 3600, 21600], secret_optional: false, shared: false},
  google: {kind: 'cookies', cooldown: 20, backoff: [600, 3600, 21600], secret_optional: true, shared: false},
  google_images: {kind: 'cookies', cooldown: 5, backoff: [45, 300, 1800], secret_optional: true, shared: false},
  geopy: {kind: 'none', cooldown: 2, backoff: [60, 300, 1800], secret_optional: false, shared: false},
  global: {kind: 'none', cooldown: 0, backoff: [0], secret_optional: false, shared: true},
  strict: {kind: 'none', cooldown: 0, backoff: [0], secret_optional: false, shared: true},
} as const;
type MockService = keyof typeof MOCK_IDENTITY_SERVICES;

function mockProxy(id: number, host: string, port: number, labels: Array<string>, username = 'dan', password: string | null = 'secret'): MockProxy {
  return {
    id, scheme: 'http', host, port, username, password, has_password: password !== null, labels, exit_ip: host,
    status: 'active', down: false, created: Date.now() - 40 * 86400 * 1000, identities: [],
  };
}

const mockProxies: Array<MockProxy> = [
  ...Array.from({length: 30}, (_, index) => mockProxy(index + 1, '23.142.16.250', 14450 + index, ['static'])),
  ...Array.from({length: 6}, (_, index) => mockProxy(31 + index, `203.0.113.${10 + index}`, 8000, ['geo', 'eu'], 'geo', `geo-pass-${index}`)),
  mockProxy(37, '10.9.9.9', 3128, ['rotating'], 'rot', 'rotpass'),
  mockProxy(38, '198.51.100.5', 9000, [], '', null),
];
mockProxies[7].status = 'disabled';
mockProxies[11].down = true;
const mockIdentityBreaker = {until: 0};

function mockProxyPublic(proxy: MockProxy): Identity['proxy'] {
  const { password: _password, identities: _identities, ...rest } = proxy;
  return rest;
}

function newMockIdentity(service: MockService, name: string, proxy: MockProxy, overrides: Partial<Identity> = {}): Identity {
  const now = Date.now();
  return {
    id: `${service}:${name}`, service, kind: MOCK_IDENTITY_SERVICES[service].kind, status: 'active', proxy: mockProxyPublic(proxy),
    in_pool: true, next_at: now - 1000, leased_ms: 0, streak: 0, strikes: 0, last_ok: null, last_error: null, last_error_at: null,
    secret_updated: null, has_secret: false, has_login: false, login_updated: null, created: now, ...overrides,
  };
}

const mockIdentities: Array<Identity> = [
  ...Array.from({length: 24}, (_, index) => {
    const now = Date.now();
    const dead = index === 3 || index === 17;
    const flagged = index % 5 === 1;
    return newMockIdentity('youtube', String(index).padStart(3, '0'), mockProxies[index], {
      status: (dead) ? 'dead' : (index === 20) ? 'disabled' : 'active',
      next_at: (flagged) ? now + 4 * 60 * 1000 + index * 1000 : (index % 3 === 0) ? now + 40 * 1000 : now - 1000,
      leased_ms: (index === 2 || index === 9) ? 95 * 1000 : 0,
      streak: (flagged) ? 1 + (index % 3) : 0,
      strikes: (dead) ? 3 : 0,
      last_ok: (index === 22) ? null : now - (index + 1) * 7 * 60 * 1000,
      last_error: (dead) ? 'cookie_suspect: video unavailable, this content isn’t available' : (flagged) ? 'ip_flagged: bot check' : null,
      last_error_at: (dead || flagged) ? now - index * 60 * 1000 : null,
      secret_updated: now - index * 3600 * 1000,
      has_secret: true,
      has_login: index % 4 !== 3,
      login_updated: (index % 4 !== 3) ? now - 2 * 86400 * 1000 : null,
      created: now - 40 * 86400 * 1000,
    });
  }),
  ...[24, 25, 26, 27].flatMap((index) => [
    newMockIdentity('google', `23.142.16.250-${14450 + index}`, mockProxies[index], {has_secret: index % 2 === 0}),
    newMockIdentity('geopy', `23.142.16.250-${14450 + index}`, mockProxies[index]),
  ]),
  ...mockProxies.slice(30, 36).map((proxy) => newMockIdentity('geopy', `${proxy.host}-${proxy.port}`, proxy)),
  newMockIdentity('global', '10.9.9.9-3128', mockProxies[36]),
  ...[0, 1, 2].map((index) => newMockIdentity('strict', `23.142.16.250-${14450 + index}`, mockProxies[index])),
  // assigned to youtube, waiting for their cookies
  ...[28, 29].map((index) => newMockIdentity('youtube', `23.142.16.250-${14450 + index}`, mockProxies[index], {status: 'pending', in_pool: false})),
  ...[28, 29].map((index) => newMockIdentity('google_images', `23.142.16.250-${14450 + index}`, mockProxies[index], {has_secret: index === 28})),
];

function mockIdentitiesPayload() {
  const now = Date.now();
  for (const identity of mockIdentities) {
    const proxy = mockProxies.find((other) => other.id === identity.proxy.id)!;
    identity.proxy = mockProxyPublic(proxy);
    identity.in_pool = identity.status === 'active' && proxy.status === 'active';
  }
  for (const proxy of mockProxies) {
    proxy.has_password = proxy.password !== null;
    proxy.identities = mockIdentities.filter((identity) => identity.proxy.id === proxy.id).map(({ id, service, status }) => ({id, service, status}));
  }
  const labels = [...new Set(mockProxies.flatMap((proxy) => proxy.labels))].sort();
  return {
    identities: mockIdentities,
    labels: labels.map((name, index) => ({id: index + 1, name, proxies: mockProxies.filter((proxy) => proxy.labels.includes(name)).length})),
    proxies: mockProxies.map(({ password: _password, ...rest }) => rest),
    services: Object.entries(MOCK_IDENTITY_SERVICES).map(([ service, policy ]) => {
      const mine = mockIdentities.filter((identity) => identity.service === service);
      const count = (status: string) => mine.filter((identity) => identity.status === status).length;
      const counts = {active: count('active'), dead: count('dead'), disabled: count('disabled'), pending: count('pending')};
      return {
        service, kind: policy.kind,
        counts,
        pool: mine.filter((identity) => identity.in_pool).length,
        available: mine.filter((identity) => identity.in_pool && !identity.leased_ms && (identity.next_at ?? 0) <= now && !identity.proxy.down).length,
        flagged_recently: mine.filter((identity) => identity.streak).length,
        paused_for: (service === 'youtube') ? Math.max(0, Math.round((mockIdentityBreaker.until - now) / 1000)) : 0,
        cooldown: policy.cooldown, backoff: [...policy.backoff], cookie_strikes: 3, secret_optional: policy.secret_optional, shared: policy.shared,
      };
    }),
  };
}

function mockLabels() {
  return mockIdentitiesPayload().labels;
}

function findMockIdentity(identityId: string): Identity {
  const identity = mockIdentities.find((other) => other.id === decodeURIComponent(identityId));
  if (!identity) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_IDENTITY, 'Unknown Identity');
  }
  return identity;
}

function findMockProxy(proxyId: unknown): MockProxy {
  const proxy = mockProxies.find((other) => other.id === Number(proxyId));
  if (!proxy) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_IDENTITY, `Unknown proxy ${String(proxyId)}`);
  }
  return proxy;
}

function mockService(service: string) {
  if (!(service in MOCK_IDENTITY_SERVICES)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `unknown service '${service}'`);
  }
  return MOCK_IDENTITY_SERVICES[service as MockService];
}

function checkMockProxyFree(service: string, proxy: MockProxy, ignoreId?: string) {
  const holder = mockIdentities.find((other) => other.service === service && other.proxy.id === proxy.id && other.id !== ignoreId);
  if (holder) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `${proxy.host}:${proxy.port} already holds ${holder.id}, one ${service} account per ip`);
  }
}

function checkMockCookies(service: string, cookies: unknown) {
  const policy = mockService(service);
  if (policy.kind === 'none') {
    if (cookies) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `${service} identities have no secret`);
    }
    return;
  }
  if (!cookies && policy.secret_optional) {
    return;
  }
  if (typeof cookies === 'string' && /^\s*[[{]/.test(cookies)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(cookies);
    } catch {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'not a cookies.txt or cookie json export (not valid json)');
    }
    const list = (Array.isArray(parsed)) ? parsed : (parsed as {cookies?: unknown})?.cookies;
    if (!Array.isArray(list) || !list.some((cookie) => String(cookie?.domain ?? '').endsWith(`${service}.com`))) {
      throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `no ${service} cookies in the file`);
    }
    return;
  }
  if (typeof cookies !== 'string' || !new RegExp(`${service}\\.com\t`).test(cookies)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `no ${service} cookies in the file`);
  }
}

// the api's `parse_proxy_line`, without ipv6
function parseMockProxyLine(line: string, scheme: string) {
  const url = line.match(/^(?:(\w+):\/\/)?(?:([^:@]*)(?::(.*))?@)?([^:@/]+):(\d+)$/);
  if (url && (line.includes('://') || line.includes('@'))) {
    return {scheme: url[1] || scheme, username: url[2] ?? '', password: url[3] ?? null, host: url[4], port: Number(url[5])};
  }
  const parts = line.split(':');
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    return {scheme, host: parts[0], port: Number(parts[1]), username: '', password: null};
  }
  if (4 <= parts.length && /^\d+$/.test(parts[1])) {
    return {scheme, host: parts[0], port: Number(parts[1]), username: parts[2], password: parts.slice(3).join(':')};
  }
  throw new Error('not host:port, host:port:user:pass or a proxy url');
}

/* voice nodes (owner): one online, one disabled and still draining, one offline */

const mockVoiceNodes = [
  {created: '2026-10-20T18:00:00.000Z', enabled: true, id: '1430000000000000001', name: 'us-va-01', url: 'https://us-va-01.voice.nsb.gg'},
  {created: '2026-10-21T09:30:00.000Z', enabled: false, id: '1430000000000000002', name: 'de-fra-01', url: 'https://de-fra-01.voice.nsb.gg'},
  {created: '2026-10-22T14:10:00.000Z', enabled: true, id: '1430000000000000003', name: 'us-sjc-01', url: 'https://us-sjc-01.voice.nsb.gg'},
];

function findMockVoiceNode(nodeId: string) {
  const node = mockVoiceNodes.find((item) => item.id === nodeId);
  if (!node) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_VOICE_NODE, 'Unknown Voice Node');
  }
  return node;
}

function mockVoiceNodeStats(players: number, playing: number, paused: number, workers: number) {
  return {
    cpu: {cores: workers + 1, load: 0.12 + players / 400},
    memory: {heap: 18 * 1024 * 1024, rss: (90 + players * 2) * 1024 * 1024, system_free: 2.1 * 1024 ** 3, system_total: 4 * 1024 ** 3},
    paused,
    players,
    playing,
    sessions: 2,
    uptime: (31 * 60 + 7) * 60 * 1000,
    version: '0.0.1',
    workers: Array.from({length: workers}, (_, index) => ({
      paused: (index === 0) ? paused : 0,
      players: Math.floor(players / workers) + ((index < players % workers) ? 1 : 0),
      playing: Math.floor(playing / workers),
    })),
  };
}

route('GET', '/admin/voice-nodes', () => {
  requireBotOwner();
  return {nodes: mockVoiceNodes};
});

route('GET', '/admin/voice-nodes/stats', () => {
  requireBotOwner();
  // jitters a little so the live counter visibly moves
  const wobble = Math.floor(Math.random() * 3);
  return {
    nodes: [
      {error: null, id: mockVoiceNodes[0].id, latency: 38 + wobble, stats: mockVoiceNodeStats(57 + wobble, 49 + wobble, 6, 5)},
      {error: null, id: mockVoiceNodes[1].id, latency: 112, stats: mockVoiceNodeStats(4, 3, 1, 3)},
      {error: 'The node didn\u2019t answer in 5 seconds', id: mockVoiceNodes[2].id, latency: null, stats: null},
    ],
  };
});

// the status page's public view of the same three: no urls or errors, the draining one stays while it has players
route('GET', '/info/voice', () => {
  const wobble = Math.floor(Math.random() * 3);
  const publicStats = (stats: ReturnType<typeof mockVoiceNodeStats>) => ({
    cpu: stats.cpu.load,
    // a few of them with live effects on
    effects: Math.floor(stats.players / 8),
    memory: stats.memory.rss,
    paused: stats.paused,
    players: stats.players,
    playing: stats.playing,
    uptime: stats.uptime,
    version: stats.version,
  });
  const [ online, draining, offline ] = mockVoiceNodes;
  return {
    nodes: [
      {enabled: online.enabled, id: online.id, latency: 38 + wobble, name: online.name, stats: publicStats(mockVoiceNodeStats(57 + wobble, 49 + wobble, 6, 5))},
      {enabled: draining.enabled, id: draining.id, latency: 112, name: draining.name, stats: publicStats(mockVoiceNodeStats(4, 3, 1, 3))},
      {enabled: offline.enabled, id: offline.id, latency: null, name: offline.name, stats: null},
    ],
  };
});

route('POST', '/admin/voice-nodes/(\\d+)/test', ([ , nodeId ]) => {
  requireBotOwner();
  const node = findMockVoiceNode(nodeId);
  if (node.id === mockVoiceNodes[2].id) {
    return {error: 'The node didn\u2019t answer in 5 seconds', latency: null, ok: false, version: null};
  }
  return {error: null, latency: 41, ok: true, version: '0.0.1'};
});

route('GET', '/admin/identities', () => {
  requireBotOwner();
  return mockIdentitiesPayload();
});

route('POST', '/admin/identities', (_match, { body }) => {
  requireBotOwner();
  const service = String(body.service || '') as MockService;
  const name = String(body.name || '').trim();
  const id = `${service}:${name}`;
  if (mockIdentities.some((other) => other.id === id)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `${id} already exists`);
  }
  const policy = mockService(service);
  // an account without its cookies waits for them
  const waits = policy.kind === 'cookies' && !policy.secret_optional && !body.cookies;
  if (!waits) {
    checkMockCookies(service, body.cookies);
  }
  const proxy = findMockProxy(body.proxy_id);
  checkMockProxyFree(service, proxy);
  const login = body.login as IdentityLogin | undefined;
  if (login && (!login.username || !login.password)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'a login needs a username and a password');
  }
  const now = Date.now();
  const identity = newMockIdentity(service, name, proxy, {
    status: (body.status === 'disabled') ? 'disabled' : (waits) ? 'pending' : 'active', has_secret: !!body.cookies, secret_updated: (body.cookies) ? now : null,
    has_login: !!login, login_updated: (login) ? now : null,
  });
  if (login) {
    mockIdentityLogins.set(identity.id, login);
  }
  mockIdentities.push(identity);
  mockIdentities.sort((a, b) => a.id.localeCompare(b.id));
  return mockIdentitiesPayload().identities.find((other) => other.id === identity.id);
});

route('POST', '/admin/identities/bulk', (_match, { body }) => {
  requireBotOwner();
  const service = String(body.service || '') as MockService;
  const policy = mockService(service);
  const now = Date.now();
  const items = (body.items as Array<{name: string, proxy_id: number, login?: IdentityLogin}>) ?? [];
  const results = items.map((item) => {
    try {
      const id = `${service}:${item.name}`;
      if (mockIdentities.some((other) => other.id === id)) {
        throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `${id} already exists`);
      }
      const proxy = findMockProxy(item.proxy_id);
      checkMockProxyFree(service, proxy);
      const waits = policy.kind === 'cookies' && !policy.secret_optional;
      const identity = newMockIdentity(service, item.name, proxy, {
        status: (body.status === 'disabled') ? 'disabled' : (waits) ? 'pending' : 'active', in_pool: !waits,
        has_login: !!item.login, login_updated: (item.login) ? now : null,
      });
      if (item.login) {
        mockIdentityLogins.set(identity.id, item.login);
      }
      mockIdentities.push(identity);
      return {name: item.name, identity_id: identity.id, status: identity.status};
    } catch (error) {
      return {name: item.name, error: (error instanceof MockError) ? error.message : String(error)};
    }
  });
  mockIdentities.sort((a, b) => a.id.localeCompare(b.id));
  return {results};
});

route('POST', '/admin/identities/assign', (_match, { body }) => {
  requireBotOwner();
  const service = String(body.service || '') as MockService;
  const policy = mockService(service);
  // accounts wait for their cookies
  const accounts = policy.kind === 'cookies' && !policy.secret_optional;
  const added: Array<string> = [];
  const skipped: Array<number> = [];
  for (const proxyId of (body.proxy_ids as Array<number>) ?? []) {
    const proxy = findMockProxy(proxyId);
    if (mockIdentities.some((other) => other.service === service && other.proxy.id === proxy.id)) {
      skipped.push(proxy.id);
      continue;
    }
    let name = `${proxy.host.replace(/:/g, '_')}-${proxy.port}`;
    if (mockIdentities.some((other) => other.id === `${service}:${name}`)) {
      name = `${name}-${proxy.id}`;
    }
    const identity = newMockIdentity(service, name, proxy, {status: (accounts) ? 'pending' : (body.status === 'disabled') ? 'disabled' : 'active', in_pool: !accounts});
    mockIdentities.push(identity);
    added.push(identity.id);
  }
  mockIdentities.sort((a, b) => a.id.localeCompare(b.id));
  return {added, skipped, missing: []};
});

route('POST', '/admin/identities/unassign', (_match, { body }) => {
  requireBotOwner();
  const service = String(body.service || '');
  const policy = mockService(service);
  const accounts = policy.kind === 'cookies' && !policy.secret_optional;
  const ids = new Set((body.proxy_ids as Array<number>) ?? []);
  const mine = mockIdentities.filter((identity) => identity.service === service && ids.has(identity.proxy.id));
  const removed = mine.filter((identity) => !accounts || (identity.status === 'pending' && !identity.has_secret)).map((identity) => identity.id);
  for (const id of removed) {
    mockIdentities.splice(mockIdentities.findIndex((identity) => identity.id === id), 1);
  }
  return {removed, kept: mine.map((identity) => identity.id).filter((id) => !removed.includes(id))};
});

route('POST', '/admin/identities/cookies', (_match, { body }) => {
  requireBotOwner();
  const results = ((body.items as Array<{identity_id: string, cookies: string}>) ?? []).map(({ identity_id, cookies }) => {
    try {
      const identity = findMockIdentity(identity_id);
      checkMockCookies(identity.service, cookies);
      identity.has_secret = true;
      identity.secret_updated = Date.now();
      if (identity.status === 'dead' || identity.status === 'pending') {
        identity.status = 'active';
        identity.streak = 0;
        identity.strikes = 0;
        identity.next_at = Date.now();
      }
      return {identity_id, status: identity.status};
    } catch (error) {
      return {identity_id, error: (error instanceof MockError) ? error.message : 'failed'};
    }
  });
  return {results};
});

route('POST', '/admin/identities/services/([^/]+)/resume', () => {
  requireBotOwner();
  mockIdentityBreaker.until = 0;
});

route('POST', '/admin/identities/sync', () => {
  requireBotOwner();
  return {flushed: 3, identities: mockIdentities.length, removed: 0};
});

route('POST', '/admin/identities/proxies/bulk', (_match, { body }) => {
  requireBotOwner();
  const apply = body.apply === true;
  const labels = ((body.labels as Array<string>) ?? []).map((label) => label.trim().toLowerCase()).filter(Boolean);
  const scheme = String(body.scheme || 'http');
  const counts = {added: 0, updated: 0, skipped: 0, failed: 0};
  const seen = new Set<string>();
  const results = String(body.proxies || '').split('\n').map((line, index) => ({line: line.trim(), number: index + 1}))
    .filter(({ line }) => line && !line.startsWith('#'))
    .map(({ line, number }) => {
      let parsed;
      try {
        parsed = parseMockProxyLine(line, scheme);
      } catch (error) {
        counts.failed += 1;
        return {line: number, outcome: 'failed' as const, error: (error as Error).message};
      }
      const label = (parsed.username) ? `${parsed.username}@${parsed.host}:${parsed.port}` : `${parsed.host}:${parsed.port}`;
      const key = `${parsed.scheme}|${parsed.host}|${parsed.port}|${parsed.username}`;
      const base = {line: number, proxy: label, has_password: parsed.password !== null};
      if (seen.has(key)) {
        counts.skipped += 1;
        return {...base, outcome: 'skipped' as const, error: 'twice in the list'};
      }
      seen.add(key);
      const existing = mockProxies.find((proxy) => `${proxy.scheme}|${proxy.host}|${proxy.port}|${proxy.username}` === key);
      if (existing) {
        if (!body.update_existing) {
          counts.skipped += 1;
          return {...base, proxy_id: existing.id, outcome: 'skipped' as const, error: 'already added'};
        }
        if (apply) {
          if (parsed.password !== null) {
            existing.password = parsed.password;
          }
          existing.labels = [...new Set([...existing.labels, ...labels])].sort();
        }
        counts.updated += 1;
        return {...base, proxy_id: existing.id, outcome: (apply) ? 'updated' as const : 'would_update' as const};
      }
      let id: number | undefined;
      if (apply) {
        id = Math.max(0, ...mockProxies.map((proxy) => proxy.id)) + 1;
        mockProxies.push({...mockProxy(id, parsed.host, parsed.port, [...labels].sort(), parsed.username, parsed.password), scheme: parsed.scheme as MockProxy['scheme'], exit_ip: null});
      }
      counts.added += 1;
      return {...base, proxy_id: id, outcome: (apply) ? 'added' as const : 'would_add' as const};
    });
  if (!results.length) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'no proxies in the list');
  }
  return {applied: apply, ...counts, results};
});

route('PATCH', '/admin/identities/proxies', (_match, { body }) => {
  requireBotOwner();
  const updated: Array<number> = [];
  for (const proxyId of (body.proxy_ids as Array<number>) ?? []) {
    const proxy = findMockProxy(proxyId);
    if (body.status) {
      proxy.status = body.status as MockProxy['status'];
    }
    if (typeof body.username === 'string') {
      proxy.username = body.username;
    }
    if (body.clear_password) {
      proxy.password = null;
    } else if (typeof body.password === 'string') {
      proxy.password = body.password;
    }
    const remove = new Set((body.remove_labels as Array<string>) ?? []);
    proxy.labels = [...new Set([...proxy.labels.filter((label) => !remove.has(label)), ...((body.add_labels as Array<string>) ?? []).map((label) => label.trim().toLowerCase())])].filter(Boolean).sort();
    updated.push(proxy.id);
  }
  return {updated, failed: []};
});

route('POST', '/admin/identities/delete', (_match, { body }) => {
  requireBotOwner();
  const deleted: Array<string> = [];
  const missing: Array<string> = [];
  for (const identityId of (body.identity_ids as Array<string>) ?? []) {
    const index = mockIdentities.findIndex((identity) => identity.id === identityId);
    if (index === -1) {
      missing.push(identityId);
    } else {
      mockIdentities.splice(index, 1);
      deleted.push(identityId);
    }
  }
  return {deleted, missing};
});

route('POST', '/admin/identities/proxies/delete', (_match, { body }) => {
  requireBotOwner();
  const deleted: Array<number> = [];
  const inUse: Array<{id: number, identities: Array<string>}> = [];
  for (const proxyId of (body.proxy_ids as Array<number>) ?? []) {
    const identities = mockIdentities.filter((identity) => identity.proxy.id === Number(proxyId)).map((identity) => identity.id);
    if (identities.length) {
      inUse.push({id: Number(proxyId), identities});
      continue;
    }
    const index = mockProxies.findIndex((proxy) => proxy.id === Number(proxyId));
    if (index !== -1) {
      mockProxies.splice(index, 1);
      deleted.push(Number(proxyId));
    }
  }
  return {deleted, in_use: inUse};
});

route('PATCH', '/admin/identities/proxies/(\\d+)', ([ , proxyId ], { body }) => {
  requireBotOwner();
  const proxy = findMockProxy(proxyId);
  const next = {
    scheme: (body.scheme as MockProxy['scheme']) ?? proxy.scheme,
    host: (typeof body.host === 'string') ? body.host.trim().toLowerCase() : proxy.host,
    port: (body.port !== undefined) ? Number(body.port) : proxy.port,
    username: (typeof body.username === 'string') ? body.username : proxy.username,
  };
  const other = mockProxies.find((item) => item.id !== proxy.id && item.scheme === next.scheme && item.host === next.host && item.port === next.port && item.username === next.username);
  if (other) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `that's proxy #${other.id} already`);
  }
  Object.assign(proxy, next);
  if (body.clear_password) {
    proxy.password = null;
  } else if (typeof body.password === 'string') {
    proxy.password = body.password;
  }
  if (Array.isArray(body.labels)) {
    proxy.labels = [...new Set((body.labels as Array<string>).map((label) => label.trim().toLowerCase()).filter(Boolean))].sort();
  }
  if (body.status) {
    proxy.status = body.status as MockProxy['status'];
  }
  return mockIdentitiesPayload().proxies.find((item) => item.id === proxy.id);
});

const mockProxyRevealHistory = new Map<number, IdentityLoginReveal['history']>();

route('POST', '/admin/identities/proxies/(\\d+)/reveal', ([ , proxyId ]) => {
  requireBotOwner();
  const proxy = findMockProxy(proxyId);
  const history = mockProxyRevealHistory.get(proxy.id) ?? [];
  history.unshift({action: 'proxy_reveal', user_id: mockUser.id, created: Date.now()});
  mockProxyRevealHistory.set(proxy.id, history.slice(0, 10));
  const auth = (proxy.username) ? `${encodeURIComponent(proxy.username)}${(proxy.password !== null) ? `:${encodeURIComponent(proxy.password)}` : ''}@` : '';
  return {username: proxy.username, password: proxy.password, url: `${proxy.scheme}://${auth}${proxy.host}:${proxy.port}`, history};
});

route('PATCH', '/admin/identities/labels/(\\d+)', ([ , labelId ], { body }) => {
  requireBotOwner();
  const label = mockLabels().find((item) => item.id === Number(labelId));
  if (!label) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_IDENTITY, `Unknown label ${labelId}`);
  }
  const name = String(body.name || '').trim().toLowerCase();
  for (const proxy of mockProxies) {
    proxy.labels = [...new Set(proxy.labels.map((item) => (item === label.name) ? name : item))].sort();
  }
  return {id: label.id, name};
});

route('DELETE', '/admin/identities/labels/(\\d+)', ([ , labelId ]) => {
  requireBotOwner();
  const label = mockLabels().find((item) => item.id === Number(labelId));
  if (label) {
    for (const proxy of mockProxies) {
      proxy.labels = proxy.labels.filter((item) => item !== label.name);
    }
  }
});

route('PATCH', '/admin/identities/([^/]+)', ([ , identityId ], { body }) => {
  requireBotOwner();
  const identity = findMockIdentity(identityId);
  if (body.proxy_id !== undefined) {
    const proxy = findMockProxy(body.proxy_id);
    checkMockProxyFree(identity.service, proxy, identity.id);
    identity.proxy = mockProxyPublic(proxy);
  }
  if (body.cookies !== undefined) {
    checkMockCookies(identity.service, body.cookies);
    identity.has_secret = true;
    identity.secret_updated = Date.now();
    if (identity.status === 'dead') {
      identity.status = 'active';
    }
  }
  if (body.status !== undefined) {
    identity.status = body.status as Identity['status'];
  }
  if (identity.status === 'active' && (body.cookies !== undefined || body.status !== undefined)) {
    identity.streak = 0;
    identity.strikes = 0;
    identity.next_at = Date.now();
  }
  return mockIdentitiesPayload().identities.find((other) => other.id === identity.id);
});

route('DELETE', '/admin/identities/([^/]+)', ([ , identityId ]) => {
  requireBotOwner();
  const identity = findMockIdentity(identityId);
  mockIdentities.splice(mockIdentities.indexOf(identity), 1);
});

// saved logins, fake ones made up on first reveal for the identities that start with one
const mockIdentityLogins = new Map<string, IdentityLogin>();
const mockIdentityLoginHistory = new Map<string, IdentityLoginReveal['history']>();

function mockLoginAudit(identityId: string, action: IdentityLoginReveal['history'][number]['action']) {
  const history = mockIdentityLoginHistory.get(identityId) ?? [{action: 'login_set', user_id: '0', created: Date.now() - 2 * 86400 * 1000}];
  history.unshift({action, user_id: mockUser.id, created: Date.now()});
  mockIdentityLoginHistory.set(identityId, history.slice(0, 10));
}

route('PUT', '/admin/identities/([^/]+)/login', ([ , identityId ], { body }) => {
  requireBotOwner();
  const identity = findMockIdentity(identityId);
  if (!body.username || !body.password) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'a login needs a username and a password');
  }
  if (body.channel_url && !String(body.channel_url).startsWith('http')) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'channel_url has to be a link');
  }
  mockIdentityLogins.set(identity.id, {
    username: String(body.username),
    password: String(body.password),
    recovery_email: (body.recovery_email) ? String(body.recovery_email) : null,
    recovery_phone: (body.recovery_phone) ? String(body.recovery_phone) : null,
    channel_email: (body.channel_email) ? String(body.channel_email) : null,
    channel_url: (body.channel_url) ? String(body.channel_url) : null,
    two_factor: (body.two_factor) ? String(body.two_factor) : null,
    notes: (body.notes) ? String(body.notes) : null,
  });
  identity.has_login = true;
  identity.login_updated = Date.now();
  mockLoginAudit(identity.id, 'login_set');
  return identity;
});

route('DELETE', '/admin/identities/([^/]+)/login', ([ , identityId ]) => {
  requireBotOwner();
  const identity = findMockIdentity(identityId);
  mockIdentityLogins.delete(identity.id);
  identity.has_login = false;
  identity.login_updated = null;
  mockLoginAudit(identity.id, 'login_clear');
  return identity;
});

route('POST', '/admin/identities/([^/]+)/login/reveal', ([ , identityId ]) => {
  requireBotOwner();
  const identity = findMockIdentity(identityId);
  if (!identity.has_login) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, `${identity.id} has no saved login`);
  }
  const name = identity.id.split(':')[1].replace(/^\d+\./, '');
  const login = mockIdentityLogins.get(identity.id) ?? {
    username: `${name}@gmail.com`,
    password: `mock-pass-${name}`,
    recovery_email: `${name}.recovery@gmail.com`,
    recovery_phone: '+1 555 0100',
    channel_email: `${name}.channel@pages.plusgoogle.com`,
    channel_url: 'https://www.youtube.com/channel/UCmockchannel',
    // the rfc 6238 test vector's secret, so the shown code can be checked against any authenticator
    two_factor: 'GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ',
    notes: null,
  };
  mockIdentityLogins.set(identity.id, login);
  mockLoginAudit(identity.id, 'login_reveal');
  return {login, updated: identity.login_updated, history: mockIdentityLoginHistory.get(identity.id)};
});


// the dashboard shape leaves out the platform id and the owner, and has the clips
function meVoice({ created, id, name, platform_type }: (typeof state.voices)[number]) {
  return {created, id, name, platform_type, clips: state.voiceClips.get(id) ?? []};
}

function findOwnVoice(voiceId: string) {
  const voice = findVoice(voiceId);
  if (voice.user?.id !== mockUser.id) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_VOICE, 'Unknown Voice Clone');
  }
  return voice;
}

function findOwnVoiceClip(voiceId: string, clipId: string) {
  const voice = findOwnVoice(voiceId);
  const clips = state.voiceClips.get(voice.id) ?? [];
  const clip = clips.find((other) => other.id === clipId);
  if (!clip) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_VOICE_CLIP, 'Unknown Voice Clip');
  }
  return {voice, clips, clip};
}

// a short tone, so the seeded clips play something
function toneWav(frequency: number, seconds: number): Blob {
  const rate = 8000;
  const samples = rate * seconds;
  const view = new DataView(new ArrayBuffer(44 + samples * 2));
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 400, (samples - i) / 400);
    view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * frequency * i / rate) * 8000 * fade, true);
  }
  return new Blob([view], {type: 'audio/wav'});
}

const voiceClipAudio = new Map<string, Blob>();

// the mock user's first voice has two clips, the second was cloned before clips were kept and has none
{
  const [ first ] = state.voices.filter((voice) => voice.user?.id === mockUser.id);
  if (first) {
    const seeded = [
      {name: 'narration take 1.m4a', frequency: 330, seconds: 4},
      {name: 'podcast intro.mp3', frequency: 440, seconds: 6},
    ].map(({ name, frequency, seconds }, i) => {
      const id = (BigInt(first.id) + BigInt(i + 1) * 4194304n).toString();
      const audio = toneWav(frequency, seconds);
      voiceClipAudio.set(id, audio);
      return {created: first.created, duration: seconds * 1000, id, name, size: audio.size};
    });
    state.voiceClips.set(first.id, seeded);
  }
}

// like `prepare_voice_clip`: audio or video, and only the first minute is kept
function mockVoiceClip(body: Record<string, unknown>): VoiceClip {
  const file = body.file;
  if (!(file instanceof File)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'file is required', {field: 'file'});
  }
  if (!/^(audio|video)\//.test(file.type)) {
    throw new MockError(400, ApiErrorCodes.INVALID_FILE_TYPE, 'File must be audio or video');
  }
  const id = mockId();
  voiceClipAudio.set(id, file);
  // the mock can't probe it, a guess from the size (~128kbps) is close enough
  const duration = Math.max(2000, Math.min(60000, Math.round(file.size / 16)));
  return {created: new Date().toISOString(), duration, id, name: file.name.slice(0, 128), size: file.size};
}

route('GET', '/users/@me/voices', () => {
  const items = state.voices.filter((voice) => voice.user?.id === mockUser.id).map(meVoice);
  return {count: items.length, items};
});

route('PATCH', '/users/@me/voices/(\\d+)', ([ , voiceId ], { body }) => {
  findOwnVoice(voiceId);
  return meVoice(renameVoice(voiceId, body));
});

route('DELETE', '/users/@me/voices/(\\d+)', ([ , voiceId ]) => {
  const voice = findOwnVoice(voiceId);
  for (const clip of state.voiceClips.get(voice.id) ?? []) {
    voiceClipAudio.delete(clip.id);
  }
  state.voiceClips.delete(voice.id);
  state.voices = state.voices.filter((other) => other.id !== voice.id);
});

// cloned again from its clips on the other service, the old one is deleted
route('POST', '/users/@me/voices/(\\d+)/transfer', ([ , voiceId ], { body }) => {
  const voice = findOwnVoice(voiceId);
  const platformType = Number(body.platform_type);
  if (platformType !== VoiceCloneTypes.FISH_AUDIO) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'Voices can only be moved to fish.audio');
  }
  if (voice.platform_type === platformType) {
    throw new MockError(400, ApiErrorCodes.INVALID_FORM_BODY, 'This voice is already on fish.audio');
  }
  if (!state.voiceClips.get(voice.id)?.length) {
    throw new MockError(400, ApiErrorCodes.VOICE_HAS_NO_CLIPS, 'This voice was cloned before its audio was kept, so it can\'t be moved yet');
  }
  voice.platform_type = platformType;
  return meVoice(voice);
});

route('POST', '/users/@me/voices/(\\d+)/clips', ([ , voiceId ], { body }) => {
  const voice = findOwnVoice(voiceId);
  const clips = state.voiceClips.get(voice.id) ?? [];
  if (10 <= clips.length) {
    throw new MockError(400, ApiErrorCodes.MAX_VOICE_CLIPS, 'Voices can have up to 10 audio clips', {limit: 10});
  }
  state.voiceClips.set(voice.id, [...clips, mockVoiceClip(body)]);
  return meVoice(voice);
});

// the new clip gets a new id and goes at the end, like the api
route('PUT', '/users/@me/voices/(\\d+)/clips/(\\d+)', ([ , voiceId, clipId ], { body }) => {
  const { voice, clips, clip } = findOwnVoiceClip(voiceId, clipId);
  const added = mockVoiceClip(body);
  voiceClipAudio.delete(clip.id);
  state.voiceClips.set(voice.id, [...clips.filter((other) => other.id !== clip.id), added]);
  return meVoice(voice);
});

route('DELETE', '/users/@me/voices/(\\d+)/clips/(\\d+)', ([ , voiceId, clipId ]) => {
  const { voice, clips, clip } = findOwnVoiceClip(voiceId, clipId);
  if (clips.length <= 1) {
    throw new MockError(400, ApiErrorCodes.VOICE_CLIP_LAST, 'A voice needs at least one audio clip, delete the voice instead');
  }
  voiceClipAudio.delete(clip.id);
  state.voiceClips.set(voice.id, clips.filter((other) => other.id !== clip.id));
  return meVoice(voice);
});

route('GET', '/users/@me/voices/(\\d+)/clips/(\\d+)/audio', ([ , voiceId, clipId ]) => {
  const { clip } = findOwnVoiceClip(voiceId, clipId);
  const audio = voiceClipAudio.get(clip.id) ?? toneWav(220, 2);
  return new Response(audio, {status: 200, headers: {'content-type': audio.type || 'audio/mpeg'}});
});

route('GET', '/admin/voices', (_match, { query }) => {
  requireStaff();
  const text = (query.get('query') || '').trim().toLowerCase();
  const userId = query.get('user_id');
  const matching = state.voices
    .filter((voice) => !userId || voice.user?.id === userId)
    .filter((voice) => !text || voice.name.toLowerCase().includes(text) || !!voice.user?.username.toLowerCase().includes(text)
      || voice.id === text || voice.user?.id === text);
  return pageOf(matching, query);
});

route('PATCH', '/admin/voices/(\\d+)', ([ , voiceId ], { body }) => {
  requireStaff();
  return renameVoice(voiceId, body);
});


// public tag directory (the real one is `GET /tags/directory`), newest first, `before` + `limit` like the api
route('GET', '/tags/directory', (_match, { query }) => {
  const search = query.get('query') || '';
  const before = query.get('before');
  const limit = Number(query.get('limit')) || 50;
  const category = parseCategory(query.get('category'));
  // the recent-uses sorts (6-8) order by `recent_uses`, the rest keep the newest first
  const recentDays = MOCK_RECENT_USES_DAYS[query.get('sort_by') || ''];
  const items = [...state.directory.values(), ...state.adminDirectory.map(adminListingAsPublic)]
    .map((item) => (recentDays) ? {...item, recent_uses: mockRecentUses(item.tag.id, item.tag.uses, recentDays)} : item)
    .sort((a, b) => (recentDays && (b.recent_uses ?? 0) - (a.recent_uses ?? 0)) || ((BigInt(b.id) > BigInt(a.id)) ? 1 : -1))
    .filter((item) => category === undefined || item.category === category)
    .filter((item) => matchesDirectorySearch(search, item.tag, [item.title, item.tag.name, item.description]))
    .filter((item) => !before || BigInt(item.id) < BigInt(before))
    // `TagDirectory.to_dict()`: the media only goes public once the listing is verified
    .map((item) => (item.verified === TagDirectoryVerificationStates.VERIFIED) ? item : {...item, assets: []});
  return {count: items.length, items: items.slice(0, limit)};
});

// mirrors `utilities/tools/tags.py` `add_tag_alias`
route('POST', '/users/@me/tags/(\\d+)/add', ([ , tagId ], { body }) => {
  const source = state.tags.find((item) => item.id === tagId);
  if (!source || !state.directory.has(tagId)) {
    throw new MockError(404, ApiErrorCodes.UNKNOWN_TAG, 'Unknown Tag');
  }
  const guildId = (body.guild_id) ? String(body.guild_id) : null;
  if (guildId) {
    findGuild(guildId);
  }
  const serverId = guildId || mockUser.channel_id;
  const name = String(body.name || source.name).toLowerCase();
  const existing = state.tags.find((item) => item.name === name && item.server_id === serverId);
  if (existing) {
    if (existing.user.id !== mockUser.id) {
      throw new MockError(400, ApiErrorCodes.TAG_NAME_TAKEN, 'A tag with that name already exists here and you don\'t own it');
    }
    if (!existing.reference_tag) {
      throw new MockError(400, ApiErrorCodes.TAG_NAME_TAKEN, 'Cannot turn a regular tag into an alias');
    }
    existing.reference_tag = source;
    return existing;
  }
  const created: Tag = {
    ...source,
    content: '',
    created: new Date().toISOString(),
    edited: null,
    guild_id: guildId,
    id: (BigInt(Date.now()) << 22n).toString(),
    is_command: false,
    is_on_directory: false,
    last_used: null,
    name,
    reference_tag: source,
    server_id: serverId,
    user: {...source.user, id: mockUser.id, username: mockUser.username},
    uses: 0,
  };
  state.tags.unshift(created);
  return created;
});


/* install */

declare global {
  interface Window {
    __dashboardMocks?: {
      blocked: (value: string | boolean) => void,
      guildsError: (value: GuildsError) => void,
      loggedOut: (value: boolean) => void,
      latency: (ms: number) => void,
      owner: (value: boolean) => void,
      moderator: (value: boolean) => void,
    },
  }
}


/* public commands page: a few free ones and the premium kinds (music is premium or a premium server) */

type MockLocalizations = Record<string, string>;

interface MockCommandArg {
  aliases: Array<string>,
  choices: Array<{description: string, description_localizations?: MockLocalizations, value: string}>,
  description: string,
  description_localizations?: MockLocalizations,
  name: string,
  name_localizations?: MockLocalizations,
  prefix: string,
  required?: boolean | null,
}

function mockCommand(id: string, name: string, category: string, description: string, premium: null | string, types: Array<number> = [0]) {
  return {
    enabled: true,
    id,
    media: MOCK_COMMAND_PREVIEWS[id]?.media ?? [],
    metadata: types.map((type) => ({
      aliases: [],
      args: [] as Array<MockCommandArg>,
      category,
      credits: [],
      description,
      description_localizations: {} as MockLocalizations,
      dmable: !id.startsWith('music.'),
      enabled: true,
      examples: [`${name}`],
      external_id: (type === 0) ? null : '1430000000000000999',
      name,
      name_localizations: {} as MockLocalizations,
      premium,
      ratelimits: [],
      type,
      usage: '',
    })),
    preview_example: MOCK_COMMAND_PREVIEWS[id]?.example ?? null,
  };
}

const mockCommands = [
  mockCommand('music.play', 'music play', 'MUSIC', 'Search for a song to pick from (or play a track link, or a link to a file) in your voice channel', 'premium_server', [0, 1]),
  mockCommand('music.skip', 'music skip', 'MUSIC', 'Skip to the next track in the music queue', 'premium_server', [0, 1]),
  mockCommand('music.queue', 'music queue', 'MUSIC', 'Show what the music is playing and what is queued after it', 'premium_server'),
  mockCommand('ai', 'ai', 'AI', 'Talk to NotSoAI', 'premium_server', [0, 1]),
  mockCommand('voice.clone', 'tts voice create', 'AUDIO', 'Clone a voice for Text-to-Speech', 'premium_plus'),
  mockCommand('tag.show', 'tag', 'TAGS', 'Show a tag', null, [0, 1]),
  // one or two of each preview layout (./commandPreviews): slider, animated slider, side by side, video, audio, several inputs
  mockCommand('media.iv.manipulation.swirl', 'swirl', 'EFFECTS', 'Swirl an Image or Video from the center', null, [0, 1]),
  mockCommand('media.iv.manipulation.magik', 'magik', 'EFFECTS', 'Liquid rescale an Image or Video', null, [0, 1]),
  mockCommand('media.iv.manipulation.deepfry', 'deepfry', 'EFFECTS', 'Deepfry an Image or Video', null),
  mockCommand('media.iv.manipulation.magik.animated', 'magik gif', 'EFFECTS', 'Liquid rescale an Image into a gif', null),
  mockCommand('media.iv.manipulation.caption', 'caption', 'EFFECTS', 'Add a caption bar above an Image or Video', null, [0, 1]),
  mockCommand('media.iv.manipulation.demotivate', 'text demotivate', 'EFFECTS', 'Make a demotivational poster', null),
  mockCommand('media.aiv.manipulation.adhd', 'adhd', 'EFFECTS', 'Stack gameplay footage under some media', null, [0, 1]),
  mockCommand('media.av.manipulation.audio.pitch', 'audio pitch', 'AUDIO', 'Change the pitch of some audio', null),
  mockCommand('media.av.manipulation.boost.bass', 'boost bass', 'AUDIO', 'Boost the bass of some audio', null),
  mockCommand('media.a.tools.put.concat', 'audio put concat', 'AUDIO', 'Concat an Audio/Image/Video\'s audio with another audio file', null),
  mockCommand('media.iv.manipulation.eyes.googly', 'eyes googly', 'EFFECTS', 'Put googly eyes on faces', null),
  mockCommand('media.i.manipulation.face.clown', 'clown', 'EFFECTS', 'Turn faces into clowns', null),
  mockCommand('media.iv.manipulation.overlay.flag.usa', 'overlay usa', 'EFFECTS', 'Put the USA flag over an Image or Video', null),
  mockCommand('media.iv.manipulation.overlay.youtube', 'text youtube', 'EFFECTS', 'Make an Image look like a YouTube video', null),
  mockCommand('media.i.create.einstein', 'einstein', 'IMAGE', 'Einstein writing your text on a chalkboard', null),
  mockCommand('media.a.tools.put.replace', 'audio put replace', 'AUDIO', 'Replace the audio of some media with another audio file', null),
];

// the slash /caption as the bot uploads it (the bot's own translations), so a slash command shows its arguments
{
  const caption = mockCommands.find((command) => command.id === 'media.iv.manipulation.caption')!.metadata.find((metadata) => metadata.type === 1)!;
  caption.description_localizations = {'es': 'Añade texto de leyenda a una imagen o video', 'pt-BR': 'Adicionar uma legenda a uma imagem ou vídeo'};
  caption.name_localizations = {'es': 'leyenda', 'pt-BR': 'legenda'};
  caption.args = [
    {
      aliases: [],
      choices: [],
      description: 'Caption text, separate top and bottom with |',
      description_localizations: {'es': 'Texto de la leyenda, separa arriba y abajo con |', 'pt-BR': 'Texto da legenda, separe o topo e a base com |'},
      name: 'text',
      name_localizations: {'es': 'texto', 'pt-BR': 'texto'},
      prefix: '',
      required: true,
    },
    {
      aliases: [],
      choices: [],
      description: 'Emoji/Media URL/User',
      description_localizations: {'es': 'Emoji/URL de archivo/Usuario', 'pt-BR': 'Emoji/URL de mídia/Usuário'},
      name: 'url',
      prefix: '',
      required: false,
    },
    {
      aliases: [],
      choices: [
        {description: 'Futura (Default)', description_localizations: {'es': 'Futura (Predeterminado)', 'pt-BR': 'Futura (Padrão)'}, value: 'futura'},
        {description: 'Impact', value: 'impact'},
        {description: 'Arial', value: 'arial'},
      ],
      description: 'Font Choice',
      description_localizations: {'es': 'Fuente', 'pt-BR': 'Escolha da fonte'},
      name: 'font',
      name_localizations: {'es': 'fuente', 'pt-BR': 'fonte'},
      prefix: '',
      required: false,
    },
  ];
}

// the api's `localized_text`: the exact language, else one with the same base ('pt' -> 'pt-BR'), else the english
function mockLocalized(text: string, localizations: MockLocalizations | undefined, language: string | null): string {
  if (!language || !localizations) {
    return text;
  }
  const keys = Object.keys(localizations).sort();
  const key = keys.find((x) => x.toLowerCase() === language.toLowerCase()) ?? keys.find((x) => x.toLowerCase().split('-')[0] === language.toLowerCase().split('-')[0]);
  return (key) ? localizations[key] : text;
}

// `GET /commands?language=` sends one language and none of the translation maps
route('GET', '/commands', (_match, { query }) => {
  const language = query.get('language');
  return mockCommands.map((command) => ({
    ...command,
    metadata: command.metadata.map(({ description_localizations, name_localizations, ...metadata }) => ({
      ...metadata,
      default_name: metadata.name,
      description: mockLocalized(metadata.description, description_localizations, language),
      name: mockLocalized(metadata.name, name_localizations, language),
      args: metadata.args.map(({ description_localizations, name_localizations, ...arg }) => ({
        ...arg,
        choices: arg.choices.map(({ description_localizations, ...choice }) => ({
          ...choice,
          description: mockLocalized(choice.description, description_localizations, language),
        })),
        description: mockLocalized(arg.description, description_localizations, language),
        name: mockLocalized(arg.name, name_localizations, language),
      })),
    })),
  }));
});
route('GET', '/commands/stats', () => mockCommands.flatMap((command, index) => command.metadata.map((metadata) => ({
  count: 5000 - index * 600,
  id: command.id,
  name: metadata.name,
  since: Date.now() - 7 * 24 * 60 * 60 * 1000,
  type: metadata.type,
}))));


const MOCK_PUBLIC_PATHS = ['/tags/directory', '/reports/anonymous', '/commands', '/commands/stats', '/info/voice'];

export function installDashboardMocks(): void {
  const realFetch = window.fetch.bind(window);
  const prefix = new URL(config.apiBase, window.location.origin).pathname.replace(/\/+$/, '');

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL((input instanceof Request) ? input.url : String(input), window.location.origin);
    const method = (init?.method || ((input instanceof Request) ? input.method : 'GET')).toUpperCase();
    if (url.origin !== window.location.origin || !url.pathname.startsWith(prefix + '/')) {
      return realFetch(input, init);
    }
    const path = url.pathname.slice(prefix.length);
    for (const { method: routeMethod, pattern, handler } of routes) {
      const match = path.match(pattern);
      if (!match || !new RegExp(`^${routeMethod}$`).test(method)) {
        continue;
      }
      await new Promise((resolve) => window.setTimeout(resolve, state.latency));
      init?.signal?.throwIfAborted();
      const headers = new Headers(init?.headers);
      // the public tag directory and anonymous reports are fetched without a token
      if (!MOCK_PUBLIC_PATHS.includes(path) && headers.get('authorization') !== MOCK_TOKEN) {
        return json(401, {code: 0, message: '401: Unauthorized', status: 401});
      }
      let body: Record<string, unknown> = {};
      if (typeof init?.body === 'string') {
        body = JSON.parse(init.body);
      } else if (init?.body instanceof FormData) {
        body = Object.fromEntries(init.body.entries());
      }
      try {
        const result = handler(match, {method, query: url.searchParams, body});
        // media routes answer with the bytes themselves
        if (result instanceof Response) {
          return result;
        }
        // hand out copies so the app can't mutate the fake database through the query cache
        return json((result === undefined) ? 204 : 200, (result === undefined) ? undefined : structuredClone(result));
      } catch (error) {
        if (error instanceof MockError) {
          return json(error.status, {...error.metadata, code: error.code, message: error.message, status: error.status});
        }
        throw error;
      }
    }
    return realFetch(input, init);
  };

  // pretend we're logged in, unless browsing logged out
  if (state.loggedOut) {
    tokenStorage.clear();
  } else if (tokenStorage.get() !== MOCK_TOKEN) {
    tokenStorage.set(MOCK_TOKEN);
  }

  window.__dashboardMocks = {
    // takes effect after a reload (the user is fetched once)
    blocked: (value) => {
      state.blocked = (value === false) ? null : (value === true) ? '' : value;
      if (state.blocked === null) {
        sessionStorage.removeItem('dashboardMocks:blocked');
      } else {
        sessionStorage.setItem('dashboardMocks:blocked', state.blocked);
      }
    },
    // takes effect after a reload
    loggedOut: (value) => {
      state.loggedOut = value;
      if (value) {
        sessionStorage.setItem('dashboardMocks:loggedOut', '1');
      } else {
        sessionStorage.removeItem('dashboardMocks:loggedOut');
      }
    },
    guildsError: (value) => {
      state.guildsError = value;
      if (value) {
        sessionStorage.setItem('dashboardMocks:guildsError', value);
      } else {
        sessionStorage.removeItem('dashboardMocks:guildsError');
      }
    },
    latency: (ms) => {
      state.latency = ms;
    },
    // takes effect after a reload (the user is fetched once)
    owner: (value) => {
      state.owner = value;
      if (value) {
        sessionStorage.removeItem('dashboardMocks:notOwner');
      } else {
        sessionStorage.setItem('dashboardMocks:notOwner', '1');
      }
    },
    // a moderator: owner off and moderator on (then reload), `moderator(false)` makes them an owner again
    moderator: (value) => {
      state.moderator = value;
      state.owner = !value;
      if (value) {
        sessionStorage.setItem('dashboardMocks:moderator', '1');
        sessionStorage.setItem('dashboardMocks:notOwner', '1');
      } else {
        sessionStorage.removeItem('dashboardMocks:moderator');
        sessionStorage.removeItem('dashboardMocks:notOwner');
      }
    },
  };

  console.info('[dashboard mocks] enabled: /users/@me/* is served from in-memory fixtures');
}
