import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { fileStepAllowed, MAX_FILE_STEPS, newStep } from '../stack';
import type { EditorAsset, EditorEffect, EditorStep } from '../types';
import type { EditorDocumentState } from '../useEditorDocument';
import { EffectPicker } from './EffectPicker';
import { SimpleParamControl } from './ParamControls';


// Effects on an uploaded file before it's used (`file_steps`): Remove Background on a sticker, a sound reversed. The
// whole list is the step's one param, every change sets it again (and the room syncs it like any param)
export function FileSteps({ state, step, asset, forAudio, generic = false }: {
  state: EditorDocumentState,
  step: EditorStep,
  asset: EditorAsset,
  forAudio: boolean,
  // a picture or video that isn't an overlay's (Blend's, Face Swap's...): "the file" instead of "the overlay"
  generic?: boolean,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ picking, setPicking ] = useState(false);
  const [ selected, setSelected ] = useState<string | null>(null);
  const fileSteps = (Array.isArray(step.params.file_steps)) ? step.params.file_steps as Array<EditorStep> : [];
  const set = (next: Array<EditorStep>) => state.setParam(step.id, 'file_steps', next);
  const update = (id: string, change: (item: EditorStep) => EditorStep) => set(fileSteps.map((item) => (item.id === id) ? change(item) : item));

  // what this file can take: a sound's audio effects, an overlay's other ones that work on what it is
  const choices = useMemo(() => [...state.effectsById.values()].filter((effect: EditorEffect) => (
    fileStepAllowed(effect, forAudio) && (forAudio || effect.kinds.includes(asset.kind))
  )), [asset.kind, forAudio, state.effectsById]);

  // the step's last change was turned down (a file's effects are its step's one setting), a field being typed in says so
  const refused = state.steps.findIndex((item) => item.id === step.id) === state.stepError?.index;
  const current = fileSteps.find((item) => item.id === selected) ?? null;
  const currentEffect = (current) ? state.effectsById.get(current.effect) : undefined;
  const full = MAX_FILE_STEPS <= fileSteps.length;

  return (
    <div className='flex flex-col gap-2 rounded-lg border border-line-strong p-2.5'>
      <span className='flex items-center justify-between text-[13px] text-muted'>
        {(forAudio) ? t('editor.file_steps.title_audio') : (generic) ? t('editor.file_steps.title_file') : t('editor.file_steps.title')}
        <span className='text-xs text-subtle'>{fileSteps.length}/{MAX_FILE_STEPS}</span>
      </span>
      {(fileSteps.length) ? (
        <ol className='flex flex-col gap-1'>
          {fileSteps.map((item, index) => {
            const name = state.effectsById.get(item.effect)?.name ?? item.effect;
            return (
              <li key={item.id} className={cn('flex items-center gap-0.5 rounded-md border pl-2', (item.id === selected) ? 'border-brand bg-surface-3' : 'border-line-strong bg-deep')}>
                <button
                  type='button'
                  aria-pressed={item.id === selected}
                  onClick={() => setSelected((item.id === selected) ? null : item.id)}
                  className={cn('min-h-9 min-w-0 flex-1 truncate text-left text-sm', (item.hidden) ? 'text-subtle line-through' : 'text-fg')}
                >
                  {index + 1}. {name}
                </button>
                <button type='button' aria-label={t('editor.file_steps.up', {name})} disabled={!index} onClick={() => set(fileSteps.map((other, at) => (at === index - 1) ? item : (at === index) ? fileSteps[index - 1] : other))} className='flex size-8 items-center justify-center rounded text-muted hover:text-fg disabled:opacity-30'>
                  <ArrowUp aria-hidden className='size-3.5'/>
                </button>
                <button type='button' aria-label={t('editor.file_steps.down', {name})} disabled={index === fileSteps.length - 1} onClick={() => set(fileSteps.map((other, at) => (at === index + 1) ? item : (at === index) ? fileSteps[index + 1] : other))} className='flex size-8 items-center justify-center rounded text-muted hover:text-fg disabled:opacity-30'>
                  <ArrowDown aria-hidden className='size-3.5'/>
                </button>
                <button type='button' aria-label={(item.hidden) ? t('editor.step.show', {name}) : t('editor.step.hide', {name})} onClick={() => update(item.id, (old) => ({...old, hidden: !old.hidden}))} className='flex size-8 items-center justify-center rounded text-muted hover:text-fg'>
                  {(item.hidden) ? <EyeOff aria-hidden className='size-3.5'/> : <Eye aria-hidden className='size-3.5'/>}
                </button>
                <button
                  type='button'
                  aria-label={t('editor.step.remove', {name})}
                  onClick={() => {
                    set(fileSteps.filter((other) => other.id !== item.id));
                    if (selected === item.id) {
                      setSelected(null);
                    }
                  }}
                  className='flex size-8 items-center justify-center rounded text-muted hover:text-danger-text'
                >
                  <X aria-hidden className='size-3.5'/>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className='text-xs text-subtle'>{(forAudio) ? t('editor.file_steps.empty_audio') : (generic) ? t('editor.file_steps.empty_file') : t('editor.file_steps.empty')}</p>
      )}
      {(current && currentEffect) ? (
        // (per lock too, like the step's own settings: a field turned off under the cursor may never blur)
        <div key={`${current.id}:${Boolean(state.lockedBy(step.id)) || Boolean(state.editLock)}`} className='flex flex-col gap-2.5 rounded-md bg-deep p-2.5'>
          <span className='text-xs font-semibold text-white'>{currentEffect.name}</span>
          {(currentEffect.params.length) ? currentEffect.params.map((param) => (
            <SimpleParamControl
              key={param.name}
              param={param}
              value={current.params[param.name]}
              onChange={(value) => update(current.id, (old) => ({...old, params: {...old.params, [param.name]: value}}))}
              refused={refused}
            />
          )) : <p className='text-xs text-subtle'>{t('editor.settings.none')}</p>}
        </div>
      ) : null}
      <button type='button' className='btn btn-secondary w-full' disabled={full} onClick={() => setPicking(true)}>
        <Plus aria-hidden className='size-4'/>{(full) ? t('editor.file_steps.full', {count: MAX_FILE_STEPS}) : t('editor.file_steps.add')}
      </button>
      {(picking) ? (
        <Modal labelledBy={titleId} onClose={() => setPicking(false)} className='max-w-lg'>
          <div className='flex max-h-[80vh] flex-col gap-3 overflow-y-auto p-5'>
            <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{(forAudio) ? t('editor.file_steps.pick_audio') : (generic) ? t('editor.file_steps.pick_file') : t('editor.file_steps.pick')}</h2>
            <EffectPicker
              effects={choices}
              kind={(forAudio) ? 'audio' : asset.kind}
              hasAudio={forAudio}
              notes={false}
              onAdd={(effect) => {
                const added = newStep(effect);
                set([...fileSteps, added]);
                setSelected(added.id);
                setPicking(false);
              }}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
