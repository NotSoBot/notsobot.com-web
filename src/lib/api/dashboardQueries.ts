// Query/mutation hooks for the user dashboard (`/users/@me/...`, see docs/dashboard-api.md).
// Every key is scoped to the session token, so switching accounts never shows someone else's data.

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import { rememberGrantedScope, useAuth } from '@/auth';
import { readStored, writeStored } from '@/hooks/usePersistentState';
import { translate } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/utils';

import { ApiRequestError } from './client';
import type { AdminStatsArea, GuildScope } from './endpoints';
import { api } from './index';
import { SAVED_GUILDS_KEY, queryKeys, useReportsUnreadQuery } from './queries';
import type {
  AdminApplication,
  AdminApplicationPatch,
  AdminRemoval,
  AdminApplicationsPage,
  AdminGuildPatch,
  AdminGuildsSortBy,
  AdminIdentities,
  AdminIdentitiesBulkCreate,
  AdminIdentityCreate,
  AdminIdentityPatch,
  AdminProxiesBulk,
  AdminProxiesPatch,
  AdminProxyPatch,
  AdminTagBlob,
  AdminTagStoragePage,
  AdminTagVariable,
  AdminTagDirectoryItem,
  AdminTagDirectoryPage,
  AdminUser,
  AdminUserPatch,
  AdminUsersPage,
  AdminTagDirectorySortBy,
  AdminTagsSortBy,
  AdminUsersSortBy,
  AdminVoice,
  AdminVoicesPage,
  Application,
  ApplicationsPage,
  ApplicationWithToken,
  ContentFlag,
  ContentFlagAutoReviewFilter,
  ContentFlagMatches,
  ContentFlagPatch,
  ContentFlagType,
  ContentFlagsPage,
  GuildLLMKnowledge,
  GuildMusic,
  GuildMusicControl,
  GuildMusicEffectControl,
  GuildMusicSoundControl,
  GuildMusicLoop,
  GuildMusicStatsPeriod,
  GuildMusicStatsSort,
  GuildMusicSettings,
  GuildLLMKnowledgePage,
  GuildRule,
  Identity,
  IdentityLogin,
  GuildRuleInput,
  MeTagsDirectoryFilter,
  MeTagsSortBy,
  LLMMemoriesPage,
  LLMMemory,
  LLMMemoryPatch,
  PremiumServersPage,
  GuildReportImageKind,
  GuildReportMessage,
  GuildReportMessagesPage,
  UserGuildListing,
  UserGuildSummary,
  Reminder,
  ReminderPatch,
  RemindersPage,
  MeReport,
  MeReportsPage,
  MeReportsSortBy,
  Report,
  ReportMessage,
  ReportMessagesPage,
  ReportPatch,
  ReportStatus,
  GuildReminderSort,
  GuildReminderWithin,
  ReportsPage,
  Tag,
  TagBlobsPut,
  TagDirectoryItem,
  TagDirectoryListingInput,
  TagPatch,
  TagServerCounts,
  TagServers,
  TagsPage,
  TagStorageScope,
  TagStorageType,
  TagVariables,
  UserFilesPage,
  UserFilesSortBy,
  UserGuildPatch,
  UserSettings,
  UserSettingsPatch,
  MeVoice,
  VoiceNodeCreate,
  VoiceNodeEdit,
  VoicesPage,
  WebsiteReportBody,
} from './types';
import { ApiErrorCodes, ReportStatuses, TAG_DIRECTORY_ASSETS_MAX } from './types';


export const ME_TAGS_PAGE_SIZE = 50;


// 404/405 from a planned endpoint means it hasn't shipped yet
export function isNotAvailableYet(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.status === 404 || error.status === 405);
}

export function isScopeMismatch(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 403 && error.code === ApiErrorCodes.DISCORD_OAUTH_SCOPE_MISMATCH;
}

// the Discord grant behind the session was revoked or expired; logging in again fixes it
export function isDiscordGrantError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401 && error.code === ApiErrorCodes.DISCORD_OAUTH_ERROR;
}

export function hasErrorCode(error: unknown, code: number): boolean {
  return error instanceof ApiRequestError && error.code === code;
}

// which form field a 400 INVALID_FORM_BODY points at (the API flattens metadata into the body)
export function errorField(error: unknown): string | null {
  if (error instanceof ApiRequestError && error.code === ApiErrorCodes.INVALID_FORM_BODY) {
    const field = error.body?.field;
    return (typeof field === 'string') ? field : null;
  }
  return null;
}

export function errorMessage(error: unknown, fallback = translate('errors.generic')): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case ApiErrorCodes.DISCORD_RATELIMITED:
        return translate('errors.discord_ratelimited');
      case ApiErrorCodes.RATELIMITED:
        return translate('errors.ratelimited');
      case ApiErrorCodes.DISCORD_FETCH_FAILED:
      case ApiErrorCodes.DISCORD_API_ERROR:
        return translate('errors.discord_api_error');
      case ApiErrorCodes.EXTERNAL_SERVICE_TIMEOUT:
        return translate('errors.external_service_timeout');
      case ApiErrorCodes.DISCORD_OAUTH_ERROR:
        return translate('errors.discord_oauth_error');
      case ApiErrorCodes.MISSING_ACCESS:
        return translate('errors.missing_access');
      case ApiErrorCodes.TAG_LOCKED:
        return translate('errors.tag_locked');
      case ApiErrorCodes.TAG_NAME_TAKEN:
        return translate('errors.tag_name_taken');
      case ApiErrorCodes.TAG_DIRECTORY_NAME_TAKEN:
        return translate('errors.tag_directory_name_taken');
      case ApiErrorCodes.TAG_DIRECTORY_CANNOT_PUBLISH_ALIAS:
        return translate('errors.tag_directory_cannot_publish_alias');
      case ApiErrorCodes.TAG_DIRECTORY_PENDING_VERIFICATION:
        return translate('errors.tag_directory_pending_verification');
      case ApiErrorCodes.TAG_DIRECTORY_ALREADY_PENDING:
        return translate('errors.tag_directory_already_pending');
      case ApiErrorCodes.TAG_DIRECTORY_ALREADY_VERIFIED:
        return translate('errors.tag_directory_already_verified');
      case ApiErrorCodes.TAG_DIRECTORY_ALREADY_UNVERIFIED:
        return translate('errors.tag_directory_already_unverified');
      case ApiErrorCodes.TAG_DIRECTORY_CANNOT_UNVERIFY_VERIFIED:
        return translate('errors.tag_directory_cannot_unverify_verified');
      case ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_DESCRIPTION:
        return translate('errors.tag_directory_verification_requires_description');
      case ApiErrorCodes.TAG_DIRECTORY_VERIFICATION_REQUIRES_CATEGORY:
        return translate('errors.tag_directory_verification_requires_category');
      case ApiErrorCodes.MAX_TAG_DIRECTORY:
        return translate('errors.max_tag_directory');
      case ApiErrorCodes.TAG_DIRECTORY_ASSETS_REQUIRE_PENDING:
        return translate('errors.tag_directory_assets_require_pending');
      case ApiErrorCodes.MAX_TAG_DIRECTORY_ASSETS:
        return translate('errors.max_tag_directory_assets', {max: TAG_DIRECTORY_ASSETS_MAX});
      case ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_ASSET:
        return translate('errors.unknown_tag_directory_asset');
      case ApiErrorCodes.UNKNOWN_FILE:
        return translate('errors.unknown_file');
      case ApiErrorCodes.UNKNOWN_TAG_DIRECTORY_EDIT_REQUEST:
        return translate('errors.unknown_tag_directory_edit_request');
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_REQUIRES_VERIFIED:
        return translate('errors.tag_directory_edit_request_requires_verified');
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_DRAFT:
        return translate('errors.tag_directory_edit_request_not_draft');
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NOT_PENDING:
        return translate('errors.tag_directory_edit_request_not_pending');
      case ApiErrorCodes.TAG_DIRECTORY_EDIT_REQUEST_NO_CHANGES:
        return translate('errors.tag_directory_edit_request_no_changes');
      case ApiErrorCodes.FILE_TOO_LARGE:
        return translate('errors.file_too_large');
      case ApiErrorCodes.INVALID_FILE_TYPE:
      case ApiErrorCodes.UNSUPPORTED_UPLOAD_TYPE:
        return translate('errors.unsupported_upload_type');
      case ApiErrorCodes.UNKNOWN_APPLICATION:
        return translate('errors.unknown_application');
      case ApiErrorCodes.MAX_APPLICATIONS:
        return translate('errors.max_applications');
      case ApiErrorCodes.UNKNOWN_VOICE:
        return translate('errors.unknown_voice');
      case ApiErrorCodes.UNKNOWN_VOICE_CLIP:
        return translate('errors.unknown_voice_clip');
      case ApiErrorCodes.MAX_VOICE_CLIPS:
        return translate('errors.max_voice_clips', {limit: (error.body as {limit?: number} | null)?.limit ?? 10});
      case ApiErrorCodes.VOICE_CLIP_LAST:
        return translate('errors.voice_clip_last');
      case ApiErrorCodes.VOICE_HAS_NO_CLIPS:
        return translate('errors.voice_has_no_clips');
      case ApiErrorCodes.UNKNOWN_REMINDER:
        return translate('errors.unknown_reminder');
      case ApiErrorCodes.UNKNOWN_LLM_MEMORY:
        return translate('errors.unknown_llm_memory');
      case ApiErrorCodes.UNKNOWN_GUILD_LLM_KNOWLEDGE:
        return translate('errors.unknown_guild_llm_knowledge');
      case ApiErrorCodes.MAX_GUILD_LLM_KNOWLEDGE: {
        const remaining = (error.body as {remaining?: number} | null)?.remaining;
        return (remaining === undefined) ? translate('errors.max_guild_llm_knowledge') : translate('errors.max_guild_llm_knowledge_remaining', {remaining: formatNumber(remaining)});
      }
      case ApiErrorCodes.PREMIUM_REQUIRED:
        return translate('errors.premium_required');
      case ApiErrorCodes.MAX_PREMIUM_SERVERS:
        return translate('errors.max_premium_servers');
      case ApiErrorCodes.PREMIUM_SERVER_COOLDOWN: {
        const removableAt = error.body?.removable_at;
        return (typeof removableAt === 'string') ? translate('errors.premium_server_cooldown_date', {date: formatDate(removableAt)}) : translate('errors.premium_server_cooldown');
      }
      case ApiErrorCodes.UNKNOWN_PREMIUM_SERVER:
        return translate('errors.unknown_premium_server');
      case ApiErrorCodes.TEXT_BLOCKED_GUIDELINES:
        return translate('errors.text_blocked_guidelines');
      case ApiErrorCodes.SAFETY_SCAN_FAILED:
        return translate('errors.safety_scan_failed');
    }
    if (error.status === 0 || 500 <= error.status) {
      return translate('errors.server');
    }
    return error.body?.message || fallback;
  }
  if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return translate('errors.timeout');
  }
  return fallback;
}


/* settings */

export function useMeSettingsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meSettings(token),
    queryFn: ({ signal }) => api.fetchMeSettings(signal),
  });
}


