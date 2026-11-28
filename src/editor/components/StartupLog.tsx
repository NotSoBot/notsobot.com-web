import { useSyncExternalStore } from 'react';

import { activityLog, formatTime, isOwnerDevice } from '../activityLog';


// The Activity's startup failure screen, for a device a NotSoBot owner last signed in on (../activityLog
// `isOwnerDevice`): the log of what startup and the Discord SDK did (../hosts/sdkTrace), live, as selectable text
// (Discord's frame has no clipboard). English only, like the other owner tools. Nobody else sees anything
export function StartupLog() {
  const entries = useSyncExternalStore(activityLog.subscribe, activityLog.getSnapshot);
  if (!isOwnerDevice()) {
    return null;
  }
  return (
    <div className='flex w-full max-w-3xl flex-col gap-2 text-left'>
      <p className='text-xs text-subtle'>Owners only: what startup and the Discord SDK did on this page, newest last.</p>
      <ol className='max-h-[50vh] overflow-auto rounded-xl bg-surface-2 p-3 font-mono text-[11px] leading-relaxed break-all text-subtle select-text'>
        {entries.map((entry, index) => (
          <li key={index}>{formatTime(entry.at)} [{entry.source}] {entry.text}</li>
        ))}
      </ol>
    </div>
  );
}
