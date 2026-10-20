import { Plus, X } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { CommandCategories, type GuildRule, type GuildRuleTargetType, type UserGuild } from '@/lib/api';
import { errorField, errorMessage, useGuildMutation, useGuildScope, type GuildAction } from '@/lib/api/dashboardQueries';
import { useCommandsQuery } from '@/lib/api/queries';
import { enabledCommandVariants } from '@/lib/commandAvailability';
import { cn, formatDate } from '@/lib/utils';
import { categoryMeta } from '@/pages/commands/commandMeta';

import { isSnowflake } from '../tags/tagMeta';
import { EmptyState, Field, Panel, Toggle } from '../ui';
import {
  ENTRY_TYPE_LABELS,
  EntryMention,
  RULE_TARGET_TYPES,
  loggerTypeLabel,
  useReadOnlyMessage,
} from './guildMeta';


// Runs one server edit at a time per section, tracking which row is busy and reporting the result.
function useGuildEdit(guildId: string) {
  const toast = useToast();
  const mutation = useGuildMutation(guildId);
  const [ busyKey, setBusyKey ] = useState<string | null>(null);

  const [ failedField, setFailedField ] = useState<string | null>(null);

  const run = async (key: string, action: GuildAction, success: string): Promise<boolean> => {
    setBusyKey(key);
    setFailedField(null);
    try {
      await mutation.mutateAsync(action);
      toast(success);
      return true;
    } catch (error) {
      const field = errorField(error);
      setFailedField(field);
      // field errors show next to the field instead
      if (!field) {
        toast(errorMessage(error, 'Couldn’t save that change.'), 'error');
      }
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return {run, busyKey, pending: mutation.isPending, failedField, clearFailedField: () => setFailedField(null)};
}


function RemoveButton({ label, busy, disabled, onClick }: {label: string, busy: boolean, disabled: boolean, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-3 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50'
    >
      {(busy) ? <Spinner className='size-3.5'/> : <X aria-hidden className='size-4'/>}
    </button>
  );
}


function AddRow({ onSubmit, children, pending, disabled, label = 'Add' }: {
  onSubmit: () => void,
  children: ReactNode,
  pending: boolean,
  disabled: boolean,
  label?: string,
}) {
  return (
    <form
      className='mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-start'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!disabled && !pending) {
          onSubmit();
        }
      }}
    >
      {children}
      {/* lines up with the inputs (below their labels), not with the hints under them */}
      <button type='submit' className='btn btn-secondary shrink-0 sm:mt-[1.625rem] sm:h-[2.375rem]' disabled={disabled || pending}>
        {(pending) ? <Spinner className='size-4'/> : <Plus aria-hidden className='size-4'/>}
        {label}
      </button>
    </form>
  );
}


/* owner/admin bypass */

// the server owner and admins skip every rule unless it (or a rule) says otherwise
function AdminBypassToggle({ guild, edit }: {guild: UserGuild, edit: ReturnType<typeof useGuildEdit>}) {
  const editable = guild.editable.rules_admin;
  const staff = useGuildScope() === 'admin';
  return (
    <div className='mb-4 rounded-md border border-line bg-deep px-3 py-2.5'>
      <Toggle
        checked={guild.settings.rules_admin_bypass}
        disabled={!editable || edit.pending}
        label='Server owner and admins skip the rules'
        description={(editable)
          ? 'Turn off to make them follow the rules too. A rule can override this.'
          : (staff) ? 'Only bot owners can change a server’s settings.' : 'Only the server owner and admins can change this.'}
        onChange={(value) => void edit.run(
          '\u0000bypass',
          {kind: 'settings', patch: {rules_admin_bypass: value}},
          (value) ? 'The server owner and admins skip the rules again' : 'The server owner and admins now follow the rules',
        )}
      />
    </div>
  );
}


// a rule's own bypass, or the server's setting (empty value)
function RuleAdminBypass({ rule, serverValue, editable, busy, disabled, onChange }: {
  rule: GuildRule,
  serverValue: boolean,
  editable: boolean,
  busy: boolean,
  disabled: boolean,
  onChange: (value: boolean | null) => void,
}) {
  if (!editable) {
    if (rule.admin_bypass === null) {
      return null;
    }
    return <span className='shrink-0 text-xs text-subtle'>{(rule.admin_bypass) ? 'Admins skip' : 'Admins follow'}</span>;
  }
  const value = (rule.admin_bypass === null) ? '' : String(rule.admin_bypass);
  const label = 'Owner/admin bypass for this rule';
  return (
    <div className='flex shrink-0 items-center gap-1.5'>
      {(busy) ? <Spinner className='size-3.5'/> : null}
      <select
        aria-label={label}
        title={label}
        className='input h-7 w-auto py-0 pr-7 pl-2 text-xs'
        value={value}
        disabled={disabled}
        onChange={(event) => onChange((event.target.value === '') ? null : event.target.value === 'true')}
      >
        <option value=''>{`Default (admins ${(serverValue) ? 'skip' : 'follow'})`}</option>
        <option value='true'>Admins skip</option>
        <option value='false'>Admins follow</option>
      </select>
    </div>
  );
}