// optimistic: the form shows the new values right away and rolls back if the API refuses.
// every section saves on its own, so each one only ever writes (or rolls back) the fields it sent;
// restoring a whole snapshot would undo another section's save that finished in the meantime
export function usePatchMeSettingsMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meSettings(token);
  const pick = (source: UserSettings, body: UserSettingsPatch): UserSettingsPatch => {
    return Object.fromEntries(Object.keys(body).map((field) => [field, source[field as keyof UserSettingsPatch]]));
  };
  return useMutation({
    mutationFn: (body: UserSettingsPatch) => api.patchMeSettings(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({queryKey: key});
      const current = queryClient.getQueryData<UserSettings>(key);
      if (current) {
        queryClient.setQueryData<UserSettings>(key, {...current, ...body});
      }
      return {previous: (current) ? pick(current, body) : undefined};
    },
    onError: (_error, _body, context) => {
      const previous = context?.previous;
      if (previous) {
        queryClient.setQueryData<UserSettings>(key, (current) => (current) ? {...current, ...previous} : current);
      }
    },
    onSuccess: (data, body) => {
      queryClient.setQueryData<UserSettings>(key, (current) => (current) ? {...current, ...pick(data, body)} : data);
    },
  });
}


/* tags */

// `serverId`: only the tags in that server
// one page (0-based) of `ME_TAGS_PAGE_SIZE`, the list pages with arrows
export function useMeTagsQuery(query: string, sortBy: MeTagsSortBy = 'newest', directory: MeTagsDirectoryFilter = null, serverId: string | null = null, page = 0) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagsList(token, query, sortBy, directory, serverId, page),
    queryFn: ({ signal }) => api.fetchMeTags({query, sortBy, directory, serverId, offset: page * ME_TAGS_PAGE_SIZE, limit: ME_TAGS_PAGE_SIZE}, signal),
    placeholderData: keepPreviousData,
  });
}


// just the total, for the overview (or one server's, for its modal)
export function useMeTagsCountQuery(serverId: string | null = null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.meTags(token), 'count', serverId],
    queryFn: ({ signal }) => api.fetchMeTags({serverId, limit: 1}, signal),
    select: (page) => page.count,
  });
}


export function useMeTagQuery(tagId: string, { enabled = true }: {enabled?: boolean} = {}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useQuery<Tag, Error, Tag, ReturnType<typeof queryKeys.meTag>>({
    queryKey: queryKeys.meTag(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTag(tagId, signal),
    enabled,
    // show the row from the list immediately when coming from it
    placeholderData: () => {
      const lists = queryClient.getQueriesData<TagsPage>({queryKey: [...queryKeys.meTags(token), 'list']});
      for (const [ , data ] of lists) {
        const found = data?.items.find((tag) => tag.id === tagId);
        if (found) {
          return found;
        }
      }
      return undefined;
    },
    // don't refetch underneath someone editing
    refetchOnWindowFocus: false,
  });
}


export function usePatchMeTagMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagPatch) => api.patchMeTag(tagId, body),
    onSuccess: (tag: Tag) => {
      queryClient.setQueryData(queryKeys.meTag(token, tagId), tag);
      void queryClient.invalidateQueries({queryKey: [...queryKeys.meTags(token), 'list']});
    },
  });
}


export function useMeTagDirectoryQuery(tagId: string, { enabled = true }: {enabled?: boolean} = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagDirectory(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTagDirectory(tagId, signal),
    enabled: !!token && enabled,
  });
}


// publishing moves the tag to the owner's personal tags, so the tag itself and the lists change too
export function usePublishMeTagDirectoryMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagDirectoryListingInput) => api.publishMeTagDirectory(tagId, body),
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: queryKeys.meTag(token, tagId), exact: true});
      void queryClient.invalidateQueries({queryKey: [...queryKeys.meTags(token), 'list']});
      // the public directory pages
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export function usePatchMeTagDirectoryMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagDirectoryListingInput) => api.patchMeTagDirectory(tagId, body),
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


// requesting (or cancelling) verification locks (or unlocks) the tag, so the tag and the lists change too
function useMeTagDirectoryVerificationMutation(tagId: string, mutationFn: () => Promise<TagDirectoryItem>) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: queryKeys.meTag(token, tagId), exact: true});
      void queryClient.invalidateQueries({queryKey: [...queryKeys.meTags(token), 'list']});
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}

// uploading, moving or removing one of the listing's assets; every call answers with the whole listing
export function useMeTagDirectoryAssetMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: {upload: File} | {move: string, position: number} | {remove: string}): Promise<TagDirectoryItem> => {
      if ('upload' in action) {
        return api.uploadMeTagDirectoryAsset(tagId, action.upload);
      }
      if ('move' in action) {
        return api.moveMeTagDirectoryAsset(tagId, action.move, action.position);
      }
      return api.deleteMeTagDirectoryAsset(tagId, action.remove);
    },
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export function useMeTagDirectoryThumbnailMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: {upload: File} | {remove: true}): Promise<TagDirectoryItem> => {
      if ('upload' in action) {
        return api.uploadMeTagDirectoryThumbnail(tagId, action.upload);
      }
      return api.deleteMeTagDirectoryThumbnail(tagId);
    },
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
    },
  });
}


export type EditRequestAction =
  {start: true} |
  {patch: {content?: string | null, note?: string, thumbnail_mode?: number}} |
  {discard: true} |
  {submit: true} |
  {withdraw: true} |
  {upload: File} |
  {move: string, position: number} |
  {remove: string} |
  {uploadThumbnail: File};

// everything on the owner's change request, each answers with the listing (`edit_request` included)
export function useMeTagDirectoryEditRequestMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: EditRequestAction): Promise<TagDirectoryItem> => {
      if ('start' in action) {
        return api.startMeTagDirectoryEditRequest(tagId);
      }
      if ('patch' in action) {
        return api.patchMeTagDirectoryEditRequest(tagId, action.patch);
      }
      if ('discard' in action) {
        return api.discardMeTagDirectoryEditRequest(tagId);
      }
      if ('submit' in action) {
        return api.submitMeTagDirectoryEditRequest(tagId);
      }
      if ('withdraw' in action) {
        return api.withdrawMeTagDirectoryEditRequest(tagId);
      }
      if ('upload' in action) {
        return api.uploadMeTagDirectoryEditRequestAsset(tagId, action.upload);
      }
      if ('move' in action) {
        return api.moveMeTagDirectoryEditRequestAsset(tagId, action.move, action.position);
      }
      if ('remove' in action) {
        return api.deleteMeTagDirectoryEditRequestAsset(tagId, action.remove);
      }
      return api.uploadMeTagDirectoryEditRequestThumbnail(tagId, action.uploadThumbnail);
    },
    onSuccess: (directory: TagDirectoryItem) => {
      queryClient.setQueryData(queryKeys.meTagDirectory(token, tagId), directory);
    },
  });
}


export function useRequestMeTagDirectoryVerificationMutation(tagId: string) {
  return useMeTagDirectoryVerificationMutation(tagId, () => api.requestMeTagDirectoryVerification(tagId));
}

export function useCancelMeTagDirectoryVerificationMutation(tagId: string) {
  return useMeTagDirectoryVerificationMutation(tagId, () => api.cancelMeTagDirectoryVerification(tagId));
}


export function useDeleteMeTagMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteMeTag(tagId),
    onSuccess: () => {
      queryClient.removeQueries({queryKey: queryKeys.meTag(token, tagId)});
      void queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)});
    },
  });
}


export function useMeTagVariablesQuery(tagId: string, scope: TagStorageScope, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagVariables(token, tagId, scope),
    queryFn: ({ signal }) => api.fetchMeTagVariables(tagId, scope, signal),
    enabled,
    refetchOnWindowFocus: false,
  });
}


export function usePutMeTagVariableMutation(tagId: string, scope: TagStorageScope) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meTagVariables(token, tagId, scope);
  return useMutation({
    mutationFn: ({ storageType, storageId, name, value }: {storageType: TagStorageType, storageId: string, name: string, value: string}) => {
      return api.putMeTagVariable(tagId, storageType, storageId, {name, value});
    },
    // the API strips whitespace and deletes on an empty value, so store what it actually saved
    onSuccess: (variable, { storageType, name }) => {
      queryClient.setQueryData<TagVariables>(key, (previous) => {
        if (!previous) {
          return previous;
        }
        const bucket = {...previous[`${storageType}`]};
        delete bucket[name];
        if (variable.value) {
          bucket[variable.name] = variable.value;
        } else {
          delete bucket[variable.name];
        }
        return {...previous, [`${storageType}`]: bucket};
      });
    },
  });
}


export function useDeleteMeTagVariableMutation(tagId: string, scope: TagStorageScope) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meTagVariables(token, tagId, scope);
  return useMutation({
    mutationFn: ({ storageType, storageId, name }: {storageType: TagStorageType, storageId: string, name: string}) => {
      return api.deleteMeTagVariable(tagId, storageType, storageId, name);
    },
    onSuccess: (_data, { storageType, name }) => {
      queryClient.setQueryData<TagVariables>(key, (previous) => {
        if (!previous) {
          return previous;
        }
        const bucket = {...previous[`${storageType}`]};
        delete bucket[name];
        return {...previous, [`${storageType}`]: bucket};
      });
    },
  });
}


export function useMeTagBlobsQuery(tagId: string, scope: TagStorageScope, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meTagBlobs(token, tagId, scope),
    queryFn: ({ signal }) => api.fetchMeTagBlobs(tagId, scope, signal),
    enabled,
    refetchOnWindowFocus: false,
  });
}


export function usePutMeTagBlobsMutation(tagId: string, scope: TagStorageScope) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagBlobsPut) => api.putMeTagBlobs(tagId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.meTagBlobs(token, tagId, scope), data);
    },
  });
}


/* applications */

export interface ApplicationRename {
  applicationId: string,
  name: string,
}

export function useMeApplicationsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meApplications(token),
    queryFn: ({ signal }) => api.fetchMeApplications(signal),
  });
}


// the list never has tokens, so one coming back from here is dropped before it goes in the cache
function withoutToken({ token: _token, ...application }: ApplicationWithToken): Application {
  return application;
}

function useMeApplicationsCache() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meApplications(token);
  return (update: (page: ApplicationsPage) => ApplicationsPage) => {
    queryClient.setQueryData<ApplicationsPage>(key, (page) => (page) ? update(page) : page);
  };
}

export function useCreateMeApplicationMutation() {
  const updateCache = useMeApplicationsCache();
  return useMutation({
    mutationFn: (name: string) => api.postMeApplication(name),
    onSuccess: (application) => {
      updateCache((page) => ({...page, count: page.count + 1, items: [withoutToken(application), ...page.items]}));
    },
  });
}

export function usePatchMeApplicationMutation() {
  const updateCache = useMeApplicationsCache();
  return useMutation<Application, Error, ApplicationRename>({
    mutationFn: ({ applicationId, name }) => api.patchMeApplication(applicationId, name),
    onSuccess: (application) => {
      updateCache((page) => ({...page, items: page.items.map((other) => (other.id === application.id) ? application : other)}));
    },
  });
}

export function useDeleteMeApplicationMutation() {
  const updateCache = useMeApplicationsCache();
  return useMutation({
    mutationFn: (applicationId: string) => api.deleteMeApplication(applicationId),
    onSuccess: (_result, applicationId) => {
      updateCache((page) => ({...page, count: Math.max(0, page.count - 1), items: page.items.filter((other) => other.id !== applicationId)}));
    },
  });
}

// a mutation rather than a query so the token is only ever held by the dialog showing it, never cached
export function useRevealMeApplicationTokenMutation() {
  return useMutation({
    mutationFn: (applicationId: string) => api.fetchMeApplicationToken(applicationId),
  });
}

export function useResetMeApplicationTokenMutation() {
  return useMutation({
    mutationFn: (applicationId: string) => api.resetMeApplicationToken(applicationId),
  });
}


