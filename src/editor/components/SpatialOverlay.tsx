import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { clamp, roundFraction, type SpatialTool } from '../stack';
import type { EditorAsset, EditorBox, EditorPoint, EditorStep, EditorStroke } from '../types';


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


// iOS doesn't let a prevented pointerdown stop its long-press text selection (it goes by touch events only), and over
// the unselectable preview it selects the nearest text instead, like the Edits heading. While a gesture on the
// overlay runs nothing on the page is selectable, and whatever got selected is cleared. Counted, two fingers or two
// tools never undo each other's
let selectionHolds = 0;
let selectionBefore = {user: '', webkit: ''};

const preventSelect = (event: Event) => event.preventDefault();

function clearSelection() {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }
}

function holdSelection(): () => void {
  const root = document.documentElement.style;
  if (!selectionHolds) {
    selectionBefore = {user: root.userSelect, webkit: root.webkitUserSelect};
    root.userSelect = 'none';
    root.webkitUserSelect = 'none';
    document.addEventListener('selectstart', preventSelect);
  }
  selectionHolds += 1;
  clearSelection();
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    selectionHolds -= 1;
    clearSelection();
    if (!selectionHolds) {
      root.userSelect = selectionBefore.user;
      root.webkitUserSelect = selectionBefore.webkit;
      document.removeEventListener('selectstart', preventSelect);
    }
  };
}


// a gesture's selection hold: `hold()` on pointerdown, `release()` on up/cancel, and on unmount (the step changed
// mid-drag) it's let go too
function useSelectionHold() {
  const releaseRef = useRef<(() => void) | null>(null);
  useEffect(() => () => releaseRef.current?.(), []);
  return {
    hold: () => {
      releaseRef.current?.();
      releaseRef.current = holdSelection();
    },
    release: () => {
      releaseRef.current?.();
      releaseRef.current = null;
    },
  };
}


// cancels a touch's own gestures (long-press selection, the callout, double-tap zoom) on an element where every touch
// is a drag. React's touch listeners are passive, so it's a native one
function useNoTouchGestures<T extends Element>(ref: RefObject<T | null>, enabled: boolean = true) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) {
      return;
    }
    const onTouchStart = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };
    element.addEventListener('touchstart', onTouchStart, {passive: false});
    return () => element.removeEventListener('touchstart', onTouchStart);
  }, [enabled, ref]);
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


type TextHandle = 'move' | 'left' | 'right' | 'corner';

