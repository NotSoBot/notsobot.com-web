import { Eye, EyeOff, GripVertical, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorDocumentState } from '../useEditorDocument';
import { StepCursors, useCursorSend } from './RoomCursors';
import { useStepSummary } from './useStepSummary';


export function StepList({ state }: {state: EditorDocumentState}) {
  const { t } = useI18n();
  const summarize = useStepSummary();
  const { steps, effectsById, selectedId, stepError } = state;
  const [ dragged, setDragged ] = useState<string | null>(null);
  const [ over, setOver ] = useState<number | null>(null);
  const sendCursor = useCursorSend();
  // the row being dragged, while it's still there: one someone else removed mid-drag never hears its drag end
  const dragging = (dragged && steps.some((step) => step.id === dragged)) ? dragged : null;
  // a change that was turned down without naming a step (someone else is adjusting it, too many at once): it was put
  // back, this says why (the api's own words: "This step can't run" isn't what happened). It used to be shown nowhere,
  // the change just undid itself
  const refusal = (stepError && stepError.index === null && stepError.message) ? (
    <p role='alert' className='text-xs text-danger-text'>{stepError.message}</p>
  ) : null;

  if (!steps.length) {
    return (
      <>
        {refusal}
        <p className='rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted'>{t('editor.edits_empty')}</p>
      </>
    );
  }

  const onKeyDown = (stepId: string, index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
      return;
    }
    event.preventDefault();
    state.moveStep(stepId, index + ((event.key === 'ArrowUp') ? -1 : 1));
  };

  return (
    <>
    {refusal}
    <ol
      className='flex flex-col gap-1.5'
      onPointerLeave={() => sendCursor?.(null)}
      onDragLeave={(event) => {
        // out of the list altogether: no row is the drop's anymore. WebKit doesn't say where the drag went
        // (`relatedTarget` is null), there it's by where the pointer is: every leave between a row's own parts cleared
        // the ring, which blinked
        const into = event.relatedTarget as Node | null;
        const rect = event.currentTarget.getBoundingClientRect();
        const inside = (into)
          ? event.currentTarget.contains(into)
          : rect.left <= event.clientX && event.clientX < rect.right && rect.top <= event.clientY && event.clientY < rect.bottom;
        if (!inside) {
          setOver(null);
        }
      }}
    >
      {steps.map((step, index) => {
        const effect = effectsById.get(step.effect);
        const name = effect?.name ?? step.effect;
        const selected = step.id === selectedId;
        const failed = stepError?.index === index;
        const summary = summarize(effect, step);
        const lockedBy = state.lockedBy(step.id);
        // someone else is adjusting it, or the whole stack is off (watching, someone's render)
        const locked = Boolean(lockedBy) || Boolean(state.editLock);
        return (
          <li
            key={step.id}
            data-step-id={step.id}
            data-state={(failed) ? 'failed' : (selected) ? 'selected' : 'idle'}
            data-locked={locked}
            // (a `fieldset disabled` around the list turns its buttons off, not a row's dragging)
            draggable={!locked}
            onPointerEnter={() => sendCursor?.({at: 'step', step_id: step.id})}
            onDragStart={(event) => {
              setDragged(step.id);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => {
              if (dragging) {
                event.preventDefault();
                setOver(index);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging) {
                state.moveStep(dragging, index);
              }
              setDragged(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragged(null);
              setOver(null);
            }}
            className={cn(
              'flex items-center gap-1 rounded-lg border py-1 pr-1 pl-2 transition-colors',
              (selected) ? 'border-brand bg-surface-3' : 'border-line-strong bg-bg',
              (failed) && 'border-danger',
              (over === index && dragging && dragging !== step.id) && 'ring-2 ring-brand',
              (dragging === step.id) && 'opacity-50',
            )}
          >
            <GripVertical aria-hidden className='size-3.5 shrink-0 cursor-grab text-subtle'/>
            <button
              type='button'
              aria-pressed={selected}
              aria-description={t('editor.step.move')}
              onClick={() => state.setSelectedId((selected) ? null : step.id)}
              onKeyDown={onKeyDown(step.id, index)}
              className='flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 p-1 text-left'
            >
              <span className={cn('text-sm font-semibold', (step.hidden) ? 'text-subtle line-through' : 'text-white')}>
                {index + 1}. {name}
                {(step.hidden) ? <span className='ml-1.5 text-xs font-normal no-underline'>({t('editor.step.hidden')})</span> : null}
              </span>
              {(summary) ? <span className='truncate font-mono text-xs text-muted'>{summary}</span> : null}
              {(failed && stepError) ? <span className='text-xs text-danger-text'>{t('editor.step.error', {message: stepError.message})}</span> : null}
              {(lockedBy) ? <span className='text-xs text-warning-text'>{t('editor.room.adjusting', {name: lockedBy.username})}</span> : null}
            </button>
            <StepCursors stepId={step.id}/>
            <button
              type='button'
              aria-label={(step.hidden) ? t('editor.step.show', {name}) : t('editor.step.hide', {name})}
              disabled={Boolean(lockedBy)}
              onClick={() => state.toggleStep(step.id)}
              className='flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-fg'
            >
              {(step.hidden) ? <EyeOff aria-hidden className='size-[18px]'/> : <Eye aria-hidden className='size-[18px]'/>}
            </button>
            <button
              type='button'
              aria-label={t('editor.step.remove', {name})}
              disabled={Boolean(lockedBy)}
              onClick={() => state.removeStep(step.id)}
              className='flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-danger-text'
            >
              <X aria-hidden className='size-[18px]'/>
            </button>
          </li>
        );
      })}
    </ol>
    </>
  );
}
