import { Pipette } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { useI18n } from '@/i18n';
import { COLOR_FORMATS, formatColor, hsvaToRgba, parseColor, rgbaToHsva, toHex, type ColorFormat, type Hsva } from '@/lib/color';
import { cn } from '@/lib/utils';


// Our own color picker, the browser's (`<input type=color>`) can't be styled and looks different everywhere. A swatch
// button opens a panel under it (not a popup, it sits in narrow sidebars and Discord's Activity frame): a
// saturation/brightness square, hue and opacity sliders, one box that reads any color pasted into it, presets and the
// screen eyedropper where the browser has one. `value` is `#rrggbb`, or `#rrggbbaa` with `alpha`


const PRESETS = ['#ffffff', '#000000', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#af52de', '#ff2d55'];
const FORMAT_KEY = 'colorPicker:format';
const CHECKERBOARD = 'repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 10px 10px';

interface EyeDropperResult { sRGBHex: string }
interface EyeDropperConstructor { new (): {open: () => Promise<EyeDropperResult>} }


function readFormat(): ColorFormat {
  try {
    const stored = localStorage.getItem(FORMAT_KEY);
    return (COLOR_FORMATS.includes(stored as ColorFormat)) ? stored as ColorFormat : 'hex';
  } catch {
    return 'hex';
  }
}


// fractions (0-1) of the element under a pointer, while it's held down
function dragHandlers(onMove: (x: number, y: number) => void) {
  const move = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / Math.max(rect.height, 1), 0), 1);
    onMove(x, y);
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // a pointer the browser no longer tracks, the drag still follows moves over the element
      }
      event.currentTarget.focus();
      move(event);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId) || event.buttons === 1) {
        move(event);
      }
    },
  };
}


function Slider({ label, value, maximum, step, background, thumb, onChange, valueText }: {
  label: string,
  value: number,
  maximum: number,
  step: number,
  background: string,
  thumb: string,
  onChange: (value: number) => void,
  valueText: string,
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = (event.key === 'ArrowRight' || event.key === 'ArrowUp') ? step : (event.key === 'ArrowLeft' || event.key === 'ArrowDown') ? -step : 0;
    if (delta) {
      event.preventDefault();
      onChange(Math.min(Math.max(value + delta * ((event.shiftKey) ? 10 : 1), 0), maximum));
    }
  };
  return (
    <div
      role='slider'
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      onKeyDown={onKeyDown}
      {...dragHandlers((x) => onChange(x * maximum))}
      className='relative h-3 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
      style={{background}}
    >
      <span
        aria-hidden
        className='pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]'
        style={{left: `${(value / maximum) * 100}%`, background: thumb}}
      />
    </div>
  );
}


