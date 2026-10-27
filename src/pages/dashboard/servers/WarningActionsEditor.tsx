import { Plus } from 'lucide-react';
import { useId } from 'react';

import { translate, useI18n } from '@/i18n';
import type { GuildWarningAction } from '@/lib/api';

import { ChoiceSelect } from '../settings/ChoiceSelect';
import type { Choice } from '../settings/botChoices';
import { formatSeconds } from './guildMeta';
import { RemoveButton } from './ServerSections';


// the api's `MAX_GUILD_WARNING_ACTIONS` and the highest threshold (a member's warning cap)
export const MAX_WARNING_ACTIONS = 10;
export const MAX_WARNING_THRESHOLD = 100;

const HOUR = 3600;
const DAY = 86400;

// labels are getters, read in the language on screen
const ACTION_CHOICES: ReadonlyArray<Choice<GuildWarningAction['action']>> = [
  {value: 'mute', get label() { return translate('wactions.mute'); }},
  {value: 'kick', get label() { return translate('wactions.kick'); }},
  {value: 'ban', get label() { return translate('wactions.ban'); }},
];

// a mute's length (discord's timeouts go up to 28 days), a ban's until the bot lifts it, how far back messages go
const MUTE_DURATIONS = [10 * 60, HOUR, 6 * HOUR, 12 * HOUR, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 28 * DAY];
const BAN_DURATIONS = [DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 90 * DAY, 365 * DAY];
const CLEAN_DURATIONS = [HOUR, 6 * HOUR, 12 * HOUR, DAY, 3 * DAY, 7 * DAY];

// a stored value the list doesn't have (the bot's command takes any duration) still shows
function durationChoices(choices: Array<number>, value: number | null): ReadonlyArray<Choice<number>> {
  const values = (value === null || value === 0 || choices.includes(value)) ? choices : [...choices, value].sort((a, b) => a - b);
  return values.map((seconds) => ({value: seconds, label: formatSeconds(seconds)}));
}

// what a step changes into when its action does, keeping what still applies
function withAction(step: GuildWarningAction, action: GuildWarningAction['action']): GuildWarningAction {
  switch (action) {
    case 'ban': return {...step, action, duration: (step.action === 'ban') ? step.duration : null};
    case 'kick': return {...step, action, duration: null};
    case 'mute': return {...step, action, clean: 0, duration: (step.action === 'mute' && step.duration) ? step.duration : HOUR};
  }
}

// a threshold that isn't 1-100 or is used twice, for the form to block saving
export function warningActionsError(steps: Array<GuildWarningAction>): string | null {
  const thresholds = steps.map((step) => step.threshold);
  if (thresholds.some((threshold) => !Number.isInteger(threshold) || threshold < 1 || MAX_WARNING_THRESHOLD < threshold)) {
    return translate('wactions.bad_threshold', {max: MAX_WARNING_THRESHOLD});
  }
  if (new Set(thresholds).size !== thresholds.length) {
    return translate('wactions.duplicate');
  }
  return null;
}


// the warning ladder: rows of "at N active warnings, do this", the api sorts them once saved
export function WarningActionsEditor({ value, onChange, disabled, error }: {
  value: Array<GuildWarningAction>,
  onChange: (value: Array<GuildWarningAction>) => void,
  disabled?: boolean,
  error?: string | null,
}) {
  const { t } = useI18n();
  const id = useId();
  const update = (index: number, step: GuildWarningAction) => onChange(value.map((x, i) => (i === index) ? step : x));
  const add = () => {
    // a few warnings past the highest step, a mute to start with
    const highest = Math.max(0, ...value.map((step) => step.threshold));
    onChange([...value, {action: 'mute', clean: 0, duration: HOUR, threshold: Math.min(highest + ((highest) ? 2 : 3), MAX_WARNING_THRESHOLD)}]);
  };

  return (
    <div className='min-w-0 md:col-span-2' role='group' aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`}>
      <div id={`${id}-label`} className='mb-1.5 text-sm font-medium text-fg'>{t('wactions.label')}</div>
      {(value.length) ? (
        <ul className='flex flex-col gap-2'>
          {value.map((step, index) => (
            <li key={index} className='flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 p-2'>
              <span className='text-sm text-muted'>{t('wactions.at')}</span>
              <input
                type='number'
                min={1}
                max={MAX_WARNING_THRESHOLD}
                className='input w-20'
                aria-label={t('wactions.active_label')}
                value={(Number.isNaN(step.threshold)) ? '' : step.threshold}
                onChange={(event) => update(index, {...step, threshold: event.target.valueAsNumber})}
              />
              <span className='text-sm text-muted'>{t('wactions.active')}</span>
              <div className='w-28'>
                <ChoiceSelect aria-label={t('wactions.action')} choices={ACTION_CHOICES} value={step.action} onChange={(action) => update(index, withAction(step, action ?? 'mute'))}/>
              </div>
              {(step.action === 'mute') ? (
                <div className='w-32'>
                  <ChoiceSelect aria-label={t('wactions.mute_for')} choices={durationChoices(MUTE_DURATIONS, step.duration)} value={step.duration} onChange={(duration) => update(index, {...step, duration: duration ?? HOUR})}/>
                </div>
              ) : null}
              {(step.action === 'ban') ? (
                <div className='w-36'>
                  <ChoiceSelect aria-label={t('wactions.ban_for')} noneLabel={t('wactions.permanently')} choices={durationChoices(BAN_DURATIONS, step.duration)} value={step.duration} onChange={(duration) => update(index, {...step, duration})}/>
                </div>
              ) : null}
              {(step.action !== 'mute') ? (
                <div className='w-44'>
                  <ChoiceSelect
                    aria-label={t('wactions.delete_from')}
                    noneLabel={t('wactions.keep')}
                    choices={durationChoices(CLEAN_DURATIONS, step.clean).map((choice) => ({...choice, label: t('wactions.delete_last', {duration: choice.label})}))}
                    value={step.clean || null}
                    onChange={(clean) => update(index, {...step, clean: clean ?? 0})}
                  />
                </div>
              ) : null}
              <div className='ml-auto'>
                <RemoveButton label={t('wactions.remove')} busy={false} disabled={!!disabled} onClick={() => onChange(value.filter((_, i) => i !== index))}/>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className='rounded-lg border border-dashed border-border p-3 text-sm text-subtle'>{t('wactions.off')}</p>
      )}
      <button type='button' className='btn btn-sm btn-secondary mt-2' disabled={disabled || MAX_WARNING_ACTIONS <= value.length} onClick={add}>
        <Plus aria-hidden className='size-4'/>
        {t('wactions.add')}
      </button>
      {(error) ? (
        <p id={`${id}-hint`} className='mt-1.5 text-xs text-danger'>{error}</p>
      ) : (
        <p id={`${id}-hint`} className='mt-1.5 text-xs text-subtle'>
          {t('wactions.hint')}
        </p>
      )}
    </div>
  );
}
