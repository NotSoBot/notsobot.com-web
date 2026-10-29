import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import type { UserGuild, UserGuildPatch } from '@/lib/api';
import { errorMessage, useGuildMutation } from '@/lib/api/dashboardQueries';

import { ChoiceSelect } from '../settings/ChoiceSelect';
import {
  DIFFUSION_MODEL_CHOICES,
  LLM_MODEL_CHOICES,
  LOCALE_CHOICES,
  PERSONALITY_MAX,
  RESPONSE_DISPLAY_CHOICES,
  SEARCH_PROVIDER_CHOICES,
  TIMEZONE_CHOICES,
} from '../settings/settingsChoices';
import { PersonalityHint } from '../settings/PersonalityHint';
import { useDraft } from '../settings/useDraft';
import { CharCounter, Field, InlineError, Panel, SaveBar } from '../ui';
import { useReadOnlyMessage, warningsExpireChoices, warningsWindowChoices } from './guildMeta';
import { WarningActionsEditor, warningActionsError } from './WarningActionsEditor';
import { WarningAutoEditor, warningAutoError } from './WarningAutoEditor';


// the owner/admin bypass is changed from the rules panel
type SettingsPatch = Omit<UserGuildPatch, 'rules_admin_bypass'>;
type Values = Required<{[K in keyof SettingsPatch]: Exclude<SettingsPatch[K], undefined>}>;

// the settings are split into groups that each sit on their own server page, with their own save bar.
// Saving one never touches another's edits
export type SettingsGroup = 'general' | 'ai' | 'warnings';

// the title, description and save/fail toasts are `ssettings.<group>.title`, `.description`, `.saved` and `.failed`
const GROUP_ACCENTS: Record<SettingsGroup, string> = {
  general: '#00b0f4',
  ai: '#a855f7',
  warnings: '#fee75c',
};


// every group's draft starts from all the settings, but only its own fields can be edited, so its patch (`draft.changes`)
// only ever has those
function savedValues(guild: UserGuild): Values {
  return {
    locale: guild.locale,
    timezone: guild.timezone,
    ml_llm_personality: guild.settings.ml_llm_personality,
    ml_llm_model: guild.settings.ml_llm_model,
    ml_diffusion_model: guild.settings.ml_diffusion_model,
    response_display: guild.settings.response_display,
    search_provider_images: guild.settings.search_provider_images,
    search_provider_web: guild.settings.search_provider_web,
    warnings_window: guild.settings.warnings_window,
    warnings_expire: guild.settings.warnings_expire,
    warnings_actions: guild.settings.warnings_actions ?? [],
    warnings_auto: guild.settings.warnings_auto ?? [],
  };
}


// which of a modal's forms have unsaved edits, for the tabs' dots and asking before closing
export function useDirtyGroups<K extends string>() {
  const [ dirty, setDirty ] = useState<Partial<Record<K, boolean>>>({});
  const setter = useCallback((key: K) => (value: boolean) => {
    setDirty((previous) => (!!previous[key] === value) ? previous : {...previous, [key]: value});
  }, []);
  const any = Object.values(dirty).some(Boolean);
  return {dirty, setter, any};
}


