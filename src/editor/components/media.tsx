import { forwardRef, useEffect, useRef, type CSSProperties } from 'react';

import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';


export function isVideoMimetype(mimetype: string | undefined): boolean {
  return Boolean(mimetype?.startsWith('video/'));
}

export function isAudioMimetype(mimetype: string | undefined): boolean {
  return Boolean(mimetype?.startsWith('audio/'));
}


// The cdn's small png of one of its files (`<vanity>.png?thumbnail=true`, the lookup ignores the extension): a video's
// frame, a sound's cover or waveform. Pictures have none, and a file's may not be made yet (a 404 either way), so
// whoever shows it keeps something to fall back to. null for a link that isn't the cdn's
export function cdnThumbnailUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'cdn.nsb.gg') {
      return null;
    }
    parsed.pathname = `${parsed.pathname.replace(/\.[^./]+$/, '')}.png`;
    parsed.search = '?thumbnail=true';
    return parsed.toString();
  } catch {
    return null;
  }
}

// the system's reduce motion or the Activity's Less motion (@/lib/motion), for the editor's other files
export { prefersReducedMotion };


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
