import { DoorClosed, Globe, ImageIcon, Lock, LogIn, Plus } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { FiltersButton } from '@/components/ui/FiltersButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import type { EditorHost } from '../api';
import { ROOM_MAX_EDITORS, type EditingResult, type EditorRoom, type RoomMember } from '../room';
import type { EditorLobby } from '../types';
import { useCatalogue } from '../useCatalogue';
import { MemberFaces } from './LobbyPeople';
import { prefersReducedMotion } from './media';
import { canModerateRoom, CloseRoomDialog } from './RoomModeration';
import { PasswordInput } from './SaveTemplate';


// lobby changes (new ones, steps) come as the room's document events, one refetch per burst of them
const REFRESH_DELAY = 800;
// ...and at the latest this long after the first of them (someone dragging a slider is a change every moment, the
// refetch used to wait for them to stop)
const REFRESH_MAX_WAIT = 3000;
// a card lists this many of its steps by name
const SHOWN_STEPS = 4;

const ROOM_KINDS = ['all', 'image', 'video', 'audio'] as const;
type RoomKind = typeof ROOM_KINDS[number];
type RoomSort = 'newest' | 'people';
const ROOM_VISIBILITIES = ['all', 'public', 'password'] as const;
type RoomVisibility = typeof ROOM_VISIBILITIES[number];

// the list against the api: asked and not answered yet (what's shown is the last answer, or the launch's), answered,
// or the last ask failed (the room's events still keep it going)
type ListStatus = 'refreshing' | 'ready' | 'failed';

// One card's join. `asking`: a locked one's password form is open (its maker never needs it), with what the last try
// came to. `joining`: sent and not answered, `asked` when it went from the form (which stays up meanwhile).
// `refused`: why not
type CardState =
  | {status: 'idle'}
  | {status: 'asking', error: string | null}
  | {status: 'joining', asked: boolean}
  | {status: 'refused', error: string};


