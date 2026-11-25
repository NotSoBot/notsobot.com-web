import { DiscordSDK, Platform, patchUrlMappings } from '@discord/embedded-app-sdk';
import { User, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import { createEditorApi, EditorErrorCodes, pathId, type EditorApiError, type EditorHost, type EditorRequest } from '../api';
import { EditorApp } from '../components/EditorApp';
import { StartScreen } from '../components/StartScreen';
import { EditorRoom, ROOM_MAX_EDITORS, type RoomMember } from '../room';
import type { EditorDocument, EditorTemplate } from '../types';
import { useCatalogue } from '../useCatalogue';


// The media editor as a Discord Activity (activity.html). Discord loads it through its proxy with the url mapping
// `/` → `<site>/activity`, so the page can only reach the outside through other mappings: `/api` → notsobot.api and
// `/cdn` → cdn.nsb.gg (both set in the developer portal). Flow:
// sdk ready → authorize (a code) → `POST /auth/activity` (our user token, kept in memory: storage inside Discord's
// iframe can't be relied on) → sdk authenticate → the instance's launch context and document → its room


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
type Step = 'sdk' | 'ready' | 'authorize' | 'login' | 'authenticate' | 'context' | 'document';

type Phase =
  | {kind: 'loading'}
  | {
    kind: 'failed',
    message: 'editor.activity.not_in_discord' | 'editor.activity.failed' | 'editor.activity.not_ready' | 'editor.activity.denied',
    // what went wrong, shown small under the message (only owners can get this far while it rolls out)
    detail?: string,
  }
  // the start screen: `together` makes the instance's document (everyone's), `solo` one of their own
  | {kind: 'start', instanceId: string, template: EditorTemplate | null, mode: 'together' | 'solo'}
  // a group edit is running: join it, or start their own (with the media they launched on, if any)
  | {kind: 'choose', groupDocumentId: string, mediaUrl: string | null, templateCode: string | null, full?: boolean}
  | {kind: 'editor', documentId: string, solo: boolean};


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
  // the group's host (the room) and a solo document's (no room: its edits must never reach the group's), set at startup
  const [ hosts, setHosts ] = useState<{
    group: EditorHost,
    solo: EditorHost,
    startSolo: (mediaUrl: string | null, templateCode: string | null) => Promise<void>,
    // into the group's document, if there's room in it (`ROOM_MAX_EDITORS`): the choose screen, full, when there isn't
    enterGroup: (documentId: string) => Promise<void>,
  } | null>(null);
  const tokenRef = useMemo(() => ({current: null as string | null}), []);
  const api = useMemo(() => createEditorApi(createActivityRequest(() => tokenRef.current)), [tokenRef]);

  useEffect(() => {
    let alive = true;
    let room: EditorRoom | null = null;
    let groupHost: EditorHost;
    let soloHost: EditorHost;
    let startSolo: (mediaUrl: string | null, templateCode: string | null) => Promise<void>;
    let enterGroup: (documentId: string) => Promise<void>;
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
                ? t('editor.template.share_message_locked', {name: template.name})
                : t('editor.template.share_message', {name: template.name}),
              custom_id: `${TEMPLATE_CUSTOM_ID}${template.code}`,
            });
          },
          fullscreen: true,
          // the user posts it themselves through Discord's own dialog, the bot never posts in their channel. the dialog
          // only takes Discord cdn urls, so the render goes onto Discord's cdn first (the api uploads it with their token).
          // Discord only has the dialog on desktop and web, phones get Download and Copy link without it
          share: (sdk.platform === Platform.MOBILE) ? undefined : async (url) => {
            const uploaded = await api.shareAttachment(url, auth.access_token);
            await sdk.commands.openShareMomentDialog({mediaUrl: uploaded.url});
          },
          openExternal: (url) => {
            void sdk.commands.openExternalLink({url});
          },
        };
        // a document of their own: its source and saved steps again, without the instance
        const copyToSolo = async (document: EditorDocument) => {
          const copy = await api.createDocument({url: document.source.urls.cdn});
          const saved = (document.steps.length) ? await api.saveSteps(copy.id, document.steps, copy.version) : copy;
          // their spot in the group edit is someone else's to take now
          void room?.setEditing(false);
          setPhase({kind: 'editor', documentId: saved.id, solo: true});
        };
        // the group's: the running one, or theirs becomes it when there's none (the room moves everyone waiting to it)
        const toGroup = async (document: EditorDocument) => {
          const latest = await api.activity(instanceId);
          if (latest.document_id) {
            await enterGroup(latest.document_id);
            return;
          }
          const group = await api.createDocument({url: document.source.urls.cdn, activityInstanceId: instanceId});
          // someone else's may have won the race, theirs is the group's then and the steps stay with them
          const saved = (group.id !== document.id && !group.steps.length && document.steps.length)
            ? await api.saveSteps(group.id, document.steps, group.version)
            : group;
          await enterGroup(saved.id);
        };
        enterGroup = async (documentId: string) => {
          if (await room!.setEditing(true) === 'full') {
            setPhase({kind: 'choose', groupDocumentId: documentId, mediaUrl: null, templateCode: null, full: true});
            return;
          }
          setPhase({kind: 'editor', documentId, solo: false});
        };
        groupHost = {...baseHost, room, switchSession: {kind: 'copy', run: copyToSolo}};
        soloHost = {...baseHost, switchSession: {kind: 'group', run: toGroup}};
        startSolo = async (mediaUrl: string | null, templateCode: string | null) => {
          if (!mediaUrl) {
            setPhase({kind: 'start', instanceId, template: (templateCode) ? await api.template(templateCode).catch(() => null) : null, mode: 'solo'});
            return;
          }
          const document = await api.createDocument({url: mediaUrl, templateCode: templateCode ?? undefined})
            .catch(() => api.createDocument({url: mediaUrl}));
          setPhase({kind: 'editor', documentId: document.id, solo: true});
        };

        const groupDocumentId = context.document_id;
        let documentId: string | null = null;
        const mediaUrl = (typeof context.launch?.media_url === 'string') ? context.launch.media_url : null;
        // `/editor template:<link>`: its steps go on the launched media, or on whatever's picked on the start screen
        // `/editor template:` (the bot's launch), or a template link someone shared in chat (`shareLink`'s custom id)
        const sharedCode = (sdk.customId?.startsWith(TEMPLATE_CUSTOM_ID)) ? sdk.customId.slice(TEMPLATE_CUSTOM_ID.length) : null;
        const templateCode = (typeof context.launch?.template_code === 'string') ? context.launch.template_code
          : (sharedCode && /^[A-Za-z]{1,12}$/.test(sharedCode)) ? sharedCode : null;
        step = 'document';
        // someone else in the activity makes the group's document: everyone waiting to edit together moves to it
        room.subscribe((event) => {
          if (!alive) {
            return;
          }
          // the start screen in together mode follows the group's document when someone makes it
          const current = phaseRef.current;
          if (event.t === 'document' && current.kind === 'start' && current.mode === 'together') {
            void enterGroup(event.document.id);
          }
          // lost their spot (a reconnect found it full meanwhile): back to the choice, their work's in the group's
          if (event.t === 'editing' && event.full) {
            setPhase((current) => (current.kind === 'editor' && !current.solo)
              ? {kind: 'choose', groupDocumentId: current.documentId, mediaUrl: null, templateCode: null, full: true}
              : current);
          }
        });

        if (groupDocumentId) {
          // a group edit's running: join it or start their own (with what they launched on), their pick
          if (alive) {
            setHosts({group: groupHost, solo: soloHost, startSolo, enterGroup});
            setPhase({kind: 'choose', groupDocumentId, mediaUrl, templateCode});
          }
          return;
        }
        if (mediaUrl) {
          // opened from Edit Media/Edit Avatar with nothing running: that media, as the group's document (or the one
          // someone else just made)
          const create = (withTemplate: boolean) => api.createDocument({
            url: mediaUrl,
            activityInstanceId: instanceId,
            templateCode: (withTemplate && templateCode) ? templateCode : undefined,
          });
          // the launch keeps the template id unchecked, one deleted since just opens the media without it
          documentId = (await create(true).catch((error) => {
            if (templateCode && activityErrorOf(error)?.code === EditorErrorCodes.UNKNOWN_EDITOR_TEMPLATE) {
              return create(false);
            }
            throw error;
          })).id;
        }
        // a template that's gone just leaves the start screen without one
        const template = (!documentId && templateCode) ? await api.template(templateCode).catch(() => null) : null;
        if (!alive) {
          return;
        }
        setHosts({group: groupHost, solo: soloHost, startSolo, enterGroup});
        if (documentId) {
          await enterGroup(documentId);
          return;
        }
        setPhase({kind: 'start', instanceId, template, mode: 'together'});
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

  switch (phase.kind) {
    case 'loading':
      return <FullPageMessage title={t('editor.activity.loading')}><Spinner/></FullPageMessage>;
    case 'failed':
      return (
        <FullPageMessage title={t(phase.message)}>
          {(phase.detail) ? <p className='max-w-xl font-mono text-xs break-words text-subtle'>{phase.detail}</p> : null}
        </FullPageMessage>
      );
    case 'start':
      if (!hosts) {
        return <FullPageMessage><Spinner/></FullPageMessage>;
      }
      return (
        <StartScreen
          host={(phase.mode === 'solo') ? hosts.solo : hosts.group}
          activityInstanceId={phase.instanceId}
          template={phase.template}
          mode={{value: phase.mode, onChange: (mode) => setPhase({...phase, mode})}}
          onOpen={(document) => (phase.mode === 'solo')
            ? setPhase({kind: 'editor', documentId: document.id, solo: true})
            : void hosts.enterGroup(document.id)}
        />
      );
    case 'choose':
      if (!hosts) {
        return <FullPageMessage><Spinner/></FullPageMessage>;
      }
      return (
        <ChooseSession
          room={hosts.group.room ?? null}
          full={Boolean(phase.full)}
          onJoin={() => hosts.enterGroup(phase.groupDocumentId)}
          onSolo={() => hosts.startSolo(phase.mediaUrl, phase.templateCode)}
        />
      );
    case 'editor':
      if (!hosts) {
        return <FullPageMessage><Spinner/></FullPageMessage>;
      }
      return <ActivityEditor host={(phase.solo) ? hosts.solo : hosts.group} documentId={phase.documentId}/>;
  }
}


