import { useEffect, useMemo, useState } from 'react';
import { useHref, useNavigate, useParams, useSearchParams } from 'react-router';

import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';

import { createEditorApi, EditorErrorCodes, pathId, type EditorHost } from '../api';
import { webErrorOf, webRequest } from '../webRequest';
import type { EditorTemplate } from '../types';
import { EditorApp } from '../components/EditorApp';
import { StartScreen } from '../components/StartScreen';
import { useCatalogue } from '../useCatalogue';


// notsobot.com/editor: the site's stored login token and api base (../webRequest), the document's id in the url


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
    // the template hub's page, or one template's view on it
    openHub: (code) => navigate((code) ? Routes.EDITOR_HUB_ITEM.replace(':templateCode', code) : Routes.EDITOR_HUB),
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
      return 'dialog';
    } : undefined,
  }), [navigate, premiumUrl]);
  // `?url=`: only a web link, and only offered (the start screen asks before anything is fetched)
  const linkedUrl = useMemo(() => {
    const value = searchParams.get('url');
    if (!value) {
      return null;
    }
    try {
      const parsed = new URL(value);
      return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? value : null;
    } catch {
      return null;
    }
  }, [searchParams]);
  const { catalogue, error, retry } = useCatalogue(host);
  const { template, retry: retryTemplate } = useTemplate(host, templateCode);
  const effectNames = useMemo(() => new Map((catalogue?.effects ?? []).map((effect) => [effect.id, effect.name])), [catalogue]);

  if (!documentId) {
    if (template.status === 'loading') {
      return <div data-state='loading' className='contents'><FullPageMessage><Spinner/></FullPageMessage></div>;
    }
    if (template.status === 'missing') {
      return (
        <div data-state='missing' className='contents'>
          <FullPageMessage title={t('editor.template.not_found')}>
            <button type='button' className='btn btn-secondary' onClick={() => navigate(Routes.EDITOR)}>{t('editor.back')}</button>
          </FullPageMessage>
        </div>
      );
    }
    // it didn't load (the network, the api down): not "doesn't exist anymore", and it can be asked for again
    if (template.status === 'failed') {
      return (
        <div data-state='failed' className='contents'>
          <FullPageMessage title={t('editor.session.failed')}>
            <div className='flex flex-wrap items-center justify-center gap-2'>
              <button type='button' className='btn btn-secondary' onClick={() => navigate(Routes.EDITOR)}>{t('editor.back')}</button>
              <button type='button' className='btn btn-primary' onClick={retryTemplate}>{t('common.retry')}</button>
            </div>
          </FullPageMessage>
        </div>
      );
    }
    return (
      <StartScreen
        host={host}
        suggestedUrl={linkedUrl}
        launchSurface='link'
        tryEffectId={searchParams.get('effect')}
        tryGeneratorId={searchParams.get('generator')}
        template={(template.status === 'ready') ? template.template : null}
        effectNames={effectNames}
        // the link is used up once it's opened, a reload of the document shouldn't upload it again
        // Try it's effect goes on once the document's open (`?add=`, dropped after)
        // a template's questions are asked once it's open (`?fill=1`, dropped after)
        onOpen={(document) => {
          const query = new URLSearchParams();
          if (searchParams.get('effect')) {
            query.set('add', searchParams.get('effect')!);
          }
          if (template.status === 'ready' && 'steps' in document && document.steps.some((step) => step.inputs)) {
            query.set('fill', '1');
          }
          navigate(Routes.EDITOR_DOCUMENT.replace(':documentId', document.id) + ((query.size) ? `?${query}` : ''));
        }}
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
  return (
    <EditorApp
      key={documentId}
      host={host}
      documentId={documentId}
      catalogue={catalogue}
      addEffectId={searchParams.get('add')}
      askInputs={searchParams.get('fill') === '1'}
      // `?add=` and `?fill=1` are used up together, a reload neither adds the effect nor asks again
      onLaunchUsed={() => navigate(Routes.EDITOR_DOCUMENT.replace(':documentId', documentId), {replace: true})}
    />
  );
}


// `code`: the template it's about. The state is set from an effect, so for one render after the url's code changes it
// is still the last one's: read against the code, that render is `loading` and never the other template
type TemplateState =
  | {status: 'none'}
  | {status: 'loading' | 'missing' | 'failed', code: string}
  | {status: 'ready', code: string, template: EditorTemplate};

// `/editor/template/<code>`'s template: `missing` when it was deleted (or the code isn't one), `failed` when it couldn't
// be asked for (`retry` asks again)
function useTemplate(host: EditorHost, templateCode: string | undefined): {template: TemplateState, retry: () => void} {
  const [ state, setState ] = useState<TemplateState>({status: 'none'});
  const [ attempt, setAttempt ] = useState(0);
  useEffect(() => {
    if (!templateCode) {
      setState({status: 'none'});
      return;
    }
    // a code that can't be one (the request would throw before it's sent): missing like any other
    try {
      pathId(templateCode);
    } catch {
      setState({status: 'missing', code: templateCode});
      return;
    }
    let alive = true;
    setState({status: 'loading', code: templateCode});
    host.api.template(templateCode).then((template) => {
      if (alive) {
        setState({status: 'ready', code: templateCode, template});
      }
    }).catch((failure) => {
      if (alive) {
        const apiError = host.errorOf(failure);
        const missing = apiError?.status === 404 || apiError?.code === EditorErrorCodes.UNKNOWN_EDITOR_TEMPLATE;
        setState({status: (missing) ? 'missing' : 'failed', code: templateCode});
      }
    });
    return () => {
      alive = false;
    };
  }, [host, templateCode, attempt]);
  const template: TemplateState = (!templateCode) ? {status: 'none'}
    : (state.status !== 'none' && state.code === templateCode) ? state
    : {status: 'loading', code: templateCode};
  return {template, retry: () => setAttempt((value) => value + 1)};
}