/* prefixes */

export function PrefixesSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.prefixes;
  const readOnlyMessage = useReadOnlyMessage();
  const edit = useGuildEdit(guild.id);
  const [ prefix, setPrefix ] = useState('');
  // the API strips leading/trailing whitespace, so compare (and send) what it'll actually store
  const trimmed = prefix.trim();
  const exists = guild.prefixes.some((item) => item.prefix === trimmed);

  return (
    <Panel
      title='Prefixes'
      accent='#5865f2'
      description='What messages must start with to run NotSoBot commands here. Mentioning the bot always works.'
      readOnly={(editable) ? undefined : readOnlyMessage('prefixes')}
    >
      {(guild.prefixes.length) ? (
        <ul className='flex flex-wrap gap-2'>
          {guild.prefixes.map((item) => (
            <li key={item.prefix} className='flex items-center gap-1 rounded-md border border-line bg-deep py-1 pr-1 pl-3'>
              {/* show spaces, they matter in a prefix */}
              <code className='font-mono text-sm whitespace-pre text-code'>{item.prefix.replace(/ /g, '␣')}</code>
              {(editable) ? (
                <RemoveButton
                  label={`Remove prefix ${item.prefix}`}
                  busy={edit.busyKey === item.prefix}
                  disabled={edit.pending}
                  onClick={() => void edit.run(item.prefix, {kind: 'prefix', prefix: item.prefix, present: false}, `Removed prefix “${item.prefix}”`)}
                />
              ) : <span className='w-2'/>}
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted'>No custom prefixes; the defaults are used.</p>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!trimmed || exists || 128 < trimmed.length || edit.pending}
          label='Add prefix'
          onSubmit={async () => {
            if (await edit.run('\u0000add', {kind: 'prefix', prefix: trimmed, present: true}, `Added prefix “${trimmed}”`)) {
              setPrefix('');
            }
          }}
        >
          <Field className='flex-1' label='New prefix' hint={(exists) ? 'That prefix is already set.' : 'Up to 128 characters. Spaces at the start or end are removed.'}>
            {(props) => <input {...props} className='input font-mono' value={prefix} maxLength={128} onChange={(event) => setPrefix(event.target.value)} autoComplete='off' spellCheck={false}/>}
          </Field>
        </AddRow>
      ) : null}
    </Panel>
  );
}


/* rules */

// the categories a rule can cover (bot owner commands can't be blocked), alphabetical like the commands page
const RULE_CATEGORIES = Object.values(CommandCategories)
  .filter((category) => category !== CommandCategories.OWNER)
  .sort((a, b) => categoryMeta(a).label.localeCompare(categoryMeta(b).label));

// the list reads from the whole server down to single users, like the bot's `rules` command
const TARGET_ORDER: Record<GuildRuleTargetType, number> = {guild: 0, channel: 1, role: 2, user: 3};

function coverageOrder(rule: GuildRule): number {
  return (rule.command) ? 2 : (rule.category) ? 1 : 0;
}

function coversEverything(rule: {category?: string | null, command?: string | null}): boolean {
  return !rule.command && !rule.category;
}


function RuleCoverage({ rule, commandNames }: {rule: GuildRule, commandNames: Map<string, string>}) {
  if (rule.command) {
    return <code className='font-mono text-sm text-code'>{commandNames.get(rule.command) ?? rule.command}</code>;
  }
  if (rule.category) {
    const meta = categoryMeta(rule.category);
    return <span className='text-sm font-medium text-white'>{meta.label} commands</span>;
  }
  return <span className='text-sm font-medium text-white'>Every command</span>;
}


export function RulesSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.rules;
  const adminEditable = guild.editable.rules_admin;
  const readOnlyMessage = useReadOnlyMessage();
  const edit = useGuildEdit(guild.id);
  const datalistId = useId();
  const { data: commands } = useCommandsQuery();

  // command id -> the name people know it by, only enabled ones can be picked; rules for a removed command show its id
  const commandNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const command of commands ?? []) {
      const [ variant ] = enabledCommandVariants(command);
      if (variant && variant.category !== CommandCategories.OWNER) {
        names.set(command.id, variant.name);
      }
    }
    return names;
  }, [commands]);
  const commandIdsByName = useMemo(() => {
    const ids = new Map<string, string>();
    for (const [ id, name ] of commandNames) {
      ids.set(name.toLowerCase(), id);
      ids.set(id.toLowerCase(), id);
    }
    return ids;
  }, [commandNames]);

  const rules = useMemo(() => {
    return guild.rules.slice().sort((a, b) => {
      return (TARGET_ORDER[a.target_type] - TARGET_ORDER[b.target_type]) || (coverageOrder(a) - coverageOrder(b)) || a.added.localeCompare(b.added);
    });
  }, [guild.rules]);

  const [ allow, setAllow ] = useState(false);
  // '' is everything, `category:FUN`, or `command` (then `command` holds what was typed)
  const [ covers, setCovers ] = useState('');
  const [ command, setCommand ] = useState('');
  const [ type, setType ] = useState<GuildRuleTargetType>('guild');
  const [ id, setId ] = useState('');
  const [ message, setMessage ] = useState('');

  const category = (covers.startsWith('category:')) ? covers.slice('category:'.length) : null;
  const commandId = (covers === 'command') ? commandIdsByName.get(command.trim().toLowerCase()) ?? null : null;
  const targetId = (type === 'guild') ? guild.id : id;
  const needsAdmin = covers === '';
  const exists = guild.rules.some((rule) => {
    return rule.target_type === type && rule.target_id === targetId && (rule.command ?? null) === commandId && (rule.category ?? null) === category && rule.value.allow === allow && (rule.value.message ?? '') === (allow ? '' : message.trim());
  });
  const valid = isSnowflake(targetId) && (covers !== 'command' || !!commandId) && !exists && (!needsAdmin || adminEditable);

  const canChange = (rule: GuildRule) => editable && (!coversEverything(rule) || adminEditable);

  return (
    <Panel
      title='Rules'
      accent='#ed4245'
      description={(
        <>
          Block or allow every command, a category, or one command for the whole server, a channel, a role or a user.
          The most specific rule wins: a user beats a role, a role beats a channel, a channel beats the whole server, then
          a command beats its category and a category beats every command. Two equally specific rules that disagree block.
        </>
      )}
      readOnly={(editable) ? undefined : readOnlyMessage('rules')}
    >
      <AdminBypassToggle guild={guild} edit={edit}/>
      {(rules.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {rules.map((rule) => {
            const bypassKey = `${rule.id}:bypass`;
            return (
              <li key={rule.id} className='flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2'>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
                    (rule.value.allow) ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                  )}
                >
                  {(rule.value.allow) ? 'Allow' : 'Block'}
                </span>
                <div className='min-w-[10rem] flex-1'>
                  <div className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'>
                    <RuleCoverage rule={rule} commandNames={commandNames}/>
                    <span className='text-sm text-subtle'>{(rule.target_type === 'channel' || rule.target_type === 'guild') ? 'in' : 'for'}</span>
                    <EntryMention type={rule.target_type} id={rule.target_id}/>
                  </div>
                  {(rule.value.message) ? <p className='mt-0.5 text-xs text-muted'>“{rule.value.message}”</p> : null}
                </div>
                <span className='hidden text-xs text-subtle sm:inline'>added {formatDate(rule.added)}</span>
                <RuleAdminBypass
                  rule={rule}
                  serverValue={guild.settings.rules_admin_bypass}
                  editable={adminEditable}
                  busy={edit.busyKey === bypassKey}
                  disabled={edit.pending}
                  onChange={(adminBypass) => void edit.run(bypassKey, {kind: 'rule-edit', ruleId: rule.id, adminBypass}, 'Updated the owner/admin bypass')}
                />
                {(canChange(rule)) ? (
                  <RemoveButton
                    label='Remove this rule'
                    busy={edit.busyKey === rule.id}
                    disabled={edit.pending}
                    onClick={() => void edit.run(rule.id, {kind: 'rules-remove', ids: [rule.id]}, 'Removed the rule')}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title='No rules'>Every command can be used everywhere.</EmptyState>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!valid || edit.pending}
          label='Add rule'
          onSubmit={async () => {
            const action: GuildAction = {kind: 'rules-add', rules: [{
              action: 'access',
              category,
              command: commandId,
              target_id: targetId,
              target_type: type,
              value: {allow, message: (allow) ? null : message.trim() || null},
            }]};
            if (await edit.run('\u0000add', action, (allow) ? 'Added an allow rule' : 'Added a block rule')) {
              setId('');
              setMessage('');
            }
          }}
        >
          <Field label='Action' className='sm:w-28'>
            {(props) => (
              <select {...props} className='input' value={(allow) ? 'allow' : 'block'} onChange={(event) => setAllow(event.target.value === 'allow')}>
                <option value='block'>Block</option>
                <option value='allow'>Allow</option>
              </select>
            )}
          </Field>
          <Field label='What' className='sm:w-52' hint={(needsAdmin && !adminEditable) ? 'Rules for every command need Administrator.' : undefined}>
            {(props) => (
              <select {...props} className='input' value={covers} onChange={(event) => setCovers(event.target.value)}>
                <option value=''>Every command</option>
                <optgroup label='Category'>
                  {RULE_CATEGORIES.map((value) => <option key={value} value={`category:${value}`}>{categoryMeta(value).label}</option>)}
                </optgroup>
                <option value='command'>One command…</option>
              </select>
            )}
          </Field>
          {(covers === 'command') ? (
            <Field label='Command' className='sm:w-44' error={(command.trim() && !commandId) ? 'No command by that name.' : null}>
              {(props) => (
                <>
                  <input {...props} list={datalistId} className='input font-mono' placeholder='e.g. imagine' value={command} onChange={(event) => setCommand(event.target.value)} autoComplete='off' spellCheck={false}/>
                  <datalist id={datalistId}>
                    {[...commandNames.values()].sort().map((name) => <option key={name} value={name}/>)}
                  </datalist>
                </>
              )}
            </Field>
          ) : null}
          <TypeSelect value={type} onChange={(value) => setType(value as GuildRuleTargetType)} options={RULE_TARGET_TYPES}/>
          {(type === 'guild') ? (
            <p className='flex-1 text-sm text-muted sm:pt-[2.125rem]'>{(exists) ? 'That rule already exists.' : 'Applies to everyone in the server.'}</p>
          ) : (
            <IdInput type={type} value={id} onChange={setId} exists={exists}/>
          )}
          {(!allow) ? (
            <Field label='Message' className='w-full' hint='Optional. Shown to whoever the rule stops, like “Fun commands go in #bots”.' counter={`${message.length}/200`}>
              {(props) => <input {...props} className='input' value={message} maxLength={200} onChange={(event) => setMessage(event.target.value)} autoComplete='off'/>}
            </Field>
          ) : null}
        </AddRow>
      ) : null}
    </Panel>
  );
}


function TypeSelect({ value, onChange, options }: {value: string, onChange: (value: string) => void, options: ReadonlyArray<string>}) {
  return (
    <Field label='Who/where' className='sm:w-40'>
      {(props) => (
        <select {...props} className='input' value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{ENTRY_TYPE_LABELS[option]}</option>)}
        </select>
      )}
    </Field>
  );
}


