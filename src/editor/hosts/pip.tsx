import { Flag, Wand2 } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import notSoLogo from '@/assets/logos/NotSoLogo.svg';
import { useI18n } from '@/i18n';


// When someone tabs out, Discord keeps the Activity running in a small window in the corner (picture in picture), or
// as a tile in a call's grid. The page at that size is a cut-off corner of the full one, so the Activity shows this
// instead: what they're in and the one thing worth glancing at (the edit's preview, the game's round and their score).
// The full page stays mounted underneath (sockets, edits, timers carry on), Discord brings it back when they click in


// what the screen on show says about itself, set by the editor and the game while they're mounted
export type PipStatus =
  | {kind: 'editor', title: string, previewUrl: string | null, previewIsVideo: boolean, people: number, watching: boolean}
  | {kind: 'game', title: string, phase: 'lobby' | 'round' | 'reveal' | 'finished', round: {number: number, total: number} | null, score: number | null, rank: number | null, players: number, watching: boolean, flagUrl: string | null}
  | null;


let current: PipStatus = null;
const listeners = new Set<() => void>();

export function setPipStatus(status: PipStatus): void {
  current = status;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePipStatus(): PipStatus {
  return useSyncExternalStore(subscribe, () => current);
}

// a screen's status while it's mounted, cleared when it goes
export function usePublishPipStatus(status: PipStatus): void {
  const key = JSON.stringify(status);
  useEffect(() => {
    setPipStatus(status);
  }, [key]);
  useEffect(() => () => setPipStatus(null), []);
}


// discord's layout modes (the sdk's LayoutModeTypeObject): 1 the corner window, 2 a call grid's tile
const LAYOUT_PIP = 1;
const LAYOUT_GRID = 2;
// a window this small is the corner one even without the sdk's word (a platform that doesn't send it)
const SMALL_WIDTH = 420;
const SMALL_HEIGHT = 300;

export type LayoutSubscriber = (listener: (layoutMode: number) => void) => (() => void) | null;


// whether the Activity is shown small: Discord's layout mode when it sends one, the window's size otherwise
export function useCompactLayout(subscribeLayout: LayoutSubscriber | null): boolean {
  const [ layoutMode, setLayoutMode ] = useState<number | null>(null);
  const [ small, setSmall ] = useState(() => isSmallWindow());
  useEffect(() => {
    const onResize = () => setSmall(isSmallWindow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    if (!subscribeLayout) {
      return;
    }
    return subscribeLayout(setLayoutMode) ?? undefined;
  }, [subscribeLayout]);
  if (layoutMode === LAYOUT_PIP || layoutMode === LAYOUT_GRID) {
    return true;
  }
  // focused (0) says it's the full view whatever the size
  return layoutMode !== 0 && small;
}

function isSmallWindow(): boolean {
  return window.innerWidth <= SMALL_WIDTH && window.innerHeight <= SMALL_HEIGHT;
}


export function PipView() {
  const { t, plural } = useI18n();
  const status = usePipStatus();
  return (
    <div className='fixed inset-0 z-[150] flex flex-col overflow-hidden bg-bg text-fg' aria-live='polite'>
      {(status?.kind === 'editor') ? (
        <>
          {(status.previewUrl) ? (
            (status.previewIsVideo) ? (
              <video src={status.previewUrl} autoPlay loop muted playsInline className='absolute inset-0 size-full object-contain'/>
            ) : (
              <img src={status.previewUrl} alt='' className='absolute inset-0 size-full object-contain'/>
            )
          ) : (
            <div className='absolute inset-0 flex items-center justify-center'>
              <Wand2 aria-hidden className='size-10 text-brand-text/60'/>
            </div>
          )}
          <PipBar
            icon={<Wand2 aria-hidden className='size-3.5 shrink-0 text-brand-text'/>}
            title={status.title}
            detail={[
              (status.watching) ? t('editor.pip.watching') : t('editor.pip.editing'),
              (status.people > 1) ? plural('editor.pip.people', status.people) : null,
            ]}
          />
        </>
      ) : (status?.kind === 'game') ? (
        <>
          {(status.flagUrl && (status.phase === 'round' || status.phase === 'reveal')) ? (
            <img src={status.flagUrl} alt='' className='absolute inset-0 m-auto max-h-[70%] max-w-[85%] object-contain drop-shadow'/>
          ) : (
            <div className='absolute inset-0 flex items-center justify-center'>
              <Flag aria-hidden className='size-10 text-success-text/60'/>
            </div>
          )}
          <PipBar
            icon={<Flag aria-hidden className='size-3.5 shrink-0 text-success-text'/>}
            title={status.title}
            detail={[
              (status.phase === 'lobby') ? t('editor.pip.game_lobby')
                : (status.phase === 'finished') ? t('editor.pip.game_over')
                : (status.round) ? t('editor.pip.game_round', {number: status.round.number, total: status.round.total}) : null,
              (status.watching) ? t('editor.pip.watching')
                : (status.score !== null) ? plural('editor.pip.points', status.score) : null,
              (status.rank !== null && !status.watching && status.phase !== 'lobby' && (status.score ?? 0) > 0) ? t('editor.pip.rank', {rank: status.rank, total: status.players}) : null,
            ]}
          />
        </>
      ) : (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center'>
          <img src={notSoLogo} alt='' className='size-10'/>
          <span className='text-sm font-semibold text-white'>NotSoBot</span>
          <span className='text-xs text-muted'>{t('editor.pip.idle')}</span>
        </div>
      )}
    </div>
  );
}


function PipBar({ icon, title, detail }: {icon: ReactNode, title: string, detail: Array<string | null>}) {
  const shown = detail.filter((part): part is string => Boolean(part));
  return (
    <div className='absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-2.5 pt-6 pb-2'>
      <span className='flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white'>
        {icon}<span className='truncate'>{title}</span>
      </span>
      {(shown.length) ? (
        <span className='truncate text-xs text-white/75'>
          {shown.join(' • ')}
        </span>
      ) : null}
    </div>
  );
}