// Text's box on the preview, as the render lays it out: wrapped and centered in `width` (a fraction of the media's
// width), letters `size` of the width tall, the box centered on the position. Drag it to move it, its sides to change
// how wide it wraps, a corner to scale the text. `+`/`-` resize it from the keyboard, arrows move it
function PointTool({ step, param, onParam, label, resizeLabel, widthLabel, editLabel, editHint, maxTextLength }: {
  step: EditorStep,
  param: string,
  onParam: (name: string, value: unknown) => void,
  label: string,
  resizeLabel: string,
  widthLabel: string,
  editLabel: string,
  editHint: string,
  maxTextLength: number,
}) {
  const [ containerRef, width ] = useElementWidth<HTMLDivElement>();
  const point = step.params[param] as EditorPoint;
  const text = String(step.params.text ?? '');
  const size = (typeof step.params.size === 'number') ? step.params.size : 0.08;
  const boxWidth = (typeof step.params.width === 'number') ? step.params.width : 0.9;
  const color = (typeof step.params.color === 'string') ? step.params.color : '#ffffff';
  const resizable = 'size' in step.params || step.effect === 'text';
  const dragRef = useRef<{handle: TextHandle, dx: number, dy: number, height: number, size: number} | null>(null);
  // no touch-gesture cancelling here: double-tapping the text edits it
  const selectionHold = useSelectionHold();
  // double-click edits the text right on the preview, Escape puts back what it was
  const [ editing, setEditing ] = useState(false);
  const originalRef = useRef('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editing || !editor) {
      return;
    }
    // grows with its lines, like the box it replaced
    editor.style.height = '0px';
    editor.style.height = `${editor.scrollHeight}px`;
  }, [editing, text, size, width, boxWidth]);

  const startEditing = () => {
    if (!('text' in step.params)) {
      return;
    }
    originalRef.current = text;
    setEditing(true);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.select();
    });
  };
  const textStyle = {
    color,
    fontSize: Math.max(8, size * width),
    lineHeight: 1.1,
    WebkitTextStroke: '1px #000',
  };

  const start = (handle: TextHandle) => (event: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    event.stopPropagation();
    // no text selection or native drag starts under the pointer (it flashes over the preview while drawing)
    event.preventDefault();
    // keeps keyboard nudging working after a click (preventing the press also stops it taking focus)
    (event.currentTarget as HTMLElement | SVGElement).focus?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = fractionOf(event, container);
    const rect = container.getBoundingClientRect();
    // a corner's height comes from how far it is from the center vertically, the box grows with the letters' size
    const height = Math.abs(at.y - point.y) * rect.height;
    dragRef.current = {handle, dx: point.x - at.x, dy: point.y - at.y, height: Math.max(height, 4), size};
    selectionHold.hold();
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    const drag = dragRef.current;
    if (!drag || !container) {
      return;
    }
    const at = fractionOf(event, container);
    if (drag.handle === 'move') {
      onParam(param, {x: roundFraction(at.x + drag.dx), y: roundFraction(at.y + drag.dy)});
    } else if (drag.handle === 'corner') {
      // a corner is the box's width and height at once: across sets where it wraps (the box stays centered), up/down
      // scales the letters, which is what makes the box taller or shorter
      const rect = container.getBoundingClientRect();
      const height = Math.abs(at.y - point.y) * rect.height;
      onParam('width', Math.round(clamp(Math.abs(at.x - point.x) * 2, 0.1, 1) * 1000) / 1000);
      onParam('size', Math.round(clamp(drag.size * (height / drag.height), 0.02, 1) * 1000) / 1000);
    } else {
      // the box stays centered on the position, a side sets half its width
      onParam('width', Math.round(clamp(Math.abs(at.x - point.x) * 2, 0.1, 1) * 1000) / 1000);
    }
  };
  const end = () => {
    dragRef.current = null;
    selectionHold.release();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nudge = nudgeOf(event);
    if (nudge) {
      event.preventDefault();
      onParam(param, {x: roundFraction(point.x + nudge.x), y: roundFraction(point.y + nudge.y)});
      return;
    }
    if (resizable && (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '_')) {
      event.preventDefault();
      const factor = (event.key === '-' || event.key === '_') ? 1 / 1.1 : 1.1;
      onParam('size', Math.round(clamp(size * factor, 0.02, 1) * 1000) / 1000);
    }
  };
  const handlers = (handle: TextHandle) => ({
    onPointerDown: start(handle),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  });
  const HANDLE = 'absolute touch-none rounded-sm border border-black/60 bg-white shadow';

  return (
    <div ref={containerRef} className='absolute inset-0'>
      <div
        className='absolute -translate-x-1/2 -translate-y-1/2'
        style={{left: `${point.x * 100}%`, top: `${point.y * 100}%`, width: `${boxWidth * 100}%`}}
      >
        {(editing) ? (
          <textarea
            ref={editorRef}
            value={text}
            aria-label={editLabel}
            maxLength={maxTextLength}
            rows={1}
            onChange={(event) => onParam('text', event.target.value)}
            onBlur={() => {
              setEditing(false);
              // the api won't take empty text, an emptied box goes back to what it was
              if (!text.trim()) {
                onParam('text', originalRef.current);
              }
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                onParam('text', originalRef.current);
                setEditing(false);
              } else if (event.key === 'Enter' && !event.shiftKey) {
                // Enter finishes, Shift+Enter is a new line
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            className='block w-full resize-none overflow-hidden rounded border-2 border-solid border-brand bg-black/30 px-1 text-center font-bold break-words whitespace-pre-wrap outline-none'
            style={textStyle}
          />
        ) : (
          <button
            type='button'
            aria-label={label}
            title={editHint}
            {...handlers('move')}
            onDoubleClick={startEditing}
            onKeyDown={(event) => {
              // Enter (or F2) edits the text from the keyboard
              if ((event.key === 'Enter' || event.key === 'F2') && 'text' in step.params) {
                event.preventDefault();
                startEditing();
                return;
              }
              onKeyDown(event);
            }}
            className='block w-full cursor-move touch-none rounded border-2 border-dashed border-white/90 px-1 text-center font-bold break-words whitespace-pre-wrap shadow-[0_0_0_1px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-brand'
            style={textStyle}
          >
            {text || ' '}
          </button>
        )}
        {(resizable) ? (
          <>
            {(['left', 'right'] as const).map((side) => (
              <span
                key={side}
                role='presentation'
                title={widthLabel}
                {...handlers(side)}
                className={cn(HANDLE, 'top-1/2 h-6 w-2.5 -translate-y-1/2 cursor-ew-resize', (side === 'left') ? '-left-1.5' : '-right-1.5')}
              />
            ))}
            {(['-top-2 -left-2 cursor-nwse-resize', '-top-2 -right-2 cursor-nesw-resize', '-bottom-2 -left-2 cursor-nesw-resize', '-right-2 -bottom-2 cursor-nwse-resize']).map((place) => (
              <span key={place} role='presentation' title={resizeLabel} {...handlers('corner')} className={cn(HANDLE, 'size-3.5', place)}/>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}


type BoxHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function BoxTool({ step, param, onChange, label, dim, fill }: {
  step: EditorStep,
  param: string,
  onChange: (value: EditorBox) => void,
  label: string,
  // crop: darken what's cut away
  dim: boolean,
  // an overlay's file, shown stretched to the box like the render does (the preview shows what goes into the step)
  fill?: {url: string, mimetype: string, opacity: number} | null,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const box = step.params[param] as EditorBox;
  const dragRef = useRef<{handle: BoxHandle, start: EditorPoint, box: EditorBox} | null>(null);
  const selectionHold = useSelectionHold();
  useNoTouchGestures(containerRef);

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
    // no text selection or native drag starts under the pointer (it flashes over the preview while drawing)
    event.preventDefault();
    // keeps keyboard nudging working after a click (preventing the press also stops it taking focus)
    (event.currentTarget as HTMLElement | SVGElement).focus?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {handle, start: fractionOf(event, container), box};
    selectionHold.hold();
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
    selectionHold.release();
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
    <div ref={containerRef} className='absolute inset-0 touch-none select-none [-webkit-touch-callout:none]' onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
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
        className='absolute cursor-move overflow-hidden border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
        style={{left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`}}
      >
        {(fill) ? (
          (fill.mimetype.startsWith('video/')) ? (
            <video aria-hidden src={fill.url} muted autoPlay loop playsInline className='pointer-events-none size-full object-fill' style={{opacity: fill.opacity}}/>
          ) : (
            <img aria-hidden src={fill.url} alt='' draggable={false} className='pointer-events-none size-full object-fill' style={{opacity: fill.opacity}}/>
          )
        ) : null}
      </button>
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
  const selectionHold = useSelectionHold();
  useNoTouchGestures(svgRef);

  const pointOf = (event: PointerEvent<SVGSVGElement>): [number, number] => {
    const at = fractionOf(event, event.currentTarget as unknown as HTMLElement);
    return [at.x, at.y];
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (full || event.button !== 0) {
      return;
    }
    // no text selection or native drag starts under the pointer (it flashes over the preview while drawing)
    event.preventDefault();
    // keeps keyboard nudging working after a click (preventing the press also stops it taking focus)
    (event.currentTarget as HTMLElement | SVGElement).focus?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCurrent({color: pen.color, width: pen.width, points: [pointOf(event)]});
    selectionHold.hold();
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
    selectionHold.release();
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
      className={cn('absolute inset-0 size-full touch-none select-none [-webkit-touch-callout:none]', (full) ? 'cursor-not-allowed' : 'cursor-crosshair')}
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


export function SpatialOverlay({ tool, step, effectName, onChange, pen, aspect, maxStrokes, maxPoints, maxTextLength, assets = [] }: {
  // the document's uploaded files, an overlay's is drawn in its box
  assets?: Array<EditorAsset>,
  tool: SpatialTool,
  step: EditorStep,
  effectName: string,
  onChange: (param: string, value: unknown) => void,
  pen: PenSettings,
  // height / width of what's shown, drawings keep their stroke widths even
  aspect: number,
  maxStrokes: number,
  maxPoints: number,
  maxTextLength: number,
}) {
  const { t } = useI18n();
  const label = t('editor.settings', {name: effectName});
  switch (tool.kind) {
    case 'point':
      return (
        <PointTool
          step={step}
          param={tool.param}
          onParam={onChange}
          label={label}
          resizeLabel={t('editor.preview.text_resize')}
          widthLabel={t('editor.preview.text_width')}
          editLabel={t('editor.preview.text_edit_label')}
          editHint={t('editor.preview.text_edit_hint')}
          maxTextLength={maxTextLength}
        />
      );
    case 'box': {
      const asset = (step.effect === 'overlay') ? assets.find((item) => item.id === step.params.media) : undefined;
      const fill = (asset) ? {url: asset.url, mimetype: asset.mimetype, opacity: Number(step.params.opacity ?? 1)} : null;
      return <BoxTool step={step} param={tool.param} onChange={(value) => onChange(tool.param, value)} label={label} dim={step.effect === 'crop'} fill={fill}/>;
    }
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