/* voices */

export interface VoiceRename {
  voiceId: string,
  name: string,
}

export function useMeRemindersQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meReminders(token),
    queryFn: ({ signal }) => api.fetchMeReminders(signal),
  });
}


export function useMeEntitlementsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meEntitlements(token),
    queryFn: ({ signal }) => api.fetchMeEntitlements(signal),
  });
}


export function useMePremiumServersQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.mePremiumServers(token),
    queryFn: ({ signal }) => api.fetchMePremiumServers(signal),
  });
}


// both return the caller's whole list afterwards
export function usePutMePremiumServerMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guildId: string) => api.putMePremiumServer(guildId),
    onSuccess: ({ created: _created, ...page }) => {
      queryClient.setQueryData<PremiumServersPage>(queryKeys.mePremiumServers(token), page);
    },
  });
}


export function useDeleteMePremiumServerMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) => api.deleteMePremiumServer(serverId),
    onSuccess: (page) => {
      queryClient.setQueryData<PremiumServersPage>(queryKeys.mePremiumServers(token), page);
    },
  });
}


export const ME_COMMANDS_PAGE_SIZE = 50;

export interface MeCommandsFilters {
  // '0' is DMs
  guildId: string | null,
  channelId: string | null,
  commandId: string | null,
  // `CommandTypes`
  commandType: number | null,
  // `MeCommandResults`, or `untracked`
  result: string | null,
  page: number,
}

// the overview's "Commands used" is the unfiltered first page, so it shares this cache with the history page
export function useMeCommandsQuery(filters: MeCommandsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meCommands(token, filters),
    queryFn: ({ signal }) => api.fetchMeCommands({
      guildId: filters.guildId,
      channelId: filters.channelId,
      commandId: filters.commandId,
      commandType: filters.commandType,
      result: filters.result,
      offset: filters.page * ME_COMMANDS_PAGE_SIZE,
      limit: ME_COMMANDS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
    // it only changes when they use the bot, no need to rescan on every focus
    staleTime: 60 * 1000,
  });
}


export const ME_REPORTS_PAGE_SIZE = 25;

// the reports they sent to servers' moderators, newest first a page at a time
export function useSentGuildReportsQuery(filters: {query: string, status: ReportStatus | null, page: number}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.sentGuildReports(token, filters),
    queryFn: ({ signal }) => api.fetchSentGuildReports({
      limit: ME_REPORTS_PAGE_SIZE,
      offset: filters.page * ME_REPORTS_PAGE_SIZE,
      query: filters.query,
      status: filters.status,
    }, signal),
    placeholderData: keepPreviousData,
    enabled: !!token,
  });
}

export function useSentGuildReportMessagesQuery(reportId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.sentGuildReports(token), 'messages', reportId],
    queryFn: ({ signal }) => api.fetchSentGuildReportMessages(reportId, signal),
    refetchInterval: REPORT_MESSAGES_REFETCH_INTERVAL,
    enabled: !!token,
  });
}

// turning the bot's DMs about one off or on, the list is refetched after
export function useMuteSentGuildReportMutation(reportId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (muted: boolean) => api.patchSentGuildReport(reportId, muted),
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.sentGuildReports(token)}),
  });
}

// the list (its reply counts) is refetched after
export function usePostSentGuildReportMessageMutation(reportId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.postSentGuildReportMessage(reportId, content),
    onSuccess: (message: GuildReportMessage) => {
      queryClient.setQueryData<GuildReportMessagesPage>([...queryKeys.sentGuildReports(token), 'messages', reportId], (page) => (page) ? {...page, items: [...page.items, message]} : page);
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.sentGuildReports(token)}),
  });
}

// a report's conversation is checked again this often while it's open, so a reply from the other side shows up
const REPORT_MESSAGES_REFETCH_INTERVAL = 30 * 1000;

export function useMeReportQuery(reportId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['users', '@me', token, 'report', reportId],
    queryFn: ({ signal }) => api.fetchMeReport(reportId!, signal),
    enabled: enabled && !!reportId,
  });
}

// fetching the conversation marks the report read, so it's marked read here too and the badge's count refetched
export function useMeReportMessagesQuery(reportId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['users', '@me', token, 'report', reportId, 'messages'],
    queryFn: async ({ signal }) => {
      const page = await api.fetchMeReportMessages(reportId, signal);
      const read = (report: MeReport) => (report.id === reportId && report.unread) ? {...report, unread: false} : report;
      queryClient.setQueryData<MeReport>(['users', '@me', token, 'report', reportId], (report) => (report) ? read(report) : report);
      queryClient.setQueriesData<MeReportsPage>({queryKey: ['users', '@me', token, 'reports']}, (list) => (list) ? {...list, items: list.items.map(read)} : list);
      void queryClient.invalidateQueries({queryKey: queryKeys.meReportsUnread(token)});
      return page;
    },
    refetchInterval: REPORT_MESSAGES_REFETCH_INTERVAL,
  });
}

// for the dashboard's sidebar badge and the overview
export function useMeReportsUnreadQuery() {
  const { token } = useAuth();
  return useReportsUnreadQuery(token);
}

// the report (its reply count) and the list are refetched after, the message is added to the thread right away
export function usePostMeReportMessageMutation(reportId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const reportKey = ['users', '@me', token, 'report', reportId];
  return useMutation({
    mutationFn: (content: string) => api.postMeReportMessage(reportId, content),
    onSuccess: (message: ReportMessage) => {
      queryClient.setQueryData<ReportMessagesPage>([...reportKey, 'messages'], (page) => (page) ? {...page, items: [...page.items, message]} : page);
    },
    // replying counts as having read it
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: reportKey}),
      queryClient.invalidateQueries({queryKey: ['users', '@me', token, 'reports']}),
      queryClient.invalidateQueries({queryKey: queryKeys.meReportsUnread(token)}),
    ]),
  });
}

// the website's report forms. Logged in it's one of the user's reports (with replies), logged out it's anonymous and
// needs the turnstile token. `report` is null for an anonymous one, there's nowhere to follow it
export function useCreateReportMutation() {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ turnstileToken, ...body }: WebsiteReportBody & {turnstileToken?: string | null}): Promise<{report: MeReport | null}> => {
      if (isAuthenticated) {
        return {report: await api.postMeReport(body)};
      }
      if (!turnstileToken) {
        throw new Error('Missing the captcha');
      }
      await api.postAnonymousReport({...body, turnstile_token: turnstileToken});
      return {report: null};
    },
    onSuccess: ({ report }) => (report) ? queryClient.invalidateQueries({queryKey: ['users', '@me', token, 'reports']}) : undefined,
  });
}

export function useReopenMeReportMutation(reportId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const reportKey = ['users', '@me', token, 'report', reportId];
  const listKey = ['users', '@me', token, 'reports'];
  return useMutation({
    mutationFn: () => api.patchMeReport(reportId, {status: ReportStatuses.OPEN}),
    onSuccess: (report: MeReport) => {
      queryClient.setQueryData(reportKey, report);
      queryClient.setQueriesData<MeReportsPage>({queryKey: listKey}, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === report.id) ? report : other)} : page;
      });
    },
    // the thread has the reopen in it now
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: reportKey}),
      queryClient.invalidateQueries({queryKey: listKey}),
    ]),
  });
}

export function useMeReportsQuery(filters: {query: string, status: number | null, sortBy: MeReportsSortBy, page: number}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meReports(token, filters),
    queryFn: ({ signal }) => api.fetchMeReports({
      query: filters.query,
      status: filters.status,
      sortBy: filters.sortBy,
      offset: filters.page * ME_REPORTS_PAGE_SIZE,
      limit: ME_REPORTS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


/* ai memory */

export function useMeLLMMemoriesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meLLMMemories(token),
    queryFn: ({ signal }) => api.fetchMeLLMMemories(signal),
  });
}


export interface LLMMemoryEdit extends LLMMemoryPatch {
  memoryId: string,
}

export function usePatchMeLLMMemoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meLLMMemories(token);
  return useMutation({
    mutationFn: ({ memoryId, ...body }: LLMMemoryEdit) => api.patchMeLLMMemory(memoryId, body),
    onSuccess: (memory: LLMMemory) => {
      queryClient.setQueryData<LLMMemoriesPage>(key, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === memory.id) ? memory : other)} : page;
      });
    },
  });
}


export function useDeleteMeLLMMemoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meLLMMemories(token);
  return useMutation({
    mutationFn: (memoryId: string) => api.deleteMeLLMMemory(memoryId),
    onSuccess: (_result, memoryId) => {
      queryClient.setQueryData<LLMMemoriesPage>(key, (page) => {
        return (page) ? {...page, items: page.items.filter((other) => other.id !== memoryId)} : page;
      });
    },
  });
}


export function useDeleteMeLLMMemoriesMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meLLMMemories(token);
  return useMutation({
    mutationFn: () => api.deleteMeLLMMemories(),
    onSuccess: () => {
      queryClient.setQueryData<LLMMemoriesPage>(key, (page) => (page) ? {...page, items: []} : page);
    },
  });
}


export interface ReminderEdit extends ReminderPatch {
  reminderId: string,
}

export function usePatchMeReminderMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meReminders(token);
  return useMutation({
    mutationFn: ({ reminderId, ...body }: ReminderEdit) => api.patchMeReminder(reminderId, body),
    onSuccess: (reminder: Reminder) => {
      queryClient.setQueryData<RemindersPage>(key, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === reminder.id) ? reminder : other)} : page;
      });
    },
  });
}


export function useDeleteMeReminderMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meReminders(token);
  return useMutation({
    mutationFn: (reminderId: string) => api.deleteMeReminder(reminderId),
    onSuccess: (_result, reminderId) => {
      queryClient.setQueryData<RemindersPage>(key, (page) => {
        return (page) ? {count: Math.max(0, page.count - 1), items: page.items.filter((other) => other.id !== reminderId)} : page;
      });
    },
  });
}


export function useMeVoicesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meVoices(token),
    queryFn: ({ signal }) => api.fetchMeVoices(signal),
  });
}


// every voice route answers with the voice and its clips, which replaces it in the list
function useSetMeVoice() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meVoices(token);
  return (voice: MeVoice) => {
    queryClient.setQueryData<VoicesPage>(key, (page) => {
      return (page) ? {...page, items: page.items.map((other) => (other.id === voice.id) ? voice : other)} : page;
    });
  };
}


export function usePatchMeVoiceMutation() {
  const setVoice = useSetMeVoice();
  return useMutation({
    mutationFn: ({ voiceId, name }: VoiceRename) => api.patchMeVoice(voiceId, {name}),
    onSuccess: setVoice,
  });
}


export function useTransferMeVoiceMutation() {
  const setVoice = useSetMeVoice();
  return useMutation({
    mutationFn: ({ voiceId, platformType }: {voiceId: string, platformType: number}) => {
      return api.transferMeVoice(voiceId, {platform_type: platformType});
    },
    onSuccess: setVoice,
  });
}


export function useDeleteMeVoiceMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.meVoices(token);
  return useMutation({
    mutationFn: (voiceId: string) => api.deleteMeVoice(voiceId),
    onSuccess: (_result, voiceId) => {
      queryClient.setQueryData<VoicesPage>(key, (page) => {
        return (page) ? {count: Math.max(0, page.count - 1), items: page.items.filter((other) => other.id !== voiceId)} : page;
      });
      // a staff member deleting one of their own voices
      void queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'voices']});
    },
  });
}


