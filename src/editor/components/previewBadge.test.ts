import { describe, expect, it } from 'vitest';

import type { PreviewState, SaveState } from '../useEditorDocument';
import { BADGE_LABELS, previewBadge, type PreviewBadge, type PreviewBadgeKind } from './previewBadge';


const PREVIEW_STATES: ReadonlyArray<PreviewState> = ['idle', 'updating', 'preparing', 'busy', 'failed'];
const SAVE_STATES: ReadonlyArray<SaveState> = ['saved', 'saving', 'error'];

const badge = (kind: PreviewBadgeKind, tone: PreviewBadge['tone'], retry = false): PreviewBadge => ({kind, tone, retry});

// every combination the types allow, with what the line over the preview says for it
const TABLE: Array<[boolean, PreviewState, SaveState, PreviewBadge]> = [
  // the proxy failed: that's all it says, Try again only beside a failed preview
  [true, 'idle', 'saved', badge('proxy_failed', 'danger')],
  [true, 'idle', 'saving', badge('proxy_failed', 'danger')],
  [true, 'idle', 'error', badge('proxy_failed', 'danger')],
  [true, 'updating', 'saved', badge('proxy_failed', 'danger')],
  [true, 'updating', 'saving', badge('proxy_failed', 'danger')],
  [true, 'updating', 'error', badge('proxy_failed', 'danger')],
  [true, 'preparing', 'saved', badge('proxy_failed', 'danger')],
  [true, 'preparing', 'saving', badge('proxy_failed', 'danger')],
  [true, 'preparing', 'error', badge('proxy_failed', 'danger')],
  [true, 'busy', 'saved', badge('proxy_failed', 'danger')],
  [true, 'busy', 'saving', badge('proxy_failed', 'danger')],
  [true, 'busy', 'error', badge('proxy_failed', 'danger')],
  [true, 'failed', 'saved', badge('proxy_failed', 'danger', true)],
  [true, 'failed', 'saving', badge('proxy_failed', 'danger', true)],
  [true, 'failed', 'error', badge('proxy_failed', 'danger', true)],
  // idle: up to date only when the last save went through
  [false, 'idle', 'saved', badge('up_to_date', 'success')],
  [false, 'idle', 'saving', badge('updating', 'busy')],
  [false, 'idle', 'error', badge('unsaved', 'danger')],
  // a preview on its way says so whatever the save is doing
  [false, 'updating', 'saved', badge('updating', 'busy')],
  [false, 'updating', 'saving', badge('updating', 'busy')],
  [false, 'updating', 'error', badge('updating', 'busy')],
  [false, 'preparing', 'saved', badge('preparing', 'busy')],
  [false, 'preparing', 'saving', badge('preparing', 'busy')],
  [false, 'preparing', 'error', badge('preparing', 'busy')],
  // busy and failed give way to a save on its way (its own preview follows)
  [false, 'busy', 'saved', badge('busy', 'warning')],
  [false, 'busy', 'saving', badge('updating', 'busy')],
  [false, 'busy', 'error', badge('busy', 'warning')],
  [false, 'failed', 'saved', badge('failed', 'danger', true)],
  [false, 'failed', 'saving', badge('updating', 'busy')],
  [false, 'failed', 'error', badge('failed', 'danger', true)],
];

// the full product, for the invariants
const PRODUCT: Array<[boolean, PreviewState, SaveState]> = [];
for (const proxyFailed of [false, true]) {
  for (const previewState of PREVIEW_STATES) {
    for (const saveState of SAVE_STATES) {
      PRODUCT.push([proxyFailed, previewState, saveState]);
    }
  }
}


describe('previewBadge', () => {
  it('the table has every combination once', () => {
    const keys = TABLE.map(([ proxyFailed, previewState, saveState ]) => `${proxyFailed}:${previewState}:${saveState}`);
    expect(new Set(keys).size).toBe(PRODUCT.length);
    expect(keys.length).toBe(PRODUCT.length);
  });

  it.each(TABLE)('proxy failed=%s, preview %s, save %s shows %j', (proxyFailed, previewState, saveState, expected) => {
    expect(previewBadge(proxyFailed, previewState, saveState)).toEqual(expected);
  });

  describe('invariants over every combination', () => {
    it.each(PRODUCT)('proxy failed=%s, preview %s, save %s: a failed save is never the green "up to date"', (proxyFailed, previewState, saveState) => {
      const result = previewBadge(proxyFailed, previewState, saveState);
      if (saveState === 'error') {
        expect(result.kind).not.toBe('up_to_date');
        expect(result.tone).not.toBe('success');
      }
    });

    it.each(PRODUCT)('proxy failed=%s, preview %s, save %s: Try again only beside a failed preview no save is about to replace', (proxyFailed, previewState, saveState) => {
      // a save on its way brings its own preview, except when the proxy failed: then no preview comes from it
      const shouldRetry = previewState === 'failed' && (proxyFailed || saveState !== 'saving');
      expect(previewBadge(proxyFailed, previewState, saveState).retry).toBe(shouldRetry);
    });

    it.each(PRODUCT)('proxy failed=%s, preview %s, save %s: green only when the preview is idle and the save went through', (proxyFailed, previewState, saveState) => {
      const green = previewBadge(proxyFailed, previewState, saveState).tone === 'success';
      expect(green).toBe(!proxyFailed && previewState === 'idle' && saveState === 'saved');
    });

    it.each(PRODUCT)('proxy failed=%s, preview %s, save %s: a spinner only for something on its way', (proxyFailed, previewState, saveState) => {
      const result = previewBadge(proxyFailed, previewState, saveState);
      expect(result.tone === 'busy').toBe(result.kind === 'updating' || result.kind === 'preparing');
    });

    it.each(PRODUCT)('proxy failed=%s, preview %s, save %s: a failed proxy always says so', (proxyFailed, previewState, saveState) => {
      expect(previewBadge(proxyFailed, previewState, saveState).kind === 'proxy_failed').toBe(proxyFailed);
    });
  });
});


describe('BADGE_LABELS', () => {
  it.each<[PreviewBadgeKind, string]>([
    ['proxy_failed', 'editor.preview.proxy_failed'],
    ['preparing', 'editor.preview.preparing'],
    ['updating', 'editor.preview.updating'],
    ['busy', 'editor.preview.busy'],
    ['failed', 'editor.preview.failed'],
    ['unsaved', 'editor.save.error'],
    ['up_to_date', 'editor.preview.up_to_date'],
  ])('a %s badge reads %s', (kind, key) => {
    expect(BADGE_LABELS[kind]).toBe(key);
  });
});
