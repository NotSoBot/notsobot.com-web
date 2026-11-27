import { FileUp, Link2, MessageCircleQuestion } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { isFormula, VALUE_EFFECT_ID } from '../formulas';
import { assetFits, fileAccepts, fileForAudio, fileInputAccept, paramLabel } from '../stack';
import type { EditorEffect, EditorParam, EditorParamKind, EditorStep } from '../types';
import type { EditorDocumentState } from '../useEditorDocument';
import { SimpleParamControl } from './ParamControls';


// Template inputs: a template's maker picks settings people are asked for when they use it ("Your caption", a picture
// for the overlay). Plain settings and files only, never positions or drawings (the api's INPUT_PARAM_KINDS)
// (every kind has its answer here: one added to `EditorParamKind` doesn't compile until it does)
const INPUT_KINDS: Record<EditorParamKind, boolean> = {
  boolean: true,
  choice: true,
  color: true,
  integer: true,
  number: true,
  text: true,
  media: true,
  point: false,
  box: false,
  strokes: false,
  time: false,
  steps: false,
};
// the api's MAX_INPUT_LABEL_LENGTH and MAX_STACK_INPUTS
export const MAX_INPUT_LABEL_LENGTH = 60;
export const MAX_TEMPLATE_INPUTS = 10;

const INPUT = 'w-full rounded-lg border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand';


export interface InputCandidate {
  step: EditorStep,
  effect: EditorEffect,
  param: EditorParam,
  // `${step id}:${param}`
  id: string,
}


// what the visible steps could ask for
export function inputCandidates(steps: Array<EditorStep>, effectsById: Map<string, EditorEffect>): Array<InputCandidate> {
  const candidates: Array<InputCandidate> = [];
  for (const step of steps) {
    const effect = effectsById.get(step.effect);
    if (step.hidden || !effect) {
      continue;
    }
    for (const param of effect.params) {
      // a value is asked for by its number, its name and range are the template's
      if (step.effect === VALUE_EFFECT_ID && param.name !== 'number') {
        continue;
      }
      // a formula follows its values, asking for it would replace the formula
      if (INPUT_KINDS[param.kind] && !isFormula(step.params[param.name])) {
        candidates.push({step, effect, param, id: `${step.id}:${param.name}`});
      }
    }
  }
  return candidates;
}


// what the visible steps ask for now
export function askedInputs(steps: Array<EditorStep>, effectsById: Map<string, EditorEffect>): Array<InputCandidate & {label: string}> {
  return inputCandidates(steps, effectsById)
    .filter((candidate) => candidate.step.inputs?.[candidate.param.name])
    .map((candidate) => ({...candidate, label: candidate.step.inputs![candidate.param.name]}));
}


// a question's starting text: the setting's name on its effect ("Caption text")
function defaultQuestion(candidate: InputCandidate): string {
  if (candidate.step.effect === VALUE_EFFECT_ID) {
    return String(candidate.step.params.name ?? '').slice(0, MAX_INPUT_LABEL_LENGTH);
  }
  return `${candidate.effect.name} ${paramLabel(candidate.param).toLowerCase()}`.slice(0, MAX_INPUT_LABEL_LENGTH);
}