export interface VoiceClipUpload {
  voiceId: string,
  // replaces this clip when given, otherwise it's added
  clipId?: string,
  file: File,
}

export function useUploadMeVoiceClipMutation() {
  const setVoice = useSetMeVoice();
  return useMutation({
    mutationFn: ({ voiceId, clipId, file }: VoiceClipUpload) => {
      return (clipId) ? api.replaceMeVoiceClip(voiceId, clipId, file) : api.uploadMeVoiceClip(voiceId, file);
    },
    onSuccess: setVoice,
  });
}


export function useDeleteMeVoiceClipMutation() {
  const setVoice = useSetMeVoice();
  return useMutation({
    mutationFn: ({ voiceId, clipId }: {voiceId: string, clipId: string}) => api.deleteMeVoiceClip(voiceId, clipId),
    onSuccess: setVoice,
  });
}


/* files */

export const ME_FILES_PAGE_SIZE = 25;

export interface MeFilesFilters {
  query: string,
  sortBy: UserFilesSortBy,
  // only temporary uploads, only the ones that stay, or both (null)
  temporary: boolean | null,
  page: number,
}

export function useMeFilesQuery(filters: MeFilesFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meFiles(token, filters),
    queryFn: ({ signal }) => api.fetchMeFiles({
      query: filters.query,
      sortBy: filters.sortBy,
      temporary: filters.temporary,
      offset: filters.page * ME_FILES_PAGE_SIZE,
      limit: ME_FILES_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// one file, or several from the table's bulk delete (the API caps a batch at 100, a page is 25)
export function useDeleteMeFilesMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileIds: Array<string>) => {
      if (fileIds.length === 1) {
        await api.deleteMeFile(fileIds[0]);
        return {deleted: 1};
      }
      return api.deleteMeFiles(fileIds);
    },
    onSuccess: (_result, fileIds) => {
      // drop them from every loaded page right away, then refetch so the pages fill back in
      const removed = new Set(fileIds);
      queryClient.setQueriesData<UserFilesPage>({queryKey: queryKeys.meFiles(token)}, (page) => {
        if (!page) {
          return page;
        }
        const gone = page.items.filter((other) => removed.has(other.id));
        const count = gone.length;
        const size = gone.reduce((sum, file) => sum + file.metadata.size, 0);
        return {
          count: Math.max(0, page.count - count),
          items: page.items.filter((other) => !removed.has(other.id)),
          size: Math.max(0, page.size - size),
          total: {count: Math.max(0, page.total.count - count), size: Math.max(0, page.total.size - size)},
        };
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.meFiles(token)});
    },
  });
}


/* servers */

// 503 EXTERNAL_SERVICE_TIMEOUT = the API is refreshing the Discord token; that clears up by itself
function retryDiscordRefresh(failureCount: number, error: Error): boolean {
  if (error instanceof ApiRequestError && error.code === ApiErrorCodes.EXTERNAL_SERVICE_TIMEOUT) {
    return failureCount < 3;
  }
  return !(error instanceof ApiRequestError && error.status < 500) && failureCount < 2;
}

// the last server list in this browser (`SAVED_GUILDS_KEY`), shown right away on the next visit while it's fetched again.
// Only the account that saved it gets it back, and logging out clears it (`AuthProvider`)

function readSavedGuilds(userId: string | undefined): UserGuildListing | undefined {
  if (!userId) {
    return undefined;
  }
  const saved = readStored<{userId: string, addable?: Array<UserGuildSummary>, guilds: Array<UserGuildSummary>, complete?: boolean} | null>(SAVED_GUILDS_KEY, null);
  if (!saved || saved.userId !== userId || !Array.isArray(saved.guilds)) {
    return undefined;
  }
  // saved before lists could be incomplete, those were always Discord's whole list
  return {addable: (Array.isArray(saved.addable)) ? saved.addable : [], complete: saved.complete ?? true, guilds: saved.guilds};
}

function useMeGuildListingOptions() {
  const { token, user } = useAuth();
  const userId = user?.id;
  return {
    queryKey: queryKeys.meGuilds(token),
    queryFn: async ({ signal }: {signal: AbortSignal}) => {
      const listing = await api.fetchMeGuilds(signal);
      if (listing.complete) {
        // only with the `guilds` scope, so later logins ask for it again instead of dropping it
        rememberGrantedScope('guilds');
      }
      if (userId) {
        writeStored(SAVED_GUILDS_KEY, {userId, addable: listing.addable, guilds: listing.guilds, complete: listing.complete});
      }
      return listing;
    },
    // the saved copy counts as old, so it's shown and fetched again at once
    initialData: () => readSavedGuilds(userId),
    initialDataUpdatedAt: 0,
    staleTime: 60 * 1000,
    retry: retryDiscordRefresh,
  };
}

// just the servers, for pages that only pick from them
export function useMeGuildsQuery() {
  return useQuery({...useMeGuildListingOptions(), select: (listing: UserGuildListing) => listing.guilds});
}

// with `complete`, for pages that tell people when a server might be missing
export function useMeGuildListingQuery() {
  return useQuery(useMeGuildListingOptions());
}


export function useMeGuildQuery(guildId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.meGuild(token, guildId),
    queryFn: ({ signal }) => api.fetchMeGuild(guildId, signal),
    retry: retryDiscordRefresh,
  });
}


/* what the server told NotSoAI */

export function useGuildLLMKnowledgeQuery(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: queryKeys.guildLLMKnowledge(token, scope, guildId),
    queryFn: ({ signal }) => api.fetchGuildLLMKnowledge(scope, guildId, signal),
    retry: retryDiscordRefresh,
  });
}


// commands run in one of your servers (Manage Server), counts only
export function useGuildCommandStatsQuery(guildId: string, days: number, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.guildCommandStats(token, guildId, days),
    queryFn: ({ signal }) => api.fetchGuildCommandStats(guildId, days, signal),
    enabled: !!token && enabled,
    retry: retryDiscordRefresh,
  });
}


export type GuildLLMKnowledgeAction =
  | {kind: 'add', content: string}
  | {kind: 'edit', knowledgeId: string, content: string}
  | {kind: 'remove', knowledgeId: string};

// adds, edits and removes go straight into the cached list, the api returns what it stored
export function useGuildLLMKnowledgeMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  const key = queryKeys.guildLLMKnowledge(token, scope, guildId);
  return useMutation({
    mutationFn: async (action: GuildLLMKnowledgeAction): Promise<GuildLLMKnowledge | null> => {
      switch (action.kind) {
        case 'add': return api.createGuildLLMKnowledge(scope, guildId, action.content);
        case 'edit': return api.patchGuildLLMKnowledge(scope, guildId, action.knowledgeId, action.content);
        case 'remove': {
          await api.deleteGuildLLMKnowledge(scope, guildId, action.knowledgeId);
          return null;
        }
      }
    },
    onSuccess: (item, action) => {
      queryClient.setQueryData<GuildLLMKnowledgePage>(key, (page) => {
        if (!page) {
          return page;
        }
        switch (action.kind) {
          case 'add': return {...page, items: [...page.items, item!]};
          case 'edit': return {...page, items: page.items.map((other) => (other.id === item!.id) ? item! : other)};
          case 'remove': return {...page, items: page.items.filter((other) => other.id !== action.knowledgeId)};
        }
      });
    },
    // someone else removed it, show the list as it is now
    onError: (error) => {
      if (error instanceof ApiRequestError && error.code === ApiErrorCodes.UNKNOWN_GUILD_LLM_KNOWLEDGE) {
        void queryClient.invalidateQueries({queryKey: key});
      }
    },
  });
}


/* the server's warnings */

export const GUILD_WARNINGS_PAGE_SIZE = 25;

// newest first, a page at a time like the server's reports. `query` is the search box as typed (see `fetchGuildWarnings`)
export function useGuildWarningsQuery(guildId: string, filters: {page: number, query: string}, enabled = true) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: queryKeys.guildWarnings(token, scope, guildId, filters),
    queryFn: ({ signal }) => api.fetchGuildWarnings(scope, guildId, {
      limit: GUILD_WARNINGS_PAGE_SIZE,
      offset: filters.page * GUILD_WARNINGS_PAGE_SIZE,
      query: filters.query,
    }, signal),
    placeholderData: keepPreviousData,
    enabled: !!token && enabled,
    retry: retryDiscordRefresh,
  });
}


export type GuildWarningsAction =
  | {kind: 'remove', warningId: string}
  | {kind: 'clear', userId: string};

// counts and pages shift after either, so every list of the server's warnings is fetched again
export function useGuildWarningsMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: GuildWarningsAction): Promise<unknown> => {
      return (action.kind === 'remove') ? api.deleteGuildWarning(scope, guildId, action.warningId) : api.clearGuildWarnings(scope, guildId, [action.userId]);
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.guildWarnings(token, scope, guildId)}),
  });
}


/* members' reports to the server's moderators */

export const GUILD_REPORTS_PAGE_SIZE = 25;

export interface GuildReportsFilters {
  // `null` for any
  awaitingReply: boolean | null,
  page: number,
  query: string,
  // the moderators' to-do list: open ones and handled ones the reporter replied to since (`status` is ignored with it)
  queue: boolean,
  status: ReportStatus | null,
  type: number | null,
}

// newest first, a page at a time like the admin reports
export function useGuildReportsQuery(guildId: string, filters: GuildReportsFilters, enabled = true) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: queryKeys.guildReports(token, scope, guildId, filters),
    queryFn: ({ signal }) => api.fetchGuildReports(scope, guildId, {
      awaitingReply: filters.awaitingReply ?? undefined,
      limit: GUILD_REPORTS_PAGE_SIZE,
      offset: filters.page * GUILD_REPORTS_PAGE_SIZE,
      query: filters.query,
      queue: filters.queue || undefined,
      status: filters.status ?? undefined,
      type: filters.type ?? undefined,
    }, signal),
    placeholderData: keepPreviousData,
    enabled: !!token && enabled,
    retry: retryDiscordRefresh,
  });
}

// a report linked to (the bot's View Report button), whatever page or filter it's on. Under the reports' key, so a status
// change refetches it too
export function useGuildReportQuery(guildId: string, reportId: string | null) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: [...queryKeys.guildReports(token, scope, guildId), 'report', reportId],
    queryFn: ({ signal }) => api.fetchGuildReport(scope, guildId, reportId!, signal),
    enabled: !!token && !!reportId,
    retry: retryDiscordRefresh,
  });
}

// a report moves between the status filters (and their counts), so every list of the server's reports is fetched again
export function useGuildReportMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, status }: {reportId: string, status: ReportStatus}) => api.patchGuildReport(scope, guildId, reportId, status),
    // a status change is added to its conversation too (the messages' keys are under the reports')
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.guildReports(token, scope, guildId)}),
  });
}

function guildReportMessagesKey(token: string | null, scope: GuildScope, guildId: string, reportId: string) {
  return [...queryKeys.guildReports(token, scope, guildId), 'messages', reportId] as const;
}

// a report's image of the reported message or member, it never changes (it's only ever cleared, and the report says so).
// Not under the reports' key, so a status change doesn't download it again
export function useGuildReportImageQuery(guildId: string, reportId: string, kind: GuildReportImageKind) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: ['users', '@me', token, 'guild-report-image', scope, guildId, reportId, kind],
    queryFn: ({ signal }) => api.fetchGuildReportImage(scope, guildId, reportId, kind, signal),
    staleTime: Infinity,
    enabled: !!token,
    retry: retryDiscordRefresh,
  });
}

