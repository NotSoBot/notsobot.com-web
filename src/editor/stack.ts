import type { EditorEffect, EditorMediaKind, EditorParam, EditorStep } from './types';


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
const FILE_STEP_EXCLUDED = new Set(['overlay', 'addaudio', 'still', 'trim']);
const FILE_STEP_EXCLUDED_KINDS = new Set(['point', 'box', 'strokes', 'media', 'steps']);

export function fileStepAllowed(effect: EditorEffect, forAudio: boolean): boolean {
  if (FILE_STEP_EXCLUDED.has(effect.id) || effect.params.some((param) => FILE_STEP_EXCLUDED_KINDS.has(param.kind))) {
    return false;
  }
  return (effect.group === 'audio') === forAudio;
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
