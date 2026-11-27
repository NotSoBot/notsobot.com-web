import { ArrowLeft, Eye, Globe, Lock, Play, Plus, User, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { HowToPlayButton } from '@/components/guides/GuideSheet';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { EditorErrorCodes, type EditorApiError } from '@/editor/api';
import { MemberAvatar } from '@/editor/components/LobbyPeople';
import type { EditorRoom } from '@/editor/room';
import { RoomSettingsFields, roomSettingsReady, type LobbyMode } from '@/editor/components/RoomSettings';
import { PasswordInput } from '@/editor/components/SaveTemplate';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { GAMES, gameInfo } from './catalog';
import {
  GAME_ROOM_SORTS,
  GAME_ROOM_VISIBILITIES,
  GAME_ROOMS_PAGE,
  type GameKind,
  type GameRoomList,
  type GameRoomSort,
  type GameRoomSummary,
  type GameRoomTab,
  type GameRoomVisibility,
} from './protocol';
import type { GameRoomsApi } from './rooms';
import { storedSoloSettings } from './solo';


// the list again this long after the api says a room in this tab changed (`game_rooms_changed`) or the socket came
// back, the changes meanwhile fold into the same fetch. The global tab hears every server's rooms (each round of each
// game is a change), so it waits longer: with many rooms playing that's one fetch every few seconds, not one each 0.8s
const REFRESH_DELAY: Record<GameRoomTab, number> = {server: 800, global: 4000};
// the other tab's count only says how many, it can wait longer and fold more changes
const COUNT_DELAY: Record<GameRoomTab, number> = {server: 3000, global: 10 * 1000};
// typing in the search waits this long before asking
const SEARCH_DELAY = 300;
// a refetch brings back at most this many pages of what was scrolled through, the rest loads again on scroll
const REFRESH_MAX_PAGES = 5;
// a card shows this many faces
const SHOWN_FACES = 6;
// the tab they looked at last, per viewer
const TAB_STORAGE_KEY = 'nsb.activity.games.rooms_tab';
const TABS: ReadonlyArray<GameRoomTab> = GAME_ROOM_VISIBILITIES;


export type RoomMode = Exclude<LobbyMode, 'solo'>;
const ROOM_MODES: ReadonlyArray<LobbyMode> = ['public', 'password'];


// what the list listens to on the Activity's socket (the dev mocks have a stand-in)
export type GameRoomsFeed = Pick<EditorRoom, 'subscribe' | 'onStatus'>;


function storedTab(): GameRoomTab {
  try {
    return (window.localStorage.getItem(TAB_STORAGE_KEY) === 'global') ? 'global' : 'server';
  } catch {
    return 'server';
  }
}

function storeTab(tab: GameRoomTab): void {
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // private windows and blocked storage: it starts on this server's next time
  }
}


interface RoomsQuery {
  tab: GameRoomTab,
  game: GameKind | null,
  q: string,
  sort: GameRoomSort,
}

interface RoomPages {
  // null while the tab's first page loads (a new tab shows placeholders, a new search keeps the old cards dimmed)
  rooms: Array<GameRoomSummary> | null,
  next: string | null,
  loading: boolean,
  error: string | null,
}


