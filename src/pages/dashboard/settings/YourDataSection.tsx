import { CircleCheck, Download, Info, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { Routes, Urls } from '@/config';
import { useI18n } from '@/i18n';
import type { UserDataExport } from '@/lib/api';
import { errorMessage, isNotAvailableYet, useDeleteMeMutation, useExportMeDataMutation } from '@/lib/api/dashboardQueries';
import { downloadJson } from '@/lib/utils';

import { Panel } from '../ui';


const YOUR_DATA_ANCHOR = 'your-data';


// Export/delete, at the bottom of the settings page. Not tied to the settings loading, so it works even when they don't.
export function YourDataSection() {
  const { t, rich } = useI18n();
  return (
    <section id={YOUR_DATA_ANCHOR} aria-labelledby={`${YOUR_DATA_ANCHOR}-title`} className='mt-10 scroll-mt-24'>
      <h2 id={`${YOUR_DATA_ANCHOR}-title`} className='text-xl font-bold text-white'>{t('data.title')}</h2>
      <p className='mt-1 mb-4 text-muted'>
        {rich('data.description', {link: (chunk) => <Link to={Routes.LEGAL_PRIVACY} className='text-code hover:underline'>{chunk}</Link>})}
      </p>
      <div className='space-y-4'>
        <ExportPanel/>
        <DeletePanel/>
      </div>
    </section>
  );
}


function NotAvailableYet() {
  return (
    <Notice tone='info'>
      <UnavailableText/>
    </Notice>
  );
}


function UnavailableText() {
  const { rich } = useI18n();
  return rich('data.unavailable', {email: (chunk) => <a href={`mailto:${chunk}`} className='text-code hover:underline'>{chunk}</a>}, {email: Urls.CONTACT_EMAIL});
}


function Notice({ tone, children }: {tone: 'info' | 'success' | 'error', children: ReactNode}) {
  const Icon = (tone === 'success') ? CircleCheck : Info;
  const color = (tone === 'success') ? 'border-success/40 bg-success/10' : (tone === 'error') ? 'border-danger/40 bg-danger/10' : 'border-brand/40 bg-brand/10';
  return (
    <p role={(tone === 'error') ? 'alert' : 'status'} className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-fg ${color}`}>
      <Icon aria-hidden className='mt-0.5 size-4 shrink-0'/>
      <span className='min-w-0'>{children}</span>
    </p>
  );
}



function exportFilename(data: UserDataExport): string {
  const date = new Date(data.timestamp).toISOString().slice(0, 10);
  return `notsobot-data-${data.user.id}-${date}.json`;
}


function ExportPanel() {
  const { t, rich } = useI18n();
  const exportData = useExportMeDataMutation();
  const [ filename, setFilename ] = useState<string | null>(null);
  const runExport = () => {
    setFilename(null);
    exportData.mutate(undefined, {
      onSuccess: (data) => {
        const name = exportFilename(data);
        downloadJson(name, data);
        setFilename(name);
      },
    });
  };

  return (
    <Panel headingLevel={3} title={t('data.export.title')} accent='#5865f2' description={t('data.export.description')}>
      <ul className='list-disc space-y-1 pl-5 text-sm text-muted'>
        <li>{t('data.export.item_1')}</li>
        <li>{t('data.export.item_2')}</li>
        <li>{t('data.export.item_3')}</li>
      </ul>
      <p className='mt-3 text-sm text-muted'>{t('data.export.format')}</p>
      <button type='button' className='btn btn-primary mt-4' disabled={exportData.isPending} onClick={runExport}>
        {(exportData.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Download aria-hidden className='size-4'/>}
        {t((exportData.isPending) ? 'data.export.preparing' : 'data.export.download')}
      </button>
      {(exportData.isSuccess && filename) ? (
        <Notice tone='success'>{rich('data.export.done', {b: (chunk) => <span className='font-mono'>{chunk}</span>}, {filename})}</Notice>
      ) : (isNotAvailableYet(exportData.error)) ? (
        <NotAvailableYet/>
      ) : (exportData.isError) ? (
        <Notice tone='error'>{errorMessage(exportData.error, t('data.export.error'))}</Notice>
      ) : null}
    </Panel>
  );
}


function DeletePanel() {
  const { logout } = useAuth();
  const { t } = useI18n();
  const remove = useDeleteMeMutation();
  const [ confirming, setConfirming ] = useState(false);
  const unavailable = isNotAvailableYet(remove.error);

  return (
    <Panel headingLevel={3} title={t('data.delete.title')} accent='#ed4245' description={t('data.delete.description')}>
      <ul className='list-disc space-y-1 pl-5 text-sm text-muted'>
        <li>{t('data.delete.item_1')}</li>
        <li>{t('data.delete.item_2')}</li>
        <li>{t('data.delete.item_3')}</li>
        <li>{t('data.delete.item_4')}</li>
        <li>{t('data.delete.item_5')}</li>
      </ul>
      <button type='button' className='btn btn-danger mt-4' onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden className='size-4'/>
        {t('data.delete.button')}
      </button>
      {(unavailable && !confirming) ? <NotAvailableYet/> : null}

      {(confirming) ? (
        <ConfirmDialog
          title={t('data.delete.confirm_title')}
          description={t('data.delete.confirm_description')}
          confirmLabel={t('data.delete.confirm')}
          confirmPhrase={t('data.delete.phrase')}
          pending={remove.isPending}
          error={(unavailable) ? (
            <UnavailableText/>
          ) : (remove.isError) ? errorMessage(remove.error, t('data.delete.error')) : null}
          onClose={() => setConfirming(false)}
          onConfirm={() => remove.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              void logout();
            },
          })}
        />
      ) : null}
    </Panel>
  );
}
