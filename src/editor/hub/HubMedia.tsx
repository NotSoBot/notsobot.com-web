import { ImageOff, Music } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/i18n';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

import type { HubPreview } from './types';




// A video that only downloads once it's near the screen and only plays while it's on it (muted, looped, inline), so a
// page of cards doesn't pull every video at once. With reduced motion it waits for a tap on its own controls instead
function LazyVideo({ url, className }: {url: string, className?: string}) {
  const ref = useRef<HTMLVideoElement>(null);
  // set once it's been near the screen, the video keeps its source after that so scrolling back doesn't reload it
  const [ near, setNear ] = useState(false);
  const [ still ] = useState(prefersReducedMotion);
  // on screen right now, so a source that arrives while it's showing starts playing
  const showingRef = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    // starts loading a little before it scrolls in
    const loader = new IntersectionObserver(([ entry ]) => {
      if (entry?.isIntersecting) {
        setNear(true);
        loader.disconnect();
      }
    }, {rootMargin: '200px 0px'});
    // plays while at least a third of it is showing
    const player = new IntersectionObserver(([ entry ]) => {
      showingRef.current = Boolean(entry?.isIntersecting);
      if (still) {
        return;
      }
      if (entry?.isIntersecting) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, {threshold: 0.35});
    loader.observe(video);
    player.observe(video);
    return () => {
      loader.disconnect();
      player.disconnect();
    };
  }, [still]);

  useEffect(() => {
    if (near && showingRef.current && !still) {
      ref.current?.play().catch(() => undefined);
    }
  }, [near, still]);

  return (
    <video
      ref={ref}
      src={(near) ? url : undefined}
      muted
      loop
      playsInline
      preload={(near) ? 'auto' : 'none'}
      controls={still}
      aria-hidden={!still}
      className={className}
    />
  );
}


// A hub template's example render, never stretched: it fits its box (`object-contain`) on the dark backdrop. `detail`
// is the bigger view, where audio gets a player
export function HubMedia({ preview, detail = false, className }: {preview: HubPreview | null, detail?: boolean, className?: string}) {
  const { t } = useI18n();
  const [ broken, setBroken ] = useState(false);
  if (!preview || broken) {
    return (
      <span className={cn('flex size-full flex-col items-center justify-center gap-2 text-subtle', className)}>
        <ImageOff aria-hidden className='size-8'/>
        <span className='text-xs'>{t('hub.no_preview')}</span>
      </span>
    );
  }
  if (preview.mimetype.startsWith('audio/')) {
    return (
      <span className={cn('flex size-full flex-col items-center justify-center gap-3 p-4 text-brand-text', className)}>
        <Music aria-hidden className='size-10'/>
        {(detail) ? (
          <audio src={preview.url} controls preload='none' aria-label={t('hub.audio_preview')} className='w-full max-w-sm'/>
        ) : (
          <span className='text-xs text-muted'>{t('hub.audio_preview')}</span>
        )}
      </span>
    );
  }
  if (preview.mimetype.startsWith('video/')) {
    return <LazyVideo url={preview.url} className={cn('size-full object-contain', className)}/>;
  }
  return (
    <img
      src={preview.url}
      alt=''
      loading='lazy'
      decoding='async'
      width={preview.width || undefined}
      height={preview.height || undefined}
      onError={() => setBroken(true)}
      className={cn('size-full object-contain', className)}
    />
  );
}
