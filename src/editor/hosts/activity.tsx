import { DiscordSDK, Platform, RPCErrorCodes, patchUrlMappings } from '@discord/embedded-app-sdk';
import { Component, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { ArrowLeft } from 'lucide-react';

import { carriedFlagGameOf, FlagCarry, type CarriedFlagGame } from '@/activity-games/FlagCarry';
import { ActivityFlagGame } from '@/activity-games/FlagGame';
import { GameRooms } from '@/activity-games/GameRooms';
import { GamesTab } from '@/activity-games/GamesTab';
import { ModeChoice } from '@/activity-games/ModeChoice';
import { createGameRoomsApi } from '@/activity-games/rooms';
import { tokenStorage } from '@/auth/tokenStorage';
import { GuideLinksProvider, HowToPlayButton } from '@/components/guides/GuideSheet';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { anySignal, timeoutSignal } from '@/lib/abort';
import { translate, useI18n } from '@/i18n';
import type { UserGuild } from '@/lib/api/types';

import { createEditorApi, EditorErrorCodes, pathId, type EditorApiError, type EditorHost, type EditorRequest, type RoomSettings } from '../api';
import { EditorApp } from '../components/EditorApp';
import { activityLanguage, applyActivityLocales } from '../activityLanguage';
import { activityLog } from '../activityLog';
import { INVITE_CUSTOM_ID, type RoomInviteKind, type RoomInviter } from '../invites';
import { ConnectionNotice } from '../components/ConnectionNotice';
import { LobbyList } from '../components/LobbyList';
import { StartScreen } from '../components/StartScreen';
import { EditorRoom, type EditingResult, type RoomMember } from '../room';
import { localizedSiteUrl } from '../siteLinks';
import { remapAssets, usedAssets } from '../stack';
import { PipView, useCompactLayout, usePipStatus, type LayoutSubscriber } from './pip';
import { PresenceSender, presenceOf, presenceSession } from './presence';
import type { EditorDocument, EditorLobby, EditorTemplate } from '../types';
import { useCatalogue } from '../useCatalogue';
import { inviteScreen, launchInviteCode, launchScreen, launchTemplateCode, TEMPLATE_CUSTOM_ID, type ActivityLaunchScreen } from './activityLaunch';
import { isSamePhase, nextPhase, PHASE_SCREENS, type Phase, type Step } from './activityPhase';


// The media editor as a Discord Activity (activity.html). Discord loads it through its proxy with the url mapping
// `/` → `<site>/activity`, so the page can only reach the outside through other mappings: `/api` → notsobot.api and
// `/cdn` → cdn.nsb.gg (both set in the developer portal). Flow:
// sdk ready → `POST /auth/activity` with no code (our user token from who Discord's proxy signed onto the request, no
// consent screen; kept in memory: storage inside Discord's iframe can't be relied on) → the instance's launch context
// and lobbies → its room. If that sign-in fails: authorize (a code) → `POST /auth/activity {code}` → sdk authenticate,
// as before. Otherwise the sdk is only `authenticate`d once a command needs it (`ensureSdkAuth` below).
// A channel's activity has any number of group edits ("lobbies", up to MAX_INSTANCE_LOBBIES), each up to
// ROOM_MAX_EDITORS editors and optionally locked with a password, plus solo edits nobody else sees


// requests through Discord's proxy, the `/api` url mapping. The site's api client is set to it too (src/activity.tsx),
// for the Server and Your settings' dashboard pages
export const API_BASE = '/.proxy/api';
const URL_MAPPINGS = [{prefix: '/cdn', target: 'cdn.nsb.gg'}];
const SITE_URL = 'https://notsobot.com';

const PREMIUM_URL = `${SITE_URL}/premium`;
// only who they are (Discord's "Access your username, avatar and banner"): the api checks the instance and the server
// with the bot's token, nothing needs their server list
const SCOPES: Array<'identify'> = ['identify'];


// The server's dashboard pages (the mode choice's Server settings) and your own (Your settings), only downloaded when
// they're opened. A chunk that didn't load says so with a way back instead of taking the whole Activity down
const loadServerSettings = async () => (await import('@/activity-games/server/ServerSettingsScreen')).ServerSettingsScreen;
const loadUserSettings = async () => (await import('@/activity-games/user/UserSettingsScreen')).UserSettingsScreen;

// a screen's download. `lazy` kept one that failed for as long as the Activity ran, every reopen showing the failure
// again without asking
type LoadedScreen<T> =
  | {status: 'loading'}
  | {status: 'ready', Screen: T}
  | {status: 'failed'};

// Downloads a screen when it's opened and shows it (`children`): asked for again every time it's opened, and on Retry
function SettingsLoader<T>({ name, load, onBack, children }: {
  // for the console
  name: string,
  load: () => Promise<T>,
  onBack: () => void,
  children: (Screen: T) => ReactNode,
}) {
  const { t } = useI18n();
  const [ loaded, setLoaded ] = useState<LoadedScreen<T>>({status: 'loading'});
  const [ attempt, setAttempt ] = useState(0);
  useEffect(() => {
    let alive = true;
    load().then((Screen) => {
      if (alive) {
        setLoaded({status: 'ready', Screen});
      }
    }).catch((error) => {
      console.warn(`[editor activity] ${name} failed to load`, error);
      if (alive) {
        setLoaded({status: 'failed'});
      }
    });
    return () => {
      alive = false;
    };
  }, [load, name, attempt]);

  switch (loaded.status) {
    case 'loading':
      return <FullPageMessage><Spinner/></FullPageMessage>;
    case 'failed':
      return (
        <FullPageMessage title={t('route_error.chunk')}>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => {
                setLoaded({status: 'loading'});
                setAttempt((value) => value + 1);
              }}
            >
              {t('common.retry')}
            </button>
            <button type='button' className='btn btn-secondary' onClick={onBack}>{t('games.choice.back')}</button>
          </div>
        </FullPageMessage>
      );
    case 'ready':
      // anything in them that suspends has the same spinner to fall back on
      return (
        <Suspense fallback={<FullPageMessage><Spinner/></FullPageMessage>}>
          {children(loaded.Screen)}
        </Suspense>
      );
  }
}


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

