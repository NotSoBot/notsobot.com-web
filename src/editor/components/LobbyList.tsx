import { DoorClosed, Globe, ImageIcon, Lock, LogIn, Plus } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

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
import { canModerateRoom, CloseRoomDialog } from './RoomModeration';
import { PasswordInput } from './SaveTemplate';


// lobby changes (new ones, steps) come as the room's document events, one refetch per burst of them
const REFRESH_DELAY = 800;
// a card lists this many of its steps by name
const SHOWN_STEPS = 4;

const ROOM_KINDS = ['all', 'image', 'video', 'audio'] as const;
type RoomKind = typeof ROOM_KINDS[number];
type RoomSort = 'newest' | 'people';
const ROOM_VISIBILITIES = ['all', 'public', 'password'] as const;
type RoomVisibility = typeof ROOM_VISIBILITIES[number];


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

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    const refresh = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        timer = null;
        host.api.activity(instanceId).then((context) => {
          if (alive) {
            setLobbies(context.lobbies);
          }
        }).catch(() => undefined);
      }, REFRESH_DELAY);
    };
    // the list as of now: something may have changed between the context and this screen
    refresh();
    setMembers(room.members);
    const unsubscribe = room.subscribe((event) => {
      switch (event.t) {
        case 'ready':
          setLobbies(event.lobbies);
          setMembers(event.members);
          setModerator(Boolean(event.moderator));
          break;
        case 'lobby_closed':
        case 'lobby_deleted':
          setLobbies((current) => current.filter((lobby) => lobby.id !== event.document_id));
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
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-display text-3xl font-bold text-white sm:text-4xl'>{t('editor.session.lobbies_title')}</h1>
        <p className='text-muted'>{t('editor.session.lobbies_description', {limit: ROOM_MAX_EDITORS})}</p>
      </header>
      {(notice) ? <p role='status' className='rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning'>{notice}</p> : null}
      <button type='button' onClick={onNew} className='btn btn-primary w-full sm:w-fit'>
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
                      onJoin={onJoin}
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
    return <video src={preview.url} muted autoPlay loop playsInline className='aspect-video w-full bg-deep object-contain'/>;
  }
  return <img src={preview.url} alt='' loading='lazy' className='aspect-video w-full bg-deep object-contain'/>;
}


function LobbyCard({ lobby, editors, room, effectNames, onJoin }: {
  lobby: EditorLobby,
  editors: Array<RoomMember>,
  room: EditorRoom,
  effectNames: Map<string, string>,
  onJoin: (documentId: string, password?: string) => Promise<EditingResult>,
}) {
  const { t } = useI18n();
  const passwordId = useId();
  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);
  // a locked one asks for its password in the card (its maker never needs it)
  const [ asking, setAsking ] = useState(false);
  const [ password, setPassword ] = useState('');
  const [ closing, setClosing ] = useState(false);
  const you = room.you;
  const moderates = canModerateRoom(room, lobby.user_id);
  const aliveRef = useRef(true);
  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  const full = editors.length >= lobby.limit;
  const needsPassword = lobby.locked && lobby.user_id !== you;
  const steps = lobby.steps.map((id) => effectNames.get(id) ?? id);
  const shownSteps = steps.slice(0, SHOWN_STEPS).join(' → ');

  const join = async (withPassword?: string) => {
    setPending(true);
    setError(null);
    const { result, message } = await onJoin(lobby.id, withPassword);
    // joined, this card's gone with the list
    if (!aliveRef.current) {
      return;
    }
    setPending(false);
    if (result === 'full') {
      setError(t('editor.session.full', {limit: lobby.limit}));
    } else if (result === 'locked') {
      setAsking(true);
    } else if (result === 'kicked') {
      setError(t('editor.session.kicked_join'));
    } else if (result === 'wrong') {
      setError(message || t('editor.session.wrong_password'));
    } else if (result === 'gone') {
      setError(message || t('editor.session.failed'));
    }
  };

  return (
    <div className='flex h-full flex-col overflow-hidden rounded-xl border border-line-strong bg-surface'>
      <LobbyPreview lobby={lobby}/>
      <div className='flex flex-1 flex-col gap-2 p-3'>
        <div className='flex min-w-0 items-center gap-1.5'>
          {(lobby.locked) ? <Lock aria-label={t('editor.session.locked')} className='size-3.5 shrink-0 text-subtle'/> : null}
          <h3 className='truncate text-sm font-semibold text-white'>{lobby.name || lobby.filename || t('editor.session.untitled')}</h3>
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
              if (password && !pending) {
                void join(password);
              }
            }}
          >
            <label htmlFor={passwordId} className='text-xs text-muted'>{t('editor.session.lobby_password')}</label>
            <PasswordInput id={passwordId} value={password} onChange={setPassword} autoComplete='current-password' autoFocus/>
            <button type='submit' className='btn btn-primary w-full' disabled={!password || pending}>
              {(pending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : <LogIn aria-hidden className='size-4'/>}
              {t('editor.session.join_short')}
            </button>
          </form>
        ) : (
          <button
            type='button'
            className='btn btn-secondary w-full'
            disabled={pending || full}
            onClick={() => (needsPassword) ? setAsking(true) : void join()}
          >
            {(pending) ? <Spinner className='size-4'/> : (needsPassword) ? <Lock aria-hidden className='size-4'/> : <LogIn aria-hidden className='size-4'/>}
            {(full) ? t('editor.session.full_short') : t('editor.session.join_short')}
          </button>
        )}
        {(error) ? <p role='alert' className='text-xs text-danger-text'>{error}</p> : null}
        {(moderates) ? (
          <button type='button' onClick={() => setClosing(true)} className='inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-danger-text hover:bg-surface-3'>
            <DoorClosed aria-hidden className='size-3.5'/>{t('editor.room.close_or_delete')}
          </button>
        ) : null}
      </div>
      {(closing) ? <CloseRoomDialog room={room} documentId={lobby.id} name={lobby.name || lobby.filename || t('editor.session.untitled')} onClose={() => setClosing(false)}/> : null}
    </div>
  );
}
