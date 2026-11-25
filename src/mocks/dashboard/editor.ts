// The media editor's routes for the dev mocks (`VITE_DASHBOARD_MOCKS=true`). The catalogue is the real one (exported
// from notsobot.api's `catalogue_payload()`), tiles use the commands page mock previews where there's one. Nothing is
// rendered: a preview answers `pending` once, then the unedited proxy, and a render finishes after a few polls with the
// proxy as its file. A version mismatch answers 409 like the api.

import type { EditorCatalogue, EditorDocument, EditorJob, EditorStep, EditorTemplate } from '@/editor/types';

import { MOCK_COMMAND_PREVIEWS } from './commandPreviews';
import catalogueJson from './editorCatalogue.json';


type Route = (method: string, pattern: string, handler: (match: RegExpMatchArray, request: {method: string, query: URLSearchParams, body: Record<string, unknown>}) => unknown) => void;
type MakeError = (status: number, code: number, message: string, metadata?: Record<string, unknown>) => Error;

const SAMPLE = new URL('./command-media/b1.png', import.meta.url).href;
// 6s, 30 fps, 512x800, no sound: enough frames for frame previews (Trim, Still Frame)
const SAMPLE_VIDEO = new URL('./command-media/media.aiv.manipulation.adhd.mp4', import.meta.url).href;
const DAY = 24 * 60 * 60 * 1000;


function catalogue(): EditorCatalogue {
  const data = structuredClone(catalogueJson) as unknown as EditorCatalogue;
  for (const effect of data.effects) {
    const after = (effect.command_id) ? MOCK_COMMAND_PREVIEWS[effect.command_id]?.media.find((item) => item.type === 0) : undefined;
    effect.thumbnail = (after) ? {url: after.url, mimetype: after.mimetype, width: after.width, height: after.height, duration: after.duration} : null;
  }
  return data;
}


// the api's `render_formats()` (catalogue.py): a mock video is treated as having sound
function renderFormats(kind: string, mimetype: string): Array<string> {
  if (kind === 'audio') {
    return ['audio/mp3', 'audio/ogg', 'audio/wav', 'audio/flac'];
  }
  if (kind === 'video') {
    return (mimetype.startsWith('image/'))
      ? ['image/gif', 'image/webp', 'video/mp4', 'video/webm']
      : ['video/mp4', 'video/webm', 'image/gif', 'image/webp', 'audio/mp3'];
  }
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
}