function IdInput({ type, value, onChange, exists }: {type: string, value: string, onChange: (value: string) => void, exists: boolean}) {
  const label = `${ENTRY_TYPE_LABELS[type] ?? 'Item'} ID`;
  return (
    <Field
      className='flex-1'
      label={label}
      error={(value && !isSnowflake(value)) ? 'IDs are 15–21 digits. Turn on Developer Mode in Discord and use “Copy ID”.' : (exists) ? 'That rule already exists.' : null}
    >
      {(props) => (
        <input
          {...props}
          className='input font-mono'
          inputMode='numeric'
          placeholder='e.g. 123456789012345678'
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[<>#@&!\s]/g, ''))}
          autoComplete='off'
        />
      )}
    </Field>
  );
}


/* loggers */

export function LoggersSection({ guild }: {guild: UserGuild}) {
  const editable = guild.editable.loggers;
  const readOnlyMessage = useReadOnlyMessage();
  const edit = useGuildEdit(guild.id);
  const loggers = guild.loggers.slice().sort((a, b) => a.type - b.type);

  return (
    <Panel
      title='Loggers'
      accent='#eb459e'
      description='Post server events (message edits, joins, bans…) to a channel through a webhook.'
      readOnly={(editable) ? undefined : readOnlyMessage('loggers')}
    >
      {(loggers.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {loggers.map((logger) => {
            const key = `${logger.type}:${logger.channel_id}`;
            return (
              <li key={key} className='flex items-center gap-3 px-3 py-2'>
                <div className='min-w-0 flex-1'>
                  <div className='text-sm font-medium text-white'>{loggerTypeLabel(logger.type)}</div>
                  <EntryMention type='channel' id={logger.channel_id}/>
                </div>
                <span className='hidden text-xs text-subtle sm:inline'>added {formatDate(logger.added)}</span>
                {(editable) ? (
                  <RemoveButton
                    label={`Remove the ${loggerTypeLabel(logger.type)} logger in ${logger.channel_id}`}
                    busy={edit.busyKey === key}
                    disabled={edit.pending}
                    onClick={() => void edit.run(key, {kind: 'logger-remove', channelId: logger.channel_id, type: logger.type}, `Removed the ${loggerTypeLabel(logger.type)} logger`)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title='No loggers set up'>Set one up with the loggers command in Discord.</EmptyState>
      )}
    </Panel>
  );
}
