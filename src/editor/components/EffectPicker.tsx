import { Music, Play, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SearchInput } from '@/components/ui/SearchInput';
import { useI18n, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';

import { effectFits } from '../stack';
import type { EditorEffect, EditorGroup, EditorMediaKind } from '../types';
import { isAudioMimetype, isVideoMimetype, prefersReducedMotion } from './media';
import { TabDots, TileCursors, tilePointer, useCursorSend } from './RoomCursors';


const TAB_LABELS: Record<EditorGroup, TranslationKey> = {
  style: 'editor.tab.style',
  distort: 'editor.tab.distort',
  animate: 'editor.tab.animate',
  text: 'editor.tab.text',
  faces: 'editor.tab.faces',
  scenes: 'editor.tab.scenes',
  adjust: 'editor.tab.adjust',
  edit: 'editor.tab.edit',
  draw: 'editor.tab.draw',
  audio: 'editor.tab.audio',
};
// by what someone's after: a look, a warp, motion, words, faces, a scene; then the plain adjustments and edits, things
// placed on the preview, and sound
const GROUPS: ReadonlyArray<EditorGroup> = ['style', 'distort', 'animate', 'text', 'faces', 'scenes', 'adjust', 'edit', 'draw', 'audio'];


// A tile's picture: the effect's commands page preview (the same sample under every effect, so they compare). A video
// one shows its first frame with a play badge, and plays while hovered or focused (never with reduced motion)
function TileThumbnail({ effect, active }: {effect: EditorEffect, active: boolean}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnail = effect.thumbnail;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (active && !prefersReducedMotion()) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active]);

  if (!thumbnail) {
    return (
      <div className='flex aspect-video flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-[#4f545c] bg-deep px-2 text-center'>
        <span className='font-display text-[15px] font-bold text-fg'>{effect.name}</span>
        <span className='text-[11px] text-subtle'>{t('editor.tile.no_preview')}</span>
      </div>
    );
  }

  // an audio effect's preview is a sound, not a picture: its tile says so (it doesn't play on hover)
  if (isAudioMimetype(thumbnail.mimetype)) {
    return (
      <div className='flex aspect-video flex-col items-center justify-center gap-1 rounded-md bg-deep px-2 text-center'>
        <Music aria-hidden className='size-6 text-brand-text'/>
        <span className='font-display text-[13px] font-bold text-fg'>{effect.name}</span>
      </div>
    );
  }

  if (isVideoMimetype(thumbnail.mimetype)) {
    return (
      <div className='relative'>
        <video ref={videoRef} src={thumbnail.url} muted loop playsInline preload='metadata' className='aspect-video w-full rounded-md bg-deep object-cover'/>
        <span aria-hidden className='absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white'>
          <Play className='size-2.5 fill-current'/>
        </span>
      </div>
    );
  }
  return <img src={thumbnail.url} alt='' loading='lazy' draggable={false} className='aspect-video w-full rounded-md bg-deep object-cover'/>;
}


