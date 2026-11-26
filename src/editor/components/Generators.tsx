import { FileUp, Sparkles, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { ColorPicker } from '@/components/ui/ColorPicker';
import { DialogError } from '@/components/ui/DialogError';
import { CharCounter } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';

import { defaultParams, paramLabel } from '../stack';
import type { EditorGenerator, EditorParam } from '../types';


const INPUT = 'w-full rounded-lg border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand';


// The start screen's "Make one": generators whose media is the new document's start, its commands page preview as the
// tile (the same sample under each, like the effect tiles)
export function GeneratorGrid({ generators, disabled, onPick }: {
  generators: Array<EditorGenerator>,
  disabled: boolean,
  onPick: (generator: EditorGenerator) => void,
}) {
  const { t } = useI18n();
  return (
    <ul className='grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6'>
      {generators.map((generator) => (
        <li key={generator.id}>
          <button
            type='button'
            disabled={disabled}
            onClick={() => onPick(generator)}
            aria-label={t('editor.generate.pick', {name: generator.name})}
            className='flex w-full flex-col gap-1.5 rounded-lg border border-line-strong bg-surface p-1.5 text-left transition-colors hover:border-brand hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <span className='flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-deep'>
              {(generator.thumbnail && generator.thumbnail.mimetype.startsWith('image/')) ? (
                <img src={generator.thumbnail.url} alt='' loading='lazy' className='size-full object-cover'/>
              ) : (
                <Sparkles aria-hidden className='size-6 text-brand-text'/>
              )}
            </span>
            <span className='truncate px-0.5 text-xs font-semibold text-fg'>{generator.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}


function GeneratorField({ param, multiline, value, onChange }: {
  param: EditorParam,
  multiline: boolean,
  value: unknown,
  onChange: (value: unknown) => void,
}) {
  const { t } = useI18n();
  const id = useId();
  switch (param.kind) {
    case 'text': {
      const text = String(value ?? '');
      const max = param.max_length ?? 200;
      return (
        <div className='flex flex-col gap-1.5'>
          <label htmlFor={id} className='flex justify-between gap-2 text-[13px] text-muted'>
            {(param.name !== 'text') ? paramLabel(param) : (multiline) ? t('editor.generate.lines') : t('editor.generate.text')}
            <CharCounter length={text.length} max={max}/>
          </label>
          {(multiline) ? (
            <textarea id={id} rows={3} maxLength={max} value={text} onChange={(event) => onChange(event.target.value)} data-autofocus className={`${INPUT} min-h-20 resize-y py-2`}/>
          ) : (
            <input id={id} maxLength={max} value={text} onChange={(event) => onChange(event.target.value)} data-autofocus className={`${INPUT} h-10`}/>
          )}
        </div>
      );
    }
    case 'integer':
    case 'number':
      return (
        <div className='flex items-center justify-between gap-2'>
          <label htmlFor={id} className='text-[13px] text-muted'>{paramLabel(param)}</label>
          <input
            id={id}
            type='number'
            min={param.minimum}
            max={param.maximum}
            value={Number(value ?? param.default)}
            onChange={(event) => onChange(Number(event.target.value))}
            className={`${INPUT} h-9 w-28 text-right font-mono tabular-nums`}
          />
        </div>
      );
    case 'color':
      return <ColorPicker label={paramLabel(param)} value={String(value ?? param.default)} onChange={onChange}/>;
    default:
      return null;
  }
}


// One generator's fields, then made into a new document (the dialog stays open, with the api's reason, if it can't be)
export type GeneratorPortrait = {file: File} | {url: string};


// A card's portrait (Lucia's): a picture, gif or video from the device or a link. Optional, the card has its own
function PortraitField({ value, onChange }: {value: GeneratorPortrait | null, onChange: (value: GeneratorPortrait | null) => void}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const linkId = useId();
  const [ link, setLink ] = useState('');
  const preview = useMemo(() => (value && 'file' in value) ? URL.createObjectURL(value.file) : (value) ? value.url : null, [value]);
  useEffect(() => () => {
    if (preview && value && 'file' in value) {
      URL.revokeObjectURL(preview);
    }
  }, [preview, value]);
  const isVideo = Boolean(value && 'file' in value && value.file.type.startsWith('video/'));
  return (
    <div className='flex flex-col gap-2 rounded-lg border border-line-strong p-2.5'>
      <span className='text-sm text-muted'>{t('editor.generate.portrait')}</span>
      {(value && preview) ? (
        <div className='flex items-center gap-2.5'>
          {(isVideo) ? (
            <video src={preview} muted autoPlay loop playsInline className='size-14 shrink-0 rounded-md bg-deep object-cover'/>
          ) : (
            <img src={preview} alt='' className='size-14 shrink-0 rounded-md bg-deep object-cover'/>
          )}
          <span className='min-w-0 flex-1 truncate text-sm text-fg'>{('file' in value) ? value.file.name : value.url}</span>
          <button type='button' aria-label={t('editor.generate.portrait_remove')} title={t('editor.generate.portrait_remove')} onClick={() => onChange(null)} className='flex size-9 items-center justify-center rounded-md text-muted hover:text-fg'>
            <X aria-hidden className='size-4'/>
          </button>
        </div>
      ) : (
        <p className='text-xs text-subtle'>{t('editor.generate.portrait_hint')}</p>
      )}
      <input
        ref={fileRef}
        type='file'
        accept='image/*,video/*'
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onChange({file});
          }
        }}
      />
      <div className='flex gap-1.5'>
        <button type='button' className='btn btn-secondary min-h-9 shrink-0 px-3 text-sm' onClick={() => fileRef.current?.click()}>
          <FileUp aria-hidden className='size-4'/>{t('editor.generate.portrait_upload')}
        </button>
        <label htmlFor={linkId} className='sr-only'>{t('editor.overlay.link')}</label>
        <input
          id={linkId}
          type='url'
          value={link}
          placeholder={t('editor.overlay.link')}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && link.trim()) {
              event.preventDefault();
              onChange({url: link.trim()});
              setLink('');
            }
          }}
          onBlur={() => {
            if (link.trim()) {
              onChange({url: link.trim()});
              setLink('');
            }
          }}
          className='h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-deep px-2.5 text-sm text-fg outline-none focus:border-brand'
        />
      </div>
    </div>
  );
}


