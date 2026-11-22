import { BarChart3, Calendar, Server, Tag as TagIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ReportButton } from '@/components/reports/ReportButton';
import { CopyButton } from '@/components/ui/CopyButton';
import { Markdown } from '@/components/ui/Markdown';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useI18n } from '@/i18n';
import { TagDirectoryVerificationStates, type TagDirectoryItem } from '@/lib/api';
import { useAdminTagDirectoryItemQuery, useMeTagDirectoryQuery } from '@/lib/api/dashboardQueries';
import { Routes } from '@/routes';
import { adminTagsPath } from '@/lib/adminPaths';
import { userDisplayTag } from '@/lib/discord';
import { cn, formatDate, formatDateTime, formatNumber } from '@/lib/utils';

import { categoryLabel, NsfwBadge, verificationInfo } from './tagDirectory';
import { HiddenContentSection, ListingEditForm, ManageListingCard, TagServersSection, useListingAccess } from './TagListingManager';
import { MediaSection, ThumbnailManager, type MediaManage } from './TagMedia';


// What the tag's modal shows once it has the tag (TagDetailModal.tsx is its frame). The media viewer, the owner's and
// staff's tools and the dashboard's queries all come in through here, so the modal fetches this file on its own and the
// directory's list never waits on it.
export function TagDetail({ titleId, item, editing, onEditingChange, onDirtyChange, onSavingChange }: {
  // the modal's `aria-labelledby`, for the tag's name
  titleId: string,
  item: TagDirectoryItem,
  editing: boolean,
  onEditingChange: (editing: boolean) => void,
  // whether the listing form has unsaved edits
  onDirtyChange: (dirty: boolean) => void,
  // whether it's saving them right now
  onSavingChange: (saving: boolean) => void,
}) {
  const { t, rich } = useI18n();
  const { tag } = item;
  const verification = verificationInfo(item.verified);
  const access = useListingAccess(item);
  const canManage = access.owner || access.staff;
  // the public listing only has its media once it's verified, the owner and staff see it before that
  const own = useMeTagDirectoryQuery(item.id, {enabled: access.owner && !access.staff});
  const admin = useAdminTagDirectoryItemQuery(item.id, {enabled: access.staff});
  const privateItem = (access.staff) ? admin.data : (access.owner) ? own.data : undefined;
  const assets = privateItem?.assets ?? item.assets;
  // staff change the media through the admin routes, whatever the verification state; owners only while it's pending
  const staffManage: MediaManage | undefined = (access.staff && admin.data) ? {tagId: item.id, verified: admin.data.verified, staff: true} : undefined;

  return (
    <>
      <header className='rounded-t-xl border-b border-line bg-surface px-6 pt-6 pb-5 sm:pr-14'>
        {/* clear of the close button; on wider screens the whole header is */}
        <div className='flex flex-wrap items-center gap-2 pr-8 sm:pr-0'>
          <h2 id={titleId} className='text-2xl font-bold break-words text-white sm:text-3xl'>{tag.name}</h2>
          {(tag.nsfw) ? <NsfwBadge/> : null}
        </div>
        {(item.title) ? <p className='mt-1 text-muted'>{item.title}</p> : null}
        {/* one quiet line instead of a row of pills */}
        <p className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
          {/* verified stands out as a solid pill, the other states stay plain text */}
          <span
            title={verification.description}
            className={cn(
              'inline-flex items-center gap-1.5 font-medium',
              (item.verified === TagDirectoryVerificationStates.VERIFIED) ?
                'rounded-full bg-success px-2.5 py-0.5 text-white shadow-sm' :
                verification.textClassName,
            )}
          >
            <verification.icon aria-hidden className='size-4'/>
            {verification.label}
          </span>
          <span aria-hidden className='text-subtle'>•</span>
          <span className='inline-flex items-center gap-1.5 text-muted'>
            <TagIcon aria-hidden className='size-4 text-subtle'/>
            {categoryLabel(item.category)}
          </span>
        </p>
      </header>

      <div className='grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px]'>
        <div className='min-w-0 space-y-5'>
          <div className='rounded-lg bg-deep p-4'>
            <p className='text-sm text-muted'>{verification.description}</p>
          </div>

          {(editing && canManage) ? (
            <>
              {/* the media saves as it goes (it isn't part of the form's save). Staff can always change it, and get it above
                  the content they're editing; the owner only while it's pending: a verified listing's media changes through
                  a change request, which lives in the dashboard */}
              <ListingEditForm
                item={item}
                access={access}
                media={(staffManage && admin.data) ? (
                  <div className='space-y-5 rounded-md border border-line bg-deep p-4'>
                    <section>
                      <h3 className='mb-1 font-semibold text-white'>{t('tags.detail.thumbnail')}</h3>
                      <p className='mb-3 text-sm text-muted'>{t('tags.detail.thumbnail_description')}</p>
                      <ThumbnailManager assets={admin.data.assets} thumbnail={admin.data.thumbnail ?? null} manage={staffManage}/>
                    </section>
                    <div className='border-t border-line pt-5'>
                      <MediaSection
                        key={item.id}
                        assets={admin.data.assets}
                        nsfw={false}
                        tagName={tag.name}
                        manage={staffManage}
                        headingClassName='font-semibold text-white'
                      />
                    </div>
                  </div>
                ) : undefined}
                onDone={() => onEditingChange(false)}
                onDirtyChange={onDirtyChange}
                onSavingChange={onSavingChange}
              />
              {(staffManage) ? null : (access.owner && own.data && own.data.verified === TagDirectoryVerificationStates.VERIFIED) ? (
                <p className='rounded-lg border border-line bg-surface p-4 text-sm text-muted'>
                  {rich('tags.detail.locked', {link: (chunk) => (
                    <Link to={`${Routes.DASHBOARD_TAG_EDIT.replace(':tagId', item.id)}?tab=directory`} className='text-brand-text hover:underline'>{chunk}</Link>
                  )})}
                </p>
              ) : (access.owner && own.data) ? (
                <div className='space-y-5 rounded-lg border border-line bg-surface p-4'>
                  <section>
                    <h3 className='mb-1 font-semibold text-white'>{t('tags.detail.thumbnail')}</h3>
                    <p className='mb-3 text-sm text-muted'>{t('tags.detail.thumbnail_description')}</p>
                    <ThumbnailManager
                      assets={own.data.assets}
                      thumbnail={own.data.thumbnail}
                      manage={{tagId: item.id, verified: own.data.verified}}
                    />
                  </section>
                  <div className='border-t border-line pt-5'>
                    <MediaSection
                      key={item.id}
                      assets={own.data.assets}
                      nsfw={false}
                      tagName={tag.name}
                      manage={{tagId: item.id, verified: own.data.verified}}
                      headingClassName='font-semibold text-white'
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {(item.description) ? (
                <section>
                  <h3 className='section-label mb-2'>{t('tags.detail.description')}</h3>
                  <Markdown text={item.description} className='text-white'/>
                </section>
              ) : null}

              <MediaSection
                key={item.id}
                assets={assets}
                nsfw={tag.nsfw}
                tagName={tag.name}
                manage={(!access.owner) ? undefined : (access.staff) ? staffManage : {tagId: item.id, verified: own.data?.verified ?? item.verified}}
              />

              {/* only filled in when the owner chose to show it */}
              {(item.content_public && tag.content) ? (
                <section>
                  <div className='mb-1 flex min-h-8 items-center justify-between gap-2'>
                    <h3 className='section-label'>{t('tags.detail.content')}</h3>
                    <CopyButton value={tag.content} label={t('common.copy')}/>
                  </div>
                  <pre className='max-h-96 overflow-auto rounded-md border border-line bg-deep p-3 font-mono text-sm whitespace-pre-wrap break-words text-fg'>{tag.content}</pre>
                </section>
              ) : null}

              {/* the owner and staff still see hidden content, with a note that nobody else can */}
              <HiddenContentSection item={item} access={access}/>
            </>
          )}

          {/* the date gets the full width under the two counts on phones, three across doesn't fit it there */}
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            <StatTile icon={BarChart3} label={t('tags.detail.uses')}><span className='text-2xl font-bold'>{formatNumber(tag.uses)}</span></StatTile>
            <StatTile icon={Server} label={t('tags.detail.servers')}><span className='text-2xl font-bold'>{formatNumber(item.server_count)}</span></StatTile>
            <StatTile icon={Calendar} label={t('tags.detail.listed')} className='col-span-2 sm:col-span-1'>
              <span className='text-sm font-medium'>{formatDate(item.created)}</span>
            </StatTile>
          </div>

          {/* who added it, the owner and staff only */}
          <TagServersSection item={item} access={access}/>

          <section>
            <h3 className='section-label mb-1'>{t('tags.detail.information')}</h3>
            <dl className='divide-y divide-line'>
              <InfoRow label={t('tags.detail.created')}>{formatDateTime(tag.created)}</InfoRow>
              {(tag.edited) ? <InfoRow label={t('tags.detail.last_edited')}>{formatDateTime(tag.edited)}</InfoRow> : null}
              {(tag.last_used) ? <InfoRow label={t('tags.detail.last_used')}>{formatDateTime(tag.last_used)}</InfoRow> : null}
              {/* only worth a row when they apply */}
              {(tag.locked) ? <InfoRow label={t('tags.detail.is_locked')}>{t('common.yes')}</InfoRow> : null}
              {(tag.is_command) ? <InfoRow label={t('tags.detail.command_tag')}>{t('common.yes')}</InfoRow> : null}
              {(tag.reference_tag) ? <InfoRow label={t('tags.detail.alias_of')}>{tag.reference_tag.name}</InfoRow> : null}
              <InfoRow label={t('tags.detail.tag_id')}>
                <span className='flex items-center justify-end gap-1'>
                  {/* staff jump straight to the tag in the admin panel */}
                  {(access.staff) ? (
                    <Link
                      to={adminTagsPath(`id:${item.id}`)}
                      title={t('tags.detail.open_admin')}
                      className='font-mono underline-offset-2 hover:text-brand-text hover:underline'
                    >
                      {item.id}
                    </Link>
                  ) : (
                    <span className='font-mono select-all'>{item.id}</span>
                  )}
                  <CopyButton value={item.id}/>
                </span>
              </InfoRow>
            </dl>
          </section>
        </div>

        <aside className='space-y-4'>
          <ManageListingCard item={item} access={access} editing={editing} onEdit={() => onEditingChange(true)}/>
          <section className='card p-5'>
            <h3 className='section-label mb-4'>{t('tags.detail.created_by')}</h3>
            <div className='flex items-center gap-3'>
              <UserAvatar user={tag.user} size={128} className='size-14 shrink-0 rounded-full bg-surface-3'/>
              <div className='min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='truncate font-medium text-white'>{userDisplayTag(tag.user)}</span>
                  {(tag.user.bot) ? <span className='rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white'>{t('tags.detail.bot')}</span> : null}
                </div>
                <p className='truncate font-mono text-xs text-subtle'>{tag.user.id}</p>
              </div>
            </div>
          </section>
          {/* the owner can't report their own tag */}
          {(access.owner) ? null : (
            <ReportButton subject={{type: 'tag', tag}} className='btn btn-ghost w-full justify-center text-sm hover:text-danger-text'/>
          )}
        </aside>
      </div>
    </>
  );
}


function StatTile({ icon: Icon, label, className, children }: {icon: LucideIcon, label: string, className?: string, children: ReactNode}) {
  return (
    <div className={cn('min-w-0 rounded-lg bg-deep p-4', className)}>
      <div className='mb-2 flex items-center gap-2 text-muted'>
        <Icon className='size-4'/>
        <span className='text-xs'>{label}</span>
      </div>
      <div className='text-white tabular-nums'>{children}</div>
    </div>
  );
}


function InfoRow({ label, children }: {label: string, children: ReactNode}) {
  return (
    <div className='flex items-start justify-between gap-4 py-2.5 text-sm'>
      <dt className='text-muted'>{label}</dt>
      <dd className='text-right text-white'>{children}</dd>
    </div>
  );
}
