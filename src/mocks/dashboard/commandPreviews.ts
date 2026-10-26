import type { CommandMedia } from '@/lib/api';


// what notsobot.api makes from the bot's `PREVIEW`s (`utilities/tools/command_previews.py`), taken from a local run of
// it, so the commands page's preview layouts show without the api. `url` is a file in ./command-media
const FILES = import.meta.glob<string>('./command-media/*', {eager: true, import: 'default', query: '?url'});

function withUrls(media: Array<CommandMedia>): Array<CommandMedia> {
  return media.map((item) => ({...item, url: FILES[`./command-media/${item.url}`]}));
}

export const MOCK_COMMAND_PREVIEWS: Record<string, {example: string, media: Array<CommandMedia>}> = {
  'media.iv.manipulation.swirl': {
    example: 'swirl',
    media: withUrls([
      {duration: 0, height: 512, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.swirl.webp', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.iv.manipulation.magik': {
    example: 'magik',
    media: withUrls([
      {duration: 0, height: 384, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.magik.webp', width: 384},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.iv.manipulation.deepfry': {
    example: 'deepfry',
    media: withUrls([
      {duration: 0, height: 512, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.deepfry.webp', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.iv.manipulation.magik.animated': {
    example: 'magik gif',
    media: withUrls([
      {duration: 0, height: 512, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.magik.animated.webp', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.iv.manipulation.caption': {
    example: 'caption when the bot works',
    media: withUrls([
      {duration: 0, height: 580, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.caption.webp', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.iv.manipulation.demotivate': {
    example: 'text demotivate NotSoBot | it does things',
    media: withUrls([
      {duration: 0, height: 682, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.demotivate.webp', width: 614},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.aiv.manipulation.adhd': {
    example: 'adhd',
    media: withUrls([
      {duration: 6000, height: 800, mimetype: 'video/mp4', position: 0, type: 0, url: 'media.aiv.manipulation.adhd.mp4', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.av.manipulation.audio.pitch': {
    example: 'audio pitch',
    media: withUrls([
      {duration: 4745, height: 0, mimetype: 'audio/mpeg', position: 0, type: 0, url: 'media.av.manipulation.audio.pitch.mp3', width: 0},
      {duration: 4761, height: 0, mimetype: 'audio/mpeg', position: 0, type: 1, url: 'voice.mp3', width: 0},
    ]),
  },
  'media.av.manipulation.boost.bass': {
    example: 'boost bass',
    media: withUrls([
      {duration: 8000, height: 0, mimetype: 'audio/mpeg', position: 0, type: 0, url: 'media.av.manipulation.boost.bass.mp3', width: 0},
      {duration: 8000, height: 0, mimetype: 'audio/mpeg', position: 0, type: 1, url: 'music.mp3', width: 0},
    ]),
  },
  'media.a.tools.put.concat': {
    example: 'audio put concat',
    media: withUrls([
      {duration: 12710, height: 0, mimetype: 'audio/mpeg', position: 0, type: 0, url: 'media.a.tools.put.concat.mp3', width: 0},
      {duration: 4761, height: 0, mimetype: 'audio/mpeg', position: 0, type: 1, url: 'voice.mp3', width: 0},
      {duration: 8000, height: 0, mimetype: 'audio/mpeg', position: 1, type: 1, url: 'music.mp3', width: 0},
    ]),
  },
  'media.a.tools.put.replace': {
    example: 'audio put replace',
    media: withUrls([
      {duration: 8000, height: 512, mimetype: 'video/mp4', position: 0, type: 0, url: 'media.a.tools.put.replace.mp4', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
      {duration: 8000, height: 0, mimetype: 'audio/mpeg', position: 1, type: 1, url: 'music.mp3', width: 0},
    ]),
  },
  'media.iv.manipulation.eyes.googly': {
    example: 'eyes googly',
    media: withUrls([
      {duration: 0, height: 463, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.eyes.googly.webp', width: 500},
      {duration: 0, height: 464, mimetype: 'image/png', position: 0, type: 1, url: 'face.png', width: 500},
    ]),
  },
  'media.i.manipulation.face.clown': {
    example: 'clown',
    media: withUrls([
      {duration: 0, height: 463, mimetype: 'image/webp', position: 0, type: 0, url: 'media.i.manipulation.face.clown.webp', width: 500},
      {duration: 0, height: 464, mimetype: 'image/png', position: 0, type: 1, url: 'face.png', width: 500},
    ]),
  },
  'media.iv.manipulation.overlay.flag.usa': {
    example: 'overlay usa',
    media: withUrls([
      {duration: 0, height: 512, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.overlay.flag.usa.webp', width: 512},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.iv.manipulation.overlay.youtube': {
    example: 'text youtube Kid Discovers Painting (GONE WRONG)',
    media: withUrls([
      {duration: 0, height: 634, mimetype: 'image/webp', position: 0, type: 0, url: 'media.iv.manipulation.overlay.youtube.webp', width: 854},
      {duration: 0, height: 512, mimetype: 'image/png', position: 0, type: 1, url: 'b1.png', width: 512},
    ]),
  },
  'media.i.create.einstein': {
    example: 'einstein e=mc2',
    media: withUrls([
      {duration: 0, height: 577, mimetype: 'image/webp', position: 0, type: 0, url: 'media.i.create.einstein.webp', width: 700},
    ]),
  },
};
