import { Check, Plus, ShieldCheck, X } from 'lucide-react';
import { useId, useState } from 'react';

import { translate, useI18n } from '@/i18n';
import type { GuildWarningAuto, GuildWarningAutoExempt } from '@/lib/api';
import { cn } from '@/lib/utils';

import { ChoiceSelect } from '../settings/ChoiceSelect';
import type { Choice } from '../settings/botChoices';
import { isSnowflake } from '../tags/tagMeta';
import { HelpDisclosure } from '../ui';
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
  {value: 'decoy', get label() { return translate('wauto.decoy'); }},
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
    delete_message: (trigger === 'blocked_command') ? rule.delete_message ?? true : null,
    limit: (trigger === 'mentions') ? rule.limit ?? DEFAULT_MENTIONS_LIMIT : null,
    // there's only the one decoy channel, its rule is always server-wide
    channel_id: (trigger === 'decoy') ? null : rule.channel_id,
    trigger,
  };
}

function inRange(value: number | null, max: number): boolean {
  return value !== null && Number.isInteger(value) && 1 <= value && value <= max;
}

// a rule's fields that are typed in, in the order they're checked
type RuleField = 'limit' | 'warnings' | 'channel' | 'automod';
const RULE_FIELDS: ReadonlyArray<RuleField> = ['limit', 'warnings', 'channel', 'automod'];

// what the api won't take about one of a rule's fields, null when it's fine
function ruleFieldError(rule: GuildWarningAuto, field: RuleField): string | null {
  switch (field) {
    case 'limit': return (rule.trigger === 'mentions' && !inRange(rule.limit, MAX_WARNING_AUTO_MENTIONS)) ? translate('wauto.bad_limit', {max: MAX_WARNING_AUTO_MENTIONS}) : null;
    case 'warnings': return (!inRange(rule.warnings, MAX_WARNING_WEIGHT)) ? translate('wauto.bad_warnings', {max: MAX_WARNING_WEIGHT}) : null;
    case 'channel': return (rule.channel_id !== null && !isSnowflake(rule.channel_id)) ? translate('wauto.bad_channel') : null;
    case 'automod': return (rule.trigger === 'automod' && rule.automod_rule_id != null && !isSnowflake(rule.automod_rule_id)) ? translate('wauto.bad_automod') : null;
  }
}

// two rules with the same one are for the same thing in the same place
function ruleKey(rule: GuildWarningAuto): string {
  return `${rule.trigger}:${rule.channel_id}:${(rule.trigger === 'automod') ? rule.automod_rule_id ?? null : null}`;
}

// a limit, count, channel or AutoMod rule the api won't take, or two rules for the same trigger, channel and AutoMod rule,
// for the form to block saving (its save bar says it)
export function warningAutoError(rules: Array<GuildWarningAuto>): string | null {
  for (const field of RULE_FIELDS) {
    for (const rule of rules) {
      const error = ruleFieldError(rule, field);
      if (error) {
        return error;
      }
    }
  }
  const keys = rules.map(ruleKey);
  if (new Set(keys).size !== keys.length) {
    return translate('wauto.duplicate');
  }
  return null;
}


