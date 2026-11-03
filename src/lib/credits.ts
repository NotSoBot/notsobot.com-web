// NotSoCredits, what NotSoAI messages and cloned voices spend. These mirror notsobot.api's `utilities/constants/limits.py`
// (`CREDITS_*`) and `utilities/tools/credits.py` (`CREDITS_REFILL_SKUS`), keep them in sync.

import { DiscordSkus } from '@/lib/api/types';


// one NotSoAI message, and what a cloned voice costs for each letter (byte) of text. Both make a credit cost about the
// same to run (fish.audio bills $50 per 1M bytes)
export const CREDITS_AI_MESSAGE = 75;
export const CREDITS_PER_TTS_BYTE = 4;
// every week (from Monday 00:00 UTC)
export const CREDITS_WEEKLY_PREMIUM_PLUS = 30_000;
export const CREDITS_WEEKLY_PREMIUM_PLUS_AI = 60_000;
// what's left of a Plus AI week is banked, up to this many weeks' worth (the api's `CREDITS_ROLLOVER_WEEKS_PREMIUM_PLUS_AI`)
export const CREDITS_ROLLOVER_WEEKS_PREMIUM_PLUS_AI = 2;
export const CREDITS_ROLLOVER_PREMIUM_PLUS_AI = CREDITS_WEEKLY_PREMIUM_PLUS_AI * CREDITS_ROLLOVER_WEEKS_PREMIUM_PLUS_AI;
// for everyone in a server without Plus AI of their own, per Plus AI premium server slot on it
export const CREDITS_WEEKLY_SERVER_AI_SLOT = 25_000;
// what every Plus (or Plus AI) slot adds for the server's own cloned voices only
export const CREDITS_WEEKLY_SERVER_TTS_SLOT = 7_500;

// the api's `MAX_VOICE_CLONE_AMOUNT`, `MAX_VOICE_CLONE_AMOUNT_PREMIUM_PLUS_AI` and `MAX_SERVER_VOICE_CLONE_AMOUNT`
export const MAX_VOICE_CLONES_PLUS = 5;
export const MAX_VOICE_CLONES_PLUS_AI = 10;
export const MAX_SERVER_VOICE_CLONES = 5;

// NotSoAI messages a Plus AI premium server slot gives a server each week
export const SERVER_AI_MESSAGES_PER_SLOT = Math.floor(CREDITS_WEEKLY_SERVER_AI_SLOT / CREDITS_AI_MESSAGE);

// roughly how fast a cloned voice speaks, for turning credits into time
const SPEECH_LETTERS_PER_SECOND = 14;

export interface CreditPack {
  credits: number,
  // extra credits over the smallest pack's price per credit, in percent
  bonus: number,
  sku: string,
}

export const CREDIT_PACKS: ReadonlyArray<CreditPack> = [
  {credits: 50_000, bonus: 0, sku: DiscordSkus.USER_NOTSOCREDITS_50K},
  {credits: 150_000, bonus: 20, sku: DiscordSkus.USER_NOTSOCREDITS_150K},
  {credits: 325_000, bonus: 30, sku: DiscordSkus.USER_NOTSOCREDITS_325K},
  {credits: 700_000, bonus: 40, sku: DiscordSkus.USER_NOTSOCREDITS_700K},
];


export function creditsToMessages(credits: number): number {
  return Math.floor(credits / CREDITS_AI_MESSAGE);
}

export function creditsToSpeechHours(credits: number): number {
  return credits / CREDITS_PER_TTS_BYTE / SPEECH_LETTERS_PER_SECOND / 3600;
}

// short labels like 50K or 1.5M for a pack's name
export function creditsLabel(credits: number): string {
  if (1_000_000 <= credits) {
    return `${Number((credits / 1_000_000).toFixed(1))}M`;
  }
  return `${Math.round(credits / 1000)}K`;
}
