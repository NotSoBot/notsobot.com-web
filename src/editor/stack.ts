import type { RoomOp } from './room';
import type { EditorAsset, EditorEffect, EditorFileAccept, EditorMediaKind, EditorParam, EditorStep } from './types';


// Pure helpers for the stack of steps: making a step from an effect, summaries, and which spatial tool a step has


let counter = 0;
export function newStepId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 32);
}


// an effect's or a generator's
export function defaultParams(effect: {params: Array<EditorParam>}): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const param of effect.params) {
    params[param.name] = structuredClone(param.default);
  }
  return params;
}


export function newStep(effect: EditorEffect): EditorStep {
  const params = defaultParams(effect);
  // the api refuses empty text, start with something to move around
  if (effect.id === 'text') {
    params.text = 'Text';
  }
  return {id: newStepId(), effect: effect.id, hidden: false, params};
}


export function effectFits(effect: EditorEffect, kind: EditorMediaKind, hasAudio: boolean): boolean {
  if (!effect.kinds.includes(kind)) {
    return false;
  }
  // a silent video's audio effects have nothing to work on (Add Audio is how it gets some)
  if (effect.group === 'audio' && effect.id !== ADD_AUDIO_EFFECT_ID && kind === 'video' && !hasAudio) {
    return false;
  }
  return true;
}


// `scale` -> `Scale`, `keep_transparency` -> `Keep transparency`. Param names come from the api like effect names do
export function paramLabel(param: EditorParam): string {
  const text = param.name.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}


export type SpatialTool =
  | {kind: 'point', param: string}
  | {kind: 'box', param: string}
  | {kind: 'strokes', param: string};

export function spatialTool(effect: EditorEffect | undefined): SpatialTool | null {
  const param = effect?.params.find((item) => item.kind === 'point' || item.kind === 'box' || item.kind === 'strokes');
  if (!param) {
    return null;
  }
  return {kind: param.kind as SpatialTool['kind'], param: param.name};
}


export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}


export function roundFraction(value: number): number {
  return Math.round(clamp(value, 0, 1) * 10000) / 10000;
}


export const TRIM_EFFECT_ID = 'trim';
export const STILL_EFFECT_ID = 'still';


// a visible Still Frame: from it on the media is a still image
// the api's `ADD_AUDIO_EFFECT_ID`: puts a sound on the media, a picture becomes a video with it
export const ADD_AUDIO_EFFECT_ID = 'addaudio';

// the api's `MAX_FILE_STEPS` and `file_step_allowed`: what can run on an uploaded file. A sound takes the audio effects,
// an overlay every other one, never one placed on the preview, another file's, or a cut of its own
export const MAX_FILE_STEPS = 10;
const FILE_STEP_EXCLUDED = new Set(['overlay', 'addaudio', 'still', 'trim', 'ffmpeg']);
const FILE_STEP_EXCLUDED_KINDS = new Set(['point', 'box', 'strokes', 'media', 'steps']);

export function fileStepAllowed(effect: EditorEffect, forAudio: boolean): boolean {
  if (FILE_STEP_EXCLUDED.has(effect.id) || effect.params.some((param) => FILE_STEP_EXCLUDED_KINDS.has(param.kind))) {
    return false;
  }
  return (effect.group === 'audio') === forAudio;
}


// ---- the 2026-11-26 second-file effects (Blend, Face Swap, Vocoder...): any effect with a `media` param ----

// the effect's uploaded file param, undefined when it takes none
export function fileParam(effect: EditorEffect | undefined): EditorParam | undefined {
  return effect?.params.find((param) => param.kind === 'media');
}


// what its file can be (the api's `accepts`). A catalogue from before it: Add Audio a sound, the rest a picture or video
export function fileAccepts(effect: EditorEffect): Array<EditorFileAccept> {
  const accepts = fileParam(effect)?.accepts;
  if (accepts?.length) {
    return accepts;
  }
  return (effect.id === ADD_AUDIO_EFFECT_ID) ? ['sound'] : ['image', 'video'];
}


// its file is a sound (Add Audio, Vocoder, Append Audio): the effects on it are the audio ones
export function fileForAudio(effect: EditorEffect): boolean {
  return fileAccepts(effect).some((accept) => accept === 'sound' || accept === 'audio');
}