// "Ask people for…" in Save as template: a checkbox and its question per setting. `value`: candidate id -> question
export function AskForInputs({ candidates, value, onChange }: {
  candidates: Array<InputCandidate>,
  value: Record<string, string>,
  onChange: (value: Record<string, string>) => void,
}) {
  const { t } = useI18n();
  const count = Object.keys(value).length;
  // open from the start when it already asks something, theirs to open and close after that. It used to follow the
  // count: unticking the only question closed the list under the cursor
  const [ open, setOpen ] = useState(count > 0);
  if (!candidates.length) {
    return null;
  }
  return (
    <details className='rounded-lg border border-line-strong' open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className='flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-semibold text-fg'>
        <MessageCircleQuestion aria-hidden className='size-4 text-brand-text'/>
        <span className='flex-1'>{t('editor.inputs.ask_title')}</span>
        <span className='text-xs font-normal text-subtle'>{count}/{MAX_TEMPLATE_INPUTS}</span>
      </summary>
      <div className='flex max-h-64 flex-col gap-2 overflow-y-auto border-t border-line-strong p-3'>
        <p className='text-xs text-subtle'>{t('editor.inputs.ask_description')}</p>
        {candidates.map((candidate) => {
          const checked = candidate.id in value;
          return (
            <div key={candidate.id} className='flex flex-col gap-1.5'>
              <label className='flex items-center gap-2 text-sm text-fg'>
                <input
                  type='checkbox'
                  className='size-4 accent-brand'
                  checked={checked}
                  disabled={!checked && MAX_TEMPLATE_INPUTS <= count}
                  onChange={(event) => {
                    const next = {...value};
                    if (event.target.checked) {
                      next[candidate.id] = defaultQuestion(candidate);
                    } else {
                      delete next[candidate.id];
                    }
                    onChange(next);
                  }}
                />
                <span className='min-w-0 truncate'>
                  {(candidate.step.effect === VALUE_EFFECT_ID)
                    ? <>{candidate.effect.name} <span className='font-mono text-muted'>{String(candidate.step.params.name ?? '')}</span></>
                    : <>{candidate.effect.name} <span className='text-muted'>· {paramLabel(candidate.param)}</span></>}
                </span>
              </label>
              {(checked) ? (
                <input
                  value={value[candidate.id]}
                  maxLength={MAX_INPUT_LABEL_LENGTH}
                  aria-label={t('editor.inputs.question')}
                  placeholder={t('editor.inputs.question')}
                  onChange={(event) => onChange({...value, [candidate.id]: event.target.value})}
                  className={cn(INPUT, 'ml-6 h-9 w-[calc(100%-1.5rem)]')}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </details>
  );
}


// a file question's upload. The dialog keeps it, so Use can wait for one that's still on its way
type FileUpload =
  | {kind: 'idle'}
  | {kind: 'uploading'}
  | {kind: 'done', filename: string}
  | {kind: 'error', message: string};

const NO_UPLOAD: FileUpload = {kind: 'idle'};


// a file question: an upload or a link, it becomes one of the edit's files. Only what the setting takes (`effect`'s
// file param), like the step's own file control
function FileInput({ state, effect, upload: status, onUpload, onPicked }: {
  state: EditorDocumentState,
  effect: EditorEffect,
  upload: FileUpload,
  onUpload: (upload: FileUpload) => void,
  onPicked: (assetId: string) => void,
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ link, setLink ] = useState('');
  const pending = status.kind === 'uploading';
  const accepts = fileAccepts(effect);
  const upload = async (input: {file?: File, url?: string}) => {
    onUpload({kind: 'uploading'});
    try {
      const asset = await state.uploadAsset(input);
      if (!assetFits(asset, accepts)) {
        // it's this edit's file now, just not one this setting can use
        const videoOnly = accepts.length === 1 && accepts[0] === 'video';
        throw new Error((fileForAudio(effect)) ? t('editor.audio.no_sound') : (effect.id === 'overlay') ? t('editor.overlay.not_visual') : (videoOnly) ? t('editor.file.not_video') : t('editor.file.not_visual'));
      }
      onUpload({kind: 'done', filename: asset.filename});
      onPicked(asset.id);
      setLink('');
    } catch (failure) {
      onUpload({kind: 'error', message: state.errorOf(failure)?.message || ((failure instanceof Error && failure.message) ? failure.message : t('editor.overlay.upload_failed'))});
    }
  };
  return (
    <div data-state={status.kind} className='flex flex-col gap-1.5'>
      <input
        ref={fileRef}
        type='file'
        accept={fileInputAccept(accepts)}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void upload({file});
          }
        }}
      />
      <div className='flex gap-1.5'>
        <button type='button' className='btn btn-secondary min-h-9 shrink-0 px-3 text-sm' disabled={pending} onClick={() => fileRef.current?.click()}>
          {(pending) ? <Spinner className='size-4'/> : <FileUp aria-hidden className='size-4'/>}{t('editor.generate.portrait_upload')}
        </button>
        <input
          type='url'
          value={link}
          disabled={pending}
          placeholder={t('editor.overlay.link')}
          aria-label={t('editor.overlay.link')}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && link.trim()) {
              event.preventDefault();
              void upload({url: link.trim()});
            }
          }}
          className={cn(INPUT, 'h-9 min-w-0 flex-1')}
        />
        <button type='button' aria-label={t('editor.overlay.add_link')} disabled={!link.trim() || pending} onClick={() => void upload({url: link.trim()})} className='flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-muted hover:text-fg disabled:opacity-40'>
          <Link2 aria-hidden className='size-4'/>
        </button>
      </div>
      {(status.kind === 'done') ? <p className='truncate text-xs text-success-text'>{status.filename}</p> : null}
      {(status.kind === 'error') ? <p role='alert' className='text-xs text-danger-text'>{status.message}</p> : null}
    </div>
  );
}


