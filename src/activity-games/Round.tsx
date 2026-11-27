import { Check, Eye, Lightbulb, MapPin, SendHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/i18n';
import { cn, NO_AUTOFILL } from '@/lib/utils';

import { answerState } from './answerState';
import type { FlagGameConnection, GameSnapshot } from './connection';
import { playerOf, useServerNow } from './hooks';
import { FlagImage, PlayerFace, ScoresList, ScoresStrip, TimeBar } from './parts';
import { GUESS_MAX_LENGTH, type AnyGameState, type GameRound, type GameState } from './protocol';


// what a solve is worth before the first-solver and streak bonuses: 3 with no hint showing, 2 once the region shows, 1
// once the letters do (the api decides, this is only what's shown)
function stagePoints(round: GameRound): number {
  return (round.hint?.letters) ? 1 : (round.hint?.region) ? 2 : 3;
}


// A flag on the clock: the flag, the time left (the api's clock), hints as they unlock, the guess box or the four
// choices, and who's solved it so far. A game's first flag in a room for more than one starts a few seconds after Start:
// until `started_at` (the api's clock, so everyone's "3, 2, 1" ends together) a big countdown covers the round, with
// its clock full and no answer box (the api sends the flag and the choices once it's started)
export function Round({ connection, snapshot, game, round }: {connection: FlagGameConnection, snapshot: GameSnapshot, game: GameState, round: GameRound}) {
  const { t, plural } = useI18n();
  const now = useServerNow(connection, true);
  const total = Math.max(1, round.ends_at - round.started_at);
  const countdown = (now < round.started_at) ? Math.ceil((round.started_at - now) / 1000) : 0;
  const remaining = Math.min(total, Math.max(0, round.ends_at - now));
  const fraction = remaining / total;
  const seconds = Math.ceil(remaining / 1000);
  const tone = (fraction > 0.34) ? 'brand' : (fraction > 0.15) ? 'warning' : 'danger';
  const you = snapshot.you;
  const connected = game.players.filter((player) => player.connected).length;
  const answer = answerState(game, round, snapshot, countdown);
  const answerArea = (() => {
    switch (answer.kind) {
      case 'watching':
        return <WatchingPanel connection={connection} game={game}/>;
      case 'countdown':
      case 'waiting_flag':
        // nothing to answer yet: the box's room (the four choices' in choices mode), so the round doesn't move at Go
        return <div aria-hidden className={(game.settings.mode === 'choices') ? 'h-[10.5rem]' : 'h-[4.625rem]'}/>;
      case 'choosing':
      case 'chosen':
        return <Choices connection={connection} snapshot={snapshot} choices={answer.choices}/>;
      case 'typing':
      case 'solved':
        // one box for both (keyed by the flag), what was typed isn't this flag's on the next one
        return <GuessBox connection={connection} snapshot={snapshot} solved={answer.kind === 'solved'} key={answer.flagUrl}/>;
      default: {
        // a state added to AnswerState has to be drawn here: this stops compiling until it is
        const unknown: never = answer;
        return unknown;
      }
    }
  })();

  return (
    // for anyone reading the page: what the answer area is on, and which flag of the game this is
    <div
      className='relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 pt-3 pb-[calc(1rem+var(--saib,0px))] lg:grid lg:grid-cols-[1fr_16rem] lg:items-start lg:gap-8'
      data-state={answer.kind}
      data-round={round.number}
    >
      {(countdown) ? <Countdown value={countdown}/> : null}
      <div className='flex min-w-0 flex-col gap-3'>
        <ScoresStrip game={game} you={you} answeredIds={snapshot.answeredIds}/>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-white'>{t('games.flag.round', {number: round.number, total: round.total})}</span>
          <span className='rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted'>{plural('games.flag.worth', stagePoints(round))}</span>
          <span
            aria-label={plural('games.flag.seconds_left', seconds)}
            className={cn('ml-auto min-w-10 text-right font-mono text-lg font-bold tabular-nums', (tone === 'danger') ? 'text-danger-text' : (tone === 'warning') ? 'text-warning' : 'text-white')}
          >
            {seconds}s
          </span>
        </div>
        <TimeBar fraction={fraction} tone={tone} label={t('games.flag.time_left')}/>

        <FlagImage connection={connection} flagUrl={round.flag_url} className='h-[clamp(8rem,30dvh,20rem)] py-1'/>

        <Hints round={round}/>

        {answerArea}

        <SolvedFeed snapshot={snapshot} game={game} round={round} connected={connected}/>
      </div>
      <ScoresList game={game} you={you} answeredIds={snapshot.answeredIds} className='hidden lg:flex'/>
    </div>
  );
}


// the start countdown over the whole round, its number as big as it gets: each one pops in (keyed, so the animation
// runs again), read out once per number
export function Countdown({ value }: {value: number}) {
  const { t } = useI18n();
  return (
    <div className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-bg/80 backdrop-blur-sm'>
      <span className='text-sm font-semibold tracking-wide text-muted uppercase'>{t('games.flag.countdown_title')}</span>
      <span
        key={value}
        role='timer'
        aria-live='assertive'
        className='font-display text-[clamp(6rem,30dvh,12rem)] leading-none font-bold text-white tabular-nums motion-safe:animate-flag-countdown'
      >
        {value}
      </span>
    </div>
  );
}


// a watcher's place for the answer box: they see the flag and the hints, and can join in when the room lets them
export function WatchingPanel({ connection, game }: {connection: FlagGameConnection, game: AnyGameState}) {
  const { t } = useI18n();
  return (
    <div role='status' className='flex min-h-14 flex-wrap items-center justify-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-2 text-center text-sm text-muted'>
      <span className='inline-flex items-center gap-1.5'><Eye aria-hidden className='size-4'/>{t('games.rooms.watching')}</span>
      {(game.can_play) ? (
        <button type='button' className='btn btn-secondary btn-sm' onClick={() => connection.play()}>{t('games.rooms.join_in')}</button>
      ) : null}
    </div>
  );
}


function Hints({ round }: {round: GameRound}) {
  const { t } = useI18n();
  const hint = round.hint;
  if (!hint?.region && !hint?.letters) {
    return <p className='flex min-h-[4.5rem] items-center justify-center text-center text-xs text-subtle'>{t('games.flag.hints_later')}</p>;
  }
  return (
    // room for both chips from the start, so the guess box doesn't move under a finger when one shows up
    <div aria-live='polite' className='flex min-h-[4.5rem] flex-wrap content-center items-center justify-center gap-2'>
      {(hint.region) ? (
        <span className='inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-fg'>
          <MapPin aria-hidden className='size-3.5 text-brand-text'/>
          <span className='text-subtle'>{t('games.flag.hint_region')}</span>
          {hint.region}
        </span>
      ) : null}
      {(hint.letters) ? (
        <span className='inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-fg'>
          <Lightbulb aria-hidden className='size-3.5 text-warning'/>
          <span className='sr-only'>{t('games.flag.hint_letters')}</span>
          <span className='font-mono tracking-wider whitespace-pre'>{hint.letters}</span>
        </span>
      ) : null}
    </div>
  );
}


// `solved`: they've got this flag (`answerState`), the box makes way for what it gave them
function GuessBox({ connection, snapshot, solved }: {connection: FlagGameConnection, snapshot: GameSnapshot, solved: boolean}) {
  const { t } = useI18n();
  const [ text, setText ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const you = snapshot.you;
  const guess = snapshot.guess;
  // a guess isn't sent while the socket's reconnecting (the strip above says it is): what's typed waits in the box
  const connected = snapshot.status === 'open';
  const points = snapshot.feed.find((entry) => entry.user_id === you)?.points ?? null;

  // a wrong guess clears the box for the next one, a close one stays to fix its spelling
  useEffect(() => {
    if (guess?.result === 'wrong' && guess.text !== null) {
      setText((current) => (current.trim() === guess.text) ? '' : current);
    }
  }, [guess]);

  if (solved) {
    return (
      <div role='status' className='flex min-h-14 items-center justify-center gap-2 rounded-xl border border-success/50 bg-success/15 px-4 text-center font-semibold text-success-text'>
        <Check aria-hidden className='size-5'/>
        {(points !== null) ? t('games.flag.solved_you_points', {points}) : t('games.flag.solved_you')}
      </div>
    );
  }

  const submit = () => {
    const value = text.trim();
    if (!value || !connected) {
      return;
    }
    connection.guess(value.slice(0, GUESS_MAX_LENGTH));
  };
  const invalid = guess !== null && guess.result !== 'correct';

  return (
    <div className='flex flex-col gap-1.5'>
      <form
        className='flex gap-2'
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          {...NO_AUTOFILL}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={GUESS_MAX_LENGTH}
          placeholder={t('games.flag.guess_placeholder')}
          aria-label={t('games.flag.guess_placeholder')}
          aria-invalid={invalid}
          aria-describedby='flag-guess-feedback'
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='words'
          spellCheck={false}
          enterKeyHint='send'
          autoFocus
          className='input h-12 flex-1 rounded-xl text-base'
        />
        <button
          type='submit'
          // a tap on it keeps the keyboard up (the field keeps focus)
          onPointerDown={(event) => event.preventDefault()}
          disabled={!text.trim() || !connected}
          className='btn btn-primary h-12 rounded-xl px-4'
        >
          <SendHorizontal aria-hidden className='size-4'/>
          <span className='max-sm:sr-only'>{t('games.flag.guess')}</span>
        </button>
      </form>
      <p id='flag-guess-feedback' aria-live='polite' className='min-h-5 text-sm'>
        {(guess?.result === 'close') ? (
          <span className='text-warning'>{(guess.text) ? t('games.flag.guess_close', {text: guess.text}) : t('games.flag.guess_close_short')}</span>
        ) : (guess?.result === 'wrong') ? (
          <span key={guess.at} className='text-danger-text'>{(guess.text) ? t('games.flag.guess_wrong', {text: guess.text}) : t('games.flag.guess_wrong_short')}</span>
        ) : (
          <span className='text-subtle'>{t('games.flag.guess_hint')}</span>
        )}
      </p>
    </div>
  );
}


function Choices({ connection, snapshot, choices }: {connection: FlagGameConnection, snapshot: GameSnapshot, choices: Array<string>}) {
  const { t } = useI18n();
  const chosen = snapshot.chosen;
  // a choice isn't sent while the socket's reconnecting
  const connected = snapshot.status === 'open';
  const result = (chosen !== null) ? snapshot.guess?.result ?? null : null;
  const you = snapshot.you;
  const points = snapshot.feed.find((entry) => entry.user_id === you)?.points ?? null;
  return (
    <div className='flex flex-col gap-2'>
      <div role='group' aria-label={t('games.flag.choices')} className='grid grid-cols-2 gap-2'>
        {choices.map((choice, index) => {
          const picked = chosen === index;
          return (
            <button
              key={`${index}:${choice}`}
              type='button'
              disabled={chosen !== null || !connected}
              aria-pressed={picked}
              onClick={() => connection.choose(index)}
              className={cn(
                'flex min-h-16 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-center text-sm leading-snug font-semibold transition-colors',
                (!picked) && 'border-line-strong bg-surface text-fg enabled:hover:border-brand enabled:active:bg-surface-3',
                (picked && result === null) && 'border-brand bg-brand/20 text-white',
                (picked && result === 'correct') && 'border-success bg-success/20 text-white',
                (picked && result !== null && result !== 'correct') && 'border-danger bg-danger/20 text-white',
                (chosen !== null && !picked) && 'opacity-50',
              )}
            >
              {(picked && result === 'correct') ? <Check aria-hidden className='size-4 shrink-0 text-success-text'/> : null}
              {(picked && result !== null && result !== 'correct') ? <X aria-hidden className='size-4 shrink-0 text-danger-text'/> : null}
              {choice}
            </button>
          );
        })}
      </div>
      <p aria-live='polite' className='min-h-5 text-center text-sm'>
        {(result === 'correct') ? (
          <span className='font-semibold text-success-text'>{(points !== null) ? t('games.flag.solved_you_points', {points}) : t('games.flag.solved_you')}</span>
        ) : (result !== null) ? (
          <span className='text-danger-text'>{t('games.flag.choice_wrong')}</span>
        ) : (chosen !== null) ? (
          <span className='text-subtle'>{t('games.flag.choice_sent')}</span>
        ) : (
          <span className='text-subtle'>{t('games.flag.choice_hint')}</span>
        )}
      </p>
    </div>
  );
}


// who solved it, in order, with what they got (the points come with each `solved`, someone who reconnected sees names only)
function SolvedFeed({ snapshot, game, round, connected }: {snapshot: GameSnapshot, game: GameState, round: GameRound, connected: number}) {
  const { t } = useI18n();
  const points = new Map(snapshot.feed.map((entry) => [entry.user_id, entry.points]));
  return (
    <section aria-labelledby='flag-solved' className='flex flex-col gap-2'>
      <div className='flex items-baseline justify-between gap-2'>
        <h2 id='flag-solved' className='section-label'>{t('games.flag.solved_title')}</h2>
        <span className='text-xs text-subtle'>
          {(round.choices)
            ? t('games.flag.answered_count', {count: round.answered, total: connected})
            : t('games.flag.solved_count', {count: round.solved.length, total: connected})}
        </span>
      </div>
      {(round.solved.length) ? (
        <ol aria-live='polite' className='flex flex-col gap-1'>
          {round.solved.map((userId, index) => {
            const player = playerOf(game, userId);
            return (
              <li key={userId} className='flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm'>
                <span className='w-4 text-xs text-subtle tabular-nums'>{index + 1}</span>
                {(player) ? <PlayerFace player={player} className='size-6'/> : null}
                <span className='min-w-0 flex-1 truncate text-fg'>
                  {player?.username ?? userId}
                  {(userId === snapshot.you) ? <span className='text-subtle'> · {t('games.flag.you')}</span> : null}
                </span>
                {(points.has(userId)) ? <span className='font-bold text-success-text tabular-nums'>+{points.get(userId)}</span> : <Check aria-hidden className='size-4 text-success-text'/>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className='text-sm text-subtle'>{t('games.flag.nobody_yet')}</p>
      )}
    </section>
  );
}
