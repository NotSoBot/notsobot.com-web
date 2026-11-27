import { Delete, Eye, SendHorizontal, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react';

import { useI18n } from '@/i18n';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

import type { FlagGameConnection, GameSnapshot, WordResult } from './connection';
import { playerOf, rankedPlayers, useServerNow } from './hooks';
import { findTrail, longEnough, tileFace, tileLetters, wordOf, wordPoints } from './letterTrailBoard';
import { IDLE_TRAIL, trailPath, trailReduce, type Trail, type TrailEvent } from './letterTrailInput';
import { PlayerFace, ScoresList, ScoresStrip, TimeBar } from './parts';
import {
  LETTER_TRAIL_REVEAL_MS,
  type LetterTrailReveal as LetterTrailRevealState,
  type LetterTrailRevealWord,
  type LetterTrailRound as LetterTrailRoundState,
  type LetterTrailState,
  type LetterTrailWord,
} from './protocol';
import { Countdown, WatchingPanel } from './Round';


// Letter Trail's screens (word-game-plan.md): the round (a grid everyone plays at once, words dragged or tapped or typed
// through touching tiles) and the reveal between rounds. The lobby and the final scores are every game's (./Lobby,
// ./Finished)

// a tile joins the trail while dragging once the pointer is this close to its centre (a share of the tile's width):
// a diagonal step passes between two tiles' corners without taking either
const DRAG_HIT = 0.35;
// how long a word's answer lights its tiles
const FLASH_MS = 700;
// a drag whose pointer has said nothing for this long gives way to another pointer coming down: one whose end never
// got here (a webview that dropped it) would otherwise have every later finger ignored as "the second one" until the
// round was over
const DRAG_STALE_MS = 1500;


function upper(word: string): string {
  return word.toUpperCase();
}


// the trail's tiles as the line through them: their centres on a board `size` tiles wide
function trailPoints(path: ReadonlyArray<number>, size: number): string {
  return path.map((index) => `${(index % size) + 0.5},${Math.floor(index / size) + 0.5}`).join(' ');
}


type TrailTone = 'build' | 'hit' | 'miss' | 'show';

// The grid: its tiles (the x2 one marked), the trail lit with a line through it, and a second trail the last answer
// lit (`flash`). Square, its letters sized by its own width. Only the tiles, a parent handles pointers. Each tile says
// which it is, its letters and how it's lit (`data-tile`, `data-letter`, `data-tone`), for a test or an agent to read
function BoardGrid({ board, size, bonus, path, tone = 'build', flash, className, gridRef, dim = false, playable = false, ...handlers }: {
  board: ReadonlyArray<string> | null,
  size: number,
  bonus: number | null,
  path: ReadonlyArray<number>,
  tone?: TrailTone,
  flash?: {path: ReadonlyArray<number>, tone: TrailTone} | null,
  className?: string,
  gridRef?: Ref<HTMLDivElement>,
  dim?: boolean,
  // tiles that can be picked now: a pointer cursor, and an unlit tile shows it's hovered (only where there's hover)
  playable?: boolean,
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onLostPointerCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void,
}) {
  const { t } = useI18n();
  const lit = new Set(path);
  const flashed = new Set(flash?.path ?? []);
  const tiles = board ?? Array.from({length: size * size}, () => '');
  const toneOf = (index: number): TrailTone | null => (lit.has(index)) ? tone : (flashed.has(index) && flash) ? flash.tone : null;
  const line = (path.length > 1) ? {path, tone} : (flash && flash.path.length > 1) ? flash : null;
  // read out as its rows of letters, the x2 tile named
  const rows = (board) ? Array.from({length: size}, (_, row) => tiles.slice(row * size, row * size + size).map(tileFace).join(' ')).join(', ') : '';
  const label = (board) ? [t('games.letters.board', {rows}), (bonus !== null && board[bonus]) ? t('games.letters.bonus_tile', {letter: tileFace(board[bonus])}) : null].filter(Boolean).join('. ') : t('games.letters.board_waiting');
  return (
    <div className={cn('@container w-full', className)}>
      <div
        ref={gridRef}
        role='img'
        aria-label={label}
        className={cn('relative grid aspect-square w-full touch-none select-none', dim && 'opacity-60', playable && 'cursor-pointer')}
        style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, fontSize: `calc(100cqw / ${size} * 0.44)`, WebkitUserSelect: 'none', WebkitTouchCallout: 'none'}}
        {...handlers}
      >
        {tiles.map((tile, index) => {
          const tileTone = toneOf(index);
          const isBonus = index === bonus;
          return (
            <div key={index} aria-hidden className='p-[4%]'>
              <div
                data-tile={index}
                data-letter={(tile) ? tileLetters(tile) : undefined}
                data-tone={tileTone ?? undefined}
                className={cn(
                  'relative flex size-full items-center justify-center rounded-[18%] border-2 font-display leading-none font-bold transition-colors duration-100',
                  (!tile) && 'border-line bg-surface/60',
                  (tile && !tileTone) && 'border-line-strong bg-surface-3 text-white shadow-[0_3px_0_0_var(--color-deep)]',
                  (tileTone === 'build') && 'border-brand bg-brand text-white',
                  (tileTone === 'show') && 'border-warning bg-warning/25 text-white',
                  (tileTone === 'hit') && 'border-success bg-success text-white',
                  (tileTone === 'miss') && 'border-danger bg-danger/70 text-white',
                  (isBonus && tile && !tileTone) && 'border-warning/80 bg-warning/15',
                  (playable && tile && !tileTone) && 'hover:border-brand/70 hover:brightness-125',
                )}
              >
                {/* letters sit above the trail line (z-2 over the svg's z-1), with a dark halo on a lit tile so a white
                    letter stays readable where the line runs through it */}
                <span className={cn('relative z-[2]', tileTone && '[text-shadow:0_0_0.06em_rgb(0_0_0/0.6),0_0_0.16em_rgb(0_0_0/0.35)]')}>{(tile) ? tileFace(tile) : ' '}</span>
                {(isBonus && tile) ? (
                  <span aria-hidden className='absolute top-[6%] right-[8%] z-[2] text-[0.32em] font-bold text-warning'>×2</span>
                ) : null}
              </div>
            </div>
          );
        })}
        {(line) ? (
          <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className='pointer-events-none absolute inset-0 z-[1] size-full'>
            <polyline
              points={trailPoints(line.path, size)}
              fill='none'
              strokeWidth={0.1}
              strokeLinecap='round'
              strokeLinejoin='round'
              className={cn(
                (line.tone === 'hit') ? 'stroke-success-text' : (line.tone === 'miss') ? 'stroke-danger-text' : (line.tone === 'show') ? 'stroke-warning' : 'stroke-white',
              )}
              opacity={0.75}
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}


// how long the word line keeps saying it
const RESULT_MS = 2000;


// the last answer while it's fresh: `lit` for its tiles (FLASH_MS), `result` for the word line (RESULT_MS)
function useFreshResult(result: WordResult | null): {result: WordResult | null, lit: boolean} {
  const [ fresh, setFresh ] = useState<{result: WordResult | null, lit: boolean}>({result: null, lit: false});
  useEffect(() => {
    if (!result) {
      setFresh({result: null, lit: false});
      return;
    }
    const age = Date.now() - result.at;
    setFresh({result: (age < RESULT_MS) ? result : null, lit: age < FLASH_MS});
    const unlit = window.setTimeout(() => setFresh((current) => (current.result === result) ? {...current, lit: false} : current), Math.max(0, FLASH_MS - age));
    const gone = window.setTimeout(() => setFresh((current) => (current.result === result) ? {result: null, lit: false} : current), Math.max(0, RESULT_MS - age));
    return () => {
      window.clearTimeout(unlit);
      window.clearTimeout(gone);
    };
  }, [result]);
  return fresh;
}


// why a word missed, as the word line says it
function missText(result: WordResult, t: ReturnType<typeof useI18n>['t']): string {
  const word = (result.word) ? upper(result.word) : '';
  switch (result.reason) {
    case 'short': return t('games.letters.miss_short');
    case 'path': return t('games.letters.miss_path');
    case 'repeat': return (word) ? t('games.letters.miss_repeat', {word}) : t('games.letters.miss_repeat_short');
    case 'closed': return t('games.letters.miss_closed');
    case 'board': return t('games.letters.miss_board', {word});
    case 'not_word':
    // a reason this page doesn't know (an api newer than it), or none: said as the plainest one
    default: return (word) ? t('games.letters.miss_not_word', {word}) : t('games.letters.miss_not_word_short');
  }
}


// Where a round is for whoever's looking at it: the "3, 2, 1" before a game's first round, the moment after it with no
// board yet (it comes with a `state`), playing, only watching, or its time up (until the api's reveal comes)
type RoundPhase = 'countdown' | 'dealing' | 'playing' | 'watching' | 'over';

// a mouse (or trackpad) rather than a finger: there's a keyboard to type words on, and tiles can show they're hovered
function hasMouse(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
}

// what the word line says when no word's being built and no answer's fresh (with a mouse, that typing works too)
function phaseHint(phase: RoundPhase, t: ReturnType<typeof useI18n>['t'], mouse: boolean): string {
  switch (phase) {
    case 'countdown': return '';
    case 'dealing':
    case 'playing': return t((mouse) ? 'games.letters.how_hint_keys' : 'games.letters.how_hint');
    case 'watching': return t('games.rooms.watching');
    case 'over': return t('games.letters.times_up');
    default: {
      const unknown: never = phase;
      return unknown;
    }
  }
}


// A round: the timer, everyone's word counts, the word being built, the grid and your words. A game's first round in a
// room for more than one counts down first (the board comes with a `state` once it's started). Drag through tiles
// (back onto the last one undoes it), or tap them one by one and tap the last again (or Send); tapping anywhere else
// clears it. On a keyboard, typing finds the word on the board, Enter sends it, Backspace takes a letter off
export function LetterTrailRound({ connection, snapshot, game, round }: {
  connection: FlagGameConnection,
  snapshot: GameSnapshot,
  game: LetterTrailState,
  round: LetterTrailRoundState,
}) {
  const { t, plural } = useI18n();
  const now = useServerNow(connection, true);
  const total = Math.max(1, round.ends_at - round.started_at);
  const countdown = (now < round.started_at) ? Math.ceil((round.started_at - now) / 1000) : 0;
  // its time's up once and stays up: a better sample of the api's clock can put `now` back a moment, which showed
  // "Time's up", emptied the trail and then let them play again. Kept by the end it passed, a round the api made
  // longer isn't over
  const endedAt = useRef<number | null>(null);
  if (round.ends_at <= now) {
    endedAt.current = round.ends_at;
  }
  const over = endedAt.current === round.ends_at;
  const remaining = (over) ? 0 : Math.min(total, Math.max(0, round.ends_at - now));
  const fraction = remaining / total;
  const seconds = Math.ceil(remaining / 1000);
  const tone = (fraction > 0.34) ? 'brand' : (fraction > 0.15) ? 'warning' : 'danger';
  const board = round.board;
  // the one place that says where the round is (`data-phase` on the screen has it too)
  const phase: RoundPhase = (over) ? 'over' : (countdown) ? 'countdown' : (game.you_watch) ? 'watching' : (!board) ? 'dealing' : 'playing';
  const you = snapshot.you;
  const solo = Boolean(game.room.solo);
  const yourCount = Math.max(snapshot.words.length, (you) ? round.counts[you] ?? 0 : 0);

  return (
    <div data-phase={phase} className='relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 pt-3 pb-[calc(1rem+var(--saib,0px))] lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8'>
      {(phase === 'countdown') ? <Countdown value={countdown}/> : null}
      <div className='flex min-w-0 flex-col gap-3'>
        {(solo) ? null : <CountsStrip game={game} round={round} you={you}/>}
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-white'>{t('games.letters.round', {number: round.number, total: round.total})}</span>
          <span className='rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted tabular-nums'>{plural('games.letters.words_found', yourCount)}</span>
          <span
            aria-label={plural('games.flag.seconds_left', seconds)}
            className={cn('ml-auto min-w-10 text-right font-mono text-lg font-bold tabular-nums', (tone === 'danger') ? 'text-danger-text' : (tone === 'warning') ? 'text-warning' : 'text-white')}
          >
            {seconds}s
          </span>
        </div>
        <TimeBar fraction={fraction} tone={tone} label={t('games.flag.time_left')}/>
        <TrailPlay connection={connection} snapshot={snapshot} game={game} round={round} phase={phase}/>
      </div>
      <aside className='flex min-w-0 flex-col gap-4'>
        {(solo) ? null : <CountsList game={game} round={round} you={you} className='hidden lg:flex'/>}
        <FoundList words={snapshot.words}/>
      </aside>
    </div>
  );
}


// the word line, the grid and the buttons under it: everything a pointer or a key changes
function TrailPlay({ connection, snapshot, game, round, phase }: {
  connection: FlagGameConnection,
  snapshot: GameSnapshot,
  game: LetterTrailState,
  round: LetterTrailRoundState,
  phase: RoundPhase,
}) {
  const { t, plural } = useI18n();
  const board = round.board;
  const size = round.size;
  const playing = phase === 'playing';
  // the word being built: nothing, tiles tapped, a drag in progress, or letters typed (./letterTrailInput has every
  // state and what each pointer and key does to it). In a ref too: two events can come before a render
  const [ trail, setTrailState ] = useState<Trail>(IDLE_TRAIL);
  const trailRef = useRef<Trail>(IDLE_TRAIL);
  const gridRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const { result: fresh, lit } = useFreshResult(snapshot.word);
  const lastShake = useRef(0);
  const [ mouse ] = useState(hasMouse);

  // the trail after an event, and the tiles it asks to send (if any)
  const apply = (event: TrailEvent): Array<number> | null => {
    const step = trailReduce(trailRef.current, event, {board: board ?? [], size});
    if (step.trail !== trailRef.current) {
      trailRef.current = step.trail;
      setTrailState(step.trail);
    }
    return step.send;
  };

  // sends the tiles as a word (or says why not): too short and already yours are known here, the api says the rest
  const submit = (tiles: Array<number>) => {
    if (!board || !playing || !tiles.length) {
      return;
    }
    const word = wordOf(board, tiles);
    if (!longEnough(word)) {
      connection.localMiss(tiles, word, 'short');
      apply({type: 'clear'});
      return;
    }
    if (snapshot.words.some((entry) => entry.word === word)) {
      connection.localMiss(tiles, word, 'repeat');
      apply({type: 'clear'});
      return;
    }
    // not sent (a moment after the last one, or the socket's reconnecting): the trail stays to send again
    if (connection.word(tiles)) {
      apply({type: 'clear'});
    }
  };

  // every pointer and key comes through here
  const dispatch = (event: TrailEvent) => {
    const send = apply(event);
    if (send) {
      submit(send);
    }
  };
  // when the dragging pointer last said anything (down or a move), see DRAG_STALE_MS
  const dragSeenRef = useRef(0);
  // and where it was then, to follow its moves along the line between them
  const dragPointRef = useRef<{clientX: number, clientY: number} | null>(null);
  // the latest one, for the listeners set up once
  const act = useRef(dispatch);
  act.current = dispatch;

  // nothing to play once it's over (or for a watcher)
  useEffect(() => {
    if (!playing) {
      act.current({type: 'stop'});
    }
  }, [playing]);

  // a miss shakes the grid and the word line (unless they'd rather nothing moved)
  useEffect(() => {
    const result = snapshot.word;
    if (!result || result.ok || result.at === lastShake.current) {
      return;
    }
    lastShake.current = result.at;
    if (prefersReducedMotion()) {
      return;
    }
    shakeRef.current?.animate?.([
      {transform: 'translateX(0)'},
      {transform: 'translateX(-7px)'},
      {transform: 'translateX(7px)'},
      {transform: 'translateX(-4px)'},
      {transform: 'translateX(3px)'},
      {transform: 'translateX(0)'},
    ], {duration: 380, easing: 'ease-in-out'});
  }, [snapshot.word]);

  // the tile under a pointer: anywhere in its square when it comes down, near its centre while dragging
  const tileAt = (event: {clientX: number, clientY: number}, near: boolean): number | null => {
    const grid = gridRef.current;
    if (!grid) {
      return null;
    }
    const rect = grid.getBoundingClientRect();
    const cell = rect.width / size;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (col < 0 || row < 0 || col >= size || row >= size) {
      return null;
    }
    if (near && Math.hypot(x - (col + 0.5) * cell, y - (row + 0.5) * cell) > cell * DRAG_HIT) {
      return null;
    }
    return row * size + col;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!playing || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    const tile = tileAt(event, false);
    if (tile === null) {
      return;
    }
    const held = trailRef.current;
    if (held.kind === 'dragging' && held.pointerId !== event.pointerId && performance.now() - dragSeenRef.current > DRAG_STALE_MS) {
      dispatch({type: 'cancel', pointerId: held.pointerId});
    }
    const before = trailRef.current;
    dispatch({type: 'down', tile, pointerId: event.pointerId});
    // another finger while one's dragging: the trail's as it was, and this pointer isn't followed
    if (trailRef.current === before) {
      return;
    }
    dragSeenRef.current = performance.now();
    dragPointRef.current = {clientX: event.clientX, clientY: event.clientY};
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // a pointer that's already gone: its moves just won't follow it off the grid
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = trailRef.current;
    if (current.kind !== 'dragging' || current.pointerId !== event.pointerId) {
      return;
    }
    // a mouse with no button down is one whose pointerup never came (let go outside the window): the drag's over,
    // or the trail would go on growing under a hover
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      dispatch({type: 'cancel', pointerId: event.pointerId});
      return;
    }
    dragSeenRef.current = performance.now();
    // every tile on the way from where it was, not only where it is now: a mouse flicked across the grid can move a
    // whole tile between two events, and the tile it jumped over left the next one not touching the trail
    const from = dragPointRef.current;
    const to = {clientX: event.clientX, clientY: event.clientY};
    dragPointRef.current = to;
    const cell = (gridRef.current?.getBoundingClientRect().width ?? 0) / size;
    const steps = (from && cell) ? Math.min(64, Math.ceil(Math.hypot(to.clientX - from.clientX, to.clientY - from.clientY) / (cell / 8))) : 0;
    for (let step = 1; step <= Math.max(1, steps); step++) {
      const at = (from && steps) ? {
        clientX: from.clientX + (to.clientX - from.clientX) * (step / steps),
        clientY: from.clientY + (to.clientY - from.clientY) * (step / steps),
      } : to;
      const tile = tileAt(at, true);
      if (tile !== null) {
        dispatch({type: 'move', tile, pointerId: event.pointerId});
      }
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dispatch({type: 'up', pointerId: event.pointerId});
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    dispatch({type: 'cancel', pointerId: event.pointerId});
  };

  // the grid itself lost the pointer with no pointerup (after one, the drag's already over and this does nothing).
  // Only its own: a finger's first move also sends one up from the tile it came down on, as the capture moves from
  // that tile to the grid
  const onLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      dispatch({type: 'cancel', pointerId: event.pointerId});
    }
  };

  // a tap anywhere but the grid and its buttons clears the trail. And a pointer let go where the grid didn't hear of
  // it ends its drag (the grid's own handler has run by now when it did hear): with a drag left open, every later
  // finger would be the second one
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (areaRef.current && event.target instanceof Node && areaRef.current.contains(event.target)) {
        return;
      }
      act.current({type: 'outsideTap'});
    };
    const onEnd = (event: PointerEvent) => act.current({type: 'cancel', pointerId: event.pointerId});
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);
    };
  }, []);

  // typing: each letter finds the word so far on the board (keeping the trail shown when it still fits)
  useEffect(() => {
    if (!playing || !board) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        return;
      }
      const target = event.target as HTMLElement | null;
      // a field, a dialog over the game, or a focused button's own Enter
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]')) {
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && target?.closest?.('button')) {
        return;
      }
      const key = event.key;
      if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        // a button still focused from a click (How to play once it's closed, the one under the grid) would take the
        // word's Enter for itself: typing takes the focus off it
        const focused = document.activeElement;
        if (trailRef.current.kind !== 'dragging' && focused instanceof HTMLElement && focused.closest('button')) {
          focused.blur();
        }
        act.current({type: 'letter', letter: key.toLowerCase()});
      } else if (key === 'Backspace') {
        event.preventDefault();
        act.current({type: 'backspace'});
      } else if (key === 'Enter') {
        event.preventDefault();
        const current = trailRef.current;
        if (current.kind === 'typed' && !current.path.length) {
          // letters that aren't on the board: said, never sent
          connection.localMiss([], current.letters, 'board');
          act.current({type: 'clear'});
        } else {
          act.current({type: 'enter'});
        }
      } else if (key === 'Escape') {
        act.current({type: 'escape'});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, board, connection]);

  const path = trailPath(trail);
  // letters typed on a keyboard (null when the trail is from a pointer), and whether they're on the board at all
  const typed = (trail.kind === 'typed') ? trail.letters : null;
  const building = (board && path.length) ? wordOf(board, path) : '';
  const offBoard = typed !== null && !path.length;
  const throughBonus = round.bonus !== null && path.includes(round.bonus);
  const preview = (longEnough(building)) ? wordPoints(building.length) * ((throughBonus) ? 2 : 1) : 0;
  const flash = (fresh?.path?.length && lit) ? {path: fresh.path, tone: (fresh.ok) ? 'hit' as const : 'miss' as const} : null;

  return (
    <div ref={areaRef} data-trail={trail.kind} className='flex flex-col items-center gap-3'>
      {/* the answers, read out (the word line below changes with every tile) */}
      <p aria-live='polite' className='sr-only'>
        {(fresh) ? ((fresh.ok) ? t('games.letters.hit', {word: upper(fresh.word ?? ''), points: fresh.points ?? 0}) : missText(fresh, t)) : ''}
      </p>
      {/* the word line: the word being built, or the last answer, or how to play. Always this tall. `data-result` is
          the last answer for as long as it's fresh, shown or under the word being built */}
      <div
        aria-hidden={Boolean(fresh) && !building && !offBoard}
        data-result={(!fresh) ? undefined : (fresh.ok) ? 'hit' : (fresh.reason) ? `miss:${fresh.reason}` : 'miss'}
        className='flex h-12 w-full items-center justify-center text-center'
      >
        {(building || offBoard) ? (
          <span className='flex items-baseline gap-2'>
            <span className={cn('font-display text-3xl font-bold tracking-[0.12em]', (offBoard) ? 'text-danger-text' : 'text-white')}>
              {upper(building || typed || '')}
            </span>
            {(offBoard) ? (
              <span className='text-xs text-danger-text'>{t('games.letters.not_on_board')}</span>
            ) : (preview) ? (
              <span className='text-sm font-semibold text-subtle tabular-nums'>+{preview}</span>
            ) : null}
          </span>
        ) : (fresh) ? (
          (fresh.ok) ? (
            <span key={fresh.at} className='flex items-center gap-2 font-semibold text-success-text motion-safe:animate-letter-pop'>
              <span className='font-display text-2xl tracking-[0.1em]'>{upper(fresh.word ?? '')}</span>
              <span className='tabular-nums'>+{fresh.points}</span>
              {(fresh.bonus) ? <BonusChip/> : null}
            </span>
          ) : (
            <span key={fresh.at} className='text-sm font-semibold text-danger-text'>{missText(fresh, t)}</span>
          )
        ) : (
          <span className='text-sm text-subtle'>{phaseHint(phase, t, mouse)}</span>
        )}
      </div>

      <div ref={shakeRef} className='w-full max-w-[min(100%,30rem,max(14rem,calc(var(--editor-height,100dvh)-21rem)))]'>
        <BoardGrid
          board={board}
          size={size}
          bonus={round.bonus}
          path={path}
          tone={(offBoard) ? 'miss' : 'build'}
          flash={flash}
          gridRef={gridRef}
          dim={phase === 'over'}
          playable={playing}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onLostPointerCapture}
        />
      </div>

      {(game.you_watch) ? (
        <div className='w-full'><WatchingPanel connection={connection} game={game}/></div>
      ) : (
        <div className='grid h-12 w-full max-w-[30rem] grid-cols-[auto_1fr] gap-2'>
          <button
            type='button'
            aria-label={t('games.letters.clear')}
            title={t('games.letters.clear')}
            disabled={trail.kind === 'idle'}
            onClick={() => dispatch({type: 'back'})}
            className='btn btn-secondary h-12 rounded-xl px-4'
          >
            {(path.length > 1 && typed === null) ? <Delete aria-hidden className='size-4'/> : <X aria-hidden className='size-4'/>}
          </button>
          {/* off while the socket's reconnecting too: a word can't go out then, the strip over the game says why */}
          <button
            type='button'
            disabled={!playing || snapshot.status !== 'open' || !longEnough(building)}
            onClick={() => dispatch({type: 'enter'})}
            className='btn btn-primary h-12 rounded-xl'
          >
            <SendHorizontal aria-hidden className='size-4'/>
            {(longEnough(building)) ? t('games.letters.send_word', {word: upper(building)}) : plural('games.letters.send_min', 3)}
          </button>
        </div>
      )}
    </div>
  );
}