// only fetched while the conversation's open, refetched now and then for the reporter's replies (from the bot's DMs)
export function useGuildReportMessagesQuery(guildId: string, reportId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: guildReportMessagesKey(token, scope, guildId, reportId),
    queryFn: ({ signal }) => api.fetchGuildReportMessages(scope, guildId, reportId, signal),
    refetchInterval: REPORT_MESSAGES_REFETCH_INTERVAL,
    enabled: !!token,
    retry: retryDiscordRefresh,
  });
}

// replies as "the moderators"; the lists (their reply counts) are refetched after
export function usePostGuildReportMessageMutation(guildId: string, reportId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.postGuildReportMessage(scope, guildId, reportId, content),
    onSuccess: (message: GuildReportMessage) => {
      queryClient.setQueryData<GuildReportMessagesPage>(guildReportMessagesKey(token, scope, guildId, reportId), (page) => (page) ? {...page, items: [...page.items, message]} : page);
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.guildReports(token, scope, guildId)}),
  });
}


/* the server's tags and reminders, for its moderators */

const GUILD_TAGS_PAGE_SIZE = 25;
export const GUILD_REMINDERS_PAGE_SIZE = 25;

// newest first, a page at a time, `query` matches a tag's name or content
export function useGuildTagsQuery(guildId: string, query: string) {
  const { token } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.guildTags(token, guildId, query),
    queryFn: ({ pageParam, signal }) => api.fetchGuildTags(guildId, {before: pageParam, limit: GUILD_TAGS_PAGE_SIZE, query: query || undefined}, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.items.length < GUILD_TAGS_PAGE_SIZE) ? undefined : page.items[page.items.length - 1]?.id,
    enabled: !!token,
    placeholderData: keepPreviousData,
    retry: retryDiscordRefresh,
  });
}

export function useGuildTagDeleteMutation(guildId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => api.deleteGuildTag(guildId, tagId),
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.guildTags(token, guildId)}),
  });
}

export interface GuildRemindersFilters {
  // `null` for either
  allDay: boolean | null,
  page: number,
  query: string,
  sort: GuildReminderSort,
  within: GuildReminderWithin | null,
}

export const DEFAULT_GUILD_REMINDERS_FILTERS: GuildRemindersFilters = {allDay: null, page: 0, query: '', sort: 'next', within: null};

// the soonest first by default, a page at a time like the reports
export function useGuildRemindersQuery(guildId: string, filters: GuildRemindersFilters, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.guildReminders(token, guildId, filters),
    queryFn: ({ signal }) => api.fetchGuildReminders(guildId, {
      allDay: filters.allDay ?? undefined,
      limit: GUILD_REMINDERS_PAGE_SIZE,
      offset: filters.page * GUILD_REMINDERS_PAGE_SIZE,
      query: filters.query,
      sort: (filters.sort === 'next') ? undefined : filters.sort,
      within: filters.within ?? undefined,
    }, signal),
    placeholderData: keepPreviousData,
    enabled: !!token && enabled,
    retry: retryDiscordRefresh,
  });
}

export function useGuildReminderMoveMutation(guildId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reminderId: string) => api.moveGuildReminderToDms(guildId, reminderId),
    onSettled: () => queryClient.invalidateQueries({queryKey: queryKeys.guildReminders(token, guildId)}),
  });
}


/* what's playing in the server */

// how often what's playing is fetched again while it's open, a track's position moves on its own in between
const GUILD_MUSIC_REFETCH_INTERVAL = 10 * 1000;

export function useGuildMusicQuery(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: queryKeys.guildMusic(token, scope, guildId),
    queryFn: ({ signal }) => api.fetchGuildMusic(scope, guildId, signal),
    refetchInterval: GUILD_MUSIC_REFETCH_INTERVAL,
    retry: retryDiscordRefresh,
  });
}


// what the server's music played, any member. Counted as songs end, so it's only fetched again when asked for
export function useGuildMusicStatsQuery(guildId: string, period: GuildMusicStatsPeriod, sort: GuildMusicStatsSort) {
  const { token } = useAuth();
  const scope = useGuildScope();
  return useQuery({
    queryKey: queryKeys.guildMusicStats(token, scope, guildId, period, sort),
    queryFn: ({ signal }) => api.fetchGuildMusicStats(scope, guildId, period, sort, signal),
    placeholderData: keepPreviousData,
    retry: retryDiscordRefresh,
  });
}


export type GuildMusicAction =
  | {kind: 'loop', loop: GuildMusicLoop}
  | {kind: 'settings', settings: GuildMusicSettings}
  | {kind: 'control', action: GuildMusicControl}
  | {kind: 'effect', control: GuildMusicEffectControl}
  | {kind: 'sound', control: GuildMusicSoundControl}
  | {kind: 'move', itemId: string, position: number}
  | {kind: 'remove', itemId: string}
  | {kind: 'clear'};

// queue changes answer with the queue as it is now; the bot's controls take a moment, so it's fetched again shortly
export function useGuildMusicMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  const key = queryKeys.guildMusic(token, scope, guildId);
  return useMutation({
    mutationFn: async (action: GuildMusicAction): Promise<GuildMusic | null> => {
      switch (action.kind) {
        case 'loop': return api.patchGuildMusic(scope, guildId, {loop: action.loop});
        case 'settings': return api.patchGuildMusic(scope, guildId, action.settings);
        case 'move': return api.moveGuildMusicQueueItem(scope, guildId, action.itemId, action.position);
        case 'remove': return api.deleteGuildMusicQueueItem(scope, guildId, action.itemId);
        case 'clear': return api.clearGuildMusicQueue(scope, guildId);
        case 'control': {
          await api.controlGuildMusic(scope, guildId, {action: action.action});
          return null;
        }
        case 'effect':
        case 'sound': {
          await api.controlGuildMusic(scope, guildId, action.control);
          return null;
        }
      }
    },
    onSuccess: (music) => {
      if (music) {
        queryClient.setQueryData<GuildMusic>(key, music);
      } else {
        setTimeout(() => void queryClient.invalidateQueries({queryKey: key}), 1500);
      }
    },
    // someone else changed the queue or the bot left, show it as it is now
    onError: (error) => {
      if (error instanceof ApiRequestError && (error.code === ApiErrorCodes.UNKNOWN_MUSIC_QUEUE_ITEM || error.code === ApiErrorCodes.UNKNOWN_MUSIC_SESSION)) {
        void queryClient.invalidateQueries({queryKey: key});
      }
    },
  });
}


export type GuildAction =
  | {kind: 'prefix', prefix: string, present: boolean}
  | {kind: 'rules-add', rules: Array<GuildRuleInput>}
  | {kind: 'rule-edit', ruleId: string, adminBypass?: boolean | null, value?: GuildRule['value']}
  | {kind: 'rules-remove', ids: Array<string>}
  | {kind: 'logger-remove', channelId: string, type: number}
  | {kind: 'settings', patch: UserGuildPatch};


// Which routes the server sections (prefixes, settings, AI knowledge, music, rules, loggers, data) read and edit through: yours (`/users/@me/guilds`,
// the default) or staff's (`/admin/guilds`, the admin server modal provides it).
export const GuildScopeContext = createContext<GuildScope>('me');

export function useGuildScope(): GuildScope {
  return useContext(GuildScopeContext);
}

// what to refetch after a server edit, so the page shows exactly what the API stored (and what the bot will see)
function guildQueryKey(scope: GuildScope, token: string | null, guildId: string) {
  // staff edits also refresh the admin server list (blocked, name)
  return (scope === 'admin') ? [...queryKeys.admin(token), 'guilds'] : queryKeys.meGuild(token, guildId);
}


// one mutation for every server edit; each refetches the server afterwards
export function useGuildMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: GuildAction): Promise<unknown> => {
      switch (action.kind) {
        case 'prefix':
          return (action.present) ? api.addGuildPrefix(scope, guildId, action.prefix) : api.removeGuildPrefix(scope, guildId, action.prefix);
        case 'rules-add':
          return api.putGuildRules(scope, guildId, action.rules);
        case 'rule-edit':
          return api.editGuildRule(scope, guildId, action.ruleId, {admin_bypass: action.adminBypass, value: action.value});
        case 'rules-remove':
          return api.deleteGuildRules(scope, guildId, action.ids);
        case 'logger-remove':
          return api.removeGuildLogger(scope, guildId, {channel_id: action.channelId, type: action.type});
        case 'settings':
          return api.patchGuild(scope, guildId, action.patch);
      }
    },
    onSettled: (_data, _error, action) => Promise.all([
      queryClient.invalidateQueries({queryKey: guildQueryKey(scope, token, guildId)}),
      // which warnings count as active (and which are left) depends on these
      (action.kind === 'settings' && ('warnings_window' in action.patch || 'warnings_expire' in action.patch)) ? queryClient.invalidateQueries({queryKey: queryKeys.guildWarnings(token, scope, guildId)}) : null,
    ]),
  });
}


// a directory tag added to a server or your DMs shows up in your tags
export function useAddMeTagMutation(tagId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {guild_id?: string, name?: string}) => api.addMeTag(tagId, body),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)}),
  });
}


/* data */

// server owners only (bot owners from the admin panel); the delete refetches the server (and the tags lists) so the page
// shows it reset
export function useExportGuildDataMutation(guildId: string) {
  const scope = useGuildScope();
  return useMutation({mutationFn: () => api.exportGuildData(scope, guildId)});
}

export function useDeleteGuildDataMutation(guildId: string) {
  const { token } = useAuth();
  const scope = useGuildScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteGuildData(scope, guildId),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: guildQueryKey(scope, token, guildId)}),
      // the server's tags show up in your tags list too
      queryClient.invalidateQueries({queryKey: queryKeys.meTags(token)}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
    ]),
  });
}

export function useExportMeDataMutation() {
  return useMutation({mutationFn: () => api.exportMeData()});
}

export function useDeleteMeMutation() {
  return useMutation({mutationFn: () => api.deleteMe()});
}



/* admin (owner only) */

export const ADMIN_PAGE_SIZE = 25;
// the tags and tag directory pages show more at once (the api allows up to 100)
export const ADMIN_TAGS_PAGE_SIZE = 50;
export const ADMIN_CONTENT_FLAGS_PAGE_SIZE = 50;

export interface AdminTagsFilters {
  query: string,
  // only tags made in this server
  serverId?: string,
  searchContent: boolean,
  sortBy: AdminTagsSortBy,
  nsfw: boolean | null,
  page: number,
}

// read-only staff view of a tag's variables/blobs, one page at a time
export const ADMIN_TAG_VARIABLES_PAGE_SIZE = 50;
export const ADMIN_TAG_BLOBS_PAGE_SIZE = 10;

export interface AdminTagStorageFilters {
  storageType: number | null,
  // part of a storage id; variables also match their name/value
  query: string,
  page: number,
}

