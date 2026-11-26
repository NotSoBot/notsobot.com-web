// The template hub's routes for the dev mocks (registered by ./editor.ts, sharing its templates). A dozen published
// samples from other people (previews are the commands page's mock media), and the mock user's own templates in every
// hub state. Publishing is decided by the description, so every result can be clicked through:
// "reject" → rejected, "review" → in review, "limit" → the EDITOR_HUB_LIMIT error, anything else → published.
// Pages are 8 long here (the api's are 24) so Load more shows with a dozen samples

import type { EditorEffect, EditorGroup, EditorStep, EditorTemplate, EditorTemplateInput } from '@/editor/types';
import type { HubKind, HubPreview, HubTemplate } from '@/editor/hub/types';


type Route = (method: string, pattern: string, handler: (match: RegExpMatchArray, request: {method: string, query: URLSearchParams, body: Record<string, unknown>}) => unknown) => void;
type MakeError = (status: number, code: number, message: string, metadata?: Record<string, unknown>) => Error;

const FILES = import.meta.glob<string>('./command-media/*', {eager: true, import: 'default', query: '?url'});
const DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 8;
// the api's EDITOR_HUB_LIMIT, its number isn't settled yet: the site reads `limit` from the metadata
const EDITOR_HUB_LIMIT = 30037;
const HUB_LIMIT = 10;
const VISUAL: Array<HubKind> = ['image', 'gif', 'video'];
const SOUND: Array<HubKind> = ['audio', 'video'];


function media(file: string, mimetype: string, width: number, height: number): HubPreview {
  return {url: FILES[`./command-media/${file}`], mimetype, width, height};
}

function avatar(index: number): string {
  return `https://cdn.discordapp.com/embed/avatars/${index % 6}.png`;
}

let stepCounter = 0;
function step(effect: string, params: Record<string, unknown> = {}, inputs?: Record<string, string>): EditorStep {
  stepCounter += 1;
  return {id: `hub${stepCounter}`, effect, hidden: false, params, ...((inputs) ? {inputs} : {})};
}

// a template's questions from its steps' `inputs`, like the api's `template_inputs`
function inputsOf(steps: Array<EditorStep>): Array<EditorTemplateInput> {
  return steps.flatMap((item) => Object.entries(item.inputs ?? {}).map(([ param, label ]) => ({
    key: label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
    label,
    step_id: item.id,
    param,
    kind: 'text',
    default: item.params[param] ?? null,
  })));
}


interface Sample {
  code: string,
  name: string,
  description: string,
  author: string,
  steps: Array<EditorStep>,
  preview: HubPreview | null,
  kinds: Array<HubKind>,
  users: number,
  week: number,
  days: number,
}

