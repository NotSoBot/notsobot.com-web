import type { EditorEffect, EditorMediaKind, EditorParam, EditorStep } from './types';


// Pure helpers for the stack of steps: making a step from an effect, summaries, and which spatial tool a step has


let counter = 0;
export function newStepId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 32);
}


export function defaultParams(effect: EditorEffect): Record<string, unknown> {
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
  // a silent video's audio effects have nothing to work on
  if (effect.group === 'audio' && kind === 'video' && !hasAudio) {
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