export function useAdminTagStorageQuery(tagId: string, kind: 'variables', filters: AdminTagStorageFilters): UseQueryResult<AdminTagStoragePage<AdminTagVariable>>;
export function useAdminTagStorageQuery(tagId: string, kind: 'blobs', filters: AdminTagStorageFilters): UseQueryResult<AdminTagStoragePage<AdminTagBlob>>;
export function useAdminTagStorageQuery(tagId: string, kind: 'variables' | 'blobs', filters: AdminTagStorageFilters) {
  const { token } = useAuth();
  const pageSize = (kind === 'variables') ? ADMIN_TAG_VARIABLES_PAGE_SIZE : ADMIN_TAG_BLOBS_PAGE_SIZE;
  return useQuery<AdminTagStoragePage<AdminTagVariable> | AdminTagStoragePage<AdminTagBlob>>({
    queryKey: queryKeys.adminTagStorage(token, tagId, kind, filters),
    queryFn: ({ signal }) => {
      const params = {storageType: filters.storageType, query: filters.query, offset: filters.page * pageSize, limit: pageSize};
      return (kind === 'variables') ? api.fetchAdminTagVariables(tagId, params, signal) : api.fetchAdminTagBlobs(tagId, params, signal);
    },
    placeholderData: keepPreviousData,
    enabled: !!token,
  });
}


export function useAdminTagsQuery(filters: AdminTagsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTags(token, filters),
    queryFn: ({ signal }) => api.fetchAdminTags({
      query: filters.query,
      serverId: filters.serverId,
      searchContent: filters.searchContent,
      sortBy: filters.sortBy,
      nsfw: filters.nsfw,
      offset: filters.page * ADMIN_TAGS_PAGE_SIZE,
      limit: ADMIN_TAGS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export interface AdminTagDirectoryFilters {
  query: string,
  category: number | null,
  sortBy: AdminTagDirectorySortBy,
  verified: number | null,
  nsfw: boolean | null,
  // only listings with a change request waiting for review
  editRequest?: boolean | null,
  page: number,
}

export function useAdminTagDirectoryQuery(filters: AdminTagDirectoryFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTagDirectory(token, filters),
    queryFn: ({ signal }) => api.fetchAdminTagDirectory({
      query: filters.query,
      category: filters.category,
      sortBy: filters.sortBy,
      verified: filters.verified,
      nsfw: filters.nsfw,
      editRequest: filters.editRequest,
      offset: filters.page * ADMIN_TAGS_PAGE_SIZE,
      limit: ADMIN_TAGS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// one listing (with its content) by tag id, for staff editing it from the public directory; null if it isn't listed.
// Lives under the admin list keys so `usePatchAdminTagDirectoryMutation` updates and refetches it too.
// How widely the owner's tag has been added, counts only. Which servers is staff only, see `useAdminTagServersQuery`.
export function useTagServerCountsQuery(tagId: string) {
  const { token } = useAuth();
  return useQuery<TagServerCounts>({
    queryKey: queryKeys.meTagServers(token, tagId),
    queryFn: ({ signal }) => api.fetchMeTagServers(tagId, signal),
    enabled: !!token,
  });
}


// Which servers added the tag, staff only (their own tags too).
export function useAdminTagServersQuery(tagId: string) {
  const { token } = useAuth();
  return useQuery<TagServers>({
    queryKey: queryKeys.adminTagServers(token, tagId),
    queryFn: ({ signal }) => api.fetchAdminTagServers(tagId, signal),
    enabled: !!token,
  });
}


export function useAdminTagDirectoryItemQuery(tagId: string, { enabled = true }: {enabled?: boolean} = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminTagDirectory(token, {id: tagId}),
    queryFn: ({ signal }) => api.fetchAdminTagDirectory({query: `id:${tagId}`, limit: 1}, signal),
    select: (page) => page.items.find((item) => item.id === tagId) ?? null,
    enabled: enabled && !!token,
  });
}


// shows the new state in place right away, then refetches since the item may leave the current filter
// (`content` edits go through here too, use a separate instance so their pending state doesn't mix with verifying)
export function usePatchAdminTagDirectoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: ({ tagId, ...body }: {tagId: string, verified?: number, content?: string, name?: string, title?: string, description?: string, category?: number}) => api.patchAdminTagDirectory(tagId, body),
    onSuccess: (item: AdminTagDirectoryItem) => {
      queryClient.setQueriesData<AdminTagDirectoryPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === item.id) ? item : other)};
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({queryKey: listKey});
      // the public directory shows the badge too
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
      // verification changes and content edits are logged
      invalidateTagAudit(queryClient, token);
    },
  });
}


// staff changing a listing's media or thumbnail, whatever its verification state; each answers with the whole listing
function useAdminTagDirectoryListingMutation<Action>(tagId: string, mutationFn: (action: Action) => Promise<AdminTagDirectoryItem>) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn,
    onSuccess: (item: AdminTagDirectoryItem) => {
      queryClient.setQueriesData<AdminTagDirectoryPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === item.id) ? item : other)};
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({queryKey: listKey});
      // the owner's copy too, for staff editing their own listing
      void queryClient.invalidateQueries({queryKey: queryKeys.meTagDirectory(token, tagId)});
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
      invalidateTagAudit(queryClient, token);
    },
  });
}

// `removal` says why staff removed it, for the tag audit log
export function useAdminTagDirectoryMediaMutation(tagId: string) {
  return useAdminTagDirectoryListingMutation(tagId, (action: {upload: File} | {move: string, position: number} | {remove: string, removal?: AdminRemoval}) => {
    if ('upload' in action) {
      return api.uploadAdminTagDirectoryMedia(tagId, action.upload);
    }
    if ('move' in action) {
      return api.moveAdminTagDirectoryMedia(tagId, action.move, action.position);
    }
    return api.deleteAdminTagDirectoryMedia(tagId, action.remove, action.removal);
  });
}

export function useAdminTagDirectoryThumbnailMutation(tagId: string) {
  return useAdminTagDirectoryListingMutation(tagId, (action: {upload: File} | {remove: true, removal?: AdminRemoval}) => {
    if ('upload' in action) {
      return api.uploadAdminTagDirectoryThumbnail(tagId, action.upload);
    }
    return api.deleteAdminTagDirectoryThumbnail(tagId, action.removal);
  });
}


// approving changes the live listing (and maybe the tag's content), rejecting only closes the request
export function useAdminTagDirectoryEditRequestMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: (action: {tagId: string, approve: true} | {tagId: string, reject: string}): Promise<AdminTagDirectoryItem> => {
      if ('approve' in action) {
        return api.approveAdminTagDirectoryEditRequest(action.tagId);
      }
      return api.rejectAdminTagDirectoryEditRequest(action.tagId, action.reject);
    },
    onSuccess: (item: AdminTagDirectoryItem) => {
      queryClient.setQueriesData<AdminTagDirectoryPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === item.id) ? item : other)};
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({queryKey: listKey});
      void queryClient.invalidateQueries({queryKey: ['tags', 'directory']});
      invalidateTagAudit(queryClient, token);
    },
  });
}


// tag assets only show up on the admin listing, refetch it so the card picks up the change. `replacesId` is the asset
// an edit saves this one over, `ownerRequested` records that the tag's owner asked for it
export function useUploadAdminTagAssetMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, source, ...params }: {tagId: string, source: {file: File} | {url: string}, replacesId?: string, ownerRequested?: boolean}) => (
      api.uploadAdminTagAsset(tagId, source, params)
    ),
    onSettled: () => {
      invalidateTagAudit(queryClient, token);
      return queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']});
    },
  });
}


export function useDeleteAdminTagAssetMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, assetId, removal }: {tagId: string, assetId: string, removal?: AdminRemoval}) => api.deleteAdminTagAsset(tagId, assetId, removal),
    onSettled: () => {
      invalidateTagAudit(queryClient, token);
      return queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']});
    },
  });
}


// the listing leaves every page (and the public directory), so just refetch
export function useDeleteAdminTagDirectoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'tags'];
  return useMutation({
    mutationFn: ({ tagId, deleteTag, removal }: {tagId: string, deleteTag: boolean, removal?: AdminRemoval}) => api.deleteAdminTagDirectory(tagId, {deleteTag, removal}),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
      invalidateTagAudit(queryClient, token),
    ]),
  });
}


function tagAuditKey(token: string | null, tagId?: string) {
  return (tagId) ? [...queryKeys.admin(token), 'tag-audit', tagId] : [...queryKeys.admin(token), 'tag-audit'];
}

function copyrightStrikesKey(token: string | null, userId?: string) {
  return (userId) ? [...queryKeys.admin(token), 'copyright-strikes', userId] : [...queryKeys.admin(token), 'copyright-strikes'];
}

// every tag's, it's cheap: the history only loads while it's open. Users' copyright strikes come from the same log
function invalidateTagAudit(queryClient: QueryClient, token: string | null) {
  return Promise.all([
    queryClient.invalidateQueries({queryKey: tagAuditKey(token)}),
    queryClient.invalidateQueries({queryKey: copyrightStrikesKey(token)}),
  ]);
}

const TAG_AUDIT_PAGE_SIZE = 50;

// the tag's audit log, newest first, a page at a time (`fetchNextPage` for older ones). Only fetched while `enabled`
export function useAdminTagAuditQuery(tagId: string, enabled: boolean) {
  const { token } = useAuth();
  return useInfiniteQuery({
    queryKey: tagAuditKey(token, tagId),
    queryFn: ({ pageParam, signal }) => api.fetchAdminTagAudit(tagId, {before: pageParam, limit: TAG_AUDIT_PAGE_SIZE}, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.entries.length < TAG_AUDIT_PAGE_SIZE) ? undefined : page.entries[page.entries.length - 1]?.id,
    enabled: !!token && enabled,
  });
}


export interface AdminUsersFilters {
  query: string,
  sortBy: AdminUsersSortBy,
  onlyFlagged: boolean,
  // hours, null for any time
  flaggedWithin: number | null,
  // null for either
  blocked: boolean | null,
  page: number,
}

// one user's row by id (the search matches ids), for a link to one that isn't on the loaded page. Lives under the list
// keys, so blocking/editing them refreshes it too
export function useAdminUserEntryQuery(userId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminUsers(token, {id: userId}),
    queryFn: ({ signal }) => api.fetchAdminUsers({query: userId!, limit: 10}, signal),
    select: (page) => page.items.find((entry) => entry.user.id === userId) ?? null,
    enabled: enabled && !!userId,
  });
}

// the user's copyright strikes (copyright removals of their tags, one per staff action), newest first
export function useAdminUserCopyrightStrikesQuery(userId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: copyrightStrikesKey(token, userId),
    queryFn: ({ signal }) => api.fetchAdminUserCopyrightStrikes(userId, signal),
    enabled: !!token,
  });
}

export function useAdminUsersQuery(filters: AdminUsersFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminUsers(token, filters),
    queryFn: ({ signal }) => api.fetchAdminUsers({
      query: filters.query,
      sortBy: filters.sortBy,
      onlyFlagged: filters.onlyFlagged,
      flaggedWithin: filters.flaggedWithin,
      blocked: filters.blocked,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminUserMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'users'];
  const flagsKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ userId, patch }: {userId: string, patch: AdminUserPatch}) => api.patchAdminUser(userId, patch),
    onSuccess: (user: AdminUser) => {
      queryClient.setQueriesData<AdminUsersPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((entry) => (entry.user.id === user.id) ? {...entry, user} : entry)};
      });
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: flagsKey}, (page) => {
        if (!page) {
          return page;
        }
        const blocked = {blocked: user.blocked, blocked_reason: user.blocked_reason, flags: user.flags};
        return {...page, items: page.items.map((flag) => (flag.user?.id === user.id) ? {...flag, user: {...flag.user, ...blocked}} : flag)};
      });
    },
    // the flags list hides blocked users by default
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      queryClient.invalidateQueries({queryKey: flagsKey}),
    ]),
  });
}


