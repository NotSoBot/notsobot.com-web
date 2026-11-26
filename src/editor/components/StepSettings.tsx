import { Crosshair, Image as ImageIcon, Scissors, Sparkles, Timer, Undo2, Trash2 } from 'lucide-react';
import { useId } from 'react';

import { ColorPicker } from '@/components/ui/ColorPicker';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { formatSeconds, paramLabel, STILL_EFFECT_ID, TRIM_EFFECT_ID } from '../stack';
import type { EditorEffect, EditorParam, EditorStep, EditorStroke } from '../types';
import type { EditorDocumentState } from '../useEditorDocument';
import type { PenSettings } from './SpatialOverlay';
import { OverlayMediaControl } from './OverlayMediaControl';
import { INPUT, SimpleParamControl } from './ParamControls';


const PEN_WIDTHS = [0.005, 0.01, 0.02, 0.04];


function OptionalTimeControl({ param, value, onChange, maximum }: {
  param: EditorParam,
  value: number | null,
  onChange: (value: number | null) => void,
  maximum: number,
}) {
  const { t } = useI18n();
  const id = useId();
  const label = (param.name === 'start') ? t('editor.settings.start') : t('editor.settings.end');
  return (
    <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
      <label htmlFor={id} className='text-[13px] text-muted'>{label}</label>
      <input
        id={id}
        type='number'
        min={0}
        max={maximum}
        step={0.1}
        placeholder={t('editor.settings.whole_clip')}
        value={value ?? ''}
        onChange={(event) => {
          const text = event.target.value;
          if (!text) {
            onChange(null);
            return;
          }
          const next = Number(text);
          if (Number.isFinite(next)) {
            onChange(Math.min(Math.max(next, 0), maximum));
          }
        }}
        className={INPUT}
      />
    </div>
  );
}


// a Trim/Still Frame time: what it's on, and the scrubber's moment on that clip
export interface TimeContext {
  // seconds, the clip as the Trims before the step left it
  duration: number,
  // the source's frame rate, for frame numbers and one-frame slider steps (0: unknown)
  fps: number,
  // the scrubbed frame's time on this step's clip, null when there's no scrubber or it's outside the clip
  current: number | null,
}


function TimeControl({ param, value, onChange, context }: {
  param: EditorParam,
  value: number | null,
  onChange: (value: number | null) => void,
  context: TimeContext,
}) {
  const { t } = useI18n();
  const id = useId();
  const maximum = (context.duration > 0) ? context.duration : (param.maximum ?? 600);
  const shown = Math.min(value ?? maximum, maximum);
  const step = (context.fps > 0) ? 1 / context.fps : 0.01;
  const set = (next: number) => {
    if (Number.isFinite(next)) {
      onChange(Math.round(Math.min(Math.max(next, 0), maximum) * 1000) / 1000);
    }
  };
  const frame = (context.fps > 0) ? Math.min(Math.round(shown * context.fps), Math.max(Math.round(maximum * context.fps) - 1, 0)) + 1 : null;
  const SMALL = 'inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-brand-text hover:bg-surface-3 hover:text-white disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <label htmlFor={id} className='text-[13px] text-muted'>{paramLabel(param)}</label>
        <input
          type='number'
          aria-label={`${paramLabel(param)} (${t('editor.settings.seconds')})`}
          value={value ?? ''}
          min={0}
          max={maximum}
          step={0.01}
          // the line under the slider says "To the end", the box is too narrow for it
          placeholder={(param.optional) ? '–' : undefined}
          onChange={(event) => {
            if (!event.target.value) {
              if (param.optional) {
                onChange(null);
              }
              return;
            }
            set(Number(event.target.value));
          }}
          className='h-8 w-24 rounded-md border border-line-strong bg-deep px-2 text-right font-mono text-[13px] text-fg tabular-nums outline-none focus:border-brand'
        />
      </div>
      <input
        id={id}
        type='range'
        min={0}
        max={maximum}
        step={step}
        value={shown}
        onChange={(event) => set(Number(event.target.value))}
        className='min-w-0 flex-1 accent-brand'
      />
      <div className='flex flex-wrap items-center gap-x-2 text-xs text-subtle'>
        <span className='font-mono tabular-nums'>
          {(value === null && param.optional) ? t('editor.settings.to_end') : formatSeconds(shown)}
          {(frame !== null && value !== null) ? ` · ${t('editor.settings.frame_number', {frame})}` : null}
        </span>
        <span className='flex-1'/>
        <button type='button' disabled={context.current === null} onClick={() => context.current !== null && set(context.current)} className={SMALL}>
          <Crosshair aria-hidden className='size-3.5'/>{t('editor.settings.use_current')}
        </button>
        {(param.optional && value !== null) ? (
          <button type='button' onClick={() => onChange(null)} className={SMALL}>{t('editor.settings.to_end')}</button>
        ) : null}
      </div>
    </div>
  );
}


