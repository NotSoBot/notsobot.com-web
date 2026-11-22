import { Crown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavigationType, useLocation, useNavigationType, type Location } from 'react-router';

import { isOwner, useAuth } from '@/auth';
import { Routes } from '@/config';
import { useI18n, type TranslationKey } from '@/i18n';
import { GUILD_AUTO_EMBED_SITES, UserPremiumTypes, type UserSettings, type UserSettingsPatch } from '@/lib/api';
import { errorMessage, useMeSettingsQuery, usePatchMeSettingsMutation } from '@/lib/api/dashboardQueries';
import { decodeHash, formatNumber } from '@/lib/utils';

import { useMediaFontChoices } from '../fonts/SavedFontsPanel';
import { CharCounter, DashboardHeader, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar, Toggle, UnsavedChangesGuard } from '../ui';
import { ChoiceSelect } from './ChoiceSelect';
import { PersonalityHint } from './PersonalityHint';
import {
  APPLICATION_COMMAND_RESPONSE_CHOICES,
  AUTO_EMBED_SITE_NAMES,
  DIFFUSION_MODEL_CHOICES,
  DOWNLOAD_QUALITY_CHOICES,
  FALLBACK_IMAGE_CHOICES,
  LLM_MODEL_CHOICES,
  LOCALE_CHOICES,
  PERSONALITY_MAX,
  POST_GALLERY_CHOICES,
  RESPONSE_DISPLAY_CHOICES,
  SEARCH_PROVIDER_CHOICES,
  TIMEZONE_CHOICES,
  TTS_VOICE_CHOICES,
  UNITS_CHOICES,
  UPLOAD_THRESHOLD_CHOICES,
  UPLOAD_TYPE_CHOICES,
} from './settingsChoices';
import { useDraft } from './useDraft';
import { YourDataSection } from './YourDataSection';
import { DEFAULT_VANITY, describeVanity, exampleVanityLink, vanityError } from './vanity';


type Values = Omit<UserSettings, 'file_upload_name'>;
type SectionProps = {settings: UserSettings, onDirtyChange: (section: string, dirty: boolean) => void};


// the location a page load starts on is a POP to the router like Back/Forward are (its key is `default`). It's a fresh
// visit when the page was opened (a link from the bot, say), not when it was reloaded or reached through the browser's
// history, and only the first time: coming back to it later is a history step
let firstLocationJumped = false;

function isFreshVisit(navigationType: NavigationType, location: Location): boolean {
  if (navigationType !== NavigationType.Pop) {
    return true;
  }
  if (location.key !== 'default' || firstLocationJumped) {
    return false;
  }
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return entry?.type === 'navigate';
}


export function SettingsPage() {
  const { t } = useI18n();
  const { data: settings, isPending, error, refetch, isRefetching } = useMeSettingsQuery();
  const [ dirtySections, setDirtySections ] = useState<ReadonlySet<string>>(new Set());
  const location = useLocation();
  const navigationType = useNavigationType();
  const loaded = !!settings;

  // `/dashboard/settings#media` (or any section's id) jumps to it, once the sections are there. Only when it was
  // navigated to: Back/Forward and a reload put the scroll back where it was, which this would jump away from
  useEffect(() => {
    const id = decodeHash(location.hash);
    if (id && loaded && isFreshVisit(navigationType, location)) {
      firstLocationJumped = true;
      document.getElementById(id)?.scrollIntoView({block: 'start'});
    }
  }, [location.hash, loaded]);

  const onDirtyChange = useCallback((section: string, dirty: boolean) => {
    setDirtySections((previous) => {
      if (previous.has(section) === dirty) {
        return previous;
      }
      const next = new Set(previous);
      if (dirty) {
        next.add(section);
      } else {
        next.delete(section);
      }
      return next;
    });
  }, []);

  return (
    <>
      <DashboardHeader
        title={t('dash.nav.settings')}
        description={t('settings.description')}
      />
      {(isPending) ? (
        <div className='space-y-4' aria-busy='true' aria-label={t('settings.loading')}>
          <PanelSkeleton rows={3}/>
          <PanelSkeleton rows={3}/>
          <PanelSkeleton rows={4}/>
        </div>
      ) : (!settings) ? (
        // only when nothing loaded; a failed background refetch keeps every section (and its unsaved edits) on screen
        <ErrorPanel title={t('settings.load_error')} message={errorMessage(error)} onRetry={() => refetch()} retrying={isRefetching}/>
      ) : (
        <div className='space-y-4'>
          <AiSection settings={settings} onDirtyChange={onDirtyChange}/>
          <RegionSection settings={settings} onDirtyChange={onDirtyChange}/>
          <MediaSection settings={settings} onDirtyChange={onDirtyChange}/>
          <DisplaySection settings={settings} onDirtyChange={onDirtyChange}/>
          <AutoEmbedSection settings={settings} onDirtyChange={onDirtyChange}/>
          <SearchSection settings={settings} onDirtyChange={onDirtyChange}/>
          <VoiceSection settings={settings} onDirtyChange={onDirtyChange}/>
        </div>
      )}
      <YourDataSection/>
      <UnsavedChangesGuard when={0 < dirtySections.size}/>
    </>
  );
}