function EffectTile({ effect, tab, onAdd }: {effect: EditorEffect, tab: string, onAdd: (effect: EditorEffect) => void}) {
  const { t } = useI18n();
  const sendCursor = useCursorSend();
  const [ active, setActive ] = useState(false);
  const animated = Boolean(effect.thumbnail && isVideoMimetype(effect.thumbnail.mimetype));
  return (
    <button
      type='button'
      onClick={() => onAdd(effect)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      {...tilePointer(sendCursor, tab, effect.id)}
      aria-label={t('editor.tile.add', {name: (animated) ? t('editor.tile.animated', {name: effect.name}) : effect.name})}
      className='relative flex flex-col gap-1.5 rounded-[10px] border border-line-strong bg-bg p-1.5 text-left transition-colors hover:border-brand focus-visible:border-brand'
    >
      <TileThumbnail effect={effect} active={active}/>
      <span className='flex items-center gap-1.5 px-0.5 pb-0.5 text-[13px] font-semibold text-fg'>
        <span className='min-w-0 truncate'>{effect.name}</span>
        {(effect.ml) ? (
          <span className='inline-flex shrink-0 items-center gap-0.5 rounded bg-surface-3 px-1 text-[10px] font-bold text-brand-text'>
            <Sparkles aria-hidden className='size-2.5'/>{t('editor.tile.ml')}
          </span>
        ) : null}
      </span>
      <TileCursors tab={tab} effect={effect.id}/>
    </button>
  );
}


export function EffectPicker({ effects, kind, hasAudio, onAdd, notes = true }: {
  // the media's own notes (audio needs sound...), left out where they don't apply (a file's effects)
  notes?: boolean,
  effects: Array<EditorEffect>,
  kind: EditorMediaKind,
  hasAudio: boolean,
  onAdd: (effect: EditorEffect) => void,
}) {
  const { t } = useI18n();
  const [ query, setQuery ] = useState('');
  const groups = GROUPS;
  const usable = useMemo(() => effects.filter((effect) => effectFits(effect, kind, hasAudio)), [effects, kind, hasAudio]);
  const enabledGroups = groups.filter((group) => usable.some((effect) => effect.group === group));
  const [ picked, setTab ] = useState<EditorGroup>(() => enabledGroups[0] ?? 'style');
  // the tab that's shown: the picked one while it has effects for this media, the first that does otherwise (what the
  // media is can change under it, a Still Frame makes a video a picture). It used to stay on a tab that was off, empty
  const tab = (enabledGroups.includes(picked)) ? picked : (enabledGroups[0] ?? picked);
  const sendCursor = useCursorSend();

  const search = query.trim().toLowerCase();
  // the page of tiles this is, for the others' pointers: a tile's spot only means something on the same page
  const page = (search) ? 'search' : tab;
  const shown = (search)
    ? usable.filter((effect) => effect.name.toLowerCase().includes(search) || effect.id.includes(search))
    : usable.filter((effect) => effect.group === tab);

  const disabledNote = (kind === 'audio')
    ? t('editor.tab.visual_off')
    : (!enabledGroups.includes('audio')) ? t('editor.tab.audio_off') : null;

  return (
    <section aria-label={t('editor.tabs')} className='flex min-w-0 flex-col gap-3.5' onPointerLeave={() => sendCursor?.(null)}>
      <SearchInput size='sm' value={query} onValueChange={setQuery} placeholder={t('editor.search')} aria-label={t('editor.search')}/>
      {/* ten tabs: two rows of five, every label fits a narrow sidebar */}
      <div role='group' aria-label={t('editor.tabs')} className='grid grid-cols-5 gap-1 rounded-lg bg-deep p-1'>
        {groups.map((group) => {
          const enabled = enabledGroups.includes(group);
          const selected = !search && tab === group;
          return (
            <button
              key={group}
              type='button'
              aria-pressed={selected}
              disabled={!enabled}
              onClick={() => {
                setTab(group);
                setQuery('');
                sendCursor?.({at: 'picker', tab: group, effect: null});
              }}
              className={cn(
                'relative min-h-9 min-w-0 truncate rounded-md px-0.5 text-xs font-semibold transition-colors',
                (selected) ? 'bg-brand text-white' : (enabled) ? 'text-muted hover:text-fg' : 'cursor-not-allowed text-[#72767d]',
              )}
            >
              {t(TAB_LABELS[group])}
              <TabDots tab={group}/>
            </button>
          );
        })}
      </div>
      {(disabledNote && notes) ? <p className='-mt-1 text-xs text-subtle'>{disabledNote}</p> : null}
      {(shown.length) ? (
        <div className='grid grid-cols-2 gap-2.5'>
          {shown.map((effect) => <EffectTile key={effect.id} effect={effect} tab={page} onAdd={onAdd}/>)}
        </div>
      ) : (
        <p className='text-[13px] text-muted'>{t('editor.no_match', {query})}</p>
      )}
    </section>
  );
}
