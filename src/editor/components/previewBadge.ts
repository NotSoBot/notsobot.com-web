import type { TranslationKey } from '@/i18n';

import type { PreviewState, SaveState } from '../useEditorDocument';


// What the line over the editor's preview says (./PreviewStage.tsx), from the proxy, the preview and the save. Its own
// file so it can be tested without the stage, and so PreviewStage.tsx exports only components (React Fast Refresh)


// The line over the preview: what it says, its dot (or spinner) and whether Try again is beside it. One place, so the
// words, the color and the button can't disagree (a failed save used to read "up to date" in green, a failed preview
// "Updating…" beside a red dot while the next edit saved)
export type PreviewBadgeKind = 'proxy_failed' | 'preparing' | 'updating' | 'busy' | 'failed' | 'unsaved' | 'up_to_date';

export interface PreviewBadge {
  kind: PreviewBadgeKind,
  tone: 'success' | 'danger' | 'warning' | 'busy',
  retry: boolean,
}

export const BADGE_LABELS: Record<PreviewBadgeKind, TranslationKey> = {
  proxy_failed: 'editor.preview.proxy_failed',
  preparing: 'editor.preview.preparing',
  updating: 'editor.preview.updating',
  busy: 'editor.preview.busy',
  failed: 'editor.preview.failed',
  // the preview is of the last stack that saved, not the one on screen
  unsaved: 'editor.save.error',
  up_to_date: 'editor.preview.up_to_date',
};

export function previewBadge(proxyFailed: boolean, previewState: PreviewState, saveState: SaveState): PreviewBadge {
  if (proxyFailed) {
    return {kind: 'proxy_failed', tone: 'danger', retry: previewState === 'failed'};
  }
  // a save on its way is followed by its own preview, whatever the last one came to
  const saving = saveState === 'saving';
  switch (previewState) {
    case 'preparing':
      return {kind: 'preparing', tone: 'busy', retry: false};
    case 'updating':
      return {kind: 'updating', tone: 'busy', retry: false};
    case 'busy':
      return (saving) ? {kind: 'updating', tone: 'busy', retry: false} : {kind: 'busy', tone: 'warning', retry: false};
    case 'failed':
      return (saving) ? {kind: 'updating', tone: 'busy', retry: false} : {kind: 'failed', tone: 'danger', retry: true};
    case 'idle':
      if (saving) {
        return {kind: 'updating', tone: 'busy', retry: false};
      }
      return (saveState === 'error') ? {kind: 'unsaved', tone: 'danger', retry: false} : {kind: 'up_to_date', tone: 'success', retry: false};
    default: {
      const unknown: never = previewState;
      return unknown;
    }
  }
}