// Someone's already editing together: join them, or start a document of their own (nobody else sees it). Who's in the
// activity comes from the room
function ChooseSession({ room, full, onJoin, onSolo }: {
  room: EditorRoom | null,
  // the last try to join found it full
  full: boolean,
  onJoin: () => Promise<void>,
  onSolo: () => Promise<void>,
}) {
  const { t } = useI18n();
  const [ members, setMembers ] = useState<Array<RoomMember>>(() => room?.members ?? []);
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }
    setMembers(room.members);
    return room.subscribe((event) => {
      if (event.t === 'members' || event.t === 'ready') {
        setMembers(event.members);
      }
    });
  }, [room]);

  const editors = members.filter((member) => member.editing);
  // full by the room's count too, someone leaving opens it again without another try
  const isFull = editors.length >= ROOM_MAX_EDITORS || (full && !members.length);
  const shown = (editors.length) ? editors : members;
  const names = shown.slice(0, 3).map((member) => member.username).join(', ');
  return (
    <FullPageMessage title={t('editor.session.running')}>
      <div className='flex w-full max-w-sm flex-col items-center gap-4'>
        {(members.length) ? (
          <div className='flex flex-col items-center gap-2'>
            <div className='flex -space-x-2'>
              {shown.slice(0, 5).map((member) => (
                (member.avatar_url) ? (
                  <img key={member.user_id} src={member.avatar_url} alt='' className='size-9 rounded-full border-2 border-bg'/>
                ) : (
                  <span key={member.user_id} className='flex size-9 items-center justify-center rounded-full border-2 border-bg bg-surface-3 text-xs font-bold text-fg'>
                    {member.username.slice(0, 1).toUpperCase()}
                  </span>
                )
              ))}
            </div>
            <p className='text-sm text-muted'>
              {(shown.length > 3) ? t('editor.session.people_more', {names, count: shown.length - 3}) : names}
            </p>
            <p className={(isFull) ? 'text-sm font-semibold text-warning' : 'text-xs text-subtle'}>
              {(isFull) ? t('editor.session.full', {limit: ROOM_MAX_EDITORS}) : t('editor.session.editing_count', {count: editors.length, limit: ROOM_MAX_EDITORS})}
            </p>
          </div>
        ) : null}
        <button
          type='button'
          className='btn btn-primary w-full'
          disabled={pending || isFull}
          onClick={async () => {
            setPending(true);
            await onJoin();
            setPending(false);
          }}
        >
          <Users aria-hidden className='size-4'/>{t('editor.session.join')}
        </button>
        <button
          type='button'
          className='btn btn-secondary w-full'
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              await onSolo();
            } catch {
              setError(t('editor.session.failed'));
              setPending(false);
            }
          }}
        >
          {(pending) ? <Spinner className='size-4'/> : <User aria-hidden className='size-4'/>}{t('editor.session.own')}
        </button>
        <p className='text-center text-xs text-subtle'>{t('editor.session.own_hint')}</p>
        {(error) ? <p role='alert' className='text-sm text-danger-text'>{error}</p> : null}
      </div>
    </FullPageMessage>
  );
}