// what replacing `tagId` with `targetId` would move, a dry run of `useMergeAdminTagMutation`
export function useAdminTagMergePreviewQuery(tagId: string, targetId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'tag-merge', tagId, targetId],
    queryFn: ({ signal }) => api.mergeAdminTag(tagId, targetId!, {dryRun: true}, signal),
    enabled: !!token && !!targetId,
    retry: false,
    // it's what's about to be confirmed, so never an old count
    gcTime: 0,
  });
}


export function useMergeAdminTagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, targetId }: {tagId: string, targetId: string}) => api.mergeAdminTag(tagId, targetId),
    // both admin tag lists (and their storage/servers), and the public directory if either was listed
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tag-storage']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tag-servers']}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
    ]),
  });
}


// other tags with the exact same content, the options of `useDeleteAdminTagMutation`
export function useAdminTagDuplicatesQuery(tagId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'tag-duplicates', tagId],
    queryFn: ({ signal }) => api.fetchAdminTagDuplicates(tagId, signal),
    enabled: !!token,
    retry: false,
    // it's what's about to be confirmed, so never an old count
    gcTime: 0,
  });
}


export function useDeleteAdminTagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, userDuplicates, globalDuplicates, removal }: {tagId: string, userDuplicates: boolean, globalDuplicates: boolean, removal?: AdminRemoval}) => (
      api.deleteAdminTag(tagId, {userDuplicates, globalDuplicates, removal})
    ),
    // both admin tag lists (its aliases go too), and the public directory if it was listed
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
      invalidateTagAudit(queryClient, token),
    ]),
  });
}


export function useDeleteAdminUserTagsMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, removal }: {userId: string, removal?: AdminRemoval}) => api.deleteAdminUserTags(userId, removal),
    // both admin tag lists, and the public directory if any of them were listed
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'all-tags']}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'tags']}),
      queryClient.invalidateQueries({queryKey: ['tags', 'directory']}),
      invalidateTagAudit(queryClient, token),
    ]),
  });
}


export interface AdminContentFlagsFilters {
  userId: string,
  guildId: string,
  channelId: string,
  tagId: string,
  commandId: string,
  status: number | null,
  category: string,
  needsHumanReview: boolean | null,
  autoConfirmed: boolean | null,
  autoReview: ContentFlagAutoReviewFilter | null,
  promptHash: string,
  type: ContentFlagType | null,
  includeBlocked: boolean,
  search: string,
  page: number,
}

// one flag by id, for a link to one that isn't on the loaded page (`enabled` is false when it is)
export function useAdminContentFlagQuery(flagId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'content-flag', flagId],
    queryFn: ({ signal }) => api.fetchAdminContentFlag(flagId!, signal),
    enabled: enabled && !!flagId,
  });
}

export function useAdminContentFlagsQuery(filters: AdminContentFlagsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminContentFlags(token, filters),
    queryFn: ({ signal }) => api.fetchAdminContentFlags({
      userId: filters.userId,
      guildId: filters.guildId,
      channelId: filters.channelId,
      tagId: filters.tagId,
      commandId: filters.commandId,
      status: filters.status,
      category: filters.category,
      needsHumanReview: filters.needsHumanReview,
      autoConfirmed: filters.autoConfirmed,
      autoReview: filters.autoReview,
      promptHash: filters.promptHash,
      type: filters.type,
      includeBlocked: filters.includeBlocked,
      search: filters.search,
      offset: filters.page * ADMIN_CONTENT_FLAGS_PAGE_SIZE,
      limit: ADMIN_CONTENT_FLAGS_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// the other flags of the same media, fetched fresh each time it's called (right before confirming one)
export function useFetchContentFlagMatches() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return (flagId: string): Promise<ContentFlagMatches> => queryClient.fetchQuery({
    queryKey: [...queryKeys.admin(token), 'content-flag-matches', flagId],
    queryFn: ({ signal }) => api.fetchAdminContentFlagMatches(flagId, signal),
    staleTime: 0,
  });
}


export function usePatchAdminContentFlagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId, patch }: {flagId: string, patch: ContentFlagPatch}) => api.patchAdminContentFlag(flagId, patch),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'content-flag', flag.id], flag);
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === flag.id) ? flag : other)};
      });
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      // the per-user counts change with the status
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'users']}),
    ]),
  });
}


export function useFlagAdminContentFlagPromptMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId }: {flagId: string}) => api.flagAdminContentFlagPrompt(flagId),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'content-flag', flag.id], flag);
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === flag.id) ? flag : other)};
      });
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}


export function useTranslateAdminContentFlagMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'content-flags'];
  return useMutation({
    mutationFn: ({ flagId }: {flagId: string}) => api.translateAdminContentFlag(flagId),
    onSuccess: (flag: ContentFlag) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'content-flag', flag.id], flag);
      queryClient.setQueriesData<ContentFlagsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === flag.id) ? flag : other)};
      });
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}


export interface AdminReportsFilters {
  type: number | null,
  status: number | null,
  // the reporter sent the last reply
  awaitingReply: boolean | null,
  // only anonymous reports from the website / only ones with a reporter
  anonymous: boolean | null,
  // what the reporter wrote, or `#<id>`, `user:<id>`, `target:<id>`, `server:<id>` or a bare id
  query: string,
  page: number,
}

// one report by id, for a link to one that isn't on the loaded page
export function useAdminReportQuery(reportId: string | null, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'report', reportId],
    queryFn: ({ signal }) => api.fetchAdminReport(reportId!, signal),
    enabled: enabled && !!reportId,
  });
}

export function useAdminReportsQuery(filters: AdminReportsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminReports(token, filters),
    queryFn: ({ signal }) => api.fetchAdminReports({
      type: filters.type,
      status: filters.status,
      awaitingReply: filters.awaitingReply,
      anonymous: filters.anonymous,
      query: filters.query,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminReportMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'reports'];
  return useMutation({
    mutationFn: ({ reportId, patch }: {reportId: string, patch: ReportPatch}) => api.patchAdminReport(reportId, patch),
    onSuccess: (report: Report) => {
      queryClient.setQueryData([...queryKeys.admin(token), 'report', report.id], report);
      queryClient.setQueriesData<ReportsPage>({queryKey: listKey}, (page) => {
        if (!page) {
          return page;
        }
        return {...page, items: page.items.map((other) => (other.id === report.id) ? report : other)};
      });
    },
    // a status change is added to the conversation too
    onSettled: (_data, _error, { reportId }) => Promise.all([
      queryClient.invalidateQueries({queryKey: listKey}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'report', reportId, 'messages']}),
    ]),
  });
}

export function useAdminReportMessagesQuery(reportId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.admin(token), 'report', reportId, 'messages'],
    queryFn: ({ signal }) => api.fetchAdminReportMessages(reportId, signal),
    refetchInterval: REPORT_MESSAGES_REFETCH_INTERVAL,
  });
}

// replies as NotSoAdmin; the report (its reply count) and the list are refetched after
export function usePostAdminReportMessageMutation(reportId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const reportKey = [...queryKeys.admin(token), 'report', reportId];
  return useMutation({
    mutationFn: (content: string) => api.postAdminReportMessage(reportId, content),
    onSuccess: (message: ReportMessage) => {
      queryClient.setQueryData<ReportMessagesPage>([...reportKey, 'messages'], (page) => (page) ? {...page, items: [...page.items, message]} : page);
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({queryKey: reportKey}),
      queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'reports']}),
    ]),
  });
}

// nothing's cached: the result only lives in the component that asked for it, and goes with the modal
export function useTranslateAdminReportMutation() {
  return useMutation({
    mutationFn: ({ reportId, messageId }: {reportId: string, messageId?: string}) => api.translateAdminReport(reportId, messageId),
  });
}


export interface AdminEntitlementsFilters {
  userId: string,
  provider: string | null,
  premiumType: number | null,
  active: boolean | null,
  page: number,
}

export function useAdminEntitlementsQuery(filters: AdminEntitlementsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminEntitlements(token, filters),
    queryFn: ({ signal }) => api.fetchAdminEntitlements({
      userId: filters.userId,
      provider: filters.provider,
      premiumType: filters.premiumType,
      active: filters.active,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// `/admin/stats/files`, kept on screen while another window loads
export function useAdminFileStatsQuery(expiringDays: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminFileStats(token, expiringDays),
    queryFn: ({ signal }) => api.fetchAdminFileStats(expiringDays, signal),
    placeholderData: keepPreviousData,
  });
}

// the other `/admin/stats/<area>` routes, over the last `days` days
export function useAdminStatsQuery<T>(area: Exclude<AdminStatsArea, 'files'>, days: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminStats(token, area, days),
    queryFn: ({ signal }) => api.fetchAdminStats<T>(area, days, signal),
    placeholderData: keepPreviousData,
  });
}


export interface AdminVoicesFilters {
  query: string,
  userId: string,
  page: number,
}

export function useAdminVoicesQuery(filters: AdminVoicesFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminVoices(token, filters),
    queryFn: ({ signal }) => api.fetchAdminVoices({
      query: filters.query,
      userId: filters.userId,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function usePatchAdminVoiceMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const listKey = [...queryKeys.admin(token), 'voices'];
  return useMutation({
    mutationFn: ({ voiceId, name }: VoiceRename) => api.patchAdminVoice(voiceId, {name}),
    onSuccess: (voice: AdminVoice) => {
      queryClient.setQueriesData<AdminVoicesPage>({queryKey: listKey}, (page) => {
        return (page) ? {...page, items: page.items.map((other) => (other.id === voice.id) ? voice : other)} : page;
      });
      // a staff member renaming one of their own voices
      void queryClient.invalidateQueries({queryKey: queryKeys.meVoices(token)});
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: listKey}),
  });
}


export interface AdminApplicationsFilters {
  query: string,
  userId: string,
  disabled: boolean | null,
  page: number,
}

// one application with its recent usage, for its modal (refreshed with the lists by `useInvalidateAdminApplications`)
export function useAdminApplicationQuery(applicationId: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminApplication(token, applicationId ?? ''),
    queryFn: ({ signal }) => api.fetchAdminApplication(applicationId!, signal),
    enabled: !!applicationId,
  });
}

export function useAdminApplicationsQuery(filters: AdminApplicationsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminApplications(token, filters),
    queryFn: ({ signal }) => api.fetchAdminApplications({
      query: filters.query,
      userId: filters.userId,
      disabled: filters.disabled,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


// every admin applications mutation refreshes both lists (access counts include applications), plus the caller's own
// list in case it was one of theirs
function useInvalidateAdminApplications() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'applications']}),
    queryClient.invalidateQueries({queryKey: queryKeys.meApplications(token)}),
  ]);
}

function useAdminApplicationsCache() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return (update: (items: Array<AdminApplication>) => Array<AdminApplication>) => {
    queryClient.setQueriesData<AdminApplicationsPage>({queryKey: [...queryKeys.admin(token), 'applications', 'list']}, (page) => {
      return (page) ? {...page, items: update(page.items)} : page;
    });
  };
}

export function usePatchAdminApplicationMutation() {
  const updateCache = useAdminApplicationsCache();
  const invalidate = useInvalidateAdminApplications();
  return useMutation({
    mutationFn: ({ applicationId, patch }: {applicationId: string, patch: AdminApplicationPatch}) => api.patchAdminApplication(applicationId, patch),
    onSuccess: (application) => updateCache((items) => items.map((other) => (other.id === application.id) ? application : other)),
    onSettled: invalidate,
  });
}

// the rename dialog's shape, for the shared `RenameApplicationDialog`
export function useRenameAdminApplicationMutation() {
  const mutation = usePatchAdminApplicationMutation();
  return useMutation<Application, Error, ApplicationRename>({
    mutationFn: ({ applicationId, name }) => mutation.mutateAsync({applicationId, patch: {name}}),
  });
}

