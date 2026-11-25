import { Check, Layers, Link, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';
import type { EditorTemplate } from '../types';


// A shared template on the start screen: whose it is and its steps (effect names from the catalogue once it's in, the
// ids until then). Whatever file is picked next starts with these steps
export function TemplateBanner({ template, effectNames }: {template: EditorTemplate, effectNames?: Map<string, string>}) {
  const { t } = useI18n();
  return (
    <section className='flex flex-col gap-2 rounded-xl border border-brand/50 bg-brand/10 p-4'>
      <p className='flex flex-wrap items-baseline gap-x-2 text-white'>
        <Layers aria-hidden className='size-4 shrink-0 self-center text-brand-text'/>
        <span className='font-semibold'>{t('editor.template.using', {name: template.name})}</span>
        <span className='text-sm text-muted'>{t('editor.template.by', {user: template.user.username})}</span>
      </p>
      <ol className='flex flex-wrap gap-1.5'>
        {template.steps.map((step, index) => (
          <li key={step.id} className='rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-fg'>
            {index + 1}. {effectNames?.get(step.effect) ?? step.effect}
          </li>
        ))}
      </ol>
      <p className='text-sm text-muted'>{t('editor.template.pick')}</p>
    </section>
  );
}


function CopyTemplateLink({ url }: {url: string}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ failed, setFailed ] = useState(false);
  return (
    <button
      type='button'
      aria-label={t('editor.template.copy')}
      title={t('editor.template.copy')}
      onClick={async () => setFailed(!(await copy(url)))}
      className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg'
    >
      {(failed) ? <X aria-hidden className='size-4 text-danger-text'/> : (copied) ? <Check aria-hidden className='size-4 text-success-text'/> : <Link aria-hidden className='size-4'/>}
    </button>
  );
}


// The web start screen's list of your templates: each one's link to copy, how often it's been used, and delete
export function TemplateList({ host }: {host: EditorHost}) {
  const { t, plural } = useI18n();
  const [ templates, setTemplates ] = useState<Array<EditorTemplate> | null>(null);
  const [ deleting, setDeleting ] = useState<EditorTemplate | null>(null);
  const [ pending, setPending ] = useState(false);

  useEffect(() => {
    let alive = true;
    host.api.templates().then((result) => {
      if (alive) {
        setTemplates(result.templates);
      }
    }).catch(() => {
      if (alive) {
        setTemplates([]);
      }
    });
    return () => {
      alive = false;
    };
  }, [host]);

  return (
    <section className='flex flex-col gap-3'>
      <h2 className='font-display text-lg font-bold text-white'>{t('editor.template.yours')}</h2>
      {(templates === null) ? (
        <Spinner/>
      ) : (!templates.length) ? (
        <p className='text-sm text-muted'>{t('editor.template.yours_empty')}</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {templates.map((template) => (
            <li key={template.id} className='flex items-center gap-2 rounded-lg border border-line-strong bg-surface p-2 pl-3'>
              <Layers aria-hidden className='size-4 shrink-0 text-brand-text'/>
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-sm font-semibold text-white'>{template.name}</span>
                <span className='text-xs text-muted'>
                  {plural('editor.start.steps', template.steps.length)} · {plural('editor.template.uses', template.uses)}
                </span>
              </span>
              <CopyTemplateLink url={host.templateUrl(template.id)}/>
              <button
                type='button'
                aria-label={t('editor.template.delete', {name: template.name})}
                onClick={() => setDeleting(template)}
                className='flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger-text'
              >
                <Trash2 aria-hidden className='size-4'/>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(deleting) ? (
        <ConfirmDialog
          title={t('editor.template.delete_title')}
          description={t('editor.template.delete_description')}
          confirmLabel={t('editor.template.delete', {name: deleting.name})}
          pending={pending}
          onConfirm={async () => {
            setPending(true);
            try {
              await host.api.deleteTemplate(deleting.id);
              setTemplates((items) => (items ?? []).filter((item) => item.id !== deleting.id));
              setDeleting(null);
            } finally {
              setPending(false);
            }
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
}