// the api's `asset_fits`: whether one of the edit's files is one `accepts` takes
export function assetFits(asset: EditorAsset, accepts: Array<EditorFileAccept>): boolean {
  if (accepts.includes('sound') && (asset.kind === 'audio' || Boolean(asset.audio))) {
    return true;
  }
  return accepts.includes(asset.kind);
}


// the file picker's `accept` for them
export function fileInputAccept(accepts: Array<EditorFileAccept>): string {
  const types = new Set<string>();
  for (const accept of accepts) {
    if (accept === 'sound') {
      types.add('audio/*').add('video/*');
    } else if (accept === 'video') {
      // gifs and animated webps are "videos" too
      types.add('video/*').add('image/gif').add('image/webp');
    } else {
      types.add(`${accept}/*`);
    }
  }
  return [...types].join(',');
}


// a visible Add Audio with its sound picked: the media has sound from there
export function addsAudio(steps: Array<EditorStep>): boolean {
  return steps.some((step) => !step.hidden && step.effect === ADD_AUDIO_EFFECT_ID && Boolean(step.params.media));
}


export function hasStill(steps: Array<EditorStep>): boolean {
  return steps.some((step) => !step.hidden && step.effect === STILL_EFFECT_ID);
}


// what the media is at the end of the stack, what the effect picker offers next (a Still Frame makes it an image, so
// nothing that moves or plays sound can follow it, the api refuses those)
export function stackKind(sourceKind: EditorMediaKind, steps: Array<EditorStep>): EditorMediaKind {
  if (sourceKind === 'video' && hasStill(steps)) {
    return 'image';
  }
  // Add Audio makes a picture a video (it can't follow a Still Frame, the api refuses that)
  return (sourceKind === 'image' && addsAudio(steps)) ? 'video' : sourceKind;
}


export interface StepTimeline {
  // seconds, the clip's length as the Trims before this step left it
  duration: number,
  // where this clip starts in the source
  offset: number,
}


// The clip a step's times are on: the visible Trims before it cut the source down. `null` past a Still Frame (it's an
// image from there)
export function stepTimeline(steps: Array<EditorStep>, stepId: string, sourceDuration: number): StepTimeline | null {
  let offset = 0;
  let duration = sourceDuration;
  for (const step of steps) {
    if (step.id === stepId) {
      return {duration: Math.max(duration, 0), offset};
    }
    if (step.hidden) {
      continue;
    }
    if (step.effect === STILL_EFFECT_ID) {
      return null;
    }
    if (step.effect === TRIM_EFFECT_ID) {
      const start = Math.min(Number(step.params.start ?? 0), duration);
      const end = (typeof step.params.end === 'number') ? Math.min(step.params.end, duration) : duration;
      offset += start;
      duration = Math.max(end - start, 0);
    }
  }
  return null;
}


// `1.5` -> `1.50s`, the length of a Trim and its times
export function formatSeconds(value: number): string {
  return `${value.toFixed(2)}s`;
}


// every string inside a step's params, a file's own steps (a list of steps in a param) included
function mapParamStrings(value: unknown, map: (text: string) => string): unknown {
  if (typeof value === 'string') {
    return map(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapParamStrings(item, map));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([ key, item ]) => [key, mapParamStrings(item, map)]));
  }
  return value;
}

// the document's uploaded files (`assets`) its steps use: a `media` param holds a file's id
export function usedAssets(steps: Array<EditorStep>, assets: Array<EditorAsset>): Array<EditorAsset> {
  const ids = new Set(assets.map((asset) => asset.id));
  const used = new Set<string>();
  for (const step of steps) {
    mapParamStrings(step.params, (text) => {
      if (ids.has(text)) {
        used.add(text);
      }
      return text;
    });
  }
  return assets.filter((asset) => used.has(asset.id));
}

// the same steps pointing at other files (a copy of the document has its own copies of them, old id -> new id)
export function remapAssets(steps: Array<EditorStep>, ids: Map<string, string>): Array<EditorStep> {
  return steps.map((step) => ({...step, params: mapParamStrings(step.params, (text) => ids.get(text) ?? text) as EditorStep['params']}));
}


