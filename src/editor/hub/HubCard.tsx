import { Check, Flag, Terminal, Users, Wand2, X } from 'lucide-react';
import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';
import { cn, formatCompact } from '@/lib/utils';

import { HubMedia } from './HubMedia';
import { templateLine } from './mediascript';
import type { HubTemplate } from './types';


// a card lists this many of its effects by name, then "+N more"
const SHOWN_EFFECTS = 4;


// the visible steps' effect ids (`effects`), or the ids out of `steps` from an api that sends those instead
export function hubEffectIds(template: HubTemplate): Array<string> {
  const loose = template as unknown as {effects?: unknown, steps?: unknown};
  const list = (Array.isArray(loose.effects)) ? loose.effects : (Array.isArray(loose.steps)) ? loose.steps : [];
  return list.map((item) => (typeof item === 'string') ? item : String((item as {effect?: unknown})?.effect ?? '')).filter(Boolean);
}


function Avatar({ url }: {url: string | null}) {
  const [ broken, setBroken ] = useState(false);
  if (!url || broken) {
    return <span aria-hidden className='size-5 shrink-0 rounded-full bg-line-strong'/>;
  }
  return <img src={url} alt='' loading='lazy' onError={() => setBroken(true)} className='size-5 shrink-0 rounded-full'/>;
}


export function HubAuthorLine({ template, className }: {template: HubTemplate, className?: string}) {
  const { t, plural } = useI18n();
  return (
    <p className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted', className)}>
      <span className='flex min-w-0 items-center gap-1.5'>
        <Avatar url={template.user.avatar_url}/>
        <span className='truncate'>{t('hub.by', {user: template.user.username})}</span>
      </span>
      <span aria-hidden>·</span>
      <span className='flex items-center gap-1' title={plural('hub.people', template.users)}>
        <Users aria-hidden className='size-3.5'/>
        <span className='sr-only'>{plural('hub.people', template.users)}</span>
        <span aria-hidden>{formatCompact(template.users)}</span>
      </span>
    </p>
  );
}


export function EffectChips({ names, limit, className }: {names: Array<string>, limit?: number, className?: string}) {
  const { t } = useI18n();
  const shown = (limit) ? names.slice(0, limit) : names;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map((name, index) => (
        <li key={`${name}-${index}`} className='rounded-md bg-surface-3 px-2 py-0.5 text-xs text-fg'>{name}</li>
      ))}
      {(names.length > shown.length) ? (
        <li className='px-1 py-0.5 text-xs text-subtle'>{t('hub.more', {count: names.length - shown.length})}</li>
      ) : null}
    </ul>
  );
}


export function AsksChips({ template, className }: {template: HubTemplate, className?: string}) {
  const { t } = useI18n();
  if (!template.inputs?.length) {
    return null;
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-xs', className)}>
      <span className='font-medium text-muted'>{t('hub.asks_for')}</span>
      {template.inputs.map((input) => (
        <span key={input.key} className='rounded-md border border-brand/40 bg-brand/10 px-2 py-0.5 text-brand-text'>{input.label}</span>
      ))}
    </div>
  );
}


// Copies `template media CODE` (and `KEY="..."` per thing it asks for)
export function CopyLineButton({ template, labelled = false }: {template: HubTemplate, labelled?: boolean}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ failed, setFailed ] = useState(false);
  const label = (failed) ? t('hub.copy_failed') : (copied) ? t('hub.copied_line') : t('hub.copy_line');
  return (
    <button
      type='button'
      aria-label={(labelled) ? undefined : label}
      title={label}
      onClick={async () => setFailed(!(await copy(templateLine(template.code, template.inputs))))}
      className={cn(
        (labelled) ? 'btn btn-secondary' : 'flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-muted hover:bg-surface-3 hover:text-fg',
      )}
    >
      {(failed) ? <X aria-hidden className='size-4 text-danger-text'/> : (copied) ? <Check aria-hidden className='size-4 text-success-text'/> : <Terminal aria-hidden className='size-4'/>}
      {(labelled) ? label : null}
      {/* the icon-only button's change is said out loud too */}
      {(!labelled && (copied || failed)) ? <span role='status' className='sr-only'>{label}</span> : null}
    </button>
  );
}


export function HubCard({ template, effectNames, trying, onOpen, onTry, onReport }: {
  template: HubTemplate,
  effectNames: Map<string, string>,
  // its Try is loading the template (the Activity fetches it before putting it on the start screen)
  trying: boolean,
  onOpen: () => void,
  onTry: () => void,
  onReport: () => void,
}) {
  const { t } = useI18n();
  const names = hubEffectIds(template).map((id) => effectNames.get(id) ?? id);
  return (
    <article className='flex min-w-0 flex-col overflow-hidden rounded-xl border border-line-strong bg-surface transition-colors hover:border-brand/60'>
      {/* the title's button is the keyboard's way in, this one is for pointers */}
      <button type='button' tabIndex={-1} aria-hidden onClick={onOpen} className='block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-deep'>
        <HubMedia preview={template.preview}/>
      </button>
      <div className='flex flex-1 flex-col gap-2.5 p-3'>
        <h3 className='min-w-0'>
          <button
            type='button'
            onClick={onOpen}
            aria-label={t('hub.open', {name: template.name})}
            className='block max-w-full cursor-pointer truncate text-left font-semibold text-white hover:underline focus-visible:underline'
          >
            {template.name}
          </button>
        </h3>
        <HubAuthorLine template={template}/>
        {(names.length) ? <EffectChips names={names} limit={SHOWN_EFFECTS}/> : null}
        <AsksChips template={template}/>
        <div className='mt-auto flex gap-2 pt-1'>
          <button type='button' className='btn btn-primary min-w-0 flex-1' onClick={onTry} disabled={trying}>
            {(trying) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Wand2 aria-hidden className='size-4'/>}
            {t('hub.try')}
          </button>
          <CopyLineButton template={template}/>
          <button
            type='button'
            aria-label={t('hub.report_named', {name: template.name})}
            title={t('hub.report')}
            onClick={onReport}
            className='flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-muted hover:bg-surface-3 hover:text-danger-text'
          >
            <Flag aria-hidden className='size-4'/>
          </button>
        </div>
      </div>
    </article>
  );
}


export function HubCardSkeleton() {
  return (
    <div aria-hidden className='flex animate-pulse flex-col overflow-hidden rounded-xl border border-line bg-surface'>
      <div className='aspect-[4/3] bg-deep'/>
      <div className='flex flex-col gap-2.5 p-3'>
        <div className='h-4 w-2/3 rounded bg-surface-3'/>
        <div className='h-3 w-1/2 rounded bg-surface-3'/>
        <div className='flex gap-1.5'>
          <div className='h-5 w-14 rounded bg-surface-3'/>
          <div className='h-5 w-16 rounded bg-surface-3'/>
          <div className='h-5 w-12 rounded bg-surface-3'/>
        </div>
        <div className='mt-1 h-10 rounded-lg bg-surface-3'/>
      </div>
    </div>
  );
}