// One independently saved group of settings. Saving is optimistic (the cache updates right away) and the edits stay
// layered on top until it's saved, so anything typed meanwhile is kept; if the API refuses, the cache rolls back and the
// edits show as unsaved again. `name` is the section's title key, which also tells the sections apart for the unsaved
// changes guard
function useSettingsSection<K extends keyof Values>(name: TranslationKey, settings: UserSettings, keys: ReadonlyArray<K>, onDirtyChange: SectionProps['onDirtyChange']) {
  const mutation = usePatchMeSettingsMutation();
  // same object identity while the values are the same, so the draft's memos hold
  const savedKey = JSON.stringify(keys.map((key) => settings[key]));
  const saved = useMemo(() => Object.fromEntries(keys.map((key) => [key, settings[key]])) as unknown as Pick<Values, K>, [savedKey]);
  const draft = useDraft(saved);

  useEffect(() => {
    onDirtyChange(name, draft.dirty);
  }, [name, draft.dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(name, false), [name, onDirtyChange]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.dirty || mutation.isPending) {
      return;
    }
    const changes = draft.changes;
    // no toasts: the section's save bar says Saved, and a failure shows above it
    mutation.mutate(changes as UserSettingsPatch, {
      onSuccess: () => draft.commit(changes),
    });
  };

  const set = <F extends K>(key: F, value: Values[F]) => {
    if (mutation.isError) {
      mutation.reset();
    }
    draft.set(key, value as Pick<Values, K>[F]);
  };

  // a failed save's error goes with the edits it was about
  const discard = () => {
    mutation.reset();
    draft.reset();
  };

  return {values: draft.values, dirty: draft.dirty, set, submit, discard, mutation};
}


// `id` is the section's anchor (`/dashboard/settings#media`)
function SectionForm({ id, title, description, accent, section, children }: {
  id: string,
  title: string,
  description: string,
  accent: string,
  section: {dirty: boolean, submit: (event: FormEvent) => void, discard: () => void, mutation: ReturnType<typeof usePatchMeSettingsMutation>},
  children: ReactNode,
}) {
  const { t } = useI18n();
  return (
    <form id={id} className='scroll-mt-24' onSubmit={section.submit}>
      <Panel title={title} description={description} accent={accent}>
        <div className='grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2'>{children}</div>
        {(section.mutation.isError) ? <InlineError>{errorMessage(section.mutation.error, t('settings.save_error'))}</InlineError> : null}
        <SaveBar
          dirty={section.dirty}
          pending={section.mutation.isPending}
          onDiscard={section.discard}
          status={(section.mutation.isPending) ? <span className='text-muted'>{t('common.saving')}</span> : (section.mutation.isSuccess && !section.dirty) ? <span className='text-success-text'>{t('common.saved')}</span> : undefined}
        />
      </Panel>
    </form>
  );
}


