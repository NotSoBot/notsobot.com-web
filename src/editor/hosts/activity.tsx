import { DiscordSDK, Platform, patchUrlMappings } from '@discord/embedded-app-sdk';
import { useEffect, useMemo, useState } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import { createEditorApi, EditorErrorCodes, pathId, type EditorApiError, type EditorHost, type EditorRequest, type RoomSettings } from '../api';
import { EditorApp } from '../components/EditorApp';
import { LobbyList } from '../components/LobbyList';
import { StartScreen, type LobbyMode } from '../components/StartScreen';
import { EditorRoom, type EditingResult } from '../room';
import type { EditorDocument, EditorLobby, EditorTemplate } from '../types';
import { useCatalogue } from '../useCatalogue';


// The media editor as a Discord Activity (activity.html). Discord loads it through its proxy with the url mapping
// `/` → `<site>/activity`, so the page can only reach the outside through other mappings: `/api` → notsobot.api and
// `/cdn` → cdn.nsb.gg (both set in the developer portal). Flow:
// sdk ready → authorize (a code) → `POST /auth/activity` (our user token, kept in memory: storage inside Discord's
// iframe can't be relied on) → sdk authenticate → the instance's launch context and lobbies → its room.
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
    const timeout = AbortSignal.timeout(options.timeout ?? 15 * 1000);
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: (options.signal) ? AbortSignal.any([options.signal, timeout]) : timeout,
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


// the startup steps, a failure names the one it stopped at
type Step = 'sdk' | 'ready' | 'authorize' | 'login' | 'authenticate' | 'context';

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
  // a new edit: who it's for (just me, everyone, everyone with the password) and its media
  | {kind: 'start', mode: LobbyMode}
  | {kind: 'editor', documentId: string, solo: boolean};


// what startup set up, for the screens
interface ActivitySetup {
  instanceId: string,
  room: EditorRoom,
  // the group's host (the room) and a solo document's (no room: its edits must never reach a lobby's)
  group: EditorHost,
  solo: EditorHost,
  // the lobby list as of startup
  lobbies: Array<EditorLobby>,
  // what they launched on: Edit Media's media (filled in on the start screen) and a template
  mediaUrl: string | null,
  template: EditorTemplate | null,
  // into a lobby, if there's room in it (`ROOM_MAX_EDITORS`) and the password's right
  enterLobby: (documentId: string, password?: string) => Promise<EditingResult>,
}


function ActivityEditor({ host, documentId }: {host: EditorHost, documentId: string}) {
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
  return <EditorApp key={documentId} host={host} documentId={documentId} catalogue={catalogue}/>;
}


export function ActivityApp() {
  const { t } = useI18n();
  const [ phase, setPhase ] = useState<Phase>({kind: 'loading'});
  // the phase as of the last render, for the room's listener (set up once at startup)
  const phaseRef = useMemo(() => ({current: phase}), []);
  phaseRef.current = phase;
  const [ setup, setSetup ] = useState<ActivitySetup | null>(null);
  const tokenRef = useMemo(() => ({current: null as string | null}), []);
  const api = useMemo(() => createEditorApi(createActivityRequest(() => tokenRef.current)), [tokenRef]);

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

        step = 'authorize';
        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: SCOPES,
        });
        step = 'login';
        const auth = await createActivityRequest(() => null)<{token: string, access_token: string}>('/auth/activity', {
          method: 'POST',
          body: {code},
        });
        tokenRef.current = auth.token;
        step = 'authenticate';
        await sdk.commands.authenticate({access_token: auth.access_token});

        const instanceId = sdk.instanceId;
        step = 'context';
        const context = await api.activity(instanceId);

        room = new EditorRoom(`${(window.location.protocol === 'https:') ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE}/editor/rooms/${pathId(instanceId)}`, auth.token);
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
          shareTemplate: async (template) => {
            await sdk.commands.shareLink({
              // what it is and where it's from, Discord puts the activity's link card under it. a locked one's
              // password is never in it
              message: (template.locked)
                ? t('editor.template.share_message_locked', {name: template.name, url: `${SITE_URL}/editor/template/${template.code}`})
                : t('editor.template.share_message', {name: template.name, url: `${SITE_URL}/editor/template/${template.code}`}),
              custom_id: `${TEMPLATE_CUSTOM_ID}${template.code}`,
            });
          },
          fullscreen: true,
          // the user posts it themselves through Discord's own dialogs, the bot never posts in their channel. The render
          // goes onto Discord's cdn first (the api uploads it with their token): the share dialog only takes Discord cdn
          // urls. That dialog is desktop/web only (Discord's docs), phones share the activity link with the render's link
          // in the message instead, which Discord previews
          share: async (url, filename) => {
            const uploaded = await api.shareAttachment(url, auth.access_token, filename);
            if (sdk.platform === Platform.MOBILE) {
              await sdk.commands.shareLink({message: t('editor.render.share_message', {url: uploaded.url})});
            } else {
              await sdk.commands.openShareMomentDialog({mediaUrl: uploaded.url});
            }
          },
          openExternal: (url) => {
            void sdk.commands.openExternalLink({url});
          },
        };
        // back to the lobby list, their spot in a lobby is someone else's to take now
        const leave = () => {
          void room?.setEditing(null);
          setPhase({kind: 'lobbies'});
        };
        const enterLobby = async (documentId: string, password?: string): Promise<EditingResult> => {
          const result = await room!.setEditing(documentId, password);
          if (alive && result.result === 'ok') {
            setPhase({kind: 'editor', documentId, solo: false});
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
          });
          const saved = (document.steps.length) ? await api.saveSteps(copy.id, document.steps, copy.version) : copy;
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
        const leaveLabel = t('editor.session.lobbies');
        const groupHost: EditorHost = {...baseHost, room, fork, onLeave: leave, leaveLabel};
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

        if (!alive) {
          return;
        }
        setSetup({instanceId, room, group: groupHost, solo: soloHost, lobbies: context.lobbies, mediaUrl, template, enterLobby});
        // something launched on (media or a template) is a new edit, otherwise the running lobbies when there are any
        setPhase((context.lobbies.length && !mediaUrl && !template) ? {kind: 'lobbies'} : {kind: 'start', mode: 'public'});
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
  switch (phase.kind) {
    case 'lobbies':
      return (
        <LobbyList
          host={setup.group}
          room={setup.room}
          instanceId={setup.instanceId}
          initial={setup.lobbies}
          notice={phase.notice}
          onJoin={setup.enterLobby}
          onNew={() => setPhase({kind: 'start', mode: 'public'})}
        />
      );
    case 'start':
      return (
        <StartScreen
          key={phase.mode === 'solo' ? 'solo' : 'group'}
          host={(phase.mode === 'solo') ? setup.solo : setup.group}
          activityInstanceId={setup.instanceId}
          template={setup.template}
          suggestedUrl={setup.mediaUrl}
          onBack={{label: t('editor.session.lobbies'), run: () => setPhase({kind: 'lobbies'})}}
          mode={{value: phase.mode, onChange: (mode) => setPhase({kind: 'start', mode})}}
          // their own new lobby (its maker never needs its password)
          onOpen={async (document) => {
            if (phase.mode === 'solo') {
              setPhase({kind: 'editor', documentId: document.id, solo: true});
              return;
            }
            const { result, message } = await setup.enterLobby(document.id);
            if (result !== 'ok') {
              setPhase({kind: 'lobbies', notice: message || t('editor.session.failed')});
            }
          }}
        />
      );
    case 'editor':
      return <ActivityEditor host={(phase.solo) ? setup.solo : setup.group} documentId={phase.documentId}/>;
  }
}