function samples(): Array<Sample> {
  return [
    {code: 'HubDeepFry', name: 'Nuclear deep fry', description: 'Crunchier than the bot’s own deep fry: fried twice, then a little JPEG on top. Works on anything with a face.', author: 'fryer', steps: [step('deepfry'), step('deepfry'), step('needsmorejpeg')], preview: media('media.iv.manipulation.deepfry.webp', 'image/webp', 512, 512), kinds: VISUAL, users: 18421, week: 1210, days: 40},
    {code: 'HubCaption', name: 'Caption this', description: 'A classic white caption bar on top. It asks for your caption.', author: 'memelord', steps: [step('caption', {text: 'when the code works first try'}, {text: 'Your caption'})], preview: media('media.iv.manipulation.caption.webp', 'image/webp', 512, 580), kinds: VISUAL, users: 9640, week: 2380, days: 12},
    {code: 'HubSpinny', name: 'Spinny boi', description: 'Your picture, spinning forever. Best on round things and cats.', author: 'rotato', steps: [step('spin')], preview: media('media.iv.manipulation.magik.animated.webp', 'image/webp', 512, 512), kinds: VISUAL, users: 7210, week: 3920, days: 3},
    {code: 'HubSwirl', name: 'Into the void', description: 'A deep swirl into the middle, then pixel sorting on what’s left.', author: 'voidwalker', steps: [step('swirl'), step('pixelsort')], preview: media('media.iv.manipulation.swirl.webp', 'image/webp', 512, 512), kinds: VISUAL, users: 3388, week: 140, days: 70},
    {code: 'HubDemotiv', name: 'Demotivational poster', description: 'The black frame and big serif text. Asks for the title and the line under it.', author: 'posterboy', steps: [step('demotivate', {text: 'TEAMWORK\nnone of us is as dumb as all of us'}, {text: 'Poster text'})], preview: media('media.iv.manipulation.demotivate.webp', 'image/webp', 614, 682), kinds: VISUAL, users: 2954, week: 610, days: 21},
    {code: 'HubGoogly', name: 'Googly eyes', description: 'Googly eyes on every face it finds.', author: 'eyespy', steps: [step('eyes')], preview: media('media.iv.manipulation.eyes.googly.webp', 'image/webp', 500, 463), kinds: VISUAL, users: 2410, week: 520, days: 9},
    {code: 'HubClown', name: 'Clown world', description: 'Clown makeup on every face, plus a little rainbow wobble.', author: 'honk', steps: [step('faceclown'), step('rainbow')], preview: media('media.i.manipulation.face.clown.webp', 'image/webp', 500, 463), kinds: VISUAL, users: 1902, week: 880, days: 5},
    {code: 'HubADHD', name: 'Brainrot split', description: 'Your video on top, the satisfying clip below. Keeps the sound.', author: 'scroller', steps: [step('zoom'), step('shake')], preview: media('media.aiv.manipulation.adhd.mp4', 'video/mp4', 512, 800), kinds: ['video', 'gif'], users: 1544, week: 1040, days: 2},
    {code: 'HubYouTube', name: 'YouTube thumbnail', description: 'The red arrow and circle a real YouTuber would use. Asks for the title.', author: 'clickbait', steps: [step('youtube', {text: 'I can’t believe this happened', channel: 'NotSoBot'}, {text: 'Video title'})], preview: media('media.iv.manipulation.overlay.youtube.webp', 'image/webp', 854, 634), kinds: VISUAL, users: 1187, week: 95, days: 33},
    {code: 'HubBass', name: 'Bass boosted', description: 'Earrape bass, then a bit of reverb so it sounds like a car going by.', author: 'subwoofer', steps: [step('boostbass'), step('audioreverb')], preview: media('media.av.manipulation.boost.bass.mp3', 'audio/mpeg', 0, 0), kinds: SOUND, users: 980, week: 310, days: 15},
    {code: 'HubChipmunk', name: 'Chipmunk', description: 'Pitched way up, sped up a little.', author: 'alvin', steps: [step('audiopitch'), step('speed')], preview: media('media.av.manipulation.audio.pitch.mp3', 'audio/mpeg', 0, 0), kinds: SOUND, users: 640, week: 60, days: 26},
    {code: 'HubReplace', name: 'Video glitch loop', description: 'Glitch, reverse and glitch again. Short clips loop best.', author: 'datamosh', steps: [step('glitch'), step('reverse'), step('glitchanimated')], preview: media('media.a.tools.put.replace.mp4', 'video/mp4', 512, 512), kinds: ['video', 'gif'], users: 412, week: 12, days: 50},
    {code: 'HubEinstein', name: 'Einstein says', description: 'Einstein writing your text on the chalkboard. No preview yet, the check is still rendering it.', author: 'physics', steps: [step('vaporwave', {text: 'E = mc²'}, {text: 'Chalkboard text'}), step('invert')], preview: null, kinds: VISUAL, users: 15, week: 15, days: 0},
  ];
}


