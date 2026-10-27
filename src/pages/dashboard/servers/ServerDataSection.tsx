import { Download, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { isOwner, useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { translate, translatePlural, useI18n } from '@/i18n';
import type { UserGuild, UserGuildDataExport } from '@/lib/api';
import { errorMessage, useDeleteGuildDataMutation, useExportGuildDataMutation, useGuildScope } from '@/lib/api/dashboardQueries';
import { downloadJson } from '@/lib/utils';

import { Panel } from '../ui';


function exportFilename(guildId: string, data: UserGuildDataExport): string {
  const date = new Date(data.timestamp).toISOString().slice(0, 10);
  return `notsobot-server-${guildId}-${date}.json`;
}


// Owner only: download or wipe what NotSoBot stores for this server. From the admin panel only bot owners can do either.
export function ServerDataSection({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const staff = useGuildScope() === 'admin';
  const canExport = (staff) ? isOwner(user) : guild.owner;
  const canDelete = canExport;
  const readOnly = (canExport) ? undefined
    : t((staff) ? 'sdata.staff_only' : 'sdata.owner_only');
  const exportData = useExportGuildDataMutation(guild.id);
  const deleteData = useDeleteGuildDataMutation(guild.id);
  const [ confirmingDelete, setConfirmingDelete ] = useState(false);

  const runExport = () => {
    exportData.mutate(undefined, {
      onSuccess: (data) => {
        downloadJson(exportFilename(guild.id, data), data);
        toast(translate('sdata.exported'));
      },
      onError: (error) => toast(errorMessage(error, translate('sdata.export_error')), 'error'),
    });
  };

  const confirmDelete = () => {
    deleteData.mutate(undefined, {
      onSuccess: ({ tags_deleted }) => {
        setConfirmingDelete(false);
        toast((tags_deleted) ? translatePlural('sdata.deleted_tags', tags_deleted) : translate('sdata.deleted'));
      },
    });
  };

  return (
    <Panel
      title={t('sdata.title')}
      accent='#ed4245'
      description={t('sdata.description')}
      readOnly={readOnly}
    >
      <div className='space-y-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 text-sm'>
            <p className='font-medium text-white'>{t('sdata.export')}</p>
            <p className='mt-0.5 text-muted'>{t('sdata.export_description')}</p>
          </div>
          <button type='button' className='btn btn-secondary shrink-0' onClick={runExport} disabled={!canExport || exportData.isPending}>
            {(exportData.isPending) ? <Spinner className='size-4'/> : <Download aria-hidden className='size-4'/>}
            {t('sdata.export_button')}
          </button>
        </div>

        <p className='flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
          <ShieldAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
          <span>{t('sdata.export_note')}</span>
        </p>

        <div className='flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 text-sm'>
            <p className='font-medium text-white'>{t('sdata.delete')}</p>
            <p className='mt-0.5 text-muted'>{t('sdata.delete_description')}</p>
          </div>
          <button
            type='button'
            className='btn btn-danger shrink-0'
            onClick={() => setConfirmingDelete(true)}
            disabled={!canDelete || deleteData.isPending}
          >
            <Trash2 aria-hidden className='size-4'/>
            {t('sdata.delete_button')}
          </button>
        </div>
      </div>

      {(confirmingDelete) ? (
        <ConfirmDialog
          title={t('sdata.confirm_title', {name: guild.name})}
          description={(
            <>
              <p>{t('sdata.confirm_1')}</p>
              <p className='mt-2'>{t('sdata.confirm_2')}</p>
            </>
          )}
          confirmLabel={t('sdata.confirm')}
          confirmPhrase={t('sdata.phrase')}
          pending={deleteData.isPending}
          error={(deleteData.isError) ? errorMessage(deleteData.error, t('sdata.delete_error')) : null}
          onConfirm={confirmDelete}
          onClose={() => {
            deleteData.reset();
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </Panel>
  );
}