// One undoable change to the stack, as what it did. In a room undo and redo apply it (or its opposite) to the stack as
// it is now and send that as ordinary ops, so what the others changed meanwhile stays where it is: putting an earlier
// stack back whole (`replace`) took their steps out for everyone. Only a change that was the whole stack (a template
// loaded onto it, its template inputs) is still one
export type StackChange =
  // `index`: where it went in, or where it was taken from
  | {kind: 'add', step: EditorStep, index: number}
  | {kind: 'remove', step: EditorStep, index: number}
  | {kind: 'move', stepId: string, from: number, to: number}
  // one or more of a step's settings (a drag's worth is one change)
  | {kind: 'params', stepId: string, before: Record<string, unknown>, after: Record<string, unknown>}
  | {kind: 'toggle', stepId: string, before: boolean, after: boolean}
  | {kind: 'replace', before: Array<EditorStep>, after: Array<EditorStep>};

// the one step a change is about, none for the whole stack
export function changedStepId(change: StackChange): string | null {
  switch (change.kind) {
    case 'add':
    case 'remove':
      return change.step.id;
    case 'replace':
      return null;
    default:
      return change.stepId;
  }
}

type AppliedChange = {steps: Array<EditorStep>, ops: Array<RoomOp>};

function withStep(steps: Array<EditorStep>, step: EditorStep, index: number): AppliedChange | null {
  if (steps.some((item) => item.id === step.id)) {
    return null;
  }
  const at = Math.min(Math.max(index, 0), steps.length);
  return {steps: [...steps.slice(0, at), step, ...steps.slice(at)], ops: [{op: 'add', step, index: at}]};
}

function withoutStep(steps: Array<EditorStep>, stepId: string): AppliedChange | null {
  if (!steps.some((item) => item.id === stepId)) {
    return null;
  }
  return {steps: steps.filter((item) => item.id !== stepId), ops: [{op: 'remove', step_id: stepId}]};
}

// `change` undone or done again on `steps` as they are now: the stack after it and the ops that make it so for the
// room. null when it no longer applies (its step is gone, or back, or already that way), the change is then dropped
export function applyStackChange(steps: Array<EditorStep>, change: StackChange, direction: 'undo' | 'redo'): AppliedChange | null {
  const redo = direction === 'redo';
  switch (change.kind) {
    case 'add':
      return (redo) ? withStep(steps, change.step, change.index) : withoutStep(steps, change.step.id);
    case 'remove':
      return (redo) ? withoutStep(steps, change.step.id) : withStep(steps, change.step, change.index);
    case 'move': {
      const from = steps.findIndex((item) => item.id === change.stepId);
      const to = Math.min(Math.max((redo) ? change.to : change.from, 0), steps.length - 1);
      if (from === -1 || from === to) {
        return null;
      }
      const items = [...steps];
      const [ step ] = items.splice(from, 1);
      items.splice(to, 0, step);
      return {steps: items, ops: [{op: 'move', step_id: change.stepId, to}]};
    }
    case 'params': {
      const values = (redo) ? change.after : change.before;
      const step = steps.find((item) => item.id === change.stepId);
      const names = Object.keys(values).filter((name) => step && step.params[name] !== values[name]);
      if (!step || !names.length) {
        return null;
      }
      const params = {...step.params};
      for (const name of names) {
        params[name] = values[name];
      }
      return {
        steps: steps.map((item) => (item.id === change.stepId) ? {...item, params} : item),
        // (a setting it didn't have before goes back to nothing, the api wants a value either way)
        ops: names.map((name) => ({op: 'set_param', step_id: change.stepId, name, value: values[name] ?? null})),
      };
    }
    case 'toggle': {
      const hidden = (redo) ? change.after : change.before;
      const step = steps.find((item) => item.id === change.stepId);
      if (!step || Boolean(step.hidden) === hidden) {
        return null;
      }
      return {
        steps: steps.map((item) => (item.id === change.stepId) ? {...item, hidden} : item),
        ops: [{op: 'toggle', step_id: change.stepId, hidden}],
      };
    }
    case 'replace': {
      const next = (redo) ? change.after : change.before;
      return {steps: next, ops: [{op: 'replace', steps: next}]};
    }
  }
}