// One tab's rooms, a page at a time (`loadMore` on scroll), with both tabs' counts. Live: a change in the tab shown
// refetches what's been scrolled through, a change in the other one only its count (later, a burst is one fetch). No
// polling: fetched on a new query, then again when the socket says a room changed or reconnects, or once it's shown
// again after a change while hidden
function useRoomPages(api: GameRoomsApi, feed: GameRoomsFeed, query: RoomsQuery, errorOf: (error: unknown) => EditorApiError | null, failed: string) {
  const [ pages, setPages ] = useState<RoomPages>({rooms: null, next: null, loading: true, error: null});
  const [ counts, setCounts ] = useState<Record<GameRoomTab, number> | null>(null);
  const [ loadingMore, setLoadingMore ] = useState(false);
  // the first page failed: asked again (the Try again button)
  const [ attempt, setAttempt ] = useState(0);
  // what the listeners and `loadMore` read: only the latest fetch's answer counts (an older one can come back last)
  const live = useRef({generation: 0, pages: 1, next: null as string | null, more: false, query});
  const { tab, game, q, sort } = query;

  useEffect(() => {
    const state = live.current;
    const tabChanged = state.query.tab !== tab;
    state.query = {tab, game, q, sort};
    state.pages = 1;
    state.next = null;
    setPages((current) => ({rooms: (tabChanged) ? null : current.rooms, next: null, loading: true, error: null}));
    let alive = true;
    let refreshTimer: number | null = null;
    let countTimer: number | null = null;
    let stale = false;
    // one refetch at a time: a change during one asks once more after it, never a second chain of pages beside it
    let fetching = false;
    let again = false;

    const fetchPages = async (count: number, generation: number): Promise<GameRoomList & {all: Array<GameRoomSummary>}> => {
      let all: Array<GameRoomSummary> = [];
      let cursor: string | null = null;
      let last: GameRoomList | null = null;
      for (let page = 0; page < count && (page === 0 || cursor); page++) {
        last = await api.list({tab, game, q, sort, cursor, limit: GAME_ROOMS_PAGE});
        all = mergeRooms(all, last.rooms);
        cursor = last.next_cursor;
        if (generation !== state.generation) {
          // nobody's waiting for the rest (a new query, or more was loaded meanwhile)
          break;
        }
      }
      return {...(last as GameRoomList), all, next_cursor: cursor};
    };
    const refresh = () => {
      if (document.visibilityState === 'hidden') {
        stale = true;
        return;
      }
      if (fetching) {
        again = true;
        return;
      }
      stale = false;
      fetching = true;
      const generation = ++state.generation;
      fetchPages(Math.min(state.pages, REFRESH_MAX_PAGES), generation).then((result) => {
        if (alive && generation === state.generation) {
          state.next = result.next_cursor;
          state.pages = Math.max(1, Math.ceil(result.all.length / GAME_ROOMS_PAGE));
          setPages({rooms: result.all, next: result.next_cursor, loading: false, error: null});
          setCounts(result.counts);
        }
      }).catch((failure) => {
        if (alive && generation === state.generation) {
          // a first page that failed stays "not loaded" (with a Try again), it isn't an empty list
          setPages((current) => ({rooms: current.rooms, next: current.next, loading: false, error: errorOf(failure)?.message || failed}));
        }
      }).finally(() => {
        fetching = false;
        if (again && alive) {
          again = false;
          refreshSoon();
        }
      });
    };
    const refreshSoon = () => {
      if (refreshTimer === null) {
        refreshTimer = window.setTimeout(() => {
          refreshTimer = null;
          refresh();
        }, REFRESH_DELAY[tab]);
      }
    };
    // any page has both counts: the other tab's smallest one
    const countSoon = () => {
      if (countTimer === null) {
        countTimer = window.setTimeout(() => {
          countTimer = null;
          const other = (tab === 'server') ? 'global' : 'server';
          api.list({tab: other, game, q, sort, limit: 1}).then((result) => {
            if (alive) {
              setCounts(result.counts);
            }
          }).catch(() => undefined);
        }, COUNT_DELAY[(tab === 'server') ? 'global' : 'server']);
      }
    };
    const onVisible = () => {
      if (stale && document.visibilityState === 'visible') {
        refresh();
      }
    };
    refresh();
    const unsubscribe = feed.subscribe((event) => {
      if (event.t === 'game_rooms_changed') {
        // an older api says no scope: this activity's
        if ((event.scope ?? 'server') === tab) {
          refreshSoon();
        } else {
          countSoon();
        }
      }
    });
    // 'open' comes with each `ready`: back after a reconnect, whatever changed meanwhile wasn't said
    const unsubscribeStatus = feed.onStatus((status) => {
      if (status === 'open') {
        refreshSoon();
      }
    });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      // a page still loading belongs to the old query
      state.generation++;
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      if (countTimer !== null) {
        window.clearTimeout(countTimer);
      }
      unsubscribe();
      unsubscribeStatus();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [api, feed, tab, game, q, sort, errorOf, failed, attempt]);

  const loadMore = useCallback(() => {
    const state = live.current;
    if (!state.next || state.more) {
      return;
    }
    const generation = state.generation;
    const { tab: shownTab, game: shownGame, q: shownQ, sort: shownSort } = state.query;
    state.more = true;
    setLoadingMore(true);
    api.list({tab: shownTab, game: shownGame, q: shownQ, sort: shownSort, cursor: state.next, limit: GAME_ROOMS_PAGE}).then((result) => {
      if (generation === state.generation) {
        state.next = result.next_cursor;
        state.pages += 1;
        setPages((current) => ({...current, rooms: mergeRooms(current.rooms ?? [], result.rooms), next: result.next_cursor}));
        setCounts(result.counts);
      }
    }).catch(() => {
      // the sentinel asks again when it's scrolled to next
    }).finally(() => {
      state.more = false;
      setLoadingMore(false);
    });
  }, [api]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return {...pages, counts, loadingMore, loadMore, retry};
}


// a page after the ones shown: rooms shift between pages while people make and close them, one already shown stays put
function mergeRooms(shown: Array<GameRoomSummary>, page: Array<GameRoomSummary>): Array<GameRoomSummary> {
  const seen = new Set(shown.map((room) => room.id));
  return [...shown, ...page.filter((room) => !seen.has(room.id))];
}


// Every game's rooms, in two tabs: this server's Activity (or this dm's) and the global ones every server's Activity
// lists. Search by name, sort, filter by game, 20 at a time loaded on scroll. Play or watch one (a password one asks for
// it first), make a new one, Quick play into the fullest open lobby (a new one when there's none), or Play solo (a room
// of their own that starts right away, with the settings they last played alone with). `game`: opened from that game's
// card on the Games tab
export function GameRooms({ api, room, errorOf, notice, game: firstGame = null, onOpen, onBack }: {
  api: GameRoomsApi,
  room: GameRoomsFeed,
  errorOf: (error: unknown) => EditorApiError | null,
  // why they're back here (removed, the room closed)
  notice?: string | null,
  game?: GameKind | null,
  onOpen: (gameId: string, watch: boolean) => void,
  onBack: () => void,
}) {
  const { t } = useI18n();
  const [ tab, setTab ] = useState<GameRoomTab>(storedTab);
  const [ game, setGame ] = useState<GameKind | null>(firstGame);
  const [ search, setSearch ] = useState('');
  const [ q, setQ ] = useState('');
  const [ sort, setSort ] = useState<GameRoomSort>('filling');
  const [ creating, setCreating ] = useState(false);
  // Quick play or Play solo with every game shown: which game, asked first
  const [ picking, setPicking ] = useState<'quick' | 'solo' | null>(null);
  // Quick play or Play solo on its way (one at a time), and why the last one failed
  const [ starting, setStarting ] = useState<{busy: 'quick' | 'solo' | null, error: string | null}>({busy: null, error: null});
  // a password room being joined: the room, and whether they asked to watch
  const [ unlocking, setUnlocking ] = useState<{room: GameRoomSummary, watch: boolean} | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // an answer that comes after they left this screen (Back, then the editor or another room) opens nothing
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // the locked room last tapped: an older tap's answer doesn't take them into that one instead
  const probing = useRef<string | null>(null);
  const tabsId = useId();
  const pages = useRoomPages(api, room, {tab, game, q: q.trim(), sort}, errorOf, t('games.rooms.error'));
  const { loadMore } = pages;

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
  }, [search]);

  // the next page once the end of the list is near. made again after each page: an observer only calls on a change,
  // and the sentinel can still be in view after a short page
  const shownCount = pages.rooms?.length ?? 0;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !pages.next || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore();
      }
    }, {rootMargin: '400px 0px'});
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pages.next, shownCount, loadMore]);

  const pickTab = (value: GameRoomTab) => {
    setTab(value);
    storeTab(value);
  };

  const open = (target: GameRoomSummary, watch: boolean) => {
    if (target.locked) {
      // the api lets in whoever gave it already (and its creator) without asking again
      probing.current = target.id;
      api.join(target.id).then(() => {
        if (mounted.current && probing.current === target.id) {
          onOpen(target.id, watch);
        }
      }).catch((failure) => {
        if (!mounted.current || probing.current !== target.id) {
          return;
        }
        const error = errorOf(failure);
        if (!error || error.code === EditorErrorCodes.EDITOR_LOBBY_LOCKED) {
          setUnlocking({room: target, watch});
        } else {
          // removed from it, the room gone: its password wouldn't help
          setStarting({busy: null, error: error.message || t('games.rooms.error')});
        }
      });
      return;
    }
    probing.current = null;
    onOpen(target.id, watch);
  };

  // with every game shown, they pick the game first
  const quickPlay = async (chosen: GameKind | null = game) => {
    if (starting.busy) {
      return;
    }
    if (!chosen) {
      setPicking('quick');
      return;
    }
    setStarting({busy: 'quick', error: null});
    try {
      const result = await api.quick(chosen, tab);
      if (mounted.current) {
        onOpen(result.id, false);
      }
    } catch (failure) {
      if (mounted.current) {
        setStarting({busy: null, error: errorOf(failure)?.message || t('games.rooms.quick_failed')});
      }
    }
  };

  // a room of their own (on no list, nobody else comes in), its game starting as they join
  const playSolo = async (chosen: GameKind | null = game) => {
    if (starting.busy) {
      return;
    }
    if (!chosen) {
      setPicking('solo');
      return;
    }
    setStarting({busy: 'solo', error: null});
    try {
      const created = await api.create({game: chosen, solo: true, settings: storedSoloSettings(chosen), name: null, watch_only: false});
      if (mounted.current) {
        onOpen(created.id, false);
      }
    } catch (failure) {
      if (mounted.current) {
        setStarting({busy: null, error: errorOf(failure)?.message || t('games.rooms.solo_failed')});
      }
    }
  };

  const searching = Boolean(q.trim());

  return (
    <div className='mx-auto flex min-h-[var(--editor-height,100dvh)] w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-[calc(1.5rem+var(--saib,0px))]'>
      {/* New room up here with the way back: the two ways to start playing now get the header's row. How to play carries
          a dot until its guide's been opened, the lobby has the rules too */}
      <div className='flex items-center justify-between gap-2'>
        <button type='button' onClick={onBack} className='-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-fg'>
          <ArrowLeft aria-hidden className='size-4'/>{t('games.tab.title')}
        </button>
        <div className='-mr-1 flex items-center gap-1'>
          <HowToPlayButton guide={gameInfo(game).guide} markUnseen/>
          <button type='button' className='btn btn-secondary btn-sm min-h-10' onClick={() => setCreating(true)}>
            <Plus aria-hidden className='size-4'/>{t('games.rooms.new')}
          </button>
        </div>
      </div>
      <header className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='flex flex-col gap-1'>
          <h1 className='font-display text-2xl font-bold text-white'>{t('games.rooms.title')}</h1>
          <p className='text-sm text-muted'>{t('games.rooms.description')}</p>
        </div>
        <div className='grid shrink-0 grid-cols-2 gap-2 sm:flex'>
          <button type='button' className='btn btn-primary min-w-0' onClick={() => quickPlay()} disabled={starting.busy !== null}>
            {(starting.busy === 'quick') ? <Spinner className='size-4 border-white/40 border-t-white'/> : <Zap aria-hidden className='size-4 shrink-0'/>}
            <span className='truncate'>{t('games.rooms.quick')}</span>
          </button>
          <button type='button' title={t('games.rooms.solo_hint')} className='btn btn-secondary min-w-0' onClick={() => playSolo()} disabled={starting.busy !== null}>
            {(starting.busy === 'solo') ? <Spinner className='size-4'/> : <User aria-hidden className='size-4 shrink-0'/>}
            <span className='truncate'>{t('games.rooms.solo')}</span>
          </button>
        </div>
      </header>

      {(notice) ? <p role='status' className='rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning'>{notice}</p> : null}
      {(starting.error) ? <DialogError>{starting.error}</DialogError> : null}

      <div className='flex flex-col gap-2'>
        <div role='tablist' aria-label={t('games.rooms.tabs')} className='grid grid-cols-2 gap-1 rounded-lg bg-deep p-1'>
          {TABS.map((value) => {
            const Icon = (value === 'global') ? Globe : Users;
            const count = pages.counts?.[value];
            return (
              <button
                key={value}
                id={`${tabsId}-${value}`}
                type='button'
                role='tab'
                aria-selected={tab === value}
                aria-controls={`${tabsId}-panel`}
                onClick={() => pickTab(value)}
                className={cn(
                  'flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors',
                  (tab === value) ? 'bg-surface-3 text-white shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                <Icon aria-hidden className='size-4 shrink-0'/>
                <span className='truncate'>{t(`games.rooms.tab_${value}`)}</span>
                {/* always there (blank until the counts come), so the label doesn't move when they do */}
                <span className='min-w-6 shrink-0 rounded-full bg-bg/60 px-1.5 text-center text-xs tabular-nums text-muted'>
                  {(count === undefined) ? '\u00a0' : count}
                </span>
              </button>
            );
          })}
        </div>
        <SearchInput size='sm' value={search} onValueChange={setSearch} placeholder={t('games.rooms.search')} aria-label={t('games.rooms.search')}/>
        <div className='grid grid-cols-2 gap-2'>
          <label className='min-w-0'>
            <span className='sr-only'>{t('games.rooms.filter_game')}</span>
            <select value={game ?? ''} onChange={(event) => setGame((event.target.value || null) as GameKind | null)} className='input py-1.5'>
              <option value=''>{t('games.rooms.all_games')}</option>
              {GAMES.map((entry) => <option key={entry.id} value={entry.id}>{t(entry.title)}</option>)}
            </select>
          </label>
          <label className='min-w-0'>
            <span className='sr-only'>{t('games.rooms.sort')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as GameRoomSort)} className='input py-1.5'>
              {GAME_ROOM_SORTS.map((value) => <option key={value} value={value}>{t(`games.rooms.sort_${value}`)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div id={`${tabsId}-panel`} role='tabpanel' aria-labelledby={`${tabsId}-${tab}`} aria-busy={pages.loading} className='flex flex-col gap-2'>
        {(pages.error) ? <DialogError>{pages.error}</DialogError> : null}
        {(!pages.rooms && pages.error) ? (
          <div className='flex justify-center py-6'>
            <button type='button' className='btn btn-secondary' onClick={pages.retry}>{t('games.flag.joining_retry')}</button>
          </div>
        ) : (!pages.rooms) ? (
          // as tall as cards, so the first page doesn't push anything around when it comes
          <ul aria-hidden className='flex flex-col gap-2'>
            {[0, 1, 2].map((index) => <li key={index} className='h-[10.25rem] animate-pulse rounded-xl border border-line bg-surface sm:h-[7.25rem]'/>)}
          </ul>
        ) : (pages.rooms.length) ? (
          <>
            <ul className={cn('flex flex-col gap-2 transition-opacity', (pages.loading) && 'opacity-60')}>
              {pages.rooms.map((item) => <RoomCard key={item.id} room={item} global={tab === 'global'} onOpen={(watch) => open(item, watch)}/>)}
            </ul>
            <div ref={sentinelRef} aria-hidden className='h-px'/>
            {/* a row as tall as the spinner whenever there's more, so the list doesn't hop when it shows */}
            {(pages.next) ? (
              <div className='flex h-10 items-center justify-center'>
                {(pages.loadingMore) ? <Spinner className='size-5'/> : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-10 text-center transition-opacity', (pages.loading) && 'opacity-60')}>
            <p className='text-sm text-muted'>
              {(searching) ? t('games.rooms.no_match', {query: q.trim()}) : t(`games.rooms.none_${tab}`)}
            </p>
            {(searching) ? (
              <button type='button' className='btn btn-secondary' onClick={() => {
                setSearch('');
                setQ('');
              }}>{t('games.rooms.clear_search')}</button>
            ) : (
              <button type='button' className='btn btn-secondary' onClick={() => setCreating(true)}>
                <Plus aria-hidden className='size-4'/>{t('games.rooms.new')}
              </button>
            )}
          </div>
        )}
      </div>

      {(picking) ? (
        <GamePickDialog
          title={(picking === 'quick') ? t('games.rooms.pick_quick') : t('games.rooms.pick_solo')}
          onClose={() => setPicking(null)}
          onPick={(chosen) => {
            const action = picking;
            setPicking(null);
            if (action === 'quick') {
              void quickPlay(chosen);
            } else {
              void playSolo(chosen);
            }
          }}
        />
      ) : null}
      {(creating) ? (
        <NewRoomDialog
          api={api}
          errorOf={errorOf}
          game={game ?? GAMES[0].id}
          visibility={tab}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            onOpen(created.id, false);
          }}
        />
      ) : null}
      {(unlocking) ? (
        <PasswordDialog
          api={api}
          errorOf={errorOf}
          room={unlocking.room}
          onClose={() => setUnlocking(null)}
          onJoined={() => {
            const { room: target, watch } = unlocking;
            setUnlocking(null);
            onOpen(target.id, watch);
          }}
        />
      ) : null}
    </div>
  );
}


// what a room plays and how far it is, in a line: its game's settings
function roomDetails(room: GameRoomSummary, t: ReturnType<typeof useI18n>['t'], plural: ReturnType<typeof useI18n>['plural']): Array<string> {
  const letters = room.game === 'letter_trail';
  const status = (room.phase === 'lobby') ? t('games.rooms.status_lobby')
    : (room.phase === 'finished') ? t('games.rooms.status_finished')
    : (room.round) ? t((letters) ? 'games.rooms.status_round_letters' : 'games.rooms.status_round', {number: room.round.number, total: room.round.total}) : t('games.rooms.status_lobby');
  if ('size' in room.settings) {
    return [
      status,
      t('games.letters.settings_size_value', {size: room.settings.size}),
      t('games.letters.settings_seconds_value', {seconds: room.settings.seconds}),
      plural('games.rooms.rounds', room.settings.rounds),
    ];
  }
  return [
    status,
    t(`games.flag.settings_mode_${room.settings.mode}`),
    t(`games.flag.settings_difficulty_${room.settings.difficulty}`),
    plural('games.rooms.flags', room.settings.rounds),
  ];
}


// a room: its game, name and marks, who made it (and where, for a global one), what it plays, who's in it. Every line
// is always there and one line tall, so cards in a tab are the same height and don't move as rooms update
function RoomCard({ room, global, onOpen }: {room: GameRoomSummary, global: boolean, onOpen: (watch: boolean) => void}) {
  const { t, plural } = useI18n();
  const info = gameInfo(room.game);
  const Icon = info.icon;
  const shown = room.players.slice(0, SHOWN_FACES);
  const made = [
    t(info.title),
    t('games.rooms.by', {name: room.creator.username}),
    // the server's name only when the bot knows it
    (global && room.origin?.guild_name) ? room.origin.guild_name : null,
  ].filter((part): part is string => Boolean(part));
  return (
    <li className='flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-3 sm:flex-row sm:items-center'>
      <div className='flex min-w-0 flex-1 gap-3'>
        <span title={t(info.title)} className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', info.accent)}>
          <Icon aria-hidden className='size-5'/>
        </span>
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <span className='flex min-w-0 items-center gap-1.5'>
            <span className='truncate font-semibold text-white'>{room.name ?? t('games.rooms.unnamed', {name: room.creator.username})}</span>
            {(room.locked) ? <Lock aria-label={t('games.rooms.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
            {(room.watch_only) ? (
              <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted'>
                <Eye aria-hidden className='size-3'/>{t('games.rooms.watch_only')}
              </span>
            ) : null}
          </span>
          <span className='flex min-w-0 items-center gap-1 text-xs text-muted'>
            {(global) ? <Globe aria-hidden className='size-3 shrink-0'/> : null}
            <span className='truncate'>{made.join(' • ')}</span>
          </span>
          <span className='truncate text-xs text-subtle'>{roomDetails(room, t, plural).join(' • ')}</span>
          <span className='mt-1 flex h-6 items-center gap-2'>
            {(shown.length) ? (
              <span className='flex -space-x-1.5'>
                {shown.map((player) => <MemberAvatar key={player.user_id} member={player} className='size-6 rounded-full border-2 border-surface'/>)}
              </span>
            ) : null}
            <span className='truncate text-xs text-muted'>
              {plural('games.rooms.playing', room.players.length)}
              {(room.watchers) ? ` • ${plural('games.rooms.watchers', room.watchers)}` : ''}
            </span>
          </span>
        </div>
      </div>
      <div className='flex shrink-0 gap-2'>
        {(room.watch_only) ? (
          // the api decides: its creator and who's already playing play, everyone else watches
          <button type='button' className='btn btn-primary flex-1 sm:flex-none' onClick={() => onOpen(false)}>
            <Eye aria-hidden className='size-4'/>{t('games.rooms.watch')}
          </button>
        ) : (
          <>
            <button type='button' className='btn btn-secondary flex-1 sm:flex-none' onClick={() => onOpen(true)}>
              <Eye aria-hidden className='size-4'/>{t('games.rooms.watch')}
            </button>
            <button type='button' className='btn btn-primary flex-1 sm:flex-none' onClick={() => onOpen(false)}>
              <Play aria-hidden className='size-4'/>{t('games.rooms.play')}
            </button>
          </>
        )}
      </div>
    </li>
  );
}


// who finds a room: this server's Activity or every server's. Both hints sit in the same spot, the longer one holds
// its height, so picking one doesn't move what's under it. `locked`: a room past its lobby (the api takes it only there)
export function GameRoomVisibilityField({ value, onChange, locked = false }: {
  value: GameRoomVisibility,
  onChange: (value: GameRoomVisibility) => void,
  locked?: boolean,
}) {
  const { t } = useI18n();
  const labelId = useId();
  return (
    <div className='flex flex-col gap-1.5'>
      <span id={labelId} className='text-sm text-muted'>{t('games.rooms.visibility')}</span>
      <div role='radiogroup' aria-labelledby={labelId} className='grid grid-cols-2 gap-1 rounded-lg bg-deep p-1'>
        {GAME_ROOM_VISIBILITIES.map((option) => {
          const Icon = (option === 'global') ? Globe : Users;
          return (
            <button
              key={option}
              type='button'
              role='radio'
              aria-checked={value === option}
              disabled={locked}
              onClick={() => onChange(option)}
              className={cn(
                'flex min-h-10 items-center justify-center gap-1.5 rounded-md px-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                (value === option) ? 'bg-brand text-white' : 'text-muted enabled:hover:text-fg',
              )}
            >
              <Icon aria-hidden className='size-4 shrink-0'/>
              <span className='truncate'>{t(`games.rooms.visibility_${option}`)}</span>
            </button>
          );
        })}
      </div>
      {(locked) ? (
        // nothing to pick, so why instead of what each one does
        <p className='text-xs text-subtle'>{t('games.rooms.visibility_lobby_only')}</p>
      ) : (
        <p className='grid text-xs text-subtle'>
          {GAME_ROOM_VISIBILITIES.map((option) => (
            <span key={option} aria-hidden={value !== option} className={cn('col-start-1 row-start-1', (value !== option) && 'invisible')}>
              {t(`games.rooms.visibility_${option}_hint`)}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}


// the room's name, public or password, and watch-only: a new room's, and its creator's settings in the game
export function GameRoomFields({ mode, onModeChange, name, onNameChange, password, onPasswordChange, watchOnly, onWatchOnlyChange, keepsPassword }: {
  mode: RoomMode,
  onModeChange: (mode: RoomMode) => void,
  name: string,
  onNameChange: (name: string) => void,
  password: string,
  onPasswordChange: (password: string) => void,
  watchOnly: boolean,
  onWatchOnlyChange: (watchOnly: boolean) => void,
  keepsPassword?: boolean,
}) {
  const { t } = useI18n();
  return (
    <RoomSettingsFields
      modes={ROOM_MODES}
      mode={mode}
      onModeChange={(value) => onModeChange((value === 'password') ? 'password' : 'public')}
      name={name}
      onNameChange={onNameChange}
      password={password}
      onPasswordChange={onPasswordChange}
      watchOnly={watchOnly}
      onWatchOnlyChange={onWatchOnlyChange}
      keepsPassword={keepsPassword}
      modeHint={(value) => t(`games.rooms.mode_${(value === 'password') ? 'password' : 'public'}_hint`)}
      watchOnlyHint={t('games.rooms.watch_only_hint')}
      namePlaceholder={t('games.rooms.name_placeholder')}
    />
  );
}


// which game a room is for: a card each, the same as the Games tab's icons
function GameChoiceField({ value, onChange }: {value: GameKind, onChange: (value: GameKind) => void}) {
  const { t } = useI18n();
  const labelId = useId();
  return (
    <div className='flex flex-col gap-1.5'>
      <span id={labelId} className='text-sm text-muted'>{t('games.rooms.filter_game')}</span>
      <div role='radiogroup' aria-labelledby={labelId} className='grid grid-cols-2 gap-2'>
        {GAMES.map((entry) => {
          const Icon = entry.icon;
          const checked = value === entry.id;
          return (
            <button
              key={entry.id}
              type='button'
              role='radio'
              aria-checked={checked}
              onClick={() => onChange(entry.id)}
              className={cn(
                'flex min-h-12 min-w-0 items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-left text-sm font-semibold transition-colors',
                (checked) ? 'border-brand bg-brand/15 text-white' : 'border-line-strong bg-deep text-muted hover:text-fg',
              )}
            >
              <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', entry.accent)}>
                <Icon aria-hidden className='size-4'/>
              </span>
              <span className='truncate'>{t(entry.title)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// Quick play or Play solo with every game shown: which game first
function GamePickDialog({ title, onPick, onClose }: {title: string, onPick: (game: GameKind) => void, onClose: () => void}) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <Modal anchor='top' labelledBy={titleId} onClose={onClose} className='max-w-sm'>
      <div className='flex flex-col gap-3 p-5 sm:p-6'>
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{title}</h2>
        <ul className='flex flex-col gap-2'>
          {GAMES.map((entry) => {
            const Icon = entry.icon;
            return (
              <li key={entry.id}>
                <button
                  type='button'
                  onClick={() => onPick(entry.id)}
                  className='flex min-h-14 w-full items-center gap-3 rounded-xl border border-line-strong bg-surface p-3 text-left transition-colors hover:border-brand hover:bg-surface-2'
                >
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', entry.accent)}>
                    <Icon aria-hidden className='size-5'/>
                  </span>
                  <span className='flex min-w-0 flex-col'>
                    <span className='font-semibold text-white'>{t(entry.title)}</span>
                    <span className='truncate text-xs text-muted'>{t(entry.description)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className='flex justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </Modal>
  );
}


// `visibility`: the tab it was opened from, `game`: the browser's game filter (the first game with none)
function NewRoomDialog({ api, errorOf, game: firstGame, visibility: firstVisibility, onClose, onCreated }: {
  api: GameRoomsApi,
  errorOf: (error: unknown) => EditorApiError | null,
  game: GameKind,
  visibility: GameRoomVisibility,
  onClose: () => void,
  onCreated: (room: GameRoomSummary) => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [ game, setGame ] = useState<GameKind>(firstGame);
  const [ visibility, setVisibility ] = useState<GameRoomVisibility>(firstVisibility);
  const [ mode, setMode ] = useState<RoomMode>('public');
  const [ name, setName ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ watchOnly, setWatchOnly ] = useState(false);
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  const ready = roomSettingsReady(mode, password);

  return (
    <Modal anchor='top' labelledBy={titleId} onClose={onClose} className='max-w-md'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || busy) {
            return;
          }
          setBusy(true);
          setError(null);
          try {
            onCreated(await api.create({
              game,
              visibility,
              name: name.trim() || null,
              ...((mode === 'password') ? {password} : {}),
              watch_only: watchOnly,
            }));
          } catch (failure) {
            setError(errorOf(failure)?.message || t('games.rooms.create_failed'));
            setBusy(false);
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('games.rooms.new_title')}</h2>
        <GameChoiceField value={game} onChange={setGame}/>
        <GameRoomVisibilityField value={visibility} onChange={setVisibility}/>
        <GameRoomFields
          mode={mode}
          onModeChange={setMode}
          name={name}
          onNameChange={setName}
          password={password}
          onPasswordChange={setPassword}
          watchOnly={watchOnly}
          onWatchOnlyChange={setWatchOnly}
        />
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex justify-end gap-2'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={!ready || busy}>
            {(busy) ? <Spinner className='size-4'/> : <Plus aria-hidden className='size-4'/>}{t('games.rooms.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function PasswordDialog({ api, errorOf, room, onClose, onJoined }: {
  api: GameRoomsApi,
  errorOf: (error: unknown) => EditorApiError | null,
  room: GameRoomSummary,
  onClose: () => void,
  onJoined: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const passwordId = useId();
  const [ password, setPassword ] = useState('');
  const [ busy, setBusy ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  return (
    <Modal anchor='top' labelledBy={titleId} onClose={onClose} className='max-w-sm'>
      <form
        className='flex flex-col gap-4 p-5 sm:p-6'
        onSubmit={async (event) => {
          event.preventDefault();
          if (!password || busy) {
            return;
          }
          setBusy(true);
          setError(null);
          try {
            await api.join(room.id, password);
            onJoined();
          } catch (failure) {
            setError(errorOf(failure)?.message || t('games.rooms.join_failed'));
            setBusy(false);
          }
        }}
      >
        <div>
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('games.rooms.password_title')}</h2>
          <p className='mt-1 text-sm text-muted'>{t('games.rooms.password_description', {name: room.name ?? t('games.rooms.unnamed', {name: room.creator.username})})}</p>
        </div>
        <div>
          <label htmlFor={passwordId} className='sr-only'>{t('games.rooms.password')}</label>
          <PasswordInput id={passwordId} value={password} onChange={setPassword} autoComplete='current-password' autoFocus placeholder={t('games.rooms.password')}/>
        </div>
        {(error) ? <DialogError>{error}</DialogError> : null}
        <div className='flex justify-end gap-2'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{t('common.cancel')}</button>
          <button type='submit' className={cn('btn btn-primary')} disabled={!password || busy}>
            {(busy) ? <Spinner className='size-4'/> : <Lock aria-hidden className='size-4'/>}{t('games.rooms.unlock')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
