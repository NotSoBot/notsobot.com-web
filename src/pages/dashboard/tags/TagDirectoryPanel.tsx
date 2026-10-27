import { ArrowUpRight, BookOpen, Info, PencilLine, Send, ShieldCheck, Undo2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { translate, useI18n } from '@/i18n';
import {
  TAG_DIRECTORY_DESCRIPTION_MAX,
  TAG_DIRECTORY_TITLE_MAX,
  TagDirectoryCategories,
  TagDirectoryEditRequestStatuses,
  TagDirectoryVerificationStates,
  type Tag,
  type TagDirectoryCategory,
  type TagDirectoryEditRequest,
  type TagDirectoryItem,
} from '@/lib/api';
import {
  errorMessage,
  useCancelMeTagDirectoryVerificationMutation,
  useMeGuildsQuery,
  useMeTagDirectoryEditRequestMutation,
  useMeTagDirectoryQuery,
  usePatchMeTagDirectoryMutation,
  usePublishMeTagDirectoryMutation,
  useRequestMeTagDirectoryVerificationMutation,
} from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CategorySelect, DescriptionEditor, tagContentAcknowledgement, tagDirectoryItemPath, VerificationBadge, verificationInfo, verificationRequirement, VerificationWarning } from '@/pages/tags/tagDirectory';
import { MediaSection, ThumbnailManager } from '@/pages/tags/TagMedia';

import { CharCounter, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar, Toggle } from '../ui';
import { describeTagLocation, TAG_CONTENT_MAX, tagLocation } from './tagMeta';


