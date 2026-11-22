import { AlertTriangle, ArrowUpRight, ExternalLink, Lock, Pencil } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { CopyButton } from '@/components/ui/CopyButton';
import { DetailModalHeader, DetailModalStrip, ModalFooter } from '@/components/ui/DetailModal';
import { stripMarkdown } from '@/components/ui/Markdown';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useArrowKeyNavigation } from '@/hooks/useArrowKeyNavigation';
import { useI18n } from '@/i18n';
import type { Tag } from '@/lib/api';
import { errorMessage, useMeTagDirectoryQuery, useMeTagQuery } from '@/lib/api/dashboardQueries';
import { formatDateTime } from '@/lib/utils';
import { tagDirectoryItemPath, VerificationBadge } from '@/pages/tags/tagDirectory';
import { MediaSection } from '@/pages/tags/TagMedia';

import { Chip, CopyableValue, ExactDate, selectAllScope } from '../admin/adminUi';
import { tagDiscordUrl, tagLocation, TagLocationChip, tagServerPath } from './tagMeta';


const TITLE_ID = 'dashboard-tag-modal-title';

// One of your tags over the tag list, like the public directory's modal: the full content and details, with the editor
// a click away. ← / → step through the tags loaded behind it.
export function TagDetailsModal({ tagId, guildNames, previousId, nextId, onNavigate, onEdit, onClose }: {
  tagId: string,
  guildNames: Map<string, string>,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (id: string) => void,
  onEdit: (id: string) => void,
  onClose: () => void,
}) {
  // shows the list's copy right away (`placeholderData`), then the fresh one
  const { t } = useI18n();
  const { data: tag, isPending, isError, error, refetch } = useMeTagQuery(tagId);

  useArrowKeyNavigation({previousId, nextId, onNavigate});

  const browsing = !!(previousId || nextId);

  return (
    <Modal labelledBy={TITLE_ID} onClose={onClose} stickyClose={!!tag}>
      {(tag) ? (
        <TagDetails tag={tag} guildNames={guildNames}/>
      ) : (isPending) ? (
        <div className='flex h-80 items-center justify-center'>
          <h2 id={TITLE_ID} className='sr-only'>{t('dtags.modal.loading')}</h2>
          <Spinner/>
        </div>
      ) : (
        <div className='px-6 py-16 text-center'>
          <AlertTriangle className='mx-auto mb-4 size-14 text-danger-text'/>
          <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{t((isError) ? 'dtags.modal.load_error' : 'dtags.modal.not_found')}</h2>
          <p className='mb-6 text-muted'>{errorMessage(error, t('dtags.modal.maybe_deleted'))}</p>
          {(isError) ? <button type='button' className='btn btn-secondary' onClick={() => refetch()}>{t('common.retry')}</button> : null}
        </div>
      )}

      {/* without a tag (still loading, or it failed) only the browsing is left */}
      <ModalFooter previousId={previousId} nextId={nextId} onNavigate={(browsing) ? onNavigate : undefined}>
        {(tag) ? (
          <button type='button' className='btn btn-primary min-w-0 flex-1 px-2 sm:flex-none sm:px-3' onClick={() => onEdit(tag.id)}>
            <Pencil aria-hidden className='hidden size-4 shrink-0 sm:block'/>
            <span className='truncate sm:hidden'>{t('common.edit')}</span>
            <span className='hidden sm:inline'>{t('dtags.modal.edit')}</span>
          </button>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}


// the tag's header, shared with its editor: `title` is the h2's content, `meta` the line under it
export function TagModalHeader({ tag, titleId, title, meta }: {tag: Tag, titleId: string, title: ReactNode, meta: ReactNode}) {
  const { t } = useI18n();
  return (
    <DetailModalHeader
      titleId={titleId}
      leading={<Chip className='w-12 shrink-0 justify-center'>{t((tag.reference_tag) ? 'dtags.chip.alias' : 'dtags.chip.tag')}</Chip>}
      title={title}
      titleTooltip={tag.name}
      mono
      meta={meta}
      states={[
        (tag.locked) ? <Chip key='locked' tone='warning' title={t('dtags.chip.locked_title')} className='gap-1'><Lock aria-hidden className='size-3'/>{t('dtags.badge.locked')}</Chip> : null,
        (tag.nsfw) ? <Chip key='nsfw' tone='danger' title={t('dtags.chip.nsfw_title')}>{t('tags.nsfw')}</Chip> : null,
        (tag.is_command) ? <Chip key='command' tone='brand' title={t('dtags.chip.command_title')}>{t('dtags.badge.command')}</Chip> : null,
        (tag.is_on_directory) ? <Chip key='directory' tone='success' title={t('dtags.chip.directory_title')}>{t('dtags.badge.directory')}</Chip> : null,
      ]}
    />
  );
}


// where the tag lives, in the strip under the header. `children` go on the right
export function TagLocationStrip({ tag, guildNames, children }: {tag: Tag, guildNames: Map<string, string>, children?: ReactNode}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = tagLocation(tag, user, guildNames);
  const discordUrl = tagDiscordUrl(location);
  return (
    <DetailModalStrip className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
      <TagLocationChip location={location} to={tagServerPath(location)}/>
      {(discordUrl) ? (
        <a href={discordUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-code hover:underline'>
          {t('common.open_discord')}
          <ExternalLink aria-hidden className='size-3'/>
        </a>
      ) : null}
      {(children) ? <div className='ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>{children}</div> : null}
    </DetailModalStrip>
  );
}


function TagDetails({ tag, guildNames }: {tag: Tag, guildNames: Map<string, string>}) {
  const { t, rich, plural } = useI18n();
  const { last_used: lastUsed, edited } = tag;
  // only what there is: a tag that was never used or edited has no date for it
  const facts = [
    plural('dtags.uses', tag.uses),
    (lastUsed) ? rich('dtags.detail.last_used', {date: () => <ExactDate value={lastUsed}/>}) : null,
    (edited) ? rich('dtags.detail.edited', {date: () => <ExactDate value={edited}/>}) : null,
  ].filter((fact) => fact !== null);

  return (
    <>
      <TagModalHeader
        tag={tag}
        titleId={TITLE_ID}
        title={tag.name}
        meta={rich('dtags.created_at', {date: () => <ExactDate value={tag.created} format={formatDateTime}/>})}
      />
      <TagLocationStrip tag={tag} guildNames={guildNames}/>

      <div className='px-4 pt-4 pb-5 sm:px-6'>
        {/* phones only, the title's can be cut off there */}
        <div className='mb-2 sm:hidden'><CopyableValue value={tag.name} truncate={0}/></div>
        {/* one line and the tag's id: when it was made is under the title, what it is (locked, a command, NSFW) are the
            header's chips and where it lives is the strip above, so none of those are repeated here */}
        <p className='text-sm text-muted'>
          {facts.map((fact, i) => (
            <Fragment key={i}>
              {(i) ? <span className='text-subtle'> • </span> : null}
              {fact}
            </Fragment>
          ))}
        </p>
        <div className='mt-0.5'><CopyableValue value={tag.id} truncate={0}/></div>

        <div className='mt-4'>
          <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
            <h3 className='section-label'>{t('dtags.detail.content')}</h3>
            {(!tag.reference_tag && tag.content) ? <CopyButton value={tag.content} label={t('common.copy')}/> : null}
          </div>
          {(tag.reference_tag) ? (
            <p className='rounded-md border border-line bg-deep px-3 py-2 text-sm text-muted'>
              {rich('dtags.detail.alias', {b: (chunk) => <span className='font-medium text-white'>{chunk}</span>}, {name: tag.reference_tag.name})}
            </p>
          ) : (
            <pre
              className='max-h-96 overflow-auto rounded-md border border-line bg-deep px-3 py-2 font-mono text-sm whitespace-pre-wrap break-words text-fg focus:border-line-strong focus:outline-none'
              {...selectAllScope}
            >
              {tag.content || <span className='text-subtle italic'>{t('tags.listing.empty')}</span>}
            </pre>
          )}
        </div>

        {(tag.is_on_directory) ? <DirectorySection tag={tag}/> : null}
      </div>
    </>
  );
}


// the tag's directory listing at a glance, it's managed from the editor's Directory tab
function DirectorySection({ tag }: {tag: Tag}) {
  const { t } = useI18n();
  const { data: directory, isPending } = useMeTagDirectoryQuery(tag.id);
  return (
    <div className='mt-4'>
      <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
        <h3 className='section-label'>{t('dtags.detail.directory')}</h3>
        <Link to={tagDirectoryItemPath(tag.id)} className='btn btn-ghost btn-sm'>
          {t('dtags.detail.view_directory')}
          <ArrowUpRight aria-hidden className='size-4'/>
        </Link>
      </div>
      <div className='space-y-4 rounded-md border border-line bg-deep px-3 py-2'>
        {(isPending) ? (
          <div className='flex h-10 items-center justify-center'><Spinner className='size-4'/></div>
        ) : (directory) ? (
          <>
            <div className='flex flex-wrap items-center gap-2'>
              <VerificationBadge verified={directory.verified}/>
              {(directory.title) ? <span className='text-sm text-white'>{directory.title}</span> : null}
            </div>
            {(directory.description) ? <p className='line-clamp-3 text-sm whitespace-pre-wrap text-muted'>{stripMarkdown(directory.description)}</p> : null}
            {(directory.assets.length) ? <MediaSection assets={directory.assets} nsfw={tag.nsfw} tagName={tag.name}/> : null}
          </>
        ) : (
          <p className='text-sm text-muted'>{t('dtags.detail.listed')}</p>
        )}
      </div>
    </div>
  );
}
