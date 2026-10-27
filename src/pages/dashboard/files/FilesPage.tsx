// The files the bot uploaded to the file host (nsb.gg) for the user, when a result was too big for Discord or their
// settings say to always upload. They can be opened, copied and deleted here; uploads still come from the bot.
// Three views of the same page of files: a detailed list, a thumbnail grid, and a table with bulk delete.

import { Check, ChevronDown, ExternalLink, File as FileIcon, FileAudio, FileImage, Files, FileText, FileVideo, LayoutGrid, List, type LucideIcon, Table2, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePersistentState } from '@/hooks/usePersistentState';
import { translate, useI18n, type TranslationKey } from '@/i18n';
import type { UserFile, UserFilesSortBy } from '@/lib/api';
import { ME_FILES_PAGE_SIZE, errorMessage, useDeleteMeFilesMutation, useMeFilesQuery } from '@/lib/api/dashboardQueries';
import { cn, formatDate, formatDateTime, formatExactDateTime, formatMemory, formatNumber, toDate } from '@/lib/utils';

import { Chip, CopyButton, FiltersButton, Pagination, useSearchParamState, useStepBackFromEmptyPage } from '../admin/adminUi';
import { DashboardHeader, EmptyState, ErrorPanel, Skeleton } from '../ui';


type FilesView = 'list' | 'grid' | 'table';

const VIEWS: Array<{value: FilesView, label: TranslationKey, icon: LucideIcon}> = [
  {value: 'list', label: 'files.view.list', icon: List},
  {value: 'grid', label: 'files.view.grid', icon: LayoutGrid},
  {value: 'table', label: 'files.view.table', icon: Table2},
];

const SORTS: Array<{value: UserFilesSortBy, label: TranslationKey}> = [
  {value: 'newest', label: 'files.sort.newest'},
  {value: 'oldest', label: 'files.sort.oldest'},
  {value: 'largest', label: 'files.sort.largest'},
  {value: 'name', label: 'files.sort.name'},
];

// bigger images just get the icon, so a page of huge gifs doesn't pull hundreds of megabytes
const PREVIEW_SIZE_MAX = 8 * 1024 * 1024;


function fileKind(mimetype: string): 'image' | 'video' | 'audio' | 'text' | 'other' {
  const [ type ] = mimetype.split('/');
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'text') {
    return type;
  }
  return 'other';
}

const KIND_ICONS = {image: FileImage, video: FileVideo, audio: FileAudio, text: FileText, other: FileIcon};


function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  return formatMemory(bytes, (bytes < 1024 * 1024) ? 0 : 1);
}

// `in 20h`, short enough for the grid and table; the exact time is on hover
function formatExpiresIn(value: string): string {
  const minutes = Math.floor((toDate(value).getTime() - Date.now()) / 60000);
  if (minutes < 1) {
    return translate('files.expires.now');
  }
  if (minutes < 60) {
    return translate('files.expires.minutes', {count: minutes});
  }
  const hours = Math.floor(minutes / 60);
  return (hours < 48) ? translate('files.expires.hours', {count: hours}) : translate('files.expires.days', {count: Math.floor(hours / 24)});
}


