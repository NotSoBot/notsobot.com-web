import { Shuffle, Sparkles, Timer, Undo2, Trash2 } from 'lucide-react';
import { useId } from 'react';

import { CharCounter, Toggle } from '@/components/ui/form';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { paramLabel } from '../stack';
import type { EditorEffect, EditorParam, EditorStep, EditorStroke } from '../types';
import type { EditorDocumentState } from '../useEditorDocument';
import type { PenSettings } from './SpatialOverlay';


const INPUT = 'h-10 w-full rounded-lg border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand';
const PEN_WIDTHS = [0.005, 0.01, 0.02, 0.04];


// a slider's step: whole numbers for integers, about a hundredth of the range otherwise
function sliderStep(param: EditorParam): number {
  if (param.kind === 'integer') {
    return 1;
  }
  const range = (param.maximum ?? 1) - (param.minimum ?? 0);
  const raw = range / 100;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return Math.max(magnitude, 0.0001);
}


function NumberControl({ param, value, onChange }: {param: EditorParam, value: number, onChange: (value: number) => void}) {
  const { t } = useI18n();
  const id = useId();
  const minimum = param.minimum ?? 0;
  const maximum = param.maximum ?? 100;
  const isSeed = param.name === 'seed';
  const set = (next: number) => {
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(Math.max(next, minimum), maximum);
    onChange((param.kind === 'integer') ? Math.round(clamped) : Math.round(clamped * 10000) / 10000);
  };
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <label htmlFor={id} className='text-[13px] text-muted'>{paramLabel(param)}</label>
        <input
          type='number'
          aria-label={paramLabel(param)}
          value={value}
          min={minimum}
          max={maximum}
          step={sliderStep(param)}
          onChange={(event) => set(Number(event.target.value))}
          className='h-8 w-24 rounded-md border border-line-strong bg-deep px-2 text-right font-mono text-[13px] text-fg tabular-nums outline-none focus:border-brand'
        />
      </div>
      <div className='flex items-center gap-2'>
        <input
          id={id}
          type='range'
          min={minimum}
          max={maximum}
          step={sliderStep(param)}
          value={value}
          onChange={(event) => set(Number(event.target.value))}
          className='min-w-0 flex-1 accent-brand'
        />
        {(isSeed) ? (
          <button
            type='button'
            onClick={() => set(Math.floor(minimum + Math.random() * (Math.min(maximum, 1_000_000) - minimum + 1)))}
            className='inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-[13px] font-semibold text-fg hover:bg-surface-3'
          >
            <Shuffle aria-hidden className='size-3.5'/>{t('editor.settings.shuffle')}
          </button>
        ) : null}
      </div>
    </div>
  );
}


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


function DrawControls({ strokes, onChange, pen, setPen, maxStrokes }: {
  strokes: Array<EditorStroke>,
  onChange: (value: Array<EditorStroke>) => void,
  pen: PenSettings,
  setPen: (pen: PenSettings) => void,
  maxStrokes: number,
}) {
  const { t } = useI18n();
  const colorId = useId();
  return (
    <div className='flex flex-col gap-3'>
      <p className='text-[13px] text-muted'>{t('editor.settings.draw')}</p>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1.5'>
          <label htmlFor={colorId} className='text-[13px] text-muted'>{t('editor.settings.pen_color')}</label>
          <input id={colorId} type='color' value={pen.color.slice(0, 7)} onChange={(event) => setPen({...pen, color: event.target.value})} className='h-10 w-14 cursor-pointer rounded-lg border border-line-strong bg-deep p-1'/>
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


export function StepSettings({ state, effect, step, pen, setPen, maxStrokes, duration }: {
  state: EditorDocumentState,
  effect: EditorEffect,
  step: EditorStep,
  pen: PenSettings,
  setPen: (pen: PenSettings) => void,
  maxStrokes: number,
  // seconds, a video's length for text START/END (0: not a video, those are left out)
  duration: number,
}) {
  const { t } = useI18n();
  const set = (name: string) => (value: unknown) => state.setParam(step.id, name, value);
  const timeParams = effect.params.filter((param) => param.optional && param.kind === 'number');
  const shown = effect.params.filter((param) => !timeParams.includes(param));

  return (
    <section aria-label={t('editor.settings', {name: effect.name})} className='flex flex-col gap-3 rounded-[10px] border border-line-strong bg-bg p-3.5'>
      <h3 className='text-sm font-bold text-white'>{effect.name}</h3>
      {(effect.temporal) ? (
        <p className='flex gap-1.5 text-xs text-subtle'><Timer aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.settings.temporal')}</p>
      ) : null}
      {(effect.ml) ? (
        <p className='flex gap-1.5 text-xs text-subtle'><Sparkles aria-hidden className='mt-px size-3.5 shrink-0'/>{t('editor.settings.ml')}</p>
      ) : null}
      {(!effect.params.length) ? <p className='text-[13px] text-muted'>{t('editor.settings.none')}</p> : null}
      {shown.map((param) => {
        const value = step.params[param.name];
        switch (param.kind) {
          case 'number':
          case 'integer':
            return <NumberControl key={param.name} param={param} value={Number(value ?? param.default)} onChange={set(param.name)}/>;
          case 'boolean':
            return <Toggle key={param.name} checked={Boolean(value)} onChange={set(param.name)} label={paramLabel(param)}/>;
          case 'choice':
            return (
              <label key={param.name} className='flex flex-col gap-1.5 text-[13px] text-muted'>
                {paramLabel(param)}
                <select value={String(value)} onChange={(event) => set(param.name)(event.target.value)} className={INPUT}>
                  {(param.choices ?? []).map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}
                </select>
              </label>
            );
          case 'color':
            return (
              <label key={param.name} className='flex items-center justify-between gap-2 text-[13px] text-muted'>
                {paramLabel(param)}
                <input type='color' value={String(value).slice(0, 7)} onChange={(event) => set(param.name)(event.target.value)} className='h-10 w-14 cursor-pointer rounded-lg border border-line-strong bg-deep p-1'/>
              </label>
            );
          case 'text': {
            const text = String(value ?? '');
            const max = param.max_length ?? 200;
            return (
              <label key={param.name} className='flex flex-col gap-1.5 text-[13px] text-muted'>
                <span className='flex justify-between gap-2'>{paramLabel(param)}<CharCounter length={text.length} max={max}/></span>
                <textarea
                  rows={2}
                  maxLength={max}
                  value={text}
                  onChange={(event) => set(param.name)(event.target.value)}
                  className='min-h-10 w-full resize-y rounded-lg border border-line-strong bg-deep px-2.5 py-2 text-sm text-fg outline-none focus:border-brand'
                />
              </label>
            );
          }
          case 'point':
            return <p key={param.name} className='text-[13px] text-muted'>{t('editor.settings.place_point')}</p>;
          case 'box':
            return <p key={param.name} className='text-[13px] text-muted'>{t('editor.settings.place_box')}</p>;
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
    </section>
  );
}
