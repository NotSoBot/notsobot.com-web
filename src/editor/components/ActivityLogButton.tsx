import { ScrollText } from 'lucide-react';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import { CopyButton } from '@/components/ui/CopyButton';
import { Modal } from '@/components/ui/Modal';

import { activityLog, formatLog, formatTime } from '../activityLog';


// NotSoBot owners only (the Activity's `owner`): the Activity's connection log (../activityLog) in a dialog, for a join
// that hangs inside Discord, where there's no devtools. English only, like the dashboard's owner pages
export function ActivityLogButton({ className }: {className?: string}) {
  const [ open, setOpen ] = useState(false);
  return (
    <>
      <button
        type='button'
        aria-label='Connection logs'
        title='Connection logs (owners only)'
        onClick={() => setOpen(true)}
        className={className ?? 'flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg'}
      >
        <ScrollText aria-hidden className='size-4'/>
      </button>
      {(open) ? <ActivityLogDialog onClose={() => setOpen(false)}/> : null}
    </>
  );
}


function ActivityLogDialog({ onClose }: {onClose: () => void}) {
  const titleId = useId();
  const entries = useSyncExternalStore(activityLog.subscribe, activityLog.getSnapshot);
  const listRef = useRef<HTMLOListElement>(null);
  // kept at the newest line while they're there, left alone once they scroll up to read
  const pinned = useRef(true);
  useEffect(() => {
    const list = listRef.current;
    if (list && pinned.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [entries]);

  return (
    <Modal labelledBy={titleId} onClose={onClose} className='max-w-3xl'>
      <div className='flex flex-col gap-3 p-5 sm:p-6'>
        <div className='flex flex-wrap items-center gap-2 pr-10'>
          <h2 id={titleId} className='flex-1 text-lg font-semibold text-white'>Connection logs</h2>
          <CopyButton value={formatLog(entries)} label='Copy'/>
          <button type='button' className='btn btn-ghost btn-sm' onClick={() => activityLog.clear()}>Clear</button>
        </div>
        <p className='text-xs text-subtle'>
          Owners only. This Activity’s socket and game joins, newest last; kept in this window only, tokens are never logged.
        </p>
        <ol
          ref={listRef}
          onScroll={(event) => {
            const list = event.currentTarget;
            pinned.current = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
          }}
          className='max-h-[60dvh] overflow-y-auto rounded-lg border border-line bg-surface p-2 font-mono text-xs leading-relaxed'
        >
          {(entries.length) ? entries.map((entry, index) => (
            <li key={`${entry.at}:${index}`} className='break-words'>
              <span className='text-subtle'>{formatTime(entry.at)}</span>{' '}
              <span className={(entry.source === 'game') ? 'text-brand-text' : (entry.source === 'startup') ? 'text-warning' : 'text-muted'}>[{entry.source}]</span>{' '}
              <span className='text-fg'>{entry.text}</span>
            </li>
          )) : <li className='text-subtle'>Nothing logged yet.</li>}
        </ol>
      </div>
    </Modal>
  );
}
