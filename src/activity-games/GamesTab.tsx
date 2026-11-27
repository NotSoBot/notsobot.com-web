import { ArrowLeft, ChevronRight, Gamepad2, type LucideIcon } from 'lucide-react';

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


// The Activity's Games tab: every game it has (./catalog), each card opening the room browser on that game's rooms.
// A game's card says how many of its rooms are open, being played and how many people are in them, live from
// the Activity's socket like the room list (./counts). Your game points sit above the cards and the server's board under
// them (./GamePoints), fetched when the tab opens and again when a game of theirs adds some
export function GamesTab({ api, room, onGame, onBack }: {
  api: GameRoomsApi,
  room: ActivityFeed,
  onGame: (game: GameKind) => void,
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
      <ul className='grid gap-3 sm:grid-cols-2'>
        {GAMES.map((info) => <GameTabCard key={info.id} api={api} room={room} info={info} onClick={() => onGame(info.id)}/>)}
      </ul>
      <p className='text-xs text-subtle'>{t('games.tab.more_soon')}</p>
      <PointsBoard points={points} failed={failed}/>
    </div>
  );
}


// a game's card with its rooms' counts here. The card is a button, so its How to play sits beside it over the card's
// corner, never inside it
function GameTabCard({ api, room, info, onClick }: {api: GameRoomsApi, room: ActivityFeed, info: GameInfo, onClick: () => void}) {
  const { t, plural } = useI18n();
  const stats = useGameRoomCounts(api, room, info.id);
  return (
    <li className='relative'>
      <GameCard
        icon={info.icon}
        accent={info.accent}
        title={t(info.title)}
        description={t(info.description)}
        stats={(stats) ? [
          plural('games.tab.rooms_open', stats.rooms),
          (stats.playing) ? plural('games.tab.playing', stats.playing) : null,
          (stats.people) ? plural('games.tab.people_in', stats.people) : null,
        ] : []}
        onClick={onClick}
      />
      <HowToPlayButton guide={info.guide} className='absolute top-1 right-1 hover:bg-surface-3'/>
    </li>
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
        {/* always there (blank until the counts come) and one line, so the card doesn't grow and shift its text */}
        <span className='min-h-4 truncate text-xs text-subtle'>{(shown.length) ? shown.join(' • ') : '\u00a0'}</span>
      </span>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5'/>
    </button>
  );
}
