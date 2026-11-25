import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { clamp, roundFraction, type SpatialTool } from '../stack';
import type { EditorBox, EditorPoint, EditorStep, EditorStroke } from '../types';


// The selected step's spatial param drawn over the preview (which shows what goes into that step), in fractions of
// it. Text and drawings are drawn here roughly so they can be placed, the real look comes from the api's preview


export interface PenSettings {
  color: string,
  width: number,
}

// a point closer than this to the last one isn't kept, a stroke stays well under the api's 500 points
const MIN_POINT_DISTANCE = 0.004;
const NUDGE = 0.01;
const NUDGE_LARGE = 0.1;
const MIN_BOX = 0.02;


function fractionOf(event: {clientX: number, clientY: number}, element: HTMLElement): EditorPoint {
  const rect = element.getBoundingClientRect();
  return {
    x: roundFraction((event.clientX - rect.left) / Math.max(rect.width, 1)),
    y: roundFraction((event.clientY - rect.top) / Math.max(rect.height, 1)),
  };
}


function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ width, setWidth ] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => setWidth(element.getBoundingClientRect().width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ ref, width ] as const;
}


function nudgeOf(event: KeyboardEvent): EditorPoint | null {
  const step = (event.shiftKey) ? NUDGE_LARGE : NUDGE;
  switch (event.key) {
    case 'ArrowLeft': return {x: -step, y: 0};
    case 'ArrowRight': return {x: step, y: 0};
    case 'ArrowUp': return {x: 0, y: -step};
    case 'ArrowDown': return {x: 0, y: step};
    default: return null;
  }
}


function PointTool({ step, param, onChange, label }: {
  step: EditorStep,
  param: string,
  onChange: (value: EditorPoint) => void,
  label: string,
}) {
  const [ containerRef, width ] = useElementWidth<HTMLDivElement>();
  const point = step.params[param] as EditorPoint;
  const text = String(step.params.text ?? '');
  const size = (typeof step.params.size === 'number') ? step.params.size : 0.08;
  const color = (typeof step.params.color === 'string') ? step.params.color : '#ffffff';
  const dragRef = useRef<{dx: number, dy: number} | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = fractionOf(event, container);
    dragRef.current = {dx: point.x - at.x, dy: point.y - at.y};
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const container = containerRef.current;
    if (!dragRef.current || !container) {
      return;
    }
    const at = fractionOf(event, container);
    onChange({x: roundFraction(at.x + dragRef.current.dx), y: roundFraction(at.y + dragRef.current.dy)});
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nudge = nudgeOf(event);
    if (nudge) {
      event.preventDefault();
      onChange({x: roundFraction(point.x + nudge.x), y: roundFraction(point.y + nudge.y)});
    }
  };

  return (
    <div ref={containerRef} className='absolute inset-0'>
      <button
        type='button'
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragRef.current = null)}
        onPointerCancel={() => (dragRef.current = null)}
        onKeyDown={onKeyDown}
        className='absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none rounded border-2 border-dashed border-white/90 px-1 font-bold whitespace-nowrap shadow-[0_0_0_1px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-brand'
        style={{
          left: `${point.x * 100}%`,
          top: `${point.y * 100}%`,
          color,
          fontSize: Math.max(10, size * width),
          lineHeight: 1.1,
          WebkitTextStroke: '1px #000',
        }}
      >
        {text || ' '}
      </button>
    </div>
  );
}


type BoxHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function BoxTool({ step, param, onChange, label, dim }: {
  step: EditorStep,
  param: string,
  onChange: (value: EditorBox) => void,
  label: string,
  // crop: darken what's cut away
  dim: boolean,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const box = step.params[param] as EditorBox;
  const dragRef = useRef<{handle: BoxHandle, start: EditorPoint, box: EditorBox} | null>(null);

  const resize = (handle: BoxHandle, start: EditorBox, dx: number, dy: number): EditorBox => {
    if (handle === 'move') {
      return {
        ...start,
        x: roundFraction(clamp(start.x + dx, 0, 1 - start.width)),
        y: roundFraction(clamp(start.y + dy, 0, 1 - start.height)),
      };
    }
    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;
    if (handle === 'nw' || handle === 'sw') {
      left = clamp(left + dx, 0, right - MIN_BOX);
    } else {
      right = clamp(right + dx, left + MIN_BOX, 1);
    }
    if (handle === 'nw' || handle === 'ne') {
      top = clamp(top + dy, 0, bottom - MIN_BOX);
    } else {
      bottom = clamp(bottom + dy, top + MIN_BOX, 1);
    }
    return {x: roundFraction(left), y: roundFraction(top), width: roundFraction(right - left), height: roundFraction(bottom - top)};
  };

  const start = (handle: BoxHandle) => (event: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {handle, start: fractionOf(event, container), box};
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    const drag = dragRef.current;
    if (!drag || !container) {
      return;
    }
    const at = fractionOf(event, container);
    onChange(resize(drag.handle, drag.box, at.x - drag.start.x, at.y - drag.start.y));
  };
  const end = () => {
    dragRef.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nudge = nudgeOf(event);
    if (nudge) {
      event.preventDefault();
      // alt resizes from the bottom right corner, plain arrows move it
      onChange(resize((event.altKey) ? 'se' : 'move', box, nudge.x, nudge.y));
    }
  };

  const handles: Array<{handle: BoxHandle, x: number, y: number, cursor: string}> = [
    {handle: 'nw', x: box.x, y: box.y, cursor: 'nwse-resize'},
    {handle: 'ne', x: box.x + box.width, y: box.y, cursor: 'nesw-resize'},
    {handle: 'sw', x: box.x, y: box.y + box.height, cursor: 'nesw-resize'},
    {handle: 'se', x: box.x + box.width, y: box.y + box.height, cursor: 'nwse-resize'},
  ];

  return (
    <div ref={containerRef} className='absolute inset-0 touch-none' onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      {(dim) ? (
        <svg aria-hidden className='pointer-events-none absolute inset-0 size-full' viewBox='0 0 1 1' preserveAspectRatio='none'>
          <path
            fillRule='evenodd'
            fill='rgba(0,0,0,0.55)'
            d={`M0 0H1V1H0Z M${box.x} ${box.y}V${box.y + box.height}H${box.x + box.width}V${box.y}Z`}
          />
        </svg>
      ) : null}
      <button
        type='button'
        aria-label={label}
        onPointerDown={start('move')}
        onPointerMove={move}
        onPointerUp={end}
        onKeyDown={onKeyDown}
        className='absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
        style={{left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`}}
      />
      {handles.map(({ handle, x, y, cursor }) => (
        <span
          key={handle}
          aria-hidden
          onPointerDown={start(handle)}
          onPointerMove={move}
          onPointerUp={end}
          className='absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-brand bg-white'
          style={{left: `${x * 100}%`, top: `${y * 100}%`, cursor}}
        />
      ))}
    </div>
  );
}


function strokePath(points: Array<[number, number]>, aspect: number): string {
  return points.map(([ x, y ], index) => `${(index) ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(y * 1000 * aspect).toFixed(1)}`).join(' ');
}

function StrokesTool({ step, param, onChange, pen, aspect, maxStrokes, maxPoints, label }: {
  step: EditorStep,
  param: string,
  onChange: (value: Array<EditorStroke>) => void,
  pen: PenSettings,
  aspect: number,
  maxStrokes: number,
  maxPoints: number,
  label: string,
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const strokes = (step.params[param] as Array<EditorStroke>) ?? [];
  const [ current, setCurrent ] = useState<EditorStroke | null>(null);
  const full = maxStrokes <= strokes.length;

  const pointOf = (event: PointerEvent<SVGSVGElement>): [number, number] => {
    const at = fractionOf(event, event.currentTarget as unknown as HTMLElement);
    return [at.x, at.y];
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (full || event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setCurrent({color: pen.color, width: pen.width, points: [pointOf(event)]});
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!current) {
      return;
    }
    const [ x, y ] = pointOf(event);
    const [ lastX, lastY ] = current.points[current.points.length - 1];
    if (Math.hypot(x - lastX, y - lastY) < MIN_POINT_DISTANCE || maxPoints <= current.points.length) {
      return;
    }
    setCurrent({...current, points: [...current.points, [x, y]]});
  };
  const onPointerUp = () => {
    if (current) {
      onChange([...strokes, current]);
    }
    setCurrent(null);
  };

  const height = 1000 * aspect;
  const all = (current) ? [...strokes, current] : strokes;
  return (
    <svg
      ref={svgRef}
      role='img'
      aria-label={label}
      viewBox={`0 0 1000 ${height}`}
      preserveAspectRatio='none'
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn('absolute inset-0 size-full touch-none', (full) ? 'cursor-not-allowed' : 'cursor-crosshair')}
    >
      {all.map((stroke, index) => (
        (stroke.points.length === 1) ? (
          <circle
            key={index}
            cx={stroke.points[0][0] * 1000}
            cy={stroke.points[0][1] * height}
            r={stroke.width * 500}
            fill={stroke.color.slice(0, 7)}
          />
        ) : (
          <path
            key={index}
            d={strokePath(stroke.points, aspect)}
            fill='none'
            stroke={stroke.color.slice(0, 7)}
            strokeWidth={stroke.width * 1000}
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        )
      ))}
    </svg>
  );
}


export function SpatialOverlay({ tool, step, effectName, onChange, pen, aspect, maxStrokes, maxPoints }: {
  tool: SpatialTool,
  step: EditorStep,
  effectName: string,
  onChange: (param: string, value: unknown) => void,
  pen: PenSettings,
  // height / width of what's shown, drawings keep their stroke widths even
  aspect: number,
  maxStrokes: number,
  maxPoints: number,
}) {
  const { t } = useI18n();
  const label = t('editor.settings', {name: effectName});
  switch (tool.kind) {
    case 'point':
      return <PointTool step={step} param={tool.param} onChange={(value) => onChange(tool.param, value)} label={label}/>;
    case 'box':
      return <BoxTool step={step} param={tool.param} onChange={(value) => onChange(tool.param, value)} label={label} dim={step.effect === 'crop'}/>;
    case 'strokes':
      return (
        <StrokesTool
          step={step}
          param={tool.param}
          onChange={(value) => onChange(tool.param, value)}
          pen={pen}
          aspect={aspect}
          maxStrokes={maxStrokes}
          maxPoints={maxPoints}
          label={label}
        />
      );
  }
}
