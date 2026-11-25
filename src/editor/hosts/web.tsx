import { useEffect, useMemo, useState } from 'react';
import { useHref, useNavigate, useParams, useSearchParams } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { apiRequest, ApiRequestError } from '@/lib/api';

import { createEditorApi, type EditorApiError, type EditorHost, type EditorRequest } from '../api';
import type { EditorTemplate } from '../types';
import { EditorApp } from '../components/EditorApp';
import { StartScreen } from '../components/StartScreen';
import { useCatalogue } from '../useCatalogue';


// notsobot.com/editor: the site's stored login token and api base (`apiRequest`), the document's id in the url
const webRequest: EditorRequest = (path, options = {}) => apiRequest(path, {
  method: options.method,
  body: options.body,
  headers: options.headers,
  query: options.query,
  timeout: options.timeout,
  signal: options.signal,
});

function webErrorOf(error: unknown): EditorApiError | null {
  if (error instanceof ApiRequestError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      body: (error.body as Record<string, unknown> | null) ?? null,
    };
  }
  return null;
}


export function WebEditorPage() {
  const { t } = useI18n();
  const { documentId, templateCode } = useParams();
  const navigate = useNavigate();
  const [ searchParams ] = useSearchParams();
  const premiumUrl = useHref(Routes.PREMIUM);

  const host = useMemo<EditorHost>(() => ({
    api: createEditorApi(webRequest),
    errorOf: webErrorOf,
    onLeave: () => navigate(Routes.EDITOR),
    premiumUrl,
    // without the language prefix, whoever opens it gets the site in their own
    templateUrl: (code) => `${window.location.origin}${Routes.EDITOR_TEMPLATE.replace(':templateCode', code)}`,
    // the device's share sheet (phones, mostly), there's no Discord chat to post in from the site
    shareTemplate: (typeof navigator !== 'undefined' && typeof navigator.share === 'function') ? async (template) => {
      const url = `${window.location.origin}${Routes.EDITOR_TEMPLATE.replace(':templateCode', template.code)}`;
      try {
        await navigator.share({title: template.name, text: `${template.name}, a NotSoBot editor template`, url});
      } catch (error) {
        // closing the share sheet isn't a failure
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          throw error;
        }
      }
    } : undefined,
  }), [navigate, premiumUrl]);
  const { catalogue, error, retry } = useCatalogue(host);
  const template = useTemplate(host, templateCode);
  const effectNames = useMemo(() => new Map((catalogue?.effects ?? []).map((effect) => [effect.id, effect.name])), [catalogue]);

  if (!documentId) {
    if (templateCode && template.status === 'loading') {
      return <FullPageMessage><Spinner/></FullPageMessage>;
    }
    if (templateCode && template.status === 'missing') {
      return (
        <FullPageMessage title={t('editor.template.not_found')}>
          <button type='button' className='btn btn-secondary' onClick={() => navigate(Routes.EDITOR)}>{t('editor.back')}</button>
        </FullPageMessage>
      );
    }
    return (
      <StartScreen
        host={host}
        initialUrl={searchParams.get('url')}
        template={(template.status === 'ready') ? template.template : null}
        effectNames={effectNames}
        // the link is used up once it's opened, a reload of the document shouldn't upload it again
        onOpen={(document) => navigate(Routes.EDITOR_DOCUMENT.replace(':documentId', document.id))}
      />
    );
  }

  if (error) {
    return (
      <FullPageMessage title={t('editor.catalogue_error')}>
        <button type='button' className='btn btn-secondary' onClick={retry}>{t('common.retry')}</button>
      </FullPageMessage>
    );
  }
  if (!catalogue) {
    return (
      <FullPageMessage>
        <Spinner/>
      </FullPageMessage>
    );
  }
  return <EditorApp key={documentId} host={host} documentId={documentId} catalogue={catalogue}/>;
}


type TemplateState =
  | {status: 'none' | 'loading' | 'missing'}
  | {status: 'ready', template: EditorTemplate};

// `/editor/template/<code>`'s template, `missing` when it was deleted (or the code isn't one)
function useTemplate(host: EditorHost, templateCode: string | undefined): TemplateState {
  const [ state, setState ] = useState<TemplateState>({status: (templateCode) ? 'loading' : 'none'});
  useEffect(() => {
    if (!templateCode) {
      setState({status: 'none'});
      return;
    }
    let alive = true;
    setState({status: 'loading'});
    host.api.template(templateCode).then((template) => {
      if (alive) {
        setState({status: 'ready', template});
      }
    }).catch(() => {
      if (alive) {
        setState({status: 'missing'});
      }
    });
    return () => {
      alive = false;
    };
  }, [host, templateCode]);
  return state;
}
