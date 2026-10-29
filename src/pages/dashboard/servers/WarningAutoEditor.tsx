import { Plus } from 'lucide-react';
import { useId } from 'react';

import { translate, useI18n } from '@/i18n';
import type { GuildWarningAuto } from '@/lib/api';

import { ChoiceSelect } from '../settings/ChoiceSelect';
import type { Choice } from '../settings/botChoices';
import { isSnowflake } from '../tags/tagMeta';
import { RemoveButton } from './ServerSections';


// the api's `MAX_GUILD_WARNINGS_AUTO`, `MAX_GUILD_WARNINGS_AUTO_MENTIONS` and `MAX_GUILD_WARNING_WEIGHT`
export const MAX_WARNING_AUTO = 20;
export const MAX_WARNING_AUTO_MENTIONS = 50;
export const MAX_WARNING_WEIGHT = 10;

const DEFAULT_MENTIONS_LIMIT = 5;

type Scope = 'guild' | 'channel';

// labels are getters, read in the language on screen
const TRIGGER_CHOICES: ReadonlyArray<Choice<GuildWarningAuto['trigger']>> = [
  {value: 'mentions', get label() { return translate('wauto.mentions'); }},
  {value: 'blocked_command', get label() { return translate('wauto.blocked_command'); }},
];

const SCOPE_CHOICES: ReadonlyArray<Choice<Scope>> = [
  {value: 'guild', get label() { return translate('wauto.anywhere'); }},
  {value: 'channel', get label() { return translate('wauto.in_channel'); }},
];

function inRange(value: number | null, max: number): boolean {
  return value !== null && Number.isInteger(value) && 1 <= value && value <= max;
}

// a limit, count or channel the api won't take, or two rules for the same trigger and channel, for the form to block saving
export function warningAutoError(rules: Array<GuildWarningAuto>): string | null {
  if (rules.some((rule) => rule.trigger === 'mentions' && !inRange(rule.limit, MAX_WARNING_AUTO_MENTIONS))) {
    return translate('wauto.bad_limit', {max: MAX_WARNING_AUTO_MENTIONS});
  }
  if (rules.some((rule) => !inRange(rule.warnings, MAX_WARNING_WEIGHT))) {
    return translate('wauto.bad_warnings', {max: MAX_WARNING_WEIGHT});
  }
  if (rules.some((rule) => rule.channel_id !== null && !isSnowflake(rule.channel_id))) {
    return translate('wauto.bad_channel');
  }
  const keys = rules.map((rule) => `${rule.trigger}:${rule.channel_id}`);
  if (new Set(keys).size !== keys.length) {
    return translate('wauto.duplicate');
  }
  return null;
}


// the auto-warn rules: rows of "for this, here, warn them as N warnings", the api sorts them once saved
export function WarningAutoEditor({ value, onChange, disabled, error }: {
  value: Array<GuildWarningAuto>,
  onChange: (value: Array<GuildWarningAuto>) => void,
  disabled?: boolean,
  error?: string | null,
}) {
  const { t, plural } = useI18n();
  const id = useId();
  const update = (index: number, rule: GuildWarningAuto) => onChange(value.map((x, i) => (i === index) ? rule : x));
  const add = () => {
    // a server-wide rule for whichever trigger doesn't have one yet, then a channel one to fill in
    const free = TRIGGER_CHOICES.find((choice) => !value.some((rule) => rule.trigger === choice.value && rule.channel_id === null));
    const trigger = free?.value ?? 'mentions';
    onChange([...value, {channel_id: (free) ? null : '', limit: (trigger === 'mentions') ? DEFAULT_MENTIONS_LIMIT : null, trigger, warnings: 1}]);
  };

  return (
    <div className='min-w-0 md:col-span-2' role='group' aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`}>
      <div id={`${id}-label`} className='mb-1.5 text-sm font-medium text-fg'>{t('wauto.label')}</div>
      {(value.length) ? (
        <ul className='flex flex-col gap-2'>
          {value.map((rule, index) => (
            <li key={index} className='flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 p-2'>
              <div className='w-48'>
                <ChoiceSelect
                  aria-label={t('wauto.trigger')}
                  choices={TRIGGER_CHOICES}
                  value={rule.trigger}
                  onChange={(trigger) => update(index, {...rule, trigger: trigger ?? 'mentions', limit: (trigger === 'blocked_command') ? null : rule.limit ?? DEFAULT_MENTIONS_LIMIT})}
                />
              </div>
              {(rule.trigger === 'mentions') ? (
                <>
                  <span className='text-sm text-muted'>{t('wauto.more_than')}</span>
                  <input
                    type='number'
                    min={1}
                    max={MAX_WARNING_AUTO_MENTIONS}
                    className='input w-20'
                    aria-label={t('wauto.limit_label')}
                    value={(rule.limit === null || Number.isNaN(rule.limit)) ? '' : rule.limit}
                    onChange={(event) => update(index, {...rule, limit: event.target.valueAsNumber})}
                  />
                  <span className='text-sm text-muted'>{t('wauto.in_one_message')}</span>
                </>
              ) : null}
              <div className='w-44'>
                <ChoiceSelect
                  aria-label={t('wauto.where')}
                  choices={SCOPE_CHOICES}
                  value={(rule.channel_id === null) ? 'guild' : 'channel'}
                  onChange={(scope) => update(index, {...rule, channel_id: (scope === 'channel') ? rule.channel_id ?? '' : null})}
                />
              </div>
              {(rule.channel_id !== null) ? (
                <input
                  className='input w-48 font-mono'
                  inputMode='numeric'
                  aria-label={t('wauto.channel_label')}
                  aria-invalid={!isSnowflake(rule.channel_id)}
                  placeholder={t('wauto.channel_placeholder')}
                  value={rule.channel_id}
                  onChange={(event) => update(index, {...rule, channel_id: event.target.value.replace(/[<>#\s]/g, '')})}
                  autoComplete='off'
                />
              ) : null}
              <span className='text-sm text-muted'>{t('wauto.counts_as')}</span>
              <input
                type='number'
                min={1}
                max={MAX_WARNING_WEIGHT}
                className='input w-16'
                aria-label={t('wauto.warnings_label')}
                value={(Number.isNaN(rule.warnings)) ? '' : rule.warnings}
                onChange={(event) => update(index, {...rule, warnings: event.target.valueAsNumber})}
              />
              <span className='text-sm text-muted'>{plural('wauto.warnings', (Number.isNaN(rule.warnings)) ? 0 : rule.warnings)}</span>
              <div className='ml-auto'>
                <RemoveButton label={t('wauto.remove')} busy={false} disabled={!!disabled} onClick={() => onChange(value.filter((_, i) => i !== index))}/>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className='rounded-lg border border-dashed border-border p-3 text-sm text-subtle'>{t('wauto.off')}</p>
      )}
      <button type='button' className='btn btn-sm btn-secondary mt-2' disabled={disabled || MAX_WARNING_AUTO <= value.length} onClick={add}>
        <Plus aria-hidden className='size-4'/>
        {t('wauto.add')}
      </button>
      {(error) ? (
        <p id={`${id}-hint`} className='mt-1.5 text-xs text-danger-text'>{error}</p>
      ) : (
        <p id={`${id}-hint`} className='mt-1.5 text-xs text-subtle'>
          {t('wauto.hint')}
        </p>
      )}
    </div>
  );
}