function BonusChip({ className }: {className?: string}) {
  const { t } = useI18n();
  return (
    <span title={t('games.letters.bonus_word')} className={cn('inline-flex shrink-0 items-center rounded-full bg-warning/20 px-1.5 text-[0.7rem] font-bold text-warning', className)}>
      ×2<span className='sr-only'> {t('games.letters.bonus_word')}</span>
    </span>
  );
}


// your words this round, newest first, with what each is worth so far (before "only you")
function FoundList({ words }: {words: Array<LetterTrailWord>}) {
  const { t, plural } = useI18n();
  const points = words.reduce((sum, entry) => sum + entry.points, 0);
  return (
    <section aria-labelledby='letters-found' className='flex flex-col gap-2'>
      <div className='flex items-baseline justify-between gap-2'>
        <h2 id='letters-found' className='section-label'>{t('games.letters.found_title')}</h2>
        <span className='text-xs text-subtle tabular-nums'>{plural('games.flag.points', points)}</span>
      </div>
      {(words.length) ? (
        <ol className='flex flex-wrap gap-1.5 lg:max-h-[50dvh] lg:overflow-y-auto'>
          {words.map((entry) => (
            <li key={entry.word} className='inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-sm motion-safe:animate-letter-pop'>
              <span className='font-semibold tracking-wide text-white'>{upper(entry.word)}</span>
              {(entry.bonus) ? <BonusChip/> : null}
              <span className='text-xs font-bold text-success-text tabular-nums'>+{entry.points}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className='text-sm text-subtle'>{t('games.letters.found_none')}</p>
      )}
    </section>
  );
}


// everyone's words so far this round (how many, never which) in a row, in the room's order so nobody hops around.
// `relative` for the same reason as ScoresStrip's: its sr-only text stays inside the scroll
function CountsStrip({ game, round, you }: {game: LetterTrailState, round: LetterTrailRoundState, you: string | null}) {
  const { t, plural } = useI18n();
  return (
    <ul aria-label={t('games.letters.counts')} className='relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden'>
      {game.players.map((player) => {
        const count = round.counts[player.user_id] ?? 0;
        return (
          <li key={player.user_id} className={cn('flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface py-1 pr-3 pl-1', (player.user_id === you) && 'ring-1 ring-brand')}>
            <PlayerFace player={player} className='size-6'/>
            <span className={cn('max-w-24 truncate text-xs', (player.connected) ? 'text-fg' : 'text-subtle')}>{player.username}</span>
            <span className='min-w-4 text-center text-xs font-bold text-white tabular-nums' aria-label={plural('games.letters.words_found', count)}>{count}</span>
          </li>
        );
      })}
    </ul>
  );
}


// the same beside the game on wide screens. No scores: a game's score only grows at a round's end, so mid-round it read
// as 0 next to your words' points. The reveal and the finished screen show them
function CountsList({ game, round, you, className }: {game: LetterTrailState, round: LetterTrailRoundState, you: string | null, className?: string}) {
  const { t, plural } = useI18n();
  return (
    <section aria-labelledby='letters-counts' className={cn('flex flex-col gap-2', className)}>
      <h2 id='letters-counts' className='section-label'>{t('games.letters.counts')}</h2>
      <ul className='flex flex-col gap-1'>
        {game.players.map((player) => {
          const count = round.counts[player.user_id] ?? 0;
          return (
            <li key={player.user_id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', (player.user_id === you) ? 'bg-brand/15' : 'bg-surface')}>
              <PlayerFace player={player} className='size-7'/>
              <span className={cn('min-w-0 flex-1 truncate text-sm', (player.connected) ? 'text-fg' : 'text-subtle')}>{player.username}</span>
              <span className='min-w-12 text-right text-sm font-bold text-white tabular-nums'>{plural('games.letters.words_short', count)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


// a word in the reveal: its points, x2 and "only you" marked. Tapping it shows its trail on the board
function RevealWord({ word, active, onPick }: {word: LetterTrailRevealWord, active: boolean, onPick: () => void}) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type='button'
        aria-pressed={active}
        onClick={onPick}
        className={cn(
          'inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-sm transition-colors',
          (active) ? 'border-warning bg-warning/15' : (word.only_you) ? 'border-brand/60 bg-brand/10 hover:border-brand' : 'border-transparent bg-surface-3/60 hover:border-line-strong',
        )}
      >
        <span className='font-semibold tracking-wide text-white'>{upper(word.word)}</span>
        {(word.bonus) ? <BonusChip/> : null}
        {(word.only_you) ? <span className='rounded-full bg-brand/25 px-1.5 text-[0.7rem] font-semibold text-brand-text'>{t('games.letters.only_you')}</span> : null}
        <span className='text-xs font-bold text-success-text tabular-nums'>+{word.points}</span>
      </button>
    </li>
  );
}


// a missed word, as the api may send it (a word, or a word with its points)
function missedWord(entry: unknown): string | null {
  if (typeof entry === 'string') {
    return entry;
  }
  if (entry && typeof entry === 'object' && typeof (entry as {word?: unknown}).word === 'string') {
    return (entry as {word: string}).word;
  }
  return null;
}


// Between rounds: everyone's words side by side (the "only you" ones and the x2 ones marked), the board's longest words
// nobody found, and a bar until the next round. The host can go on now (`next`). Tapping a word lights it on the board
export function LetterTrailReveal({ connection, snapshot, game, reveal }: {
  connection: FlagGameConnection,
  snapshot: GameSnapshot,
  game: LetterTrailState,
  reveal: LetterTrailRevealState,
}) {
  const { t, plural } = useI18n();
  const round = game.round;
  const now = useServerNow(connection, true);
  const [ shownAt ] = useState(() => connection.serverNow());
  const endsAt = reveal.ends_at ?? reveal.until ?? (shownAt + LETTER_TRAIL_REVEAL_MS);
  const fraction = (endsAt - now) / LETTER_TRAIL_REVEAL_MS;
  const last = Boolean(round && round.number >= round.total);
  const you = snapshot.you;
  const isHost = Boolean(you) && game.host_id === you;
  const [ picked, setPicked ] = useState<string | null>(null);
  // the host's Next: sent once, and theirs to press again when it can't have gone through (the api refused something,
  // or the socket dropped). The reveal ends by itself anyway
  const [ next, setNext ] = useState<'idle' | 'sent'>('idle');
  useEffect(() => {
    if (snapshot.error || snapshot.status !== 'open') {
      setNext('idle');
    }
  }, [snapshot.error, snapshot.status]);
  const order = rankedPlayers(game).map((player) => player.user_id);
  // their words, best round first (the game's standings break ties)
  const rows = [...reveal.players].sort((a, b) => b.round_score - a.round_score || order.indexOf(a.user_id) - order.indexOf(b.user_id));
  const yours = reveal.players.find((entry) => entry.user_id === you) ?? null;
  const missed = (reveal.missed as ReadonlyArray<unknown>).map(missedWord).filter((word): word is string => Boolean(word));
  const board = round?.board ?? null;
  const size = round?.size ?? 4;
  const pickedTrail = (board && picked) ? findTrail(board, size, picked) ?? [] : [];
  const pick = (word: string) => setPicked((current) => (current === word) ? null : word);
  const solo = Boolean(game.room.solo);
  const nextLabel = (last) ? t('games.letters.reveal_final_next') : t('games.letters.reveal_next');

  return (
    <div data-phase='reveal' className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-3 lg:grid lg:pb-[calc(1rem+var(--saib,0px))] lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8'>
      <div className='flex min-w-0 flex-col gap-4'>
        {(solo) ? null : <ScoresStrip game={game} you={you}/>}
        <div className='flex flex-col items-center gap-1 text-center'>
          {(round) ? <span className='text-xs text-subtle'>{t('games.letters.round', {number: round.number, total: round.total})}</span> : null}
          <h2 className='font-display text-3xl font-bold text-white'>{t('games.letters.reveal_title')}</h2>
          <p className='text-sm text-muted'>{plural('games.letters.reveal_total', reveal.total_words)}</p>
        </div>
        {(!game.you_watch) ? (
          <p role='status' className={cn('rounded-xl px-4 py-2.5 text-center text-sm font-semibold', (yours?.round_score) ? 'bg-success/15 text-success-text' : 'bg-surface text-muted')}>
            {(yours?.round_score) ? plural('games.letters.reveal_you', yours.words.length, {points: yours.round_score}) : t('games.letters.reveal_you_none')}
          </p>
        ) : null}

        {(board) ? (
          <div className='mx-auto w-full max-w-[11rem] lg:hidden'>
            <BoardGrid board={board} size={size} bonus={round?.bonus ?? null} path={pickedTrail} tone='show'/>
          </div>
        ) : null}

        <section aria-labelledby='letters-reveal-words' className='flex flex-col gap-2'>
          <h3 id='letters-reveal-words' className='section-label'>{t('games.letters.reveal_words')}</h3>
          <ul className='flex flex-col gap-2'>
            {rows.map((entry) => {
              const player = playerOf(game, entry.user_id);
              const words = [...entry.words].sort((a, b) => b.points - a.points || b.word.length - a.word.length || a.word.localeCompare(b.word));
              return (
                <li key={entry.user_id} className={cn('flex flex-col gap-2 rounded-xl p-3', (entry.user_id === you) ? 'bg-brand/10 ring-1 ring-brand/40' : 'bg-surface')}>
                  <div className='flex items-center gap-2'>
                    {(player) ? <PlayerFace player={player} className='size-7'/> : null}
                    <span className='min-w-0 flex-1 truncate text-sm font-semibold text-fg'>
                      {player?.username ?? entry.user_id}
                      {(entry.user_id === you) ? <span className='font-normal text-subtle'> · {t('games.flag.you')}</span> : null}
                    </span>
                    <span className='text-xs text-subtle tabular-nums'>{plural('games.letters.words_short', entry.words.length)}</span>
                    <span className='min-w-10 text-right font-bold text-success-text tabular-nums'>+{entry.round_score}</span>
                  </div>
                  {(words.length) ? (
                    <ul className='flex flex-wrap gap-1.5'>
                      {words.map((word) => <RevealWord key={word.word} word={word} active={picked === word.word} onPick={() => pick(word.word)}/>)}
                    </ul>
                  ) : (
                    <p className='text-xs text-subtle'>{t('games.letters.reveal_no_words')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {(missed.length) ? (
          <section aria-labelledby='letters-reveal-missed' className='flex flex-col gap-2'>
            <h3 id='letters-reveal-missed' className='section-label'>{t('games.letters.reveal_missed')}</h3>
            <ul className='flex flex-wrap gap-1.5'>
              {missed.map((word) => (
                <li key={word}>
                  <button
                    type='button'
                    aria-pressed={picked === word}
                    onClick={() => pick(word)}
                    className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-dashed px-2 py-0.5 text-sm transition-colors', (picked === word) ? 'border-warning bg-warning/15 text-white' : 'border-line-strong text-muted hover:text-fg')}
                  >
                    <span className='font-semibold tracking-wide'>{upper(word)}</span>
                    <span className='text-xs text-subtle tabular-nums'>{word.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* kept in view at the bottom: the words above can run longer than a phone's screen. On a phone the host's button
            is full width under the bar, clear of the home indicator (--saib); on a desktop it sits under the words */}
        <div className='sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col gap-2 border-t border-line bg-bg/95 px-4 pt-2.5 pb-[calc(0.75rem+var(--saib,0px))] backdrop-blur lg:static lg:mx-0 lg:items-center lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none'>
          <span className='text-center text-xs text-subtle'>{nextLabel}</span>
          <TimeBar fraction={fraction} tone='muted' label={nextLabel}/>
          {(isHost) ? (
            <button
              type='button'
              className='btn btn-secondary min-h-11 w-full lg:w-auto'
              disabled={next === 'sent'}
              onClick={() => {
                if (connection.next()) {
                  setNext('sent');
                }
              }}
            >
              <SkipForward aria-hidden className='size-4'/>{(last) ? t('games.letters.next_final') : t('games.letters.next')}
            </button>
          ) : null}
        </div>
      </div>
      <aside className='hidden min-w-0 flex-col gap-4 lg:flex'>
        {(board) ? <BoardGrid board={board} size={size} bonus={round?.bonus ?? null} path={pickedTrail} tone='show'/> : null}
        {(game.you_watch) ? (
          <p className='flex items-center gap-1.5 text-sm text-muted'><Eye aria-hidden className='size-4'/>{t('games.rooms.watching')}</p>
        ) : null}
        <ScoresList game={game} you={you}/>
      </aside>
    </div>
  );
}
