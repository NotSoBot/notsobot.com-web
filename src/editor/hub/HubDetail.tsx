import { Flag, Wand2 } from 'lucide-react';
import { useId } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { intlLocale, useI18n } from '@/i18n';

import { AsksChips, CopyLineButton, EffectChips, HubAuthorLine, hubEffectIds } from './HubCard';
import { HubMedia } from './HubMedia';
import { templateLine } from './mediascript';
import type { HubTemplate } from './types';


// A template's own view: the bigger example, its description, every effect, what it asks for and its MediaScript line.
// `template` is null while a link to one that isn't in the list yet loads, `missing` once the api says it isn't there
export function HubDetailDialog({ template, missing, effectNames, trying, onTry, onReport, onClose }: {
  template: HubTemplate | null,
  missing: boolean,
  effectNames: Map<string, string>,
  trying: boolean,
  onTry: () => void,
  onReport: () => void,
  onClose: () => void,
}) {
  const { t, plural, language } = useI18n();
  const titleId = useId();
  if (!template) {
    return (
      <Modal labelledBy={titleId} onClose={onClose} className='max-w-md'>
        <div className='flex flex-col items-center gap-4 p-8 text-center'>
          <h2 id={titleId} className='sr-only'>{t('hub.title')}</h2>
          {(missing) ? <p className='text-muted'>{t('hub.detail.not_found')}</p> : <Spinner/>}
        </div>
      </Modal>
    );
  }
  const names = hubEffectIds(template).map((id) => effectNames.get(id) ?? id);
  const published = (template.published_at) ? new Intl.DateTimeFormat(intlLocale(language), {dateStyle: 'medium'}).format(new Date(template.published_at)) : null;
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-2xl' stickyClose>
      <div className='flex flex-col gap-5 p-5 sm:p-6'>
        <div className='-mx-5 -mt-5 flex max-h-[55dvh] min-h-48 items-center justify-center overflow-hidden rounded-t-xl border-b border-line bg-deep sm:-mx-6 sm:-mt-6'>
          <HubMedia preview={template.preview} detail className='max-h-[55dvh]'/>
        </div>
        <div className='flex flex-col gap-2'>
          <h2 id={titleId} className='pr-10 text-xl font-semibold break-words text-white'>{template.name}</h2>
          <HubAuthorLine template={template}/>
          <p className='text-xs text-subtle'>
            {plural('hub.steps', template.step_count ?? names.length)}
            {(template.users_week) ? <> · {plural('hub.people_week', template.users_week)}</> : null}
            {(published) ? <> · {t('hub.detail.published', {date: published})}</> : null}
          </p>
        </div>
        {(template.description) ? <p className='text-sm whitespace-pre-line break-words text-fg'>{template.description}</p> : null}
        {(names.length) ? (
          <section className='flex flex-col gap-2'>
            <h3 className='text-sm font-semibold text-white'>{t('hub.detail.effects')}</h3>
            <EffectChips names={names}/>
          </section>
        ) : null}
        <AsksChips template={template}/>
        <section className='flex flex-col gap-2'>
          <h3 className='text-sm font-semibold text-white'>{t('hub.detail.mediascript')}</h3>
          <p className='text-xs text-muted'>{t('hub.detail.mediascript_hint')}</p>
          <code className='block overflow-x-auto rounded-lg border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre text-fg'>
            {templateLine(template.code, template.inputs)}
          </code>
          {(template.inputs?.length) ? <p className='text-xs text-muted'>{t('hub.detail.inputs_hint')}</p> : null}
        </section>
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:items-center'>
          <button type='button' className='btn btn-secondary sm:mr-auto' onClick={onReport}>
            <Flag aria-hidden className='size-4'/>{t('hub.report')}
          </button>
          <CopyLineButton template={template} labelled/>
          <button type='button' className='btn btn-primary' onClick={onTry} disabled={trying} data-autofocus>
            {(trying) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Wand2 aria-hidden className='size-4'/>}
            {t('hub.try')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