// The "Directory" tab of the tag editor: publish the tag, or edit its listing once it's published.
// The title, description, category and whether the content is shown publicly are editable here, and the media while
// verification is pending.
export function TagDirectoryPanel({ tag, onDirtyChange }: {tag: Tag, onDirtyChange: (dirty: boolean) => void}) {
  const { t } = useI18n();
  const { data: directory, isPending, isError, error, refetch, isRefetching } = useMeTagDirectoryQuery(tag.id);
  // requesting verification would freeze unsaved listing edits, so the request waits until they're saved or discarded
  const [ listingDirty, setListingDirty ] = useState(false);
  const onListingDirtyChange = useCallback((dirty: boolean) => {
    setListingDirty(dirty);
    onDirtyChange(dirty);
  }, [onDirtyChange]);

  if (isPending) {
    return <PanelSkeleton rows={3}/>;
  }
  if (isError) {
    return <ErrorPanel title={t('ddir.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>;
  }
  if (!directory) {
    return <PublishForm tag={tag} onDirtyChange={onDirtyChange}/>;
  }
  // a verified listing's open change request takes over the thumbnail and media panels, they edit its proposal
  const verified = directory.verified === TagDirectoryVerificationStates.VERIFIED;
  const request = (verified && directory.edit_request && isOpenEditRequest(directory.edit_request)) ? directory.edit_request : null;
  const manage = {
    tagId: tag.id,
    verified: directory.verified,
    editRequest: (request) ? {status: request.status, thumbnailMode: request.thumbnail_mode, liveThumbnail: directory.thumbnail} : undefined,
  };
  return (
    <div className='space-y-4'>
      <VerificationPanel tag={tag} directory={directory} listingDirty={listingDirty}/>
      <ListingForm key={directory.id} tag={tag} directory={directory} onDirtyChange={onListingDirtyChange}/>
      {(verified) ? <EditRequestPanel tag={tag} directory={directory}/> : null}
      <Panel
        title={t((request) ? 'ddir.thumbnail_proposed' : 'tags.detail.thumbnail')}
        description={t((request) ? 'ddir.thumbnail_proposed_description' : 'tags.detail.thumbnail_description')}
      >
        <ThumbnailManager
          key={(request) ? `request-${request.id}` : 'listing'}
          assets={(request) ? request.assets : directory.assets}
          thumbnail={(request) ? request.thumbnail : directory.thumbnail}
          manage={manage}
        />
      </Panel>
      <Panel
        title={t((request) ? 'ddir.media_proposed' : 'tag_media.media')}
        description={t((request) ? 'ddir.media_proposed_description' : 'ddir.media_description')}
      >
        <MediaSection
          key={(request) ? `request-${request.id}` : 'listing'}
          assets={(request) ? request.assets : directory.assets}
          nsfw={false}
          tagName={tag.name}
          manage={manage}
          headingClassName='sr-only'
        />
      </Panel>
    </div>
  );
}


function ListingFields({ title, description, category, contentPublic, onTitle, onDescription, onCategory, onContentPublic, disabled = false }: {
  title: string,
  description: string,
  category: TagDirectoryCategory,
  contentPublic: boolean,
  onTitle: (value: string) => void,
  onDescription: (value: string) => void,
  onCategory: (value: TagDirectoryCategory) => void,
  onContentPublic: (value: boolean) => void,
  disabled?: boolean,
}) {
  const { t } = useI18n();
  return (
    <div className='grid grid-cols-1 gap-y-5'>
      <Field
        label={t('tags.listing.title')}
        hint={t('ddir.title_hint')}
        counter={<CharCounter length={title.length} max={TAG_DIRECTORY_TITLE_MAX}/>}
      >
        {(props) => (
          <input
            {...props}
            className='input'
            maxLength={TAG_DIRECTORY_TITLE_MAX}
            value={title}
            disabled={disabled}
            onChange={(event) => onTitle(event.target.value)}
          />
        )}
      </Field>
      <Field
        label={t('tags.detail.description')}
        hint={t('tags.listing.description_hint')}
        counter={<CharCounter length={description.length} max={TAG_DIRECTORY_DESCRIPTION_MAX}/>}
      >
        {(props) => (
          <DescriptionEditor
            {...props}
            className='input min-h-32 resize-y leading-relaxed'
            maxLength={TAG_DIRECTORY_DESCRIPTION_MAX}
            value={description}
            disabled={disabled}
            onChange={onDescription}
          />
        )}
      </Field>
      <Field label={t('tags.directory.category')} hint={t('tags.listing.category_hint')}>
        {(props) => <CategorySelect {...props} value={category} disabled={disabled} onChange={onCategory}/>}
      </Field>
      <Toggle
        label={t('tags.listing.show_content')}
        description={t('tags.listing.show_content_description')}
        checked={contentPublic}
        disabled={disabled}
        onChange={onContentPublic}
      />
    </div>
  );
}


function PublishForm({ tag, onDirtyChange }: {tag: Tag, onDirtyChange: (dirty: boolean) => void}) {
  const { user } = useAuth();
  const { t, rich } = useI18n();
  const { data: guilds } = useMeGuildsQuery();
  const toast = useToast();
  const publish = usePublishMeTagDirectoryMutation(tag.id);
  const [ title, setTitle ] = useState('');
  const [ description, setDescription ] = useState('');
  const [ category, setCategory ] = useState<TagDirectoryCategory>(TagDirectoryCategories.OTHER);
  const [ contentPublic, setContentPublic ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);

  const dirty = !!(title || description || contentPublic) || category !== TagDirectoryCategories.OTHER;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const isAlias = !!tag.reference_tag;
  // publishing moves the tag into the owner's personal tags (the API sets server_id to the owner's id) and leaves an
  // alias of it in the server, DM or group DM it came from
  const guildNames = new Map((guilds ?? []).map((guild) => [guild.id, guild.name]));
  const location = tagLocation(tag, user, guildNames);
  const movesOutOfServer = location.kind === 'server' || location.kind === 'dm' || location.kind === 'group_dm';
  const serverLabel = describeTagLocation(location);

  const doPublish = () => {
    publish.mutate({title, description, category, content_public: contentPublic}, {
      onSuccess: () => {
        setConfirming(false);
        onDirtyChange(false);
        toast(translate('ddir.published', {name: tag.name}));
      },
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isAlias || publish.isPending) {
      return;
    }
    // always confirmed, publishing needs the owner to say the content is theirs (or they have permission to share it)
    setConfirming(true);
  };

  // the confirm dialog has its own form, so it sits next to this one rather than inside it (no nested forms)
  return (
    <>
      <form onSubmit={onSubmit}>
        <Panel
          title={t('ddir.publish_title')}
          accent='#3ba55c'
          description={t('ddir.publish_description')}
        >
          <ul className='mb-5 space-y-1.5 text-sm text-muted'>
            <li className='flex gap-2'><BookOpen aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>{t('ddir.publish_note_1')}</li>
            <li className='flex gap-2'><Info aria-hidden className='mt-0.5 size-4 shrink-0 text-subtle'/>{t('ddir.publish_note_2')}</li>
          </ul>

          {(isAlias) ? (
            <p className='mb-5 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
              {t('ddir.alias', {name: tag.reference_tag!.name})}
            </p>
          ) : (movesOutOfServer) ? (
            <p className='mb-5 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
              {rich('ddir.moves', {b: (chunk) => <span className='font-medium text-white'>{chunk}</span>}, {where: serverLabel})}
            </p>
          ) : null}

          <ListingFields
            title={title}
            description={description}
            category={category}
            contentPublic={contentPublic}
            onTitle={setTitle}
            onDescription={setDescription}
            onCategory={setCategory}
            onContentPublic={setContentPublic}
            disabled={isAlias}
          />

          {(publish.isError && !confirming) ? <InlineError>{errorMessage(publish.error, t('ddir.publish_error'))}</InlineError> : null}

          <div className='mt-5 flex justify-end border-t border-line pt-4'>
            <button type='submit' className='btn btn-primary' disabled={isAlias || publish.isPending}>
              <Upload className='size-4'/>
              {t((publish.isPending) ? 'ddir.publishing' : 'dtags.editor.publish_directory')}
            </button>
          </div>
        </Panel>
      </form>

      {(confirming) ? (
        <ConfirmDialog
          tone='primary'
          title={t('ddir.confirm_title', {name: tag.name})}
          description={(movesOutOfServer) ? (
            rich('ddir.confirm_moves', {b: (chunk) => <span className='font-medium text-white'>{chunk}</span>}, {where: serverLabel})
          ) : (
            t('ddir.confirm')
          )}
          acknowledgement={tagContentAcknowledgement()}
          confirmLabel={t('ddir.publish')}
          pending={publish.isPending}
          error={(publish.isError) ? errorMessage(publish.error, t('ddir.publish_error')) : undefined}
          onConfirm={doPublish}
          onClose={() => {
            setConfirming(false);
            publish.reset();
          }}
        />
      ) : null}
    </>
  );
}


function ListingForm({ tag, directory, onDirtyChange }: {
  tag: Tag,
  directory: TagDirectoryItem,
  onDirtyChange: (dirty: boolean) => void,
}) {
  const { t, plural } = useI18n();
  const toast = useToast();
  const patch = usePatchMeTagDirectoryMutation(tag.id);
  const [ title, setTitle ] = useState(directory.title);
  const [ description, setDescription ] = useState(directory.description);
  const [ category, setCategory ] = useState(directory.category);
  const [ contentPublic, setContentPublic ] = useState(directory.content_public);

  const pending = directory.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  const dirty = !pending && (
    title !== directory.title || description !== directory.description || category !== directory.category || contentPublic !== directory.content_public
  );
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const discard = () => {
    setTitle(directory.title);
    setDescription(directory.description);
    setCategory(directory.category);
    setContentPublic(directory.content_public);
    patch.reset();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || patch.isPending) {
      return;
    }
    patch.mutate({title, description, category, content_public: contentPublic}, {
      onSuccess: (updated) => {
        setTitle(updated.title);
        setDescription(updated.description);
        setCategory(updated.category);
        setContentPublic(updated.content_public);
        onDirtyChange(false);
        toast(translate('ddir.saved'));
      },
    });
  };

  return (
    <form onSubmit={onSubmit}>
      <Panel
        title={t('dtags.editor.directory_listing')}
        accent='#3ba55c'
        description={verificationInfo(directory.verified).description}
        actions={(
          <Link to={tagDirectoryItemPath(directory.id)} className='btn btn-secondary btn-sm'>
            {t('dtags.detail.view_directory')}
            <ArrowUpRight className='size-3.5'/>
          </Link>
        )}
        readOnly={(pending) ? t('ddir.pending_locked') : undefined}
      >
        <div className='mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-subtle'>
          <VerificationBadge verified={directory.verified}/>
          <span title={formatDateTime(directory.created)}>{t('ddir.listed', {date: formatDate(directory.created)})}</span>
          {(directory.edited) ? <span title={formatDateTime(directory.edited)}>{t('ddir.edited', {date: formatDate(directory.edited)})}</span> : null}
          <span className='tabular-nums'>{plural('tags.directory.servers', directory.server_count)}</span>
        </div>

        <ListingFields
          title={title}
          description={description}
          category={category}
          contentPublic={contentPublic}
          onTitle={setTitle}
          onDescription={setDescription}
          onCategory={setCategory}
          onContentPublic={setContentPublic}
          disabled={pending}
        />

        {(patch.isError) ? <InlineError>{errorMessage(patch.error, t('tags.listing.save_error'))}</InlineError> : null}
        {(!pending) ? (
          <SaveBar
            dirty={dirty}
            pending={patch.isPending}
            onDiscard={discard}
            saveLabel={t('tags.listing.save')}
            status={(patch.isPending) ? <span className='text-muted'>{t('common.saving')}</span> : undefined}
          />
        ) : null}
      </Panel>
    </form>
  );
}


// request verification for an unverified listing, or cancel a pending request; nothing to do once it's verified
function VerificationPanel({ tag, directory, listingDirty }: {tag: Tag, directory: TagDirectoryItem, listingDirty: boolean}) {
  const { t } = useI18n();
  const toast = useToast();
  const request = useRequestMeTagDirectoryVerificationMutation(tag.id);
  const cancel = useCancelMeTagDirectoryVerificationMutation(tag.id);
  const [ confirming, setConfirming ] = useState(false);

  if (directory.verified === TagDirectoryVerificationStates.VERIFIED) {
    return null;
  }
  const pending = directory.verified === TagDirectoryVerificationStates.PENDING_VERIFICATION;
  // why the request can't be sent yet, shown next to the button
  const blocker = (listingDirty) ? t('ddir.save_first') : verificationRequirement(directory);

  const doRequest = () => {
    request.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast(translate('ddir.requested', {name: tag.name}));
      },
    });
  };

  const doCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: () => toast(translate('ddir.canceled', {name: tag.name})),
    });
  };

  return (
    <>
      <Panel
        title={t('tags.listing.verification')}
        accent='#3ba55c'
        description={t((pending) ? 'ddir.pending_description' : 'ddir.request_description')}
      >
        <div className='text-sm text-muted'>
          {(pending) ? (
            <p>{t('ddir.pending_note')}</p>
          ) : (
            <VerificationWarning/>
          )}
        </div>
        {(pending) ? (
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4'>
            <p className='text-sm text-subtle'>{t('ddir.cancel_note')}</p>
            <button type='button' className='btn btn-danger btn-sm shrink-0' disabled={cancel.isPending} onClick={doCancel}>
              <X className='size-3.5'/>
              {t((cancel.isPending) ? 'tags.listing.canceling' : 'tags.listing.cancel_request')}
            </button>
          </div>
        ) : (
          <div className='mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4'>
            {(blocker) ? <p className='mr-auto text-sm text-subtle'>{blocker}</p> : null}
            <button
              type='button'
              className='btn btn-primary btn-sm shrink-0'
              disabled={!!blocker}
              title={blocker ?? undefined}
              onClick={() => setConfirming(true)}
            >
              <ShieldCheck className='size-3.5'/>
              {t('tags.listing.request')}
            </button>
          </div>
        )}
        {(cancel.isError) ? <InlineError>{errorMessage(cancel.error, t('tags.listing.cancel_error'))}</InlineError> : null}
      </Panel>

      {(confirming) ? (
        <ConfirmDialog
          tone='primary'
          title={t('tags.listing.request_title', {name: tag.name})}
          description={<VerificationWarning/>}
          acknowledgement={tagContentAcknowledgement()}
          confirmLabel={t('tags.listing.request')}
          pending={request.isPending}
          error={(request.isError) ? errorMessage(request.error, t('tags.listing.request_error')) : undefined}
          onConfirm={doRequest}
          onClose={() => {
            setConfirming(false);
            request.reset();
          }}
        />
      ) : null}
    </>
  );
}


