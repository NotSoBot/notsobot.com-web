import { Compass, X } from 'lucide-react';
import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/i18n';

import type { EditorHost } from '../api';
import type { EditorTemplate } from '../types';
import { HubBrowser } from './HubBrowser';


// The hub inside the Activity: a panel over the start screen. Try loads the template (its steps) and hands it to the
// start screen, which then starts whatever's picked with it, the same as a shared template link
function HubPanel({ host, onPick, onClose }: {host: EditorHost, onPick: (template: EditorTemplate) => void, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ openCode, setOpenCode ] = useState<string | null>(null);
  const [ error, setError ] = useState<string | null>(null);
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-5xl' stickyClose>
      <div className='flex flex-col gap-4 p-4 sm:p-6'>
        <div>
          <h2 id={titleId} className='pr-10 font-display text-2xl font-bold text-white'>{t('hub.title')}</h2>
          <p className='mt-1 text-sm text-muted'>{t('hub.description')}</p>
        </div>
        {(error) ? <p role='alert' className='text-sm text-danger-text'>{error}</p> : null}
        <HubBrowser
          host={host}
          loggedIn
          openCode={openCode}
          onOpenCode={setOpenCode}
          onTry={async (item) => {
            setError(null);
            try {
              onPick(await host.api.template(item.code));
            } catch (failure) {
              setError(host.errorOf(failure)?.message || t('hub.entry.error'));
            }
          }}
        />
      </div>
    </Modal>
  );
}


// The start screen's way to the hub. The site opens its page (`host.openHub`), the Activity a panel whose Try puts the
// template on this start screen (`onPick`); `picked` is that one, with a way to drop it again
export function HubEntry({ host, picked, onPick, onUnpick, disabled = false }: {
  host: EditorHost,
  picked: EditorTemplate | null,
  onPick: (template: EditorTemplate) => void,
  onUnpick: () => void,
  disabled?: boolean,
}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  return (
    <section className='flex flex-col gap-2 rounded-xl border border-line-strong bg-surface p-3 sm:flex-row sm:items-center sm:gap-3'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <Compass aria-hidden className='size-6 shrink-0 text-brand-text'/>
        <div className='min-w-0'>
          <p className='font-semibold text-white'>{t('hub.title')}</p>
          <p className='text-sm text-muted'>
            {(picked) ? t('hub.entry.using', {name: picked.name}) : t('hub.entry.description')}
          </p>
        </div>
      </div>
      <div className='flex gap-2'>
        {(picked) ? (
          <button type='button' className='btn btn-secondary flex-1 sm:flex-none' onClick={onUnpick} disabled={disabled}>
            <X aria-hidden className='size-4'/>{t('hub.entry.remove')}
          </button>
        ) : null}
        <button
          type='button'
          className='btn btn-secondary flex-1 sm:flex-none'
          disabled={disabled}
          onClick={() => (host.openHub) ? host.openHub() : setOpen(true)}
        >
          {t('hub.entry.browse')}
        </button>
      </div>
      {(open) ? (
        <HubPanel
          host={host}
          onPick={(template) => {
            onPick(template);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}
