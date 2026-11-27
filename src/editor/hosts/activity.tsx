import { DiscordSDK, Platform, RPCErrorCodes, patchUrlMappings } from '@discord/embedded-app-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ArrowLeft } from 'lucide-react';

import { carriedFlagGameOf, FlagCarry, type CarriedFlagGame } from '@/activity-games/FlagCarry';
import { ActivityFlagGame } from '@/activity-games/FlagGame';
import { GameRooms } from '@/activity-games/GameRooms';
import { GamesTab } from '@/activity-games/GamesTab';
import { ModeChoice } from '@/activity-games/ModeChoice';
import type { GameKind } from '@/activity-games/protocol';
import { createGameRoomsApi } from '@/activity-games/rooms';
import { GuideLinksProvider, HowToPlayButton } from '@/components/guides/GuideSheet';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { anySignal, timeoutSignal } from '@/lib/abort';
import { useI18n } from '@/i18n';

import { createEditorApi, EditorErrorCodes, pathId, type EditorApiError, type EditorHost, type EditorRequest, type RoomSettings } from '../api';
import { EditorApp } from '../components/EditorApp';
import { INVITE_CUSTOM_ID, type RoomInviteKind, type RoomInviter } from '../invites';
import { ConnectionNotice } from '../components/ConnectionNotice';
import { LobbyList } from '../components/LobbyList';
import { StartScreen, type LobbyMode } from '../components/StartScreen';
import { EditorRoom, type EditingResult, type RoomScreen } from '../room';
import { remapAssets, usedAssets } from '../stack';
import { PipView, useCompactLayout, type LayoutSubscriber } from './pip';
import type { EditorDocument, EditorLobby, EditorTemplate } from '../types';
import { useCatalogue } from '../useCatalogue';
import { inviteScreen, launchInviteCode, launchScreen, type ActivityLaunchScreen } from './activityLaunch';


// The media editor as a Discord Activity (activity.html). Discord loads it through its proxy with the url mapping
// `/` → `<site>/activity`, so the page can only reach the outside through other mappings: `/api` → notsobot.api and
// `/cdn` → cdn.nsb.gg (both set in the developer portal). Flow:
// sdk ready → `POST /auth/activity` with no code (our user token from who Discord's proxy signed onto the request, no
// consent screen; kept in memory: storage inside Discord's iframe can't be relied on) → the instance's launch context
// and lobbies → its room. If that sign-in fails: authorize (a code) → `POST /auth/activity {code}` → sdk authenticate,
// as before. Otherwise the sdk is only `authenticate`d once a command needs it (`ensureSdkAuth` below).
// A channel's activity has any number of group edits ("lobbies", up to MAX_INSTANCE_LOBBIES), each up to
// ROOM_MAX_EDITORS editors and optionally locked with a password, plus solo edits nobody else sees


// requests through Discord's proxy, the `/api` url mapping
const API_BASE = '/.proxy/api';
const URL_MAPPINGS = [{prefix: '/cdn', target: 'cdn.nsb.gg'}];
const SITE_URL = 'https://notsobot.com';
// a shared template link's `custom_id` (`template:<code>`)
const TEMPLATE_CUSTOM_ID = 'template:';

const PREMIUM_URL = `${SITE_URL}/premium`;
// only who they are (Discord's "Access your username, avatar and banner"): the api checks the instance and the server
// with the bot's token, nothing needs their server list
const SCOPES: Array<'identify'> = ['identify'];


class ActivityRequestError extends Error {
  constructor(readonly status: number, readonly body: Record<string, unknown> | null) {
    super(String(body?.message || `Request failed with status ${status}`));
  }

  get code(): number | null {
    return (typeof this.body?.code === 'number') ? this.body.code : null;
  }
}


function activityErrorOf(error: unknown): EditorApiError | null {
  if (error instanceof ActivityRequestError) {
    return {status: error.status, code: error.code, message: error.message, body: error.body};
  }
  return null;
}


function createActivityRequest(getToken: () => string | null): EditorRequest {
  return async <T, >(path: string, options: Parameters<EditorRequest>[1] = {}): Promise<T> => {
    const url = new URL(API_BASE + path, window.location.origin);
    for (const [ key, value ] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    const headers = new Headers(options.headers);
    headers.set('accept', 'application/json');
    const token = getToken();
    if (token) {
      // the api takes a prefix-less authorization as a user token
      headers.set('authorization', token);
    }
    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(options.body);
    }
    const timeout = timeoutSignal(options.timeout ?? 15 * 1000);
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: (options.signal) ? anySignal([options.signal, timeout]) : timeout,
    });
    if (!response.ok) {
      let data: Record<string, unknown> | null = null;
      try {
        data = await response.json();
      } catch {
        // not json (the proxy's own error page)
      }
      throw new ActivityRequestError(response.status, data);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return await response.json() as T;
  };
}


