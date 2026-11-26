import { BookmarkCheck, Check, LayoutTemplate, Lock } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import { defaultParams, newStepId } from '../stack';
import type { EditorEffect, EditorStep, EditorTemplate } from '../types';
import type { useEditorDocument } from '../useEditorDocument';


type EditorState = ReturnType<typeof useEditorDocument>;


// a template's steps for this catalogue: effects it doesn't have are left out, params it doesn't have dropped and new
// ones at their defaults, every step a new id (the api checks them again when they're saved)
function templateSteps(template: EditorTemplate, effectsById: Map<string, EditorEffect>): Array<EditorStep> {
  const steps: Array<EditorStep> = [];
  for (const step of template.steps) {
    const effect = effectsById.get(step.effect);
    if (!effect) {
      continue;
    }
    const known = new Set(effect.params.map((param) => param.name));
    const params = Object.fromEntries(Object.entries(step.params ?? {}).filter(([ name ]) => known.has(name)));
    steps.push({id: newStepId(), effect: effect.id, hidden: Boolean(step.hidden), params: {...defaultParams(effect), ...params}});
  }
  return steps;
}


// "Templates": their own templates, one loaded replaces the effects on this media (undo brings them back)
function TemplatePickerDialog({ host, state, onLoad, onClose }: {
  host: EditorHost,
  state: EditorState,
  onLoad: (template: EditorTemplate) => void,
  onClose: () => void,
}) {
  const { t, plural } = useI18n();
  const titleId = useId();
  const [ templates, setTemplates ] = useState<Array<EditorTemplate> | null>(null);
  const [ error, setError ] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    host.api.templates().then((result) => {
      if (alive) {
        setTemplates(result.templates);
      }
    }).catch((failure) => {
      if (alive) {
        setError(host.errorOf(failure)?.message || t('editor.templates.error'));
      }
    });
    return () => {
      alive = false;
    };
  }, [host, t]);

  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-lg'>
      <div className='flex flex-col gap-4 p-5 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('editor.templates.title')}</h2>
          <p className='mt-2 text-sm text-muted'>{t('editor.templates.description')}</p>
        </div>
        {(error) ? <DialogError>{error}</DialogError> : (!templates) ? (
          <div className='flex justify-center py-8'><Spinner/></div>
        ) : (templates.length) ? (
          <ul className='flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto'>
            {templates.map((template) => {
              const usable = templateSteps(template, state.effectsById);
              const names = usable.filter((step) => !step.hidden).map((step) => state.effectsById.get(step.effect)?.name ?? step.effect);
              return (
                <li key={template.code}>
                  <button
                    type='button'
                    disabled={!usable.length}
                    onClick={async () => {
                      if (template.assets?.length && state.document) {
                        // its overlays' files become this edit's first, the steps can use them then
                        try {
                          state.addAssets((await host.api.importTemplateAssets(state.document.id, template.code)).assets);
                        } catch (failure) {
                          setError(host.errorOf(failure)?.message || t('editor.templates.error'));
                          return;
                        }
                      }
                      state.replaceSteps(usable);
                      onLoad(template);
                    }}
                    className='flex min-h-14 w-full items-center gap-3 rounded-lg border border-line-strong bg-bg px-3 py-2 text-left hover:border-brand disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <LayoutTemplate aria-hidden className='size-5 shrink-0 text-muted'/>
                    <span className='flex min-w-0 flex-1 flex-col'>
                      <span className='flex items-center gap-1.5 text-sm font-semibold text-white'>
                        <span className='truncate'>{template.name}</span>
                        {(template.locked) ? <Lock aria-label={t('editor.session.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
                      </span>
                      <span className='truncate text-xs text-subtle'>
                        {plural('editor.templates.effects', usable.length)}{(names.length) ? ` · ${names.slice(0, 4).join(' → ')}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className='rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted'>{t('editor.templates.none')}</p>
        )}
        {(state.steps.length && templates?.length) ? <p className='text-xs text-subtle'>{t('editor.templates.replaces')}</p> : null}
        <div className='flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </Modal>
  );
}


export function TemplatesButton({ host, state, onLoad }: {host: EditorHost, state: EditorState, onLoad: (template: EditorTemplate) => void}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        disabled={state.renderLocked}
        aria-label={t('editor.templates.button')}
        title={t('editor.templates.button')}
        onClick={() => setOpen(true)}
        className='inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'
      >
        <LayoutTemplate aria-hidden className='size-4'/>
        <span className='hidden sm:inline'>{t('editor.templates.button')}</span>
      </button>
      {(open) ? (
        <TemplatePickerDialog
          host={host}
          state={state}
          onLoad={(template) => {
            onLoad(template);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}


// After loading one of their templates: "Save template" writes the effects as they are now back into it (once every
// edit has saved, the api copies the saved steps)
export function SaveLoadedTemplateButton({ host, state, documentId, template }: {
  host: EditorHost,
  state: EditorState,
  documentId: string,
  template: EditorTemplate,
}) {
  const { t } = useI18n();
  const [ status, setStatus ] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [ error, setError ] = useState<string | null>(null);
  // a change after saving makes it worth saving again
  useEffect(() => {
    setStatus((current) => (current === 'saved') ? 'idle' : current);
  }, [state.steps]);

  const label = (status === 'saved') ? t('editor.templates.saved', {name: template.name}) : t('editor.templates.save', {name: template.name});
  return (
    <button
      type='button'
      disabled={status === 'saving' || !state.steps.some((step) => !step.hidden)}
      aria-label={label}
      title={error ?? label}
      onClick={async () => {
        setStatus('saving');
        setError(null);
        try {
          if (!await state.whenSaved()) {
            throw new Error(t('editor.render.unsaved'));
          }
          await host.api.saveTemplateSteps(template.code, documentId);
          setStatus('saved');
        } catch (failure) {
          setError(host.errorOf(failure)?.message || ((failure instanceof Error) ? failure.message : t('editor.templates.save_failed')));
          setStatus('failed');
        }
      }}
      className={cn(
        'inline-flex min-h-10 max-w-56 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40',
        (status === 'failed') ? 'text-danger-text' : (status === 'saved') ? 'text-success-text' : 'text-muted hover:text-fg',
      )}
    >
      {(status === 'saving') ? <Spinner className='size-4'/> : (status === 'saved') ? <Check aria-hidden className='size-4'/> : <BookmarkCheck aria-hidden className='size-4'/>}
      <span className='hidden truncate sm:inline'>{label}</span>
    </button>
  );
}
