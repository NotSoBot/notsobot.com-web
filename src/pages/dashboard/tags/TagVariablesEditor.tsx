import { Braces, Pencil, Plus, Trash2, Variable } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { translate, useI18n } from '@/i18n';
import type { Tag, TagStorageScope, TagStorageType } from '@/lib/api';
import {
  errorMessage,
  useDeleteMeTagVariableMutation,
  useMeTagVariablesQuery,
  usePutMeTagVariableMutation,
} from '@/lib/api/dashboardQueries';
import { cn, formatNumber } from '@/lib/utils';

import { CharCounter, EmptyState, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, ReadOnlyNote } from '../ui';
import { storageIdFor } from './StorageScopeForm';
import {
  formatJson,
  isJson,
  STORAGE_ORDER,
  TAG_VARIABLE_NAME_MAX,
  TAG_VARIABLE_VALUE_MAX,
  TAG_VARIABLES_PER_STORAGE,
  type StorageMeta,
} from './tagMeta';


export function TagVariablesEditor({ tag, scope, readOnly, onDirtyChange }: {
  tag: Tag,
  scope: TagStorageScope,
  readOnly: boolean,
  onDirtyChange: (dirty: boolean) => void,
}) {
  const { t } = useI18n();
  const { data, isPending, isError, error, refetch, isRefetching } = useMeTagVariablesQuery(tag.id, scope);

  // open editors with unsaved text, keyed `${type}:${name}`
  const [ dirtyKeys, setDirtyKeys ] = useState<ReadonlySet<string>>(new Set());
  const setDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((previous) => {
      if (previous.has(key) === dirty) {
        return previous;
      }
      const next = new Set(previous);
      if (dirty) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    onDirtyChange(0 < dirtyKeys.size);
  }, [dirtyKeys, onDirtyChange]);

  if (isPending) {
    return <div className='space-y-4'><PanelSkeleton rows={2}/><PanelSkeleton rows={2}/></div>;
  }
  if (isError) {
    return <ErrorPanel title={t('dtags.vars.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>;
  }

  return (
    <div className='space-y-4'>
      {(readOnly) ? <ReadOnlyNote>{t('dtags.vars.locked')}</ReadOnlyNote> : null}
      {STORAGE_ORDER.map((meta) => {
        const storageId = storageIdFor(scope, meta.type);
        return (
          <StorageGroup
            key={`${meta.type}:${storageId}`}
            tagId={tag.id}
            scope={scope}
            meta={meta}
            storageId={storageId}
            variables={data[`${meta.type}`] ?? {}}
            readOnly={readOnly}
            setDirty={setDirty}
          />
        );
      })}
    </div>
  );
}


function StorageGroup({ tagId, scope, meta, storageId, variables, readOnly, setDirty }: {
  tagId: string,
  scope: TagStorageScope,
  meta: StorageMeta,
  storageId: string | null,
  variables: Record<string, string>,
  readOnly: boolean,
  setDirty: (key: string, dirty: boolean) => void,
}) {
  const { t } = useI18n();
  const [ adding, setAdding ] = useState(false);
  const entries = Object.entries(variables).sort(([a], [b]) => a.localeCompare(b));
  const full = TAG_VARIABLES_PER_STORAGE <= entries.length;

  return (
    <Panel
      headingLevel={3}
      title={meta.label}
      accent={meta.color}
      description={(storageId && storageId !== '0') ? <>{meta.description} <span className='font-mono text-subtle'>{storageId}</span></> : meta.description}
      actions={(storageId) ? (
        <>
          <span className='text-xs text-subtle tabular-nums'>{entries.length} / {TAG_VARIABLES_PER_STORAGE}</span>
          {(!readOnly) ? (
            <button type='button' className='btn btn-secondary btn-sm' disabled={full || adding} onClick={() => setAdding(true)} title={full ? t('dtags.vars.full') : undefined}>
              <Plus aria-hidden className='size-3.5'/> {t('common.add')}
            </button>
          ) : null}
        </>
      ) : null}
    >
      {(!storageId) ? (
        <p className='text-sm text-subtle'>{t('dtags.storage.enter_id', {type: meta.label.toLowerCase()})}</p>
      ) : (
        <div className='space-y-2'>
          {(adding) ? (
            <VariableEditor
              tagId={tagId}
              scope={scope}
              storageType={meta.type}
              storageId={storageId}
              existingNames={Object.keys(variables)}
              onDone={() => setAdding(false)}
              setDirty={setDirty}
            />
          ) : null}
          {(entries.length) ? (
            <ul className='space-y-2'>
              {entries.map(([ name, value ]) => (
                <VariableRow
                  key={name}
                  tagId={tagId}
                  scope={scope}
                  storageType={meta.type}
                  storageId={storageId}
                  name={name}
                  value={value}
                  readOnly={readOnly}
                  setDirty={setDirty}
                />
              ))}
            </ul>
          ) : (!adding) ? (
            <EmptyState icon={<Variable className='size-7'/>} title={t('dtags.vars.empty')}>
              {(readOnly) ? null : t('dtags.vars.empty_description')}
            </EmptyState>
          ) : null}
        </div>
      )}
    </Panel>
  );
}


function VariableRow({ tagId, scope, storageType, storageId, name, value, readOnly, setDirty }: {
  tagId: string,
  scope: TagStorageScope,
  storageType: TagStorageType,
  storageId: string,
  name: string,
  value: string,
  readOnly: boolean,
  setDirty: (key: string, dirty: boolean) => void,
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [ editing, setEditing ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);
  const remove = useDeleteMeTagVariableMutation(tagId, scope);
  const json = isJson(value);

  if (editing) {
    return (
      <li>
        <VariableEditor
          tagId={tagId}
          scope={scope}
          storageType={storageType}
          storageId={storageId}
          initialName={name}
          initialValue={value}
          onDone={() => setEditing(false)}
          setDirty={setDirty}
        />
      </li>
    );
  }

  return (
    <li className='rounded-md border border-line bg-surface-2 p-3'>
      <div className='flex items-start gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-mono text-sm break-all text-white'>{name}</span>
            {(json) ? <span className='inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted'><Braces aria-hidden className='size-3'/>JSON</span> : null}
          </div>
          <pre className='mt-1.5 max-h-40 overflow-auto rounded bg-deep px-2.5 py-1.5 font-mono text-xs break-all whitespace-pre-wrap text-code'>{(json) ? formatJson(value) ?? value : value}</pre>
        </div>
        {(!readOnly) ? (
          <div className='flex shrink-0 gap-1'>
            <button type='button' className='btn btn-ghost btn-sm px-2' aria-label={t('dtags.vars.edit', {name})} onClick={() => setEditing(true)}>
              <Pencil aria-hidden className='size-4'/>
            </button>
            <button type='button' className='btn btn-ghost btn-sm px-2 hover:text-danger' aria-label={t('dtags.delete_label', {name})} onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden className='size-4'/>
            </button>
          </div>
        ) : null}
      </div>

      {(confirming) ? (
        <ConfirmDialog
          title={t('dtags.vars.delete_title', {name})}
          description={t('dtags.vars.delete_description')}
          confirmLabel={t('dtags.vars.delete')}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error) : null}
          onClose={() => {
            remove.reset();
            setConfirming(false);
          }}
          onConfirm={() => remove.mutate({storageType, storageId, name}, {
            onSuccess: () => {
              setConfirming(false);
              toast(translate('dtags.vars.deleted', {name}));
            },
          })}
        />
      ) : null}
    </li>
  );
}


// add (no initialName) or edit a variable
function VariableEditor({ tagId, scope, storageType, storageId, initialName, initialValue = '', existingNames = [], onDone, setDirty }: {
  tagId: string,
  scope: TagStorageScope,
  storageType: TagStorageType,
  storageId: string,
  initialName?: string,
  initialValue?: string,
  existingNames?: Array<string>,
  onDone: () => void,
  setDirty: (key: string, dirty: boolean) => void,
}) {
  const { t } = useI18n();
  const toast = useToast();
  const put = usePutMeTagVariableMutation(tagId, scope);
  const [ name, setName ] = useState(initialName ?? '');
  const [ value, setValue ] = useState(initialValue);
  const isNew = initialName === undefined;
  const dirtyKey = `${storageType}:${initialName ?? '\u0000new'}`;
  const dirty = name !== (initialName ?? '') || value !== initialValue;

  useEffect(() => {
    setDirty(dirtyKey, dirty);
  }, [dirtyKey, dirty, setDirty]);
  useEffect(() => () => setDirty(dirtyKey, false), [dirtyKey, setDirty]);

  const nameError = (isNew && name.trim() && existingNames.includes(name.trim())) ? t('dtags.vars.exists')
    : (TAG_VARIABLE_NAME_MAX < name.length) ? t('dtags.vars.too_long', {max: TAG_VARIABLE_NAME_MAX}) : null;
  const valueError = (TAG_VARIABLE_VALUE_MAX < value.length) ? t('dtags.vars.too_long', {max: formatNumber(TAG_VARIABLE_VALUE_MAX)}) : null;
  const formatted = formatJson(value);
  // the API strips whitespace, so a blank value would delete the variable instead of saving it
  const canSave = !!name.trim() && !!value.trim() && !nameError && !valueError && dirty && !put.isPending;

  return (
    <form
      className='rounded-md border border-brand/60 bg-surface-2 p-3'
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) {
          return;
        }
        put.mutate({storageType, storageId, name, value}, {
          onSuccess: (variable) => {
            toast(translate((isNew) ? 'dtags.vars.added' : 'dtags.vars.saved', {name: variable.name}));
            setDirty(dirtyKey, false);
            onDone();
          },
        });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !dirty) {
          onDone();
        }
      }}
    >
      <div className='space-y-3'>
        {(isNew) ? (
          <Field label={t('dtags.vars.name')} error={nameError} counter={<CharCounter length={name.length} max={TAG_VARIABLE_NAME_MAX}/>}>
            {(props) => <input {...props} autoFocus className='input font-mono' value={name} onChange={(event) => setName(event.target.value)} autoComplete='off' spellCheck={false}/>}
          </Field>
        ) : (
          <p className='font-mono text-sm text-white'>{name}</p>
        )}
        <Field
          label={t('dtags.vars.value')}
          error={valueError}
          hint={t('dtags.vars.value_hint')}
          counter={<CharCounter length={value.length} max={TAG_VARIABLE_VALUE_MAX}/>}
        >
          {(props) => (
            <textarea
              {...props}
              autoFocus={!isNew}
              rows={Math.min(12, Math.max(3, value.split('\n').length + 1))}
              className='input resize-y font-mono text-xs leading-5'
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
            />
          )}
        </Field>
      </div>

      {(put.isError) ? <InlineError>{errorMessage(put.error, t('dtags.vars.save_error'))}</InlineError> : null}

      <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
        <button
          type='button'
          className={cn('btn btn-ghost btn-sm', !formatted && 'invisible')}
          onClick={() => formatted && setValue(formatted)}
          disabled={!formatted || formatted === value}
        >
          <Braces aria-hidden className='size-3.5'/> {t('dtags.format_json')}
        </button>
        <div className='flex gap-2'>
          <button type='button' className='btn btn-ghost btn-sm' onClick={onDone} disabled={put.isPending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary btn-sm' disabled={!canSave}>
            {(put.isPending) ? <Spinner className='size-3.5 border-white/40 border-t-white'/> : null}
            {t((isNew) ? 'dtags.vars.add' : 'common.save')}
          </button>
        </div>
      </div>
    </form>
  );
}