export function ServerSettingsForm({ guild, group, onDirtyChange }: {guild: UserGuild, group: SettingsGroup, onDirtyChange: (dirty: boolean) => void}) {
  const { t } = useI18n();
  const toast = useToast();
  const editable = guild.editable.settings;
  const readOnlyMessage = useReadOnlyMessage();
  const mutation = useGuildMutation(guild.id);
  const info = {
    title: t(`ssettings.${group}.title`),
    accent: GROUP_ACCENTS[group],
    description: t(`ssettings.${group}.description`),
    saved: t(`ssettings.${group}.saved`),
    failed: t(`ssettings.${group}.failed`),
  };

  const saved = useMemo(() => savedValues(guild), [guild]);
  const draft = useDraft(saved);
  const { values } = draft;
  const personality = values.ml_llm_personality ?? '';
  const warningActions = values.warnings_actions ?? [];
  const actionsError = (group === 'warnings') ? warningActionsError(warningActions) : null;
  const warningAuto = values.warnings_auto ?? [];
  const autoError = (group === 'warnings') ? warningAutoError(warningAuto) : null;

  useEffect(() => {
    onDirtyChange(draft.dirty);
  }, [draft.dirty, onDirtyChange]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.dirty || mutation.isPending || PERSONALITY_MAX < personality.length || actionsError || autoError) {
          return;
        }
        mutation.mutate({kind: 'settings', patch: draft.changes}, {
          onSuccess: () => {
            draft.reset();
            toast(info.saved);
          },
          onError: (error) => toast(errorMessage(error, info.failed), 'error'),
        });
      }}
    >
      <Panel
        title={info.title}
        accent={info.accent}
        description={info.description}
        readOnly={(editable) ? undefined : readOnlyMessage('settings')}
      >
        <fieldset disabled={!editable} className='grid min-w-0 grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2'>
          {(group === 'general') ? (
            <>
              <Field label={t('settings.region.language')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('settings.region.auto_language')} choices={LOCALE_CHOICES} value={values.locale} onChange={(value) => draft.set('locale', value)}/>}
              </Field>
              <Field label={t('settings.region.timezone')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('settings.region.no_timezone')} choices={TIMEZONE_CHOICES} value={values.timezone} onChange={(value) => draft.set('timezone', value)}/>}
              </Field>
              <Field label={t('settings.ai.image_model')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={DIFFUSION_MODEL_CHOICES} value={values.ml_diffusion_model} onChange={(value) => draft.set('ml_diffusion_model', value)}/>}
              </Field>
              <Field label={t('settings.display.response')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={RESPONSE_DISPLAY_CHOICES} value={values.response_display} onChange={(value) => draft.set('response_display', value)}/>}
              </Field>
              <Field label={t('settings.search.web')} hint={t('ssettings.member_wins')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('ssettings.default_ddg')} choices={SEARCH_PROVIDER_CHOICES} value={values.search_provider_web} onChange={(value) => draft.set('search_provider_web', value)}/>}
              </Field>
              <Field label={t('settings.search.images')} hint={t('ssettings.member_wins')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('ssettings.default_google')} choices={SEARCH_PROVIDER_CHOICES} value={values.search_provider_images} onChange={(value) => draft.set('search_provider_images', value)}/>}
              </Field>
            </>
          ) : null}
          {(group === 'ai') ? (
            <>
              <Field
                className='md:col-span-2'
                label={t('ssettings.personality')}
                counter={<CharCounter length={personality.length} max={PERSONALITY_MAX}/>}
                hint={<PersonalityHint>{t('ssettings.personality_hint')}</PersonalityHint>}
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={4}
                    maxLength={PERSONALITY_MAX}
                    className='input resize-y leading-relaxed'
                    value={personality}
                    onChange={(event) => draft.set('ml_llm_personality', event.target.value || null)}
                  />
                )}
              </Field>
              <Field label={t('settings.ai.model')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('settings.default')} choices={LLM_MODEL_CHOICES} value={values.ml_llm_model} onChange={(value) => draft.set('ml_llm_model', value)}/>}
              </Field>
            </>
          ) : null}
          {(group === 'warnings') ? (
            <>
              <Field label={t('ssettings.window')} hint={t('ssettings.window_hint')}>
                {(props) => <ChoiceSelect {...props} choices={warningsWindowChoices(values.warnings_window)} value={values.warnings_window} onChange={(value) => draft.set('warnings_window', value)}/>}
              </Field>
              <Field label={t('ssettings.expire')} hint={t('ssettings.expire_hint')}>
                {(props) => <ChoiceSelect {...props} noneLabel={t('ssettings.never_default')} choices={warningsExpireChoices(values.warnings_expire)} value={values.warnings_expire} onChange={(value) => draft.set('warnings_expire', value)}/>}
              </Field>
              <WarningActionsEditor
                value={warningActions}
                onChange={(value) => draft.set('warnings_actions', value)}
                disabled={!editable}
                error={actionsError}
              />
              <WarningAutoEditor
                value={warningAuto}
                onChange={(value) => draft.set('warnings_auto', value)}
                disabled={!editable}
                error={autoError}
              />
            </>
          ) : null}
        </fieldset>
        {(mutation.isError && draft.dirty) ? <InlineError>{errorMessage(mutation.error, info.failed)}</InlineError> : null}
        {(editable) ? <SaveBar dirty={draft.dirty} pending={mutation.isPending} onDiscard={draft.reset}/> : null}
      </Panel>
    </form>
  );
}