function DrawControls({ strokes, onChange, pen, setPen, maxStrokes }: {
  strokes: Array<EditorStroke>,
  onChange: (value: Array<EditorStroke>) => void,
  pen: PenSettings,
  setPen: (pen: PenSettings) => void,
  maxStrokes: number,
}) {
  const { t } = useI18n();
  return (
    <div className='flex flex-col gap-3'>
      <p className='text-[13px] text-muted'>{t('editor.settings.draw')}</p>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='min-w-0 flex-1 basis-full'>
          <ColorPicker label={t('editor.settings.pen_color')} value={pen.color} onChange={(color) => setPen({...pen, color})} alpha/>
        </div>
        <div role='radiogroup' aria-label={t('editor.settings.pen_width')} className='flex gap-1 rounded-lg border border-line-strong bg-deep p-1'>
          {PEN_WIDTHS.map((width) => (
            <button
              key={width}
              type='button'
              role='radio'
              aria-checked={pen.width === width}
              aria-label={`${t('editor.settings.pen_width')} ${Math.round(width * 1000) / 10}%`}
              onClick={() => setPen({...pen, width})}
              className={cn('flex size-8 items-center justify-center rounded-md', (pen.width === width) ? 'bg-brand' : 'hover:bg-surface-3')}
            >
              <span aria-hidden className='rounded-full bg-white' style={{width: 4 + width * 300, height: 4 + width * 300}}/>
            </button>
          ))}
        </div>
      </div>
      {(maxStrokes <= strokes.length) ? <p className='text-xs text-warning'>{t('editor.settings.strokes_limit')}</p> : null}
      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          disabled={!strokes.length}
          onClick={() => onChange(strokes.slice(0, -1))}
          className='inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-fg hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Undo2 aria-hidden className='size-3.5'/>{t('editor.settings.undo_stroke')}
        </button>
        <button
          type='button'
          disabled={!strokes.length}
          onClick={() => onChange([])}
          className='inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-semibold text-danger-text hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Trash2 aria-hidden className='size-3.5'/>{t('editor.settings.clear_drawing')}
        </button>
      </div>
    </div>
  );
}


