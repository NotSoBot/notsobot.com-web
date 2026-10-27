import { AlertTriangle, ArrowLeft, BookOpen, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { isStaff, useAuth } from '@/auth';
import { ModalFooter } from '@/components/ui/DetailModal';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { translate, useI18n } from '@/i18n';
import { ApiErrorCodes, ApiRequestError, type Tag, type TagStorageScope } from '@/lib/api';
import { errorMessage, useMeGuildsQuery, useMeTagDirectoryQuery, useMeTagQuery, usePatchMeTagMutation } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatNumber } from '@/lib/utils';

import { ExactDate } from '../admin/adminUi';
import { CharCounter, Field, InlineError, Panel, PanelSkeleton, ReadOnlyNote, SaveBar, Skeleton, Toggle, UnsavedChangesGuard } from '../ui';
import { CodeEditor } from './CodeEditor';
import { DeleteMeTagDialog } from './DeleteMeTagDialog';
import { TagLocationStrip, TagModalHeader } from './TagDetailsModal';
import { TagBlobsEditor } from './TagBlobsEditor';
import { TagDirectoryPanel } from './TagDirectoryPanel';
import { dashboardTagEditPath, TAG_CONTENT_MAX, TAG_NAME_MAX } from './tagMeta';
import { StorageScopeForm } from './StorageScopeForm';
import { TagVariablesEditor } from './TagVariablesEditor';


// labels are `dtags.tab.<id>`
const TABS = [
  {id: 'content'},
  {id: 'variables'},
  {id: 'blobs'},
  {id: 'directory'},
] as const;
type TabId = (typeof TABS)[number]['id'];


const TITLE_ID = 'dashboard-tag-editor-title';


// One of your tags' editor over the tag list (`/dashboard/tags/:tagId/edit`). Closing it, or going back to the tag's
// details (`onBack`), with unsaved edits asks first (`UnsavedChangesGuard`, the url leaves the editor's path).
export function TagEditorModal({ tagId, onBack, onClose }: {tagId: string, onBack: (id: string) => void, onClose: () => void}) {
  const { t } = useI18n();
  const { data: tag, isPending, isError, error, refetch, isRefetching } = useMeTagQuery(tagId);
  const notFound = error instanceof ApiRequestError && (error.status === 404 || error.code === ApiErrorCodes.UNKNOWN_TAG);

  return (
    <Modal labelledBy={TITLE_ID} onClose={onClose} stickyClose={!!tag}>
      {(tag) ? (
        // keyed so switching tags starts with a clean form
        <TagEditor key={tag.id} tag={tag} onBack={onBack}/>
      ) : (isPending) ? (
        <TagEditorSkeleton/>
      ) : (
        <div className='px-6 py-16 text-center'>
          <AlertTriangle className='mx-auto mb-4 size-14 text-danger'/>
          <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{t((notFound) ? 'dtags.modal.not_found' : 'dtags.modal.load_error')}</h2>
          <p className='mb-6 text-muted'>{(notFound) ? t('dtags.editor.not_found') : errorMessage(error)}</p>
          {(isError && !notFound) ? <button type='button' className='btn btn-secondary' disabled={isRefetching} onClick={() => refetch()}>{t('common.retry')}</button> : null}
        </div>
      )}
    </Modal>
  );
}


