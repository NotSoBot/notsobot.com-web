// Keeps a reply typed into an open report's `ReportThread` from being dropped by accident: closing the report's modal or
// stepping to another report asks first while there's an unsent one.
//
//   const guard = useReplyGuard({openId, open, close});
//   <AdminTagModal onNavigate={guard.open} onClose={guard.close} …>
//     <ReportThread onDraftChange={guard.onDraftChange} …/>   (and `guard.open` for the footer's Previous / Next)
//   </AdminTagModal>
//   {guard.dialog}
//
// `openId` is the open report's id (null when none is), `open(id)` and `close()` are the page's own, unguarded ones
// (`useOpenListItem`'s). What comes back: `open` / `close` to use in their place, `onDraftChange` for the thread, and
// `dialog` (the "Discard your reply?" confirm, null while it isn't asking) to render next to the modal.

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useI18n } from '@/i18n';


export function useReplyGuard({ openId, open, close }: {
  openId: string | null,
  open: (id: string) => void,
  close: () => void,
}): {
  open: (id: string) => void,
  close: () => void,
  onDraftChange: (unsent: boolean) => void,
  dialog: ReactNode,
} {
  const { t } = useI18n();
  // a ref: typing mustn't re-render the page, it's only read when something tries to leave
  const unsentReply = useRef(false);
  // what's waiting on the dialog: the report to step to (null to close), and the report it was asked on
  const [ leaving, setLeaving ] = useState<{from: string | null, to: string | null} | null>(null);
  // the question is about the report it was asked on: once another one is open (or none, e.g. the browser's Back closed
  // it) there's nothing left to discard, and Discard would only open the wrong report
  const asking = (leaving && leaving.from === openId) ? leaving : null;
  useEffect(() => {
    setLeaving(null);
  }, [openId]);

  const leave = (to: string | null) => {
    if (to) {
      open(to);
    } else {
      close();
    }
  };
  const askToLeave = (to: string | null) => {
    if (unsentReply.current) {
      setLeaving({from: openId, to});
    } else {
      leave(to);
    }
  };

  return {
    open: (id) => askToLeave(id),
    close: () => askToLeave(null),
    onDraftChange: (unsent) => {
      unsentReply.current = unsent;
    },
    dialog: (asking) ? (
      <ConfirmDialog
        title={t('reports.discard_title')}
        description={t('reports.discard_description')}
        confirmLabel={t('common.discard')}
        onConfirm={() => {
          setLeaving(null);
          leave(asking.to);
        }}
        onClose={() => setLeaving(null)}
      />
    ) : null,
  };
}
