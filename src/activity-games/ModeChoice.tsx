import { ChevronRight, Gamepad2, UserCog, Wand2, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { GuildIcon } from '@/components/ui/GuildIcon';
import { Spinner } from '@/components/ui/Spinner';
import { MemberAvatar } from '@/editor/components/LobbyPeople';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { SettingsButton } from './ActivitySettings';
import { gameInfo } from './catalog';
import {
  JOIN_TARGETS_SHOWN,
  joinTargetKey,
  useEditingCount,
  useGameRoomCounts,
  useJoinTargets,
  type ActivityFeed,
  type JoinTarget,
} from './counts';
import type { GameRoomsApi } from './rooms';


// What the Activity opens on (after sign-in) from Discord's app launcher: the media editor or the flag game. Launches
// with media or a template skip it for a new edit, `/editor` for the editor's rooms and `/games` for the game rooms
// (src/editor/hosts/activityLaunch.ts). Everyone in the activity picks for themselves and can come back here any time.
// `notice`: why they're here instead (a room invite that couldn't be opened). Each card says what's going on in it here,
// live (./counts): how many people are editing, how many games are being played. Under the two: `onYourSettings`, their
// own dashboard pages (./user), for everyone signed in (dms too); `server`, the server's settings (./server), once it's
// known they can change something there (never in a dm). Above the two, `onJoin`: the others here who are in a room (a
// lobby they edit, a game room), each with a Join straight into it, so a Join on someone's launch message finds them
// (`first`: whose message it was, when the launch says, their room goes first).
// A password room still asks for its password on the way in (its list opens, saying so)
export function ModeChoice({ api, room, onEdit, onGame, onJoin, first, onYourSettings, server, notice }: {
  api: GameRoomsApi,
  room: ActivityFeed,
  onEdit: () => void,
  onGame: () => void,
  onJoin?: ((target: JoinTarget) => Promise<void> | void) | null,
  first?: string | null,
  onYourSettings?: (() => void) | null,
  server?: {guild: {id: string, name: string, icon: string | null}, onOpen: () => void} | null,
  notice?: string | null,
}) {
  const { t, plural } = useI18n();
  const editing = useEditingCount(room);
  const games = useGameRoomCounts(api, room, null);
  const targets = useJoinTargets(room, first ?? null).slice(0, JOIN_TARGETS_SHOWN);
  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-3xl flex-col justify-center gap-6 px-4 py-8'>
      <header className='flex flex-col gap-2'>
        {/* the settings' gear sits on the title's line, out of the way of the two choices */}
        <div className='flex items-start justify-between gap-3'>
          <h1 className='font-display text-3xl font-semibold text-white sm:text-4xl'>{t('games.choice.title')}</h1>
          <SettingsButton className='-mr-2 shrink-0'/>
        </div>
        <p className='text-muted'>{t('games.choice.description')}</p>
      </header>
      {(notice) ? <p role='status' className='rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-text'>{notice}</p> : null}
      {(onJoin && targets.length) ? <JoinRows targets={targets} onJoin={onJoin}/> : null}
      <div className='grid gap-3 sm:grid-cols-2'>
        <ChoiceCard
          icon={Wand2}
          accent='bg-surface-3 text-fg'
          title={t('games.choice.edit_title')}
          description={t('games.choice.edit_description')}
          status={(editing === null) ? null : (editing) ? plural('games.choice.editing', editing) : t('games.choice.editing_none')}
          live={Boolean(editing)}
          onClick={onEdit}
        />
        <ChoiceCard
          icon={Gamepad2}
          accent='bg-surface-3 text-fg'
          title={t('games.choice.games_title')}
          description={t('games.choice.games_description')}
          status={(games === null) ? null : (games.playing) ? plural('games.choice.playing', games.playing) : t('games.choice.playing_none')}
          live={Boolean(games?.playing)}
          onClick={onGame}
        />
      </div>
      {/* nothing to space out when there's neither */}
      <div className='flex flex-col gap-2 empty:hidden'>
        {(onYourSettings) ? (
          <SettingsRow
            media={(
              <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-fg'>
                <UserCog aria-hidden className='size-5'/>
              </span>
            )}
            title={t('activity.user.title')}
            description={t('activity.user.description')}
            onClick={onYourSettings}
          />
        ) : null}
        {(server) ? (
          <SettingsRow
            media={<GuildIcon guild={server.guild} size={40} className='size-10 rounded-xl text-xs'/>}
            title={t('activity.server.title')}
            description={t('activity.server.description', {server: server.guild.name})}
            onClick={server.onOpen}
          />
        ) : null}
      </div>
    </div>
  );
}


