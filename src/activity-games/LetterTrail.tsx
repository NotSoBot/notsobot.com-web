import { Delete, Eye, SendHorizontal, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react';

import { useI18n } from '@/i18n';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

import type { FlagGameConnection, GameSnapshot, WordResult } from './connection';
import { playerOf, rankedPlayers, useServerNow } from './hooks';
import { findTrail, longEnough, tileFace, touching, wordOf, wordPoints } from './letterTrailBoard';
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


function upper(word: string): string {
  return word.toUpperCase();
}


// the trail's tiles as the line through them: their centres on a board `size` tiles wide
function trailPoints(path: ReadonlyArray<number>, size: number): string {
  return path.map((index) => `${(index % size) + 0.5},${Math.floor(index / size) + 0.5}`).join(' ');
}


type TrailTone = 'build' | 'hit' | 'miss' | 'show';

// The grid: its tiles (the x2 one marked), the trail lit with a line through it, and a second trail the last answer
// lit (`flash`). Square, its letters sized by its own width. Only the tiles, a parent handles pointers
function BoardGrid({ board, size, bonus, path, tone = 'build', flash, className, gridRef, dim = false, ...handlers }: {
  board: ReadonlyArray<string> | null,
  size: number,
  bonus: number | null,
  path: ReadonlyArray<number>,
  tone?: TrailTone,
  flash?: {path: ReadonlyArray<number>, tone: TrailTone} | null,
  className?: string,
  gridRef?: Ref<HTMLDivElement>,
  dim?: boolean,
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void,
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void,
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
        className={cn('relative grid aspect-square w-full touch-none select-none', dim && 'opacity-60')}
        style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, fontSize: `calc(100cqw / ${size} * 0.44)`, WebkitUserSelect: 'none', WebkitTouchCallout: 'none'}}
        {...handlers}
      >
        {tiles.map((tile, index) => {
          const tileTone = toneOf(index);
          const isBonus = index === bonus;
          return (
            <div key={index} aria-hidden className='p-[4%]'>
              <div
                className={cn(
                  'relative flex size-full items-center justify-center rounded-[18%] border-2 font-display leading-none font-bold transition-colors duration-100',
                  (!tile) && 'border-line bg-surface/60',
                  (tile && !tileTone) && 'border-line-strong bg-surface-3 text-white shadow-[0_3px_0_0_var(--color-deep)]',
                  (tileTone === 'build') && 'border-brand bg-brand text-white',
                  (tileTone === 'show') && 'border-warning bg-warning/25 text-white',
                  (tileTone === 'hit') && 'border-success bg-success text-white',
                  (tileTone === 'miss') && 'border-danger bg-danger/70 text-white',
                  (isBonus && tile && !tileTone) && 'border-warning/80 bg-warning/15',
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
    default: return (word) ? t('games.letters.miss_not_word', {word}) : t('games.letters.miss_not_word_short');
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
  const remaining = Math.min(total, Math.max(0, round.ends_at - now));
  const fraction = remaining / total;
  const seconds = Math.ceil(remaining / 1000);
  const tone = (fraction > 0.34) ? 'brand' : (fraction > 0.15) ? 'warning' : 'danger';
  const over = remaining <= 0;
  const board = round.board;
  const playing = !game.you_watch && Boolean(board) && !countdown && !over;
  const you = snapshot.you;
  const solo = Boolean(game.room.solo);
  const yourCount = Math.max(snapshot.words.length, (you) ? round.counts[you] ?? 0 : 0);

  return (
    <div className='relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 pt-3 pb-[calc(1rem+var(--saib,0px))] lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8'>
      {(countdown) ? <Countdown value={countdown}/> : null}
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
        <TrailPlay connection={connection} snapshot={snapshot} game={game} round={round} playing={playing} over={over}/>
      </div>
      <aside className='flex min-w-0 flex-col gap-4'>
        {(solo) ? null : <CountsList game={game} round={round} you={you} className='hidden lg:flex'/>}
        <FoundList words={snapshot.words}/>
      </aside>
    </div>
  );
}


// the word line, the grid and the buttons under it: everything a pointer or a key changes
function TrailPlay({ connection, snapshot, game, round, playing, over }: {
  connection: FlagGameConnection,
  snapshot: GameSnapshot,
  game: LetterTrailState,
  round: LetterTrailRoundState,
  playing: boolean,
  over: boolean,
}) {
  const { t, plural } = useI18n();
  const board = round.board;
  const size = round.size;
  const [ path, setPathState ] = useState<Array<number>>([]);
  // letters typed on a keyboard (null when the trail is from a pointer), and whether they're on the board at all
  const [ typed, setTypedState ] = useState<string | null>(null);
  const pathRef = useRef<Array<number>>([]);
  const typedRef = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  // a pointer on the grid: which, whether it went on to another tile (a drag), whether it came down on the trail's last
  // tile (a tap there sends it)
  const drag = useRef<{pointerId: number, moved: boolean, onLast: boolean} | null>(null);
  const { result: fresh, lit } = useFreshResult(snapshot.word);
  const lastShake = useRef(0);

  const setPath = (next: Array<number>) => {
    pathRef.current = next;
    setPathState(next);
  };
  const setTyped = (next: string | null) => {
    typedRef.current = next;
    setTypedState(next);
  };
  const clear = () => {
    setPath([]);
    setTyped(null);
  };

  // nothing to play once it's over (or for a watcher)
  useEffect(() => {
    if (!playing) {
      drag.current = null;
      pathRef.current = [];
      typedRef.current = null;
      setPathState([]);
      setTypedState(null);
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

  // sends the trail (or says why not): too short and already yours are known here, the api says the rest
  const submit = (trail: Array<number>) => {
    if (!board || !playing || !trail.length) {
      return;
    }
    const word = wordOf(board, trail);
    if (!longEnough(word)) {
      connection.localMiss(trail, word, 'short');
      clear();
      return;
    }
    if (snapshot.words.some((entry) => entry.word === word)) {
      connection.localMiss(trail, word, 'repeat');
      clear();
      return;
    }
    // not sent (a moment after the last one, or the socket's reconnecting): the trail stays to send again
    if (connection.word(trail)) {
      clear();
    }
  };

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
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // a pointer that's already gone: its moves just won't follow it off the grid
    }
    // a typed word gives way to the pointer, its trail stays to go on from
    setTyped(null);
    const current = pathRef.current;
    const last = current[current.length - 1];
    const onLast = last === tile;
    if (!onLast) {
      setPath((last !== undefined && !current.includes(tile) && touching(last, tile, size)) ? [...current, tile] : [tile]);
    }
    drag.current = {pointerId: event.pointerId, moved: false, onLast};
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = drag.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }
    const tile = tileAt(event, true);
    const current = pathRef.current;
    const last = current[current.length - 1];
    if (tile === null || tile === last) {
      return;
    }
    if (2 <= current.length && tile === current[current.length - 2]) {
      // back onto the tile before: that step's undone
      pointer.moved = true;
      setPath(current.slice(0, -1));
    } else if (last !== undefined && !current.includes(tile) && touching(last, tile, size)) {
      pointer.moved = true;
      setPath([...current, tile]);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = drag.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    const current = pathRef.current;
    if (pointer.moved) {
      // a drag sends as it's let go, one dragged back to where it started is nothing
      if (current.length <= 1) {
        clear();
      } else {
        submit(current);
      }
    } else if (pointer.onLast) {
      // the trail's only tile tapped again lets go of it, a longer trail's last one sends it
      if (current.length <= 1) {
        clear();
      } else {
        submit(current);
      }
    }
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
    }
  };

  // a tap anywhere but the grid and its buttons clears the trail
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (!pathRef.current.length && typedRef.current === null) {
        return;
      }
      if (areaRef.current && event.target instanceof Node && areaRef.current.contains(event.target)) {
        return;
      }
      pathRef.current = [];
      typedRef.current = null;
      setPathState([]);
      setTypedState(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // typing: each letter finds the word so far on the board (keeping the trail shown when it still fits)
  const keys = useRef({submit, clear});
  keys.current = {submit, clear};
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
        const next = (typedRef.current ?? '') + key.toLowerCase();
        const trail = findTrail(board, size, next, pathRef.current);
        setTyped(next);
        setPath(trail ?? []);
      } else if (key === 'Backspace') {
        event.preventDefault();
        const current = typedRef.current;
        if (current) {
          const next = current.slice(0, -1);
          setTyped((next) ? next : null);
          setPath((next) ? findTrail(board, size, next, pathRef.current) ?? [] : []);
        } else if (pathRef.current.length) {
          setPath(pathRef.current.slice(0, -1));
        }
      } else if (key === 'Enter') {
        event.preventDefault();
        const current = typedRef.current;
        if (current && !pathRef.current.length) {
          // letters that aren't on the board: said, never sent
          connection.localMiss([], current, 'board');
          keys.current.clear();
        } else if (pathRef.current.length) {
          keys.current.submit(pathRef.current);
        }
      } else if (key === 'Escape') {
        keys.current.clear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, board, size, connection]);

  const building = (board && path.length) ? wordOf(board, path) : '';
  const offBoard = typed !== null && !path.length;
  const throughBonus = round.bonus !== null && path.includes(round.bonus);
  const preview = (longEnough(building)) ? wordPoints(building.length) * ((throughBonus) ? 2 : 1) : 0;
  const flash = (fresh?.path?.length && lit) ? {path: fresh.path, tone: (fresh.ok) ? 'hit' as const : 'miss' as const} : null;

  return (
    <div ref={areaRef} className='flex flex-col items-center gap-3'>
      {/* the answers, read out (the word line below changes with every tile) */}
      <p aria-live='polite' className='sr-only'>
        {(fresh) ? ((fresh.ok) ? t('games.letters.hit', {word: upper(fresh.word ?? ''), points: fresh.points ?? 0}) : missText(fresh, t)) : ''}
      </p>
      {/* the word line: the word being built, or the last answer, or how to play. Always this tall */}
      <div aria-hidden={Boolean(fresh) && !building && !offBoard} className='flex h-12 w-full items-center justify-center text-center'>
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
          <span className='text-sm text-subtle'>{(over) ? t('games.letters.times_up') : t('games.letters.how_hint')}</span>
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
          dim={over}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
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
            disabled={!path.length && typed === null}
            onClick={() => {
              if (pathRef.current.length > 1 && typedRef.current === null) {
                setPath(pathRef.current.slice(0, -1));
              } else {
                clear();
              }
            }}
            className='btn btn-secondary h-12 rounded-xl px-4'
          >
            {(path.length > 1 && typed === null) ? <Delete aria-hidden className='size-4'/> : <X aria-hidden className='size-4'/>}
          </button>
          <button
            type='button'
            disabled={!playing || !longEnough(building)}
            onClick={() => submit(pathRef.current)}
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
  const [ nexted, setNexted ] = useState(false);
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
    <div className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-3 lg:grid lg:pb-[calc(1rem+var(--saib,0px))] lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8'>
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
              disabled={nexted}
              onClick={() => {
                if (connection.next()) {
                  setNexted(true);
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
