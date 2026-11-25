// The media editor's routes for the dev mocks (`VITE_DASHBOARD_MOCKS=true`). The catalogue is the real one (exported
// from notsobot.api's `catalogue_payload()`), tiles use the commands page mock previews where there's one. Nothing is
// rendered: a preview answers `pending` once, then the unedited proxy, and a render finishes after a few polls with the
// proxy as its file. A version mismatch answers 409 like the api.

import type { EditorCatalogue, EditorDocument, EditorJob, EditorStep } from '@/editor/types';

import { MOCK_COMMAND_PREVIEWS } from './commandPreviews';
import catalogueJson from './editorCatalogue.json';


type Route = (method: string, pattern: string, handler: (match: RegExpMatchArray, request: {method: string, query: URLSearchParams, body: Record<string, unknown>}) => unknown) => void;
type MakeError = (status: number, code: number, message: string, metadata?: Record<string, unknown>) => Error;

const SAMPLE = new URL('./command-media/b1.png', import.meta.url).href;
const DAY = 24 * 60 * 60 * 1000;


function catalogue(): EditorCatalogue {
  const data = structuredClone(catalogueJson) as unknown as EditorCatalogue;
  for (const effect of data.effects) {
    const after = (effect.command_id) ? MOCK_COMMAND_PREVIEWS[effect.command_id]?.media.find((item) => item.type === 0) : undefined;
    effect.thumbnail = (after) ? {url: after.url, mimetype: after.mimetype, width: after.width, height: after.height, duration: after.duration} : null;
  }
  return data;
}


function makeDocument(id: string, url: string, filename: string, mimetype: string, width: number, height: number): EditorDocument {
  const kind = (mimetype.startsWith('audio/')) ? 'audio' : (mimetype.startsWith('video/') || mimetype === 'image/gif') ? 'video' : 'image';
  const media = {url, width, height, framecount: 1, fps: 0, duration: 0, mimetype};
  return {
    id,
    user_id: '1',
    steps: [],
    version: 1,
    catalogue_version: 1,
    proxy: media,
    proxy_status: 'ready',
    source: {id: `${id}0`, filename, urls: {cdn: url, vanity: url}},
    source_meta: {kind, width, height, framecount: 1, fps: 0, duration: 0, mimetype},
    activity_instance_id: null,
    guild_id: null,
    is_owner: true,
    can_edit: true,
    created: Date.now(),
    updated: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * DAY).toISOString(),
  };
}


export function registerEditorMocks(route: Route, error: MakeError): void {
  const documents = new Map<string, EditorDocument>();
  const previews = new Map<string, {documentId: string, polled: boolean}>();
  const jobs = new Map<string, {url: string, filename: string, polls: number}>();
  let nextId = 2_000_000_000_000_000;

  documents.set('1900000000000000001', {
    ...makeDocument('1900000000000000001', SAMPLE, 'b1', 'image/png', 512, 512),
    steps: [{id: 'sample1', effect: 'deepfry', hidden: false, params: {scale: 25, keep_transparency: true}}],
  });

  const find = (documentId: string): EditorDocument => {
    const document = documents.get(documentId);
    if (!document) {
      throw error(404, 10043, 'Unknown Editor Document');
    }
    return document;
  };

  route('GET', '/editor/effects', () => catalogue());

  route('GET', '/editor/documents', () => ({
    documents: [...documents.values()].sort((a, b) => b.updated.localeCompare(a.updated)),
  }));

  route('POST', '/editor/documents', (_, { body }) => {
    const file = body.file as File | undefined;
    const link = body.url as string | undefined;
    if (!file && !link) {
      throw error(400, 50014, 'A file or url is required');
    }
    nextId += 1;
    const id = String(nextId);
    const url = (file) ? URL.createObjectURL(file) : link!;
    const mimetype = file?.type || 'image/png';
    const filename = (file?.name ?? link!.split('/').pop() ?? 'media').replace(/\.[^.]+$/, '');
    const document = makeDocument(id, url, filename, mimetype, 512, 512);
    documents.set(id, document);
    // the real size once the browser has it, the api probes it on upload
    if (mimetype.startsWith('image/')) {
      const image = new Image();
      image.onload = () => {
        for (const media of [document.proxy!, document.source_meta]) {
          media.width = image.naturalWidth;
          media.height = image.naturalHeight;
        }
      };
      image.src = url;
    }
    return document;
  });

  route('GET', '/editor/documents/(\\d+)', (match) => find(match[1]));

  route('PATCH', '/editor/documents/(\\d+)', (match, { body }) => {
    const document = find(match[1]);
    if (body.version !== document.version) {
      throw error(409, 50053, 'This document was changed since you loaded it', {version: document.version});
    }
    const steps = body.steps as Array<EditorStep>;
    const textless = steps.findIndex((step) => step.effect === 'text' && !String(step.params.text ?? '').trim());
    if (textless !== -1) {
      throw error(400, 50054, 'Text needs some text', {index: textless, param: 'text', message: 'Text needs some text'});
    }
    document.steps = steps;
    document.version += 1;
    document.updated = new Date().toISOString();
    return document;
  });

  route('DELETE', '/editor/documents/(\\d+)', (match) => {
    find(match[1]);
    documents.delete(match[1]);
    return undefined;
  });

  route('POST', '/editor/documents/(\\d+)/previews', (match, { body }) => {
    find(match[1]);
    const previewId = Math.random().toString(36).slice(2, 12);
    previews.set(previewId, {documentId: match[1], polled: false});
    return {status: 'pending', preview_id: previewId, mode: body.mode, frame: null, stopped_at: null};
  });

  route('GET', '/editor/documents/(\\d+)/previews/([\\w-]+)', (match) => {
    const document = find(match[1]);
    const preview = previews.get(match[2]);
    if (!preview || preview.documentId !== match[1]) {
      return {status: 'expired', preview_id: match[2]};
    }
    if (!preview.polled) {
      preview.polled = true;
      return {status: 'pending', preview_id: match[2]};
    }
    return {status: 'done', cached: false, preview_id: match[2], mode: 'still', frame: null, stopped_at: null, version: document.version, ...document.proxy};
  });

  route('POST', '/editor/documents/(\\d+)/render', (match) => {
    const document = find(match[1]);
    const jobId = Math.random().toString(36).slice(2, 14);
    jobs.set(jobId, {url: document.proxy!.url, filename: document.source.filename, polls: 0});
    return {id: jobId, status: 'queued', position: 2, stage: null, result: {error: null, error_code: null, response: null, took: 0}} satisfies EditorJob;
  });

  route('GET', '/jobs/([\\w-]+)', (match) => {
    const job = jobs.get(match[1]);
    if (!job) {
      throw error(404, 90006, 'Job expired before it finished, the queue might be backed up, try again');
    }
    job.polls += 1;
    if (job.polls < 3) {
      return {id: match[1], status: (job.polls < 2) ? 'queued' : 'started', position: 0, stage: 'processing', result: {error: null, error_code: null, response: null, took: 0}};
    }
    return {
      id: match[1],
      status: 'finished',
      position: 0,
      stage: null,
      result: {error: null, error_code: null, took: 1234, response: {items: [{storage: {urls: {cdn: job.url, vanity: job.url}, filename: job.filename}}]}},
    } satisfies EditorJob;
  });
}
