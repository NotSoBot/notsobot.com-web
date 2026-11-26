import { useState } from 'react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { FlagGameConnection, GameSnapshot } from './connection';
import { playerOf, useLocalNow } from './hooks';
import { FlagImage, PlayerFace, ScoresList, ScoresStrip, TimeBar } from './parts';
import { REVEAL_MS, type GameReveal, type GameState } from './protocol';


// Between flags: what it was, who got it and for how much, and a short bar until the next one (or the final scores)
export function Reveal({ connection, snapshot, game, reveal }: {connection: FlagGameConnection, snapshot: GameSnapshot, game: GameState, reveal: GameReveal}) {
  const { t } = useI18n();
  const round = game.round;
  // the api's `reveal.ends_at` (on its clock, with the skew), else REVEAL_MS after this showed (the parent keys this by round)
  const [ shownAt ] = useState(() => Date.now());
  const now = useLocalNow(true);
  const endsAt = reveal.ends_at ?? reveal.until;
  const fraction = (endsAt) ? (endsAt - (now + snapshot.skew)) / REVEAL_MS : 1 - (now - shownAt) / REVEAL_MS;
  const last = Boolean(round && round.number >= round.total);
  const you = snapshot.you;
  const yours = reveal.solved.find((entry) => entry.user_id === you) ?? null;
  const solvedIds = new Set(reveal.solved.map((entry) => entry.user_id));
  const missed = game.players.filter((player) => !solvedIds.has(player.user_id) && player.connected);

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-3 pb-[calc(1rem+var(--saib,0px))] lg:grid lg:grid-cols-[1fr_16rem] lg:items-start lg:gap-8'>
      <div className='flex min-w-0 flex-col gap-4'>
        <ScoresStrip game={game} you={you}/>
        <div className='flex flex-col items-center gap-1 text-center'>
          {(round) ? <span className='text-xs text-subtle'>{t('games.flag.round', {number: round.number, total: round.total})}</span> : null}
          <span className='section-label'>{t('games.flag.reveal_was')}</span>
          <h2 className='font-display text-3xl font-bold text-white sm:text-4xl'>{reveal.name}</h2>
        </div>
        {(round) ? <FlagImage connection={connection} flagUrl={round.flag_url} alt={reveal.name} className='h-[clamp(6rem,22dvh,14rem)]'/> : null}
        <p
          role='status'
          className={cn(
            'rounded-xl px-4 py-2.5 text-center text-sm font-semibold',
            (yours) ? 'bg-success/15 text-success-text' : 'bg-surface text-muted',
          )}
        >
          {(yours) ? t('games.flag.reveal_you_got', {points: yours.points}) : t('games.flag.reveal_you_missed')}
        </p>

        <section aria-labelledby='flag-reveal-solved' className='flex flex-col gap-2'>
          <h3 id='flag-reveal-solved' className='section-label'>{t('games.flag.reveal_got_it')}</h3>
          {(reveal.solved.length) ? (
            <ol className='flex flex-col gap-1'>
              {reveal.solved.map((entry, index) => {
                const player = playerOf(game, entry.user_id);
                return (
                  <li key={entry.user_id} className='flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm'>
                    <span className='w-4 text-xs text-subtle tabular-nums'>{index + 1}</span>
                    {(player) ? <PlayerFace player={player} className='size-6'/> : null}
                    <span className='min-w-0 flex-1 truncate text-fg'>{player?.username ?? entry.user_id}</span>
                    <span className='font-bold text-success-text tabular-nums'>+{entry.points}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className='text-sm text-subtle'>{t('games.flag.reveal_nobody')}</p>
          )}
          {(missed.length && reveal.solved.length) ? (
            <div className='flex flex-wrap items-center gap-1.5 pt-1 text-xs text-subtle'>
              <span>{t('games.flag.reveal_missed')}</span>
              {missed.map((player) => (
                <span key={player.user_id} className='inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5'>
                  <PlayerFace player={player} className='size-4'/>{player.username}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className='mt-auto flex flex-col gap-1.5 pt-2'>
          <TimeBar fraction={fraction} tone='muted' label={(last) ? t('games.flag.reveal_final_next') : t('games.flag.reveal_next')}/>
          <span className='text-center text-xs text-subtle'>{(last) ? t('games.flag.reveal_final_next') : t('games.flag.reveal_next')}</span>
        </div>
      </div>
      <ScoresList game={game} you={you} className='hidden lg:flex'/>
    </div>
  );
}
