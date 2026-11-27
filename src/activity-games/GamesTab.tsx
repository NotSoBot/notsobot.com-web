import { ArrowLeft, ChevronRight, Gamepad2, LayoutList } from 'lucide-react';

import { HowToPlayButton } from '@/components/guides/GuideSheet';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { SettingsButton } from './ActivitySettings';
import { GAMES, type GameInfo } from './catalog';
import { useGameRoomCounts, type ActivityFeed } from './counts';
import { PointsBoard, YourPoints } from './GamePoints';
import { useGamePoints } from './points';
import type { GameKind } from './protocol';
import type { GameRoomsApi } from './rooms';


// The Activity's Games tab: every game it has (./catalog), each card opening the room browser on that game's rooms, and
// All rooms under them for the browser on every game's (`onGame(null)`).
// A game's card says how many of its rooms are open, being played and how many people are in them, live from
// the Activity's socket like the room list (./counts). Your game points sit above the cards and the server's board under
// them (./GamePoints), fetched when the tab opens and again when a game of theirs adds some
export function GamesTab({ api, room, onGame, onBack }: {
  api: GameRoomsApi,
  room: ActivityFeed,
  // a game's rooms, or every game's (null)
  onGame: (game: GameKind | null) => void,
  onBack: () => void,
}) {
  const { t } = useI18n();
  const { points, failed } = useGamePoints(api);

  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-[calc(1.5rem+var(--saib,0px))]'>
      <div className='flex items-center justify-between gap-2'>
        <button type='button' onClick={onBack} className='-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.choice.back')}
        </button>
        <SettingsButton className='-mr-2'/>
      </div>
      <header className='flex flex-col gap-1'>
        <h1 className='flex items-center gap-2 font-display text-2xl font-bold text-white'>
          <Gamepad2 aria-hidden className='size-6 text-success-text'/>{t('games.tab.title')}
        </h1>
        <p className='text-sm text-muted'>{t('games.tab.description')}</p>
      </header>
      <YourPoints points={points} failed={failed}/>
      <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {GAMES.map((info) => <GameTabCard key={info.id} api={api} room={room} info={info} onClick={() => onGame(info.id)}/>)}
      </ul>
      <AllRoomsRow onClick={() => onGame(null)}/>
      <p className='text-xs text-subtle'>{t('games.tab.more_soon')}</p>
      <PointsBoard points={points} failed={failed}/>
    </div>
  );
}


// the room counts as one line: blank until they come, so the line's there from the start. Rooms and rooms in play (the
// room browser has who's in them)
function useStatsLine(api: GameRoomsApi, room: ActivityFeed, game: GameKind): string {
  const { plural } = useI18n();
  const stats = useGameRoomCounts(api, room, game);
  if (!stats) {
    return '\u00a0';
  }
  return [
    plural('games.tab.rooms_open', stats.rooms),
    (stats.playing) ? plural('games.tab.playing', stats.playing) : null,
  ].filter(Boolean).join(' • ');
}


// A game's card with its rooms' counts here and its How to play. The whole card opens its rooms: the title's button
// stretches over it (`after:`), and How to play sits above that in the card's footer, a button of its own (a button
// can't hold another). `min-w-0` (and the list's `grid-cols-1`): the counts line doesn't wrap, and a grid item sized to it
// widened the page on phones
function GameTabCard({ api, room, info, onClick }: {api: GameRoomsApi, room: ActivityFeed, info: GameInfo, onClick: () => void}) {
  const { t } = useI18n();
  const stats = useStatsLine(api, room, info.id);
  const Icon = info.icon;
  return (
    <li className='group relative flex min-h-28 min-w-0 items-center gap-4 rounded-2xl border border-line-strong bg-surface p-4 transition-colors hover:border-brand hover:bg-surface-2 has-[.card-open:active]:bg-surface-3'>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', info.accent)}>
        <Icon aria-hidden className='size-6'/>
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <h2 className='font-display text-lg font-bold text-white'>
          <button
            type='button'
            onClick={onClick}
            className='card-open text-left outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[""] focus-visible:after:ring-2 focus-visible:after:ring-brand'
          >
            {t(info.title)}
          </button>
        </h2>
        <p className='text-sm text-muted'>{t(info.description)}</p>
        {/* the counts on a line of their own (they didn't fit beside How to play on a phone or in a desktop's two
            columns), then How to play over the card's button */}
        <span className='min-h-4 truncate text-xs text-subtle'>{stats}</span>
        <HowToPlayButton guide={info.guide} labelled className='relative z-10 -mb-2 -ml-2 self-start hover:bg-surface-3'/>
      </div>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5'/>
    </li>
  );
}


// every game's rooms in one browser: this server's and the global ones, any game. No counts: the cards' are this
// server's only, and a line of them here would read as the global ones too
function AllRoomsRow({ onClick }: {onClick: () => void}) {
  const { t } = useI18n();
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-3 text-left transition-colors hover:border-brand hover:bg-surface-2 active:bg-surface-3'
    >
      <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-fg'>
        <LayoutList aria-hidden className='size-5'/>
      </span>
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='font-semibold text-white'>{t('games.tab.all_rooms')}</span>
        <span className='truncate text-xs text-subtle'>{t('games.tab.all_rooms_description')}</span>
      </span>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5'/>
    </button>
  );
}