// `failed`'s `data-failure` is its message without this (`not_in_discord`, `failed`, `not_ready`, `denied`)
const FAILURE_PREFIX = 'editor.activity.';

// how long Discord's handshake gets, the sdk's `ready` waits for good
const READY_WAIT = 20 * 1000;

function readyWithin(sdk: DiscordSDK, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timed out')), ms);
    sdk.ready().then(() => {
      window.clearTimeout(timer);
      resolve();
    }, (error) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

// thrown in a startup whose effect was cleaned up (in dev, StrictMode's first run): it stops where it is, quietly
const CANCELLED = Symbol('cancelled');


// what startup set up, for the screens
interface ActivitySetup {
  instanceId: string,
  // the server it's running in, null in a dm (and an App Channel outside one)
  guildId: string | null,
  // the Activity's one socket: the editor's rooms and the flag game
  room: EditorRoom,
  // the group's host (the room) and a solo document's (no room: its edits must never reach a lobby's)
  group: EditorHost,
  solo: EditorHost,
  // the lobby list as of the socket's last `ready` (startup's until then), without the ones closed or deleted since
  lobbies: Array<EditorLobby>,
  // whether a room is running right now, as far as the socket has said: the choice's Edit opens the room list then
  hasLobbies: () => boolean,
  // what they launched on: Edit Media's media (filled in on the start screen) and a template
  mediaUrl: string | null,
  // how it was launched (`edit_media`, `edit_avatar`, `games`, ... see ./activityLaunch)
  surface: string | null,
  // the entry point's Join: whose launch message it was on (the api only says while the launch is fresh), the choice's
  // "Jump in with someone" lists them first
  joinedUserId: string | null,
  template: EditorTemplate | null,
  // into a lobby, if there's room in it (`ROOM_MAX_EDITORS`) and the password's right (or with a redeemed invite to it).
  // `from`: the phase that asked (the one on screen when it's left out). Somewhere else by the time it's answered and
  // they aren't moved, and their spot in it is let go
  enterLobby: (documentId: string, password?: string, fill?: boolean, invite?: string, from?: Phase) => Promise<EditingResult>,
  // a NotSoBot owner, who sees the connection logs (../components/ActivityLogButton)
  owner: boolean,
  // a room's Invite dialog (../invites.ts)
  inviter: (kind: RoomInviteKind, roomId: string) => RoomInviter,
}


function ActivityEditor({ host, documentId, fill = false }: {host: EditorHost, documentId: string, fill?: boolean}) {
  const { t } = useI18n();
  const { catalogue, error, retry } = useCatalogue(host);
  if (error) {
    return (
      <FullPageMessage title={t('editor.catalogue_error')}>
        <div className='flex flex-wrap items-center justify-center gap-2'>
          <button type='button' className='btn btn-secondary' onClick={retry}>{t('common.retry')}</button>
          {/* out of the edit (a room's spot is let go) rather than only trying again */}
          {(host.onLeave) ? <button type='button' className='btn btn-secondary' onClick={host.onLeave}>{t('editor.back')}</button> : null}
        </div>
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


// Something threw while a screen was rendering: React takes the whole tree down, which inside Discord is a blank frame
// with nothing to press. This says so instead, with Reload
class ActivityErrorBoundary extends Component<{children: ReactNode}, {crashed: boolean}> {
  state = {crashed: false};

  static getDerivedStateFromError(): {crashed: boolean} {
    return {crashed: true};
  }

  componentDidCatch(error: unknown): void {
    console.error('[editor activity] a screen failed to render', error);
  }

  render(): ReactNode {
    return (this.state.crashed) ? <ActivityCrashed/> : this.props.children;
  }
}

function ActivityCrashed() {
  const { t } = useI18n();
  return (
    <div className='contents' data-state='crashed'>
      <FullPageMessage title={t('route_error.title')}>
        <button type='button' className='btn btn-secondary' onClick={() => window.location.reload()}>{t('common.reload')}</button>
      </FullPageMessage>
    </div>
  );
}


export function ActivityApp() {
  return <ActivityErrorBoundary><ActivityScreens/></ActivityErrorBoundary>;
}


function ActivityScreens() {
  const { t } = useI18n();
  const [ phase, changePhase ] = useReducer(nextPhase, {kind: 'loading', step: 'sdk'});
  // to another screen. `from`: the phase that asked for it, when it comes later than the press (see `PhaseChange`)
  const setPhase = useCallback((to: Phase, from?: Phase) => changePhase({to, from}), []);
  // the phase as of the last render, for the room's listener (set up once at startup) and for what's answered later
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [ setup, setSetup ] = useState<ActivitySetup | null>(null);
  // refs and state, not memos: the startup effect below runs again if one of these is ever made anew
  const tokenRef = useRef<string | null>(null);
  const [ api ] = useState(() => createEditorApi(createActivityRequest(() => tokenRef.current)));
  // discord's layout mode once the sdk can be asked, and whether that (or the window's size) makes it the compact view
  const [ layoutSubscriber, setLayoutSubscriber ] = useState<LayoutSubscriber | null>(null);
  const compact = useCompactLayout(layoutSubscriber);
  // their Discord profile's line (./presence), once the sdk's ready
  const [ presence, setPresence ] = useState<PresenceSender | null>(null);
  // the flag game's rooms in this instance's server (or dm)
  const gameInstanceId = setup?.instanceId ?? null;
  const gamesApi = useMemo(() => createGameRoomsApi(createActivityRequest(() => tokenRef.current), gameInstanceId ?? 'none'), [gameInstanceId, tokenRef]);
  // where they are, said over the socket for everyone's start screen counts
  const roomScreen = PHASE_SCREENS[phase.kind];
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
  // the server as they see it on the dashboard, once it says they can change something there: the mode choice's Server
  // settings. Asked once after startup, the mode choice doesn't wait for it
  const setupGuildId = setup?.guildId ?? null;
  const [ settingsGuild, setSettingsGuild ] = useState<UserGuild | null>(null);
  useEffect(() => {
    if (!setupGuildId) {
      return;
    }
    let alive = true;
    createActivityRequest(() => tokenRef.current)<UserGuild>(`/users/@me/guilds/${pathId(setupGuildId)}`).then((guild) => {
      if (alive && Object.values(guild.editable).some(Boolean)) {
        setSettingsGuild(guild);
      }
    }).catch((error) => console.warn('[editor activity] server lookup failed', error));
    return () => {
      alive = false;
    };
  }, [setupGuildId, tokenRef]);

  useEffect(() => {
    // looked up when used, not as of startup: the language can switch once the context says (../activityLanguage)
    const t = translate;
    let alive = true;
    let room: EditorRoom | null = null;
    let presence: PresenceSender | null = null;
    const fail = (message: Extract<Phase, {kind: 'failed'}>['message'], detail?: string) => {
      if (alive) {
        setPhase({kind: 'failed', message, detail});
      }
    };
    // (the cast: `enter` sets it from inside a function, the compiler would take it for 'sdk' everywhere else)
    let step = 'sdk' as Step;
    // nothing more from a run whose effect was cleaned up: no second sign-in, and no socket nobody would ever close
    const live = () => {
      if (!alive) {
        throw CANCELLED;
      }
    };
    // on to a step, the loading screen says which (after startup the phase isn't loading and nothing changes)
    const enter = (next: Step) => {
      live();
      step = next;
      changePhase({step: next});
    };

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
        enter('ready');
        // a handshake Discord never answers used to leave the loading screen up for good
        await readyWithin(sdk, READY_WAIT);
        live();
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
              enter('authorize');
              const { code } = await sdk.commands.authorize({
                client_id: clientId,
                response_type: 'code',
                state: '',
                prompt: 'none',
                scope: SCOPES,
              });
              enter('login');
              const auth = await login<ActivityLogin>('/auth/activity', {method: 'POST', body: {code}});
              if (!auth.access_token) {
                throw new Error('no access token');
              }
              enter('authenticate');
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
        enter('signin');
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
        live();
        tokenRef.current = token;
        // the site's api client and `useAuth` read it from there, for the settings' dashboard pages. Every launch
        // signs in again, so whatever an earlier one left in storage is replaced here
        tokenStorage.set(token);
        // shown small when they tab out (the corner window or a call's grid): the compact view (./pip)
        const layoutSdk = sdk;
        setLayoutSubscriber(() => (listener: (layoutMode: number) => void) => {
          const handler = (event: {layout_mode: number}) => listener(event.layout_mode);
          layoutSdk.subscribe('ACTIVITY_LAYOUT_MODE_UPDATE', handler).catch(() => undefined);
          return () => {
            layoutSdk.unsubscribe('ACTIVITY_LAYOUT_MODE_UPDATE', handler).catch(() => undefined);
          };
        });
        // the profile's line: what's on screen from here on (nothing needs `authenticate`, see ./presence)
        presence = new PresenceSender((activity) => layoutSdk.commands.setActivity({activity}));
        setPresence(presence);

        enter('context');
        // an App Channel has no instance (every viewer has their own session): the api works out the channel from what
        // Discord's proxy signs onto the request, and its stand-in id is used like an instance's
        const context = (isAppChannelFrame()) ? await api.appChannel() : await api.activity(sdk.instanceId);
        // before the socket: one made by a run that's over would stay connected, nothing closes it
        live();
        const instanceId = context.instance_id;
        // their NotSoBot setting and the server's: the Activity switches to it a moment later when it's not the start's
        void applyActivityLocales(context.locales);
        activityLog.add('startup', `context ok, instance ${instanceId}, launch ${String(context.launch?.surface ?? 'none')}`);

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
              locale: activityLanguage().language,
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
            const result = await api.activityPost(instanceId, {kind: 'render', url, filename, document_id: documentId, locale: activityLanguage().language}).catch(() => null);
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
          // every link out of the Activity (guides, settings, premium) lands here: the site's pages open in the
          // Activity's language, looked up when opened (../siteLinks)
          openExternal: (link) => {
            const url = localizedSiteUrl(link, activityLanguage().language);
            withSdkAuth(() => sdk.commands.openExternalLink({url})).catch((error) => console.warn('[editor activity] openExternalLink failed', error));
          },
        };
        // back to the lobby list, their spot in a lobby is someone else's to take now
        const leave = () => {
          void room?.setEditing(null);
          setPhase({kind: 'lobbies'});
        };
        // The rooms running now, as far as the socket has said: the list as of its last `ready` (the context's until
        // then) and any that someone's been seen in or that changed since (a new room has no message of its own). For
        // the choice's Edit, which used to go by the list as of startup
        let lobbyIds = new Set(context.lobbies.map((lobby) => lobby.id));
        const sawEditors = (members: Array<RoomMember>) => {
          for (const member of members) {
            if (member.editing) {
              lobbyIds.add(member.editing);
            }
          }
        };
        // joins on their way. The socket is in one lobby at a time and a later join moves it, so only the latest
        // one's answer says where they are
        let joins = 0;
        // `fill`: they just made it from a template, its questions are asked. `invite`: a redeemed invite to it, in place
        // of a password room's password. `from`: the phase that asked
        const enterLobby = async (documentId: string, password?: string, fill: boolean = false, invite?: string, from: Phase = phaseRef.current): Promise<EditingResult> => {
          const join = ++joins;
          const result = await room!.setEditing(documentId, password, invite);
          if (!alive || join !== joins || result.result !== 'ok') {
            return result;
          }
          lobbyIds.add(documentId);
          if (isSamePhase(from, phaseRef.current)) {
            setPhase({kind: 'editor', documentId, solo: false, fill}, from);
          } else {
            // they went somewhere else while it was on its way (Back during a reconnect, into a game, the Activity
            // failed): they aren't pulled out of there into the edit, and the spot it took is someone else's to take
            void room!.setEditing(null);
          }
          return result;
        };
        // Fork: this media and its steps as a new room (its own name and password) or their own edit, then into it.
        // A new room's maker never needs its password
        const fork = async (document: EditorDocument, settings: RoomSettings) => {
          // the edit that asked for it
          const from = phaseRef.current;
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
          // out of that edit by the time the copy's ready (removed from it, it was closed): it's made, and they stay
          // where they are. Nothing of the socket's is touched, they may be in another room by now
          if (!isSamePhase(from, phaseRef.current)) {
            return;
          }
          if (solo) {
            // their spot in the room they forked from is someone else's to take now
            void room?.setEditing(null);
            setPhase({kind: 'editor', documentId: saved.id, solo: true}, from);
            return;
          }
          const { result, message } = await enterLobby(saved.id, undefined, false, undefined, from);
          if (result !== 'ok') {
            // like above: a room its maker couldn't get into would stay in the list
            await api.deleteDocument(saved.id).catch(() => undefined);
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
          post: (code) => api.activityPost(instanceId, {kind: 'invite', invite_code: code, locale: activityLanguage().language}),
          errorOf: activityErrorOf,
        });
        const leaveLabel = 'editor.session.lobbies' as const;
        const groupHost: EditorHost = {...baseHost, room, fork, onLeave: leave, leaveLabel, inviter: (documentId) => inviter('editor', documentId)};
        const soloHost: EditorHost = {...baseHost, fork, onLeave: leave, leaveLabel};

        const mediaUrl = (typeof context.launch?.media_url === 'string') ? context.launch.media_url : null;
        // a template link someone shared in chat (`shareLink`'s custom id), or `/editor template:` (the bot's launch):
        // its steps go on whatever's picked on the start screen. one that's gone just leaves it off
        const templateCode = launchTemplateCode(sdk.customId, context.launch);
        const template = (templateCode) ? await api.template(templateCode).catch(() => null) : null;

        // whoever the socket already said is editing (its `ready` can come before this is listening)
        sawEditors(room.members);
        room.subscribe((event) => {
          if (!alive) {
            return;
          }
          // the rooms running now (see `lobbyIds`), and the list the room list starts from
          if (event.t === 'ready') {
            lobbyIds = new Set(event.lobbies.map((lobby) => lobby.id));
            sawEditors(event.members);
            setSetup((current) => (current) ? {...current, lobbies: event.lobbies} : current);
          } else if (event.t === 'members') {
            sawEditors(event.members);
          } else if (event.t === 'lobby_edited' || event.t === 'lobby_updated') {
            lobbyIds.add(event.document_id);
          } else if (event.t === 'lobby_closed' || event.t === 'lobby_deleted') {
            lobbyIds.delete(event.document_id);
            setSetup((current) => (current) ? {...current, lobbies: current.lobbies.filter((lobby) => lobby.id !== event.document_id)} : current);
          }
          // out of their room: removed from it, it was closed, or a reconnect found it full (or its password changed).
          // back to the list, saying why
          const current = phaseRef.current;
          if (current.kind !== 'editor' || current.solo) {
            return;
          }
          if (event.t === 'kicked' && event.document_id === current.documentId) {
            setPhase({kind: 'lobbies', notice: t('editor.session.kicked')}, current);
          } else if (event.t === 'lobby_closed' && event.document_id === current.documentId) {
            setPhase({kind: 'lobbies', notice: (event.by === room!.you) ? t('editor.session.closed_by_you') : t('editor.session.closed')}, current);
          } else if (event.t === 'lobby_deleted' && event.document_id === current.documentId) {
            setPhase({kind: 'lobbies', notice: (event.by === room!.you) ? t('editor.session.deleted_by_you') : t('editor.session.deleted')}, current);
          } else if (event.t === 'editing' && !event.document_id && (event.full || event.error !== undefined)) {
            setPhase({kind: 'lobbies', notice: (event.full) ? t('editor.session.lost_spot') : (event.message || t('editor.session.lost_spot'))}, current);
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
        const joinedUserId = (typeof context.launch?.joined_user_id === 'string') ? context.launch.joined_user_id : null;
        setSetup({instanceId, guildId: context.guild_id, room, group: groupHost, solo: soloHost, lobbies: context.lobbies, hasLobbies: () => lobbyIds.size > 0, mediaUrl, surface, joinedUserId, template, enterLobby, inviter, owner: context.owner});
        const inviteCode = launchInviteCode(sdk.customId, context.launch);
        const first = (inviteCode) ? await openInvite(inviteCode) : firstPhase({surface, launchedOn: Boolean(mediaUrl || template), carry: carriedFlagGameOf(context.launch)});
        if (alive) {
          setPhase(first);
        }
      } catch (error) {
        // a run that's over has nothing to say, whatever it stopped on
        if (error === CANCELLED || !alive) {
          return;
        }
        const apiError = activityErrorOf(error);
        // the api's status/code/message, or the sdk's own error (its `code` and `message`)
        const raw = error as {code?: unknown, message?: unknown} | null;
        const detail = (apiError)
          ? `${step}: ${apiError.status}${(apiError.code !== null) ? ` (${apiError.code})` : ''} ${apiError.message}`
          : `${step}: ${(raw && raw.code !== undefined) ? `(${String(raw.code)}) ` : ''}${String(raw?.message ?? error)}`;
        console.error('[editor activity] startup failed', step, error);
        activityLog.add('startup', `failed ${detail}`);
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
      presence?.close();
    };
  }, [api, tokenRef, phaseRef, setPhase]);

  // The screens' root is `display: contents` (no box of its own, the layout is what it was) and says the phase:
  // `data-state`, with `data-step` while it's starting and `data-failure` when it couldn't
  if (phase.kind === 'loading') {
    return (
      <div className='contents' data-state={phase.kind} data-step={phase.step}>
        <FullPageMessage title={t('editor.activity.loading')}><Spinner/></FullPageMessage>
      </div>
    );
  }
  if (phase.kind === 'failed') {
    return (
      <div className='contents' data-state={phase.kind} data-failure={phase.message.slice(FAILURE_PREFIX.length)}>
        <FullPageMessage title={t(phase.message)}>
          {(phase.detail) ? <p className='max-w-xl font-mono text-xs break-words text-subtle'>{phase.detail}</p> : null}
          {/* starting over is the way out of a launch that failed and of a socket that was turned away (outside
              Discord there's nothing to start over) */}
          {(phase.message === 'editor.activity.failed' || phase.message === 'editor.activity.denied') ? (
            <button type='button' className='btn btn-secondary' onClick={() => window.location.reload()}>{t('common.reload')}</button>
          ) : null}
        </FullPageMessage>
      </div>
    );
  }
  if (!setup) {
    return (
      <div className='contents' data-state={phase.kind}>
        <FullPageMessage><Spinner/></FullPageMessage>
      </div>
    );
  }
  // the launch's media went into an edit: its dialog doesn't come back with the next new one
  const launchMediaUsed = () => setSetup((current) => (current?.mediaUrl) ? {...current, mediaUrl: null} : current);
  const openExternal = setup.group.openExternal ?? ((url: string) => window.open(url, '_blank', 'noopener'));
  const screen = (() => {
    switch (phase.kind) {
      case 'choice':
        return (
          <ModeChoice
            api={gamesApi}
            room={setup.room}
            notice={phase.notice}
            // the running lobbies when there are any right now, otherwise a new edit
            onEdit={() => setPhase((setup.hasLobbies()) ? {kind: 'lobbies'} : {kind: 'start', mode: 'public'})}
            onGame={() => setPhase({kind: 'games_tab'})}
            first={setup.joinedUserId}
            // someone's room here: a game room opens like it does from its list (a password one closes back to that
            // game's rooms saying so), a lobby is joined like from the lobby list and lands on it when that's refused
            onJoin={async (target) => {
              if (target.kind === 'game') {
                setPhase({kind: 'game', gameId: target.gameId, watch: false, game: target.game}, phase);
                return;
              }
              const { result, message } = await setup.enterLobby(target.documentId, undefined, false, undefined, phase);
              if (result !== 'ok' && isSamePhase(phase, phaseRef.current)) {
                setPhase({kind: 'lobbies', notice: message || t('editor.session.failed')}, phase);
              }
            }}
            onYourSettings={() => setPhase({kind: 'user_settings'})}
            server={(settingsGuild) ? {guild: settingsGuild, onOpen: () => setPhase({kind: 'server_settings', guildId: settingsGuild.id})} : null}
          />
        );
      case 'server_settings':
        return (
          <SettingsLoader key='server' name='server settings' load={loadServerSettings} onBack={() => setPhase({kind: 'choice'})}>
            {(ServerSettingsScreen) => (
              <ServerSettingsScreen
                guildId={phase.guildId}
                guild={(settingsGuild?.id === phase.guildId) ? settingsGuild : null}
                siteUrl={SITE_URL}
                openExternal={openExternal}
                onBack={() => setPhase({kind: 'choice'})}
              />
            )}
          </SettingsLoader>
        );
      case 'user_settings':
        return (
          <SettingsLoader key='user' name='your settings' load={loadUserSettings} onBack={() => setPhase({kind: 'choice'})}>
            {(UserSettingsScreen) => (
              <UserSettingsScreen
                siteUrl={SITE_URL}
                openExternal={openExternal}
                onBack={() => setPhase({kind: 'choice'})}
              />
            )}
          </SettingsLoader>
        );
      case 'games_tab':
        return (
          <GamesTab
            api={gamesApi}
            room={setup.room}
            onGame={(game) => setPhase({kind: 'games', game: game ?? undefined})}
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
            // Quick play's room too, joined like any other. The list's filter goes with it, for the way back
            onOpen={(gameId, watch) => setPhase({kind: 'game', gameId, watch, game: phase.game})}
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
              // its lobby, others join before its creator starts it (leaving it goes to Flag Guesser's rooms, like
              // this screen's other button)
              setPhase({kind: 'game', gameId: created.id, watch: false, game: 'flag_guesser'}, phase);
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
            owner={setup.owner}
            inviter={setup.inviter('game', phase.gameId)}
            // back to the room list as it was filtered
            onLeave={(notice) => setPhase({kind: 'games', notice, game: phase.game})}
          />
        );
      case 'lobbies':
        return (
          <>
            {/* the editor's How to play carries a dot until it's been opened, on its rooms and its start screen */}
            <div className='relative mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 pt-3 -mb-8 sm:-mb-12'>
              <button type='button' onClick={() => setPhase({kind: 'choice'})} className='-ml-2 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
                <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
              </button>
              <HowToPlayButton guide='media-editor' markUnseen className='-mr-2'/>
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
          // one screen whoever the edit is for: what's picked on it (a hub template, an unlocked template's password)
          // stays when that changes, and nothing can be changed while an upload is on its way
          <StartScreen
            host={(phase.mode === 'solo') ? setup.solo : setup.group}
            activityInstanceId={setup.instanceId}
            template={setup.template}
            suggestedUrl={setup.mediaUrl}
            launchSurface={setup.surface}
            onSuggestedDismiss={() => setSetup((current) => (current) ? {...current, mediaUrl: null} : current)}
            onBack={{label: t('editor.session.lobbies'), run: () => setPhase({kind: 'lobbies'})}}
            headerAside={<HowToPlayButton guide='media-editor' markUnseen className='-mr-2'/>}
            mode={{value: phase.mode, onChange: (mode) => setPhase({kind: 'start', mode})}}
            // their own new lobby (its maker never needs its password)
            onOpen={async (document, opened) => {
              // an upload that lands after the start screen is gone (the Activity failed meanwhile) opens nothing
              const from = phaseRef.current;
              if (from.kind !== 'start') {
                return;
              }
              // the launch's template, or one tried from the start screen's hub panel
              const fill = Boolean((setup.template || opened?.template) && 'steps' in document && document.steps.some((step) => step.inputs));
              if (phase.mode === 'solo') {
                setPhase({kind: 'editor', documentId: document.id, solo: true, fill}, from);
                launchMediaUsed();
                return;
              }
              const { result, message } = await setup.enterLobby(document.id, undefined, fill, undefined, from);
              // after the answer: the launch's dialog is what's showing "Starting…" until then
              launchMediaUsed();
              if (result !== 'ok') {
                setPhase({kind: 'lobbies', notice: message || t('editor.session.failed')}, from);
              }
            }}
          />
        );
      case 'editor':
        return <ActivityEditor host={(phase.solo) ? setup.solo : setup.group} documentId={phase.documentId} fill={phase.fill}/>;
      default:
        // a phase without a screen doesn't compile (it used to render nothing)
        return phase satisfies never;
    }
  })();
  return (
    <div className='contents' data-state={phase.kind}>
      <GuideLinksProvider openExternal={setup.group.openExternal}>
        {screen}
        {/* the socket's gone and coming back: said on every screen but a game's, which has its own strip for it. Always
            mounted, so it knows the socket was open before whichever screen they're on now */}
        <ConnectionNotice room={setup.room} muted={phase.kind === 'game'}/>
        {(presence) ? <PresenceSync sender={presence} phase={phase}/> : null}
        {(compact) ? <PipView/> : null}
      </GuideLinksProvider>
    </div>
  );
}


// Keeps their Discord profile's line (./presence) on what's on screen. Its own component: the small window's status
// changes with every score and preview, and only this needs to render again for it
function PresenceSync({ sender, phase }: {sender: PresenceSender, phase: Phase}) {
  const { t } = useI18n();
  const activity = presenceOf(phase, usePipStatus(), t);
  const session = (activity) ? presenceSession(phase, activity) : null;
  const key = JSON.stringify([ activity, session ]);
  useEffect(() => {
    sender.update(activity, session);
    // the activity it says, not the object (a new one every render)
  }, [sender, key]);
  return null;
}