// the api's `encode_shortcode`: an id in base 52, A-Z then a-z
function shortcode(value: bigint): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let text = '';
  do {
    text = alphabet[Number(value % 52n)] + text;
    value /= 52n;
  } while (value > 0n);
  return text;
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
    source_meta: {kind, width, height, framecount: 1, fps: 0, duration: 0, mimetype, audio: kind !== 'image'},
    render_formats: renderFormats(kind, mimetype),
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
  const jobs = new Map<string, {url: string, filename: string, mimetype: string, polls: number}>();
  const templates = new Map<string, EditorTemplate>();
  let nextId = 2_000_000_000_000_000;

  documents.set('1900000000000000001', {
    ...makeDocument('1900000000000000001', SAMPLE, 'b1', 'image/png', 512, 512),
    steps: [{id: 'sample1', effect: 'deepfry', hidden: false, params: {scale: 25, keep_transparency: true}}],
  });

  // someone else's, so `/editor/template/NHYoGRFBvGa` shows the shared view (no delete, not in your list)
  templates.set('NHYoGRFBvGa', {
    code: 'NHYoGRFBvGa',
    name: 'Crunchy caption',
    steps: [
      {id: 'tpl1', effect: 'deepfry', hidden: false, params: {scale: 25, keep_transparency: true}},
      {id: 'tpl2', effect: 'text', hidden: false, params: {text: 'when the', position: {x: 0.5, y: 0.12}, size: 0.1, color: '#ffffff', start: null, end: null}},
    ],
    catalogue_version: 1,
    uses: 12,
    created: Date.now() - 3 * DAY,
    user: {id: '2', username: 'someone', avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png'},
    is_owner: false,
  });

  templates.set('NHYoGRFBvGb', {
    code: 'NHYoGRFBvGb',
    name: 'Deep fried',
    steps: [{id: 'tpl3', effect: 'deepfry', hidden: false, params: {scale: 25, keep_transparency: true}}],
    catalogue_version: 1,
    uses: 1,
    created: Date.now() - DAY,
    user: {id: '1', username: 'mockuser', avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'},
    is_owner: true,
  });

  // its proxy like the api's: 15 fps
  const video = makeDocument('1900000000000000004', SAMPLE_VIDEO, 'adhd', 'video/mp4', 512, 800);
  video.source_meta = {...video.source_meta, framecount: 180, fps: 30, duration: 6, audio: false};
  video.proxy = {...video.proxy!, framecount: 90, fps: 15, duration: 6};
  video.render_formats = ['video/mp4', 'video/webm', 'image/gif', 'image/webp'];
  documents.set(video.id, video);

  const findTemplate = (code: string): EditorTemplate => {
    const template = templates.get(code);
    if (!template) {
      throw error(404, 10045, 'Unknown Editor Template');
    }
    return template;
  };

  const find = (documentId: string): EditorDocument => {
    const document = documents.get(documentId);
    if (!document) {
      throw error(404, 10043, 'Unknown Editor Document');
    }
    return document;
  };

  // `__dashboardMocks.owner(false)` (then reload) shows a non-owner: the editor isn't open to them yet, unless
  // `sessionStorage.setItem('dashboardMocks:editorPublic', '1')` (then reload) has it open to everyone like EDITOR_PUBLIC
  route('GET', '/editor/effects', () => ({
    ...catalogue(),
    access: (sessionStorage.getItem('dashboardMocks:editorPublic')) ? 'everyone' : 'owners',
  }));

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
    const templateCode = body.template_code as string | undefined;
    if (templateCode) {
      const template = findTemplate(templateCode);
      document.steps = structuredClone(template.steps);
      template.uses += 1;
    }
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
    // the api's `render_formats(source_meta, steps)`: a Still Frame makes it an image
    const still = steps.some((step) => !step.hidden && step.effect === 'still');
    document.render_formats = (still) ? renderFormats('image', 'image/png') : renderFormats(document.source_meta.kind, document.source_meta.mimetype)
      .filter((mimetype) => document.source_meta.audio !== false || !mimetype.startsWith('audio/') || document.source_meta.kind === 'audio');
    document.version += 1;
    document.updated = new Date().toISOString();
    return document;
  });

  route('DELETE', '/editor/documents/(\\d+)', (match) => {
    find(match[1]);
    documents.delete(match[1]);
    return undefined;
  });

  route('GET', '/editor/templates', () => ({
    templates: [...templates.values()].filter((template) => template.is_owner).sort((a, b) => b.created - a.created),
  }));

  route('POST', '/editor/templates', (_, { body }) => {
    const document = find(String(body.document_id));
    const name = String(body.name ?? '').trim();
    if (!name) {
      throw error(400, 50035, 'Invalid Form Body', {errors: {name: [{message: 'A name is required'}]}});
    }
    nextId += 1;
    const template: EditorTemplate = {
      code: shortcode(BigInt(nextId)),
      name: name.slice(0, 64),
      steps: structuredClone(document.steps),
      catalogue_version: document.catalogue_version,
      uses: 0,
      created: Date.now(),
      user: {id: '1', username: 'you', avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'},
      is_owner: true,
    };
    templates.set(template.code, template);
    return template;
  });

  route('GET', '/editor/templates/([A-Za-z]+)', (match) => findTemplate(match[1]));

  route('DELETE', '/editor/templates/([A-Za-z]+)', (match) => {
    if (!findTemplate(match[1]).is_owner) {
      throw error(403, 20001, 'Not your template');
    }
    templates.delete(match[1]);
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

  route('POST', '/editor/documents/(\\d+)/render', (match, { body }) => {
    const document = find(match[1]);
    const mimetype = body.mimetype as string | undefined;
    if (mimetype !== undefined && !document.render_formats?.includes(mimetype)) {
      throw error(400, 50001, 'This media can\'t be rendered as that format');
    }
    const jobId = Math.random().toString(36).slice(2, 14);
    // nothing is converted, the result only says it was (the proxy as its file)
    jobs.set(jobId, {url: document.proxy!.url, filename: document.source.filename, mimetype: mimetype ?? document.source_meta.mimetype, polls: 0});
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
      result: {error: null, error_code: null, took: 1234, response: {items: [{storage: {urls: {cdn: job.url, vanity: job.url}, filename: job.filename}, file: {mimetype: job.mimetype}}]}},
    } satisfies EditorJob;
  });
}