// the app's id: the activity runs on `<client_id>.discordsays.com`, so the beta and main apps share one build
function clientIdFromHost(): string | null {
  const match = window.location.hostname.match(/^(\d+)\.discordsays\.com$/);
  return match?.[1] ?? import.meta.env.VITE_DISCORD_CLIENT_ID ?? null;
}


// the startup steps, a failure names the one it stopped at. `signin` is the one from the proxy headers, `authorize` →
// `login` → `authenticate` only run when it fails
type Step = 'sdk' | 'ready' | 'signin' | 'authorize' | 'login' | 'authenticate' | 'context';

// `POST /auth/activity`: `access_token` (Discord's, for the sdk's `authenticate` and the share upload) only with a code
interface ActivityLogin {
  token: string,
  access_token?: string,
}

// what Discord's rpc answers a command the sdk isn't `authenticate`d for ("Not authenticated or invalid scope"), or
// one whose token it no longer takes
const SDK_AUTH_ERRORS: ReadonlySet<number> = new Set([RPCErrorCodes.INVALID_PERMISSIONS, RPCErrorCodes.INVALID_TOKEN]);

function isSdkAuthError(error: unknown): boolean {
  const code = (error as {code?: unknown} | null)?.code;
  return typeof code === 'number' && SDK_AUTH_ERRORS.has(code);
}

type Phase =
  | {kind: 'loading'}
  | {
    kind: 'failed',
    message: 'editor.activity.not_in_discord' | 'editor.activity.failed' | 'editor.activity.not_ready' | 'editor.activity.denied',
    // what went wrong, shown small under the message (only owners can get this far while it rolls out)
    detail?: string,
  }
  // the activity's group edits, join one or start a new one. `notice`: why they're back (lost their spot)
  | {kind: 'lobbies', notice?: string}
  // the mode choice, the editor (lobbies/start) or the flag game (src/activity-games): what the app launcher opens on
  // (./activityLaunch), and where both room lists go back to. `notice`: an invite that couldn't be opened
  | {kind: 'choice', notice?: string}
  // the Games tab (every game the Activity has), the room browser (`game`: filtered to that game's rooms), and a room
  // being played or watched
  | {kind: 'games_tab'}
  | {kind: 'games', notice?: string, game?: GameKind}
  | {kind: 'game', gameId: string, watch: boolean}
  // Open in Activity on the in-chat Flag Guesser: offers a room continuing it (src/activity-games/FlagCarry.tsx)
  | {kind: 'flag_carry', carry: CarriedFlagGame}
  // a new edit: who it's for (just me, everyone, everyone with the password) and its media
  | {kind: 'start', mode: LobbyMode}
  | {kind: 'editor', documentId: string, solo: boolean, fill?: boolean};


// what startup set up, for the screens
interface ActivitySetup {
  instanceId: string,
  // the Activity's one socket: the editor's rooms and the flag game
  room: EditorRoom,
  // the group's host (the room) and a solo document's (no room: its edits must never reach a lobby's)
  group: EditorHost,
  solo: EditorHost,
  // the lobby list as of startup
  lobbies: Array<EditorLobby>,
  // what they launched on: Edit Media's media (filled in on the start screen) and a template
  mediaUrl: string | null,
  // how it was launched (`edit_media`, `edit_avatar`, `games`, ... see ./activityLaunch)
  surface: string | null,
  template: EditorTemplate | null,
  // into a lobby, if there's room in it (`ROOM_MAX_EDITORS`) and the password's right (or with a redeemed invite to it)
  enterLobby: (documentId: string, password?: string, fill?: boolean, invite?: string) => Promise<EditingResult>,
  // a room's Invite dialog (../invites.ts)
  inviter: (kind: RoomInviteKind, roomId: string) => RoomInviter,
}


