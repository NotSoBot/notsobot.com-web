// `GET /home` built in the browser from `GET /commands` and `GET /info/discord`, for an api that doesn't have `/home`
// yet (it answers 404). The same picks as the api's `build_home` (`views/home.py`). Only loaded when that happens, and
// it can go once every api has `/home`.

import { enabledCommandVariants } from '@/lib/commandAvailability';
import { compareCommandTypes } from '@/lib/commandPaths';

import { CommandMediaTypes, CommandTypes } from './types';
import type { Command, CommandMedia, Home, HomeHeroShowcase, HomeMedia, HomeShowcase, InfoDiscord } from './types';


// the hero's before/after slider, by prefix name in this order, the ones whose preview fits a slider
const HERO_COMMANDS = ['magik', 'deepfry', 'swirl', 'jpeg', 'pixelate', 'explode'];
const HERO_ASPECT_TOLERANCE = 0.05;
// the ~200 country flag overlays would fill the gallery with near-identical tiles. the english slash name
const FLAG_OVERLAY_PREFIX = 'media-iv-flag-';


function homeMedia({ height, mimetype, url, width }: CommandMedia): HomeMedia {
  return {height, mimetype, url, width};
}

// an image result over an image input of about the same shape
function fitsSlider(before: CommandMedia, after: CommandMedia): boolean {
  if (!before.mimetype.startsWith('image/') || !after.mimetype.startsWith('image/') || !before.height || !after.height) {
    return false;
  }
  const ratio = after.width / after.height;
  return Math.abs(before.width / before.height - ratio) / ratio <= HERO_ASPECT_TOLERANCE;
}


// `info` is null when `/info/discord` failed, the two totals are then null like before any cluster has reported
export function buildHome(commands: Array<Command>, info: InfoDiscord | null): Home {
  let enabledCount = 0;
  const showcases: Array<HomeShowcase> = [];
  // the first command with each hero prefix name, the ones that don't fit a slider are dropped after
  const heroCandidates = new Map<string, {after: CommandMedia, command: Command, showcase: HomeShowcase}>();
  for (const command of [ ...commands ].sort((a, b) => (a.id < b.id) ? -1 : (a.id > b.id) ? 1 : 0)) {
    const variants = enabledCommandVariants(command).sort((a, b) => compareCommandTypes(a.type, b.type));
    if (!variants.length) {
      continue;
    }
    enabledCount++;

    // shown as its first variant with a name, whose page is the command's own `/commands/:commandId`
    const variant = variants.find((metadata) => metadata.name);
    const after = command.media.find((media) => media.type === CommandMediaTypes.AFTER);
    if (!variant || !after || after.mimetype.startsWith('audio/')) {
      continue;
    }
    if (command.metadata.some((metadata) => (metadata.default_name ?? metadata.name).startsWith(FLAG_OVERLAY_PREFIX))) {
      continue;
    }

    const showcase: HomeShowcase = {after: homeMedia(after), id: command.id, name: variant.name, type: variant.type};
    showcases.push(showcase);

    const prefixName = variants.find((metadata) => metadata.type === CommandTypes.PREFIXED)?.name;
    if (prefixName && HERO_COMMANDS.includes(prefixName) && !heroCandidates.has(prefixName)) {
      heroCandidates.set(prefixName, {after, command, showcase});
    }
  }

  const hero: Array<HomeHeroShowcase> = [];
  for (const prefixName of HERO_COMMANDS) {
    const candidate = heroCandidates.get(prefixName);
    if (!candidate) {
      continue;
    }
    // the single input, a slider needs exactly one
    const inputs = candidate.command.media.filter((media) => media.type === CommandMediaTypes.BEFORE);
    if (inputs.length !== 1 || !fitsSlider(inputs[0], candidate.after)) {
      continue;
    }
    hero.push({...candidate.showcase, before: homeMedia(inputs[0]), example: candidate.command.preview_example});
  }
  const heroIds = new Set(hero.map((item) => item.id));

  let guilds: number | null = null;
  let users: number | null = null;
  if (info) {
    guilds = 0;
    users = 0;
    for (const cluster of info.clusters) {
      for (const shard of cluster.shards) {
        guilds += shard.counts.guilds;
        users += shard.counts.users;
      }
    }
  }

  return {
    counts: {commands: enabledCount, guilds, users},
    hero,
    showcases: showcases.filter((showcase) => !heroIds.has(showcase.id)),
  };
}
