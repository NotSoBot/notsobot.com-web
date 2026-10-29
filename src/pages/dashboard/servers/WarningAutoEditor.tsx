import { Plus, ShieldCheck, X } from 'lucide-react';
import { useId, useState } from 'react';

import { translate, useI18n } from '@/i18n';
import type { GuildWarningAuto, GuildWarningAutoExempt } from '@/lib/api';
import { cn } from '@/lib/utils';

import { ChoiceSelect } from '../settings/ChoiceSelect';
import type { Choice } from '../settings/botChoices';
import { isSnowflake } from '../tags/tagMeta';
import { EntryMention } from './guildMeta';
import { RemoveButton } from './ServerSections';


// the api's `MAX_GUILD_WARNINGS_AUTO`, `MAX_GUILD_WARNINGS_AUTO_MENTIONS` and `MAX_GUILD_WARNING_WEIGHT`
export const MAX_WARNING_AUTO = 20;
export const MAX_WARNING_AUTO_MENTIONS = 50;
export const MAX_WARNING_WEIGHT = 10;
// the api's `MAX_GUILD_WARNINGS_AUTO_EXEMPT_ROLES`
export const MAX_EXEMPT_ROLES = 25;

const DEFAULT_MENTIONS_LIMIT = 5;

// the rows' controls: short, and selects as wide as their longest option, so a rule fits on a line or two
const COMPACT = 'h-8 py-0';
const COMPACT_SELECT = cn(COMPACT, 'w-auto');

type Scope = 'guild' | 'channel';
type AutomodScope = 'any' | 'one';

// labels are getters, read in the language on screen
const TRIGGER_CHOICES: ReadonlyArray<Choice<GuildWarningAuto['trigger']>> = [
  {value: 'mentions', get label() { return translate('wauto.mentions'); }},
  {value: 'blocked_command', get label() { return translate('wauto.blocked_command'); }},
  {value: 'automod', get label() { return translate('wauto.automod'); }},
];

// the dashboard api doesn't list a server's AutoMod rules, so one is picked by its id
const AUTOMOD_CHOICES: ReadonlyArray<Choice<AutomodScope>> = [
  {value: 'any', get label() { return translate('wauto.automod_any'); }},
  {value: 'one', get label() { return translate('wauto.automod_one'); }},
];

const SCOPE_CHOICES: ReadonlyArray<Choice<Scope>> = [
  {value: 'guild', get label() { return translate('wauto.anywhere'); }},
  {value: 'channel', get label() { return translate('wauto.in_channel'); }},
];

// the permissions an exemption can be toggled on here, in Discord's order. The bot's command takes any, those stay as they are
const EXEMPT_PERMISSIONS: ReadonlyArray<{bit: bigint, readonly label: string}> = [
  {bit: 1n << 3n, get label() { return translate('permission.administrator'); }},
  {bit: 1n << 5n, get label() { return translate('permission.manage_server'); }},
  {bit: 1n << 28n, get label() { return translate('permission.manage_roles'); }},
  {bit: 1n << 4n, get label() { return translate('permission.manage_channels'); }},
  {bit: 1n << 1n, get label() { return translate('permission.kick_members'); }},
  {bit: 1n << 2n, get label() { return translate('permission.ban_members'); }},
  {bit: 1n << 40n, get label() { return translate('permission.timeout_members'); }},
  {bit: 1n << 13n, get label() { return translate('permission.manage_messages'); }},
  {bit: 1n << 17n, get label() { return translate('permission.mention_everyone'); }},
];
const EXEMPT_PERMISSIONS_KNOWN = EXEMPT_PERMISSIONS.reduce((mask, permission) => mask | permission.bit, 0n);

function exemptPermissions(exempt: GuildWarningAutoExempt | null | undefined): bigint {
  try {
    return BigInt(exempt?.permissions || '0');
  } catch {
    return 0n;
  }
}

// how many permissions and roles it has, for the rule's toggle
function exemptSize(exempt: GuildWarningAutoExempt | null | undefined): number {
  return exemptPermissions(exempt).toString(2).split('1').length - 1 + (exempt?.role_ids.length ?? 0);
}

// what a rule changes into when its trigger does, keeping what still applies (the api nulls the rest anyway)
function withTrigger(rule: GuildWarningAuto, trigger: GuildWarningAuto['trigger']): GuildWarningAuto {
  return {
    ...rule,
    automod_rule_id: (trigger === 'automod') ? rule.automod_rule_id ?? null : null,
    limit: (trigger === 'mentions') ? rule.limit ?? DEFAULT_MENTIONS_LIMIT : null,
    trigger,
  };
}