function ActivityEditor({ host, documentId, fill = false }: {host: EditorHost, documentId: string, fill?: boolean}) {
  const { t } = useI18n();
  const { catalogue, error, retry } = useCatalogue(host);
  if (error) {
    return (
      <FullPageMessage title={t('editor.catalogue_error')}>
        <button type='button' className='btn btn-secondary' onClick={retry}>{t('common.retry')}</button>
      </FullPageMessage>
    );
  }
  if (!catalogue) {
    return <FullPageMessage><Spinner/></FullPageMessage>;
  }
  return <EditorApp key={documentId} host={host} documentId={documentId} catalogue={catalogue} askInputs={fill}/>;
}


// Discord's client loads an App Channel as a "frame" with `surface=1` (EmbeddedSurfaceType.APP_CHANNEL) and the channel
// in the query, and `instance_id` set to the placeholder `example-cl-instance` rather than left out (the docs say it's
// empty, the client says otherwise, read from discord-webarchive 2026-11-26). A voice channel Activity's url has no
// `surface`, so that's what tells them apart, never `sdk.instanceId`
const APP_CHANNEL_SURFACE = '1';

function isAppChannelFrame(): boolean {
  return new URLSearchParams(window.location.search).get('surface') === APP_CHANNEL_SURFACE;
}


// a first screen (./activityLaunch) as a phase, with why they're there (an invite that couldn't be opened)
function screenPhase(screen: ActivityLaunchScreen, notice?: string): Phase {
  switch (screen) {
    case 'start':
      return {kind: 'start', mode: 'public'};
    case 'games':
      // `/games` opens on the Games tab, a game invite that couldn't be opened on its game's rooms (with why)
      return (notice) ? {kind: 'games', notice} : {kind: 'games_tab'};
    case 'flag_guesser':
      // Open in Activity on the in-chat Flag Guesser: straight to its rooms
      return {kind: 'games', notice, game: 'flag_guesser'};
    case 'editor':
      return {kind: 'lobbies', notice};
    case 'choice':
      return {kind: 'choice', notice};
  }
}


// The first screen after sign-in, from how they launched it (./activityLaunch): something launched on (media or a
// template) is a new edit, `/games` the game rooms, `/editor` (and its Join) the editor's rooms even with none running
// yet (its New button is right there), the app launcher the mode choice, Open in Activity on the in-chat Flag Guesser a
// room continuing it (`carry`, the room list without one). A room invite is opened before this (see below)
function firstPhase(launch: {surface: string | null, launchedOn: boolean, carry: CarriedFlagGame | null}): Phase {
  const screen = launchScreen(launch.surface, launch.launchedOn);
  // Open in Activity on the in-chat game the bot knew about: a room continuing it, offered before the room list
  if (screen === 'flag_guesser' && launch.carry) {
    return {kind: 'flag_carry', carry: launch.carry};
  }
  return screenPhase(screen);
}