export function FilesPage() {
  const { t, rich, plural } = useI18n();
  const { searchParams, page, update, setPage } = useSearchParamState();
  const query = searchParams.get('q') || '';
  const sortBy = SORTS.find((sort) => sort.value === searchParams.get('sort'))?.value ?? 'newest';
  // `?temporary=true` only temporary uploads, `false` only the ones that stay
  const temporaryParam = searchParams.get('temporary');
  const temporary = (temporaryParam === 'true') ? true : (temporaryParam === 'false') ? false : null;
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  // the panel starts closed, the button counts the ones not on their default (more filters will go in it)
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const activeFilters = [sortBy !== 'newest', temporary !== null].filter(Boolean).length;
  const filtered = !!debouncedQuery || temporary !== null;
  const [ storedView, setView ] = usePersistentState<FilesView>('dashboard:files-view', 'list');
  const view = VIEWS.find((option) => option.value === storedView)?.value ?? 'list';

  const { data, isPending, isError, error, isPlaceholderData, isFetching, isRefetching, refetch } = useMeFilesQuery({
    query: debouncedQuery,
    sortBy,
    temporary,
    page,
  });
  const items = data?.items ?? [];
  const steppingBack = useStepBackFromEmptyPage({page, setPage, data, isPlaceholderData, pageSize: ME_FILES_PAGE_SIZE});
  const pagination = {
    page,
    count: data?.count ?? 0,
    pageSize: ME_FILES_PAGE_SIZE,
    onChange: setPage,
    fetching: isFetching && isPlaceholderData,
  };

  // the table's checkboxes; only ever the files on the page that's shown
  const [ selected, setSelected ] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setSelected(new Set()), [page, debouncedQuery, sortBy, temporary, view]);
  const selectedFiles = items.filter((file) => selected.has(file.id));

  const toast = useToast();
  const remove = useDeleteMeFilesMutation();
  const [ deleting, setDeleting ] = useState<Array<UserFile> | null>(null);
  const confirmDelete = () => {
    if (!deleting) {
      return;
    }
    remove.mutate(deleting.map((file) => file.id), {
      onSuccess: () => {
        toast(plural('files.deleted', deleting.length));
        setSelected((previous) => new Set([...previous].filter((id) => !deleting.some((file) => file.id === id))));
        setDeleting(null);
      },
    });
  };
  const askDelete = (file: UserFile) => setDeleting([file]);

  return (
    <>
      <DashboardHeader
        title={t('page.DASHBOARD_FILES')}
        description={rich('files.description', {link: (chunk) => <Link to={Routes.DASHBOARD_SETTINGS} className='text-code hover:underline'>{chunk}</Link>})}
      />

      {/* the search, how they're shown, then the filters panel's button */}
      <div className='mb-4 flex gap-2'>
        <SearchInput
          className='min-w-0 flex-1'
          value={query}
          onValueChange={(value) => update({q: value})}
          placeholder={t('files.search_placeholder')}
          aria-label={t('files.search_label')}
        />
        <ViewMenu value={view} onChange={setView}/>
        <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls='file-filters'/>
      </div>

      <div id='file-filters' hidden={!filtersOpen} className='card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('files.sort')}</span>
          <select className='input' value={sortBy} onChange={(event) => update({sort: (event.target.value === 'newest') ? null : event.target.value})}>
            {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{t(sort.label)}</option>)}
          </select>
        </label>
        <label className='text-sm'>
          <span className='mb-1 block text-subtle'>{t('files.temporary')}</span>
          <select className='input' value={(temporary === null) ? '' : String(temporary)} onChange={(event) => update({temporary: event.target.value || null})}>
            <option value=''>{t('files.any')}</option>
            <option value='true'>{t('files.only_temporary')}</option>
            <option value='false'>{t('files.only_permanent')}</option>
          </select>
        </label>
      </div>

      {(data) ? <StorageSummary count={data.count} size={data.size} total={data.total} searching={filtered}/> : null}

      {(isPending || steppingBack) ? (
        <ListSkeleton/>
      ) : (isError && !items.length) ? (
        <ErrorPanel title={t('files.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (!items.length) ? (
        <EmptyState icon={<Files className='size-10'/>} title={t((filtered) ? 'files.empty_filtered' : 'files.empty')}>
          {t((filtered) ? 'files.empty_filtered_description' : 'files.empty_description')}
        </EmptyState>
      ) : (
        <>
          {(pagination.count > ME_FILES_PAGE_SIZE) ? <Pagination {...pagination} className='mt-0 mb-4'/> : null}
          <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
            {(view === 'grid') ? (
              <FilesGrid files={items} onDelete={askDelete}/>
            ) : (view === 'table') ? (
              <FilesTable
                files={items}
                selected={selected}
                onSelectedChange={setSelected}
                onDelete={askDelete}
                onDeleteSelected={() => setDeleting(selectedFiles)}
              />
            ) : (
              <FilesList files={items} onDelete={askDelete}/>
            )}
          </div>
          {(pagination.count > ME_FILES_PAGE_SIZE) ? <Pagination {...pagination}/> : null}
        </>
      )}

      {(deleting) ? (
        <ConfirmDialog
          title={(deleting.length === 1) ? t('files.delete_title', {name: deleting[0].filename || deleting[0].vanity}) : t('files.delete_title_other', {count: formatNumber(deleting.length)})}
          description={(deleting.length === 1) ? (
            rich('files.delete_description', {link: (chunk) => <span className='font-mono text-fg break-all'>{chunk}</span>}, {url: deleting[0].urls.vanity})
          ) : (
            t('files.delete_description_other')
          )}
          confirmLabel={(deleting.length === 1) ? t('files.delete_one') : t('files.delete_other', {count: formatNumber(deleting.length)})}
          pending={remove.isPending}
          error={(remove.isError) ? errorMessage(remove.error, t('files.delete_error')) : null}
          onConfirm={confirmDelete}
          onClose={() => {
            remove.reset();
            setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}


/* shared pieces */

// how much the user has on the file host, and how much of it the search matched
// how the files are shown (list, grid or table), a dropdown next to the search box. Remembered per browser
function ViewMenu({ value, onChange }: {value: FilesView, onChange: (value: FilesView) => void}) {
  const { t } = useI18n();
  const [ open, setOpen ] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = VIEWS.find((option) => option.value === value) ?? VIEWS[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className='relative shrink-0'>
      <button
        type='button'
        className='btn btn-secondary h-12 px-3 sm:px-4'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('files.view_label', {view: t(current.label)})}
        onClick={() => setOpen((previous) => !previous)}
      >
        <current.icon aria-hidden className='size-4'/>
        <span className='max-sm:hidden'>{t(current.label)}</span>
        <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')}/>
      </button>
      {(open) ? (
        <div id={menuId} role='menu' aria-label={t('files.view')} className='absolute right-0 z-30 mt-2 w-40 animate-fade-in rounded-lg border border-line bg-surface p-1.5 shadow-2xl shadow-black/40'>
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type='button'
              role='menuitemradio'
              aria-checked={option.value === value}
              className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2'
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <option.icon aria-hidden className='size-4 text-muted'/>
              {t(option.label)}
              {(option.value === value) ? <Check aria-hidden className='ml-auto size-4 text-brand'/> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}


function StorageSummary({ count, size, total, searching }: {count: number, size: number, total: {count: number, size: number}, searching: boolean}) {
  const { t, rich, plural } = useI18n();
  const files = (value: number) => plural('files.count', value);
  const b = (chunk: string) => <span className='text-fg'>{chunk}</span>;
  return (
    <p className='mb-4 text-sm text-muted'>
      {(searching) ? (
        <>
          {rich('files.matched', {b}, {files: files(count), size: formatSize(size)})}
          <span className='text-subtle'>{t('files.across', {size: formatSize(total.size), files: files(total.count)})}</span>
        </>
      ) : (
        rich('files.used', {b}, {size: formatSize(total.size), files: files(total.count)})
      )}
    </p>
  );
}


// temporary uploads stop working at `expires_at`, so the badge says when
function ExpiryChip({ file }: {file: UserFile}) {
  const { t } = useI18n();
  if (!file.temporary || !file.expires_at) {
    return null;
  }
  return <Chip tone='warning' title={t('files.expires_title', {date: formatExactDateTime(file.expires_at)})}>{t('files.expires', {when: formatExpiresIn(file.expires_at)})}</Chip>;
}


function FileLink({ file, className }: {file: UserFile, className?: string}) {
  return (
    <a href={file.urls.vanity} target='_blank' rel='noopener noreferrer' className={cn('truncate font-medium text-white hover:underline', className)} title={file.filename}>
      {file.filename}
    </a>
  );
}


function VanityLink({ file }: {file: UserFile}) {
  return (
    <span className='flex min-w-0 items-center gap-1 text-xs'>
      <span className='truncate font-mono text-subtle'>{file.urls.vanity.replace(/^https?:\/\//, '')}</span>
      <CopyButton value={file.urls.vanity}/>
    </span>
  );
}


function FilePreview({ file, className, iconClassName = 'size-6' }: {file: UserFile, className: string, iconClassName?: string}) {
  const [ failed, setFailed ] = useState(false);
  const kind = fileKind(file.metadata.mimetype);
  const Icon = KIND_ICONS[kind];

  if (kind === 'image' && file.metadata.size <= PREVIEW_SIZE_MAX && !failed) {
    return (
      <img
        src={file.urls.cdn}
        alt=''
        loading='lazy'
        decoding='async'
        onError={() => setFailed(true)}
        className={cn('shrink-0 bg-surface-3 object-cover', className)}
      />
    );
  }
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center bg-[#00b0f4]/15', className)}>
      <Icon className={cn('text-[#00b0f4]', iconClassName)}/>
    </span>
  );
}


function OpenButton({ file, label = true }: {file: UserFile, label?: boolean}) {
  const { t } = useI18n();
  return (
    <a href={file.urls.vanity} target='_blank' rel='noopener noreferrer' className='btn btn-sm btn-secondary' aria-label={t('files.open_label')} title={t('files.open')}>
      <ExternalLink className='size-4'/>
      {(label) ? <span className='hidden sm:inline'>{t('files.open')}</span> : null}
    </a>
  );
}


function DeleteButton({ onClick, label = true }: {onClick: () => void, label?: boolean}) {
  const { t } = useI18n();
  return (
    <button type='button' className='btn btn-sm btn-danger' onClick={onClick} aria-label={t('files.delete_label')} title={t('common.delete')}>
      <Trash2 className='size-4'/>
      {(label) ? <span className='hidden sm:inline'>{t('common.delete')}</span> : null}
    </button>
  );
}


/* list */

function FilesList({ files, onDelete }: {files: Array<UserFile>, onDelete: (file: UserFile) => void}) {
  const { t } = useI18n();
  return (
    <ul className='card divide-y divide-line'>
      {files.map((file) => {
        const { metadata } = file;
        const kind = fileKind(metadata.mimetype);
        return (
          <li key={file.id} className='flex items-start gap-3 px-4 py-3'>
            <FilePreview file={file} className='size-12 rounded-md'/>
            <div className='min-w-0 flex-1'>
              <FileLink file={file} className='block'/>
              <div className='mt-0.5'><VanityLink file={file}/></div>
              <div className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
                <Chip>{metadata.extension.toUpperCase()}</Chip>
                <ExpiryChip file={file}/>
                <span>{formatSize(metadata.size)}</span>
                {((kind === 'image' || kind === 'video') && metadata.width && metadata.height) ? (
                  <span>{metadata.width}×{metadata.height}</span>
                ) : null}
                {(metadata.duration) ? <span>{formatDuration(metadata.duration)}</span> : null}
                <span title={formatExactDateTime(file.created)}>{t('files.uploaded', {date: formatDateTime(file.created)})}</span>
              </div>
            </div>
            <div className='flex shrink-0 flex-col gap-1.5 sm:flex-row'>
              <OpenButton file={file}/>
              <DeleteButton onClick={() => onDelete(file)}/>
            </div>
          </li>
        );
      })}
    </ul>
  );
}


/* grid */

function FilesGrid({ files, onDelete }: {files: Array<UserFile>, onDelete: (file: UserFile) => void}) {
  return (
    <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
      {files.map((file) => (
        <li key={file.id} className='card flex min-w-0 flex-col overflow-hidden'>
          <a href={file.urls.vanity} target='_blank' rel='noopener noreferrer' tabIndex={-1} aria-hidden>
            <FilePreview file={file} className='aspect-video w-full' iconClassName='size-10'/>
          </a>
          <div className='flex min-w-0 flex-1 flex-col gap-1 p-3'>
            <FileLink file={file} className='block text-sm'/>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle'>
              <span>{formatSize(file.metadata.size)}</span>
              <span title={formatExactDateTime(file.created)}>{formatDate(file.created)}</span>
            </div>
            <div className='mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5'>
              <div className='min-h-5'><ExpiryChip file={file}/></div>
              <div className='flex gap-1.5'>
                <OpenButton file={file} label={false}/>
                <DeleteButton onClick={() => onDelete(file)} label={false}/>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}


/* table */

function FilesTable({ files, selected, onSelectedChange, onDelete, onDeleteSelected }: {
  files: Array<UserFile>,
  selected: ReadonlySet<string>,
  onSelectedChange: (selected: ReadonlySet<string>) => void,
  onDelete: (file: UserFile) => void,
  onDeleteSelected: () => void,
}) {
  const { t } = useI18n();
  const count = files.filter((file) => selected.has(file.id)).length;
  const all = count === files.length;
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = 0 < count && !all;
    }
  }, [count, all]);

  const toggle = (fileId: string) => {
    const next = new Set(selected);
    if (next.has(fileId)) {
      next.delete(fileId);
    } else {
      next.add(fileId);
    }
    onSelectedChange(next);
  };

  return (
    <>
      <div className='mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm text-muted'>
        <span>{(count) ? t('files.selected', {count: formatNumber(count)}) : t('files.select_hint')}</span>
        {(count) ? (
          <div className='flex gap-2'>
            <button type='button' className='btn btn-sm btn-ghost' onClick={() => onSelectedChange(new Set())}>{t('common.clear')}</button>
            <button type='button' className='btn btn-sm btn-danger' onClick={onDeleteSelected}>
              <Trash2 className='size-4'/>
              {(count === 1) ? t('files.delete_one') : t('files.delete_other', {count: formatNumber(count)})}
            </button>
          </div>
        ) : null}
      </div>
      <div className='card overflow-x-auto'>
        <table className='w-full min-w-[760px] table-fixed text-left text-sm'>
          <thead className='border-b border-line text-xs text-subtle uppercase'>
            <tr>
              <th scope='col' className='w-11 py-2.5 pl-4'>
                <input
                  ref={headerRef}
                  type='checkbox'
                  className='size-4 cursor-pointer accent-brand'
                  aria-label={t('files.select_all')}
                  checked={all}
                  onChange={() => onSelectedChange((all) ? new Set() : new Set(files.map((file) => file.id)))}
                />
              </th>
              <th scope='col' className='px-3 py-2.5 font-medium'>{t('files.col.name')}</th>
              <th scope='col' className='w-24 px-3 py-2.5 font-medium'>{t('files.col.size')}</th>
              <th scope='col' className='w-28 px-3 py-2.5 font-medium'>{t('files.col.uploaded')}</th>
              <th scope='col' className='w-48 px-3 py-2.5 font-medium'>{t('files.col.link')}</th>
              <th scope='col' className='w-28 px-3 py-2.5 font-medium'><span className='sr-only'>{t('files.col.actions')}</span></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-line'>
            {files.map((file) => (
              <tr key={file.id} className={cn('align-middle hover:bg-surface-2', selected.has(file.id) && 'bg-surface-2')}>
                <td className='py-2 pl-4'>
                  <input
                    type='checkbox'
                    className='size-4 cursor-pointer accent-brand'
                    aria-label={t('files.select', {name: file.filename})}
                    checked={selected.has(file.id)}
                    onChange={() => toggle(file.id)}
                  />
                </td>
                <td className='px-3 py-2'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <FilePreview file={file} className='size-8 rounded' iconClassName='size-4'/>
                    <div className='flex min-w-0 flex-col items-start gap-0.5'>
                      <FileLink file={file} className='max-w-full'/>
                      <ExpiryChip file={file}/>
                    </div>
                  </div>
                </td>
                <td className='px-3 py-2 whitespace-nowrap text-muted'>{formatSize(file.metadata.size)}</td>
                <td className='px-3 py-2 whitespace-nowrap text-muted' title={formatExactDateTime(file.created)}>{formatDate(file.created)}</td>
                <td className='px-3 py-2'><VanityLink file={file}/></td>
                <td className='px-3 py-2'>
                  <div className='flex justify-end gap-1.5'>
                    <OpenButton file={file} label={false}/>
                    <DeleteButton onClick={() => onDelete(file)} label={false}/>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


function ListSkeleton() {
  return (
    <div aria-hidden className='card divide-y divide-line'>
      {Array.from({length: 4}, (_, i) => (
        <div key={i} className='flex items-start gap-3 px-4 py-3'>
          <Skeleton className='size-12 rounded-md'/>
          <div className='flex-1'>
            <Skeleton className='h-4 w-48'/>
            <Skeleton className='mt-1.5 h-3 w-36 bg-surface-2'/>
            <Skeleton className='mt-1.5 h-3 w-64 bg-surface-2'/>
          </div>
          <Skeleton className='h-8 w-36 bg-surface-2'/>
        </div>
      ))}
    </div>
  );
}
