import { ChevronDown, ChevronUp, Crown, GripVertical, ListMusic, Music, Pause, Play, SkipForward, Square, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Routes } from '@/config';
import { translate, useI18n, type TranslationKey } from '@/i18n';
import type { GuildMusic, GuildMusicLoop, GuildMusicQueueItem, UserGuild } from '@/lib/api';
import { errorMessage, useGuildMusicMutation, useGuildMusicQuery, useGuildScope, type GuildMusicAction } from '@/lib/api/dashboardQueries';
import { cn, formatNumber } from '@/lib/utils';

import { isSnowflake } from '../tags/tagMeta';
import { Field, Panel, Skeleton, Toggle } from '../ui';
import { EntryMention, useReadOnlyMessage } from './guildMeta';
import {
  MAX_MUSIC_EFFECTS,
  MUSIC_EFFECTS,
  findMusicEffectClash,
  isMusicEffect,
  musicEffectClashReason,
  musicEffectDescription,
  musicEffectName,
} from './musicEffects';
import { RemoveButton } from './ServerSections';


// labels are `music.loop.<value>`
const LOOP_OPTIONS: Array<GuildMusicLoop> = ['off', 'track', 'queue'];


// What NotSoBot is playing in the server and what's queued, like `music queue`. Songs are only added from Discord (the
// bot has to join someone's channel); here the loop, the queue's order, the music settings and the bot's
// pause/skip/stop and live effects can be changed, with Manage Server.
export function MusicSection({ guild }: {guild: UserGuild}) {
  const { t, rich } = useI18n();
  const editable = guild.editable.music;
  const readOnlyMessage = useReadOnlyMessage();
  const toast = useToast();
  const { data: music, isPending, error, dataUpdatedAt } = useGuildMusicQuery(guild.id);
  const mutation = useGuildMusicMutation(guild.id);
  const [ busyKey, setBusyKey ] = useState<string | null>(null);
  const [ confirming, setConfirming ] = useState<'clear' | 'leave' | null>(null);

  // whether it went through
  const run = async (key: string, action: GuildMusicAction, success?: string): Promise<boolean> => {
    setBusyKey(key);
    try {
      await mutation.mutateAsync(action);
      if (success) {
        toast(success);
      }
      return true;
    } catch (error) {
      toast(errorMessage(error, translate('music.error')), 'error');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const queued = music?.queue ?? [];
  // the effects and the speed stay on for the next songs, every time shown is how long it takes to hear at it
  const speed = music?.session?.speed || 1;
  // dragging a song to a new spot, the same move the arrows make. It's shown where it was dropped until the api answers
  const [ droppedOrder, setDroppedOrder ] = useState<Array<string> | null>(null);
  const shown = (droppedOrder) ? orderedBy(queued, droppedOrder) : queued;
  const drag = useDragReorder(shown.length, editable && !mutation.isPending, (from, to) => {
    const item = shown[from];
    const order = shown.map((x) => x.id);
    order.splice(to, 0, ...order.splice(from, 1));
    setDroppedOrder(order);
    void run(item.id, {kind: 'move', itemId: item.id, position: queued[to].position}).finally(() => setDroppedOrder(null));
  });
  const queueDuration = queued.reduce((total, item) => total + (item.track?.duration ?? 0), 0) / speed;
  const unknownLengths = queued.some((item) => !item.track);
  const playing = !!music?.current || !!queued.length;

  return (
    <Panel
      title={t('music.title')}
      accent='#1db954'
      description={t('music.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('music')}
      actions={(music && playing) ? (
        <Segmented
          label={t('music.loop')}
          value={music.loop}
          options={LOOP_OPTIONS.map((value) => ({value, label: t(`music.loop.${value}`)}))}
          disabled={!editable || mutation.isPending}
          onChange={(value) => void run('loop', {kind: 'loop', loop: value as GuildMusicLoop}, t(`music.loop_${value as GuildMusicLoop}`))}
        />
      ) : null}
    >
      {(isPending) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-16 w-full bg-surface-2'/>
          <Skeleton className='h-9 w-full bg-surface-2'/>
        </div>
      ) : (error) ? (
        <p role='alert' className='text-sm text-danger-text'>{errorMessage(error, t('music.load_error'))}</p>
      ) : (!music || !playing) ? (
        <p className='flex items-center gap-2 text-sm text-muted'>
          <Music aria-hidden className='size-4 text-subtle'/>
          {rich('music.nothing', {code: (chunk) => <code className='text-code'>{chunk}</code>})}
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

          {(music.session) ? (
            <LiveEffects music={music} effects={music.session.effects} editable={editable} busyKey={busyKey} disabled={mutation.isPending} run={run}/>
          ) : null}

          <div>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
              <h3 className='text-sm font-semibold text-white'>{t('music.up_next')}</h3>
              <div className='flex items-center gap-3 text-xs text-muted tabular-nums'>
                {(queued.length) ? (
                  <span>{t('music.queued', {count: formatNumber(queued.length), duration: formatTime(queueDuration), more: (unknownLengths) ? '+' : ''})}</span>
                ) : null}
                {(editable && queued.length) ? (
                  <button type='button' className='btn btn-sm btn-ghost' disabled={mutation.isPending} onClick={() => setConfirming('clear')}>{t('common.clear')}</button>
                ) : null}
              </div>
            </div>
            {(queued.length) ? (
              // about 8 songs tall, longer queues scroll inside so the settings below stay close
              <ol ref={drag.listRef} className='max-h-[26rem] space-y-1.5 overflow-y-auto overscroll-contain [scrollbar-width:thin]'>
                {shown.map((item, index) => (
                  <li
                    key={item.id}
                    {...drag.rowProps(index)}
                    className={cn(
                      'flex items-center gap-3 rounded-md border border-line bg-deep py-1.5 pr-1 pl-3',
                      (editable) && 'cursor-grab select-none',
                      (drag.dragging === index) && 'relative z-10 cursor-grabbing border-line-strong shadow-lg',
                    )}
                  >
                    {(editable) ? (
                      // touch drags from here (the rest of the row scrolls the list), a mouse from anywhere on the row
                      <span data-drag-handle aria-hidden className='-mr-2 -ml-2 flex shrink-0 touch-none text-subtle'>
                        <GripVertical className='size-4'/>
                      </span>
                    ) : null}
                    <span className='w-5 shrink-0 text-sm text-subtle tabular-nums'>{queued[index].position}.</span>
                    <TrackCover item={item} className='size-8'/>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm text-fg'>{musicItemTitle(item)}</p>
                      <p className='flex min-w-0 items-center gap-1.5 text-xs text-subtle'>
                        <span className='tabular-nums'>{(item.track) ? formatTime(item.track.duration / speed) : t((item.status === 'converting') ? 'music.converting' : 'music.link')}</span>
                        <span aria-hidden>•</span>
                        <EntryMention type='user' id={item.user_id}/>
                        {(item.batch_id) ? (
                          <>
                            <span aria-hidden>•</span>
                            <span className='truncate'>{t('music.from', {name: item.batch_name || t('music.a_playlist')})}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    {(editable) ? (
                      <div className='flex shrink-0'>
                        <IconButton
                          label={t('music.move_up', {position: item.position})}
                          disabled={mutation.isPending || index === 0}
                          onClick={() => void run(item.id, {kind: 'move', itemId: item.id, position: item.position - 1})}
                        >
                          <ChevronUp aria-hidden className='size-4'/>
                        </IconButton>
                        <IconButton
                          label={t('music.move_down', {position: item.position})}
                          disabled={mutation.isPending || index === shown.length - 1}
                          onClick={() => void run(item.id, {kind: 'move', itemId: item.id, position: item.position + 1})}
                        >
                          <ChevronDown aria-hidden className='size-4'/>
                        </IconButton>
                        <RemoveButton
                          label={t('music.remove', {position: item.position})}
                          busy={busyKey === `remove:${item.id}`}
                          disabled={mutation.isPending}
                          onClick={() => void run(`remove:${item.id}`, {kind: 'remove', itemId: item.id}, t('music.removed'))}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className='text-sm text-muted'>{t((music.loop === 'track') ? 'music.queue_empty_loop' : 'music.queue_empty')}</p>
            )}
          </div>
        </div>
      )}

      {(music) ? (
        <MusicSound music={music} editable={editable} busyKey={busyKey} disabled={mutation.isPending} run={run}/>
      ) : null}

      {(music) ? (
        <MusicSettings guildId={guild.id} music={music} editable={editable} busyKey={busyKey} disabled={mutation.isPending} run={run}/>
      ) : null}

      {(confirming === 'clear') ? (
        <ConfirmDialog
          title={t('music.clear_title')}
          description={t('music.clear_description')}
          confirmLabel={t('music.clear')}
          pending={busyKey === 'clear'}
          onConfirm={async () => {
            await run('clear', {kind: 'clear'}, t('music.cleared'));
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : (confirming === 'leave') ? (
        <ConfirmDialog
          title={t('music.stop_title')}
          description={t('music.stop_description')}
          confirmLabel={t('music.stop')}
          pending={busyKey === 'leave'}
          onConfirm={async () => {
            await run('leave', {kind: 'control', action: 'leave'}, t('music.stopped'));
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </Panel>
  );
}


// what the vote settings make a vote in Discord (someone else's song, half of who's listening), off without DJ mode
// the text is `music.vote.<key>.label`, `.description` and the `.on` / `.off` toasts
const VOTE_SETTINGS: ReadonlyArray<'vote_skip' | 'vote_pause' | 'vote_resume'> = ['vote_skip', 'vote_pause', 'vote_resume'];

// the server's music settings (`music settings` in Discord): who controls the music, the queue's rules and 24/7
function MusicSettings({ guildId, music, editable, busyKey, disabled, run }: {
  guildId: string,
  music: GuildMusic,
  editable: boolean,
  busyKey: string | null,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<boolean>,
}) {
  const { t } = useI18n();
  const locked = !editable || disabled;
  return (
    <div className='mt-4'>
      <h3 className='mb-2 text-sm font-semibold text-white'>{t('music.settings')}</h3>
      <div className='divide-y divide-line rounded-md border border-line bg-deep'>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.fair_queue}
            disabled={locked}
            label={t('music.fair')}
            description={t('music.fair_description')}
            onChange={(value) => void run(
              'fair_queue',
              {kind: 'settings', settings: {fair_queue: value}},
              t((value) ? 'music.fair_on' : 'music.fair_off'),
            )}
          />
        </div>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.dj_only}
            disabled={locked}
            label={t('music.dj')}
            description={t('music.dj_description')}
            onChange={(value) => void run(
              'dj_only',
              {kind: 'settings', settings: {dj_only: value}},
              t((value) ? 'music.dj_on' : 'music.dj_off'),
            )}
          />
          <DjRoleSetting guildId={guildId} music={music} editable={editable} busyKey={busyKey} disabled={disabled} run={run}/>
        </div>
        <div className='px-3 py-2.5'>
          {(music.dj_only) ? (
            <p className='mb-2 text-xs text-subtle'>{t('music.dj_votes')}</p>
          ) : null}
          <div className={cn('space-y-3', music.dj_only && 'opacity-60')}>
            {VOTE_SETTINGS.map((setting) => (
              <Toggle
                key={setting}
                checked={music[setting]}
                disabled={locked || music.dj_only}
                label={t(`music.vote.${setting}.label`)}
                description={t(`music.vote.${setting}.description`)}
                onChange={(value) => void run(
                  setting,
                  {kind: 'settings', settings: {[setting]: value}},
                  t(`music.vote.${setting}.${(value) ? 'on' : 'off'}` as TranslationKey),
                )}
              />
            ))}
          </div>
        </div>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.no_duplicates}
            disabled={locked}
            label={t('music.duplicates')}
            description={t('music.duplicates_description')}
            onChange={(value) => void run(
              'no_duplicates',
              {kind: 'settings', settings: {no_duplicates: value}},
              t((value) ? 'music.duplicates_on' : 'music.duplicates_off'),
            )}
          />
        </div>
        <MaxDurationSetting music={music} editable={editable} busy={busyKey === 'max_duration'} disabled={disabled} run={run}/>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.stay}
            disabled={locked}
            label={t('music.stay')}
            description={t('music.stay_description')}
            onChange={(value) => void run(
              'stay',
              {kind: 'settings', settings: {stay: value}},
              t((value) ? 'music.stay_on' : 'music.stay_off'),
            )}
          />
          {(!music.premium) ? (
            <PremiumNote>{t('music.stay_premium')}</PremiumNote>
          ) : null}
        </div>
        <div className='px-3 py-2.5'>
          <Toggle
            checked={music.pause_alone}
            disabled={locked || !music.stay}
            label={t('music.pause_alone')}
            description={t('music.pause_alone_description')}
            onChange={(value) => void run(
              'pause_alone',
              {kind: 'settings', settings: {pause_alone: value}},
              t((value) ? 'music.pause_alone_on' : 'music.pause_alone_off'),
            )}
          />
        </div>
        <CrossfadeSetting music={music} editable={editable} busy={busyKey === 'crossfade'} run={run}/>
        <p className='flex items-center gap-2 px-3 py-2.5 text-xs text-subtle'>
          <ListMusic aria-hidden className='size-3.5 shrink-0'/>
          <span>{t((music.premium) ? 'music.queue_limit' : 'music.queue_limit_free', {count: formatNumber(music.queue_limit)})}</span>
        </p>
      </div>
    </div>
  );
}


// the role that makes people DJs. The API doesn't list a server's roles so it's an ID, like the rules. With none picked,
// roles with "NotSoMusic" in their name count. Never @everyone (its ID is the server's), that's DJ mode off
function DjRoleSetting({ guildId, music, editable, busyKey, disabled, run }: {
  guildId: string,
  music: GuildMusic,
  editable: boolean,
  busyKey: string | null,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<boolean>,
}) {
  const { t } = useI18n();
  const saved = music.dj_role_id ?? '';
  const [ draft, setDraft ] = useState(saved);
  // it's fetched again every few seconds, only a change from somewhere else replaces what's typed
  useEffect(() => setDraft(saved), [saved]);

  const everyone = draft === guildId;
  const valid = isSnowflake(draft) && !everyone;
  const changed = draft !== saved;

  return (
    <form
      className='mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (editable && !disabled && valid && changed) {
          void run('dj_role', {kind: 'settings', settings: {dj_role_id: draft}}, t('music.dj_changed'));
        }
      }}
    >
      <Field
        className='flex-1'
        label={t('music.dj_role')}
        hint={t((saved) ? 'music.dj_role_hint' : 'music.dj_role_none_hint')}
        error={(everyone) ? t('music.dj_everyone') : (draft && !isSnowflake(draft)) ? t('rules.bad_id') : null}
      >
        {(props) => (
          <input
            {...props}
            className='input font-mono'
            inputMode='numeric'
            placeholder={t('music.none')}
            value={draft}
            disabled={!editable}
            onChange={(event) => setDraft(event.target.value.replace(/[<>@&!\s]/g, ''))}
            autoComplete='off'
          />
        )}
      </Field>
      {(editable) ? (
        <button type='submit' className='btn btn-secondary shrink-0 sm:mt-[1.625rem] sm:h-[2.375rem]' disabled={disabled || !valid || !changed}>
          {(busyKey === 'dj_role') ? <Spinner className='size-4'/> : null}
          {t((saved) ? 'music.change' : 'music.pick')}
        </button>
      ) : null}
      {(editable && saved) ? (
        <button
          type='button'
          className='btn btn-ghost shrink-0 sm:mt-[1.625rem] sm:h-[2.375rem]'
          disabled={disabled}
          onClick={() => void run('dj_role-none', {kind: 'settings', settings: {dj_role_id: null}}, t('music.dj_none'))}
        >
          {(busyKey === 'dj_role-none') ? <Spinner className='size-4'/> : null}
          {t('music.none')}
        </button>
      ) : null}
    </form>
  );
}


// how many seconds the end of a song fades into the next, saved a moment after the slider stops moving. It stays usable
// while that's sent so a few arrow key presses in a row all count
function CrossfadeSetting({ music, editable, busy, run }: {
  music: GuildMusic,
  editable: boolean,
  busy: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<boolean>,
}) {
  const { t } = useI18n();
  const id = useId();
  const [ draft, setDraft ] = useState(music.crossfade);
  // it's fetched again every few seconds, only a change from somewhere else moves the slider
  useEffect(() => setDraft(music.crossfade), [music.crossfade]);

  // back to the saved one if it fails. `run` is made again every render, only a new value schedules a save
  useEffect(() => {
    if (draft === music.crossfade) {
      return;
    }
    const saved = music.crossfade;
    const timeout = setTimeout(() => {
      void run(
        'crossfade',
        {kind: 'settings', settings: {crossfade: draft}},
        (draft) ? translate('music.crossfade_on', {seconds: draft}) : translate('music.crossfade_off'),
      ).then((ok) => {
        if (!ok) {
          setDraft(saved);
        }
      });
    }, CROSSFADE_SAVE_DELAY);
    return () => clearTimeout(timeout);
  }, [draft, music.crossfade]);

  return (
    <div className='px-3 py-2.5'>
      <div className='flex items-baseline justify-between gap-4'>
        <label htmlFor={id} className='text-sm font-medium text-fg'>{t('music.crossfade')}</label>
        <span className='flex items-center gap-1.5 text-sm text-fg tabular-nums'>
          {(busy) ? <Spinner className='size-3.5'/> : null}
          {(draft) ? `${draft}s` : t('music.off')}
        </span>
      </div>
      <p className='mt-0.5 text-xs text-subtle'>{t('music.crossfade_description')}</p>
      <input
        id={id}
        type='range'
        min={0}
        max={MAX_CROSSFADE}
        step={1}
        value={draft}
        disabled={!editable}
        aria-valuetext={(draft) ? t('music.seconds', {count: draft}) : t('music.off')}
        onChange={(event) => setDraft(Number(event.target.value))}
        className='mt-2 w-full cursor-pointer accent-[#1db954] disabled:cursor-not-allowed disabled:opacity-60'
      />
      <div aria-hidden className='flex justify-between text-xs text-subtle'>
        <span>{t('music.off')}</span>
        <span>{MAX_CROSSFADE}s</span>
      </div>
      {(!music.premium) ? (
        <PremiumNote>{t('music.crossfade_premium')}</PremiumNote>
      ) : null}
    </div>
  );
}


// the live effects on what's playing (`music effect` in Discord), stacked in order. The bot puts them on, so a change
// shows a moment later. Ones that don't stack with what's on can't be picked (the bot leaves them out anyway). Putting
// one on is a premium perk, taking them off never is
function LiveEffects({ music, effects, editable, busyKey, disabled, run }: {
  music: GuildMusic,
  effects: Array<string>,
  editable: boolean,
  busyKey: string | null,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<boolean>,
}) {
  const { t } = useI18n();
  const id = useId();
  const [ picked, setPicked ] = useState('');
  const full = MAX_MUSIC_EFFECTS <= effects.length;
  const canAdd = music.premium && !full;
  // someone else may have put on one it clashes with meanwhile
  const addable = canAdd && isMusicEffect(picked) && !findMusicEffectClash(picked, effects);

  return (
    <div>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-white'>{t('music.effects')}</h3>
        <div className='flex items-center gap-3 text-xs text-muted tabular-nums'>
          <span>{t('music.effects_count', {count: effects.length, max: MAX_MUSIC_EFFECTS})}</span>
          {(editable && effects.length) ? (
            <button
              type='button'
              className='btn btn-sm btn-ghost'
              disabled={disabled}
              onClick={() => void run('effect_clear', {kind: 'effect', control: {action: 'effect_clear'}}, t('music.effects_cleared'))}
            >
              {(busyKey === 'effect_clear') ? <Spinner className='size-3.5'/> : null}
              {t('common.clear')}
            </button>
          ) : null}
        </div>
      </div>
      {(effects.length) ? (
        // unnumbered, the node runs them in its own order whatever order they were picked in
        <ul className='flex flex-wrap gap-1.5'>
          {effects.map((effect, index) => (
            <li
              key={`${index}:${effect}`}
              title={musicEffectDescription(effect) ?? undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[#1db954]/40 bg-[#1db954]/10 py-0.5 pl-2.5 text-sm text-fg',
                (editable) ? 'pr-1' : 'pr-2.5',
              )}
            >
              <span>{musicEffectName(effect)}</span>
              {(editable) ? (
                <button
                  type='button'
                  aria-label={t('music.effect_remove', {effect: musicEffectName(effect)})}
                  title={t('music.effect_remove', {effect: musicEffectName(effect)})}
                  disabled={disabled}
                  onClick={() => void run(
                    `effect_remove:${index}`,
                    {kind: 'effect', control: {action: 'effect_remove', effect, index}},
                    t('music.effect_removed', {effect: musicEffectName(effect)}),
                  )}
                  className='flex size-5 cursor-pointer items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface-3 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {(busyKey === `effect_remove:${index}`) ? <Spinner className='size-3'/> : <X aria-hidden className='size-3.5'/>}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted'>{t('music.effects_none')}</p>
      )}
      {(editable) ? (
        <form
          className='mt-2 flex gap-2'
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            if (disabled || !addable) {
              return;
            }
            void run(
              'effect_add',
              {kind: 'effect', control: {action: 'effect_add', effect: picked}},
              t('music.effect_added', {effect: musicEffectName(picked)}),
            ).then((ok) => {
              if (ok) {
                setPicked('');
              }
            });
          }}
        >
          <label htmlFor={id} className='sr-only'>{t('music.effect_add_label')}</label>
          <select id={id} className='input min-w-0 flex-1' value={picked} disabled={!canAdd} onChange={(event) => setPicked(event.target.value)}>
            <option value=''>{(full) ? t('music.effects_full', {max: MAX_MUSIC_EFFECTS}) : t('music.effect_pick')}</option>
            {MUSIC_EFFECTS.map((effect) => {
              const clash = findMusicEffectClash(effect, effects);
              return (
                <option key={effect} value={effect} disabled={!!clash} title={(clash) ? musicEffectClashReason(effect, clash) : undefined}>
                  {musicEffectName(effect)} — {(clash) ? t('music.effect_clashes', {other: musicEffectName(clash)}) : musicEffectDescription(effect)}
                </option>
              );
            })}
          </select>
          <button type='submit' className='btn btn-secondary shrink-0' disabled={disabled || !addable}>
            {(busyKey === 'effect_add') ? <Spinner className='size-4'/> : null}
            {t('music.effect_add')}
          </button>
        </form>
      ) : null}
      {(!music.premium) ? (
        <PremiumNote>{t('music.effects_premium')}</PremiumNote>
      ) : null}
      <p className='mt-2 text-xs text-subtle'>{t('music.effects_hint')}</p>
    </div>
  );
}


const MIN_MUSIC_SPEED = 50;
const MAX_MUSIC_SPEED = 200;
const MAX_MUSIC_VOLUME = 200;

// the speed (the pitch kept, `music speed`) and volume (`music volume`) for everyone listening. They're the server's:
// with nothing playing they're what the next session starts with. Anything but 100% needs premium, back to it never does
function MusicSound({ music, editable, busyKey, disabled, run }: {
  music: GuildMusic,
  editable: boolean,
  busyKey: string | null,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<boolean>,
}) {
  const { t } = useI18n();
  // a playing session's are what's heard, the saved ones otherwise
  const tempo = music.session?.tempo ?? music.sound?.tempo ?? 100;
  const volume = music.session?.volume ?? music.sound?.volume ?? 100;
  const set = (action: 'speed' | 'volume', value: number) => run(
    action,
    {kind: 'sound', control: {action, value}},
    (action === 'speed') ? t('music.speed_set', {speed: speedText(value)}) : t('music.volume_set', {volume: `${value}%`}),
  );

  return (
    <div className='mt-5'>
      <h3 className='mb-2 text-sm font-semibold text-white'>{t('music.sound')}</h3>
      <div className='space-y-3'>
        <SoundSlider
          label={t('music.speed_label')}
          value={tempo}
          min={MIN_MUSIC_SPEED}
          max={MAX_MUSIC_SPEED}
          format={speedText}
          editable={editable && music.premium}
          resettable={editable}
          busy={busyKey === 'speed'}
          disabled={disabled}
          onCommit={(value) => set('speed', value)}
        />
        <SoundSlider
          label={t('music.volume_label')}
          value={volume}
          min={0}
          max={MAX_MUSIC_VOLUME}
          format={(value) => `${value}%`}
          editable={editable && music.premium}
          resettable={editable}
          busy={busyKey === 'volume'}
          disabled={disabled}
          onCommit={(value) => set('volume', value)}
        />
      </div>
      {(!music.premium) ? (
        <PremiumNote>{t('music.sound_premium')}</PremiumNote>
      ) : null}
      <p className='mt-2 text-xs text-subtle'>{t('music.sound_hint')}</p>
    </div>
  );
}

function speedText(percent: number): string {
  return `${percent / 100}×`;
}

// a percent slider, 100 is normal. It's sent once it's let go of (or a key's let go), not every step on the way, and
// shows where it was left until the server's caught up. `resettable` puts it back to 100 without `editable` (premium)
function SoundSlider({ label, value, min, max, format, editable, resettable, busy, disabled, onCommit }: {
  label: string,
  value: number,
  min: number,
  max: number,
  format: (value: number) => string,
  editable: boolean,
  resettable: boolean,
  busy: boolean,
  disabled: boolean,
  onCommit: (value: number) => Promise<boolean>,
}) {
  const { t } = useI18n();
  const id = useId();
  const [ draft, setDraft ] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (next: number) => {
    if (next === value) {
      return;
    }
    void onCommit(next).then((done) => {
      if (!done) {
        setDraft(value);
      }
    });
  };

  return (
    <div className='flex items-center gap-3'>
      <label htmlFor={id} className='w-16 shrink-0 text-sm text-muted'>{label}</label>
      <input
        id={id}
        type='range'
        min={min}
        max={max}
        step={5}
        value={draft}
        disabled={!editable || disabled}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={(event) => commit(Number(event.currentTarget.value))}
        onKeyUp={(event) => commit(Number(event.currentTarget.value))}
        className='h-1.5 min-w-0 flex-1 cursor-pointer accent-[#1db954] disabled:cursor-not-allowed disabled:opacity-50'
      />
      <span className='w-12 shrink-0 text-right text-sm text-fg tabular-nums'>
        {(busy) ? <Spinner className='ml-auto size-3.5'/> : format(draft)}
      </span>
      <button
        type='button'
        className='btn btn-sm btn-ghost shrink-0'
        disabled={!resettable || disabled || (draft === 100 && value === 100)}
        onClick={() => {
          setDraft(100);
          commit(100);
        }}
      >
        {t('music.sound_reset')}
      </button>
    </div>
  );
}

// a music setting that's kept without premium but only does anything with it. Staff (the admin server modal) can't use
// their own premium slots on someone's server, the Music access feature counts instead
function PremiumNote({ children }: {children: ReactNode}) {
  const { t } = useI18n();
  const staff = useGuildScope() === 'admin';
  return (
    <p className='mt-2 flex items-start gap-2 rounded-md border border-[#f0b232]/30 bg-[#f0b232]/10 px-3 py-2 text-xs text-fg'>
      <Crown aria-hidden className='mt-px size-3.5 shrink-0 text-[#f0b232]'/>
      <span>
        {children}{' '}
        {(staff) ? (
          t('music.premium_feature')
        ) : (
          <Link to={Routes.DASHBOARD_PREMIUM} className='text-brand-text hover:underline'>{t('music.give_slot')}</Link>
        )}
      </span>
    </p>
  );
}


// the longest song that can be queued, typed as `m:ss` (or `h:mm:ss`), empty for no limit
function MaxDurationSetting({ music, editable, busy, disabled, run }: {
  music: GuildMusic,
  editable: boolean,
  busy: boolean,
  disabled: boolean,
  run: (key: string, action: GuildMusicAction, success?: string) => Promise<boolean>,
}) {
  const { t } = useI18n();
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
          (seconds) ? t('music.max_on', {length: formatTime(seconds * 1000)}) : t('music.max_off'),
        );
      }}
    >
      <Field
        className='flex-1'
        label={t('music.max')}
        hint={t('music.max_hint')}
        error={(invalid) ? t('music.max_invalid') : (tooLong) ? t('music.max_too_long') : null}
      >
        {(props) => (
          <input
            {...props}
            className='input font-mono tabular-nums sm:max-w-[12rem]'
            inputMode='numeric'
            placeholder={t('music.no_limit')}
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
          {t('common.save')}
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
  const { t, rich } = useI18n();
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
  // the song's own time moves on at the effects' and the speed's pace, the times shown are how long it takes to hear
  const speed = session?.speed || 1;
  const elapsed = (session && !paused) ? Math.max(now - fetchedAt, 0) * speed : 0;
  const position = Math.min((session?.position ?? 0) + elapsed, duration || Infinity);
  const ratio = (duration) ? Math.min(position / duration, 1) : 0;
  const tempo = session?.tempo ?? 100;

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
            <span>{t((!session) ? 'music.not_in_voice' : (paused) ? 'music.paused' : 'music.playing')}</span>
            {(tempo !== 100) ? <><span aria-hidden>•</span><span className='tabular-nums'>{t('music.speed', {speed: `${tempo / 100}×`})}</span></> : null}
            <span aria-hidden>•</span>
            <span className='inline-flex items-center gap-1'>{rich('music.requested_by', {user: () => <EntryMention type='user' id={item.user_id}/>})}</span>
          </p>
        </div>
        {(editable && session) ? (
          <div className='flex shrink-0'>
            <IconButton label={t((paused) ? 'music.resume' : 'music.pause')} disabled={disabled} onClick={() => onControl((paused) ? 'resume' : 'pause')}>
              {(busyKey === 'pause' || busyKey === 'resume') ? <Spinner className='size-3.5'/> : (paused) ? <Play aria-hidden className='size-4'/> : <Pause aria-hidden className='size-4'/>}
            </IconButton>
            <IconButton label={t('music.skip')} disabled={disabled} onClick={() => onControl('skip')}>
              {(busyKey === 'skip') ? <Spinner className='size-3.5'/> : <SkipForward aria-hidden className='size-4'/>}
            </IconButton>
            <IconButton label={t('music.stop')} danger disabled={disabled} onClick={() => onControl('leave')}>
              <Square aria-hidden className='size-3.5'/>
            </IconButton>
          </div>
        ) : null}
      </div>
      {(duration) ? (
        <div className='mt-3 flex items-center gap-2 text-xs text-subtle tabular-nums'>
          <span className='w-10 text-right'>{formatTime(position / speed)}</span>
          <div
            role='progressbar'
            aria-label={t('music.progress')}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration / speed / 1000)}
            aria-valuenow={Math.round(position / speed / 1000)}
            className='h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3'
          >
            <div className={cn('h-full rounded-full', (paused) ? 'bg-subtle' : 'bg-[#1db954]')} style={{width: `${ratio * 100}%`}}/>
          </div>
          <span className='w-10'>{formatTime(duration / speed)}</span>
        </div>
      ) : null}
    </div>
  );
}


// `items` in the order of `ids` (a drop's, before the api answers), any it doesn't name after them
function orderedBy<T extends {id: string}>(items: Array<T>, ids: Array<string>): Array<T> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = ids.map((id) => byId.get(id)).filter((item): item is T => !!item);
  return [...ordered, ...items.filter((item) => !ids.includes(item.id))];
}

// how far the pointer goes before a press is a drag (so clicks still click), and the list's edge where it scrolls
const DRAG_THRESHOLD = 5;
const DRAG_SCROLL_EDGE = 40;

interface DragState {
  from: number,
  over: number,
  // the row's own move, the pointer's plus how far the list scrolled
  offset: number,
}

// a list's rows dragged to a new spot with the pointer: the row follows it and the others make room, `onDrop(from, to)`
// on letting go somewhere new. A mouse drags from anywhere on a row but its buttons and links, touch and pens only from
// its `data-drag-handle` (anywhere else scrolls the list). The list scrolls itself near its top and bottom
function useDragReorder(count: number, enabled: boolean, onDrop: (from: number, to: number) => void) {
  const listRef = useRef<HTMLOListElement>(null);
  const [ state, setState ] = useState<DragState | null>(null);
  // the room the dragged row takes (its height and the gap after it), measured when it's picked up
  const roomRef = useRef(0);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const start = (index: number, event: ReactPointerEvent<HTMLLIElement>) => {
    const list = listRef.current;
    const target = event.target as HTMLElement;
    if (!enabled || !list || event.button !== 0 || target.closest('button, a, input, [role=button]')) {
      return;
    }
    if (event.pointerType !== 'mouse' && !target.closest('[data-drag-handle]')) {
      return;
    }
    // no text selection while dragging
    event.preventDefault();
    const rows = Array.from(list.children) as Array<HTMLElement>;
    const listTop = list.getBoundingClientRect().top - list.scrollTop;
    // each row's middle and the room the dragged one takes (its height and the gap), in the list's own coordinates
    const middles = rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return rect.top - listTop + rect.height / 2;
    });
    const step = (rows.length > 1) ? middles[1] - middles[0] : 0;
    const room = rows[index].getBoundingClientRect().height + ((rows.length > 1) ? step - (rows[0].getBoundingClientRect().height + rows[1].getBoundingClientRect().height) / 2 : 0);
    const startY = event.clientY, startScroll = list.scrollTop;
    let active = false, current: DragState = {from: index, offset: 0, over: index};

    const update = (clientY: number) => {
      const offset = clientY - startY + list.scrollTop - startScroll;
      const middle = middles[index] + offset;
      let over = 0;
      for (let i = 1; i < middles.length; i++) {
        if (Math.abs(middle - middles[i]) < Math.abs(middle - middles[over])) {
          over = i;
        }
      }
      current = {from: index, offset, over};
      setState(current);
    };
    const move = (moved: PointerEvent) => {
      if (moved.pointerId !== event.pointerId) {
        return;
      }
      if (!active && Math.abs(moved.clientY - startY) < DRAG_THRESHOLD) {
        return;
      }
      active = true;
      const rect = list.getBoundingClientRect();
      if (moved.clientY < rect.top + DRAG_SCROLL_EDGE) {
        list.scrollTop -= 10;
      } else if (rect.bottom - DRAG_SCROLL_EDGE < moved.clientY) {
        list.scrollTop += 10;
      }
      update(moved.clientY);
    };
    const end = (ended: PointerEvent) => {
      if (ended.pointerId !== event.pointerId) {
        return;
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setState(null);
      if (active && ended.type === 'pointerup' && current.over !== current.from) {
        dropRef.current(current.from, current.over);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    roomRef.current = room;
  };

  const rowProps = (index: number): {onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void, style?: CSSProperties} => {
    const onPointerDown = (event: ReactPointerEvent<HTMLLIElement>) => start(index, event);
    if (!state) {
      return {onPointerDown};
    }
    const room = roomRef.current;
    if (index === state.from) {
      return {onPointerDown, style: {transform: `translateY(${state.offset}px)`}};
    }
    // the rows between where it was and where it'd go make room for it
    let shift = 0;
    if (state.from < index && index <= state.over) {
      shift = -room;
    } else if (state.over <= index && index < state.from) {
      shift = room;
    }
    return {onPointerDown, style: {transform: `translateY(${shift}px)`, transition: 'transform 150ms ease'}};
  };

  return {dragging: (state && state.from < count) ? state.from : null, listRef, rowProps};
}


// what a song shows as, a queue item or a music stats entry
export type MusicItemLike = Pick<GuildMusicQueueItem, 'source' | 'track' | 'url'>;

export function TrackCover({ item, className }: {item: MusicItemLike, className?: string}) {
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
        (danger) ? 'hover:text-danger-text' : 'hover:text-white',
      )}
    >
      {children}
    </button>
  );
}


// `artist - title` like the bot, a link that isn't converted yet by its file name
export function musicItemTitle(item: MusicItemLike): string {
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


// the longest crossfade (seconds), the API's cap
const MAX_CROSSFADE = 12;
// how long the crossfade slider waits after it last moved to save (milliseconds)
const CROSSFADE_SAVE_DELAY = 600;

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
