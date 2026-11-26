import { ArrowLeft, ChevronRight, Flag, Gamepad2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { GameRoomsFeed } from './GameRooms';
import type { GameRoomsApi } from './rooms';


// The Activity's Games tab: every game it has, each opening its own rooms. Flag Guesser for now, the next one is a
// card here. A game's card says how many of its rooms are open and how many people are in them, live from the
// Activity's socket like the room list
export function GamesTab({ api, room, onFlagGuesser, onBack }: {
  api: GameRoomsApi,
  room: GameRoomsFeed,
  onFlagGuesser: () => void,
  onBack: () => void,
}) {
  const { t, plural } = useI18n();
  const [ flagStats, setFlagStats ] = useState<{rooms: number, people: number} | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    const refresh = () => {
      api.list().then((result) => {
        if (alive) {
          setFlagStats({
            rooms: result.rooms.length,
            people: result.rooms.reduce((total, item) => total + item.players.length + item.watchers, 0),
          });
        }
      }).catch(() => undefined);
    };
    // a burst of changes is one refetch
    const nudge = () => {
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          refresh();
        }, 800);
      }
    };
    refresh();
    const unsubscribe = room.subscribe((event) => {
      if (event.t === 'game_rooms_changed') {
        nudge();
      }
    });
    const unsubscribeStatus = room.onStatus((status) => {
      if (status === 'open') {
        nudge();
      }
    });
    return () => {
      alive = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      unsubscribe();
      unsubscribeStatus();
    };
  }, [api, room]);

  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-[calc(1.5rem+var(--saib,0px))]'>
      <div className='flex items-center gap-2'>
        <button type='button' onClick={onBack} className='-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
        </button>
      </div>
      <header className='flex flex-col gap-1'>
        <h1 className='flex items-center gap-2 font-display text-2xl font-bold text-white'>
          <Gamepad2 aria-hidden className='size-6 text-success-text'/>{t('games.tab.title')}
        </h1>
        <p className='text-sm text-muted'>{t('games.tab.description')}</p>
      </header>
      <ul className='grid gap-3 sm:grid-cols-2'>
        <li>
          <GameCard
            icon={Flag}
            accent='bg-success/20 text-success-text'
            title={t('games.flag.title')}
            description={t('games.tab.flag_description')}
            stats={(flagStats) ? [
              plural('games.tab.rooms_open', flagStats.rooms),
              (flagStats.people) ? plural('games.tab.people_in', flagStats.people) : null,
            ] : []}
            onClick={onFlagGuesser}
          />
        </li>
      </ul>
      <p className='text-xs text-subtle'>{t('games.tab.more_soon')}</p>
    </div>
  );
}


function GameCard({ icon: Icon, accent, title, description, stats, onClick }: {
  icon: LucideIcon,
  accent: string,
  title: string,
  description: string,
  stats: Array<string | null>,
  onClick: () => void,
}) {
  const shown = stats.filter((part): part is string => Boolean(part));
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex min-h-28 w-full items-center gap-4 rounded-2xl border border-line-strong bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-surface-2 active:bg-surface-3'
    >
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', accent)}>
        <Icon aria-hidden className='size-6'/>
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='font-display text-lg font-bold text-white'>{title}</span>
        <span className='text-sm text-muted'>{description}</span>
        {(shown.length) ? <span className='text-xs text-subtle'>{shown.join(' • ')}</span> : null}
      </span>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5'/>
    </button>
  );
}
