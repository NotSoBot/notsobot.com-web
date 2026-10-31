import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { GuildModerationDmFlags, type UserGuild, type UserGuildPatch } from '@/lib/api';
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
import { CharCounter, Field, InlineError, Panel, SaveBar, Toggle } from '../ui';
import { banCleanChoices, useReadOnlyMessage, warningsExpireChoices, warningsWindowChoices } from './guildMeta';
import { WarningActionsEditor, warningActionsError } from './WarningActionsEditor';
import { WarningAutoEditor, warningAutoError } from './WarningAutoEditor';


// the owner/admin bypass is changed from the rules panel
type SettingsPatch = Omit<UserGuildPatch, 'rules_admin_bypass'>;
type Values = Required<{[K in keyof SettingsPatch]: Exclude<SettingsPatch[K], undefined>}>;

// the settings are split into groups that each sit on their own server page, with their own save bar.
// Saving one never touches another's edits
export type SettingsGroup = 'general' | 'ai' | 'moderation' | 'warnings';

// the title, description and save/fail toasts are `ssettings.<group>.title`, `.description`, `.saved` and `.failed`
const GROUP_ACCENTS: Record<SettingsGroup, string> = {
  general: '#00b0f4',
  ai: '#a855f7',
  moderation: '#ed4245',
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
    ban_clean: guild.settings.ban_clean,
    moderation_dm_disabled: guild.settings.moderation_dm_disabled,
    warnings_window: guild.settings.warnings_window,
    warnings_expire: guild.settings.warnings_expire,
    warnings_actions: guild.settings.warnings_actions ?? [],
    warnings_auto: guild.settings.warnings_auto ?? [],
    warnings_auto_exempt: guild.settings.warnings_auto_exempt ?? null,
  };
}


// the moderation dms in the order they're shown, a toggle each (`ssettings.dm.<key>`)
const MODERATION_DMS = [
  {flag: GuildModerationDmFlags.BAN, key: 'ban'},
  {flag: GuildModerationDmFlags.KICK, key: 'kick'},
  {flag: GuildModerationDmFlags.MUTE, key: 'mute'},
  {flag: GuildModerationDmFlags.WARN, key: 'warn'},
  {flag: GuildModerationDmFlags.AUTOWARN, key: 'autowarn'},
] as const;


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
  const banClean = values.ban_clean ?? 0;
  const dmDisabled = values.moderation_dm_disabled ?? 0;

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
          {(group === 'moderation') ? (
            <>
              <Field label={t('ssettings.ban_clean')} hint={t('ssettings.ban_clean_hint')}>
                {(props) => <ChoiceSelect {...props} choices={banCleanChoices(banClean)} value={banClean} onChange={(value) => draft.set('ban_clean', value ?? 0)}/>}
              </Field>
              <div className='space-y-3 md:col-span-2'>
                <div>
                  <p className='text-sm font-medium text-fg'>{t('ssettings.dm.label')}</p>
                  <p className='mt-0.5 text-xs text-subtle'>{t('ssettings.dm.hint')}</p>
                </div>
                {MODERATION_DMS.map(({ flag, key }) => (
                  <Toggle
                    key={key}
                    label={t(`ssettings.dm.${key}`)}
                    checked={(dmDisabled & flag) !== flag}
                    disabled={!editable}
                    onChange={(value) => draft.set('moderation_dm_disabled', (value) ? (dmDisabled & ~flag) : (dmDisabled | flag))}
                  />
                ))}
              </div>
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
                exempt={values.warnings_auto_exempt}
                onExemptChange={(value) => draft.set('warnings_auto_exempt', value)}
                guildId={guild.id}
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
