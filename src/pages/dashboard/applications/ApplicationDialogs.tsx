import { KeyRound, TriangleAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { ApplicationFlags, type Application, type ApplicationWithToken } from '@/lib/api';

import { CopyButton, Chip } from '../admin/adminUi';
import { CharCounter, Field } from '../ui';


export const APPLICATION_NAME_MIN_LENGTH = 3;
export const APPLICATION_NAME_MAX_LENGTH = 32;


export function isApplicationDisabled(application: Pick<Application, 'flags'>): boolean {
  return (application.flags & ApplicationFlags.DISABLED) === ApplicationFlags.DISABLED;
}

export function isNotSoBotApplication(application: Pick<Application, 'flags'>): boolean {
  return (application.flags & ApplicationFlags.NOTSOBOT) === ApplicationFlags.NOTSOBOT;
}

export function ApplicationChips({ application }: {application: Pick<Application, 'flags'>}) {
  const { t } = useI18n();
  return (
    <>
      {(isNotSoBotApplication(application)) ? <Chip tone='brand' title={t('apps.chip.notsobot_title')}>NotSoBot</Chip> : null}
      {(isApplicationDisabled(application)) ? <Chip tone='danger' title={t('apps.chip.disabled_title')}>{t('apps.chip.disabled')}</Chip> : null}
    </>
  );
}


// Names a new application or renames one (the caller's own, or any from the admin panel)
export function ApplicationNameDialog({ title, initialName = '', submitLabel, pending, error, onSubmit, onClose }: {
  title: string,
  initialName?: string,
  submitLabel: string,
  pending: boolean,
  error?: ReactNode,
  onSubmit: (name: string) => void,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ name, setName ] = useState(initialName);

  const trimmed = name.replace(/[\r\n]+/g, ' ').trim();
  const tooShort = trimmed.length < APPLICATION_NAME_MIN_LENGTH;
  const tooLong = APPLICATION_NAME_MAX_LENGTH < trimmed.length;
  const valid = !tooShort && !tooLong;
  const changed = trimmed !== initialName;

  return (
    <Modal labelledBy={titleId} onClose={() => !pending && onClose()} className='max-w-md'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending && valid && changed) {
            onSubmit(trimmed);
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>{title}</h2>
        <p className='mt-2 text-sm text-muted'>{t('apps.name_description')}</p>

        <Field
          className='mt-4'
          label={t('apps.name')}
          error={(tooLong) ? t('apps.name_too_long', {max: APPLICATION_NAME_MAX_LENGTH}) : undefined}
          counter={<CharCounter length={trimmed.length} max={APPLICATION_NAME_MAX_LENGTH}/>}
        >
          {(props) => (
            <input
              {...props}
              className='input'
              value={name}
              autoComplete='off'
              spellCheck={false}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

        {(error) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{error}</p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={pending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={pending || !valid || !changed}>
            {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// Shows an application's token once it's created, revealed or reset. Nothing keeps it after this closes.
export function ApplicationTokenDialog({ application, heading, onClose }: {
  application: ApplicationWithToken,
  heading: string,
  onClose: () => void,
}) {
  const { t, rich } = useI18n();
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-lg'>
      <div className='p-5 sm:p-6'>
        <h2 id={titleId} className='flex items-center gap-2 pr-10 text-lg font-semibold text-white'>
          <KeyRound aria-hidden className='size-5 shrink-0 text-success-text'/>
          {heading}
        </h2>
        <p className='mt-2 text-sm break-words text-muted'>{application.name}</p>

        <div className='mt-3 flex items-start gap-2 rounded-md border border-line bg-deep p-3'>
          <code className='min-w-0 flex-1 font-mono text-xs break-all text-fg select-all'>{application.token}</code>
          <CopyButton value={application.token}/>
        </div>

        <p className='mt-3 text-sm text-muted'>
          {rich('apps.token_usage', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}
        </p>

        <p className='mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg'>
          <TriangleAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
          {t('apps.token_warning')}
        </p>

        <div className='mt-6 flex justify-end'>
          <button type='button' className='btn btn-primary' onClick={onClose}>{t('report.done')}</button>
        </div>
      </div>
    </Modal>
  );
}
