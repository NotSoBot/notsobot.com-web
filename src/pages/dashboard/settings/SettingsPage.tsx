import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { useToast } from '@/components/ui/Toast';
import { translate, useI18n, type TranslationKey } from '@/i18n';
import type { UserSettings, UserSettingsPatch } from '@/lib/api';
import { errorMessage, useMeSettingsQuery, usePatchMeSettingsMutation } from '@/lib/api/dashboardQueries';
import { formatNumber } from '@/lib/utils';

import { CharCounter, DashboardHeader, ErrorPanel, Field, InlineError, Panel, PanelSkeleton, SaveBar, UnsavedChangesGuard } from '../ui';
import { ChoiceSelect } from './ChoiceSelect';
import { PersonalityHint } from './PersonalityHint';
import {
  APPLICATION_COMMAND_RESPONSE_CHOICES,
  DIFFUSION_MODEL_CHOICES,
  DOWNLOAD_QUALITY_CHOICES,
  FALLBACK_IMAGE_CHOICES,
  LLM_MODEL_CHOICES,
  LOCALE_CHOICES,
  PERSONALITY_MAX,
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


export function SettingsPage() {
  const { t } = useI18n();
  const { data: settings, isPending, error, refetch, isRefetching } = useMeSettingsQuery();
  const [ dirtySections, setDirtySections ] = useState<ReadonlySet<string>>(new Set());

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
          <SearchSection settings={settings} onDirtyChange={onDirtyChange}/>
          <VoiceSection settings={settings} onDirtyChange={onDirtyChange}/>
        </div>
      )}
      <YourDataSection/>
      <UnsavedChangesGuard when={0 < dirtySections.size}/>
    </>
  );
}


// One independently saved group of settings. Saving is optimistic (the cache updates right away);
// if the API refuses, the cache rolls back and the edits come back so nothing typed is lost. `name` is the section's
// title key, which also tells the sections apart for the unsaved changes guard
function useSettingsSection<K extends keyof Values>(name: TranslationKey, settings: UserSettings, keys: ReadonlyArray<K>, onDirtyChange: SectionProps['onDirtyChange']) {
  const toast = useToast();
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
    mutation.mutate(changes as UserSettingsPatch, {
      onSuccess: () => toast(translate('settings.saved_toast', {section: translate(name)})),
      onError: (error) => {
        draft.restore(changes);
        toast(errorMessage(error, translate('settings.save_error')), 'error');
      },
    });
    draft.reset();
  };

  const set = <F extends K>(key: F, value: Values[F]) => {
    if (mutation.isError) {
      mutation.reset();
    }
    draft.set(key, value as Pick<Values, K>[F]);
  };

  return {values: draft.values, dirty: draft.dirty, set, submit, discard: draft.reset, mutation};
}


function SectionForm({ title, description, accent, section, children }: {
  title: string,
  description: string,
  accent: string,
  section: {dirty: boolean, submit: (event: FormEvent) => void, discard: () => void, mutation: ReturnType<typeof usePatchMeSettingsMutation>},
  children: ReactNode,
}) {
  const { t } = useI18n();
  return (
    <form onSubmit={section.submit}>
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
  const { t } = useI18n();
  const section = useSettingsSection('settings.ai.title', settings, ['ml_llm_personality', 'ml_llm_model', 'ml_diffusion_model'], onDirtyChange);
  const personality = section.values.ml_llm_personality ?? '';
  return (
    <SectionForm title={t('settings.ai.title')} accent='#5865f2' description={t('settings.ai.description')} section={section}>
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
    </SectionForm>
  );
}


function RegionSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.region.title', settings, ['locale', 'timezone', 'units'], onDirtyChange);
  return (
    <SectionForm title={t('settings.region.title')} accent='#3ba55c' description={t('settings.region.description')} section={section}>
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
    'file_upload_threshold',
    'file_upload_type',
    'file_upload_vanity',
    'fallbacks_media_image',
  ], onDirtyChange);
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
    <SectionForm title={t('settings.media.title')} accent='#faa81a' description={t('settings.media.description')} section={guardedSection}>
      <Field label={t('settings.media.download_quality')} hint={t('settings.media.download_quality_hint')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={DOWNLOAD_QUALITY_CHOICES} value={section.values.download_quality} onChange={(value) => section.set('download_quality', value)}/>}
      </Field>
      <Field label={t('settings.media.fallback')} hint={t('settings.media.fallback_hint')}>
        {(props) => <ChoiceSelect {...props} choices={FALLBACK_IMAGE_CHOICES} value={section.values.fallbacks_media_image} onChange={(value) => section.set('fallbacks_media_image', value ?? 0)}/>}
      </Field>
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
  const section = useSettingsSection('settings.display.title', settings, ['response_display', 'application_command_response_type'], onDirtyChange);
  return (
    <SectionForm title={t('settings.display.title')} accent='#00b0f4' description={t('settings.display.description')} section={section}>
      <Field label={t('settings.display.response')}>
        {(props) => <ChoiceSelect {...props} noneLabel={t('settings.server_default')} choices={RESPONSE_DISPLAY_CHOICES} value={section.values.response_display} onChange={(value) => section.set('response_display', value)}/>}
      </Field>
      <Field label={t('settings.display.slash')} hint={t('settings.display.slash_hint')}>
        {(props) => <ChoiceSelect {...props} choices={APPLICATION_COMMAND_RESPONSE_CHOICES} value={section.values.application_command_response_type} onChange={(value) => section.set('application_command_response_type', value ?? 0)}/>}
      </Field>
    </SectionForm>
  );
}


function SearchSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useI18n();
  const section = useSettingsSection('settings.search.title', settings, ['search_provider_web', 'search_provider_images'], onDirtyChange);
  return (
    <SectionForm title={t('settings.search.title')} accent='#57f287' description={t('settings.search.description')} section={section}>
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
  const { t } = useI18n();
  const section = useSettingsSection('settings.tts.title', settings, ['tts_voice'], onDirtyChange);
  return (
    <SectionForm title={t('settings.tts.title')} accent='#eb459e' description={t('settings.tts.description')} section={section}>
      <Field label={t('settings.tts.voice')} hint={t('settings.tts.voice_hint')}>
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
