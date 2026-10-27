import { ArrowDown, ArrowRight, Pause, Play, Plus, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

import { ImageComparison } from '@/components/ui/ImageComparison';
import { Segmented } from '@/components/ui/Segmented';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';
import { CommandMediaTypes, type Command, type CommandMedia } from '@/lib/api';
import { cn } from '@/lib/utils';


type MediaKind = 'audio' | 'image' | 'video';

function mediaKind(media: CommandMedia): MediaKind {
  if (media.mimetype.startsWith('audio/')) {
    return 'audio';
  }
  return (media.mimetype.startsWith('video/')) ? 'video' : 'image';
}

// how far apart the input's and result's shapes can be and still share the slider (wave adds a few pixels of wobble)
const SLIDER_SHAPE_TOLERANCE = 0.05;

function sameShape(a: CommandMedia, b: CommandMedia): boolean {
  if (!a.width || !a.height || !b.width || !b.height) {
    return false;
  }
  const ratio = b.width / b.height;
  return Math.abs(a.width / a.height - ratio) / ratio <= SLIDER_SHAPE_TOLERANCE;
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

// one sound at a time across every preview player
let playingMedia: HTMLMediaElement | null = null;

function claimPlayback(element: HTMLMediaElement) {
  if (playingMedia && playingMedia !== element) {
    playingMedia.pause();
  }
  playingMedia = element;
}


// The command's before/after (see `CommandMedia`): a slider for an image that keeps its shape, an Original/Result
// switch for audio, inputs → result for everything else (a different shape, video, several inputs), and only the
// result for commands that make their media from nothing (`media.i.create.*`)
export function CommandPreview({ command, example }: {command: Command, example?: string | null}) {
  const { rich } = useI18n();
  const inputs = command.media
    .filter((media) => media.type === CommandMediaTypes.BEFORE)
    .sort((a, b) => a.position - b.position);
  const result = command.media.find((media) => media.type === CommandMediaTypes.AFTER);
  if (!result) {
    return null;
  }

  let body;
  const [ input ] = inputs;
  if (!inputs.length) {
    body = <Tile media={result}/>;
  } else if (inputs.length === 1 && mediaKind(input) === 'image' && mediaKind(result) === 'image' && sameShape(input, result)) {
    body = <ImageComparison before={input.url} after={result.url} aspectRatio={result.width / result.height}/>;
  } else if (inputs.length === 1 && mediaKind(input) === 'audio' && mediaKind(result) === 'audio') {
    body = <AudioComparison before={input} after={result}/>;
  } else {
    body = <InputsToResult inputs={inputs} result={result}/>;
  }

  return (
    <div className='space-y-2'>
      {body}
      {(example) ? (
        <p className='text-xs text-subtle'>{rich('commands.preview.made_with', {code: (chunk) => <code className='font-mono text-code'>{chunk}</code>}, {example})}</p>
      ) : null}
    </div>
  );
}


function InputsToResult({ inputs, result }: {inputs: Array<CommandMedia>, result: CommandMedia}) {
  const { t } = useI18n();
  // one picture in and one out sit side by side, audio rows and several inputs stack
  const sideBySide = inputs.length === 1 && [inputs[0], result].every((media) => mediaKind(media) !== 'audio');
  if (sideBySide) {
    return (
      <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3'>
        <Tile label={t('commands.preview.before')} media={inputs[0]}/>
        <ArrowRight aria-hidden className='size-5 text-subtle'/>
        <Tile label={t('commands.preview.after')} media={result}/>
      </div>
    );
  }
  return (
    <div className='space-y-2'>
      {inputs.map((media, i) => (
        <div key={media.position} className='space-y-2'>
          {(i) ? <Plus aria-hidden className='mx-auto size-4 text-subtle'/> : null}
          <Tile label={t('commands.preview.input', {number: i + 1})} media={media} compact/>
        </div>
      ))}
      <ArrowDown aria-hidden className='mx-auto size-5 text-subtle'/>
      <Tile label={t('commands.preview.result')} media={result} compact/>
    </div>
  );
}


// `label` is left out when the result is all there is
function Tile({ label, media, compact = false }: {label?: string, media: CommandMedia, compact?: boolean}) {
  const { t } = useI18n();
  const kind = mediaKind(media);
  const visual = cn('w-full rounded border border-line bg-deep object-contain', (compact) ? 'max-h-56' : 'max-h-72');
  const name = label || t('commands.preview.result');
  return (
    <figure className='min-w-0 space-y-1'>
      {(label) ? <figcaption className='text-xs text-muted'>{label}</figcaption> : null}
      {(kind === 'audio') ? <AudioPlayer media={media} label={name}/> : null}
      {(kind === 'video') ? <LoopingVideo media={media} label={name} className={visual}/> : null}
      {(kind === 'image') ? (
        <img src={media.url} alt={name} loading='lazy' width={media.width || undefined} height={media.height || undefined} className={visual}/>
      ) : null}
    </figure>
  );
}


// plays muted on a loop like a gif, only while it's on screen; with reduced motion it waits for the controls
function LoopingVideo({ media, label, className }: {media: CommandMedia, label: string, className?: string}) {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [ muted, setMuted ] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video || reducedMotion) {
      return;
    }
    const observer = new IntersectionObserver(([ entry ]) => {
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const toggleSound = () => {
    const video = ref.current;
    if (video) {
      video.muted = !muted;
      if (!video.muted) {
        claimPlayback(video);
        video.play().catch(() => {});
      }
    }
    setMuted(!muted);
  };

  return (
    <div className='relative'>
      <video
        ref={ref}
        src={media.url}
        aria-label={label}
        muted={muted}
        loop
        playsInline
        preload='metadata'
        controls={reducedMotion}
        width={media.width || undefined}
        height={media.height || undefined}
        className={className}
      />
      {(reducedMotion) ? null : (
        <button
          type='button'
          aria-label={t((muted) ? 'commands.preview.unmute' : 'commands.preview.mute', {label})}
          aria-pressed={!muted}
          onClick={toggleSound}
          className='absolute right-2 bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90'
        >
          {(muted) ? <VolumeX className='size-4'/> : <Volume2 className='size-4'/>}
        </button>
      )}
    </div>
  );
}


function PlayButton({ playing, label, onClick }: {playing: boolean, label: string, onClick: () => void}) {
  const { t } = useI18n();
  return (
    <button
      type='button'
      aria-label={t((playing) ? 'commands.preview.pause' : 'commands.preview.play', {label})}
      onClick={onClick}
      className='flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white transition-opacity hover:opacity-90'
    >
      {(playing) ? <Pause className='size-4'/> : <Play className='size-4 translate-x-px'/>}
    </button>
  );
}

function Scrubber({ time, duration, label, onSeek }: {time: number, duration: number, label: string, onSeek: (time: number) => void}) {
  const { t } = useI18n();
  return (
    <>
      <input
        type='range'
        aria-label={t('commands.preview.position', {label})}
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(time, duration || 0)}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        className='h-1 min-w-0 flex-1 cursor-pointer accent-brand'
      />
      <span className='shrink-0 text-xs text-muted tabular-nums'>{formatTime(time)} / {formatTime(duration)}</span>
    </>
  );
}


function AudioPlayer({ media, label }: {media: CommandMedia, label: string}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [ playing, setPlaying ] = useState(false);
  const [ time, setTime ] = useState(0);
  const duration = media.duration / 1000;

  const toggle = () => {
    const audio = ref.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      claimPlayback(audio);
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  return (
    <div className='flex items-center gap-3 rounded border border-line bg-deep px-3 py-2'>
      <PlayButton playing={playing} label={label} onClick={toggle}/>
      <Scrubber
        time={time}
        duration={duration}
        label={label}
        onSeek={(value) => {
          if (ref.current) {
            ref.current.currentTime = value;
          }
          setTime(value);
        }}
      />
      <audio
        ref={ref}
        src={media.url}
        preload='metadata'
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setTime(0)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
      />
    </div>
  );
}


type Side = 'before' | 'after';

// one player for both: switching keeps the same moment, so the difference is heard right away
function AudioComparison({ before, after }: {before: CommandMedia, after: CommandMedia}) {
  const { t } = useI18n();
  const refs = {after: useRef<HTMLAudioElement>(null), before: useRef<HTMLAudioElement>(null)};
  // what the media events check, it changes before the old side is paused so that pause isn't taken as a stop
  const sideRef = useRef<Side>('after');
  const [ side, setSide ] = useState<Side>('after');
  const [ playing, setPlaying ] = useState(false);
  const [ time, setTime ] = useState(0);
  const duration = ((side === 'after') ? after : before).duration / 1000;

  const isActive = (event: SyntheticEvent<HTMLAudioElement>) => event.currentTarget === refs[sideRef.current].current;

  const toggle = () => {
    const audio = refs[sideRef.current].current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      claimPlayback(audio);
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const switchTo = (next: Side) => {
    const from = refs[sideRef.current].current;
    const to = refs[next].current;
    if (next === sideRef.current || !from || !to) {
      return;
    }
    const wasPlaying = !from.paused;
    sideRef.current = next;
    setSide(next);
    from.pause();
    const end = ((next === 'after') ? after : before).duration / 1000;
    to.currentTime = Math.min(from.currentTime, Math.max(0, end - 0.05));
    setTime(to.currentTime);
    if (wasPlaying) {
      claimPlayback(to);
      to.play().catch(() => {});
    }
  };

  const audioProps = {
    preload: 'metadata',
    onPlay: (event: SyntheticEvent<HTMLAudioElement>) => isActive(event) && setPlaying(true),
    onPause: (event: SyntheticEvent<HTMLAudioElement>) => isActive(event) && setPlaying(false),
    onEnded: (event: SyntheticEvent<HTMLAudioElement>) => isActive(event) && setTime(0),
    onTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => isActive(event) && setTime(event.currentTarget.currentTime),
  } as const;

  return (
    <div className='space-y-3 rounded border border-line bg-deep p-3'>
      <Segmented
        label={t('commands.preview.listen_to')}
        value={side}
        options={[{value: 'before', label: t('commands.preview.original')}, {value: 'after', label: t('commands.preview.result')}]}
        onChange={(value) => switchTo(value as Side)}
      />
      <div className='flex items-center gap-3'>
        <PlayButton playing={playing} label={t((side === 'after') ? 'commands.preview.the_result' : 'commands.preview.the_original')} onClick={toggle}/>
        <Scrubber
          time={time}
          duration={duration}
          label={t((side === 'after') ? 'commands.preview.result' : 'commands.preview.original')}
          onSeek={(value) => {
            const audio = refs[sideRef.current].current;
            if (audio) {
              audio.currentTime = value;
            }
            setTime(value);
          }}
        />
      </div>
      <audio ref={refs.before} src={before.url} {...audioProps}/>
      <audio ref={refs.after} src={after.url} {...audioProps}/>
    </div>
  );
}