export function useResetAdminApplicationTokenMutation() {
  const invalidate = useInvalidateAdminApplications();
  return useMutation({
    mutationFn: (applicationId: string) => api.resetAdminApplicationToken(applicationId),
    onSettled: invalidate,
  });
}

export function useDeleteAdminApplicationMutation() {
  const updateCache = useAdminApplicationsCache();
  const invalidate = useInvalidateAdminApplications();
  return useMutation({
    mutationFn: (applicationId: string) => api.deleteAdminApplication(applicationId),
    onSuccess: (_result, applicationId) => updateCache((items) => items.filter((other) => other.id !== applicationId)),
    onSettled: invalidate,
  });
}


export interface AdminApplicationAccessFilters {
  query: string,
  page: number,
}

export function useAdminApplicationAccessQuery(filters: AdminApplicationAccessFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminApplicationAccess(token, filters),
    queryFn: ({ signal }) => api.fetchAdminApplicationAccess({
      query: filters.query,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}

// the flag is on the user too, so the users list and the caller themselves (if it's them) are refreshed
function useInvalidateApplicationAccess() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminApplications();
  return () => Promise.all([
    invalidate(),
    queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'users']}),
    queryClient.invalidateQueries({queryKey: queryKeys.me(token)}),
  ]);
}

export function useGrantApplicationAccessMutation() {
  const invalidate = useInvalidateApplicationAccess();
  return useMutation({
    mutationFn: (userId: string) => api.grantAdminApplicationAccess(userId),
    onSettled: invalidate,
  });
}

export function useRevokeApplicationAccessMutation() {
  const invalidate = useInvalidateApplicationAccess();
  return useMutation({
    mutationFn: (userId: string) => api.revokeAdminApplicationAccess(userId),
    onSettled: invalidate,
  });
}


export function useAdminVoiceNodesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminVoiceNodes(token),
    queryFn: ({ signal }) => api.fetchAdminVoiceNodes(signal),
  });
}

// the counts move by the second, so they're asked for again every few seconds while the page is open
const ADMIN_VOICE_NODES_STATS_REFETCH_INTERVAL = 5 * 1000;

export function useAdminVoiceNodesStatsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminVoiceNodesStats(token),
    queryFn: ({ signal }) => api.fetchAdminVoiceNodesStats(signal),
    refetchInterval: ADMIN_VOICE_NODES_STATS_REFETCH_INTERVAL,
  });
}

function useInvalidateAdminVoiceNodes() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  // the stats are under the list's key too, a node added/removed shows up in both
  return () => queryClient.invalidateQueries({queryKey: queryKeys.adminVoiceNodes(token)});
}

export function useCreateVoiceNodeMutation() {
  const invalidate = useInvalidateAdminVoiceNodes();
  return useMutation({
    mutationFn: (body: VoiceNodeCreate) => api.createAdminVoiceNode(body),
    onSettled: invalidate,
    // the password it came back with isn't kept around
    gcTime: 0,
  });
}

export function useEditVoiceNodeMutation() {
  const invalidate = useInvalidateAdminVoiceNodes();
  return useMutation({
    mutationFn: ({ nodeId, body }: {nodeId: string, body: VoiceNodeEdit}) => api.editAdminVoiceNode(nodeId, body),
    onSettled: invalidate,
  });
}

export function useRevealVoiceNodeMutation() {
  return useMutation({
    mutationFn: (nodeId: string) => api.revealAdminVoiceNode(nodeId),
    gcTime: 0,
  });
}

export function useResetVoiceNodePasswordMutation() {
  return useMutation({
    mutationFn: (nodeId: string) => api.resetAdminVoiceNodePassword(nodeId),
    gcTime: 0,
  });
}

export function useTestVoiceNodeMutation() {
  return useMutation({
    mutationFn: (nodeId: string) => api.testAdminVoiceNode(nodeId),
  });
}

export function useDeleteVoiceNodeMutation() {
  const invalidate = useInvalidateAdminVoiceNodes();
  return useMutation({
    mutationFn: (nodeId: string) => api.deleteAdminVoiceNode(nodeId),
    onSettled: invalidate,
  });
}


// leases, cooldowns and backoffs move by the second, so the page keeps itself current while it's open
const ADMIN_IDENTITIES_REFETCH_INTERVAL = 10 * 1000;

export function useAdminIdentitiesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminIdentities(token),
    queryFn: ({ signal }) => api.fetchAdminIdentities(signal),
    refetchInterval: ADMIN_IDENTITIES_REFETCH_INTERVAL,
  });
}

// the changed identity goes into the cache right away, the refetch brings the service counts and proxies along
function useAdminIdentitiesCache() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.adminIdentities(token);
  return {
    put: (identity: Identity) => queryClient.setQueryData<AdminIdentities>(key, (data) => {
      if (!data) {
        return data;
      }
      const exists = data.identities.some((other) => other.id === identity.id);
      const identities = (exists)
        ? data.identities.map((other) => (other.id === identity.id) ? identity : other)
        : [...data.identities, identity].sort((a, b) => a.id.localeCompare(b.id));
      return {...data, identities};
    }),
    remove: (identityId: string | Array<string>) => queryClient.setQueryData<AdminIdentities>(key, (data) => {
      const ids = new Set((Array.isArray(identityId)) ? identityId : [identityId]);
      return (data) ? {...data, identities: data.identities.filter((other) => !ids.has(other.id))} : data;
    }),
    invalidate: () => queryClient.invalidateQueries({queryKey: key}),
  };
}

export function useCreateIdentityMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (body: AdminIdentityCreate) => api.createAdminIdentity(body),
    onSuccess: cache.put,
    onSettled: cache.invalidate,
  });
}

export function usePatchIdentityMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: ({ identityId, body }: {identityId: string, body: AdminIdentityPatch}) => api.patchAdminIdentity(identityId, body),
    onSuccess: cache.put,
    onSettled: cache.invalidate,
  });
}

export function useDeleteIdentityMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (identityId: string) => api.deleteAdminIdentity(identityId),
    onSuccess: (_result, identityId) => cache.remove(identityId),
    onSettled: cache.invalidate,
  });
}

// sent in chunks by the dialog, the list reloads once at the end (`invalidate`)
export function useBulkCreateIdentitiesMutation() {
  const cache = useAdminIdentitiesCache();
  return {
    ...useMutation({
      mutationFn: (body: AdminIdentitiesBulkCreate) => api.createAdminIdentities(body),
    }),
    invalidate: cache.invalidate,
  };
}

export function useDeleteIdentitiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (identityIds: Array<string>) => api.deleteAdminIdentities(identityIds),
    onSuccess: (result) => cache.remove(result.deleted),
    onSettled: cache.invalidate,
  });
}

export function useSetIdentityLoginMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: ({ identityId, login }: {identityId: string, login: IdentityLogin}) => api.putAdminIdentityLogin(identityId, login),
    onSuccess: cache.put,
  });
}

export function useClearIdentityLoginMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (identityId: string) => api.deleteAdminIdentityLogin(identityId),
    onSuccess: cache.put,
  });
}

// the password only lives in the component that asked for it: never in the query cache, and dropped from the mutation
// cache as soon as nothing shows it (`gcTime: 0`)
export function useRevealIdentityLoginMutation() {
  return useMutation({
    mutationFn: (identityId: string) => api.revealAdminIdentityLogin(identityId),
    gcTime: 0,
  });
}

export function useAssignIdentitiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: ({ service, proxyIds, status }: {service: string, proxyIds: Array<number>, status?: 'active' | 'disabled'}) => {
      return api.assignAdminIdentities(service, proxyIds, status);
    },
    onSettled: cache.invalidate,
  });
}

export function useUnassignIdentitiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: ({ service, proxyIds }: {service: string, proxyIds: Array<number>}) => api.unassignAdminIdentities(service, proxyIds),
    onSettled: cache.invalidate,
  });
}

// the dashboard sends at most this many per request, a hundred cookie files go in a few
const IDENTITY_COOKIES_CHUNK = 20;

export function useBulkIdentityCookiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: async (items: Array<{identity_id: string, cookies: string}>) => {
      const results: Array<{identity_id: string, status?: string, error?: string}> = [];
      for (let start = 0; start < items.length; start += IDENTITY_COOKIES_CHUNK) {
        results.push(...(await api.bulkAdminIdentityCookies(items.slice(start, start + IDENTITY_COOKIES_CHUNK))).results);
      }
      return results;
    },
    onSettled: cache.invalidate,
  });
}

export function useBulkAddProxiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (body: AdminProxiesBulk) => api.bulkAddAdminProxies(body),
    onSuccess: (result) => {
      if (result.applied) {
        void cache.invalidate();
      }
    },
  });
}

export function usePatchProxiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (body: AdminProxiesPatch) => api.patchAdminProxies(body),
    onSettled: cache.invalidate,
  });
}

export function usePatchProxyMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: ({ proxyId, body }: {proxyId: number, body: AdminProxyPatch}) => api.patchAdminProxy(proxyId, body),
    onSettled: cache.invalidate,
  });
}

export function useDeleteProxiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (proxyIds: Array<number>) => api.deleteAdminProxies(proxyIds),
    onSettled: cache.invalidate,
  });
}

// like a login: kept only by the component showing it, never cached
export function useRevealProxyMutation() {
  return useMutation({
    mutationFn: (proxyId: number) => api.revealAdminProxy(proxyId),
    gcTime: 0,
  });
}

export function useRenameIdentityLabelMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: ({ labelId, name }: {labelId: number, name: string}) => api.renameAdminIdentityLabel(labelId, name),
    onSettled: cache.invalidate,
  });
}

export function useDeleteIdentityLabelMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (labelId: number) => api.deleteAdminIdentityLabel(labelId),
    onSettled: cache.invalidate,
  });
}

export function useResumeIdentityServiceMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: (service: string) => api.resumeAdminIdentityService(service),
    onSettled: cache.invalidate,
  });
}

export function useSyncIdentitiesMutation() {
  const cache = useAdminIdentitiesCache();
  return useMutation({
    mutationFn: () => api.syncAdminIdentities(),
    onSettled: cache.invalidate,
  });
}


export interface AdminGuildsFilters {
  query: string,
  inBot: boolean | null,
  blocked: boolean | null,
  // hours, null for any time
  flaggedWithin: number | null,
  sortBy: AdminGuildsSortBy,
  page: number,
}

export function useAdminGuildsQuery(filters: AdminGuildsFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminGuilds(token, filters),
    queryFn: ({ signal }) => api.fetchAdminGuilds({
      query: filters.query,
      inBot: filters.inBot,
      blocked: filters.blocked,
      flaggedWithin: filters.flaggedWithin,
      sortBy: filters.sortBy,
      offset: filters.page * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });
}


export function useAdminGuildQuery(guildId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminGuild(token, guildId),
    queryFn: ({ signal }) => api.fetchAdminGuild(guildId, signal),
  });
}


// blocking/unblocking a server (unblocking is owner only); the settings go through `useGuildMutation` like everywhere else
export function usePatchAdminGuildMutation(guildId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AdminGuildPatch) => api.patchAdminGuild(guildId, patch),
    onSuccess: (guild) => queryClient.setQueryData(queryKeys.adminGuild(token, guildId), guild),
    onSettled: () => queryClient.invalidateQueries({queryKey: [...queryKeys.admin(token), 'guilds']}),
  });
}
