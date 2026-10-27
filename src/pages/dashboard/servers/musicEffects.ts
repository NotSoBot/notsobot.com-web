import { translate } from '@/i18n';


// The voice node's live effects, the bot's `MusicEffects` (notsobot.ts `constants.ts`, keep them the same). Names are the
// same in every language like in Discord, what they do is `music.effect.<value>`. In order of their names, like the bot's
// pickers
export const MUSIC_EFFECTS = [
  '8d', '8dvertical', 'bassboost', 'chipmunk', 'concerthall', 'crossfeed', 'daycore', 'deep', 'distortion', 'dreamy',
  'echo', 'filtersweep', 'karaoke', 'lofi', 'mono', 'nextroom', 'nightcore', 'normalizer', 'oldrecord', 'phaser',
  'radio', 'robot', 'slowed', 'trebleboost', 'tremolo', 'underwater', 'vaporwave', 'vibrato', 'wide',
] as const;

export type MusicEffect = typeof MUSIC_EFFECTS[number];

const MUSIC_EFFECT_NAMES: Record<MusicEffect, string> = {
  '8d': '8D',
  '8dvertical': '8D Vertical',
  bassboost: 'Bassboost',
  chipmunk: 'Chipmunk',
  concerthall: 'Concert Hall',
  crossfeed: 'Crossfeed',
  daycore: 'Daycore',
  deep: 'Deep',
  distortion: 'Distortion',
  dreamy: 'Dreamy',
  echo: 'Echo',
  filtersweep: 'Filter Sweep',
  karaoke: 'Karaoke',
  lofi: 'Lo-Fi',
  mono: 'Mono',
  nextroom: 'Next Room',
  nightcore: 'Nightcore',
  normalizer: 'Normalizer',
  oldrecord: 'Old Record',
  phaser: 'Phaser',
  radio: 'Radio',
  robot: 'Robot',
  slowed: 'Slowed + reverb',
  trebleboost: 'Treble Boost',
  tremolo: 'Tremolo',
  underwater: 'Underwater',
  vaporwave: 'Vaporwave',
  vibrato: 'Vibrato',
  wide: 'Wide',
};

// how many stack at once, the same one more than once too (the bot's `MAX_MUSIC_EFFECTS`)
export const MAX_MUSIC_EFFECTS = 5;

// what doesn't stack, the bot's `MUSIC_EFFECTS_FASTER`, `MUSIC_EFFECTS_SLOWER` and `MUSIC_EFFECTS_CONFLICTS`. The bot
// leaves those out either way, here they can't be picked
const FASTER: ReadonlyArray<MusicEffect> = ['nightcore'];
const SLOWER: ReadonlyArray<MusicEffect> = ['daycore', 'slowed', 'vaporwave'];
const ONE_CHANNEL: ReadonlyArray<MusicEffect> = ['mono', 'radio', 'oldrecord'];
const ORBITS: ReadonlyArray<MusicEffect> = ['8d', '8dvertical'];
const CONFLICTS: ReadonlyArray<[MusicEffect, MusicEffect]> = [
  ['mono', 'wide'],
  ['mono', '8d'],
  ['mono', '8dvertical'],
  ['mono', 'karaoke'],
  ['mono', 'crossfeed'],
  ['radio', 'wide'],
  ['radio', 'karaoke'],
  ['radio', 'crossfeed'],
  ['oldrecord', 'wide'],
  ['oldrecord', 'karaoke'],
  ['oldrecord', 'crossfeed'],
  ['8d', 'karaoke'],
  ['8dvertical', 'karaoke'],
  ['8d', '8dvertical'],
  ['chipmunk', 'deep'],
];

export function isMusicEffect(value: string): value is MusicEffect {
  return (MUSIC_EFFECTS as ReadonlyArray<string>).includes(value);
}

// one the bot has that this list doesn't yet shows as its value
export function musicEffectName(value: string): string {
  return (isMusicEffect(value)) ? MUSIC_EFFECT_NAMES[value] : value;
}

export function musicEffectDescription(value: string): string | null {
  return (isMusicEffect(value)) ? translate(`music.effect.${value}`) : null;
}

// the first of what's on that `effect` doesn't stack with: a faster one with a slower one, or ones that undo each other
// (the bot's `findMusicEffectClash`)
export function findMusicEffectClash(effect: MusicEffect, current: ReadonlyArray<string>): MusicEffect | null {
  const clash = current.filter(isMusicEffect).find((other) => {
    const speeds = (FASTER.includes(effect) && SLOWER.includes(other)) || (SLOWER.includes(effect) && FASTER.includes(other));
    return speeds || CONFLICTS.some(([a, b]) => (a === effect && b === other) || (a === other && b === effect));
  });
  return clash ?? null;
}

// why `effect` doesn't stack with `other`, the bot's `describeClash`
export function musicEffectClashReason(effect: MusicEffect, other: MusicEffect): string {
  const name = musicEffectName;
  if (FASTER.includes(effect) || FASTER.includes(other)) {
    const faster = (FASTER.includes(effect)) ? effect : other;
    return translate('music.effect_reason_speed', {faster: name(faster), slower: name((faster === effect) ? other : effect)});
  }
  if (effect === 'chipmunk' || other === 'chipmunk') {
    return translate('music.effect_reason_pitch', {higher: name('chipmunk'), lower: name('deep')});
  }
  if (ORBITS.includes(effect) && ORBITS.includes(other)) {
    return translate('music.effect_reason_orbit', {effect: name(effect), other: name(other)});
  }
  if (effect === 'karaoke' || other === 'karaoke') {
    return translate('music.effect_reason_karaoke', {karaoke: name('karaoke'), other: name((effect === 'karaoke') ? other : effect)});
  }
  const mono = (ONE_CHANNEL.includes(effect)) ? effect : other;
  return translate('music.effect_reason_mono', {mono: name(mono), stereo: name((mono === effect) ? other : effect)});
}
