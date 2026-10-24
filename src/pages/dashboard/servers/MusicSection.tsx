import { ChevronDown, ChevronUp, Crown, ListMusic, Music, Pause, Play, SkipForward, Square } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import type { GuildMusic, GuildMusicLoop, GuildMusicQueueItem, UserGuild } from '@/lib/api';
import { errorMessage, useGuildMusicMutation, useMeGuildMusicQuery, type GuildMusicAction } from '@/lib/api/dashboardQueries';
import { cn } from '@/lib/utils';

import { Field, Panel, Skeleton, Toggle } from '../ui';
import { EntryMention, useReadOnlyMessage } from './guildMeta';
import { RemoveButton } from './ServerSections';


const LOOP_OPTIONS: Array<{value: GuildMusicLoop, label: string}> = [
  {value: 'off', label: 'Off'},
  {value: 'track', label: 'Track'},
  {value: 'queue', label: 'Queue'},
];


// What NotSoBot is playing in the server and what's queued, like `music queue`. Songs are only added from Discord (the
// bot has to join someone's channel); here the loop, the queue's order, the music settings and the bot's
// pause/skip/stop can be changed, with Manage Server.
export function MusicSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.music;
  const readOnlyMessage = useReadOnlyMessage();
  const toast = useToast();
  const { data: music, isPending, error, dataUpdatedAt } = useMeGuildMusicQuery(guild.id);
  const mutation = useGuildMusicMutation(guild.id);
  const [ busyKey, setBusyKey ] = useState<string | null>(null);
  const [ confirming, setConfirming ] = useState<'clear' | 'leave' | null>(null);

  const run = async (key: string, action: GuildMusicAction, success?: string) => {
    setBusyKey(key);
    try {
      await mutation.mutateAsync(action);
      if (success) {
        toast(success);
      }
    } catch (error) {
      toast(errorMessage(error, 'Couldn’t change the music.'), 'error');
    } finally {
      setBusyKey(null);
    }
  };

  const queued = music?.queue ?? [];
  const queueDuration = queued.reduce((total, item) => total + (item.track?.duration ?? 0), 0);
  const unknownLengths = queued.some((item) => !item.track);
  const playing = !!music?.current || !!queued.length;

  return (
    <Panel
      title='Music'
      accent='#1db954'
      description='What NotSoBot is playing in this server and what’s up next. Songs are added with the music play command in a voice channel.'
      readOnly={(editable) ? undefined : readOnlyMessage('music')}
      actions={(music && playing) ? (
        <Segmented
          label='Loop'
          value={music.loop}
          options={LOOP_OPTIONS}
          disabled={!editable || mutation.isPending}
          onChange={(value) => void run('loop', {kind: 'loop', loop: value as GuildMusicLoop}, (value === 'off') ? 'Stopped looping' : `Looping the ${value}`)}
        />
      ) : null}
    >
      {(isPending) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-16 w-full bg-surface-2'/>
          <Skeleton className='h-9 w-full bg-surface-2'/>
        </div>
      ) : (error) ? (
        <p role='alert' className='text-sm text-danger'>{errorMessage(error, 'Couldn’t load the music in this server.')}</p>
      ) : (!music || !playing) ? (
        <p className='flex items-center gap-2 text-sm text-muted'>
          <Music aria-hidden className='size-4 text-subtle'/>
          Nothing is playing. Join a voice channel and use <code className='text-code'>music play</code> to start.
        </p>
      ) : (
        <div className='space-y-4'>
          {(music.current) ? (
            <NowPlaying
              music={music}
              item={music.current}
              fetchedAt={dataUpdatedAt}
              editable={editable}
              busyKey={busyKey}
              disabled={mutation.isPending}
              onControl={(action) => {
                if (action === 'leave') {
                  setConfirming('leave');
                } else {
                  void run(action, {kind: 'control', action});
                }
              }}
            />
          ) : null}

          <div>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
              <h3 className='text-sm font-semibold text-white'>Up next</h3>
              <div className='flex items-center gap-3 text-xs text-muted tabular-nums'>
                {(queued.length) ? (
                  <span>{queued.length.toLocaleString()} queued • {formatTime(queueDuration)}{(unknownLengths) ? '+' : ''} total</span>
                ) : null}
                {(editable && queued.length) ? (
                  <button type='button' className='btn btn-sm btn-ghost' disabled={mutation.isPending} onClick={() => setConfirming('clear')}>Clear</button>
                ) : null}
              </div>
            </div>
            {(queued.length) ? (
              <ol className='space-y-1.5'>
                {queued.map((item, index) => (
                  <li key={item.id} className='flex items-center gap-3 rounded-md border border-line bg-deep py-1.5 pr-1 pl-3'>
                    <span className='w-5 shrink-0 text-sm text-subtle tabular-nums'>{item.position}.</span>
                    <TrackCover item={item} className='size-8'/>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm text-fg'>{musicItemTitle(item)}</p>
                      <p className='flex min-w-0 items-center gap-1.5 text-xs text-subtle'>
                        <span className='tabular-nums'>{(item.track) ? formatTime(item.track.duration) : (item.status === 'converting') ? 'converting' : 'link'}</span>
                        <span aria-hidden>•</span>
                        <EntryMention type='user' id={item.user_id}/>
                        {(item.batch_id) ? (
                          <>
                            <span aria-hidden>•</span>
                            <span className='truncate'>from {item.batch_name || 'a playlist'}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    {(editable) ? (
                      <div className='flex shrink-0'>
                        <IconButton
                          label={`Move #${item.position} up`}
                          disabled={mutation.isPending || index === 0}
                          onClick={() => void run(item.id, {kind: 'move', itemId: item.id, position: item.position - 1})}
                        >
                          <ChevronUp aria-hidden className='size-4'/>
                        </IconButton>
                        <IconButton
                          label={`Move #${item.position} down`}
                          disabled={mutation.isPending || index === queued.length - 1}
                          onClick={() => void run(item.id, {kind: 'move', itemId: item.id, position: item.position + 1})}
                        >
                          <ChevronDown aria-hidden className='size-4'/>
                        </IconButton>
                        <RemoveButton
                          label={`Remove #${item.position}`}
                          busy={busyKey === `remove:${item.id}`}
                          disabled={mutation.isPending}
                          onClick={() => void run(`remove:${item.id}`, {kind: 'remove', itemId: item.id}, 'Removed from the queue')}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className='text-sm text-muted'>The queue is empty{(music.loop === 'track') ? ', the current track loops' : ''}.</p>
            )}
          </div>
        </div>
      )}

      {(music) ? (
        <MusicSettings music={music} editable={editable} busyKey={busyKey} disabled={mutation.isPending} run={run}/>
      ) : null}

      {(confirming === 'clear') ? (
        <ConfirmDialog
          title='Clear the queue?'
          description='Everything up next is removed. What’s playing now keeps playing.'
          confirmLabel='Clear the queue'
          pending={busyKey === 'clear'}
          onConfirm={async () => {
            await run('clear', {kind: 'clear'}, 'Cleared the queue');
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : (confirming === 'leave') ? (
        <ConfirmDialog
          title='Stop the music?'
          description='NotSoBot leaves the voice channel and the queue is cleared, like the music leave command.'
          confirmLabel='Stop and leave'
          pending={busyKey === 'leave'}
          onConfirm={async () => {
            await run('leave', {kind: 'control', action: 'leave'}, 'Stopped the music');
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </Panel>
  );
}


// the server's music settings (`music settings` in Discord): the queue's rules, voting to skip and 24/7
function MusicSettings({ music, editable, busyKey, disabled, run }: {
  music: GuildMusic,
  editable: boolean,
  busyKey: string | null,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<void>,
}) {
  const locked = !editable || disabled;
  return (
    <div className='mt-4'>
      <h3 className='mb-2 text-sm font-semibold text-white'>Settings</h3>
      <div className='divide-y divide-line rounded-md border border-line bg-deep'>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.fair_queue}
            disabled={locked}
            label='Take turns between who queued'
            description='Everyone’s first song plays, then everyone’s second, and so on, so one big playlist can’t hold up everyone else. Off plays songs in the order they were queued.'
            onChange={(value) => void run(
              'fair_queue',
              {kind: 'settings', settings: {fair_queue: value}},
              (value) ? 'The queue takes turns now' : 'The queue plays in order now',
            )}
          />
        </div>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.vote_skip}
            disabled={locked}
            label='Vote to skip someone else’s song'
            description='In Discord, skipping a song someone else queued takes votes from half of who’s listening. Off skips it right away. Your own songs never need a vote.'
            onChange={(value) => void run(
              'vote_skip',
              {kind: 'settings', settings: {vote_skip: value}},
              (value) ? 'Skipping takes a vote now' : 'Skipping doesn’t take a vote now',
            )}
          />
        </div>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.no_duplicates}
            disabled={locked}
            label='No duplicate songs'
            description='A song can’t be queued while it’s already queued or playing.'
            onChange={(value) => void run(
              'no_duplicates',
              {kind: 'settings', settings: {no_duplicates: value}},
              (value) ? 'Duplicate songs are turned away now' : 'Songs can be queued twice now',
            )}
          />
        </div>
        <MaxDurationSetting music={music} editable={editable} busy={busyKey === 'max_duration'} disabled={disabled} run={run}/>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.stay}
            disabled={locked}
            label='Stay in voice 24/7'
            description='NotSoBot stays in its voice channel when the queue runs out or it’s paused, and joins it again after restarts.'
            onChange={(value) => void run(
              'stay',
              {kind: 'settings', settings: {stay: value}},
              (value) ? 'NotSoBot stays in voice 24/7 now' : 'Turned 24/7 off',
            )}
          />
          {(!music.premium) ? (
            <p className='mt-2 flex items-start gap-2 rounded-md border border-[#f0b232]/30 bg-[#f0b232]/10 px-3 py-2 text-xs text-fg'>
              <Crown aria-hidden className='mt-px size-3.5 shrink-0 text-[#f0b232]'/>
              <span>
                24/7 only works on premium servers, until then NotSoBot leaves like it usually does.{' '}
                <Link to={Routes.DASHBOARD_PREMIUM} className='text-brand hover:underline'>Give this server a premium slot</Link>
              </span>
            </p>
          ) : null}
        </div>
        <p className='flex items-center gap-2 px-3 py-2.5 text-xs text-subtle'>
          <ListMusic aria-hidden className='size-3.5 shrink-0'/>
          <span>
            The queue fits {music.queue_limit.toLocaleString()} songs
            {(music.premium) ? ' with premium' : ', more on a premium server'}. An album or playlist adds its first 50.
          </span>
        </p>
      </div>
    </div>
  );
}


// the longest song that can be queued, typed as `m:ss` (or `h:mm:ss`), empty for no limit
function MaxDurationSetting({ music, editable, busy, disabled, run }: {
  music: GuildMusic,
  editable: boolean,
  busy: boolean,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<void>,
}) {
  const saved = (music.max_duration) ? formatTime(music.max_duration * 1000) : '';
  const [ draft, setDraft ] = useState(saved);
  // it's fetched again every few seconds, only a change from somewhere else replaces what's typed
  useEffect(() => setDraft(saved), [saved]);

  const seconds = parseDuration(draft);
  const invalid = Number.isNaN(seconds);
  const tooLong = !invalid && MAX_SONG_LENGTH < seconds;
  const changed = draft.trim() !== saved && (invalid || seconds !== (music.max_duration ?? 0));

  return (
    <form
      className='flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-start'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!editable || disabled || invalid || tooLong || !changed) {
          return;
        }
        void run(
          'max_duration',
          {kind: 'settings', settings: {max_duration: seconds}},
          (seconds) ? `Songs can be up to ${formatTime(seconds * 1000)} long now` : 'Songs can be any length now',
        );
      }}
    >
      <Field
        className='flex-1'
        label='Longest song'
        hint='Like 10:00 or 1:30:00. Leave it empty for no limit. A link’s length is checked once it’s converted.'
        error={(invalid) ? 'Use minutes and seconds, like 10:00.' : (tooLong) ? 'Songs can be limited to 24 hours at most.' : null}
      >
        {(props) => (
          <input
            {...props}
            className='input font-mono tabular-nums sm:max-w-[12rem]'
            inputMode='numeric'
            placeholder='No limit'
            value={draft}
            disabled={!editable}
            onChange={(event) => setDraft(event.target.value.replace(/[^\d:]/g, ''))}
            autoComplete='off'
          />
        )}
      </Field>
      {(editable) ? (
        <button type='submit' className='btn btn-secondary shrink-0 sm:mt-[1.625rem] sm:h-[2.375rem]' disabled={disabled || invalid || tooLong || !changed}>
          {(busy) ? <Spinner className='size-4'/> : null}
          Save
        </button>
      ) : null}
    </form>
  );
}


function NowPlaying({ music, item, fetchedAt, editable, busyKey, disabled, onControl }: {
  music: GuildMusic,
  item: GuildMusicQueueItem,
  fetchedAt: number,
  editable: boolean,
  busyKey: string | null,
  disabled: boolean,
  onControl: (action: 'leave' | 'pause' | 'resume' | 'skip') => void,
}) {
  const session = music.session;
  const paused = !!session?.paused;
  const duration = item.track?.duration ?? 0;
  // the position from when it was fetched, moving on while it plays (it's fetched again every few seconds)
  const [ now, setNow ] = useState(() => Date.now());
  useEffect(() => {
    if (!session || paused) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session, paused]);
  const elapsed = (session && !paused) ? Math.max(now - fetchedAt, 0) : 0;
  const position = Math.min((session?.position ?? 0) + elapsed, duration || Infinity);
  const ratio = (duration) ? Math.min(position / duration, 1) : 0;

  return (
    <div className='rounded-lg border border-line bg-deep p-3'>
      <div className='flex items-start gap-3'>
        <TrackCover item={item} className='size-14'/>
        <div className='min-w-0 flex-1'>
          <p className='truncate font-medium text-white'>
            {(item.url.startsWith('http')) ? (
              <a href={item.url} target='_blank' rel='noreferrer' className='hover:underline'>{musicItemTitle(item)}</a>
            ) : musicItemTitle(item)}
          </p>
          <p className='flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-subtle'>
            {(item.track?.album) ? <><span className='truncate'>{item.track.album}</span><span aria-hidden>•</span></> : null}
            <span>{(!session) ? 'Not in a voice channel' : (paused) ? 'Paused' : 'Playing'}</span>
            <span aria-hidden>•</span>
            <span className='inline-flex items-center gap-1'>requested by <EntryMention type='user' id={item.user_id}/></span>
          </p>
        </div>
        {(editable && session) ? (
          <div className='flex shrink-0'>
            <IconButton label={(paused) ? 'Resume' : 'Pause'} disabled={disabled} onClick={() => onControl((paused) ? 'resume' : 'pause')}>
              {(busyKey === 'pause' || busyKey === 'resume') ? <Spinner className='size-3.5'/> : (paused) ? <Play aria-hidden className='size-4'/> : <Pause aria-hidden className='size-4'/>}
            </IconButton>
            <IconButton label='Skip' disabled={disabled} onClick={() => onControl('skip')}>
              {(busyKey === 'skip') ? <Spinner className='size-3.5'/> : <SkipForward aria-hidden className='size-4'/>}
            </IconButton>
            <IconButton label='Stop and leave' danger disabled={disabled} onClick={() => onControl('leave')}>
              <Square aria-hidden className='size-3.5'/>
            </IconButton>
          </div>
        ) : null}
      </div>
      {(duration) ? (
        <div className='mt-3 flex items-center gap-2 text-xs text-subtle tabular-nums'>
          <span className='w-10 text-right'>{formatTime(position)}</span>
          <div
            role='progressbar'
            aria-label='Track progress'
            aria-valuemin={0}
            aria-valuemax={Math.round(duration / 1000)}
            aria-valuenow={Math.round(position / 1000)}
            className='h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3'
          >
            <div className={cn('h-full rounded-full', (paused) ? 'bg-subtle' : 'bg-[#1db954]')} style={{width: `${ratio * 100}%`}}/>
          </div>
          <span className='w-10'>{formatTime(duration)}</span>
        </div>
      ) : null}
    </div>
  );
}


function TrackCover({ item, className }: {item: GuildMusicQueueItem, className?: string}) {
  if (item.track?.thumbnail) {
    return <img src={item.track.thumbnail} alt='' loading='lazy' className={cn('shrink-0 rounded object-cover', className)}/>;
  }
  return (
    <div aria-hidden className={cn('flex shrink-0 items-center justify-center rounded bg-surface-3 text-subtle', className)}>
      <Music className='size-1/2'/>
    </div>
  );
}


function IconButton({ label, danger = false, disabled, onClick, children }: {
  label: string,
  danger?: boolean,
  disabled: boolean,
  onClick: () => void,
  children: ReactNode,
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50',
        (danger) ? 'hover:text-danger' : 'hover:text-white',
      )}
    >
      {children}
    </button>
  );
}


// `artist - title` like the bot, a link that isn't converted yet by its file name
function musicItemTitle(item: GuildMusicQueueItem): string {
  if (item.source === 'opus' && item.track) {
    return (item.track.artist) ? `${item.track.artist} - ${item.track.title}` : item.track.title;
  }
  try {
    const url = new URL(item.url);
    const segment = url.pathname.split('/').filter(Boolean).pop();
    return (segment) ? decodeURIComponent(segment) : url.hostname;
  } catch {
    return item.url;
  }
}


// the longest a server can limit songs to (seconds), the API's cap
const MAX_SONG_LENGTH = 24 * 60 * 60;

// `10:00` and `1:30:00` to seconds, a bare number is minutes. 0 for empty (no limit), NaN when it isn't a length
function parseDuration(text: string): number {
  const value = text.trim();
  if (!value) {
    return 0;
  }
  if (!/^\d+(:\d{1,2}){0,2}$/.test(value)) {
    return NaN;
  }
  const parts = value.split(':').map(Number);
  if (parts.length === 1) {
    return parts[0] * 60;
  }
  if (parts.slice(1).some((part) => 60 <= part)) {
    return NaN;
  }
  return parts.reduce((total, part) => total * 60 + part, 0);
}


// `1:23`, `1:02:03`
function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return (hours) ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