export function StepSettings({ state, effect, step, pen, setPen, maxStrokes, duration, time }: {
  state: EditorDocumentState,
  effect: EditorEffect,
  step: EditorStep,
  pen: PenSettings,
  setPen: (pen: PenSettings) => void,
  maxStrokes: number,
  // seconds, a video's length for text START/END (0: not a video, those are left out)
  duration: number,
  // Trim and Still Frame's clip, null where the step has none (after a Still Frame)
  time: TimeContext | null,
}) {
  const { t } = useI18n();
  const set = (name: string) => (value: unknown) => state.setParam(step.id, name, value);
  const timeParams = effect.params.filter((param) => param.optional && param.kind === 'number');
  const lockedBy = state.lockedBy(step.id);
  const shown = effect.params.filter((param) => !timeParams.includes(param));

  return (
    <section aria-label={t('editor.settings', {name: effect.name})} className='flex flex-col gap-3 rounded-[10px] border border-line-strong bg-bg p-3.5'>
      <h3 className='text-sm font-bold text-white'>{effect.name}</h3>
      {(lockedBy) ? <p role='status' className='text-xs text-warning'>{t('editor.room.adjusting', {name: lockedBy.username})}</p> : null}
      {/* someone else is dragging it in the activity: their soft lock, it's theirs until they let go */}
      <fieldset disabled={Boolean(lockedBy)} className='contents'>
      {(effect.temporal) ? (
        <p className='flex gap-1.5 text-xs text-subtle'><Timer aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.settings.temporal')}</p>
      ) : null}
      {(effect.ml) ? (
        <p className='flex gap-1.5 text-xs text-subtle'><Sparkles aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.settings.ml')}</p>
      ) : null}
      {(effect.id === STILL_EFFECT_ID) ? (
        <p className='flex gap-1.5 text-xs text-subtle'><ImageIcon aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.settings.still_note')}</p>
      ) : null}
      {(effect.id === TRIM_EFFECT_ID && time) ? (() => {
        const start = Math.min(Number(step.params.start ?? 0), time.duration);
        const end = (typeof step.params.end === 'number') ? Math.min(step.params.end, time.duration) : time.duration;
        return (
          <p className='flex gap-1.5 text-xs text-subtle'>
            <Scissors aria-hidden className='mt-px size-3.5 shrink-0'/>
            {t('editor.settings.trim_keeps', {start: formatSeconds(start), end: formatSeconds(end), length: formatSeconds(Math.max(end - start, 0))})}
          </p>
        );
      })() : null}
      {(!effect.params.length) ? <p className='text-[13px] text-muted'>{t('editor.settings.none')}</p> : null}
      {shown.map((param) => {
        const value = step.params[param.name];
        switch (param.kind) {
          case 'number':
          case 'integer':
          case 'boolean':
          case 'choice':
          case 'color':
          case 'text':
            return <SimpleParamControl key={param.name} param={param} value={value} onChange={set(param.name)}/>;
          case 'time':
            // the part of an uploaded file that's used: the file's control shows it, against the file's length
            if (param.name.startsWith('clip_')) {
              return null;
            }
            return (
              <TimeControl
                key={param.name}
                param={param}
                value={(typeof value === 'number') ? value : null}
                onChange={set(param.name)}
                context={time ?? {duration: 0, fps: 0, current: null}}
              />
            );
          case 'point':
            return <p key={param.name} className='text-[13px] text-muted'>{t('editor.settings.place_point')}</p>;
          case 'box':
            // an overlay's own control says where to place it
            return (effect.id === 'overlay') ? null : <p key={param.name} className='text-[13px] text-muted'>{t('editor.settings.place_box')}</p>;
          case 'media':
            return <OverlayMediaControl key={param.name} state={state} step={step} value={(typeof value === 'string') ? value : null}/>;
          case 'strokes':
            return (
              <DrawControls
                key={param.name}
                strokes={(value as Array<EditorStroke>) ?? []}
                onChange={set(param.name)}
                pen={pen}
                setPen={setPen}
                maxStrokes={maxStrokes}
              />
            );
          default:
            return null;
        }
      })}
      {(timeParams.length && duration > 0) ? (
        <div className='flex gap-2'>
          {timeParams.map((param) => (
            <OptionalTimeControl
              key={param.name}
              param={param}
              value={(typeof step.params[param.name] === 'number') ? step.params[param.name] as number : null}
              onChange={set(param.name)}
              maximum={Math.min(param.maximum ?? 600, Math.ceil(duration * 10) / 10)}
            />
          ))}
        </div>
      ) : null}
      </fieldset>
    </section>
  );
}
