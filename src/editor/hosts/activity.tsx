import { DiscordSDK, Platform, patchUrlMappings } from '@discord/embedded-app-sdk';
import { useEffect, useMemo, useState } from 'react';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import { createEditorApi, EditorErrorCodes, pathId, type EditorApiError, type EditorHost, type EditorRequest } from '../api';
import { EditorApp } from '../components/EditorApp';
import { StartScreen } from '../components/StartScreen';
import { EditorRoom } from '../room';
import type { EditorTemplate } from '../types';
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
const PREMIUM_URL = `${SITE_URL}/premium`;
const SCOPES: Array<'identify' | 'guilds'> = ['identify', 'guilds'];


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
  | {kind: 'start', host: EditorHost, instanceId: string, template: EditorTemplate | null}
  | {kind: 'editor', host: EditorHost, documentId: string};


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

        const host: EditorHost = {
          api,
          errorOf: activityErrorOf,
          room,
          premiumUrl: PREMIUM_URL,
          templateUrl: (code) => `${SITE_URL}/editor/template/${code}`,
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

        let documentId = context.document_id;
        const mediaUrl = (typeof context.launch?.media_url === 'string') ? context.launch.media_url : null;
        // `/editor template:<link>`: its steps go on the launched media, or on whatever's picked on the start screen
        const templateCode = (typeof context.launch?.template_code === 'string') ? context.launch.template_code : null;
        step = 'document';
        if (!documentId && mediaUrl) {
          // opened from Edit Media/Edit Avatar: that media, as the instance's document (or the one someone else just made)
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
        if (documentId) {
          setPhase({kind: 'editor', host, documentId});
          return;
        }
        setPhase({kind: 'start', host, instanceId, template});
        // someone else in the activity picks the media first: everyone moves to it
        room.subscribe((event) => {
          if (alive && event.t === 'document') {
            setPhase((current) => (current.kind === 'start') ? {kind: 'editor', host, documentId: event.document.id} : current);
          }
        });
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
      return (
        <StartScreen
          host={phase.host}
          activityInstanceId={phase.instanceId}
          template={phase.template}
          onOpen={(document) => setPhase({kind: 'editor', host: phase.host, documentId: document.id})}
        />
      );
    case 'editor':
      return <ActivityEditor host={phase.host} documentId={phase.documentId}/>;
  }
}