export function registerHubMocks(route: Route, error: MakeError, templates: Map<string, EditorTemplate>, effects: Array<EditorEffect>): void {
  const effectsById = new Map(effects.map((effect) => [effect.id, effect]));
  // hub-only fields the EditorTemplate doesn't carry
  const extra = new Map<string, {kinds: Array<HubKind>, users_week: number}>();
  const reports: Array<{code: string, reason: string, text?: string}> = [];
  const now = Date.now();

  samples().forEach((sample, index) => {
    templates.set(sample.code, {
      code: sample.code,
      name: sample.name,
      steps: sample.steps,
      catalogue_version: 2,
      uses: Math.round(sample.users * 1.6),
      created: now - (sample.days + 2) * DAY,
      user: {id: String(3000 + index), username: sample.author, avatar_url: avatar(index)},
      is_owner: false,
      locked: false,
      inputs: inputsOf(sample.steps),
      hub: {status: 'published', description: sample.description, reason: null, published_at: now - sample.days * DAY - index * 3600_000, preview: sample.preview, users: sample.users},
    });
    extra.set(sample.code, {kinds: sample.kinds, users_week: sample.week});
  });

  // the mock user's own, one per hub state (the existing "Deep fried" one is unlisted)
  const mine = (code: string, name: string, steps: Array<EditorStep>, hub: EditorTemplate['hub'], days: number) => {
    templates.set(code, {
      code, name, steps, catalogue_version: 2, uses: hub?.users ?? 0, created: now - days * DAY,
      user: {id: '1', username: 'mockuser', avatar_url: avatar(0)}, is_owner: true, locked: false, inputs: inputsOf(steps), hub,
    });
    extra.set(code, {kinds: VISUAL, users_week: Math.round((hub?.users ?? 0) / 4)});
  };
  mine('HubMineZoom', 'Wobbly zoom', [step('zoom'), step('wave')], {
    status: 'published', description: 'Zooms in and wobbles, good for reaction GIFs.', reason: null, published_at: now - 4 * DAY,
    preview: media('media.iv.manipulation.magik.webp', 'image/webp', 384, 384), users: 57,
  }, 6);
  mine('HubMineShout', 'Shouty caption', [step('caption', {text: 'WHAT'}, {text: 'What to shout'}), step('deepfry')], {
    status: 'review', description: 'A caption in all caps, deep fried.', reason: null, published_at: null, preview: null, users: 0,
  }, 2);
  mine('HubMineDoodle', 'Doodle face', [step('draw', {strokes: [{color: '#ff0000', width: 0.02, points: [[0.2, 0.2], [0.8, 0.8]]}]})], {
    status: 'rejected', description: 'My drawing on your face.', reason: 'The drawing reads as an insult.', published_at: null, preview: null, users: 0,
  }, 1);

  const groupsOf = (template: EditorTemplate): Array<EditorGroup> => [...new Set(template.steps.filter((item) => !item.hidden).map((item) => effectsById.get(item.effect)?.group).filter((group): group is EditorGroup => Boolean(group)))];
  const view = (template: EditorTemplate): HubTemplate => {
    const visible = template.steps.filter((item) => !item.hidden);
    const more = extra.get(template.code) ?? {kinds: VISUAL, users_week: 0};
    return {
      code: template.code,
      name: template.name,
      user: template.user,
      effects: visible.map((item) => item.effect),
      step_count: visible.length,
      inputs: template.inputs ?? [],
      uses: template.uses,
      created: template.created,
      description: template.hub?.description ?? null,
      preview: template.hub?.preview ?? null,
      users: template.hub?.users ?? 0,
      users_week: more.users_week,
      published_at: template.hub?.published_at ?? null,
      kinds: more.kinds,
      groups: groupsOf(template),
    };
  };
  const published = () => [...templates.values()].filter((template) => template.hub?.status === 'published');
  const own = (code: string): EditorTemplate => {
    const template = templates.get(code);
    if (!template || !template.is_owner) {
      throw error(404, 10045, 'Unknown Editor Template');
    }
    return template;
  };

  route('GET', '/editor/hub', (_, { query }) => {
    const search = (query.get('query') ?? '').trim().toLowerCase();
    const kind = query.get('kind') as HubKind | null;
    const group = query.get('group');
    const asks = query.get('asks') === 'true';
    const sort = query.get('sort') ?? 'popular';
    let items = published().map(view).filter((item) => {
      if (kind && !item.kinds.includes(kind)) {
        return false;
      }
      if (group && !item.groups.includes(group as EditorGroup)) {
        return false;
      }
      if (asks && !item.inputs?.length) {
        return false;
      }
      if (!search) {
        return true;
      }
      // name, description, author and effect names, like the api
      const haystack = [item.name, item.description, item.user.username, ...item.effects.map((id) => effectsById.get(id)?.name ?? id)];
      return haystack.some((value) => value && value.toLowerCase().includes(search));
    });
    items = items.sort((a, b) => (sort === 'new') ? (b.published_at ?? 0) - (a.published_at ?? 0) : (sort === 'trending') ? b.users_week - a.users_week : b.users - a.users);
    // the cursor is an offset here, the api's is its own
    const start = Number(query.get('before') ?? 0) || 0;
    const page = items.slice(start, start + PAGE_SIZE);
    return {templates: page, next: (start + PAGE_SIZE < items.length) ? String(start + PAGE_SIZE) : null};
  });

  // staff: what's waiting on them (before `/editor/hub/<code>`, which would match `review` too)
  route('GET', '/editor/hub/review', () => ({templates: [...templates.values()].filter((template) => template.hub?.status === 'review').map(view)}));

  route('GET', '/editor/hub/([A-Za-z]+)', (match) => {
    const template = templates.get(match[1]);
    if (!template || template.hub?.status !== 'published') {
      throw error(404, 10045, 'Unknown Editor Template');
    }
    return view(template);
  });

  route('POST', '/editor/templates/([A-Za-z]+)/publish', (match, { body }) => {
    const template = own(match[1]);
    if (template.locked) {
      throw error(400, 50001, 'A template locked with a password can\'t be published');
    }
    const description = String(body.description ?? '').trim().slice(0, 200);
    const lower = description.toLowerCase();
    if (lower.includes('limit')) {
      throw error(400, EDITOR_HUB_LIMIT, `You can have ${HUB_LIMIT} templates on the hub at once`, {limit: HUB_LIMIT});
    }
    const base = {description, published_at: null, preview: null, users: template.hub?.users ?? 0};
    if (lower.includes('reject')) {
      template.hub = {...base, status: 'rejected', reason: 'Its text didn\'t pass the safety check.'};
    } else if (lower.includes('review')) {
      template.hub = {...base, status: 'review', reason: null};
    } else {
      template.hub = {
        ...base,
        status: 'published',
        reason: null,
        published_at: Date.now(),
        preview: template.hub?.preview ?? media('media.iv.manipulation.magik.webp', 'image/webp', 384, 384),
      };
      if (!extra.has(template.code)) {
        extra.set(template.code, {kinds: VISUAL, users_week: 0});
      }
    }
    return template;
  });

  route('DELETE', '/editor/templates/([A-Za-z]+)/publish', (match) => {
    const template = own(match[1]);
    template.hub = {status: 'none', description: template.hub?.description ?? null, reason: null, published_at: null, preview: null, users: template.hub?.users ?? 0};
    return template;
  });

  route('POST', '/editor/templates/([A-Za-z]+)/report', (match, { body }) => {
    const template = templates.get(match[1]);
    if (!template || template.hub?.status !== 'published') {
      throw error(404, 10045, 'Unknown Editor Template');
    }
    if (!['sexual', 'hate', 'violence', 'spam', 'other'].includes(String(body.reason))) {
      throw error(400, 50035, 'Invalid Form Body', {errors: {reason: [{message: 'Pick a reason'}]}});
    }
    reports.push({code: template.code, reason: String(body.reason), text: body.text as string | undefined});
    return undefined;
  });

  route('POST', '/editor/templates/([A-Za-z]+)/hub/moderate', (match, { body }) => {
    const template = templates.get(match[1]);
    if (!template?.hub) {
      throw error(404, 10045, 'Unknown Editor Template');
    }
    const action = String(body.action);
    const reason = (body.reason) ? String(body.reason) : null;
    template.hub = {
      ...template.hub,
      status: (action === 'publish') ? 'published' : (action === 'hide') ? 'hidden' : 'rejected',
      reason,
      published_at: (action === 'publish') ? Date.now() : template.hub.published_at,
    };
    return template;
  });
}