export function ColorPicker({ value, onChange, label, alpha = false, children }: {
  value: string,
  onChange: (value: string) => void,
  label: string,
  // keeps transparency (`#rrggbbaa`) and shows the opacity slider
  alpha?: boolean,
  // shown after the swatch button, on the same row
  children?: ReactNode,
}) {
  const { t } = useI18n();
  const panelId = useId();
  const inputId = useId();
  const formatId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ open, setOpen ] = useState(false);
  const [ format, setFormatState ] = useState<ColorFormat>(readFormat);
  // the box while it's being typed in, null shows the color in the picked format
  const [ text, setText ] = useState<string | null>(null);
  const [ invalid, setInvalid ] = useState(false);
  // hue and saturation live here: a hex of black or grey has none, dragging through them shouldn't lose the hue
  const [ hsva, setHsva ] = useState<Hsva>(() => rgbaToHsva(parseColor(value) ?? {r: 255, g: 255, b: 255, a: 1}));
  const emittedRef = useRef(value);

  useEffect(() => {
    // changed from outside (undo, another person in the Activity): follow it
    if (value !== emittedRef.current) {
      emittedRef.current = value;
      const parsed = parseColor(value);
      if (parsed) {
        setHsva(rgbaToHsva(parsed));
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const rgba = hsvaToRgba(hsva);
  const hex = toHex(rgba, alpha);
  const emit = (next: Hsva) => {
    const bounded = (alpha) ? next : {...next, a: 1};
    setHsva(bounded);
    const nextHex = toHex(hsvaToRgba(bounded), alpha);
    if (nextHex !== emittedRef.current) {
      emittedRef.current = nextHex;
      onChange(nextHex);
    }
  };
  const emitText = (input: string) => {
    const parsed = parseColor(input);
    if (!parsed) {
      return false;
    }
    const next = rgbaToHsva(parsed);
    // a grey keeps the hue it had
    emit({...next, h: (next.s) ? next.h : hsva.h});
    return true;
  };
  const setFormat = (next: ColorFormat) => {
    setFormatState(next);
    setText(null);
    try {
      localStorage.setItem(FORMAT_KEY, next);
    } catch {
      // private window or blocked storage, the format is only remembered for this picker
    }
  };

  const hueColor = `hsl(${Math.round(hsva.h)}, 100%, 50%)`;
  const solid = toHex({...rgba, a: 1}, false);
  const EyeDropper = (typeof window !== 'undefined') ? (window as unknown as {EyeDropper?: EyeDropperConstructor}).EyeDropper : undefined;

  return (
    <div
      ref={rootRef}
      className='flex flex-col gap-2'
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[13px] text-muted'>{label}</span>
        {children}
        <button
          type='button'
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${label}: ${hex}`}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-lg border bg-deep pr-2.5 pl-1.5 font-mono text-[13px] text-fg transition-colors hover:bg-surface-3',
            (open) ? 'border-brand' : 'border-line-strong',
          )}
        >
          <span className='size-7 overflow-hidden rounded-md border border-white/20' style={{background: CHECKERBOARD}}>
            <span className='block size-full' style={{background: hex}}/>
          </span>
          {hex}
        </button>
      </div>

      {(open) ? (
        <div id={panelId} className='flex flex-col gap-3 rounded-lg border border-line-strong bg-deep p-3'>
          <div
            role='slider'
            tabIndex={0}
            aria-label={t('ui.color.saturation')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsva.s * 100)}
            aria-valuetext={t('ui.color.saturation_value', {saturation: Math.round(hsva.s * 100), brightness: Math.round(hsva.v * 100)})}
            onKeyDown={(event) => {
              const step = (event.shiftKey) ? 0.1 : 0.01;
              const moves: Record<string, [number, number]> = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step]};
              const move = moves[event.key];
              if (move) {
                event.preventDefault();
                emit({...hsva, s: Math.min(Math.max(hsva.s + move[0], 0), 1), v: Math.min(Math.max(hsva.v + move[1], 0), 1)});
              }
            }}
            {...dragHandlers((x, y) => emit({...hsva, s: x, v: 1 - y}))}
            className='relative h-36 cursor-crosshair touch-none overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand'
            style={{background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`}}
          >
            <span
              aria-hidden
              className='pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]'
              style={{left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, background: solid}}
            />
          </div>

          <Slider
            label={t('ui.color.hue')}
            value={hsva.h}
            maximum={359}
            step={1}
            background='linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)'
            thumb={hueColor}
            onChange={(h) => emit({...hsva, h})}
            valueText={`${Math.round(hsva.h)}°`}
          />
          {(alpha) ? (
            <Slider
              label={t('ui.color.opacity')}
              value={hsva.a * 100}
              maximum={100}
              step={1}
              background={`linear-gradient(to right, transparent, ${solid}), ${CHECKERBOARD}`}
              thumb={hex}
              onChange={(a) => emit({...hsva, a: Math.round(a) / 100})}
              valueText={`${Math.round(hsva.a * 100)}%`}
            />
          ) : null}

          <div className='flex gap-2'>
            <label htmlFor={formatId} className='sr-only'>{t('ui.color.format')}</label>
            <select
              id={formatId}
              value={format}
              onChange={(event) => setFormat(event.target.value as ColorFormat)}
              className='h-9 shrink-0 rounded-md border border-line-strong bg-surface px-2 text-[13px] text-fg outline-none focus:border-brand'
            >
              {COLOR_FORMATS.map((item) => <option key={item} value={item}>{t(`ui.color.formats.${item}`)}</option>)}
            </select>
            <label htmlFor={inputId} className='sr-only'>{t('ui.color.value')}</label>
            <input
              id={inputId}
              value={text ?? formatColor(rgba, format, alpha)}
              spellCheck={false}
              autoComplete='off'
              aria-invalid={invalid}
              aria-describedby={`${inputId}-hint`}
              onChange={(event) => {
                setText(event.target.value);
                // any format works whatever's picked, it applies as soon as it reads as a color
                setInvalid(!emitText(event.target.value) && Boolean(event.target.value.trim()));
              }}
              onFocus={(event) => event.target.select()}
              onBlur={() => {
                setText(null);
                setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              className={cn(
                'h-9 min-w-0 flex-1 rounded-md border bg-surface px-2 font-mono text-[13px] text-fg outline-none',
                (invalid) ? 'border-danger focus:border-danger' : 'border-line-strong focus:border-brand',
              )}
            />
          </div>
          <p id={`${inputId}-hint`} className={cn('-mt-1.5 text-xs', (invalid) ? 'text-danger-text' : 'text-subtle')}>
            {(invalid) ? t('ui.color.invalid') : t('ui.color.hint')}
          </p>

          <div className='flex flex-wrap items-center gap-1.5'>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type='button'
                aria-label={t('ui.color.preset', {color: preset})}
                title={preset}
                onClick={() => emitText(preset)}
                className={cn('size-7 rounded-md border hover:scale-110', (solid === preset) ? 'border-brand ring-2 ring-brand/50' : 'border-white/20')}
                style={{background: preset}}
              />
            ))}
            {(EyeDropper) ? (
              <button
                type='button'
                aria-label={t('ui.color.eyedropper')}
                title={t('ui.color.eyedropper')}
                onClick={() => {
                  new EyeDropper().open().then((result) => emitText(result.sRGBHex)).catch(() => {
                    // closed with Escape, nothing picked
                  });
                }}
                className='ml-auto flex size-8 items-center justify-center rounded-md border border-line-strong text-muted hover:bg-surface-3 hover:text-fg'
              >
                <Pipette aria-hidden className='size-4'/>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
