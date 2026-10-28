import { AlertTriangle, ArrowUpRight, Lock, Pencil } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { DetailModalHeader, DetailModalStrip, ModalFooter } from '@/components/ui/DetailModal';
import { stripMarkdown } from '@/components/ui/Markdown';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import type { Tag } from '@/lib/api';
import { errorMessage, useMeTagDirectoryQuery, useMeTagQuery } from '@/lib/api/dashboardQueries';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { tagDirectoryItemPath, VerificationBadge } from '@/pages/tags/tagDirectory';
import { MediaSection } from '@/pages/tags/TagMedia';

import { Chip, CopyableValue, CopyButton, DETAIL_LIST_STACKED, DetailList, ExactDate, selectAllScope } from '../admin/adminUi';
import { tagLocation, TagLocationChip, tagServerPath } from './tagMeta';


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

  const navigation = useRef({previousId, nextId, onNavigate});
  navigation.current = {previousId, nextId, onNavigate};
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || (target instanceof Element && target.closest('input, textarea, select, [contenteditable]'))) {
        return;
      }
      const { previousId, nextId, onNavigate } = navigation.current;
      if (event.key === 'ArrowLeft' && previousId) {
        onNavigate(previousId);
      } else if (event.key === 'ArrowRight' && nextId) {
        onNavigate(nextId);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

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
        (tag.locked) ? <Chip key='locked' tone='warning' title={t('dtags.chip.locked_title')} className='gap-1'><Lock aria-hidden className='size-3'/>{t('dtags.chip.locked')}</Chip> : null,
        (tag.nsfw) ? <Chip key='nsfw' tone='danger' title={t('dtags.chip.nsfw_title')}>{t('tags.nsfw')}</Chip> : null,
        (tag.is_command) ? <Chip key='command' tone='brand' title={t('dtags.chip.command_title')}>{t('dtags.chip.command')}</Chip> : null,
        (tag.is_on_directory) ? <Chip key='directory' tone='success' title={t('dtags.chip.directory_title')}>{t('dtags.chip.directory')}</Chip> : null,
      ]}
    />
  );
}


// where the tag lives, in the strip under the header. `children` go on the right
export function TagLocationStrip({ tag, guildNames, children }: {tag: Tag, guildNames: Map<string, string>, children?: ReactNode}) {
  const { user } = useAuth();
  const location = tagLocation(tag, user, guildNames);
  return (
    <DetailModalStrip className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
      <TagLocationChip location={location} to={tagServerPath(location)}/>
      {(children) ? <div className='ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle'>{children}</div> : null}
    </DetailModalStrip>
  );
}


function TagDetails({ tag, guildNames }: {tag: Tag, guildNames: Map<string, string>}) {
  const { user } = useAuth();
  const { t, rich } = useI18n();
  const location = tagLocation(tag, user, guildNames);

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
        {/* side by side once there's room. Stacked on phones, both lists share one label column (subgrid) so their values
            line up */}
        <div className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-2'>
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              // phones only, the title's can be cut off there
              [t('dtags.detail.name'), <CopyableValue value={tag.name} truncate={0}/>, 'sm:hidden'],
              [t('dtags.detail.uses'), <span className='tabular-nums'>{formatNumber(tag.uses)}</span>],
              [t('dtags.detail.last_used'), (tag.last_used) ? <ExactDate value={tag.last_used} format={formatDateTime}/> : t('common.never')],
              [t('dtags.detail.created'), <ExactDate value={tag.created} format={formatDateTime}/>],
              [t('dtags.detail.edited'), (tag.edited) ? <ExactDate value={tag.edited} format={formatDateTime}/> : t('common.never')],
            ]}
          />
          <DetailList
            className={DETAIL_LIST_STACKED}
            items={[
              [t('dtags.detail.tag'), <CopyableValue value={tag.id} truncate={0}/>],
              (location.id) ? [t((location.kind === 'server') ? 'dtags.detail.server' : 'dtags.detail.channel'), <CopyableValue value={location.id} truncate={0}/>] : null,
              [t('dtags.detail.locked'), t((tag.locked) ? 'common.yes' : 'common.no')],
              [t('dtags.detail.command'), t((tag.is_command) ? 'common.yes' : 'common.no')],
              [t('dtags.detail.nsfw'), t((tag.nsfw) ? 'common.yes' : 'common.no')],
            ]}
          />
        </div>

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
