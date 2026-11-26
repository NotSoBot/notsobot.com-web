import { Shuffle, Sigma } from 'lucide-react';
import { useId } from 'react';

import { ColorPicker } from '@/components/ui/ColorPicker';
import { CharCounter, Toggle } from '@/components/ui/form';
import { useI18n } from '@/i18n';

import { evaluateFormula, isFormula, MAX_FORMULA_LENGTH, useFormulaContext } from '../formulas';
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


// A number setting that can also be a formula on values (`param.formula`, when a Value step comes before it): Σ switches
// between the slider and the formula, which shows what it comes to now
function FormulaNumberControl({ param, value, onChange }: {param: EditorParam, value: unknown, onChange: (value: unknown) => void}) {
  const { t } = useI18n();
  const id = useId();
  const { values, range } = useFormulaContext();
  // a Value step's number: its own range, not the catalogue's
  const ranged = (range && param.name === 'number') ? {...param, minimum: range.minimum, maximum: range.maximum} : param;
  const formula = isFormula(value);
  const canSwitch = Boolean(param.formula) && (formula || values.size > 0);
  const result = (formula) ? evaluateFormula(value.expr, values) : null;
  const clamp = (number: number) => Math.min(Math.max(number, ranged.minimum ?? -Infinity), ranged.maximum ?? Infinity);
  const toggle = (canSwitch) ? (
    <button
      type='button'
      aria-pressed={formula}
      title={(formula) ? t('editor.formula.off') : t('editor.formula.on')}
      aria-label={(formula) ? t('editor.formula.off') : t('editor.formula.on')}
      onClick={() => {
        if (formula) {
          onChange((result !== null) ? clamp(result) : param.default);
        } else {
          onChange({expr: [...values.keys()][0] ?? String(value ?? param.default)});
        }
      }}
      className={(formula) ? 'flex size-8 items-center justify-center rounded-md bg-brand text-white' : 'flex size-8 items-center justify-center rounded-md border border-line-strong text-muted hover:text-fg'}
    >
      <Sigma aria-hidden className='size-4'/>
    </button>
  ) : null;
  if (!formula) {
    return <NumberControl param={ranged} value={Number(value ?? param.default)} onChange={onChange} extra={toggle}/>;
  }
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <label htmlFor={id} className='text-[13px] text-muted'>{paramLabel(param)}</label>
        <span className='flex items-center gap-1.5'>
          <span className={(result === null) ? 'font-mono text-[13px] text-danger-text' : 'font-mono text-[13px] text-fg tabular-nums'}>
            {(result === null) ? t('editor.formula.invalid') : `= ${Math.round(clamp(result) * 1000) / 1000}`}
          </span>
          {toggle}
        </span>
      </div>
      <input
        id={id}
        value={value.expr}
        maxLength={MAX_FORMULA_LENGTH}
        spellCheck={false}
        autoComplete='off'
        onChange={(event) => onChange({expr: event.target.value})}
        className={`${INPUT} font-mono`}
      />
      <span className='flex flex-wrap gap-1'>
        {[...values.keys()].map((name) => (
          <button
            key={name}
            type='button'
            onClick={() => onChange({expr: `${value.expr} ${name}`.trim()})}
            className='rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-xs text-muted hover:text-fg'
          >
            {name}
          </button>
        ))}
        <span className='text-xs text-subtle'>{t('editor.formula.hint')}</span>
      </span>
    </div>
  );
}


function NumberControl({ param, value, onChange, extra = null }: {param: EditorParam, value: number, onChange: (value: number) => void, extra?: React.ReactNode}) {
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
          {extra}
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
      return <FormulaNumberControl param={param} value={value} onChange={onChange}/>;
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
