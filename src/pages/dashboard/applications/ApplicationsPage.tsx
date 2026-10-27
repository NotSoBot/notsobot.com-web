import { Blocks, Eye, Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import type { Application, ApplicationWithToken } from '@/lib/api';
import {
  errorMessage,
  useCreateMeApplicationMutation,
  useDeleteMeApplicationMutation,
  useMeApplicationsQuery,
  usePatchMeApplicationMutation,
  useResetMeApplicationTokenMutation,
  useRevealMeApplicationTokenMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate } from '@/lib/utils';

import { CopyableValue } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';
import { ApplicationChips, ApplicationNameDialog, ApplicationTokenDialog, isNotSoBotApplication } from './ApplicationDialogs';


type Dialog =
  | {kind: 'create'}
  | {kind: 'rename', application: Application}
  | {kind: 'reset', application: Application}
  | {kind: 'delete', application: Application}
  | {kind: 'token', application: ApplicationWithToken, heading: string};


export function ApplicationsPage() {
  const { t, rich } = useI18n();
  const { data, isPending, isError, error, isRefetching, refetch } = useMeApplicationsQuery();
  const create = useCreateMeApplicationMutation();
  const rename = usePatchMeApplicationMutation();
  const remove = useDeleteMeApplicationMutation();
  const reveal = useRevealMeApplicationTokenMutation();
  const reset = useResetMeApplicationTokenMutation();
  const toast = useToast();
  const [ dialog, setDialog ] = useState<Dialog | null>(null);

  const items = data?.items ?? [];
  const canCreate = !!data?.can_create;
  const atLimit = !!data && data.limit <= data.count;

  const close = () => {
    create.reset();
    rename.reset();
    remove.reset();
    reset.reset();
    setDialog(null);
  };

  const showToken = (application: Application) => {
    reveal.mutate(application.id, {
      onSuccess: (withToken) => setDialog({kind: 'token', application: withToken, heading: t('apps.token_title')}),
      onError: (revealError) => toast(errorMessage(revealError, t('apps.token_error')), 'error'),
    });
  };

  return (
    <>
      <DashboardHeader
        title={t('dash.nav.applications')}
        description={t('apps.description')}
      >
        {(data) ? (
          <button
            type='button'
            className='btn btn-primary'
            disabled={!canCreate || atLimit}
            title={(!canCreate) ? t('apps.no_access') : (atLimit) ? t('apps.limit', {limit: data.limit}) : undefined}
            onClick={() => setDialog({kind: 'create'})}
          >
            <Plus className='size-4'/>
            {t('apps.new')}
          </button>
        ) : null}
      </DashboardHeader>

      {(data && !canCreate) ? (
        <div role='alert' className='mb-4 flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-fg'>
          <TriangleAlert aria-hidden className='mt-0.5 size-5 shrink-0 text-warning'/>
          <div>
            <div className='font-semibold text-white'>{t('apps.no_access')}</div>
            <p className='mt-1'>
              {rich('apps.no_access_description', {link: (chunk) => <a href={Routes.SUPPORT} className='font-medium text-white underline underline-offset-2 hover:text-code'>{chunk}</a>})}
            </p>
          </div>
        </div>
      ) : null}

      {(isPending) ? (
        <ListSkeleton/>
      ) : (isError) ? (
        <ErrorPanel title={t('apps.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Blocks className='size-10'/>} title={t('apps.empty')}>
          {(canCreate) ? t('apps.empty_description') : null}
        </EmptyState>
      ) : (
        <>
          <ul className='card divide-y divide-line'>
            {items.map((application) => (
              <li key={application.id} className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center'>
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                  <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#3ba55c]/15'>
                    <Blocks className='size-5 text-[#3ba55c]'/>
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <span className='truncate font-medium text-white'>{application.name}</span>
                      <ApplicationChips application={application}/>
                    </div>
                    <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
                      <CopyableValue value={application.id} truncate={0}/>
                      <span>{t('apps.created', {date: formatDate(application.created)})}</span>
                    </div>
                  </div>
                </div>
                <div className='flex shrink-0 flex-wrap gap-1.5 sm:justify-end'>
                  <button
                    type='button'
                    className='btn btn-sm btn-secondary'
                    disabled={!canCreate || reveal.isPending}
                    title={(!canCreate) ? t('apps.token_needs_access') : undefined}
                    onClick={() => showToken(application)}
                  >
                    {(reveal.isPending && reveal.variables === application.id) ? <Spinner className='size-4'/> : <Eye className='size-4'/>}
                    {t('apps.token')}
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-ghost'
                    disabled={!canCreate}
                    title={t((!canCreate) ? 'apps.reset_needs_access' : 'apps.reset_token')}
                    onClick={() => setDialog({kind: 'reset', application})}
                  >
                    <RefreshCw className='size-4'/>
                    <span className='sr-only sm:not-sr-only'>{t('apps.reset')}</span>
                  </button>
                  <button type='button' className='btn btn-sm btn-ghost' title={t('apps.rename')} onClick={() => setDialog({kind: 'rename', application})}>
                    <Pencil className='size-4'/>
                    <span className='sr-only'>{t('apps.rename')}</span>
                  </button>
                  <button type='button' className='btn btn-sm btn-ghost text-danger' title={t('common.delete')} onClick={() => setDialog({kind: 'delete', application})}>
                    <Trash2 className='size-4'/>
                    <span className='sr-only'>{t('common.delete')}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className='mt-3 text-xs text-subtle'>
            {t('apps.count', {count: items.length, limit: data?.limit ?? 0})}
          </p>
        </>
      )}

      {(dialog?.kind === 'create') ? (
        <ApplicationNameDialog
          title={t('apps.new')}
          submitLabel={t('common.create')}
          pending={create.isPending}
          error={(create.isError) ? errorMessage(create.error, t('apps.create_error')) : null}
          onSubmit={(name) => create.mutate(name, {
            onSuccess: (application) => setDialog({kind: 'token', application, heading: t('apps.created_heading')}),
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'rename') ? (
        <ApplicationNameDialog
          title={t('apps.rename_title', {name: dialog.application.name})}
          initialName={dialog.application.name}
          submitLabel={t('common.save')}
          pending={rename.isPending}
          error={(rename.isError) ? errorMessage(rename.error, t('apps.rename_error')) : null}
          onSubmit={(name) => rename.mutate({applicationId: dialog.application.id, name}, {
            onSuccess: (updated) => {
              toast(t('apps.renamed', {name: updated.name}));
              close();
            },
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'reset') ? (
        <ConfirmDialog
          title={t('apps.reset_title', {name: dialog.application.name})}
          description={
            <>
              {t('apps.reset_description')}
              {(isNotSoBotApplication(dialog.application)) ? <strong className='mt-2 block text-white'>{t('apps.reset_notsobot')}</strong> : null}
            </>
          }
          confirmLabel={t('apps.reset_token')}
          confirmPhrase={(isNotSoBotApplication(dialog.application)) ? dialog.application.name : undefined}
          pending={reset.isPending}
          error={(reset.isError) ? errorMessage(reset.error, t('apps.reset_error')) : null}
          onConfirm={() => reset.mutate(dialog.application.id, {
            onSuccess: (application) => setDialog({kind: 'token', application, heading: t('apps.new_token')}),
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'delete') ? (
        <ConfirmDialog
          title={t('apps.delete_title', {name: dialog.application.name})}
          description={
            <>
              {t('apps.delete_description')}
              {(isNotSoBotApplication(dialog.application)) ? <strong className='mt-2 block text-white'>{t('apps.delete_notsobot')}</strong> : null}
            </>
          }
          confirmLabel={t('apps.delete')}
          confirmPhrase={(isNotSoBotApplication(dialog.application)) ? dialog.application.name : undefined}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, t('apps.delete_error')) : null}
          onConfirm={() => remove.mutate(dialog.application.id, {
            onSuccess: () => {
              toast(t('apps.deleted', {name: dialog.application.name}));
              close();
            },
          })}
          onClose={close}
        />
      ) : (dialog?.kind === 'token') ? (
        <ApplicationTokenDialog application={dialog.application} heading={dialog.heading} onClose={close}/>
      ) : null}
    </>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className='flex items-center gap-3 px-4 py-3'>
          <Skeleton className='size-9 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-40'/>
            <Skeleton className='mt-1.5 h-3 w-28 bg-surface-2'/>
          </div>
          <Skeleton className='h-8 w-24 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
