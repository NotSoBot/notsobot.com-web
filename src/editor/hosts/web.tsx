import { useMemo } from 'react';
import { useHref, useNavigate, useParams, useSearchParams } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { apiRequest, ApiRequestError } from '@/lib/api';

import { createEditorApi, type EditorApiError, type EditorHost, type EditorRequest } from '../api';
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
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [ searchParams ] = useSearchParams();
  const premiumUrl = useHref(Routes.PREMIUM);

  const host = useMemo<EditorHost>(() => ({
    api: createEditorApi(webRequest),
    errorOf: webErrorOf,
    onLeave: () => navigate(Routes.EDITOR),
    premiumUrl,
  }), [navigate, premiumUrl]);
  const { catalogue, error, retry } = useCatalogue(host);

  if (!documentId) {
    return (
      <StartScreen
        host={host}
        initialUrl={searchParams.get('url')}
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
