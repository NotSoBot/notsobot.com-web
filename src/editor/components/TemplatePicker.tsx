import { BookmarkCheck, Check, LayoutTemplate, Lock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import { defaultParams, newStepId } from '../stack';
import type { EditorEffect, EditorStep, EditorTemplate } from '../types';
import type { useEditorDocument } from '../useEditorDocument';
import { HubStatusBadge, hubStatusOf, PublishButton } from '../hub/Publish';


type EditorState = ReturnType<typeof useEditorDocument>;


// a template's steps for this catalogue: effects it doesn't have are left out, params it doesn't have dropped and new
// ones at their defaults, every step a new id (the api checks them again when they're saved)
function templateSteps(template: EditorTemplate, effectsById: Map<string, EditorEffect>): Array<EditorStep> {
  const steps: Array<EditorStep> = [];
  for (const step of template.steps) {
    const effect = effectsById.get(step.effect);
    // heavy AI effects stay out of templates (an old one saved before that rule loads without them)
    if (!effect || effect.template_blocked) {
      continue;
    }
    const known = new Set(effect.params.map((param) => param.name));
    const params = Object.fromEntries(Object.entries(step.params ?? {}).filter(([ name ]) => known.has(name)));
    // its questions, for params it still has
    const inputs = Object.fromEntries(Object.entries(step.inputs ?? {}).filter(([ name ]) => known.has(name)));
    steps.push({
      id: newStepId(),
      effect: effect.id,
      hidden: Boolean(step.hidden),
      params: {...defaultParams(effect), ...params},
      ...((Object.keys(inputs).length) ? {inputs} : {}),
    });
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
  // the one being loaded onto the edit (its files are copied over first), by its code. Nothing said it was on its way:
  // a second click loaded it twice, and Cancel closed the dialog only for the effects to be replaced a moment later
  const [ loading, setLoading ] = useState<string | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
    <Modal labelledBy={titleId} onClose={() => !loading && onClose()} className='max-w-lg'>
      <div data-state={(error) ? 'error' : (!templates) ? 'loading' : (loading) ? 'applying' : 'ready'} className='flex flex-col gap-4 p-5 sm:p-6'>
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
                <li key={template.code} className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    disabled={!usable.length || Boolean(loading)}
                    onClick={async () => {
                      if (loading) {
                        return;
                      }
                      if (template.assets?.length && state.document) {
                        // its overlays' files become this edit's first, the steps can use them then
                        setLoading(template.code);
                        try {
                          const { assets } = await host.api.importTemplateAssets(state.document.id, template.code);
                          // the dialog's gone meanwhile (the editor closed under it): nothing is loaded
                          if (!aliveRef.current) {
                            return;
                          }
                          state.addAssets(assets);
                        } catch (failure) {
                          if (aliveRef.current) {
                            setError(host.errorOf(failure)?.message || t('editor.templates.error'));
                            setLoading(null);
                          }
                          return;
                        }
                      }
                      // turned down (someone's render started while its files were coming): nothing was loaded, the
                      // dialog stays and it can be picked again once the render's over
                      if (!state.replaceSteps(usable)) {
                        setLoading(null);
                        return;
                      }
                      onLoad(template);
                    }}
                    className='flex min-h-14 w-full min-w-0 flex-1 items-center gap-3 rounded-lg border border-line-strong bg-bg px-3 py-2 text-left hover:border-subtle/50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {(loading === template.code) ? <Spinner className='size-5 shrink-0'/> : <LayoutTemplate aria-hidden className='size-5 shrink-0 text-muted'/>}
                    <span className='flex min-w-0 flex-1 flex-col'>
                      <span className='flex items-center gap-1.5 text-sm font-semibold text-white'>
                        <span className='truncate'>{template.name}</span>
                        {(template.locked) ? <Lock aria-label={t('editor.session.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
                        <HubStatusBadge template={template} className='shrink-0'/>
                      </span>
                      <span className='truncate text-xs text-subtle'>
                        {plural('editor.templates.effects', usable.length)}{(names.length) ? ` · ${names.slice(0, 4).join(' → ')}` : ''}
                      </span>
                    </span>
                  </button>
                  {/* (not while one is loading: the dialog closes under whatever it opened) */}
                  <fieldset disabled={Boolean(loading)} className='contents'>
                    <PublishButton host={host} template={template} onChange={(saved) => setTemplates((items) => (items ?? []).map((item) => (item.code === saved.code) ? saved : item))}/>
                  </fieldset>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className='rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted'>{t('editor.templates.none')}</p>
        )}
        {(state.steps.length && templates?.length) ? <p className='text-xs text-subtle'>{t('editor.templates.replaces')}</p> : null}
        <div className='flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={Boolean(loading)}>{t('common.cancel')}</button>
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
  // the template as the api answered the last save: a published one whose steps changed is back in review
  const [ answered, setAnswered ] = useState<EditorTemplate | null>(null);
  const stepsRef = useRef(state.steps);
  stepsRef.current = state.steps;
  // a change after saving makes it worth saving again
  useEffect(() => {
    setStatus((current) => (current === 'saved') ? 'idle' : current);
  }, [state.steps]);
  // where it stands on the hub now, when the save changed that (nothing else on this screen would say so)
  const moved = (answered && answered.code === template.code && hubStatusOf(answered) !== hubStatusOf(template)) ? answered : null;

  const label = (status === 'saved') ? t('editor.templates.saved', {name: template.name}) : t('editor.templates.save', {name: template.name});
  return (
    <>
    <button
      type='button'
      data-state={status}
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
          // the api copies the saved steps, these
          const sent = stepsRef.current;
          setAnswered(await host.api.saveTemplateSteps(template.code, documentId));
          // changed while it was saving (the effect above only clears a `saved` that's already there): it isn't what
          // the template has
          setStatus((stepsRef.current === sent) ? 'saved' : 'idle');
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
    {(moved) ? <HubStatusBadge template={moved} className='shrink-0'/> : null}
    </>
  );
}
