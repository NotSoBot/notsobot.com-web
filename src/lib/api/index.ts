import { ApiEndpoints, guildEndpoints, type AdminStatsArea, type GuildScope } from './endpoints';
import { ApiRequestError, apiRequest } from './client';
import { ApiErrorCodes, toTagDirectoryCategory } from './types';
import type {
  AdminApplication,
  AdminApplicationPatch,
  AdminApplicationDetail,
  AdminApplicationsPage,
  AdminEntitlementsPage,
  AdminFileStats,
  AdminGuild,
  AdminGuildPatch,
  AdminGuildsPage,
  AdminGuildsSortBy,
  AdminTagBlob,
  AdminTagDirectoryItem,
  AdminTagDirectoryPage,
  AdminUser,
  AdminUserPatch,
  AdminUsersPage,
  AdminTagDirectorySortBy,
  AdminCopyrightStrikes,
  AdminRemoval,
  AdminTagAuditPage,
  AdminTagDeleteResult,
  AdminTagDuplicates,
  AdminTagMergeSummary,
  AdminTagsPage,
  AdminTagsSortBy,
  AdminTagStoragePage,
  AdminTagVariable,
  AdminUsersSortBy,
  AdminIdentities,
  AdminIdentitiesBulkCreate,
  AdminIdentitiesBulkResult,
  AdminIdentityCreate,
  AdminIdentityPatch,
  AdminProxiesBulk,
  AdminProxiesBulkResult,
  AdminProxiesPatch,
  AdminProxyPatch,
  AdminVoice,
  AdminVoicesPage,
  Application,
  ApplicationAccessItem,
  ApplicationAccessPage,
  ApplicationsPage,
  ApplicationWithToken,
  Command,
  Identity,
  IdentityLabel,
  IdentityLogin,
  IdentityStatus,
  IdentityLoginReveal,
  IdentityProxyItem,
  ProxyReveal,
  ContentFlag,
  ContentFlagMatches,
  ContentFlagPatch,
  ContentFlagType,
  ContentFlagsPage,
  CommandStat,
  EntitlementsPage,
  GuildLLMKnowledge,
  GuildLLMKnowledgePage,
  LLMMemoriesPage,
  LLMMemory,
  LLMMemoryPatch,
  PremiumServersPage,
  Reminder,
  ReminderPatch,
  MeCommandsPage,
  AnonymousReport,
  MeReport,
  MeReportPatch,
  MeReportsPage,
  MeReportsSortBy,
  MeReportsUnread,
  WebsiteReportBody,
  RemindersPage,
  Report,
  ReportMessage,
  ReportMessagesPage,
  ReportTranslation,
  ReportPatch,
  ReportsPage,
  GuildRule,
  GuildRuleInput,
  InfoDiscord,
  JobResponse,
  Tag,
  TagAsset,
  TagBlobs,
  TagBlobsPut,
  TagDirectoryItem,
  TagDirectoryListingInput,
  TagDirectoryPage,
  TagPatch,
  TagServerCounts,
  TagServers,
  TagsPage,
  MeTagsDirectoryFilter,
  MeTagsSortBy,
  TagStorageScope,
  TagStorageType,
  TagVariable,
  TagVariables,
  UserGuild,
  UserGuildDataDelete,
  UserGuildDataExport,
  UserGuildPatch,
  UserGuildSummary,
  UserMe,
  UserSession,
  UserSettings,
  UserSettingsPatch,
  UserFilesPage,
  UserFilesSortBy,
  MeVoice,
  VoiceNode,
  VoiceNodeCreate,
  VoiceNodeEdit,
  VoiceNodeStatsItem,
  VoiceNodeTest,
  VoiceNodeWithPassword,
  VoicePatch,
  VoiceTransfer,
  VoicesPage,
} from './types';


export * from './client';
export * from './endpoints';
export * from './types';


// every listing the api returns goes through these, so pages only ever see categories they know
function normalizeListing<T extends {category: number}>(item: T): T {
  return {...item, category: toTagDirectoryCategory(item.category)};
}

function normalizeListings<T extends {items: Array<{category: number}>}>(page: T): T {
  return {...page, items: page.items.map(normalizeListing)};
}

// the admin delete routes' `reason`/`notice`, nothing for a plain delete
function removalQuery(removal?: AdminRemoval): {reason?: string, notice?: string} {
  if (!removal?.reason) {
    return {};
  }
  return {reason: removal.reason, notice: removal.notice.trim() || undefined};
}


