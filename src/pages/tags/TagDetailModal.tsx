import { AlertTriangle } from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModalFooter } from '@/components/ui/DetailModal';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { config } from '@/config';
import { useArrowKeyNavigation } from '@/hooks/useArrowKeyNavigation';
import { useI18n } from '@/i18n';
import type { TagDirectoryItem } from '@/lib/api';
import { useTagDirectoryItemQuery } from '@/lib/api/queries';

import { AddTagButton, preloadAddTagDialog } from './tagDirectory';


const TITLE_ID = 'tag-modal-title';

// The tag itself (TagDetail.tsx: its media, the owner's and staff's tools, and the dashboard's queries with them) is
// most of the directory's code and the list needs none of it, so it's a file of its own, fetched when a tag is about to
// be opened. This frame stays with the list: the modal opens, closes and asks for the tag exactly as it always did, and
// shows its loading state until that file is in as well.
type TagDetailComponent = typeof import('./TagDetail')['TagDetail'];

let tagDetailLoad: Promise<{default: TagDetailComponent}> | null = null;
// set once the file is in. A modal opened after that renders it directly: `lazy` shows its fallback for a moment the
// first time it's rendered, even when the file is already here
let loadedTagDetail: TagDetailComponent | null = null;

function loadTagDetail(): Promise<{default: TagDetailComponent}> {
  tagDetailLoad ??= import('./TagDetail').then(({ TagDetail }) => {
    loadedTagDetail = TagDetail;
    return {default: TagDetail};
  }, (error: unknown) => {
    // a failed fetch isn't kept, the next call tries again
    tagDetailLoad = null;
    throw error;
  });
  return tagDetailLoad;
}

const LazyTagDetail = lazy(loadTagDetail);

// Fetches the tag's code (and the add dialog's, its footer has the button) ahead of the click. The directory calls it
// when a card is pointed at, focused or touched and once the list is up and the browser is idle; the modal calls it as
// it opens, so a shared link fetches the code alongside the tag. Does nothing once it's been asked for. Only called from
// events and effects: this file is in the worker's bundle too, and nothing here may run while it renders
export function preloadTagDetail(): void {
  preloadAddTagDialog();
  loadTagDetail().catch(() => undefined);
}


export function TagDetailModal({ tagId, initialItem, previousId, nextId, onNavigate, onClose }: {
  tagId: string,
  // the card's data from the directory list, so the modal opens instantly
  initialItem?: TagDirectoryItem,
  previousId: string | null,
  nextId: string | null,
  onNavigate: (id: string) => void,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { data: item, isPending, isError, refetch } = useTagDirectoryItemQuery(tagId, initialItem);
  // keyed on the tag so stepping to another one leaves edit mode
  const [ editingId, setEditingId ] = useState<string | null>(null);
  const editing = editingId === tagId;
  // whether the listing form has unsaved edits, and what's waiting on the discard prompt while it does: closing
  // (`to` is null) or stepping to another tag
  const [ dirty, setDirty ] = useState(false);
  const [ leaving, setLeaving ] = useState<{to: string | null} | null>(null);
  // a save in flight holds closing and stepping: leaving would unmount the form, and a failed save's error with it
  const [ saving, setSaving ] = useState(false);
  const held = editing && saving;

  // picked as the modal opens and kept while it's up: swapping one for the other under an open tag would remount it
  const [ TagDetail ] = useState<TagDetailComponent | typeof LazyTagDetail>(() => loadedTagDetail ?? LazyTagDetail);
  // on a shared link there's no tag to render yet, so nothing has asked for the file: asked for here, it loads alongside
  // the tag instead of after it
  useEffect(preloadTagDetail, []);

  // ← / → step through the tags loaded behind the modal (ignored while typing, editing the listing, or with a dialog open over it)
  useArrowKeyNavigation({previousId, nextId, onNavigate, disabled: editing});

  const leave = (to: string | null) => {
    if (to) {
      onNavigate(to);
    } else {
      onClose();
    }
  };

  // Escape, a click outside, the X and Previous / Next come through here, so they don't throw typed edits away unasked.
  // The form's own Cancel, the links inside it and the browser's Back don't
  const requestLeave = (to: string | null) => {
    if (held) {
      return;
    }
    if (editing && dirty) {
      setLeaving({to});
    } else {
      leave(to);
    }
  };

  const browsing = !!(previousId || nextId);
  // `AddTagButton` renders nothing when there's no way to log in, and an empty action would still make the footer stick
  const canAdd = isAuthenticated || config.authEnabled;

  return (
    <Modal labelledBy={TITLE_ID} onClose={() => requestLeave(null)} stickyClose>
      {(isPending) ? (
        <TagLoading/>
      ) : (isError && !item) ? (
        // only when there's nothing to show: a failed background refetch keeps the tag (and an open edit form) up
        <TagMessage title={t('tags.detail.load_error_title')} description={t('tags.detail.load_error_description')}>
          <button type='button' className='btn btn-secondary' onClick={() => refetch()}>{t('common.retry')}</button>
        </TagMessage>
      ) : (!item) ? (
        <TagMessage title={t('tags.detail.not_found_title')} description={t('tags.detail.not_found_description')}/>
      ) : (
        // the same loading state while its code is on the way (a shared link, someone quicker than the preload)
        <Suspense fallback={<TagLoading/>}>
          {/* keyed on the tag so a dialog opened from it (adding, reporting, ownership checks) never carries its state over to the next one.
              a save that finishes after another tag was stepped to only closes its own form, not the one open by then */}
          <TagDetail
            key={tagId}
            titleId={TITLE_ID}
            item={item}
            editing={editing}
            onEditingChange={(value) => setEditingId((current) => (value) ? tagId : (current === tagId) ? null : current)}
            onDirtyChange={setDirty}
            onSavingChange={setSaving}
          />
        </Suspense>
      )}

      {/* stays at the bottom of the window, so adding the tag and the next one are always a tap away. Without a tag
          (still loading, or it failed) only the browsing is left */}
      <ModalFooter previousId={(held) ? null : previousId} nextId={(held) ? null : nextId} onNavigate={(browsing) ? requestLeave : undefined}>
        {(item && canAdd) ? <AddTagButton key={tagId} tag={item.tag} verified={item.verified} size='md' openFromUrl/> : null}
      </ModalFooter>

      {(leaving) ? (
        <ConfirmDialog
          title={t('dash.discard_title')}
          description={t('dash.discard_description')}
          confirmLabel={t('common.discard')}
          onConfirm={() => {
            setLeaving(null);
            leave(leaving.to);
          }}
          onClose={() => setLeaving(null)}
        />
      ) : null}
    </Modal>
  );
}


// until there's a tag to show: its request is still out, or the code that draws it is
function TagLoading() {
  const { t } = useI18n();
  return (
    <div className='flex h-80 items-center justify-center'>
      <h2 id={TITLE_ID} className='sr-only'>{t('tags.detail.loading')}</h2>
      <Spinner/>
    </div>
  );
}


function TagMessage({ title, description, children }: {title: string, description: string, children?: ReactNode}) {
  return (
    <div className='px-6 py-16 text-center'>
      <AlertTriangle className='mx-auto mb-4 size-14 text-danger-text'/>
      <h2 id={TITLE_ID} className='mb-3 text-2xl font-bold text-white'>{title}</h2>
      <p className='mb-6 text-muted'>{description}</p>
      {children}
    </div>
  );
}