function TagEditor({ tag, onBack }: {tag: Tag, onBack: (id: string) => void}) {
  const { user } = useAuth();
  const { t, rich, plural } = useI18n();
  const [ searchParams, setSearchParams ] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = (TABS.some((item) => item.id === tabParam)) ? tabParam as TabId : 'content';
  const tabsId = useId();

  const setTab = (value: TabId) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === 'content') {
        next.delete('tab');
      } else {
        next.set('tab', value);
      }
      return next;
    }, {replace: true, preventScrollReset: true});
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    let next = -1;
    if (event.key === 'ArrowRight') {
      next = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      next = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = TABS.length - 1;
    }
    if (next !== -1) {
      event.preventDefault();
      setTab(TABS[next].id);
      document.getElementById(`${tabsId}-${TABS[next].id}`)?.focus();
    }
  };

  // staff can still edit their own tags while they're locked (pending/verified in the directory)
  const readOnly = tag.locked && !isStaff(user);

  // which storage ids variables/blobs are read for; global needs none, user defaults to you
  const [ scope, setScope ] = useState<TagStorageScope>(() => ({user_id: user?.id ?? ''}));

  const [ contentDirty, setContentDirty ] = useState(false);
  const [ variablesDirty, setVariablesDirty ] = useState(false);
  const [ blobsDirty, setBlobsDirty ] = useState(false);
  const [ directoryDirty, setDirectoryDirty ] = useState(false);
  const { data: directory } = useMeTagDirectoryQuery(tag.id);
  const { data: guilds } = useMeGuildsQuery();
  const guildNames = useMemo(() => new Map((guilds ?? []).map((guild) => [guild.id, guild.name])), [guilds]);

  return (
    <>
      <TagModalHeader
        tag={tag}
        titleId={TITLE_ID}
        title={<><span className='sr-only'>{t('dtags.editor.editing_sr')}</span>{tag.name}</>}
        meta={(
          <>
            {rich('dtags.editor.meta', {created: () => <ExactDate value={tag.created} format={formatDate}/>})}
            {(tag.edited) ? rich('dtags.editor.meta_edited', {edited: () => <ExactDate value={tag.edited!} format={formatDate}/>}) : null}
          </>
        )}
      />
      <TagLocationStrip tag={tag} guildNames={guildNames}>
        <span className='tabular-nums'>{plural('dtags.uses', tag.uses)}</span>
        {(tag.last_used) ? <span>{rich('dtags.editor.last_used', {date: () => <ExactDate value={tag.last_used!} format={formatDateTime}/>})}</span> : null}
      </TagLocationStrip>

      <div className='border-b border-line px-4 sm:px-6'>
        <div role='tablist' aria-label={t('dtags.editor.sections')} onKeyDown={onTabKeyDown} className='-mb-px mt-1 flex gap-1 overflow-x-auto'>
          {TABS.map((item) => {
            const dirty = {content: contentDirty, variables: variablesDirty, blobs: blobsDirty, directory: directoryDirty}[item.id];
            return (
              <button
                key={item.id}
                id={`${tabsId}-${item.id}`}
                type='button'
                role='tab'
                aria-selected={tab === item.id}
                aria-controls={`${tabsId}-${item.id}-panel`}
                tabIndex={(tab === item.id) ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  (tab === item.id) ? 'border-brand text-white' : 'border-transparent text-muted hover:text-white',
                )}
              >
                {t(`dtags.tab.${item.id}`)}
                {(dirty) ? <span aria-label={t('dtags.editor.unsaved')} className='size-1.5 rounded-full bg-warning'/> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* panels stay mounted so unsaved edits survive switching tabs */}
        <div id={`${tabsId}-content-panel`} role='tabpanel' aria-labelledby={`${tabsId}-content`} hidden={tab !== 'content'}>
          <TagContentForm tag={tag} readOnly={readOnly} onDirtyChange={setContentDirty}/>
        </div>
        <div id={`${tabsId}-variables-panel`} role='tabpanel' aria-labelledby={`${tabsId}-variables`} hidden={tab !== 'variables'} className='space-y-4'>
          {(tag.reference_tag) ? <AliasStorageNote tag={tag} kind='variables'/> : (
            <>
              <StorageScopeForm scope={scope} onChange={setScope}/>
              {(tab === 'variables' || variablesDirty) ? (
                <TagVariablesEditor tag={tag} scope={scope} readOnly={readOnly} onDirtyChange={setVariablesDirty}/>
              ) : null}
            </>
          )}
        </div>
        <div id={`${tabsId}-blobs-panel`} role='tabpanel' aria-labelledby={`${tabsId}-blobs`} hidden={tab !== 'blobs'} className='space-y-4'>
          {(tag.reference_tag) ? <AliasStorageNote tag={tag} kind='blobs'/> : (
            <>
              <StorageScopeForm scope={scope} onChange={setScope}/>
              {(tab === 'blobs' || blobsDirty) ? (
                <TagBlobsEditor tag={tag} scope={scope} readOnly={readOnly} onDirtyChange={setBlobsDirty}/>
              ) : null}
            </>
          )}
        </div>

        <div id={`${tabsId}-directory-panel`} role='tabpanel' aria-labelledby={`${tabsId}-directory`} hidden={tab !== 'directory'}>
          {(tab === 'directory' || directoryDirty) ? <TagDirectoryPanel tag={tag} onDirtyChange={setDirectoryDirty}/> : null}
        </div>
      </div>

      {/* back to the details where the admin modals' Previous is, and the tag's own actions in the middle: the directory
          listing, and deleting set apart after a divider. Saving stays with each tab's form (their save bars) */}
      <ModalFooter
        start={(
          <button type='button' className='btn btn-ghost shrink-0 px-2' title={t('dtags.editor.back_title')} onClick={() => onBack(tag.id)}>
            <ArrowLeft aria-hidden className='size-4'/>
            <span className='sm:hidden'>{t('dtags.editor.back')}</span>
            <span className='hidden sm:inline'>{t('dtags.editor.back_tag')}</span>
          </button>
        )}
      >
        {(directory !== undefined && !tag.reference_tag) ? (
          <button type='button' className='btn btn-secondary min-w-0 flex-1 px-2 sm:flex-none sm:px-3' onClick={() => setTab('directory')}>
            {(directory) ? <BookOpen aria-hidden className='hidden size-4 shrink-0 sm:block'/> : <Upload aria-hidden className='hidden size-4 shrink-0 sm:block'/>}
            <span className='truncate sm:hidden'>{t((directory) ? 'dtags.editor.listing' : 'dtags.editor.publish')}</span>
            <span className='hidden sm:inline'>{t((directory) ? 'dtags.editor.directory_listing' : 'dtags.editor.publish_directory')}</span>
          </button>
        ) : null}
        {(!readOnly) ? <DeleteTagButton tag={tag} divider={directory !== undefined && !tag.reference_tag}/> : null}
      </ModalFooter>

      <UnsavedChangesGuard when={contentDirty || variablesDirty || blobsDirty || directoryDirty}/>
    </>
  );
}


// deleting the tag, from the footer (`divider` sets it apart from the buttons before it)
function DeleteTagButton({ tag, divider }: {tag: Tag, divider: boolean}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ confirming, setConfirming ] = useState(false);

  return (
    <>
      {(divider) ? <span aria-hidden className='mx-0.5 h-6 w-px shrink-0 self-center bg-line-strong sm:mx-1'/> : null}
      <button type='button' className='btn btn-ghost min-w-0 flex-1 px-2 text-danger hover:text-danger sm:flex-none sm:px-3' onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden className='hidden size-4 shrink-0 sm:block'/>
        <span className='truncate sm:hidden'>{t('common.delete')}</span>
        <span className='hidden sm:inline'>{t('dtags.delete.confirm')}</span>
      </button>
      {(confirming) ? (
        <DeleteMeTagDialog
          tag={tag}
          // replace: the tag's page doesn't exist anymore, Back shouldn't return to it
          onDeleted={() => navigate(Routes.DASHBOARD_TAGS, {replace: true, preventScrollReset: true, state: {skipUnsavedGuard: true}})}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}


// aliases have no storage of their own: the bot reads and writes the parent tag's variables and blobs
function AliasStorageNote({ tag, kind }: {tag: Tag, kind: 'variables' | 'blobs'}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const parent = tag.reference_tag!;
  // the editor only loads tags you own (or any tag, for staff)
  const canOpenParent = parent.user.id === user?.id || isStaff(user);
  return (
    <ReadOnlyNote>
      {t('dtags.editor.alias_note', {name: parent.name, kind: t(`dtags.editor.alias_note_${kind}`)})}
      {(canOpenParent) ? (
        <> <Link to={`${dashboardTagEditPath(parent.id)}?tab=${kind}`} className='font-medium text-brand hover:underline'>{t('dtags.editor.alias_edit', {name: parent.name})}</Link></>
      ) : null}
    </ReadOnlyNote>
  );
}


interface Draft {
  name: string,
  content: string,
  nsfw: boolean,
}


function TagContentForm({ tag, readOnly, onDirtyChange }: {tag: Tag, readOnly: boolean, onDirtyChange: (dirty: boolean) => void}) {
  const { t } = useI18n();
  const toast = useToast();
  const patch = usePatchMeTagMutation(tag.id);

  // null = showing the saved tag; edits create a draft, saving/discarding drops it
  const [ draft, setDraft ] = useState<Draft | null>(null);
  const base: Draft = useMemo(() => ({name: tag.name, content: tag.content, nsfw: tag.nsfw}), [tag]);
  const values = draft ?? base;
  const dirty = !!draft && (draft.name !== base.name || draft.content !== base.content || draft.nsfw !== base.nsfw);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const update = (changes: Partial<Draft>) => {
    patch.reset();
    setDraft((previous) => ({...(previous ?? base), ...changes}));
  };

  const trimmedName = values.name.trim();
  const nameError = (!trimmedName) ? t('dtags.editor.name_required')
    : (TAG_NAME_MAX < trimmedName.length) ? t('dtags.editor.name_too_long', {max: TAG_NAME_MAX})
    : (patch.error instanceof ApiRequestError && patch.error.code === ApiErrorCodes.TAG_NAME_TAKEN) ? t('errors.tag_name_taken')
    : null;
  const contentError = (TAG_CONTENT_MAX < values.content.length) ? t('dtags.editor.content_too_long', {max: formatNumber(TAG_CONTENT_MAX)}) : null;
  const invalid = !trimmedName || TAG_NAME_MAX < trimmedName.length || !!contentError;

  const save = () => {
    if (!dirty || invalid || patch.isPending || readOnly) {
      return;
    }
    const body: {name?: string, content?: string, nsfw?: boolean} = {};
    if (trimmedName !== base.name) {
      body.name = trimmedName;
    }
    if (values.content !== base.content) {
      body.content = values.content;
    }
    if (values.nsfw !== base.nsfw) {
      body.nsfw = values.nsfw;
    }
    patch.mutate(body, {
      onSuccess: () => {
        setDraft(null);
        toast(translate('dtags.editor.saved'));
      },
      onError: (error) => {
        if (!(error instanceof ApiRequestError && error.code === ApiErrorCodes.TAG_NAME_TAKEN)) {
          toast(errorMessage(error, translate('dtags.editor.save_error')), 'error');
        }
      },
    });
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  const onEditorSave = useCallback(() => saveRef.current(), []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Panel title={t('dtags.editor.panel')} accent='#3ba55c'>
        {(readOnly) ? (
          <ReadOnlyNote>{t('dtags.editor.locked')}</ReadOnlyNote>
        ) : (tag.locked) ? (
          <ReadOnlyNote>{t('dtags.editor.locked_staff')}</ReadOnlyNote>
        ) : null}

        <div className='space-y-5'>
          <Field
            label={t('dtags.editor.name')}
            counter={<CharCounter length={trimmedName.length} max={TAG_NAME_MAX}/>}
            hint={t('dtags.editor.name_hint')}
            error={(draft) ? nameError : null}
          >
            {(props) => (
              <input
                {...props}
                value={values.name}
                onChange={(event) => update({name: event.target.value.replace(/[\r\n]/g, '')})}
                disabled={readOnly}
                autoComplete='off'
                spellCheck={false}
                className='input font-mono'
              />
            )}
          </Field>

          <Field
            label={t('dtags.editor.content')}
            counter={<CharCounter length={values.content.length} max={TAG_CONTENT_MAX}/>}
            error={contentError}
            hint={(tag.reference_tag) ? t('dtags.editor.alias_hint', {name: tag.reference_tag.name}) : t('dtags.editor.content_hint')}
          >
            {(props) => (
              <CodeEditor
                {...props}
                value={values.content}
                onChange={(content) => update({content})}
                onSave={onEditorSave}
                readOnly={readOnly}
                maxLength={TAG_CONTENT_MAX}
              />
            )}
          </Field>

          <Toggle
            label={t('dtags.editor.nsfw')}
            description={t('dtags.editor.nsfw_description')}
            checked={values.nsfw}
            onChange={(nsfw) => update({nsfw})}
            disabled={readOnly}
          />
        </div>

        {(patch.isError && !nameError) ? <InlineError>{errorMessage(patch.error, t('dtags.editor.save_error'))}</InlineError> : null}

        {(!readOnly) ? (
          <SaveBar dirty={dirty} pending={patch.isPending} disabled={invalid} onDiscard={() => {
            patch.reset();
            setDraft(null);
          }}/>
        ) : null}
      </Panel>
    </form>
  );
}


function TagEditorSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy='true'>
      <h2 id={TITLE_ID} className='sr-only'>{t('dtags.modal.loading')}</h2>
      {/* the header's name and date, the location strip and the tabs */}
      <div className='px-4 pt-4 pb-3 sm:px-6 sm:pt-5'>
        <Skeleton className='h-7 w-48'/>
        <Skeleton className='mt-1 h-4 w-40 bg-surface-2'/>
      </div>
      <div className='border-y border-line bg-surface-2 px-4 py-2.5 sm:px-6'><Skeleton className='h-6 w-56 max-w-full bg-surface-3'/></div>
      <div className='border-b border-line px-4 py-2 sm:px-6'><Skeleton className='h-7 w-64 bg-surface-2'/></div>
      <div className='px-4 pt-4 pb-5 sm:px-6'><PanelSkeleton rows={4}/></div>
    </div>
  );
}