export const api = {
  fetchCommands: (signal?: AbortSignal) => {
    return apiRequest<Array<Command>>(ApiEndpoints.COMMANDS, {auth: false, signal});
  },

  fetchCommandStats: (since: Date | null, signal?: AbortSignal) => {
    return apiRequest<Array<CommandStat>>(ApiEndpoints.COMMANDS_STATS, {
      auth: false,
      signal,
      query: {since: since?.toISOString()},
    });
  },

  fetchInfoDiscord: (signal?: AbortSignal) => {
    // polled every 2s, so give up quickly and let the next poll try again
    return apiRequest<InfoDiscord>(ApiEndpoints.INFO_DISCORD, {auth: false, signal, timeout: 5000});
  },

  fetchTagDirectory: (params: {
    query?: string,
    category?: number | null,
    sortBy?: number,
    verified?: number | null,
    nsfw?: boolean | null,
    before?: string,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<TagDirectoryPage>(ApiEndpoints.TAGS_DIRECTORY, {
      auth: false,
      signal,
      query: {
        query: params.query || undefined,
        category: params.category,
        sort_by: params.sortBy,
        verified: params.verified,
        nsfw: params.nsfw,
        before: params.before,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    }).then(normalizeListings);
  },

  // There's no public single-item endpoint; the directory is keyed and ordered by tag id,
  // so asking for the first item strictly before `id + 1` returns exactly that tag (if listed).
  fetchTagDirectoryItem: async (id: string, signal?: AbortSignal): Promise<TagDirectoryItem | null> => {
    if (!/^\d{1,21}$/.test(id)) {
      return null;
    }
    const page = await apiRequest<TagDirectoryPage>(ApiEndpoints.TAGS_DIRECTORY, {
      auth: false,
      signal,
      query: {before: (BigInt(id) + 1n).toString(), limit: 1},
    });
    const item = page.items[0];
    return (item && item.id === id) ? normalizeListing(item) : null;
  },

  fetchMe: (signal?: AbortSignal) => {
    return apiRequest<UserMe>(ApiEndpoints.USER_ME, {signal});
  },

  fetchMeSessions: (signal?: AbortSignal) => {
    return apiRequest<Array<UserSession>>(ApiEndpoints.USER_ME_SESSIONS, {signal});
  },

  logout: () => {
    return apiRequest<void>(ApiEndpoints.AUTH_LOGOUT);
  },


  // --- dashboard (docs/dashboard-api.md) ---

  fetchMeSettings: (signal?: AbortSignal) => {
    return apiRequest<UserSettings>(ApiEndpoints.USER_ME_SETTINGS, {signal});
  },

  patchMeSettings: (body: UserSettingsPatch) => {
    return apiRequest<UserSettings>(ApiEndpoints.USER_ME_SETTINGS, {method: 'PATCH', body});
  },

  // `before` only works with the default (newest) sort, `offset` pages any of them
  fetchMeTags: (params: {query?: string, sortBy?: MeTagsSortBy, directory?: MeTagsDirectoryFilter, serverId?: string | null, before?: string, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<TagsPage>(ApiEndpoints.USER_ME_TAGS, {
      signal,
      query: {
        query: params.query || undefined,
        sort_by: (params.sortBy && params.sortBy !== 'newest') ? params.sortBy : undefined,
        directory: params.directory?.listed,
        directory_verified: (params.directory?.listed) ? params.directory.verified : undefined,
        server_id: params.serverId || undefined,
        before: params.before,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  fetchMeTag: (tagId: string, signal?: AbortSignal) => {
    return apiRequest<Tag>(ApiEndpoints.USER_ME_TAG(tagId), {signal});
  },

  patchMeTag: (tagId: string, body: TagPatch) => {
    return apiRequest<Tag>(ApiEndpoints.USER_ME_TAG(tagId), {method: 'PATCH', body});
  },

  // null when the tag isn't on the directory
  fetchMeTagDirectory: async (tagId: string, signal?: AbortSignal): Promise<TagDirectoryItem | null> => {
    try {
      return normalizeListing(await apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY(tagId), {signal}));
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ITEM) {
        return null;
      }
      throw error;
    }
  },

  // publishes the tag (moving it to your personal tags), or edits the listing if it's already there
  publishMeTagDirectory: (tagId: string, body: TagDirectoryListingInput) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY(tagId), {method: 'PUT', body}).then(normalizeListing);
  },

  patchMeTagDirectory: (tagId: string, body: TagDirectoryListingInput) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY(tagId), {method: 'PATCH', body}).then(normalizeListing);
  },

  // puts an unverified listing up for review, which locks the tag
  requestMeTagDirectoryVerification: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_VERIFY(tagId), {method: 'POST'}).then(normalizeListing);
  },

  // only while it's still pending, unlocks the tag again
  cancelMeTagDirectoryVerification: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_VERIFY(tagId), {method: 'DELETE'}).then(normalizeListing);
  },

  // the listing's assets can only change while verification is pending; each answers with the whole listing
  uploadMeTagDirectoryAsset: (tagId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    // the api probes the media first, which can take a while for videos
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_ASSETS(tagId), {method: 'POST', body, timeout: 120_000}).then(normalizeListing);
  },

  // `position` 0 is the cover
  moveMeTagDirectoryAsset: (tagId: string, assetId: string, position: number) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_ASSET(tagId, assetId), {method: 'PATCH', body: {position}}).then(normalizeListing);
  },

  deleteMeTagDirectoryAsset: (tagId: string, assetId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_ASSET(tagId, assetId), {method: 'DELETE'}).then(normalizeListing);
  },

  // an image or video, the api shrinks it (a video's first frame) to a small png; same rules as the assets
  uploadMeTagDirectoryThumbnail: (tagId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_THUMBNAIL(tagId), {method: 'PUT', body, timeout: 120_000}).then(normalizeListing);
  },

  // the card goes back to showing the cover
  deleteMeTagDirectoryThumbnail: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_THUMBNAIL(tagId), {method: 'DELETE'}).then(normalizeListing);
  },

  // a verified listing's change request (content, media, thumbnail), staff review it. Each answers with the whole
  // listing, `edit_request` included. Opening one keeps the open request if there already is one
  startMeTagDirectoryEditRequest: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST(tagId), {method: 'PUT'}).then(normalizeListing);
  },

  // drafts only. `content` null (or the current content) leaves it unchanged, `thumbnail_mode` is KEEP or REMOVE
  patchMeTagDirectoryEditRequest: (tagId: string, body: {content?: string | null, note?: string, thumbnail_mode?: number}) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST(tagId), {method: 'PATCH', body}).then(normalizeListing);
  },

  // draft or submitted, its uploads go with it
  discardMeTagDirectoryEditRequest: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST(tagId), {method: 'DELETE'}).then(normalizeListing);
  },

  submitMeTagDirectoryEditRequest: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST_SUBMIT(tagId), {method: 'POST'}).then(normalizeListing);
  },

  // back to a draft so it can be changed
  withdrawMeTagDirectoryEditRequest: (tagId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST_WITHDRAW(tagId), {method: 'POST'}).then(normalizeListing);
  },

  uploadMeTagDirectoryEditRequestAsset: (tagId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST_ASSETS(tagId), {method: 'POST', body, timeout: 120_000}).then(normalizeListing);
  },

  moveMeTagDirectoryEditRequestAsset: (tagId: string, assetId: string, position: number) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST_ASSET(tagId, assetId), {method: 'PATCH', body: {position}}).then(normalizeListing);
  },

  deleteMeTagDirectoryEditRequestAsset: (tagId: string, assetId: string) => {
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST_ASSET(tagId, assetId), {method: 'DELETE'}).then(normalizeListing);
  },

  uploadMeTagDirectoryEditRequestThumbnail: (tagId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<TagDirectoryItem>(ApiEndpoints.USER_ME_TAG_DIRECTORY_EDIT_REQUEST_THUMBNAIL(tagId), {method: 'PUT', body, timeout: 120_000}).then(normalizeListing);
  },

  deleteMeTag: (tagId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_TAG(tagId), {method: 'DELETE'});
  },

  fetchMeTagVariables: (tagId: string, scope: TagStorageScope, signal?: AbortSignal) => {
    return apiRequest<TagVariables>(ApiEndpoints.USER_ME_TAG_VARIABLES(tagId), {signal, query: {...scope}});
  },

  // an empty `value` deletes the variable (same as the bot endpoint)
  putMeTagVariable: (tagId: string, storageType: TagStorageType, storageId: string, body: {name: string, value: string}) => {
    return apiRequest<TagVariable>(ApiEndpoints.USER_ME_TAG_VARIABLE(tagId, storageType, storageId), {method: 'PUT', body});
  },

  deleteMeTagVariable: (tagId: string, storageType: TagStorageType, storageId: string, name: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_TAG_VARIABLE(tagId, storageType, storageId), {method: 'DELETE', query: {name}});
  },

  fetchMeTagBlobs: (tagId: string, scope: TagStorageScope, signal?: AbortSignal) => {
    return apiRequest<TagBlobs>(ApiEndpoints.USER_ME_TAG_BLOBS(tagId), {signal, query: {...scope}});
  },

  // how many servers added the tag, only for its owner and counts only (which servers is `fetchAdminTagServers`, staff only)
  fetchMeTagServers: (tagId: string, signal?: AbortSignal) => {
    return apiRequest<TagServerCounts>(ApiEndpoints.USER_ME_TAG_SERVERS(tagId), {signal});
  },

  // replaces every blob in the given scope (blobs left out are removed)
  putMeTagBlobs: (tagId: string, body: TagBlobsPut) => {
    return apiRequest<TagBlobs>(ApiEndpoints.USER_ME_TAG_BLOBS(tagId), {method: 'PUT', body});
  },

  fetchMeLLMMemories: (signal?: AbortSignal) => {
    return apiRequest<LLMMemoriesPage>(ApiEndpoints.USER_ME_LLM_MEMORIES, {signal});
  },

  patchMeLLMMemory: (memoryId: string, body: LLMMemoryPatch) => {
    return apiRequest<LLMMemory>(ApiEndpoints.USER_ME_LLM_MEMORY(memoryId), {method: 'PATCH', body});
  },

  deleteMeLLMMemory: (memoryId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_LLM_MEMORY(memoryId), {method: 'DELETE'});
  },

  // every memory, in every server
  deleteMeLLMMemories: () => {
    return apiRequest<{count: number}>(ApiEndpoints.USER_ME_LLM_MEMORIES, {method: 'DELETE'});
  },

  fetchMeReminders: (signal?: AbortSignal) => {
    return apiRequest<RemindersPage>(ApiEndpoints.USER_ME_REMINDERS, {signal});
  },

  // one of the caller's reports, `/dashboard/reports/:reportId`
  fetchMeReport: (reportId: string, signal?: AbortSignal) => {
    return apiRequest<MeReport>(ApiEndpoints.USER_ME_REPORT(reportId), {signal});
  },

  // reopening is the only change the reporter can make
  patchMeReport: (reportId: string, body: MeReportPatch) => {
    return apiRequest<MeReport>(ApiEndpoints.USER_ME_REPORT(reportId), {method: 'PATCH', body});
  },

  fetchMeReportsUnread: (signal?: AbortSignal) => {
    return apiRequest<MeReportsUnread>(ApiEndpoints.USER_ME_REPORTS_UNREAD, {signal});
  },

  // marks the report read too (the api counts fetching the conversation as opening it)
  fetchMeReportMessages: (reportId: string, signal?: AbortSignal) => {
    return apiRequest<ReportMessagesPage>(ApiEndpoints.USER_ME_REPORT_MESSAGES(reportId), {signal});
  },

  postMeReportMessage: (reportId: string, content: string) => {
    return apiRequest<ReportMessage>(ApiEndpoints.USER_ME_REPORT_MESSAGES(reportId), {method: 'POST', body: {content}});
  },

  // the website's report forms, logged in (`postAnonymousReport` when logged out)
  postMeReport: (body: WebsiteReportBody) => {
    return apiRequest<MeReport>(ApiEndpoints.USER_ME_REPORTS, {method: 'POST', body});
  },

  postAnonymousReport: (body: WebsiteReportBody & {turnstile_token: string}) => {
    return apiRequest<AnonymousReport>(ApiEndpoints.REPORTS_ANONYMOUS, {method: 'POST', body});
  },

  fetchMeCommands: (params: {guildId?: string | null, channelId?: string | null, commandId?: string | null, commandType?: number | null, result?: string | null, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<MeCommandsPage>(ApiEndpoints.USER_ME_COMMANDS, {
      signal,
      query: {
        guild_id: params.guildId,
        channel_id: params.channelId,
        command_id: params.commandId,
        command_type: params.commandType,
        result: params.result,
        offset: params.offset,
        limit: params.limit,
      },
    });
  },

  // `query` is what they wrote, or a report id
  fetchMeReports: (params: {query?: string, status?: number | null, sortBy?: MeReportsSortBy, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<MeReportsPage>(ApiEndpoints.USER_ME_REPORTS, {
      signal,
      query: {
        query: params.query || undefined,
        status: params.status,
        sort_by: params.sortBy,
        offset: params.offset,
        limit: params.limit,
      },
    });
  },

  patchMeReminder: (reminderId: string, body: ReminderPatch) => {
    return apiRequest<Reminder>(ApiEndpoints.USER_ME_REMINDER(reminderId), {method: 'PATCH', body});
  },

  deleteMeReminder: (reminderId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_REMINDER(reminderId), {method: 'DELETE'});
  },

  fetchMeEntitlements: (signal?: AbortSignal) => {
    return apiRequest<EntitlementsPage>(ApiEndpoints.USER_ME_ENTITLEMENTS, {signal});
  },

  fetchMePremiumServers: (signal?: AbortSignal) => {
    return apiRequest<PremiumServersPage>(ApiEndpoints.USER_ME_PREMIUM_SERVERS, {signal});
  },

  // only guilds the caller is in (from their Discord guild list)
  putMePremiumServer: (guildId: string) => {
    return apiRequest<PremiumServersPage & {created: boolean}>(ApiEndpoints.USER_ME_PREMIUM_SERVER(guildId), {method: 'PUT'});
  },

  deleteMePremiumServer: (serverId: string) => {
    return apiRequest<PremiumServersPage>(ApiEndpoints.USER_ME_PREMIUM_SERVER(serverId), {method: 'DELETE'});
  },

  // `temporary`: only temporary uploads (true) or only the ones that stay (false), both when null
  fetchMeFiles: (params: {query?: string, sortBy?: UserFilesSortBy, temporary?: boolean | null, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<UserFilesPage>(ApiEndpoints.USER_ME_FILES, {
      signal,
      query: {
        query: params.query || undefined,
        sort_by: params.sortBy,
        temporary: params.temporary ?? undefined,
        offset: params.offset,
        limit: params.limit,
      },
    });
  },

  deleteMeFile: (fileId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_FILE(fileId), {method: 'DELETE'});
  },

  // ids that aren't the caller's (or are already gone) are skipped
  deleteMeFiles: (fileIds: Array<string>) => {
    return apiRequest<{deleted: number}>(ApiEndpoints.USER_ME_FILES_DELETE, {method: 'POST', body: {file_ids: fileIds}});
  },

  fetchMeApplications: (signal?: AbortSignal) => {
    return apiRequest<ApplicationsPage>(ApiEndpoints.USER_ME_APPLICATIONS, {signal});
  },

  postMeApplication: (name: string) => {
    return apiRequest<ApplicationWithToken>(ApiEndpoints.USER_ME_APPLICATIONS, {method: 'POST', body: {name}});
  },

  patchMeApplication: (applicationId: string, name: string) => {
    return apiRequest<Application>(ApiEndpoints.USER_ME_APPLICATION(applicationId), {method: 'PATCH', body: {name}});
  },

  deleteMeApplication: (applicationId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_APPLICATION(applicationId), {method: 'DELETE'});
  },

  fetchMeApplicationToken: (applicationId: string) => {
    return apiRequest<ApplicationWithToken>(ApiEndpoints.USER_ME_APPLICATION_TOKEN(applicationId));
  },

  resetMeApplicationToken: (applicationId: string) => {
    return apiRequest<ApplicationWithToken>(ApiEndpoints.USER_ME_APPLICATION_TOKEN_RESET(applicationId), {method: 'POST'});
  },

  fetchMeVoices: (signal?: AbortSignal) => {
    return apiRequest<VoicesPage>(ApiEndpoints.USER_ME_VOICES, {signal});
  },

  patchMeVoice: (voiceId: string, body: VoicePatch) => {
    return apiRequest<MeVoice>(ApiEndpoints.USER_ME_VOICE(voiceId), {method: 'PATCH', body});
  },

  // also deletes it on its cloning service and every clip it's made from
  deleteMeVoice: (voiceId: string) => {
    return apiRequest<void>(ApiEndpoints.USER_ME_VOICE(voiceId), {method: 'DELETE'});
  },

  // clones it again on another service from its clips, then deletes it from the old one
  transferMeVoice: (voiceId: string, body: VoiceTransfer) => {
    return apiRequest<MeVoice>(ApiEndpoints.USER_ME_VOICE_TRANSFER(voiceId), {method: 'POST', body, timeout: 120_000});
  },

  // the api converts it to the mp3 it keeps (the first minute) and adds it to the voice on the cloning service
  uploadMeVoiceClip: (voiceId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<MeVoice>(ApiEndpoints.USER_ME_VOICE_CLIPS(voiceId), {method: 'POST', body, timeout: 120_000});
  },

  // the new audio gets a new clip id, the old clip is deleted once it's in
  replaceMeVoiceClip: (voiceId: string, clipId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<MeVoice>(ApiEndpoints.USER_ME_VOICE_CLIP(voiceId, clipId), {method: 'PUT', body, timeout: 120_000});
  },

  deleteMeVoiceClip: (voiceId: string, clipId: string) => {
    return apiRequest<MeVoice>(ApiEndpoints.USER_ME_VOICE_CLIP(voiceId, clipId), {method: 'DELETE'});
  },

  // an mp3, fetched with the token so it can't be linked to
  fetchMeVoiceClipAudio: (voiceId: string, clipId: string, signal?: AbortSignal) => {
    return apiRequest<Blob>(ApiEndpoints.USER_ME_VOICE_CLIP_AUDIO(voiceId, clipId), {signal, responseType: 'blob', timeout: 60_000});
  },

  fetchMeGuilds:(signal?: AbortSignal) => {
    return apiRequest<Array<UserGuildSummary>>(ApiEndpoints.USER_ME_GUILDS, {signal});
  },

  fetchMeGuild: (guildId: string, signal?: AbortSignal) => {
    return apiRequest<UserGuild>(ApiEndpoints.USER_ME_GUILD(guildId), {signal});
  },

  // what the server's admins told NotSoAI about it, any member can read it and Manage Server changes it
  fetchMeGuildLLMKnowledge: (guildId: string, signal?: AbortSignal) => {
    return apiRequest<GuildLLMKnowledgePage>(guildEndpoints('me', guildId).LLM_KNOWLEDGE, {signal});
  },

  createMeGuildLLMKnowledge: (guildId: string, content: string) => {
    return apiRequest<GuildLLMKnowledge>(guildEndpoints('me', guildId).LLM_KNOWLEDGE, {method: 'POST', body: {content}});
  },

  patchMeGuildLLMKnowledge: (guildId: string, knowledgeId: string, content: string) => {
    return apiRequest<GuildLLMKnowledge>(guildEndpoints('me', guildId).LLM_KNOWLEDGE_ITEM(knowledgeId), {method: 'PATCH', body: {content}});
  },

  deleteMeGuildLLMKnowledge: (guildId: string, knowledgeId: string) => {
    return apiRequest<void>(guildEndpoints('me', guildId).LLM_KNOWLEDGE_ITEM(knowledgeId), {method: 'DELETE'});
  },

  // the server edits below go through `/users/@me/guilds` (`scope: 'me'`) or `/admin/guilds` (`'admin'`), same bodies
  patchGuild: (scope: GuildScope, guildId: string, body: UserGuildPatch) => {
    return apiRequest<unknown>(guildEndpoints(scope, guildId).GUILD, {method: 'PATCH', body});
  },

  addGuildPrefix: (scope: GuildScope, guildId: string, prefix: string) => {
    return apiRequest<unknown>(guildEndpoints(scope, guildId).PREFIXES, {method: 'PUT', body: {prefix}});
  },

  removeGuildPrefix: (scope: GuildScope, guildId: string, prefix: string) => {
    return apiRequest<unknown>(guildEndpoints(scope, guildId).PREFIXES_DELETE, {method: 'POST', body: {prefix}});
  },

  // each returns the server's rules; rules covering everything need `editable.rules_admin`, like `admin_bypass`
  putGuildRules: (scope: GuildScope, guildId: string, rules: Array<GuildRuleInput>) => {
    return apiRequest<Array<GuildRule>>(guildEndpoints(scope, guildId).RULES, {method: 'PUT', body: {rules}});
  },

  // null `admin_bypass` follows the server's setting
  editGuildRule: (scope: GuildScope, guildId: string, ruleId: string, body: {admin_bypass?: boolean | null, value?: GuildRule['value']}) => {
    return apiRequest<Array<GuildRule>>(guildEndpoints(scope, guildId).RULE(ruleId), {method: 'PATCH', body});
  },

  deleteGuildRules: (scope: GuildScope, guildId: string, ids: Array<string>) => {
    return apiRequest<Array<GuildRule>>(guildEndpoints(scope, guildId).RULES_DELETE, {method: 'POST', body: {ids}});
  },

  removeGuildLogger: (scope: GuildScope, guildId: string, body: {channel_id: string, type: number}) => {
    return apiRequest<void>(guildEndpoints(scope, guildId).LOGGERS_DELETE, {method: 'POST', body});
  },

  // adds a tag directory tag to a server (`guild_id`) or your DMs with the bot (no `guild_id`), as an alias
  addMeTag: (tagId: string, body: {guild_id?: string, name?: string}) => {
    return apiRequest<Tag>(ApiEndpoints.USER_ME_TAG_ADD(tagId), {method: 'POST', body});
  },

  // server owners only (`'me'`); any staff can export and bot owners delete (`'admin'`)
  exportGuildData: (scope: GuildScope, guildId: string) => {
    return apiRequest<UserGuildDataExport>(guildEndpoints(scope, guildId).DATA_EXPORT, {timeout: 60 * 1000});
  },

  deleteGuildData: (scope: GuildScope, guildId: string) => {
    return apiRequest<UserGuildDataDelete>(guildEndpoints(scope, guildId).DATA_DELETE, {method: 'POST', timeout: 60 * 1000});
  },

  requestMeDataExport: () => {
    return apiRequest<unknown>(ApiEndpoints.USER_ME_DATA_EXPORT, {method: 'POST'});
  },

  deleteMe: () => {
    return apiRequest<void>(ApiEndpoints.USER_ME, {method: 'DELETE'});
  },


  // --- admin (owner only) ---

  fetchAdminTags: (params: {
    query?: string,
    serverId?: string,
    searchContent?: boolean,
    sortBy?: AdminTagsSortBy,
    nsfw?: boolean | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminTagsPage>(ApiEndpoints.ADMIN_TAGS, {
      signal,
      query: {
        query: params.query || undefined,
        server_id: params.serverId || undefined,
        search_content: (params.searchContent) ? true : undefined,
        sort_by: params.sortBy,
        nsfw: params.nsfw,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  // read-only, every storage the tag has (filtered to one storage type with `storageType`, `query` matches part of a storage id or a variable's name/value)
  fetchAdminTagVariables: (tagId: string, params: {storageType?: number | null, query?: string, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<AdminTagStoragePage<AdminTagVariable>>(ApiEndpoints.ADMIN_TAG_VARIABLES(tagId), {
      signal,
      query: {storage_type: params.storageType ?? undefined, query: params.query || undefined, offset: params.offset || undefined, limit: params.limit},
    });
  },

  fetchAdminTagServers: (tagId: string, signal?: AbortSignal) => {
    return apiRequest<TagServers>(ApiEndpoints.ADMIN_TAG_SERVERS(tagId), {signal});
  },

  fetchAdminTagBlobs: (tagId: string, params: {storageType?: number | null, query?: string, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<AdminTagStoragePage<AdminTagBlob>>(ApiEndpoints.ADMIN_TAG_BLOBS(tagId), {
      signal,
      query: {storage_type: params.storageType ?? undefined, query: params.query || undefined, offset: params.offset || undefined, limit: params.limit},
    });
  },

  fetchAdminTagDirectory: (params: {
    query?: string,
    category?: number | null,
    sortBy?: AdminTagDirectorySortBy,
    verified?: number | null,
    nsfw?: boolean | null,
    // only listings with (or without) a change request waiting for review
    editRequest?: boolean | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminTagDirectoryPage>(ApiEndpoints.ADMIN_TAGS_DIRECTORY, {
      signal,
      query: {
        query: params.query || undefined,
        category: params.category,
        sort_by: params.sortBy,
        verified: params.verified,
        nsfw: params.nsfw,
        edit_request: params.editRequest,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    }).then(normalizeListings);
  },

  // `content` rewrites the tag even though it's locked (verified/pending)
  patchAdminTagDirectory: (tagId: string, body: {verified?: number, content?: string, name?: string, title?: string, description?: string, category?: number}) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY(tagId), {method: 'PATCH', body}).then(normalizeListing);
  },

  // applies the owner's change request, the listing stays verified
  approveAdminTagDirectoryEditRequest: (tagId: string) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_EDIT_REQUEST_APPROVE(tagId), {method: 'POST'}).then(normalizeListing);
  },

  // `reason` is shown to the owner
  rejectAdminTagDirectoryEditRequest: (tagId: string, reason: string) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_EDIT_REQUEST_REJECT(tagId), {method: 'POST', body: {reason: reason || undefined}}).then(normalizeListing);
  },

  // archives a file, or whatever `url` points at, for the tag; the content isn't touched. `replacesId` is the asset an
  // edit saves this one over, `ownerRequested` records that the tag's owner asked for it
  uploadAdminTagAsset: (tagId: string, source: {file: File} | {url: string}, params: {replacesId?: string, ownerRequested?: boolean} = {}) => {
    let body: FormData | {url: string};
    if ('file' in source) {
      body = new FormData();
      body.append('file', source.file);
    } else {
      body = {url: source.url};
    }
    // the api downloads/probes the media first, which can take a while for videos
    return apiRequest<TagAsset>(ApiEndpoints.ADMIN_TAG_ASSETS(tagId), {
      method: 'POST',
      body,
      query: {replaces_id: params.replacesId, owner_requested: (params.ownerRequested) ? true : undefined},
      timeout: 120_000,
    });
  },

  deleteAdminTagAsset: (tagId: string, assetId: string, removal?: AdminRemoval) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_TAG_ASSET(tagId, assetId), {method: 'DELETE', query: removalQuery(removal)});
  },

  // the listing's media and thumbnail, same as the owner's routes but not limited to pending listings
  uploadAdminTagDirectoryMedia: (tagId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_MEDIA(tagId), {method: 'POST', body, timeout: 120_000}).then(normalizeListing);
  },

  moveAdminTagDirectoryMedia: (tagId: string, assetId: string, position: number) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_MEDIA_ITEM(tagId, assetId), {method: 'PATCH', body: {position}}).then(normalizeListing);
  },

  deleteAdminTagDirectoryMedia: (tagId: string, assetId: string, removal?: AdminRemoval) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_MEDIA_ITEM(tagId, assetId), {
      method: 'DELETE',
      query: removalQuery(removal),
    }).then(normalizeListing);
  },

  uploadAdminTagDirectoryThumbnail: (tagId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_THUMBNAIL(tagId), {method: 'PUT', body, timeout: 120_000}).then(normalizeListing);
  },

  deleteAdminTagDirectoryThumbnail: (tagId: string, removal?: AdminRemoval) => {
    return apiRequest<AdminTagDirectoryItem>(ApiEndpoints.ADMIN_TAG_DIRECTORY_THUMBNAIL(tagId), {
      method: 'DELETE',
      query: removalQuery(removal),
    }).then(normalizeListing);
  },

  // `deleteTag` also deletes the tag itself (and its aliases), not just the listing
  deleteAdminTagDirectory: (tagId: string, params: {deleteTag?: boolean, removal?: AdminRemoval} = {}) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_TAG_DIRECTORY(tagId), {
      method: 'DELETE',
      query: {delete_tag: (params.deleteTag) ? true : undefined, ...removalQuery(params.removal)},
    });
  },

  // the tag's audit log, newest first: works after the tag is deleted too. `before` is the oldest entry id seen so far
  fetchAdminTagAudit: (tagId: string, params: {before?: string, limit?: number} = {}, signal?: AbortSignal) => {
    return apiRequest<AdminTagAuditPage>(ApiEndpoints.ADMIN_TAG_AUDIT(tagId), {
      signal,
      query: {before: params.before, limit: params.limit},
    });
  },

  fetchAdminUsers: (params: {
    query?: string,
    sortBy?: AdminUsersSortBy,
    onlyFlagged?: boolean,
    // hours
    flaggedWithin?: number | null,
    // null for either
    blocked?: boolean | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminUsersPage>(ApiEndpoints.ADMIN_USERS, {
      signal,
      query: {
        query: params.query || undefined,
        sort_by: params.sortBy,
        only_flagged: (params.onlyFlagged) ? true : undefined,
        flagged_within: params.flaggedWithin ?? undefined,
        blocked: params.blocked ?? undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  patchAdminUser: (userId: string, body: AdminUserPatch) => {
    return apiRequest<AdminUser>(ApiEndpoints.ADMIN_USER(userId), {method: 'PATCH', body});
  },

  // copyright removals of the user's tags and files, one per staff action, for the repeat infringer policy
  fetchAdminUserCopyrightStrikes: (userId: string, signal?: AbortSignal) => {
    return apiRequest<AdminCopyrightStrikes>(ApiEndpoints.ADMIN_USER_COPYRIGHT_STRIKES(userId), {signal});
  },

  fetchAdminTagDuplicates: (tagId: string, signal?: AbortSignal) => {
    return apiRequest<AdminTagDuplicates>(ApiEndpoints.ADMIN_TAG_DUPLICATES(tagId), {signal});
  },

  // any tag, wherever it lives; its aliases everywhere go with it. `userDuplicates` also deletes the owner's other tags
  // with the exact same content, `globalDuplicates` everyone's
  deleteAdminTag: (tagId: string, params: {userDuplicates?: boolean, globalDuplicates?: boolean, removal?: AdminRemoval} = {}) => {
    return apiRequest<AdminTagDeleteResult>(ApiEndpoints.ADMIN_TAG(tagId), {
      method: 'DELETE',
      query: {
        user_duplicates: (params.userDuplicates) ? true : undefined,
        global_duplicates: (params.globalDuplicates) ? true : undefined,
        ...removalQuery(params.removal),
      },
      // each duplicate is deleted on its own
      timeout: 120_000,
    });
  },

  // replaces `tagId` with `targetId` everywhere and deletes it (owner only); `dryRun` only counts what would move
  mergeAdminTag: (tagId: string, targetId: string, params: {dryRun?: boolean} = {}, signal?: AbortSignal) => {
    return apiRequest<AdminTagMergeSummary>(ApiEndpoints.ADMIN_TAG_MERGE(tagId), {
      method: 'POST',
      signal,
      body: {target_id: targetId, dry_run: !!params.dryRun},
      // moving a popular tag's use history can take a while
      timeout: 120_000,
    });
  },

  // every tag the user owns, everywhere; `count` is how many of theirs were deleted
  deleteAdminUserTags: (userId: string, removal?: AdminRemoval) => {
    return apiRequest<{count: number}>(ApiEndpoints.ADMIN_USER_TAGS(userId), {method: 'DELETE', query: removalQuery(removal)});
  },

  fetchAdminContentFlags: (params: {
    userId?: string,
    guildId?: string,
    channelId?: string,
    tagId?: string,
    commandId?: string,
    status?: number | null,
    category?: string,
    needsHumanReview?: boolean | null,
    autoConfirmed?: boolean | null,
    // a full hash or a prefix of one, `none` for flags from before it was recorded
    promptHash?: string,
    type?: ContentFlagType | null,
    includeBlocked?: boolean,
    search?: string,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<ContentFlagsPage>(ApiEndpoints.ADMIN_CONTENT_FLAGS, {
      signal,
      query: {
        user_id: params.userId || undefined,
        guild_id: params.guildId || undefined,
        channel_id: params.channelId || undefined,
        tag_id: params.tagId || undefined,
        command_id: params.commandId || undefined,
        status: params.status,
        category: params.category || undefined,
        needs_human_review: params.needsHumanReview,
        auto_confirmed: params.autoConfirmed,
        prompt_hash: params.promptHash || undefined,
        type: params.type || undefined,
        include_blocked: params.includeBlocked || undefined,
        search: params.search || undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  fetchAdminContentFlagMatches: (flagId: string, signal?: AbortSignal) => {
    return apiRequest<ContentFlagMatches>(ApiEndpoints.ADMIN_CONTENT_FLAG_MATCHES(flagId), {signal});
  },

  // starts fetching a flag's source media (by the api, never the browser) like `.download` does, it waits a couple
  // seconds for it; poll `fetchJob` if it's still going. The file comes back once, base64 in
  // `result.response.file.value`, and nothing is kept or uploaded
  startAdminContentFlagMedia: (flagId: string, signal?: AbortSignal) => {
    return apiRequest<JobResponse>(ApiEndpoints.ADMIN_CONTENT_FLAG_MEDIA(flagId), {method: 'POST', signal});
  },

  fetchJob: (jobId: string, signal?: AbortSignal) => {
    return apiRequest<JobResponse>(ApiEndpoints.JOB(jobId), {signal});
  },

  // stops it if it's queued or running, then deletes it
  deleteJob: (jobId: string) => {
    return apiRequest<void>(ApiEndpoints.JOB(jobId), {method: 'DELETE'});
  },

  // one flag, for a link to it that isn't on the loaded list page
  fetchAdminContentFlag: (flagId: string, signal?: AbortSignal) => {
    return apiRequest<ContentFlag>(ApiEndpoints.ADMIN_CONTENT_FLAG(flagId), {signal});
  },

  patchAdminContentFlag: (flagId: string, body: ContentFlagPatch) => {
    return apiRequest<ContentFlag>(ApiEndpoints.ADMIN_CONTENT_FLAG(flagId), {method: 'PATCH', body});
  },

  // turns a media flag into a text flag on its prompt, dropping the media's hashes (can't be undone)
  flagAdminContentFlagPrompt: (flagId: string) => {
    return apiRequest<ContentFlag>(ApiEndpoints.ADMIN_CONTENT_FLAG_PROMPT(flagId), {method: 'POST'});
  },

  translateAdminContentFlag: (flagId: string) => {
    return apiRequest<ContentFlag>(ApiEndpoints.ADMIN_CONTENT_FLAG_TRANSLATE(flagId), {method: 'POST'});
  },

  fetchAdminReports: (params: {
    type?: number | null,
    status?: number | null,
    awaitingReply?: boolean | null,
    anonymous?: boolean | null,
    query?: string,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<ReportsPage>(ApiEndpoints.ADMIN_REPORTS, {
      signal,
      query: {
        type: params.type,
        status: params.status,
        awaiting_reply: params.awaitingReply ?? undefined,
        anonymous: params.anonymous ?? undefined,
        query: params.query || undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  fetchAdminReport: (reportId: string, signal?: AbortSignal) => {
    return apiRequest<Report>(ApiEndpoints.ADMIN_REPORT(reportId), {signal});
  },

  patchAdminReport: (reportId: string, body: ReportPatch) => {
    return apiRequest<Report>(ApiEndpoints.ADMIN_REPORT(reportId), {method: 'PATCH', body});
  },

  fetchAdminReportMessages: (reportId: string, signal?: AbortSignal) => {
    return apiRequest<ReportMessagesPage>(ApiEndpoints.ADMIN_REPORT_MESSAGES(reportId), {signal});
  },

  postAdminReportMessage: (reportId: string, content: string) => {
    return apiRequest<ReportMessage>(ApiEndpoints.ADMIN_REPORT_MESSAGES(reportId), {method: 'POST', body: {content}});
  },

  // what the reporter wrote, or one of the conversation's messages with `messageId`
  translateAdminReport: (reportId: string, messageId?: string) => {
    const endpoint = (messageId) ? ApiEndpoints.ADMIN_REPORT_MESSAGE_TRANSLATE(reportId, messageId) : ApiEndpoints.ADMIN_REPORT_TRANSLATE(reportId);
    return apiRequest<ReportTranslation>(endpoint, {method: 'POST'});
  },

  fetchAdminEntitlements: (params: {
    userId?: string,
    provider?: string | null,
    premiumType?: number | null,
    active?: boolean | null,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminEntitlementsPage>(ApiEndpoints.ADMIN_ENTITLEMENTS, {
      signal,
      query: {
        user_id: params.userId || undefined,
        provider: params.provider || undefined,
        premium_type: params.premiumType ?? undefined,
        active: params.active ?? undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  fetchAdminFileStats: (expiringDays: number, signal?: AbortSignal) => {
    return apiRequest<AdminFileStats>(ApiEndpoints.ADMIN_STATS('files'), {signal, query: {expiring_days: expiringDays}});
  },

  // every other stats area takes a window of days
  fetchAdminStats: <T>(area: Exclude<AdminStatsArea, 'files'>, days: number, signal?: AbortSignal) => {
    return apiRequest<T>(ApiEndpoints.ADMIN_STATS(area), {signal, query: {days}});
  },

  fetchAdminVoices: (params: {query?: string, userId?: string, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<AdminVoicesPage>(ApiEndpoints.ADMIN_VOICES, {
      signal,
      query: {
        query: params.query || undefined,
        user_id: params.userId || undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  patchAdminVoice: (voiceId: string, body: VoicePatch) => {
    return apiRequest<AdminVoice>(ApiEndpoints.ADMIN_VOICE(voiceId), {method: 'PATCH', body});
  },

  fetchAdminApplication: (applicationId: string, signal?: AbortSignal) => {
    return apiRequest<AdminApplicationDetail>(ApiEndpoints.ADMIN_APPLICATION(applicationId), {signal});
  },

  fetchAdminApplications: (params: {query?: string, userId?: string, disabled?: boolean | null, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<AdminApplicationsPage>(ApiEndpoints.ADMIN_APPLICATIONS, {
      signal,
      query: {
        query: params.query || undefined,
        user_id: params.userId || undefined,
        disabled: params.disabled ?? undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  patchAdminApplication: (applicationId: string, body: AdminApplicationPatch) => {
    return apiRequest<AdminApplication>(ApiEndpoints.ADMIN_APPLICATION(applicationId), {method: 'PATCH', body});
  },

  // revokes the old token; staff never see the new one
  resetAdminApplicationToken: (applicationId: string) => {
    return apiRequest<AdminApplication>(ApiEndpoints.ADMIN_APPLICATION_TOKEN_RESET(applicationId), {method: 'POST'});
  },

  deleteAdminApplication: (applicationId: string) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_APPLICATION(applicationId), {method: 'DELETE'});
  },

  fetchAdminApplicationAccess: (params: {query?: string, offset?: number, limit?: number}, signal?: AbortSignal) => {
    return apiRequest<ApplicationAccessPage>(ApiEndpoints.ADMIN_APPLICATION_ACCESS, {
      signal,
      query: {
        query: params.query || undefined,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  grantAdminApplicationAccess: (userId: string) => {
    return apiRequest<ApplicationAccessItem>(ApiEndpoints.ADMIN_APPLICATION_ACCESS_USER(userId), {method: 'PUT'});
  },

  // their applications stop working until it's given back, they aren't disabled
  revokeAdminApplicationAccess: (userId: string) => {
    return apiRequest<ApplicationAccessItem>(ApiEndpoints.ADMIN_APPLICATION_ACCESS_USER(userId), {method: 'DELETE'});
  },

  // owners only, the music nodes (a handful)
  fetchAdminVoiceNodes: (signal?: AbortSignal) => {
    return apiRequest<{nodes: Array<VoiceNode>}>(ApiEndpoints.ADMIN_VOICE_NODES, {signal});
  },

  // every node's live counts, asked for at once by the api
  fetchAdminVoiceNodesStats: (signal?: AbortSignal) => {
    return apiRequest<{nodes: Array<VoiceNodeStatsItem>}>(ApiEndpoints.ADMIN_VOICE_NODES_STATS, {signal});
  },

  // comes back with its password (a random one without `password`)
  createAdminVoiceNode: (body: VoiceNodeCreate) => {
    return apiRequest<VoiceNodeWithPassword>(ApiEndpoints.ADMIN_VOICE_NODES, {method: 'POST', body});
  },

  editAdminVoiceNode: (nodeId: string, body: VoiceNodeEdit) => {
    return apiRequest<VoiceNode>(ApiEndpoints.ADMIN_VOICE_NODE(nodeId), {method: 'PATCH', body});
  },

  revealAdminVoiceNode: (nodeId: string) => {
    return apiRequest<VoiceNodeWithPassword>(ApiEndpoints.ADMIN_VOICE_NODE_REVEAL(nodeId), {method: 'POST'});
  },

  resetAdminVoiceNodePassword: (nodeId: string) => {
    return apiRequest<VoiceNodeWithPassword>(ApiEndpoints.ADMIN_VOICE_NODE_PASSWORD_RESET(nodeId), {method: 'POST'});
  },

  testAdminVoiceNode: (nodeId: string) => {
    return apiRequest<VoiceNodeTest>(ApiEndpoints.ADMIN_VOICE_NODE_TEST(nodeId), {method: 'POST'});
  },

  deleteAdminVoiceNode: (nodeId: string) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_VOICE_NODE(nodeId), {method: 'DELETE'});
  },

  // owners only, every identity at once (a hundred or so), with each service's pool and the proxies
  fetchAdminIdentities: (signal?: AbortSignal) => {
    return apiRequest<AdminIdentities>(ApiEndpoints.ADMIN_IDENTITIES, {signal});
  },

  createAdminIdentity: (body: AdminIdentityCreate) => {
    return apiRequest<Identity>(ApiEndpoints.ADMIN_IDENTITIES, {method: 'POST', body});
  },

  // up to 100, one that can't be added doesn't stop the rest
  createAdminIdentities: (body: AdminIdentitiesBulkCreate) => {
    return apiRequest<AdminIdentitiesBulkResult>(ApiEndpoints.ADMIN_IDENTITIES_BULK, {method: 'POST', body});
  },

  // new cookies bring a dead identity back; provider + port re-pair it with another proxy
  patchAdminIdentity: (identityId: string, body: AdminIdentityPatch) => {
    return apiRequest<Identity>(ApiEndpoints.ADMIN_IDENTITY(identityId), {method: 'PATCH', body});
  },

  deleteAdminIdentity: (identityId: string) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_IDENTITY(identityId), {method: 'DELETE'});
  },

  // with their cookies and logins, the proxies stay. ids that don't exist (anymore) come back in `missing`
  deleteAdminIdentities: (identityIds: Array<string>) => {
    return apiRequest<{deleted: Array<string>, missing: Array<string>}>(ApiEndpoints.ADMIN_IDENTITIES_DELETE, {
      method: 'POST',
      body: {identity_ids: identityIds},
    });
  },

  putAdminIdentityLogin: (identityId: string, body: IdentityLogin) => {
    return apiRequest<Identity>(ApiEndpoints.ADMIN_IDENTITY_LOGIN(identityId), {method: 'PUT', body});
  },

  deleteAdminIdentityLogin: (identityId: string) => {
    return apiRequest<Identity>(ApiEndpoints.ADMIN_IDENTITY_LOGIN(identityId), {method: 'DELETE'});
  },

  // every call is written to the identity's audit log, so it's a POST
  revealAdminIdentityLogin: (identityId: string) => {
    return apiRequest<IdentityLoginReveal>(ApiEndpoints.ADMIN_IDENTITY_LOGIN_REVEAL(identityId), {method: 'POST'});
  },

  // identities of a service without accounts (global, geopy, google) on each proxy that has none yet
  assignAdminIdentities: (service: string, proxyIds: Array<number>, status: 'active' | 'disabled' = 'active') => {
    return apiRequest<{added: Array<string>, skipped: Array<number>, missing: Array<number>}>(ApiEndpoints.ADMIN_IDENTITIES_ASSIGN, {
      method: 'POST',
      body: {service, proxy_ids: proxyIds, status},
    });
  },

  unassignAdminIdentities: (service: string, proxyIds: Array<number>) => {
    return apiRequest<{removed: Array<string>, kept: Array<string>}>(ApiEndpoints.ADMIN_IDENTITIES_UNASSIGN, {method: 'POST', body: {service, proxy_ids: proxyIds}});
  },

  // cookies for many identities at once (a pending one becomes active), a result per item
  bulkAdminIdentityCookies: (items: Array<{identity_id: string, cookies: string}>) => {
    return apiRequest<{results: Array<{identity_id: string, status?: IdentityStatus, error?: string}>}>(ApiEndpoints.ADMIN_IDENTITIES_COOKIES, {
      method: 'POST',
      body: {items},
    });
  },

  // a preview unless `apply`
  bulkAddAdminProxies: (body: AdminProxiesBulk) => {
    return apiRequest<AdminProxiesBulkResult>(ApiEndpoints.ADMIN_IDENTITY_PROXIES_BULK, {method: 'POST', body});
  },

  patchAdminProxies: (body: AdminProxiesPatch) => {
    return apiRequest<{updated: Array<number>, failed: Array<{id: number, error: string}>}>(ApiEndpoints.ADMIN_IDENTITY_PROXIES, {method: 'PATCH', body});
  },

  patchAdminProxy: (proxyId: number, body: AdminProxyPatch) => {
    return apiRequest<IdentityProxyItem>(ApiEndpoints.ADMIN_IDENTITY_PROXY(proxyId), {method: 'PATCH', body});
  },

  // only the unused ones go, the rest come back in `in_use`
  deleteAdminProxies: (proxyIds: Array<number>) => {
    return apiRequest<{deleted: Array<number>, in_use: Array<{id: number, identities: Array<string>}>}>(ApiEndpoints.ADMIN_IDENTITY_PROXIES_DELETE, {
      method: 'POST',
      body: {proxy_ids: proxyIds},
    });
  },

  // every call is audited, so it's a POST
  revealAdminProxy: (proxyId: number) => {
    return apiRequest<ProxyReveal>(ApiEndpoints.ADMIN_IDENTITY_PROXY_REVEAL(proxyId), {method: 'POST'});
  },

  renameAdminIdentityLabel: (labelId: number, name: string) => {
    return apiRequest<Pick<IdentityLabel, 'id' | 'name'>>(ApiEndpoints.ADMIN_IDENTITY_LABEL(labelId), {method: 'PATCH', body: {name}});
  },

  deleteAdminIdentityLabel: (labelId: number) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_IDENTITY_LABEL(labelId), {method: 'DELETE'});
  },

  resumeAdminIdentityService: (service: string) => {
    return apiRequest<void>(ApiEndpoints.ADMIN_IDENTITY_SERVICE_RESUME(service), {method: 'POST'});
  },

  syncAdminIdentities: () => {
    return apiRequest<{flushed: number, identities: number, removed: number}>(ApiEndpoints.ADMIN_IDENTITIES_SYNC, {method: 'POST'});
  },

  fetchAdminGuilds: (params: {
    query?: string,
    inBot?: boolean | null,
    blocked?: boolean | null,
    // hours, only servers whose last content flag is that recent
    flaggedWithin?: number | null,
    sortBy?: AdminGuildsSortBy,
    offset?: number,
    limit?: number,
  }, signal?: AbortSignal) => {
    return apiRequest<AdminGuildsPage>(ApiEndpoints.ADMIN_GUILDS, {
      signal,
      query: {
        query: params.query || undefined,
        in_bot: params.inBot ?? undefined,
        blocked: params.blocked ?? undefined,
        flagged_within: params.flaggedWithin ?? undefined,
        sort_by: params.sortBy,
        offset: params.offset || undefined,
        limit: params.limit,
      },
    });
  },

  fetchAdminGuild: (guildId: string, signal?: AbortSignal) => {
    return apiRequest<AdminGuild>(ApiEndpoints.ADMIN_GUILD(guildId), {signal});
  },

  patchAdminGuild: (guildId: string, body: AdminGuildPatch) => {
    return apiRequest<AdminGuild>(ApiEndpoints.ADMIN_GUILD(guildId), {method: 'PATCH', body});
  },
};
