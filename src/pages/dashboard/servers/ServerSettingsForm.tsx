import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
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


// the owner/admin bypass is changed from the rules panel
type SettingsPatch = Omit<UserGuildPatch, 'rules_admin_bypass'>;
type Values = Required<{[K in keyof SettingsPatch]: Exclude<SettingsPatch[K], undefined>}>;

// the settings are split into groups that each sit on their own server page, with their own save bar.
// Saving one never touches another's edits
export type SettingsGroup = 'general' | 'ai' | 'warnings';

const GROUPS: Record<SettingsGroup, {title: string, accent: string, description: string, saved: string, failed: string}> = {
  general: {
    title: 'Server settings',
    accent: '#00b0f4',
    description: 'Defaults for everyone in this server. Members’ personal settings take priority.',
    saved: 'Server settings saved',
    failed: 'Couldn’t save the server settings.',
  },
  ai: {
    title: 'NotSoAI settings',
    accent: '#a855f7',
    description: 'How NotSoAI behaves in this server. Members’ personal settings take priority.',
    saved: 'NotSoAI settings saved',
    failed: 'Couldn’t save the NotSoAI settings.',
  },
  warnings: {
    title: 'Warning settings',
    accent: '#fee75c',
    description: 'How long warnings count and last, and what happens automatically as they add up.',
    saved: 'Warning settings saved',
    failed: 'Couldn’t save the warning settings.',
  },
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
  const toast = useToast();
  const editable = guild.editable.settings;
  const readOnlyMessage = useReadOnlyMessage();
  const mutation = useGuildMutation(guild.id);
  const info = GROUPS[group];

  const saved = useMemo(() => savedValues(guild), [guild]);
  const draft = useDraft(saved);
  const { values } = draft;
  const personality = values.ml_llm_personality ?? '';
  const warningActions = values.warnings_actions ?? [];
  const actionsError = (group === 'warnings') ? warningActionsError(warningActions) : null;

  useEffect(() => {
    onDirtyChange(draft.dirty);
  }, [draft.dirty, onDirtyChange]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.dirty || mutation.isPending || PERSONALITY_MAX < personality.length || actionsError) {
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
              <Field label='Language'>
                {(props) => <ChoiceSelect {...props} noneLabel='Automatic (from Discord)' choices={LOCALE_CHOICES} value={values.locale} onChange={(value) => draft.set('locale', value)}/>}
              </Field>
              <Field label='Timezone'>
                {(props) => <ChoiceSelect {...props} noneLabel='Not set (UTC)' choices={TIMEZONE_CHOICES} value={values.timezone} onChange={(value) => draft.set('timezone', value)}/>}
              </Field>
              <Field label='Image model'>
                {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={DIFFUSION_MODEL_CHOICES} value={values.ml_diffusion_model} onChange={(value) => draft.set('ml_diffusion_model', value)}/>}
              </Field>
              <Field label='Response display'>
                {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={RESPONSE_DISPLAY_CHOICES} value={values.response_display} onChange={(value) => draft.set('response_display', value)}/>}
              </Field>
              <Field label='Web search' hint='Each member’s own setting wins over this.'>
                {(props) => <ChoiceSelect {...props} noneLabel='Default (DuckDuckGo)' choices={SEARCH_PROVIDER_CHOICES} value={values.search_provider_web} onChange={(value) => draft.set('search_provider_web', value)}/>}
              </Field>
              <Field label='Image search' hint='Each member’s own setting wins over this.'>
                {(props) => <ChoiceSelect {...props} noneLabel='Default (Google)' choices={SEARCH_PROVIDER_CHOICES} value={values.search_provider_images} onChange={(value) => draft.set('search_provider_images', value)}/>}
              </Field>
            </>
          ) : null}
          {(group === 'ai') ? (
            <>
              <Field
                className='md:col-span-2'
                label='AI personality prompt'
                counter={<CharCounter length={personality.length} max={PERSONALITY_MAX}/>}
                hint={<PersonalityHint>How the AI behaves for people who haven’t set their own.</PersonalityHint>}
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
              <Field label='AI model'>
                {(props) => <ChoiceSelect {...props} noneLabel='Default' choices={LLM_MODEL_CHOICES} value={values.ml_llm_model} onChange={(value) => draft.set('ml_llm_model', value)}/>}
              </Field>
            </>
          ) : null}
          {(group === 'warnings') ? (
            <>
              <Field label='Warnings count as active for' hint='How far back a member’s active warnings go.'>
                {(props) => <ChoiceSelect {...props} choices={warningsWindowChoices(values.warnings_window)} value={values.warnings_window} onChange={(value) => draft.set('warnings_window', value)}/>}
              </Field>
              <Field label='Delete warnings after' hint='Older warnings are removed for good.'>
                {(props) => <ChoiceSelect {...props} noneLabel='Never (default)' choices={warningsExpireChoices(values.warnings_expire)} value={values.warnings_expire} onChange={(value) => draft.set('warnings_expire', value)}/>}
              </Field>
              <WarningActionsEditor
                value={warningActions}
                onChange={(value) => draft.set('warnings_actions', value)}
                disabled={!editable}
                error={actionsError}
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
