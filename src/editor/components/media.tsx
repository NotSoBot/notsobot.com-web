import { forwardRef, useEffect, useRef, type CSSProperties } from 'react';

import { cn } from '@/lib/utils';


export function isVideoMimetype(mimetype: string | undefined): boolean {
  return Boolean(mimetype?.startsWith('video/'));
}

export function isAudioMimetype(mimetype: string | undefined): boolean {
  return Boolean(mimetype?.startsWith('audio/'));
}


export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}


// A preview or proxy: video loops muted (previews have no sound worth hearing on loop), audio gets controls, anything
// else is an image. `seekTo` (seconds) pauses a video on that time, the frame scrubber's instant view
export const MediaView = forwardRef<HTMLElement, {
  url: string,
  mimetype: string,
  alt: string,
  className?: string,
  style?: CSSProperties,
  seekTo?: number | null,
  onLoad?: () => void,
}>(function MediaView({ url, mimetype, alt, className, style, seekTo, onLoad }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (seekTo === null || seekTo === undefined) {
      if (!prefersReducedMotion()) {
        void video.play().catch(() => undefined);
      }
      return;
    }
    video.pause();
    if (Number.isFinite(seekTo)) {
      video.currentTime = seekTo;
    }
  }, [seekTo, url]);

  if (isAudioMimetype(mimetype)) {
    return <audio ref={ref as React.Ref<HTMLAudioElement>} src={url} controls className={cn('w-full max-w-md', className)} aria-label={alt} onLoadedData={onLoad}/>;
  }
  if (isVideoMimetype(mimetype)) {
    return (
      <video
        ref={(element) => {
          videoRef.current = element;
          if (typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        src={url}
        muted
        loop
        playsInline
        autoPlay={(seekTo === null || seekTo === undefined) && !prefersReducedMotion()}
        controls={prefersReducedMotion()}
        aria-label={alt}
        className={className}
        style={style}
        onLoadedData={onLoad}
      />
    );
  }
  return <img ref={ref as React.Ref<HTMLImageElement>} src={url} alt={alt} className={className} style={style} onLoad={onLoad} draggable={false}/>;
});