function inRange(value: number | null, max: number): boolean {
  return value !== null && Number.isInteger(value) && 1 <= value && value <= max;
}

// a limit, count, channel or AutoMod rule the api won't take, or two rules for the same trigger, channel and AutoMod rule,
// for the form to block saving
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
  if (rules.some((rule) => rule.trigger === 'automod' && rule.automod_rule_id != null && !isSnowflake(rule.automod_rule_id))) {
    return translate('wauto.bad_automod');
  }
  const keys = rules.map((rule) => `${rule.trigger}:${rule.channel_id}:${(rule.trigger === 'automod') ? rule.automod_rule_id ?? null : null}`);
  if (new Set(keys).size !== keys.length) {
    return translate('wauto.duplicate');
  }
  return null;
}


// the auto-warn rules: rows of "for this, here, warn them as N warnings", the api sorts them once saved. Rules keep their
// `exempt` and `automod_rule_id` through every edit (saving replaces the whole list), and who every rule skips is edited
// below them
export function WarningAutoEditor({ value, onChange, exempt, onExemptChange, guildId, disabled, error }: {
  value: Array<GuildWarningAuto>,
  onChange: (value: Array<GuildWarningAuto>) => void,
  exempt: GuildWarningAutoExempt | null,
  onExemptChange: (value: GuildWarningAutoExempt | null) => void,
  guildId: string,
  disabled?: boolean,
  error?: string | null,
}) {
  const { t, plural } = useI18n();
  const id = useId();
  // the rows whose exemptions are open, by index
  const [ open, setOpen ] = useState<ReadonlySet<number>>(new Set());
  const update = (index: number, rule: GuildWarningAuto) => onChange(value.map((x, i) => (i === index) ? rule : x));
  const add = () => {
    // a server-wide rule for whichever trigger doesn't have one yet, then a channel one to fill in
    const free = TRIGGER_CHOICES.find((choice) => !value.some((rule) => rule.trigger === choice.value && rule.channel_id === null && !rule.automod_rule_id));
    const trigger = free?.value ?? 'mentions';
    onChange([...value, {automod_rule_id: null, channel_id: (free) ? null : '', exempt: null, limit: (trigger === 'mentions') ? DEFAULT_MENTIONS_LIMIT : null, trigger, warnings: 1}]);
  };
  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setOpen((previous) => new Set([...previous].filter((i) => i !== index).map((i) => (index < i) ? i - 1 : i)));
  };
  const toggle = (index: number) => setOpen((previous) => {
    const next = new Set(previous);
    if (!next.delete(index)) {
      next.add(index);
    }
    return next;
  });

  return (
    <div className='min-w-0 md:col-span-2' role='group' aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`}>
      <div id={`${id}-label`} className='mb-1.5 text-sm font-medium text-fg'>{t('wauto.label')}</div>
      {(value.length) ? (
        <ul className='flex flex-col gap-2'>
          {value.map((rule, index) => (
            <li key={index} className='rounded-lg border border-border bg-surface-2 p-2'>
              {/* the rule's controls wrap on their own, its buttons stay in the top right */}
              <div className='flex items-start gap-2'>
                <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5'>
                  <ChoiceSelect
                    className={COMPACT_SELECT}
                    aria-label={t('wauto.trigger')}
                    choices={TRIGGER_CHOICES}
                    value={rule.trigger}
                    onChange={(trigger) => update(index, withTrigger(rule, trigger ?? 'mentions'))}
                  />
                  {(rule.trigger === 'automod') ? (
                    <>
                      <ChoiceSelect
                        className={COMPACT_SELECT}
                        aria-label={t('wauto.automod_which')}
                        choices={AUTOMOD_CHOICES}
                        value={(rule.automod_rule_id == null) ? 'any' : 'one'}
                        onChange={(scope) => update(index, {...rule, automod_rule_id: (scope === 'one') ? rule.automod_rule_id ?? '' : null})}
                      />
                      {(rule.automod_rule_id != null) ? (
                        <input
                          className={cn('input w-40 px-2 font-mono text-xs', COMPACT)}
                          inputMode='numeric'
                          aria-label={t('wauto.automod_label')}
                          aria-invalid={!isSnowflake(rule.automod_rule_id)}
                          placeholder={t('wauto.automod_placeholder')}
                          value={rule.automod_rule_id}
                          onChange={(event) => update(index, {...rule, automod_rule_id: event.target.value.replace(/\s/g, '')})}
                          autoComplete='off'
                        />
                      ) : null}
                    </>
                  ) : null}
                  {(rule.trigger === 'mentions') ? (
                    <>
                      <span className='flex items-center gap-2'>
                        <span className='text-sm text-muted'>{t('wauto.more_than')}</span>
                        <input
                          type='number'
                          min={1}
                          max={MAX_WARNING_AUTO_MENTIONS}
                          className={cn('input w-14', COMPACT)}
                          aria-label={t('wauto.limit_label')}
                          value={(rule.limit === null || Number.isNaN(rule.limit)) ? '' : rule.limit}
                          onChange={(event) => update(index, {...rule, limit: event.target.valueAsNumber})}
                        />
                      </span>
                      <span className='text-sm text-muted'>{t('wauto.in_one_message')}</span>
                    </>
                  ) : null}
                  {/* always its own line under what the rule is for: where it applies, then what it counts as */}
                  <div className='flex basis-full flex-wrap items-center gap-x-2 gap-y-1.5'>
                    <ChoiceSelect
                      className={COMPACT_SELECT}
                      aria-label={t('wauto.where')}
                      choices={SCOPE_CHOICES}
                      value={(rule.channel_id === null) ? 'guild' : 'channel'}
                      onChange={(scope) => update(index, {...rule, channel_id: (scope === 'channel') ? rule.channel_id ?? '' : null})}
                    />
                    {(rule.channel_id !== null) ? (
                      <input
                        className={cn('input w-40 px-2 font-mono text-xs', COMPACT)}
                        inputMode='numeric'
                        aria-label={t('wauto.channel_label')}
                        aria-invalid={!isSnowflake(rule.channel_id)}
                        placeholder={t('wauto.channel_placeholder')}
                        value={rule.channel_id}
                        onChange={(event) => update(index, {...rule, channel_id: event.target.value.replace(/[<>#\s]/g, '')})}
                        autoComplete='off'
                      />
                    ) : null}
                    <span className='flex items-center gap-2 whitespace-nowrap'>
                      <span className='text-sm text-muted'>{t('wauto.counts_as')}</span>
                      <input
                        type='number'
                        min={1}
                        max={MAX_WARNING_WEIGHT}
                        className={cn('input w-14', COMPACT)}
                        aria-label={t('wauto.warnings_label')}
                        value={(Number.isNaN(rule.warnings)) ? '' : rule.warnings}
                        onChange={(event) => update(index, {...rule, warnings: event.target.valueAsNumber})}
                      />
                      <span className='text-sm text-muted'>{plural('wauto.warnings', (Number.isNaN(rule.warnings)) ? 0 : rule.warnings)}</span>
                    </span>
                  </div>
                </div>
                <div className='flex h-8 shrink-0 items-center gap-1'>
                  {/* an icon, with how many there are once there are some */}
                  <button
                    type='button'
                    className={cn(
                      'flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors hover:bg-surface-3 hover:text-white',
                      (open.has(index)) ? 'bg-surface-3 text-white' : (exemptSize(rule.exempt)) ? 'text-fg' : 'text-subtle',
                    )}
                    aria-label={(exemptSize(rule.exempt)) ? t('wauto.exemptions_count', {count: exemptSize(rule.exempt)}) : t('wauto.exemptions')}
                    title={(exemptSize(rule.exempt)) ? t('wauto.exemptions_count', {count: exemptSize(rule.exempt)}) : t('wauto.exemptions')}
                    aria-expanded={open.has(index)}
                    aria-controls={`${id}-exempt-${index}`}
                    onClick={() => toggle(index)}
                  >
                    <ShieldCheck aria-hidden className='size-4'/>
                    {(exemptSize(rule.exempt)) ? <span className='tabular-nums'>{exemptSize(rule.exempt)}</span> : null}
                  </button>
                  <RemoveButton label={t('wauto.remove')} busy={false} disabled={!!disabled} onClick={() => remove(index)}/>
                </div>
              </div>
              {(open.has(index)) ? (
                <div id={`${id}-exempt-${index}`} className='mt-2 border-t border-border pt-2'>
                  <ExemptEditor
                    label={t('wauto.rule_exempt_label')}
                    value={rule.exempt ?? null}
                    onChange={(exempt) => update(index, {...rule, exempt})}
                    guildId={guildId}
                  />
                  <p className='mt-1.5 text-xs text-subtle'>{t('wauto.rule_exempt_hint')}</p>
                </div>
              ) : null}
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
          {(value.some((rule) => rule.trigger === 'automod')) ? ` ${t('wauto.automod_hint')}` : null}
        </p>
      )}
      <div className='mt-4'>
        <ExemptEditor label={t('wauto.exempt_label')} value={exempt} onChange={onExemptChange} guildId={guildId}/>
        <p className='mt-1.5 text-xs text-subtle'>{t('wauto.exempt_hint')}</p>
      </div>
    </div>
  );
}


// who auto-warn skips: permission toggles and a list of role IDs. Empty is null, like the api stores it
function ExemptEditor({ label, value, onChange, guildId }: {
  label: string,
  value: GuildWarningAutoExempt | null,
  onChange: (value: GuildWarningAutoExempt | null) => void,
  guildId: string,
}) {
  const { t } = useI18n();
  const id = useId();
  const [ roleId, setRoleId ] = useState('');
  const permissions = exemptPermissions(value);
  const roleIds = value?.role_ids ?? [];
  const set = (next: bigint, nextRoleIds: Array<string>) => {
    onChange((next || nextRoleIds.length) ? {permissions: next.toString(), role_ids: nextRoleIds} : null);
  };

  const trimmed = roleId.trim();
  const full = MAX_EXEMPT_ROLES <= roleIds.length;
  // @everyone's id is the server's, exempting it would turn the rule off
  const roleError = (!trimmed) ? null
    : (!isSnowflake(trimmed)) ? t('rules.bad_id')
    : (trimmed === guildId) ? t('wauto.role_everyone')
    : (roleIds.includes(trimmed)) ? t('wauto.role_exists')
    : null;
  const addRole = () => {
    if (trimmed && !roleError && !full) {
      set(permissions, [...roleIds, trimmed]);
      setRoleId('');
    }
  };

  return (
    <div role='group' aria-labelledby={`${id}-label`} className='space-y-2'>
      <div id={`${id}-label`} className='text-sm font-medium text-fg'>{label}</div>
      <ul className='flex flex-wrap gap-1.5' aria-label={t('wauto.permissions')}>
        {EXEMPT_PERMISSIONS.map((permission) => {
          const active = (permissions & permission.bit) === permission.bit;
          return (
            <li key={permission.bit.toString()}>
              <button
                type='button'
                aria-pressed={active}
                className={cn(
                  'cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  (active) ? 'border-brand/70 bg-surface-3 text-white' : 'border-line text-muted hover:bg-surface-2 hover:text-white',
                )}
                onClick={() => set(permissions ^ permission.bit, roleIds)}
              >
                {permission.label}
              </button>
            </li>
          );
        })}
      </ul>
      {(permissions & ~EXEMPT_PERMISSIONS_KNOWN) ? <p className='text-xs text-subtle'>{t('wauto.other_permissions')}</p> : null}
      <div className='flex flex-wrap items-center gap-1.5'>
        {roleIds.map((role) => (
          <span key={role} className='inline-flex min-w-0 items-center gap-1 rounded-md border border-line bg-surface-3 py-0.5 pr-0.5 pl-2'>
            <EntryMention type='role' id={role}/>
            <button
              type='button'
              aria-label={t('wauto.remove_role', {id: role})}
              title={t('wauto.remove_role', {id: role})}
              className='flex size-6 cursor-pointer items-center justify-center rounded text-subtle hover:bg-surface-2 hover:text-danger-text disabled:cursor-not-allowed'
              onClick={() => set(permissions, roleIds.filter((other) => other !== role))}
            >
              <X aria-hidden className='size-3.5'/>
            </button>
          </span>
        ))}
        <input
          className='input w-48 font-mono'
          inputMode='numeric'
          aria-label={t('wauto.role_label')}
          aria-invalid={!!roleError}
          placeholder={t('wauto.role_placeholder')}
          value={roleId}
          disabled={full}
          onChange={(event) => setRoleId(event.target.value.replace(/[<>@&\s]/g, ''))}
          // not the form's submit, that would save the settings
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addRole();
            }
          }}
          autoComplete='off'
        />
        <button type='button' className='btn btn-sm btn-secondary' disabled={!trimmed || !!roleError || full} onClick={addRole}>
          <Plus aria-hidden className='size-4'/>
          {t('wauto.add_role')}
        </button>
      </div>
      {(roleError) ? <p className='text-xs text-danger-text'>{roleError}</p> : (full) ? <p className='text-xs text-subtle'>{t('wauto.roles_full', {max: MAX_EXEMPT_ROLES})}</p> : null}
    </div>
  );
}