// The Activity's group edits ("lobbies"), each up to `limit` editors: what's being edited (picture, file, steps, a
// locked one only its name) and who's in it, live from the room. Join one, or start a new one
export function LobbyList({ host, room, instanceId, initial, notice, onJoin, onNew }: {
  host: EditorHost,
  room: EditorRoom,
  instanceId: string,
  initial: Array<EditorLobby>,
  // why they're back here (lost their spot)
  notice?: string | null,
  onJoin: (documentId: string, password?: string) => Promise<EditingResult>,
  onNew: () => void,
}) {
  const { t } = useI18n();
  const { catalogue } = useCatalogue(host);
  const effectNames = useMemo(() => new Map((catalogue?.effects ?? []).map((effect) => [effect.id, effect.name])), [catalogue]);
  const [ lobbies, setLobbies ] = useState(initial);
  const [ members, setMembers ] = useState<Array<RoomMember>>(() => room.members);
  const [ query, setQuery ] = useState('');
  const [ kind, setKind ] = useState<RoomKind>('all');
  const [ openOnly, setOpenOnly ] = useState(false);
  const [ mineOnly, setMineOnly ] = useState(false);
  const [ sort, setSort ] = useState<RoomSort>('newest');
  const [ visibility, setVisibility ] = useState<RoomVisibility>('all');
  // hidden until asked for, like the site's other lists
  const [ filtersOpen, setFiltersOpen ] = useState(false);
  const filtersId = useId();
  // set by the room's `ready`, re-rendered with it
  const [ , setModerator ] = useState(room.moderator);
  const [ status, setStatus ] = useState<ListStatus>('refreshing');
  // the one room being joined, every other Join and New room wait for its answer (each card had its own, a second
  // card's Join went out beside the first)
  const [ joining, setJoining ] = useState<string | null>(null);
  const joiningRef = useRef(false);
  // "Close or delete this room?" for the room as it was when asked. Here and not in its card: the card goes when a
  // filter stops matching it, the dialog went with it
  const [ closing, setClosing ] = useState<{documentId: string, name: string} | null>(null);
  // the cards in use (a password form open, a join on its way): they stay listed whatever the filters say
  const [ engaged, setEngaged ] = useState<ReadonlySet<string>>(() => new Set());
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const join = useCallback(async (documentId: string, password?: string): Promise<EditingResult | null> => {
    if (joiningRef.current) {
      return null;
    }
    joiningRef.current = true;
    setJoining(documentId);
    try {
      return await onJoin(documentId, password);
    } finally {
      joiningRef.current = false;
      if (aliveRef.current) {
        setJoining(null);
      }
    }
  }, [onJoin]);

  const setCardEngaged = useCallback((documentId: string, inUse: boolean) => {
    setEngaged((current) => {
      if (current.has(documentId) === inUse) {
        return current;
      }
      const next = new Set(current);
      if (inUse) {
        next.add(documentId);
      } else {
        next.delete(documentId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    // when the burst the timer is waiting out began
    let waitingSince: number | null = null;
    // the newest ask: an older one's answer that comes after it (or after the room said something newer) is dropped
    let sequence = 0;
    const fetchNow = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      waitingSince = null;
      sequence += 1;
      const sent = sequence;
      setStatus('refreshing');
      host.api.activity(instanceId).then((context) => {
        if (alive && sent === sequence) {
          setLobbies(context.lobbies);
          setStatus('ready');
        }
      }).catch(() => {
        if (alive && sent === sequence) {
          setStatus('failed');
        }
      });
    };
    const refresh = () => {
      const now = Date.now();
      waitingSince ??= now;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        timer = null;
        fetchNow();
      }, Math.max(0, Math.min(REFRESH_DELAY, waitingSince + REFRESH_MAX_WAIT - now)));
    };
    // the list as of now, asked for right away: `initial` is the launch's, by the time they're back here from an edit
    // it's missing their own room and has ones long closed
    fetchNow();
    setMembers(room.members);
    const unsubscribe = room.subscribe((event) => {
      switch (event.t) {
        case 'ready':
          // the room's own list, newer than an ask still on its way
          sequence += 1;
          setLobbies(event.lobbies);
          setStatus('ready');
          setMembers(event.members);
          setModerator(Boolean(event.moderator));
          break;
        case 'lobby_closed':
        case 'lobby_deleted':
          // an ask sent before it closed would bring it back: dropped, and asked again
          sequence += 1;
          setLobbies((current) => current.filter((lobby) => lobby.id !== event.document_id));
          refresh();
          break;
        case 'lobby_updated':
          // a locked one's file name, steps and picture aren't sent any more (but to its creator and whoever's in it), they
          // go now and the refetch has what's shown now
          setLobbies((current) => current.map((lobby) => {
            if (lobby.id !== event.document_id) {
              return lobby;
            }
            const hide = event.locked && lobby.user_id !== room.you && !lobby.editors.some((editor) => editor.user_id === room.you);
            return {...lobby, name: event.name, locked: event.locked, watch_only: Boolean(event.watch_only), ...((hide) ? {filename: null, steps: [], preview: null} : {})};
          }));
          refresh();
          break;
        case 'members':
          setMembers(event.members);
          break;
        case 'document':
        // (a lobby they aren't in: the api only says it changed)
        case 'lobby_edited':
          refresh();
          break;
        default:
          break;
      }
    });
    return () => {
      alive = false;
      unsubscribe();
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [host, instanceId, room]);

  // what's left after the search and filters, newest first unless sorted by people
  const editorsOf = (lobby: EditorLobby) => members.filter((member) => member.editing === lobby.id);
  const search = query.trim().toLowerCase();
  const shown = lobbies.filter((lobby) => {
    if (engaged.has(lobby.id)) {
      return true;
    }
    if ((visibility === 'public' && lobby.locked) || (visibility === 'password' && !lobby.locked)) {
      return false;
    }
    if (kind !== 'all' && lobby.kind !== kind) {
      return false;
    }
    if (openOnly && editorsOf(lobby).length >= lobby.limit) {
      return false;
    }
    if (mineOnly && lobby.creator?.user_id !== room.you) {
      return false;
    }
    if (!search) {
      return true;
    }
    // its name, file, creator and whoever's in it (a locked room's steps aren't sent, so they can't match)
    const haystack = [
      lobby.name, lobby.filename, lobby.creator?.username,
      ...editorsOf(lobby).map((member) => member.username),
      ...lobby.steps.map((id) => effectNames.get(id) ?? id),
    ];
    return haystack.some((value) => value && value.toLowerCase().includes(search));
  });
  if (sort === 'people') {
    shown.sort((a, b) => editorsOf(b).length - editorsOf(a).length || b.created - a.created);
  }
  const sections: Array<{key: 'public' | 'locked', title: string, hint: string, items: Array<EditorLobby>}> = [
    {key: 'public', title: t('editor.session.public_rooms'), hint: t('editor.session.public_rooms_hint'), items: shown.filter((lobby) => !lobby.locked)},
    {key: 'locked', title: t('editor.session.password_rooms'), hint: t('editor.session.password_rooms_hint'), items: shown.filter((lobby) => lobby.locked)},
  ];
  // filters off their default, shown on the Filters button while its panel is closed
  const activeFilters = [visibility !== 'all', kind !== 'all', openOnly, mineOnly, sort !== 'newest'].filter(Boolean).length;
  const filtering = Boolean(search) || activeFilters > 0;

  return (
    <div data-state={status} data-joining={joining ?? 'none'} className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-bold text-white sm:text-4xl'>{t('editor.session.lobbies_title')}</h1>
        <p className='text-muted'>{t('editor.session.lobbies_description', {limit: ROOM_MAX_EDITORS})}</p>
      </header>
      {(notice) ? <p role='status' className='rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning'>{notice}</p> : null}
      <button type='button' onClick={onNew} disabled={joining !== null} className='btn btn-primary w-full sm:w-fit'>
        <Plus aria-hidden className='size-4'/>{t('editor.session.new_lobby')}
      </button>
      {(lobbies.length) ? (
        <>
          <div>
            <div className='flex gap-2'>
              <SearchInput className='min-w-0 flex-1' value={query} onValueChange={setQuery} placeholder={t('editor.session.search')} aria-label={t('editor.session.search')}/>
              <FiltersButton open={filtersOpen} onToggle={() => setFiltersOpen((value) => !value)} active={activeFilters} controls={filtersId}/>
            </div>
            <div id={filtersId} hidden={!filtersOpen} className='mt-3 rounded-lg border border-line bg-deep/60 p-4'>
              <div className='flex flex-wrap items-center gap-3'>
                <Segmented
                  label={t('editor.session.filter_visibility')}
                  value={visibility}
                  options={ROOM_VISIBILITIES.map((value) => ({value, label: t(`editor.session.visibility_${value}`)}))}
                  onChange={(value) => setVisibility(value as RoomVisibility)}
                />
                <Segmented
                  label={t('editor.session.filter_kind')}
                  value={kind}
                  options={ROOM_KINDS.map((value) => ({value, label: t(`editor.session.kind_${value}`)}))}
                  onChange={(value) => setKind(value as RoomKind)}
                />
                <FilterToggle pressed={openOnly} onChange={setOpenOnly} label={t('editor.session.filter_open')}/>
                <FilterToggle pressed={mineOnly} onChange={setMineOnly} label={t('editor.session.filter_mine')}/>
                <label className='flex items-center gap-2 text-sm text-muted'>
                  {t('editor.session.sort')}
                  <select value={sort} onChange={(event) => setSort(event.target.value as RoomSort)} className='input w-auto py-2'>
                    <option value='newest'>{t('editor.session.sort_newest')}</option>
                    <option value='people'>{t('editor.session.sort_people')}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
          {(shown.length) ? sections.map((section) => (section.items.length) ? (
            <section key={section.key} aria-labelledby={`rooms-${section.key}`} className='flex flex-col gap-3'>
              <div className='flex items-baseline gap-2'>
                {(section.key === 'locked') ? <Lock aria-hidden className='size-3.5 self-center text-subtle'/> : <Globe aria-hidden className='size-3.5 self-center text-subtle'/>}
                <h2 id={`rooms-${section.key}`} className='text-sm font-semibold text-white'>{section.title}</h2>
                <span className='text-xs text-subtle'>{section.items.length}</span>
                <span className='hidden text-xs text-subtle sm:inline'>· {section.hint}</span>
              </div>
              <ul className='grid gap-3 sm:grid-cols-2'>
                {section.items.map((lobby) => (
                  <li key={lobby.id}>
                    <LobbyCard
                      lobby={lobby}
                      // live from the room, the lobby's own list is as of its last fetch
                      editors={editorsOf(lobby)}
                      room={room}
                      effectNames={effectNames}
                      joining={joining}
                      onJoin={join}
                      onEngaged={setCardEngaged}
                      onClose={(name) => setClosing({documentId: lobby.id, name})}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null) : (
            <div className='flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong p-4'>
              <p className='text-sm text-muted'>{t('editor.session.no_match')}</p>
              {(filtering) ? (
                <button
                  type='button'
                  className='text-sm font-semibold text-brand-text hover:text-white'
                  onClick={() => {
                    setQuery('');
                    setVisibility('all');
                    setKind('all');
                    setOpenOnly(false);
                    setMineOnly(false);
                    setSort('newest');
                  }}
                >
                  {t('editor.session.clear_filters')}
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <p className='text-sm text-subtle'>{t('editor.session.no_lobbies')}</p>
      )}
      {(closing) ? <CloseRoomDialog room={room} documentId={closing.documentId} name={closing.name} onClose={() => setClosing(null)}/> : null}
    </div>
  );
}


function FilterToggle({ pressed, onChange, label }: {pressed: boolean, onChange: (value: boolean) => void, label: string}) {
  return (
    <button
      type='button'
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(
        'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
        (pressed) ? 'border-brand bg-brand/20 text-white' : 'border-line-strong text-muted hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}


function LobbyPreview({ lobby }: {lobby: EditorLobby}) {
  const preview = lobby.preview;
  if (lobby.locked || !preview) {
    return (
      <div className='flex aspect-video w-full items-center justify-center bg-deep text-subtle'>
        {(lobby.locked) ? <Lock aria-hidden className='size-8'/> : <ImageIcon aria-hidden className='size-8'/>}
      </div>
    );
  }
  if (preview.mimetype.startsWith('video/')) {
    // up to 25 cards at once: they don't all play for someone who asked for less motion
    return <video src={preview.url} muted autoPlay={!prefersReducedMotion()} loop playsInline preload='metadata' className='aspect-video w-full bg-deep object-contain'/>;
  }
  return <img src={preview.url} alt='' loading='lazy' className='aspect-video w-full bg-deep object-contain'/>;
}


function LobbyCard({ lobby, editors, room, effectNames, joining, onJoin, onEngaged, onClose }: {
  lobby: EditorLobby,
  editors: Array<RoomMember>,
  room: EditorRoom,
  effectNames: Map<string, string>,
  // the room being joined from this list (this one or another), nothing else joins meanwhile
  joining: string | null,
  // null: another join was on its way, this one wasn't sent
  onJoin: (documentId: string, password?: string) => Promise<EditingResult | null>,
  // its password form is open or its join is on its way: the list keeps it whatever the filters say
  onEngaged: (documentId: string, inUse: boolean) => void,
  // "Close or delete this room?", the list's dialog. `name`: what the card calls it now
  onClose: (name: string) => void,
}) {
  const { t } = useI18n();
  const passwordId = useId();
  const [ state, setState ] = useState<CardState>({status: 'idle'});
  const [ password, setPassword ] = useState('');
  const you = room.you;
  const moderates = canModerateRoom(room, lobby.user_id);
  const aliveRef = useRef(true);
  useEffect(() => {
    // (set here too: strict mode runs the cleanup once right after the first mount, and it stayed false from then on.
    // In development a refused join span for good)
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const inUse = state.status === 'asking' || state.status === 'joining';
  useEffect(() => {
    if (!inUse) {
      return;
    }
    onEngaged(lobby.id, true);
    return () => onEngaged(lobby.id, false);
  }, [inUse, lobby.id, onEngaged]);

  const full = editors.length >= lobby.limit;
  const needsPassword = lobby.locked && lobby.user_id !== you;
  const steps = lobby.steps.map((id) => effectNames.get(id) ?? id);
  const shownSteps = steps.slice(0, SHOWN_STEPS).join(' → ');
  const name = lobby.name || lobby.filename || t('editor.session.untitled');
  const pending = state.status === 'joining';
  const busy = joining !== null;
  const asking = state.status === 'asking' || (state.status === 'joining' && state.asked);
  const error = (state.status === 'asking' || state.status === 'refused') ? state.error : null;

  const join = async (withPassword?: string) => {
    const before = state;
    setState({status: 'joining', asked: before.status === 'asking'});
    let answer: EditingResult | null;
    try {
      answer = await onJoin(lobby.id, withPassword);
    } catch {
      answer = {result: 'gone'};
    }
    if (!aliveRef.current) {
      return;
    }
    if (!answer) {
      setState(before);
      return;
    }
    const { result, message } = answer;
    switch (result) {
      case 'ok':
        // joined: the host opens it, this card goes with the list
        setState({status: 'idle'});
        break;
      case 'full':
        setState({status: 'refused', error: t('editor.session.full', {limit: lobby.limit})});
        break;
      case 'locked':
        setState({status: 'asking', error: null});
        break;
      case 'wrong':
        setState({status: 'asking', error: message || t('editor.session.wrong_password')});
        break;
      case 'kicked':
        setState({status: 'refused', error: t('editor.session.kicked_join')});
        break;
      case 'gone':
        setState({status: 'refused', error: message || t('editor.session.failed')});
        break;
      default: {
        const unknown: never = result;
        return unknown;
      }
    }
  };

  return (
    <div data-state={state.status} data-lobby-id={lobby.id} className='flex h-full flex-col overflow-hidden rounded-xl border border-line-strong bg-surface'>
      <LobbyPreview lobby={lobby}/>
      <div className='flex flex-1 flex-col gap-2 p-3'>
        <div className='flex min-w-0 items-center gap-1.5'>
          {(lobby.locked) ? <Lock aria-label={t('editor.session.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
          <h3 className='truncate text-sm font-semibold text-white'>{name}</h3>
        </div>
        {(lobby.creator) ? (
          <p className='-mt-1 truncate text-xs text-subtle'>
            {t('editor.session.by', {name: lobby.creator.username})}
            {(lobby.name && lobby.filename && !lobby.locked) ? ` · ${lobby.filename}` : null}
            {(lobby.watch_only) ? ` · ${t('editor.room.watch_only')}` : null}
          </p>
        ) : null}
        <p className='min-h-4 truncate text-xs text-subtle'>
          {(lobby.locked) ? t('editor.session.locked_steps')
            : (steps.length) ? `${shownSteps}${(steps.length > SHOWN_STEPS) ? ` +${steps.length - SHOWN_STEPS}` : ''}`
            : t('editor.session.no_steps')}
        </p>
        <div className='mt-auto flex items-center gap-2 pt-1'>
          <MemberFaces members={editors} size='size-6' ring='border-surface'/>
          <span className={cn('text-xs', (full) ? 'font-semibold text-warning' : 'text-subtle')}>
            {t('editor.session.editing_count', {count: editors.length, limit: lobby.limit})}
          </span>
        </div>
        {(asking) ? (
          <form
            className='flex flex-col gap-2'
            onSubmit={(event) => {
              event.preventDefault();
              if (password && !busy) {
                void join(password);
              }
            }}
          >
            <label htmlFor={passwordId} className='text-xs text-muted'>{t('editor.session.lobby_password')}</label>
            <PasswordInput id={passwordId} value={password} onChange={setPassword} autoComplete='current-password' autoFocus/>
            <div className='flex gap-2'>
              {/* (the form keeps its card listed whatever the filters say, this is how it lets go) */}
              <button
                type='button'
                className='btn btn-secondary'
                disabled={pending}
                onClick={() => {
                  setPassword('');
                  setState({status: 'idle'});
                }}
              >
                {t('common.cancel')}
              </button>
              <button type='submit' className='btn btn-primary min-w-0 flex-1' disabled={!password || busy}>
                {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <LogIn aria-hidden className='size-4'/>}
                {t('editor.session.join_short')}
              </button>
            </div>
          </form>
        ) : (
          <button
            type='button'
            className='btn btn-secondary w-full'
            disabled={busy || full}
            onClick={() => (needsPassword) ? setState({status: 'asking', error: null}) : void join()}
          >
            {(pending) ? <Spinner className='size-4'/> : (needsPassword) ? <Lock aria-hidden className='size-4'/> : <LogIn aria-hidden className='size-4'/>}
            {(full) ? t('editor.session.full_short') : t('editor.session.join_short')}
          </button>
        )}
        {(error) ? <p role='alert' className='text-xs text-danger-text'>{error}</p> : null}
        {(moderates) ? (
          <button type='button' onClick={() => onClose(name)} className='inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-danger-text hover:bg-surface-3'>
            <DoorClosed aria-hidden className='size-3.5'/>{t('editor.room.close_or_delete')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
