import { Shuffle } from 'lucide-react';
import { useId } from 'react';

import { ColorPicker } from '@/components/ui/ColorPicker';
import { CharCounter, Toggle } from '@/components/ui/form';
import { useI18n } from '@/i18n';

import { paramLabel } from '../stack';
import type { EditorParam } from '../types';


// The controls for an effect's plain settings (numbers, toggles, choices, colors, text), shared by a step's settings and
// the effects on an uploaded file

export const INPUT = 'h-10 w-full rounded-lg border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand';


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
  // a fraction of the width (or any fraction, `percent`) is shown and typed as a percentage
  const percent = param.unit === 'width' || param.unit === 'percent';
  const ofWidth = param.unit === 'width';
  const shown = (percent) ? Math.round(value * 1000) / 10 : value;
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
        <label htmlFor={id} className='text-[13px] text-muted'>
          {paramLabel(param)}{(ofWidth) ? <span className='text-subtle'> · {t('editor.settings.of_width')}</span> : null}
        </label>
        <span className='flex items-center gap-1'>
          <input
            type='number'
            aria-label={(ofWidth) ? `${paramLabel(param)} (${t('editor.settings.of_width')})` : paramLabel(param)}
            value={shown}
            min={(percent) ? minimum * 100 : minimum}
            max={(percent) ? maximum * 100 : maximum}
            step={(percent) ? 1 : sliderStep(param)}
            onChange={(event) => set((percent) ? Number(event.target.value) / 100 : Number(event.target.value))}
            className='h-8 w-20 rounded-md border border-line-strong bg-deep px-2 text-right font-mono text-[13px] text-fg tabular-nums outline-none focus:border-brand'
          />
          {(percent) ? <span aria-hidden className='font-mono text-[13px] text-muted'>%</span> : null}
        </span>
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


// one plain setting, null for the kinds placed on the preview or with controls of their own (time, strokes...)
export function SimpleParamControl({ param, value, onChange }: {param: EditorParam, value: unknown, onChange: (value: unknown) => void}) {
  switch (param.kind) {
    case 'number':
    case 'integer':
      return <NumberControl param={param} value={Number(value ?? param.default)} onChange={onChange}/>;
    case 'boolean':
      return <Toggle checked={Boolean(value)} onChange={onChange} label={paramLabel(param)}/>;
    case 'choice':
      return (
        <label className='flex flex-col gap-1.5 text-[13px] text-muted'>
          {paramLabel(param)}
          <select value={String(value)} onChange={(event) => onChange(event.target.value)} className={INPUT}>
            {(param.choices ?? []).map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
      );
    case 'color':
      return <ColorPicker label={paramLabel(param)} value={String(value ?? param.default)} onChange={onChange}/>;
    case 'text': {
      const text = String(value ?? '');
      const max = param.max_length ?? 200;
      return (
        <label className='flex flex-col gap-1.5 text-[13px] text-muted'>
          <span className='flex justify-between gap-2'>{paramLabel(param)}<CharCounter length={text.length} max={max}/></span>
          <textarea
            rows={2}
            maxLength={max}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            className='min-h-10 w-full resize-y rounded-lg border border-line-strong bg-deep px-2.5 py-2 text-sm text-fg outline-none focus:border-brand'
          />
        </label>
      );
    }
    default:
      return null;
  }
}