function isOpenEditRequest(request: TagDirectoryEditRequest): boolean {
  return request.status === TagDirectoryEditRequestStatuses.DRAFT || request.status === TagDirectoryEditRequestStatuses.PENDING;
}

// A verified listing's content, media and thumbnail are locked, so the owner drafts the changes they want here and
// NotSoBot staff approve or reject them. The thumbnail/media panels edit the draft's proposal while one is open.
function EditRequestPanel({ tag, directory }: {tag: Tag, directory: TagDirectoryItem}) {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useMeTagDirectoryEditRequestMutation(tag.id);
  const [ discarding, setDiscarding ] = useState(false);
  const request = directory.edit_request ?? null;
  const open = !!request && isOpenEditRequest(request);

  if (!request || !open) {
    return (
      <Panel
        title={t('ddir.request_changes')}
        accent='#3ba55c'
        description={t('ddir.request_changes_description')}
        actions={(
          <button type='button' className='btn btn-primary btn-sm' disabled={mutation.isPending} onClick={() => mutation.mutate({start: true})}>
            <PencilLine className='size-3.5'/>
            {t((mutation.isPending) ? 'ddir.starting' : 'ddir.request_changes')}
          </button>
        )}
      >
        {(request?.status === TagDirectoryEditRequestStatuses.REJECTED) ? (
          <div className='rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-fg'>
            <p className='font-medium'>{(request.reviewed) ? t('ddir.rejected_on', {date: formatDate(request.reviewed)}) : t('ddir.rejected')}</p>
            {(request.reason) ? <p className='mt-1 whitespace-pre-wrap text-muted'>{request.reason}</p> : null}
          </div>
        ) : (request?.status === TagDirectoryEditRequestStatuses.APPROVED) ? (
          <p className='text-sm text-muted'>{(request.reviewed) ? t('ddir.approved_on', {date: formatDate(request.reviewed)}) : t('ddir.approved')}</p>
        ) : (
          <p className='text-sm text-muted'>{t('ddir.still_editable')}</p>
        )}
        {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, t('ddir.start_error'))}</InlineError> : null}
      </Panel>
    );
  }

  return (
    <>
      {(request.status === TagDirectoryEditRequestStatuses.DRAFT) ? (
        <EditRequestDraft key={request.id} tag={tag} request={request} onDiscard={() => setDiscarding(true)}/>
      ) : (
        <Panel
          title={t('ddir.change_request')}
          accent='#faa61a'
          description={(request.submitted) ? t('ddir.waiting_submitted', {date: formatDateTime(request.submitted)}) : t('ddir.waiting')}
        >
          <dl className='space-y-3 text-sm'>
            <div>
              <dt className='text-subtle'>{t('ddir.note')}</dt>
              <dd className='mt-0.5 whitespace-pre-wrap text-fg'>{request.note || <span className='text-subtle italic'>{t('ddir.none')}</span>}</dd>
            </div>
            <div>
              <dt className='text-subtle'>{t('dtags.detail.content')}</dt>
              <dd className='mt-0.5 text-fg'>{t((request.content !== null) ? 'ddir.changes_content' : 'ddir.keeps_content')}</dd>
            </div>
          </dl>
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4'>
            <p className='text-sm text-subtle'>{t('ddir.withdraw_note')}</p>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({withdraw: true})}
              >
                <Undo2 className='size-3.5'/>
                {t('ddir.withdraw')}
              </button>
              <button type='button' className='btn btn-danger btn-sm' disabled={mutation.isPending} onClick={() => setDiscarding(true)}>
                <X className='size-3.5'/>
                {t('tags.listing.cancel_request')}
              </button>
            </div>
          </div>
          {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, t('ddir.update_error'))}</InlineError> : null}
        </Panel>
      )}

      {(discarding) ? (
        <ConfirmDialog
          title={t('ddir.discard_title', {name: tag.name})}
          description={t('ddir.discard_description')}
          confirmLabel={t('ddir.discard')}
          pending={mutation.isPending}
          error={(mutation.isError) ? errorMessage(mutation.error, t('ddir.discard_error')) : undefined}
          onConfirm={() => mutation.mutate({discard: true}, {
            onSuccess: () => {
              setDiscarding(false);
              toast(translate('ddir.discarded', {name: tag.name}));
            },
          })}
          onClose={() => {
            setDiscarding(false);
            mutation.reset();
          }}
        />
      ) : null}
    </>
  );
}


