import { Shuffle, Sigma } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { ColorPicker } from '@/components/ui/ColorPicker';
import { CharCounter, Toggle } from '@/components/ui/form';
import { useI18n } from '@/i18n';

import { evaluateFormula, isFormula, MAX_FORMULA_LENGTH, useFormulaContext } from '../formulas';
import { paramLabel } from '../stack';
import type { EditorParam } from '../types';


// The controls for an effect's plain settings (numbers, toggles, choices, colors, text), shared by a step's settings and
// the effects on an uploaded file

export const INPUT = 'h-10 w-full rounded-lg border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand';


// A field's `data-state`: `synced` shows the step's value, `typing` what's being typed, `refused` the same while the
// step's last change was turned down
export type FieldState = 'synced' | 'typing' | 'refused';

// What a field shows while it's typed in: the text as typed, not the step's value. Every change still goes out as it's
// made (the preview follows, the others in a room see it), but in a room each one is an op the api checks, and one it
// refuses (emptied text, half a formula) puts the step back to the last value it took: the field used to snap back to
// that under the cursor, and a number box rewrote itself to its clamped value mid-number. The draft goes when the field
// is left (`drop`), it shows the step's value again then.
// `refused`: the step's last change was turned down (its `stepError`)
export function useFieldDraft(value: string, refused: boolean = false) {
  const [ draft, setDraft ] = useState<string | null>(null);
  const state: FieldState = (draft === null) ? 'synced' : (refused) ? 'refused' : 'typing';
  return {text: draft ?? value, state, type: (text: string) => setDraft(text), drop: () => setDraft(null)};
}


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
function FormulaNumberControl({ param, value, onChange, refused }: {param: EditorParam, value: unknown, onChange: (value: unknown) => void, refused: boolean}) {
  const { t } = useI18n();
  const id = useId();
  const { values, range } = useFormulaContext();
  // a Value step's number: its own range, not the catalogue's
  const ranged = (range && param.name === 'number') ? {...param, minimum: range.minimum, maximum: range.maximum} : param;
  const formula = isFormula(value);
  const canSwitch = Boolean(param.formula) && (formula || values.size > 0);
  // the formula as it's being typed (`useFieldDraft`), what it comes to is said for that
  const draft = useFieldDraft((formula) ? value.expr : '', refused);
  const dropDraft = draft.drop;
  // no formula anymore (someone in the room switched it back to a number while this was being typed): its box went
  // without a blur, what was typed in it isn't the next formula's
  useEffect(() => {
    if (!formula) {
      dropDraft();
    }
    // (only on the switch: `dropDraft` is new every render and only sets state)
  }, [formula]);
  const result = (formula) ? evaluateFormula(draft.text, values) : null;
  const clamp = (number: number) => Math.min(Math.max(number, ranged.minimum ?? -Infinity), ranged.maximum ?? Infinity);
  const toggle = (canSwitch) ? (
    <button
      type='button'
      aria-pressed={formula}
      title={(formula) ? t('editor.formula.off') : t('editor.formula.on')}
      aria-label={(formula) ? t('editor.formula.off') : t('editor.formula.on')}
      onClick={() => {
        draft.drop();
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
    return <NumberControl param={ranged} value={Number(value ?? param.default)} onChange={onChange} extra={toggle} refused={refused}/>;
  }
  return (
    <div data-state={draft.state} className='flex flex-col gap-1.5'>
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
        value={draft.text}
        maxLength={MAX_FORMULA_LENGTH}
        spellCheck={false}
        autoComplete='off'
        onChange={(event) => {
          draft.type(event.target.value);
          onChange({expr: event.target.value});
        }}
        onBlur={draft.drop}
        className={`${INPUT} font-mono`}
      />
      <span className='flex flex-wrap gap-1'>
        {[...values.keys()].map((name) => (
          <button
            key={name}
            type='button'
            onClick={() => {
              // onto what's in the box (a tap doesn't always take the focus from it), which then shows the step's again
              const expr = `${draft.text} ${name}`.trim();
              draft.drop();
              onChange({expr});
            }}
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


function NumberControl({ param, value, onChange, extra = null, refused = false }: {param: EditorParam, value: number, onChange: (value: number) => void, extra?: React.ReactNode, refused?: boolean}) {
  const { t } = useI18n();
  const id = useId();
  const minimum = param.minimum ?? 0;
  const maximum = param.maximum ?? 100;
  const isSeed = param.name === 'seed';
  // a fraction of the width (or any fraction, `percent`) is shown and typed as a percentage
  const percent = param.unit === 'width' || param.unit === 'percent';
  const ofWidth = param.unit === 'width';
  const shown = (percent) ? Math.round(value * 1000) / 10 : value;
  // the box while it's typed in: `3` on the way to `30` isn't rewritten to the minimum, a cleared box stays cleared
  const draft = useFieldDraft(String(shown), refused);
  const set = (next: number) => {
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(Math.max(next, minimum), maximum);
    onChange((param.kind === 'integer') ? Math.round(clamped) : Math.round(clamped * 10000) / 10000);
  };
  return (
    <div data-state={draft.state} className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <label htmlFor={id} className='text-[13px] text-muted'>
          {paramLabel(param)}{(ofWidth) ? <span className='text-subtle'> · {t('editor.settings.of_width')}</span> : null}
        </label>
        <span className='flex items-center gap-1'>
          <input
            type='number'
            aria-label={(ofWidth) ? `${paramLabel(param)} (${t('editor.settings.of_width')})` : paramLabel(param)}
            value={draft.text}
            min={(percent) ? minimum * 100 : minimum}
            max={(percent) ? maximum * 100 : maximum}
            step={(percent) ? 1 : sliderStep(param)}
            onChange={(event) => {
              const text = event.target.value;
              draft.type(text);
              // the setting takes the number so far (kept in its range), the box keeps what was typed. Nothing typed
              // yet, or half a number (`-`), changes nothing
              if (text.trim() && Number.isFinite(Number(text))) {
                set((percent) ? Number(text) / 100 : Number(text));
              }
            }}
            // leaving it or Enter: it shows the setting's own value again
            onBlur={draft.drop}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                draft.drop();
              }
            }}
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
          onChange={(event) => {
            // the box shows the slider's value, whatever was typed in it: a finger on the slider doesn't take the
            // focus from the box, which kept its old number (and its arrows then stepped from that)
            draft.drop();
            set(Number(event.target.value));
          }}
          className='min-w-0 flex-1 accent-brand'
        />
        {(isSeed) ? (
          <button
            type='button'
            onClick={() => {
              // (like the slider: a tap here doesn't always take the focus from the box)
              draft.drop();
              set(Math.floor(minimum + Math.random() * (Math.min(maximum, 1_000_000) - minimum + 1)));
            }}
            className='inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-[13px] font-semibold text-fg hover:bg-surface-3'
          >
            <Shuffle aria-hidden className='size-3.5'/>{t('editor.settings.shuffle')}
          </button>
        ) : null}
      </div>
    </div>
  );
}


// a text setting, shown as it's typed (`useFieldDraft`)
function TextControl({ param, value, onChange, refused }: {param: EditorParam, value: unknown, onChange: (value: unknown) => void, refused: boolean}) {
  const draft = useFieldDraft(String(value ?? ''), refused);
  const max = param.max_length ?? 200;
  return (
    <label data-state={draft.state} className='flex flex-col gap-1.5 text-[13px] text-muted'>
      <span className='flex justify-between gap-2'>{paramLabel(param)}<CharCounter length={draft.text.length} max={max}/></span>
      <textarea
        rows={2}
        maxLength={max}
        value={draft.text}
        onChange={(event) => {
          draft.type(event.target.value);
          onChange(event.target.value);
        }}
        onBlur={draft.drop}
        className='min-h-10 w-full resize-y rounded-lg border border-line-strong bg-deep px-2.5 py-2 text-sm text-fg outline-none focus:border-brand'
      />
    </label>
  );
}


// one plain setting, null for the kinds placed on the preview or with controls of their own (time, strokes...).
// `refused`: its step's last change was turned down, a field being typed in says so (`data-state`)
export function SimpleParamControl({ param, value, onChange, refused = false }: {param: EditorParam, value: unknown, onChange: (value: unknown) => void, refused?: boolean}) {
  switch (param.kind) {
    case 'number':
    case 'integer':
      return <FormulaNumberControl param={param} value={value} onChange={onChange} refused={refused}/>;
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
    case 'text':
      return <TextControl param={param} value={value} onChange={onChange} refused={refused}/>;
    case 'point':
    case 'box':
    case 'strokes':
    case 'time':
    case 'media':
    case 'steps':
      return null;
    default: {
      // a kind this build doesn't know (the catalogue is the api's) shows nothing. One added to `EditorParamKind`
      // doesn't compile until it has a case here
      const unknown: never = param.kind;
      void unknown;
      return null;
    }
  }
}
