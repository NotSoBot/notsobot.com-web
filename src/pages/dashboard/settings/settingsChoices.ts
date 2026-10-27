// Fixed choices for user/server settings, mirroring the enums in notsobot.ts `src/constants.ts`
// (and notsobot.api's validators, which accept the same values). Translated labels are getters, read in the language on screen.

import { translate } from '@/i18n';

import type { Choice } from './botChoices';


export { LLM_MODEL_CHOICES, LOCALE_CHOICES, TIMEZONE_CHOICES, TTS_VOICE_CHOICES, type Choice } from './botChoices';


// `MLDiffusionModelsToText`
export const DIFFUSION_MODEL_CHOICES: ReadonlyArray<Choice> = [
  {value: 'FLUX_KLEIN', get label() { return translate('choice.diffusion.flux_klein'); }},
];

// `DownloadQualities` (the API takes the values)
export const DOWNLOAD_QUALITY_CHOICES: ReadonlyArray<Choice> = ['1440p', '1080p', '720p', '480p', '360p', '240p', '144p'].map((value) => ({value, label: value}));

// `MeasurementUnits`
export const UNITS_CHOICES: ReadonlyArray<Choice> = [
  {value: 'METRIC', get label() { return translate('choice.units.metric'); }},
  {value: 'IMPERIAL', get label() { return translate('choice.units.imperial'); }},
];

// `UserSettingsResponseDisplayTypes` / `GuildSettingsResponseDisplayTypes`
export const RESPONSE_DISPLAY_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, get label() { return translate('choice.display.default'); }},
  {value: 1, get label() { return translate('choice.display.no_embeds'); }},
  {value: 2, get label() { return translate('choice.display.legacy'); }},
];

// `UserSettingsSearchProviders`, null follows the server's setting, then DuckDuckGo for web and Google for images
export const SEARCH_PROVIDER_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 2, label: 'Bing'},
  {value: 1, label: 'DuckDuckGo'},
  {value: 0, label: 'Google'},
  {value: 3, label: 'Yandex'},
];

// `UserSettingsApplicationCommandResponseTypes`
export const APPLICATION_COMMAND_RESPONSE_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, get label() { return translate('choice.slash.automatic'); }},
  {value: 1, get label() { return translate('choice.slash.ephemeral'); }},
];

// `UserSettingsFallbacksMediaImageTypes`
export const FALLBACK_IMAGE_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, get label() { return translate('choice.fallback.google'); }},
  {value: 1, get label() { return translate('choice.fallback.imagine'); }},
  {value: 2, get label() { return translate('choice.fallback.duckduckgo'); }},
];

// `UserSettingsUploadThresholdTypes`
export const UPLOAD_THRESHOLD_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, get label() { return translate('choice.threshold.over_limit'); }},
  {value: 1, get label() { return translate('choice.threshold.always'); }},
  {value: 2, get label() { return translate('choice.threshold.never'); }},
];

// `UserSettingsUploadTypes`
export const UPLOAD_TYPE_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, get label() { return translate('choice.upload.automatic'); }},
  {value: 1, get label() { return translate('choice.upload.temporary'); }},
];

export const PERSONALITY_MAX = 1024;