export function GeneratorDialog({ generator, onClose, onMake }: {
  generator: EditorGenerator,
  onClose: () => void,
  // `portrait`: the card's picture (generators with a `portrait_effect`), it becomes the source with that effect on it
  onMake: (params: Record<string, unknown>, portrait: GeneratorPortrait | null) => Promise<string | null>,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ portrait, setPortrait ] = useState<GeneratorPortrait | null>(null);
  const [ params, setParams ] = useState<Record<string, unknown>>(() => defaultParams(generator));
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  const text = generator.params.find((param) => param.kind === 'text');
  const missingText = Boolean(text && !String(params[text.name] ?? '').trim());

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending || missingText) {
            return;
          }
          setPending(true);
          setError(null);
          const failure = await onMake(params, (generator.portrait_effect) ? portrait : null);
          if (failure !== null) {
            setError(failure);
            setPending(false);
          }
        }}
      >
        <div className='flex items-center gap-3 pr-10'>
          {(generator.thumbnail && generator.thumbnail.mimetype.startsWith('image/')) ? (
            <img src={generator.thumbnail.url} alt='' className='size-12 shrink-0 rounded-md object-cover'/>
          ) : null}
          <h2 id={titleId} className='text-lg font-semibold text-white'>{generator.name}</h2>
        </div>
        {(generator.multiline) ? <p className='-mt-2 text-xs text-subtle'>{t('editor.generate.lines_hint')}</p> : null}
        {generator.params.map((param) => (
          <GeneratorField
            key={param.name}
            param={param}
            multiline={generator.multiline}
            value={params[param.name]}
            onChange={(value) => setParams((current) => ({...current, [param.name]: value}))}
          />
        ))}
        {(generator.portrait_effect) ? <PortraitField value={portrait} onChange={setPortrait}/> : null}
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={pending || missingText}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {(pending) ? t('editor.generate.making') : t('editor.generate.make')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