// the auto-warn rules: rows of "for this, here, warn them as N warnings", the api sorts them once saved. Rules keep their
// `exempt` and `automod_rule_id` through every edit (saving replaces the whole list), and who every rule skips is edited
// below them
export function WarningAutoEditor({ value, onChange, exempt, onExemptChange, guildId, disabled }: {
  value: Array<GuildWarningAuto>,
  onChange: (value: Array<GuildWarningAuto>) => void,
  exempt: GuildWarningAutoExempt | null,
  onExemptChange: (value: GuildWarningAutoExempt | null) => void,
  guildId: string,
  disabled?: boolean,
}) {
  const { t, plural } = useI18n();
  const id = useId();
  // the rows whose exemptions are open, by index
  const [ open, setOpen ] = useState<ReadonlySet<number>>(new Set());
  // the fields that were left (`<index>:<field>`): a new row's empty ID isn't marked as wrong until then
  const [ touched, setTouched ] = useState<ReadonlySet<string>>(new Set());
  const touch = (index: number, field: RuleField) => setTouched((previous) => new Set(previous).add(`${index}:${field}`));
  const fieldError = (index: number, field: RuleField) => (touched.has(`${index}:${field}`)) ? ruleFieldError(value[index], field) : null;
  // two rules for the same thing are marked right away, it takes picking the same again
  const keys = value.map(ruleKey);
  const duplicate = (index: number) => keys.indexOf(keys[index]) !== keys.lastIndexOf(keys[index]);
  const update = (index: number, rule: GuildWarningAuto) => onChange(value.map((x, i) => (i === index) ? rule : x));
  const add = () => {
    // a server-wide rule for whichever trigger doesn't have one yet, then a channel one to fill in
    const free = TRIGGER_CHOICES.find((choice) => !value.some((rule) => rule.trigger === choice.value && rule.channel_id === null && !rule.automod_rule_id));
    const trigger = free?.value ?? 'mentions';
    onChange([...value, withTrigger({automod_rule_id: null, channel_id: (free) ? null : '', exempt: null, limit: null, trigger, warnings: 1}, trigger)]);
    setTouched((previous) => new Set([...previous].filter((key) => Number(key.split(':')[0]) < value.length)));
  };
  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setOpen((previous) => new Set([...previous].filter((i) => i !== index).map((i) => (index < i) ? i - 1 : i)));
    setTouched((previous) => new Set([...previous].flatMap((key) => {
      const [ row, field ] = key.split(':');
      return (Number(row) === index) ? [] : [`${(index < Number(row)) ? Number(row) - 1 : row}:${field}`];
    })));
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
          {value.map((rule, index) => {
            const rowError = RULE_FIELDS.map((field) => fieldError(index, field)).find(Boolean);
            const exemptions = exemptSize(rule.exempt);
            const exemptionsLabel = (exemptions) ? t('wauto.exemptions_count', {count: exemptions}) : t('wauto.exemptions');
            return (
              <li key={index} className='rounded-lg border border-border bg-surface-2 p-2'>
                {/* the rule's controls wrap on their own, its buttons stay in the top right */}
                <div className='flex items-start gap-2'>
                  <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5'>
                    <ChoiceSelect
                      className={COMPACT_SELECT}
                      aria-label={t('wauto.trigger')}
                      aria-invalid={duplicate(index) || undefined}
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
                            aria-invalid={!!fieldError(index, 'automod') || undefined}
                            placeholder={t('wauto.automod_placeholder')}
                            value={rule.automod_rule_id}
                            onChange={(event) => update(index, {...rule, automod_rule_id: event.target.value.replace(/\s/g, '')})}
                            onBlur={() => touch(index, 'automod')}
                            autoComplete='off'
                          />
                        ) : null}
                      </>
                    ) : null}
                    {(rule.trigger === 'blocked_command') ? (
                      <button
                        type='button'
                        aria-pressed={rule.delete_message !== false}
                        title={t('wauto.delete_hint')}
                        className={cn(
                          'inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs transition-colors',
                          (rule.delete_message !== false) ? 'border-brand/70 bg-surface-3 text-white' : 'border-line text-muted hover:bg-surface-2 hover:text-white',
                        )}
                        onClick={() => update(index, {...rule, delete_message: rule.delete_message === false})}
                      >
                        {/* on isn't only a brighter border */}
                        {(rule.delete_message !== false) ? <Check aria-hidden className='size-3'/> : null}
                        {t('wauto.delete_message')}
                      </button>
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
                            aria-invalid={!!fieldError(index, 'limit') || undefined}
                            value={(rule.limit === null || Number.isNaN(rule.limit)) ? '' : rule.limit}
                            onChange={(event) => update(index, {...rule, limit: event.target.valueAsNumber})}
                            onBlur={() => touch(index, 'limit')}
                          />
                        </span>
                        <span className='text-sm text-muted'>{t('wauto.in_one_message')}</span>
                      </>
                    ) : null}
                    {/* always its own line under what the rule is for: where it applies, then what it counts as */}
                    <div className='flex basis-full flex-wrap items-center gap-x-2 gap-y-1.5'>
                      {(rule.trigger === 'decoy') ? (
                        <span className='text-sm text-muted'>{t('wauto.decoy_where')}</span>
                      ) : (
                        <ChoiceSelect
                          className={COMPACT_SELECT}
                          aria-label={t('wauto.where')}
                          aria-invalid={duplicate(index) || undefined}
                          choices={SCOPE_CHOICES}
                          value={(rule.channel_id === null) ? 'guild' : 'channel'}
                          onChange={(scope) => update(index, {...rule, channel_id: (scope === 'channel') ? rule.channel_id ?? '' : null})}
                        />
                      )}
                      {(rule.channel_id !== null) ? (
                        <input
                          className={cn('input w-40 px-2 font-mono text-xs', COMPACT)}
                          inputMode='numeric'
                          aria-label={t('wauto.channel_label')}
                          aria-invalid={!!fieldError(index, 'channel') || undefined}
                          placeholder={t('wauto.channel_placeholder')}
                          value={rule.channel_id}
                          onChange={(event) => update(index, {...rule, channel_id: event.target.value.replace(/[<>#\s]/g, '')})}
                          onBlur={() => touch(index, 'channel')}
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
                          aria-invalid={!!fieldError(index, 'warnings') || undefined}
                          value={(Number.isNaN(rule.warnings)) ? '' : rule.warnings}
                          onChange={(event) => update(index, {...rule, warnings: event.target.valueAsNumber})}
                          onBlur={() => touch(index, 'warnings')}
                        />
                        <span className='text-sm text-muted'>{plural('wauto.warnings', (Number.isNaN(rule.warnings)) ? 0 : rule.warnings)}</span>
                      </span>
                    </div>
                  </div>
                  <div className='flex min-h-8 shrink-0 items-center gap-1'>
                    {/* its name from `sm` up, on phones an icon with how many there are once there are some */}
                    <button
                      type='button'
                      className={cn(
                        'flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors hover:bg-surface-3 hover:text-white',
                        (open.has(index)) ? 'bg-surface-3 text-white' : (exemptions) ? 'text-fg' : 'text-subtle',
                      )}
                      aria-label={exemptionsLabel}
                      title={exemptionsLabel}
                      aria-expanded={open.has(index)}
                      aria-controls={`${id}-exempt-${index}`}
                      onClick={() => toggle(index)}
                    >
                      <ShieldCheck aria-hidden className='size-4'/>
                      <span className='hidden sm:inline'>{exemptionsLabel}</span>
                      {(exemptions) ? <span className='tabular-nums sm:hidden'>{exemptions}</span> : null}
                    </button>
                    <RemoveButton label={t('wauto.remove')} busy={false} disabled={!!disabled} onClick={() => remove(index)}/>
                  </div>
                </div>
                {(rowError) ? (
                  <p role='alert' className='mt-1.5 text-xs text-danger-text'>{rowError}</p>
                ) : (rule.channel_id !== null) ? (
                  <p className='mt-1.5 text-xs text-subtle'>{t('rules.id_hint')}</p>
                ) : null}
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
            );
          })}
        </ul>
      ) : (
        <p className='rounded-lg border border-dashed border-border p-3 text-sm text-subtle'>{t('wauto.off')}</p>
      )}
      <button type='button' className='btn btn-sm btn-secondary mt-2' disabled={disabled || MAX_WARNING_AUTO <= value.length} onClick={add}>
        <Plus aria-hidden className='size-4'/>
        {t('wauto.add')}
      </button>
      {(MAX_WARNING_AUTO <= value.length) ? <p className='mt-1.5 text-xs text-subtle'>{t('wauto.full', {max: MAX_WARNING_AUTO})}</p> : null}
      {(value.some((_, index) => duplicate(index))) ? (
        <p id={`${id}-hint`} className='mt-1.5 text-xs text-danger-text'>{t('wauto.duplicate')}</p>
      ) : (
        <div className='mt-1.5 text-xs text-subtle'>
          <p id={`${id}-hint`}>{t('wauto.hint')}</p>
          {/* the rest, and what goes for the kinds of rule there are, a click away */}
          <HelpDisclosure summary={t('sections.how_it_works')} className='mt-1'>
            <p>{t('wauto.hint_more')}</p>
            {(value.some((rule) => rule.trigger === 'automod')) ? <p>{t('wauto.automod_hint')}</p> : null}
            {(value.some((rule) => rule.trigger === 'blocked_command')) ? <p>{t('wauto.delete_hint')}</p> : null}
            {(value.some((rule) => rule.trigger === 'decoy')) ? <p>{t('wauto.decoy_hint')}</p> : null}
          </HelpDisclosure>
        </div>
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
                  'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  (active) ? 'border-brand/70 bg-surface-3 text-white' : 'border-line text-muted hover:bg-surface-2 hover:text-white',
                )}
                onClick={() => set(permissions ^ permission.bit, roleIds)}
              >
                {(active) ? <Check aria-hidden className='size-3'/> : null}
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
      {(roleError) ? <p className='text-xs text-danger-text'>{roleError}</p> : <p className='text-xs text-subtle'>{(full) ? t('wauto.roles_full', {max: MAX_EXEMPT_ROLES}) : t('rules.id_hint')}</p>}
    </div>
  );
}
