import { LayoutTemplate } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useHref, useLocation, useNavigate, useParams } from 'react-router';

import { useAuth } from '@/auth';
import { PageHero } from '@/components/ui/PageHero';
import { Routes } from '@/config';
import { createEditorApi, type EditorApiError, type EditorHost, type EditorRequest } from '@/editor/api';
import { HubBrowser } from '@/editor/hub/HubBrowser';
import { useI18n } from '@/i18n';
import { apiRequest, ApiRequestError } from '@/lib/api';


// the site's api requests, with the login token when there is one (the hub answers logged out too)
const request: EditorRequest = (path, options = {}) => apiRequest(path, {
  method: options.method,
  body: options.body,
  headers: options.headers,
  query: options.query,
  timeout: options.timeout,
  signal: options.signal,
});

function errorOf(error: unknown): EditorApiError | null {
  if (error instanceof ApiRequestError) {
    return {status: error.status, code: error.code, message: error.message, body: (error.body as Record<string, unknown> | null) ?? null};
  }
  return null;
}


function hubItemPath(code: string): string {
  return Routes.EDITOR_HUB_ITEM.replace(':templateCode', code);
}


// notsobot.com/editor/hub: published editor templates, public and localized. A template's view is
// `/editor/hub/<code>`, a child route, so the list (its search, filters and loaded pages) stays mounted under it.
// Try goes to the template's link (`/editor/template/<code>`, the editor's start screen with it), which needs a login
export function HubPage() {
  const { t } = useI18n();
  const { templateCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login } = useAuth();
  const premiumUrl = useHref(Routes.PREMIUM);
  const openedHere = (location.state as {fromHub?: boolean} | null)?.fromHub === true;

  const host = useMemo<EditorHost>(() => ({
    api: createEditorApi(request),
    errorOf,
    premiumUrl,
    templateUrl: (code) => `${window.location.origin}${Routes.EDITOR_TEMPLATE.replace(':templateCode', code)}`,
  }), [premiumUrl]);

  const onOpenCode = useCallback((code: string | null) => {
    if (code) {
      // stepping from one to another replaces, so Back still closes it in one go
      navigate(hubItemPath(code), {preventScrollReset: true, replace: Boolean(templateCode), state: {fromHub: openedHere || !templateCode}});
    } else if (openedHere) {
      navigate(-1);
    } else {
      // arrived on a shared `/editor/hub/<code>` link, there's no list entry to go back to
      navigate(Routes.EDITOR_HUB, {replace: true, preventScrollReset: true});
    }
  }, [navigate, templateCode, openedHere]);

  return (
    <>
      <PageHero
        badge={<><LayoutTemplate aria-hidden className='size-4'/>{t('hub.badge')}</>}
        title={t('hub.title')}
        description={t('hub.description')}
      />
      <div className='container-page py-8 sm:py-10'>
        {/* the cards' titles are h3s, like in the editor's hub dialog under its h2 */}
        <h2 className='sr-only'>{t('hub.badge')}</h2>
        <HubBrowser
          host={host}
          loggedIn={status === 'authenticated'}
          openCode={templateCode ?? null}
          onOpenCode={onOpenCode}
          onTry={(template) => navigate(Routes.EDITOR_TEMPLATE.replace(':templateCode', template.code))}
          onLogin={(template, intent) => login((intent === 'try') ? Routes.EDITOR_TEMPLATE.replace(':templateCode', template.code) : hubItemPath(template.code))}
        />
      </div>
    </>
  );
}