function AiSection({ settings, onDirtyChange }: SectionProps) {
  const { t, rich } = useI18n();
  const section = useSettingsSection('settings.ai.title', settings, ['ml_llm_personality', 'ml_llm_model', 'ml_diffusion_model'], onDirtyChange);
  const personality = section.values.ml_llm_personality ?? '';
  return (
    <SectionForm id='ai' title={t('settings.ai.title')} accent='#5865f2' description={t('settings.ai.description')} section={section}>
      <Field
        className='md:col-span-2'
        label={t('settings.ai.personality')}
        hint={<PersonalityHint>{t('settings.ai.personality_hint')}</PersonalityHint>}
        counter={<CharCounter length={personality.length} max={PERSONALITY_MAX}/>}
        error={(PERSONALITY_MAX < personality.length) ? t('settings.ai.too_long', {max: formatNumber(PERSONALITY_MAX)}) : null}
      >
        {(props) => (
          <textarea
            {...props}
            rows={5}
            maxLength={PERSONALITY_MAX}
            className='input resize-y leading-relaxed'
            placeholder={t('settings.ai.personality_placeholder')}
            value={personality}
            onChange={(event) => section.set('ml_llm_personality', event.target.value || null)}
          />
        )}
      </Field>
      <Field label={t('settings.ai.model')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={LLM_MODEL_CHOICES} value={section.values.ml_llm_model} onChange={(value) => section.set('ml_llm_model', value)}/>}
      </Field>
      <Field label={t('settings.ai.image_model')} hint={t('settings.ai.image_model_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={DIFFUSION_MODEL_CHOICES} value={section.values.ml_diffusion_model} onChange={(value) => section.set('ml_diffusion_model', value)}/>}
      </Field>
      <p className='text-xs text-subtle md:col-span-2'>
        {rich('settings.ai.memory', {link: (chunk) => <Link to={Routes.DASHBOARD_AI_MEMORY} className='text-brand-text hover:underline'>{chunk}</Link>})}
      </p>
    </SectionForm>
  );
}


function RegionSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.region.title', settings, ['locale', 'timezone', 'units'], onDirtyChange);
  return (
    <SectionForm id='region' title={t('settings.region.title')} accent='#3ba55c' description={t('settings.region.description')} section={section}>
      <Field label={t('settings.region.language')} hint={t('settings.region.language_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.region.auto_language')} choices={LOCALE_CHOICES} value={section.values.locale} onChange={(value) => section.set('locale', value)}/>}
      </Field>
      <Field label={t('settings.region.timezone')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.region.no_timezone')} choices={TIMEZONE_CHOICES} value={section.values.timezone} onChange={(value) => section.set('timezone', value)}/>}
      </Field>
      <Field label={t('settings.region.units')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.automatic')} choices={UNITS_CHOICES} value={section.values.units} onChange={(value) => section.set('units', value)}/>}
      </Field>
    </SectionForm>
  );
}


function MediaSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.media.title', settings, [
    'download_quality',
    'media_font',
    'file_upload_threshold',
    'file_upload_type',
    'file_upload_vanity',
    'fallbacks_media_image',
  ], onDirtyChange);
  const premium = useHasPremium();
  // their saved fonts can be their Default Font too
  const fontChoices = useMediaFontChoices(null);
  const vanity = section.values.file_upload_vanity ?? '';
  const vanityProblem = vanityError(vanity);
  // the API would reject an invalid pattern, so don't send it
  const guardedSection = {
    ...section,
    submit: (event: FormEvent) => {
      if (vanityProblem) {
        event.preventDefault();
        return;
      }
      section.submit(event);
    },
  };
  return (
    <SectionForm id='media' title={t('settings.media.title')} accent='#faa81a' description={t('settings.media.description')} section={guardedSection}>
      <Field label={t('settings.media.download_quality')} hint={t('settings.media.download_quality_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={DOWNLOAD_QUALITY_CHOICES} value={section.values.download_quality} onChange={(value) => section.set('download_quality', value)}/>}
      </Field>
      <Field label={t('settings.media.font')} hint={t('settings.media.font_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={fontChoices} value={section.values.media_font} onChange={(value) => section.set('media_font', value)}/>}
      </Field>
      {/* saved without premium too, the bot just doesn't use it until they (or the server) have it */}
      <div className='min-w-0 space-y-2'>
        <Field label={t('settings.media.fallback')} hint={t('settings.media.fallback_hint')}>
          {(props) => <ChoiceSelect {...props} choices={FALLBACK_IMAGE_CHOICES} value={section.values.fallbacks_media_image} onChange={(value) => section.set('fallbacks_media_image', value ?? 0)}/>}
        </Field>
        {(!premium) ? <PremiumNotice>{t('settings.media.fallback_premium')}</PremiumNotice> : null}
      </div>
      <Field label={t('settings.media.upload')} hint={t('settings.media.upload_hint')}>
        {(props) => <ChoiceSelect {...props} choices={UPLOAD_THRESHOLD_CHOICES} value={section.values.file_upload_threshold} onChange={(value) => section.set('file_upload_threshold', value ?? 0)}/>}
      </Field>
      <Field label={t('settings.media.upload_type')}>
        {(props) => <ChoiceSelect {...props} choices={UPLOAD_TYPE_CHOICES} value={section.values.file_upload_type} onChange={(value) => section.set('file_upload_type', value ?? 0)}/>}
      </Field>
      <Field label={t('settings.media.upload_name')} hint={t('settings.media.upload_name_hint')}>
        {(props) => <input {...props} className='input' readOnly disabled value={settings.file_upload_name ?? ''} placeholder={t('common.not_set')}/>}
      </Field>
      <Field
        className='md:col-span-2'
        label={t('settings.media.vanity')}
        hint={<VanityHelp pattern={vanity}/>}
        error={vanityProblem}
        counter={<CharCounter length={vanity.length} max={512}/>}
      >
        {(props) => (
          <input
            {...props}
            className='input font-mono'
            maxLength={512}
            placeholder={t('settings.media.vanity_default', {vanity: DEFAULT_VANITY})}
            value={vanity}
            onChange={(event) => section.set('file_upload_vanity', event.target.value || null)}
            autoComplete='off'
            spellCheck={false}
          />
        )}
      </Field>
    </SectionForm>
  );
}


function DisplaySection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.display.title', settings, ['response_display', 'application_command_response_type', 'post_gallery'], onDirtyChange);
  return (
    <SectionForm id='display' title={t('settings.display.title')} accent='#00b0f4' description={t('settings.display.description')} section={section}>
      <Field label={t('settings.display.response')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.server_default')} choices={RESPONSE_DISPLAY_CHOICES} value={section.values.response_display} onChange={(value) => section.set('response_display', value)}/>}
      </Field>
      <Field label={t('settings.display.slash')} hint={t('settings.display.slash_hint')}>
        {(props) => <ChoiceSelect {...props} choices={APPLICATION_COMMAND_RESPONSE_CHOICES} value={section.values.application_command_response_type} onChange={(value) => section.set('application_command_response_type', value ?? 0)}/>}
      </Field>
      <Field label={t('settings.display.post_gallery')} hint={t('settings.display.post_gallery_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.server_default')} choices={POST_GALLERY_CHOICES} value={section.values.post_gallery} onChange={(value) => section.set('post_gallery', value)}/>}
      </Field>
    </SectionForm>
  );
}


// auto-embed for their own links, a premium perk (any tier). saved without premium too, it just doesn't do anything
// until they have it, like the bot's command
function AutoEmbedSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.autoembed.title', settings, ['auto_embed', 'auto_embed_text'], onDirtyChange);
  const sites = section.values.auto_embed ?? [];
  const premium = useHasPremium();
  return (
    <SectionForm id='auto-embed' title={t('settings.autoembed.title')} accent='#f0b232' description={t('settings.autoembed.description')} section={section}>
      <div className='space-y-3 md:col-span-2'>
        <div className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
          {GUILD_AUTO_EMBED_SITES.map((site) => (
            <Toggle
              key={site}
              label={AUTO_EMBED_SITE_NAMES[site]}
              checked={sites.includes(site)}
              // sorted like the api stores them, so turning one off and on again isn't an unsaved change
              onChange={(value) => section.set('auto_embed', [...sites.filter((x) => x !== site), ...(value) ? [site] : []].sort())}
            />
          ))}
        </div>
        <div className='border-t border-line pt-3'>
          <Toggle
            label={t('settings.autoembed.text')}
            description={t('settings.autoembed.text_hint')}
            checked={section.values.auto_embed_text !== false}
            onChange={(value) => section.set('auto_embed_text', value)}
          />
        </div>
        {(!premium) ? <PremiumNotice>{t('settings.autoembed.premium')}</PremiumNotice> : null}
      </div>
    </SectionForm>
  );
}


// their own premium (any tier), what the perks on this page need
function useHasPremium(): boolean {
  const { user } = useAuth();
  return !!user && (isOwner(user) || user.premium_type !== UserPremiumTypes.NONE);
}


// under a setting that's a premium perk, shown to those without it: what it needs, and where premium is
function PremiumNotice({ children }: {children: ReactNode}) {
  const { t } = useI18n();
  return (
    <p className='flex items-start gap-2 rounded-md border border-[#f0b232]/30 bg-[#f0b232]/10 px-3 py-2 text-xs text-fg'>
      <Crown aria-hidden className='mt-px size-3.5 shrink-0 text-[#f0b232]'/>
      <span>
        {children}{' '}
        <Link to={Routes.DASHBOARD_PREMIUM} className='text-brand-text hover:underline'>{t('settings.autoembed.premium_link')}</Link>
      </span>
    </p>
  );
}


function SearchSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.search.title', settings, ['search_provider_web', 'search_provider_images'], onDirtyChange);
  return (
    <SectionForm id='search' title={t('settings.search.title')} accent='#57f287' description={t('settings.search.description')} section={section}>
      <Field label={t('settings.search.web')} hint={t('settings.search.web_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.server_default')} choices={SEARCH_PROVIDER_CHOICES} value={section.values.search_provider_web} onChange={(value) => section.set('search_provider_web', value)}/>}
      </Field>
      <Field label={t('settings.search.images')} hint={t('settings.search.images_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.server_default')} choices={SEARCH_PROVIDER_CHOICES} value={section.values.search_provider_images} onChange={(value) => section.set('search_provider_images', value)}/>}
      </Field>
    </SectionForm>
  );
}