export function ActivityApp() {
  const { t, language } = useI18n();
  const [ phase, setPhase ] = useState<Phase>({kind: 'loading'});
  // the phase as of the last render, for the room's listener (set up once at startup)
  const phaseRef = useMemo(() => ({current: phase}), []);
  phaseRef.current = phase;
  const [ setup, setSetup ] = useState<ActivitySetup | null>(null);
  const tokenRef = useMemo(() => ({current: null as string | null}), []);
  const api = useMemo(() => createEditorApi(createActivityRequest(() => tokenRef.current)), [tokenRef]);
  // discord's layout mode once the sdk can be asked, and whether that (or the window's size) makes it the compact view
  const [ layoutSubscriber, setLayoutSubscriber ] = useState<LayoutSubscriber | null>(null);
  const compact = useCompactLayout(layoutSubscriber);
  // the flag game's rooms in this instance's server (or dm)
  const gameInstanceId = setup?.instanceId ?? null;
  const gamesApi = useMemo(() => createGameRoomsApi(createActivityRequest(() => tokenRef.current), gameInstanceId ?? 'none'), [gameInstanceId, tokenRef]);
  // where they are, said over the socket for everyone's start screen counts (src/activity-games/counts.ts): starting or in
  // an edit is editing, anywhere in the games is games, the start screen and the editor's room list are neither
  const roomScreen: RoomScreen | null = (phase.kind === 'games_tab' || phase.kind === 'games' || phase.kind === 'game' || phase.kind === 'flag_carry') ? 'games'
    : (phase.kind === 'start' || phase.kind === 'editor') ? 'editor'
    : null;
  useEffect(() => {
    setup?.room.setScreen(roomScreen);
  }, [setup, roomScreen]);
  // the in-chat game's flag for its prompt (./FlagCarry), an object url: the route wants the token, an <img> can't send it
  const setupInstanceId = setup?.instanceId ?? null;
  const loadCarriedFlag = useCallback(async (): Promise<string | null> => {
    if (!setupInstanceId) {
      return null;
    }
    const url = new URL(`${API_BASE}/activity/games/${pathId(setupInstanceId)}/carried/flag`, window.location.origin);
    url.searchParams.set('width', '640');
    const response = await fetch(url, {headers: {authorization: tokenRef.current ?? ''}, signal: timeoutSignal(15 * 1000)});
    return (response.ok) ? URL.createObjectURL(await response.blob()) : null;
  }, [setupInstanceId, tokenRef]);

  useEffect(() => {
    let alive = true;
    let room: EditorRoom | null = null;
    const fail = (message: Extract<Phase, {kind: 'failed'}>['message'], detail?: string) => {
      if (alive) {
        setPhase({kind: 'failed', message, detail});
      }
    };
    let step: Step = 'sdk';

    (async () => {
      const clientId = clientIdFromHost();
      let sdk: DiscordSDK;
      try {
        if (!clientId) {
          throw new Error('no client id');
        }
        // throws without the `frame_id` query Discord adds, the page was opened outside Discord
        sdk = new DiscordSDK(clientId);
      } catch {
        return fail('editor.activity.not_in_discord');
      }

      try {
        step = 'ready';
        await sdk.ready();
        // media urls from the api (previews, tiles, renders) are cdn.nsb.gg's, the iframe can only load them through
        // the `/cdn` mapping. this rewrites them as they're set on img/video elements too
        patchUrlMappings(URL_MAPPINGS, {patchSrcAttributes: true});

        const login = createActivityRequest(() => null);
        // `authorize` (the consent screen the first time, `prompt: 'none'` skips it after that) + the code exchange +
        // `authenticate`, once: what startup always did before the header sign-in, now only when that sign-in fails or
        // something needs an authenticated sdk (Discord's access token for the share upload, a command answering
        // "not authenticated"). One that fails is forgotten, the next try asks again
        let sdkAuth: Promise<Required<ActivityLogin>> | null = null;
        const ensureSdkAuth = (): Promise<Required<ActivityLogin>> => {
          if (!sdkAuth) {
            const pending = (async () => {
              step = 'authorize';
              const { code } = await sdk.commands.authorize({
                client_id: clientId,
                response_type: 'code',
                state: '',
                prompt: 'none',
                scope: SCOPES,
              });
              step = 'login';
              const auth = await login<ActivityLogin>('/auth/activity', {method: 'POST', body: {code}});
              if (!auth.access_token) {
                throw new Error('no access token');
              }
              step = 'authenticate';
              await sdk.commands.authenticate({access_token: auth.access_token});
              return {token: auth.token, access_token: auth.access_token};
            })();
            sdkAuth = pending;
            pending.catch(() => {
              if (sdkAuth === pending) {
                sdkAuth = null;
              }
            });
          }
          return sdkAuth;
        };
        // a command that may need an authenticated sdk: Discord doesn't say which do, so it runs as is first and once
        // more after `ensureSdkAuth` only when it's turned away for that (the consent screen comes with the feature,
        // never at launch)
        const withSdkAuth = async <T, >(command: () => Promise<T>): Promise<T> => {
          try {
            return await command();
          } catch (error) {
            if (!isSdkAuthError(error)) {
              throw error;
            }
            await ensureSdkAuth();
            return await command();
          }
        };

        // who Discord's proxy signed onto the request (activity-plan.md "Sign-in from the proxy headers"), with their
        // language for the api's own text. Turned away (unsigned, expired, Proxy Authentication off) → the old
        // `authorize` sign-in. No answer at all, or a block, is the startup's failure
        step = 'signin';
        let token: string;
        try {
          ({ token } = await login<ActivityLogin>('/auth/activity', {method: 'POST', body: {locale: navigator.language || undefined}}));
        } catch (error) {
          if (!(error instanceof ActivityRequestError) || error.body?.error === 'blocked') {
            throw error;
          }
          console.warn('[editor activity] header sign-in refused, authorizing instead', error.status, error.code);
          ({ token } = await ensureSdkAuth());
        }
        tokenRef.current = token;
        // shown small when they tab out (the corner window or a call's grid): the compact view (./pip)
        const layoutSdk = sdk;
        setLayoutSubscriber(() => (listener: (layoutMode: number) => void) => {
          const handler = (event: {layout_mode: number}) => listener(event.layout_mode);
          layoutSdk.subscribe('ACTIVITY_LAYOUT_MODE_UPDATE', handler).catch(() => undefined);
          return () => {
            layoutSdk.unsubscribe('ACTIVITY_LAYOUT_MODE_UPDATE', handler).catch(() => undefined);
          };
        });

        step = 'context';
        // an App Channel has no instance (every viewer has their own session): the api works out the channel from what
        // Discord's proxy signs onto the request, and its stand-in id is used like an instance's
        const context = (isAppChannelFrame()) ? await api.appChannel() : await api.activity(sdk.instanceId);
        const instanceId = context.instance_id;

        // the Activity's one socket (activity-plan.md "One Activity socket"): the editor's rooms and the flag game
        room = new EditorRoom(`${(window.location.protocol === 'https:') ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE}/activity/${pathId(instanceId)}/socket`, token);
        room.onStatus((status) => {
          if (status === 'denied') {
            fail('editor.activity.denied');
          }
        });
        room.connect();

        const baseHost: EditorHost = {
          api,
          errorOf: activityErrorOf,
          premiumUrl: PREMIUM_URL,
          templateUrl: (code) => `${SITE_URL}/editor/template/${code}`,
          // Discord's share dialog: a link in chat that launches the activity on the template (`custom_id`, read back
          // from `sdk.customId` below). The message is ours, the link's preview is Discord's
          shareTemplateInChat: true,
          // the bot posts its card (name, effects, an example, Try it) where they could post it themselves, otherwise
          // Discord's share dialog: a link that opens the activity on it (`custom_id`, read back from `sdk.customId`
          // below), its message only text over the app's card
          shareTemplate: async (template, exampleUrl) => {
            const result = await api.activityPost(instanceId, {
              kind: 'template',
              template_code: template.code,
              url: exampleUrl || undefined,
              locale: language,
            }).catch(() => null);
            if (result?.posted) {
              return 'posted';
            }
            await withSdkAuth(() => sdk.commands.shareLink({
              // a locked one's password is never in it
              message: (template.locked)
                ? t('editor.template.share_message_locked', {name: template.name, url: `${SITE_URL}/editor/template/${template.code}`})
                : t('editor.template.share_message', {name: template.name, url: `${SITE_URL}/editor/template/${template.code}`}),
              custom_id: `${TEMPLATE_CUSTOM_ID}${template.code}`,
            }));
            return 'dialog';
          },
          fullscreen: true,
          // the bot posts the file itself (who made it, its effects, an Edit button) where they could post it themselves.
          // Otherwise their own post through Discord's dialog: the render goes onto Discord's cdn first (the api uploads
          // it with their Discord token, so this is where a header sign-in asks for one), the dialog only takes Discord cdn
          // urls. That dialog is desktop/web only (Discord's docs), phones share the activity link with the render's link
          // in the message instead
          share: async (url, filename, documentId) => {
            const result = await api.activityPost(instanceId, {kind: 'render', url, filename, document_id: documentId, locale: language}).catch(() => null);
            if (result?.posted) {
              return 'posted';
            }
            const { access_token } = await ensureSdkAuth();
            const uploaded = await api.shareAttachment(url, access_token, filename);
            if (sdk.platform === Platform.MOBILE) {
              await withSdkAuth(() => sdk.commands.shareLink({message: t('editor.render.share_message', {url: uploaded.url})}));
            } else {
              await withSdkAuth(() => sdk.commands.openShareMomentDialog({mediaUrl: uploaded.url}));
            }
            return 'dialog';
          },
          openExternal: (url) => {
            withSdkAuth(() => sdk.commands.openExternalLink({url})).catch((error) => console.warn('[editor activity] openExternalLink failed', error));
          },
        };
        // back to the lobby list, their spot in a lobby is someone else's to take now
        const leave = () => {
          void room?.setEditing(null);
          setPhase({kind: 'lobbies'});
        };
        // `fill`: they just made it from a template, its questions are asked. `invite`: a redeemed invite to it, in place
        // of a password room's password
        const enterLobby = async (documentId: string, password?: string, fill: boolean = false, invite?: string): Promise<EditingResult> => {
          const result = await room!.setEditing(documentId, password, invite);
          if (alive && result.result === 'ok') {
            setPhase({kind: 'editor', documentId, solo: false, fill});
          }
          return result;
        };
        // Fork: this media and its steps as a new room (its own name and password) or their own edit, then into it.
        // A new room's maker never needs its password
        const fork = async (document: EditorDocument, settings: RoomSettings) => {
          const solo = settings.mode === 'solo';
          const copy = await api.createDocument({
            url: document.source.urls.cdn,
            activityInstanceId: (solo) ? undefined : instanceId,
            lobbyPassword: (settings.mode === 'password') ? settings.password : undefined,
            lobbyName: (!solo && settings.name.trim()) ? settings.name.trim() : undefined,
            lobbyWatchOnly: !solo && Boolean(settings.watchOnly),
          });
          let saved = copy;
          try {
            // the files its steps use (an overlay's picture, a sound) belong to the document forked from: the copy
            // gets its own and the steps point at those. Saved as they were, the api refused the steps ("That file is
            // gone") after the new room already existed
            let steps = document.steps;
            const files = usedAssets(steps, document.assets ?? []);
            if (files.length) {
              const ids = new Map<string, string>();
              for (const file of files) {
                ids.set(file.id, (await api.uploadAsset(copy.id, {url: file.url})).id);
              }
              steps = remapAssets(steps, ids);
            }
            if (steps.length) {
              saved = await api.saveSteps(copy.id, steps, copy.version);
            }
          } catch (failure) {
            // an empty room nobody asked for would stay in the list, one more for every try
            await api.deleteDocument(copy.id).catch(() => undefined);
            throw failure;
          }
          if (solo) {
            // their spot in the room they forked from is someone else's to take now
            void room?.setEditing(null);
            setPhase({kind: 'editor', documentId: saved.id, solo: true});
            return;
          }
          const { result, message } = await enterLobby(saved.id);
          if (result !== 'ok') {
            throw new Error(message || t('editor.session.failed'));
          }
        };
        // a room's Invite (activity-plan.md "Room invites"): made by someone in it, sent through Discord's share sheet (a
        // link that launches the Activity with `custom_id` `invite:<code>`, read back below) or the bot's post with a Join
        const inviter = (kind: RoomInviteKind, roomId: string): RoomInviter => ({
          kind,
          create: () => api.invites.create(instanceId, kind, roomId),
          shareLink: async (code) => {
            const shared = await withSdkAuth(() => sdk.commands.shareLink({
              message: (kind === 'game') ? t('editor.invite.share_message_game') : t('editor.invite.share_message_editor'),
              custom_id: `${INVITE_CUSTOM_ID}${code}`,
            }));
            return (shared.didSendMessage) ? 'sent' : (shared.didCopyLink) ? 'copied' : 'none';
          },
          post: (code) => api.activityPost(instanceId, {kind: 'invite', invite_code: code, locale: language}),
          errorOf: activityErrorOf,
        });
        const leaveLabel = t('editor.session.lobbies');
        const groupHost: EditorHost = {...baseHost, room, fork, onLeave: leave, leaveLabel, inviter: (documentId) => inviter('editor', documentId)};
        const soloHost: EditorHost = {...baseHost, fork, onLeave: leave, leaveLabel};

        const mediaUrl = (typeof context.launch?.media_url === 'string') ? context.launch.media_url : null;
        // `/editor template:` (the bot's launch), or a template link someone shared in chat (`shareLink`'s custom id):
        // its steps go on whatever's picked on the start screen. one that's gone just leaves it off
        const sharedCode = (sdk.customId?.startsWith(TEMPLATE_CUSTOM_ID)) ? sdk.customId.slice(TEMPLATE_CUSTOM_ID.length) : null;
        const templateCode = (typeof context.launch?.template_code === 'string') ? context.launch.template_code
          : (sharedCode && /^[A-Za-z]{1,12}$/.test(sharedCode)) ? sharedCode : null;
        const template = (templateCode) ? await api.template(templateCode).catch(() => null) : null;

        // out of their room: removed from it, it was closed, or a reconnect found it full (or its password changed).
        // back to the list, saying why
        room.subscribe((event) => {
          const current = phaseRef.current;
          if (!alive || current.kind !== 'editor' || current.solo) {
            return;
          }
          if (event.t === 'kicked' && event.document_id === current.documentId) {
            setPhase({kind: 'lobbies', notice: t('editor.session.kicked')});
          } else if (event.t === 'lobby_closed' && event.document_id === current.documentId) {
            setPhase({kind: 'lobbies', notice: (event.by === room!.you) ? t('editor.session.closed_by_you') : t('editor.session.closed')});
          } else if (event.t === 'lobby_deleted' && event.document_id === current.documentId) {
            setPhase({kind: 'lobbies', notice: (event.by === room!.you) ? t('editor.session.deleted_by_you') : t('editor.session.deleted')});
          } else if (event.t === 'editing' && !event.document_id && (event.full || event.error !== undefined)) {
            setPhase({kind: 'lobbies', notice: (event.full) ? t('editor.session.lost_spot') : (event.message || t('editor.session.lost_spot'))});
          }
        });

        // a room invite they launched on (a shared link or the Join on its post): redeemed, then straight into its room.
        // One that can't be opened lands on its kind's room list (the choice when that's unknown), saying why
        const openInvite = async (code: string): Promise<Phase> => {
          try {
            const target = await api.invites.redeem(code, instanceId);
            if (target.kind === 'game') {
              // a password room now lets them in, a watch-only one makes them a watcher
              return {kind: 'game', gameId: target.room_id, watch: false};
            }
            if (target.kind === 'editor') {
              const { result, message } = await enterLobby(target.room_id, undefined, false, code);
              return (result === 'ok') ? {kind: 'editor', documentId: target.room_id, solo: false}
                : screenPhase(inviteScreen('editor'), message || t('editor.session.failed'));
            }
            return screenPhase('choice', t('editor.invite.open_failed'));
          } catch (error) {
            const apiError = activityErrorOf(error);
            console.warn('[editor activity] invite failed', error);
            return screenPhase(inviteScreen(null, apiError?.code ?? null), apiError?.message || t('editor.invite.open_failed'));
          }
        };

        if (!alive) {
          return;
        }
        const surface = (typeof context.launch?.surface === 'string') ? context.launch.surface : null;
        setSetup({instanceId, room, group: groupHost, solo: soloHost, lobbies: context.lobbies, mediaUrl, surface, template, enterLobby, inviter});
        const inviteCode = launchInviteCode(sdk.customId, context.launch);
        const first = (inviteCode) ? await openInvite(inviteCode) : firstPhase({surface, launchedOn: Boolean(mediaUrl || template), carry: carriedFlagGameOf(context.launch)});
        if (alive) {
          setPhase(first);
        }
      } catch (error) {
        const apiError = activityErrorOf(error);
        // the api's status/code/message, or the sdk's own error (its `code` and `message`)
        const raw = error as {code?: unknown, message?: unknown} | null;
        const detail = (apiError)
          ? `${step}: ${apiError.status}${(apiError.code !== null) ? ` (${apiError.code})` : ''} ${apiError.message}`
          : `${step}: ${(raw && raw.code !== undefined) ? `(${String(raw.code)}) ` : ''}${String(raw?.message ?? error)}`;
        console.error('[editor activity] startup failed', step, error);
        if (apiError?.status === 403 && step === 'context') {
          // owner-only while it rolls out (and a user who left the activity)
          return fail('editor.activity.not_ready', detail);
        }
        if (apiError?.code === EditorErrorCodes.UNKNOWN_ACTIVITY_INSTANCE) {
          return fail('editor.activity.denied', detail);
        }
        return fail('editor.activity.failed', detail);
      }
    })();

    return () => {
      alive = false;
      room?.close();
    };
  }, [api, tokenRef]);

  if (phase.kind === 'loading') {
    return <FullPageMessage title={t('editor.activity.loading')}><Spinner/></FullPageMessage>;
  }
  if (phase.kind === 'failed') {
    return (
      <FullPageMessage title={t(phase.message)}>
        {(phase.detail) ? <p className='max-w-xl font-mono text-xs break-words text-subtle'>{phase.detail}</p> : null}
      </FullPageMessage>
    );
  }
  if (!setup) {
    return <FullPageMessage><Spinner/></FullPageMessage>;
  }
  const screen = (() => {
    switch (phase.kind) {
      case 'choice':
        return (
          <ModeChoice
            api={gamesApi}
            room={setup.room}
            notice={phase.notice}
            // the running lobbies when there are any (as of startup), otherwise a new edit
            onEdit={() => setPhase((setup.lobbies.length) ? {kind: 'lobbies'} : {kind: 'start', mode: 'public'})}
            onGame={() => setPhase({kind: 'games_tab'})}
          />
        );
      case 'games_tab':
        return (
          <GamesTab
            api={gamesApi}
            room={setup.room}
            onGame={(game) => setPhase({kind: 'games', game})}
            onBack={() => setPhase({kind: 'choice'})}
          />
        );
      case 'games':
        return (
          <GameRooms
            api={gamesApi}
            room={setup.room}
            errorOf={activityErrorOf}
            notice={phase.notice}
            game={phase.game}
            // Quick play's room too, joined like any other
            onOpen={(gameId, watch) => setPhase({kind: 'game', gameId, watch})}
            onBack={() => setPhase({kind: 'games_tab'})}
          />
        );
      case 'flag_carry':
        return (
          <FlagCarry
            carry={phase.carry}
            loadFlag={loadCarriedFlag}
            onStart={async () => {
              const created = await gamesApi.create({game: 'flag_guesser', name: null, watch_only: false, from_launch: true});
              // its lobby, others join before its creator starts it
              setPhase({kind: 'game', gameId: created.id, watch: false});
            }}
            onRooms={() => setPhase({kind: 'games', game: 'flag_guesser'})}
          />
        );
      case 'game':
        return (
          <ActivityFlagGame
            key={phase.gameId}
            room={setup.room}
            gameId={phase.gameId}
            apiBase={API_BASE}
            token={tokenRef.current ?? ''}
            watch={phase.watch}
            inviter={setup.inviter('game', phase.gameId)}
            onLeave={(notice) => setPhase({kind: 'games', notice})}
          />
        );
      case 'lobbies':
        return (
          <>
            {/* the editor's How to play opens on its own the first time someone gets to its rooms or its start screen */}
            <div className='relative mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 pt-3 -mb-8 sm:-mb-12'>
              <button type='button' onClick={() => setPhase({kind: 'choice'})} className='-ml-2 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
                <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
              </button>
              <HowToPlayButton guide='media-editor' autoOpen className='-mr-2'/>
            </div>
            <LobbyList
              host={setup.group}
              room={setup.room}
              instanceId={setup.instanceId}
              initial={setup.lobbies}
              notice={phase.notice}
              onJoin={setup.enterLobby}
              onNew={() => setPhase({kind: 'start', mode: 'public'})}
            />
          </>
        );
      case 'start':
        return (
          <StartScreen
            key={phase.mode === 'solo' ? 'solo' : 'group'}
            host={(phase.mode === 'solo') ? setup.solo : setup.group}
            activityInstanceId={setup.instanceId}
            template={setup.template}
            suggestedUrl={setup.mediaUrl}
            launchSurface={setup.surface}
            onSuggestedDismiss={() => setSetup((current) => (current) ? {...current, mediaUrl: null} : current)}
            onBack={{label: t('editor.session.lobbies'), run: () => setPhase({kind: 'lobbies'})}}
            // not over the launch's media or template dialog, they came to edit that
            headerAside={<HowToPlayButton guide='media-editor' autoOpen={!setup.mediaUrl && !setup.template} className='-mr-2'/>}
            mode={{value: phase.mode, onChange: (mode) => setPhase({kind: 'start', mode})}}
            // their own new lobby (its maker never needs its password)
            onOpen={async (document, opened) => {
              // the launch's template, or one tried from the start screen's hub panel
              const fill = Boolean((setup.template || opened?.template) && 'steps' in document && document.steps.some((step) => step.inputs));
              if (phase.mode === 'solo') {
                setPhase({kind: 'editor', documentId: document.id, solo: true, fill});
                return;
              }
              const { result, message } = await setup.enterLobby(document.id, undefined, fill);
              if (result !== 'ok') {
                setPhase({kind: 'lobbies', notice: message || t('editor.session.failed')});
              }
            }}
          />
        );
      case 'editor':
        return <ActivityEditor host={(phase.solo) ? setup.solo : setup.group} documentId={phase.documentId} fill={phase.fill}/>;
    }
  })();
  return (
    <GuideLinksProvider openExternal={setup.group.openExternal}>
      {screen}
      {/* the socket's gone and coming back: said on every screen but a game's, which has its own strip for it */}
      {(phase.kind !== 'game') ? <ConnectionNotice room={setup.room}/> : null}
      {(compact) ? <PipView/> : null}
    </GuideLinksProvider>
  );
}