function EditRequestDraft({ tag, request, onDiscard }: {tag: Tag, request: TagDirectoryEditRequest, onDiscard: () => void}) {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useMeTagDirectoryEditRequestMutation(tag.id);
  const [ note, setNote ] = useState(request.note);
  const [ content, setContent ] = useState(request.content ?? tag.content);
  const savedContent = request.content ?? tag.content;
  const dirty = note !== request.note || content !== savedContent;
  const invalid = !content.trim() || TAG_CONTENT_MAX < content.length || TAG_DIRECTORY_DESCRIPTION_MAX < note.length;

  // the current content means "leave it", so it isn't sent as a change
  const patch = () => ({note, content: (content === tag.content) ? null : content});

  const save = async () => {
    await mutation.mutateAsync({patch: patch()});
    toast(translate('ddir.draft_saved'));
  };

  const submit = async () => {
    if (dirty) {
      await mutation.mutateAsync({patch: patch()});
    }
    await mutation.mutateAsync({submit: true});
    toast(translate('ddir.sent', {name: tag.name}));
  };

  const run = (action: () => Promise<void>) => {
    // the error shows under the form
    action().catch(() => undefined);
  };

  return (
    <Panel
      title={t('ddir.change_request')}
      accent='#5865f2'
      description={t('ddir.draft_description')}
    >
      <div className='grid grid-cols-1 gap-y-5'>
        <Field
          label={t('ddir.note')}
          hint={t('ddir.note_hint')}
          counter={<CharCounter length={note.length} max={TAG_DIRECTORY_DESCRIPTION_MAX}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input min-h-20 resize-y leading-relaxed'
              maxLength={TAG_DIRECTORY_DESCRIPTION_MAX}
              value={note}
              disabled={mutation.isPending}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
        <Field
          label={t('dtags.detail.content')}
          hint={t((content === tag.content) ? 'ddir.content_same' : 'ddir.content_replaces')}
          counter={<CharCounter length={content.length} max={TAG_CONTENT_MAX}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input resize-y font-mono text-sm leading-relaxed'
              rows={Math.min(16, Math.max(5, content.split('\n').length + 1))}
              maxLength={TAG_CONTENT_MAX}
              value={content}
              disabled={mutation.isPending}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </Field>
      </div>
      {(content !== tag.content) ? (
        <button type='button' className='mt-2 cursor-pointer text-xs text-brand hover:underline' onClick={() => setContent(tag.content)}>
          {t('ddir.reset_content')}
        </button>
      ) : null}

      <div className='mt-5 flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between'>
        <button type='button' className='btn btn-ghost btn-sm text-danger sm:self-center' disabled={mutation.isPending} onClick={onDiscard}>
          <X className='size-3.5'/>
          {t('ddir.discard_draft')}
        </button>
        <div className='flex flex-wrap gap-2 sm:justify-end'>
          <button type='button' className='btn btn-secondary btn-sm' disabled={!dirty || invalid || mutation.isPending} onClick={() => run(save)}>
            {t('ddir.save_draft')}
          </button>
          <button type='button' className='btn btn-primary btn-sm' disabled={invalid || mutation.isPending} onClick={() => run(submit)}>
            <Send className='size-3.5'/>
            {t((mutation.isPending) ? 'ddir.sending' : 'ddir.submit')}
          </button>
        </div>
      </div>
      {(mutation.isError) ? <InlineError>{errorMessage(mutation.error, t('ddir.update_error'))}</InlineError> : null}
    </Panel>
  );
}