// "Fill in": right after a template with questions is loaded, each question with its setting's control, prefilled
// with what the template was saved with. Skip keeps those
// `locked`: nothing can be changed right now (someone else's render). It stays open with what was typed, Use waits
export function FillInputsDialog({ state, locked = false, onClose }: {state: EditorDocumentState, locked?: boolean, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const asked = useMemo(() => askedInputs(state.steps, state.effectsById), [state.effectsById, state.steps]);
  const [ values, setValues ] = useState<Record<string, unknown>>({});
  // each file question's upload (by the question's id). One still on its way when Use was pressed finished after the
  // dialog had closed, and its file was never used
  const [ uploads, setUploads ] = useState<Record<string, FileUpload>>({});
  const uploading = asked.some((item) => uploads[item.id]?.kind === 'uploading');
  // nothing (left) to ask: closed for real. It used to only show nothing while whoever opened it still had it open,
  // and came back by itself as soon as a step asked something again
  const none = !asked.length;
  useEffect(() => {
    if (none) {
      onClose();
    }
  }, [none, onClose]);
  if (none) {
    return null;
  }
  const apply = () => {
    if (uploading || locked) {
      return;
    }
    for (const item of asked) {
      if (item.id in values) {
        state.setParam(item.step.id, item.param.name, values[item.id]);
      }
    }
    onClose();
  };
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <form
        className='flex max-h-[90dvh] flex-col gap-4 overflow-y-auto p-5 sm:p-6'
        data-state={(uploading) ? 'uploading' : 'idle'}
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.inputs.fill_title')}</h2>
          <p className='mt-1 text-sm text-muted'>{t('editor.inputs.fill_description')}</p>
        </div>
        {asked.map((item) => (
          <div key={item.id} className='flex flex-col gap-1.5'>
            <span className='text-sm font-semibold text-fg'>{item.label}</span>
            {(item.param.kind === 'media') ? (
              <FileInput
                state={state}
                effect={item.effect}
                upload={uploads[item.id] ?? NO_UPLOAD}
                onUpload={(upload) => setUploads((current) => ({...current, [item.id]: upload}))}
                onPicked={(assetId) => setValues((current) => ({...current, [item.id]: assetId}))}
              />
            ) : (item.param.kind === 'text') ? (
              <textarea
                rows={2}
                maxLength={item.param.max_length}
                defaultValue={String(item.step.params[item.param.name] ?? '')}
                onChange={(event) => setValues((current) => ({...current, [item.id]: event.target.value}))}
                className={cn(INPUT, 'min-h-16 resize-y py-2')}
              />
            ) : (
              <SimpleParamControl
                param={(item.step.effect === VALUE_EFFECT_ID) ? {...item.param, minimum: Number(item.step.params.minimum ?? 0), maximum: Number(item.step.params.maximum ?? 100), formula: false} : {...item.param, formula: false}}
                value={(item.id in values) ? values[item.id] : item.step.params[item.param.name]}
                onChange={(value) => setValues((current) => ({...current, [item.id]: value}))}
              />
            )}
          </div>
        ))}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('editor.inputs.skip')}</button>
          <button type='submit' className='btn btn-primary' disabled={uploading || locked} data-autofocus>{t('editor.inputs.use')}</button>
        </div>
      </form>
    </Modal>
  );
}