function ChoiceCard({ icon: Icon, accent, title, description, status, live, onClick }: {
  icon: LucideIcon,
  accent: string,
  title: string,
  description: string,
  // what's going on in it here, null until it's known
  status: string | null,
  // someone's in it right now: the status gets a dot
  live: boolean,
  onClick: () => void,
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex min-h-32 w-full items-center gap-4 rounded-2xl border border-line-strong bg-surface p-5 text-left transition-colors hover:border-subtle/50 hover:bg-surface-2 active:bg-surface-3 sm:min-h-44 sm:flex-col sm:items-start'
    >
      <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-xl', accent)}>
        <Icon aria-hidden className='size-7'/>
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='font-display text-xl font-semibold text-white'>{title}</span>
        <span className='text-sm text-muted'>{description}</span>
        {/* always there (blank until the count comes) so the card doesn't grow and shift its text when it does */}
        <span className='flex min-h-5 min-w-0 items-center gap-1.5 truncate text-xs font-medium text-subtle'>
          {(status) ? (
            <>
              {(live) ? <span aria-hidden className='size-1.5 shrink-0 rounded-full bg-success-text'/> : null}
              {status}
            </>
          ) : '\u00a0'}
        </span>
      </span>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 sm:hidden'/>
    </button>
  );
}


// Who's in a room here, a row each: their face, what they're in and a Join. One join at a time, the row's button says
// it's on its way (another tap would race it)
function JoinRows({ targets, onJoin }: {targets: Array<JoinTarget>, onJoin: (target: JoinTarget) => Promise<void> | void}) {
  const { t } = useI18n();
  const [ joining, setJoining ] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const join = (target: JoinTarget) => {
    const key = joinTargetKey(target);
    setJoining(key);
    void Promise.resolve(onJoin(target)).finally(() => {
      // (gone already when the join opened the room)
      if (alive.current) {
        setJoining(null);
      }
    });
  };
  return (
    <section aria-labelledby='mode-choice-join' className='flex flex-col gap-2'>
      <h2 id='mode-choice-join' className='text-sm font-semibold text-muted'>{t('games.choice.join_title')}</h2>
      <ul className='flex flex-col gap-2'>
        {targets.map((target) => {
          const key = joinTargetKey(target);
          const what = (target.kind === 'editor') ? t('games.choice.join_editing') : t('games.choice.join_playing', {game: t(gameInfo(target.game).title)});
          return (
            <li key={key} className='flex items-center gap-3 rounded-2xl border border-line-strong bg-surface p-3'>
              <MemberAvatar member={target.member} className='size-10 shrink-0'/>
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate font-semibold text-white'>{target.member.username}</span>
                <span className='truncate text-sm text-muted'>{what}</span>
              </span>
              <button
                type='button'
                onClick={() => join(target)}
                disabled={joining !== null}
                aria-label={t('games.choice.join_label', {name: target.member.username})}
                className='btn btn-secondary shrink-0'
              >
                {(joining === key) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}{t('games.choice.join')}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


// a smaller choice under the two: a settings screen
function SettingsRow({ media, title, description, onClick }: {media: ReactNode, title: string, description: string, onClick: () => void}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex w-full items-center gap-3 rounded-2xl border border-line-strong bg-surface p-3 text-left transition-colors hover:border-subtle/50 hover:bg-surface-2 active:bg-surface-3'
    >
      {media}
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='font-semibold text-white'>{title}</span>
        <span className='line-clamp-2 text-sm text-muted'>{description}</span>
      </span>
      <ChevronRight aria-hidden className='size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5'/>
    </button>
  );
}