function VoiceSection({ settings, onDirtyChange }: SectionProps) {
  const { t, rich } = useI18n();
  const section = useSettingsSection('settings.tts.title', settings, ['tts_voice'], onDirtyChange);
  return (
    <SectionForm id='tts' title={t('settings.tts.title')} accent='#eb459e' description={t('settings.tts.description')} section={section}>
      <Field
        label={t('settings.tts.voice')}
        hint={<>{t('settings.tts.voice_hint')} {rich('settings.tts.voices_link', {link: (chunk) => <Link to={Routes.DASHBOARD_VOICES} className='text-brand-text hover:underline'>{chunk}</Link>})}</>}
      >
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={TTS_VOICE_CHOICES} value={section.values.tts_voice} onChange={(value) => section.set('tts_voice', value)}/>}
      </Field>
    </SectionForm>
  );
}


function VanityHelp({ pattern }: {pattern: string}) {
  const { rich } = useI18n();
  return (
    <span className='block space-y-1'>
      <span className='block'>
        {rich('settings.media.vanity_help', {code: (chunk) => <code className='font-mono text-fg'>{chunk}</code>}, {default: DEFAULT_VANITY})}
      </span>
      {(vanityError(pattern)) ? null : (
        <span className='block'>
          {rich('settings.media.vanity_gives', {code: (chunk) => <code className='font-mono text-code'>{chunk}</code>}, {description: describeVanity(pattern), example: exampleVanityLink(pattern)})}
        </span>
      )}
    </span>
  );
}
