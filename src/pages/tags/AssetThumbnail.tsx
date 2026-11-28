import { EyeOff, Music, Play } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useI18n } from '@/i18n';
import type { TagDirectoryAsset, TagDirectoryThumbnail } from '@/lib/api';


// The directory's cards only need this much of a listing's media. It's kept apart from TagMedia.tsx, whose viewer and
// upload tools come with the dashboard's queries: the list would download all of that just to draw its thumbnails.

type AssetKind = 'image' | 'video' | 'audio';

export function assetKind(asset: TagDirectoryAsset): AssetKind {
  const { mimetype } = asset.metadata;
  if (mimetype.startsWith('video/')) {
    return 'video';
  }
  if (mimetype.startsWith('audio/')) {
    return 'audio';
  }
  return 'image';
}


// The card's thumbnail: the listing's own `thumbnail` when it has one, otherwise the first asset, cropped to a small
// square next to the name so cards with media stay the same height as the ones without (a full-width band made its
// whole grid row stretch). Audio gets a note icon and NSFW tags a plain tile instead of the media. Video covers play
// (muted) while `playing`, the card tracks the hover.
export function AssetThumbnail({ assets, thumbnail, nsfw, playing }: {
  assets: Array<TagDirectoryAsset>,
  thumbnail: TagDirectoryThumbnail | null,
  nsfw: boolean,
  playing: boolean,
}) {
  const { t } = useI18n();
  if (thumbnail) {
    return (
      <div className='relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-deep'>
        {(nsfw) ? (
          <div className='flex size-full items-center justify-center text-subtle' title={t('tag_media.nsfw_title')}>
            <EyeOff aria-hidden className='size-5'/>
          </div>
        ) : (
          <img src={thumbnail.urls.cdn} alt='' loading='lazy' decoding='async' className='size-full object-cover'/>
        )}
        {(assets.length) ? (
          <span className='pointer-events-none absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[11px] leading-4 font-medium text-white tabular-nums'>
            +{assets.length}
          </span>
        ) : null}
      </div>
    );
  }

  const cover = assets[0];
  if (!cover) {
    return null;
  }
  const kind = assetKind(cover);
  return (
    <div className='relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-deep'>
      {(nsfw || kind === 'audio') ? (
        <div className='flex size-full items-center justify-center text-subtle' title={(nsfw) ? t('tag_media.nsfw_title') : undefined}>
          {(nsfw) ? <EyeOff aria-hidden className='size-5'/> : <Music aria-hidden className='size-5'/>}
        </div>
      ) : (kind === 'video') ? (
        <CoverVideo src={cover.urls.cdn} playing={playing}/>
      ) : (
        <img
          src={cover.urls.cdn}
          alt=''
          loading='lazy'
          decoding='async'
          width={cover.metadata.width || undefined}
          height={cover.metadata.height || undefined}
          className='size-full object-cover'
        />
      )}
      {(kind === 'video' && !nsfw) ? (
        <span className='pointer-events-none absolute bottom-1 left-1 grid size-4 place-items-center rounded-full bg-black/70 text-white'>
          <Play aria-hidden className='size-2.5 fill-current'/>
        </span>
      ) : null}
      {(1 < assets.length) ? (
        <span className='pointer-events-none absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[11px] leading-4 font-medium text-white tabular-nums'>
          +{assets.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function CoverVideo({ src, playing }: {src: string, playing: boolean}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }
    if (playing) {
      // autoplay can still be refused (data saver, etc), the first frame stays up
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [playing]);
  // `preload='metadata'` shows the first frame without downloading the whole thing
  return <video ref={ref} src={src} muted loop playsInline preload='metadata' aria-hidden className='size-full object-cover'/>;
}
