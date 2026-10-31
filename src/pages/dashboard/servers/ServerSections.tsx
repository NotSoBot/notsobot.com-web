import { Pencil, Plus, X } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { CommandCategories, type GuildLogger, type GuildRule, type GuildRuleTargetType, type UserGuild } from '@/lib/api';
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
  LOGGER_IGNORE_TYPES,
  MAX_LOGGER_IGNORED,
  RULE_TARGET_TYPES,
  loggerIgnoresRoles,
  loggerTypeLabel,
  useReadOnlyMessage,
} from './guildMeta';


// Runs one server edit at a time per section, tracking which row is busy and reporting the result.
function useGuildEdit(guildId: string) {
  const { t } = useI18n();
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
        toast(errorMessage(error, t('sections.save_error')), 'error');
      }
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return {run, busyKey, pending: mutation.isPending, failedField, clearFailedField: () => setFailedField(null)};
}


export function RemoveButton({ label, busy, disabled, onClick }: {label: string, busy: boolean, disabled: boolean, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-3 hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-50'
    >
      {(busy) ? <Spinner className='size-3.5'/> : <X aria-hidden className='size-4'/>}
    </button>
  );
}


export function EditButton({ label, disabled, onClick }: {label: string, disabled: boolean, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-3 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
    >
      <Pencil aria-hidden className='size-3.5'/>
    </button>
  );
}


function AddRow({ onSubmit, children, pending, disabled, label }: {
  onSubmit: () => void,
  children: ReactNode,
  pending: boolean,
  disabled: boolean,
  label?: string,
}) {
  const { t } = useI18n();
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
        {label ?? t('common.add')}
      </button>
    </form>
  );
}


/* owner/admin bypass */

// the server owner and admins skip every rule unless it (or a rule) says otherwise
function AdminBypassToggle({ guild, edit }: {guild: UserGuild, edit: ReturnType<typeof useGuildEdit>}) {
  const { t } = useI18n();
  const editable = guild.editable.rules_admin;
  const staff = useGuildScope() === 'admin';
  return (
    <div className='mb-4 rounded-md border border-line bg-deep px-3 py-2.5'>
      <Toggle
        checked={guild.settings.rules_admin_bypass}
        disabled={!editable || edit.pending}
        label={t('bypass.label')}
        description={t((editable) ? 'bypass.description' : (staff) ? 'bypass.staff' : 'bypass.owner_only')}
        onChange={(value) => void edit.run(
          '\u0000bypass',
          {kind: 'settings', patch: {rules_admin_bypass: value}},
          t((value) ? 'bypass.on' : 'bypass.off'),
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
  const { t } = useI18n();
  if (!editable) {
    if (rule.admin_bypass === null) {
      return null;
    }
    return <span className='shrink-0 text-xs text-subtle'>{t((rule.admin_bypass) ? 'bypass.skip' : 'bypass.follow')}</span>;
  }
  const value = (rule.admin_bypass === null) ? '' : String(rule.admin_bypass);
  const label = t('bypass.rule_label');
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
        <option value=''>{t((serverValue) ? 'bypass.default_skip' : 'bypass.default_follow')}</option>
        <option value='true'>{t('bypass.skip')}</option>
        <option value='false'>{t('bypass.follow')}</option>
      </select>
    </div>
  );
}


/* prefixes */

export function PrefixesSection({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const editable = guild.editable.prefixes;
  const readOnlyMessage = useReadOnlyMessage();
  const edit = useGuildEdit(guild.id);
  const [ prefix, setPrefix ] = useState('');
  // the API strips leading/trailing whitespace, so compare (and send) what it'll actually store
  const trimmed = prefix.trim();
  const exists = guild.prefixes.some((item) => item.prefix === trimmed);

  return (
    <Panel
      title={t('prefixes.title')}
      accent='#5865f2'
      description={t('prefixes.description')}
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
                  label={t('prefixes.remove', {prefix: item.prefix})}
                  busy={edit.busyKey === item.prefix}
                  disabled={edit.pending}
                  onClick={() => void edit.run(item.prefix, {kind: 'prefix', prefix: item.prefix, present: false}, t('prefixes.removed', {prefix: item.prefix}))}
                />
              ) : <span className='w-2'/>}
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted'>{t('prefixes.none')}</p>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!trimmed || exists || 128 < trimmed.length || edit.pending}
          label={t('prefixes.add')}
          onSubmit={async () => {
            if (await edit.run('\u0000add', {kind: 'prefix', prefix: trimmed, present: true}, t('prefixes.added', {prefix: trimmed}))) {
              setPrefix('');
            }
          }}
        >
          <Field className='flex-1' label={t('prefixes.new')} hint={t((exists) ? 'prefixes.exists' : 'prefixes.hint')}>
            {(props) => <input {...props} className='input font-mono' value={prefix} maxLength={128} onChange={(event) => setPrefix(event.target.value)} autoComplete='off' spellCheck={false}/>}
          </Field>
        </AddRow>
      ) : null}
    </Panel>
  );
}


/* rules */

// the categories a rule can cover (bot owner commands can't be blocked), sorted by their label where they're shown
const RULE_CATEGORIES = Object.values(CommandCategories).filter((category) => category !== CommandCategories.OWNER);

// the list reads from the whole server down to single users, like the bot's `rules` command
const TARGET_ORDER: Record<GuildRuleTargetType, number> = {guild: 0, channel: 1, role: 2, user: 3};

function coverageOrder(rule: GuildRule): number {
  return (rule.command) ? 2 : (rule.category) ? 1 : 0;
}

function coversEverything(rule: {category?: string | null, command?: string | null}): boolean {
  return !rule.command && !rule.category;
}


function RuleCoverage({ rule, commandNames }: {rule: GuildRule, commandNames: Map<string, string>}) {
  const { t } = useI18n();
  if (rule.command) {
    return <code className='font-mono text-sm text-code'>{commandNames.get(rule.command) ?? rule.command}</code>;
  }
  if (rule.category) {
    const meta = categoryMeta(rule.category);
    return <span className='text-sm font-medium text-white'>{t('rules.category', {category: t(meta.label)})}</span>;
  }
  return <span className='text-sm font-medium text-white'>{t('rules.every')}</span>;
}


// a block rule's message, edited in place; empty removes it
function RuleMessageEditor({ initial, busy, disabled, onSave, onCancel }: {
  initial: string,
  busy: boolean,
  disabled: boolean,
  onSave: (message: string | null) => void,
  onCancel: () => void,
}) {
  const { t } = useI18n();
  const [ message, setMessage ] = useState(initial);
  const trimmed = message.trim();
  const label = t('rules.message_label');
  return (
    <form
      className='mt-1.5 flex flex-wrap items-center gap-2'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (disabled) {
          return;
        }
        if (trimmed === initial) {
          onCancel();
        } else {
          onSave(trimmed || null);
        }
      }}
    >
      <input
        aria-label={label}
        className='input h-8 min-w-[12rem] flex-1 py-0 text-sm'
        placeholder={t('rules.no_message')}
        value={message}
        maxLength={200}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        autoComplete='off'
        autoFocus
      />
      <span className='text-xs text-subtle tabular-nums'>{message.length}/200</span>
      <button type='submit' className='btn btn-sm btn-secondary' disabled={disabled}>
        {(busy) ? <Spinner className='size-3.5'/> : null}
        {t('common.save')}
      </button>
      <button type='button' className='btn btn-sm btn-ghost' disabled={busy} onClick={onCancel}>{t('common.cancel')}</button>
    </form>
  );
}


export function RulesSection({ guild }: {guild: UserGuild}) {
  const { t, language } = useI18n();
  const editable = guild.editable.rules;
  const adminEditable = guild.editable.rules_admin;
  const readOnlyMessage = useReadOnlyMessage();
  const edit = useGuildEdit(guild.id);
  const datalistId = useId();
  const { data: commands } = useCommandsQuery(language);

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
  // the rule whose message is being edited
  const [ editingId, setEditingId ] = useState<string | null>(null);

  return (
    <Panel
      title={t('rules.title')}
      accent='#ed4245'
      description={t('rules.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('rules')}
    >
      <AdminBypassToggle guild={guild} edit={edit}/>
      {(rules.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {rules.map((rule) => {
            const bypassKey = `${rule.id}:bypass`;
            const messageKey = `${rule.id}:message`;
            // only block rules show a message
            const messageEditable = canChange(rule) && !rule.value.allow;
            const editing = messageEditable && editingId === rule.id;
            return (
              <li key={rule.id} className='flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2'>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
                    (rule.value.allow) ? 'bg-success/15 text-success-text' : 'bg-danger/15 text-danger-text',
                  )}
                >
                  {t((rule.value.allow) ? 'rules.allow' : 'rules.block')}
                </span>
                <div className='min-w-[10rem] flex-1'>
                  <div className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'>
                    <RuleCoverage rule={rule} commandNames={commandNames}/>
                    <span className='text-sm text-subtle'>{t((rule.target_type === 'channel' || rule.target_type === 'guild') ? 'rules.in' : 'rules.for')}</span>
                    <EntryMention type={rule.target_type} id={rule.target_id} guildId={guild.id}/>
                  </div>
                  {(editing) ? (
                    <RuleMessageEditor
                      initial={rule.value.message ?? ''}
                      busy={edit.busyKey === messageKey}
                      disabled={edit.pending}
                      onCancel={() => setEditingId(null)}
                      onSave={async (message) => {
                        const action: GuildAction = {kind: 'rule-edit', ruleId: rule.id, value: {allow: false, message}};
                        if (await edit.run(messageKey, action, t((message) ? 'rules.message_updated' : 'rules.message_removed'))) {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (rule.value.message) ? <p className='mt-0.5 text-xs text-muted'>“{rule.value.message}”</p> : null}
                </div>
                <span className='hidden text-xs text-subtle sm:inline'>{t('rules.added_on', {date: formatDate(rule.added)})}</span>
                <RuleAdminBypass
                  rule={rule}
                  serverValue={guild.settings.rules_admin_bypass}
                  editable={adminEditable}
                  busy={edit.busyKey === bypassKey}
                  disabled={edit.pending}
                  onChange={(adminBypass) => void edit.run(bypassKey, {kind: 'rule-edit', ruleId: rule.id, adminBypass}, t('rules.bypass_updated'))}
                />
                {(messageEditable && !editing) ? (
                  <EditButton
                    label={t((rule.value.message) ? 'rules.edit_message' : 'rules.add_message')}
                    disabled={edit.pending}
                    onClick={() => setEditingId(rule.id)}
                  />
                ) : null}
                {(canChange(rule)) ? (
                  <RemoveButton
                    label={t('rules.remove')}
                    busy={edit.busyKey === rule.id}
                    disabled={edit.pending}
                    onClick={() => void edit.run(rule.id, {kind: 'rules-remove', ids: [rule.id]}, t('rules.removed'))}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={t('rules.empty')}>{t('rules.empty_description')}</EmptyState>
      )}
      {(editable) ? (
        <AddRow
          pending={edit.busyKey === '\u0000add'}
          disabled={!valid || edit.pending}
          label={t('rules.add')}
          onSubmit={async () => {
            const action: GuildAction = {kind: 'rules-add', rules: [{
              action: 'access',
              category,
              command: commandId,
              target_id: targetId,
              target_type: type,
              value: {allow, message: (allow) ? null : message.trim() || null},
            }]};
            if (await edit.run('\u0000add', action, t((allow) ? 'rules.added_allow' : 'rules.added_block'))) {
              setId('');
              setMessage('');
            }
          }}
        >
          <Field label={t('rules.action')} className='sm:w-28'>
            {(props) => (
              <select {...props} className='input' value={(allow) ? 'allow' : 'block'} onChange={(event) => setAllow(event.target.value === 'allow')}>
                <option value='block'>{t('rules.block')}</option>
                <option value='allow'>{t('rules.allow')}</option>
              </select>
            )}
          </Field>
          <Field label={t('rules.what')} className='sm:w-52' hint={(needsAdmin && !adminEditable) ? t('rules.needs_admin') : undefined}>
            {(props) => (
              <select {...props} className='input' value={covers} onChange={(event) => setCovers(event.target.value)}>
                <option value=''>{t('rules.every')}</option>
                <optgroup label={t('rules.category_group')}>
                  {RULE_CATEGORIES
                    .map((value) => ({value, label: t(categoryMeta(value).label)}))
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map(({ value, label }) => <option key={value} value={`category:${value}`}>{label}</option>)}
                </optgroup>
                <option value='command'>{t('rules.one_command')}</option>
              </select>
            )}
          </Field>
          {(covers === 'command') ? (
            <Field label={t('rules.command')} className='sm:w-44' error={(command.trim() && !commandId) ? t('rules.no_command') : null}>
              {(props) => (
                <>
                  <input {...props} list={datalistId} className='input font-mono' placeholder={t('rules.command_placeholder')} value={command} onChange={(event) => setCommand(event.target.value)} autoComplete='off' spellCheck={false}/>
                  <datalist id={datalistId}>
                    {[...commandNames.values()].sort().map((name) => <option key={name} value={name}/>)}
                  </datalist>
                </>
              )}
            </Field>
          ) : null}
          <TypeSelect value={type} onChange={(value) => setType(value as GuildRuleTargetType)} options={RULE_TARGET_TYPES}/>
          {(type === 'guild') ? (
            <p className='flex-1 text-sm text-muted sm:pt-[2.125rem]'>{t((exists) ? 'rules.exists' : 'rules.everyone')}</p>
          ) : (
            <IdInput type={type} value={id} onChange={setId} exists={exists}/>
          )}
          {(!allow) ? (
            <Field label={t('rules.message')} className='w-full' hint={t('rules.message_hint')} counter={`${message.length}/200`}>
              {(props) => <input {...props} className='input' value={message} maxLength={200} onChange={(event) => setMessage(event.target.value)} autoComplete='off'/>}
            </Field>
          ) : null}
        </AddRow>
      ) : null}
    </Panel>
  );
}


function TypeSelect({ value, onChange, options }: {value: string, onChange: (value: string) => void, options: ReadonlyArray<string>}) {
  const { t } = useI18n();
  return (
    <Field label={t('rules.who')} className='sm:w-40'>
      {(props) => (
        <select {...props} className='input' value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{ENTRY_TYPE_LABELS[option]}</option>)}
        </select>
      )}
    </Field>
  );
}


function IdInput({ type, value, onChange, exists }: {type: string, value: string, onChange: (value: string) => void, exists: boolean}) {
  const { t } = useI18n();
  const label = t('rules.id', {type: ENTRY_TYPE_LABELS[type] ?? t('rules.item')});
  return (
    <Field
      className='flex-1'
      label={label}
      error={(value && !isSnowflake(value)) ? t('rules.bad_id') : (exists) ? t('rules.exists') : null}
    >
      {(props) => (
        <input
          {...props}
          className='input font-mono'
          inputMode='numeric'
          placeholder={t('rules.id_placeholder')}
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
  const { t } = useI18n();
  const editable = guild.editable.loggers;
  const readOnlyMessage = useReadOnlyMessage();
  const edit = useGuildEdit(guild.id);
  const [ editing, setEditing ] = useState<string | null>(null);
  // by type name (in the dashboard's language), then oldest first within a type
  const loggers = guild.loggers.slice().sort((a, b) => {
    return loggerTypeLabel(a.type).localeCompare(loggerTypeLabel(b.type)) || Date.parse(a.added) - Date.parse(b.added);
  });

  return (
    <Panel
      title={t('loggers.title')}
      accent='#eb459e'
      description={t('loggers.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('loggers')}
    >
      {(loggers.length) ? (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {loggers.map((logger) => {
            const key = `${logger.type}:${logger.channel_id}`;
            const type = loggerTypeLabel(logger.type).toLowerCase();
            const canIgnore = LOGGER_IGNORE_TYPES.includes(logger.type);
            const ignoredIds = logger.ignored_ids ?? [];
            return (
              <li key={key} className='px-3 py-2'>
                <div className='flex items-center gap-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-medium text-white'>{loggerTypeLabel(logger.type)}</div>
                    <EntryMention type='channel' id={logger.channel_id} guildId={guild.id}/>
                  </div>
                  <span className='hidden text-xs text-subtle sm:inline'>{t('loggers.added_on', {date: formatDate(logger.added)})}</span>
                  {(editable && canIgnore) ? (
                    <EditButton
                      label={t('loggers.ignore_edit', {type, channel: logger.channel_id})}
                      disabled={edit.pending || editing === key}
                      onClick={() => setEditing(key)}
                    />
                  ) : null}
                  {(editable) ? (
                    <RemoveButton
                      label={t('loggers.remove', {type, channel: logger.channel_id})}
                      busy={edit.busyKey === key && editing !== key}
                      disabled={edit.pending}
                      onClick={() => void edit.run(key, {kind: 'logger-remove', channelId: logger.channel_id, type: logger.type}, t('loggers.removed', {type}))}
                    />
                  ) : null}
                </div>
                {(editing === key) ? (
                  <LoggerIgnoreEditor
                    logger={logger}
                    guildId={guild.id}
                    busy={edit.busyKey === key}
                    disabled={edit.pending}
                    onCancel={() => setEditing(null)}
                    onSave={async (next) => {
                      const saved = await edit.run(key, {kind: 'logger-ignore', channelId: logger.channel_id, type: logger.type, ignoredIds: next}, t('loggers.ignore_saved', {type}));
                      if (saved) {
                        setEditing(null);
                      }
                    }}
                  />
                ) : (ignoredIds.length) ? (
                  <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                    <span className='text-xs text-subtle'>{t('loggers.ignoring')}</span>
                    {ignoredIds.map((id) => (
                      <span key={id} className='inline-flex min-w-0 items-center rounded-md border border-line bg-surface-3 px-2 py-0.5'>
                        <EntryMention type={(loggerIgnoresRoles(logger.type)) ? 'role' : 'channel'} id={id} guildId={guild.id}/>
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={t('loggers.empty')}>{t('loggers.empty_description')}</EmptyState>
      )}
    </Panel>
  );
}


// what a logger skips, channel ids (a category covers its channels, a channel its threads) or role ids for the roles logger
function LoggerIgnoreEditor({ logger, guildId, busy, disabled, onCancel, onSave }: {
  logger: GuildLogger,
  guildId: string,
  busy: boolean,
  disabled: boolean,
  onCancel: () => void,
  onSave: (ignoredIds: Array<string>) => void,
}) {
  const { t } = useI18n();
  const roles = loggerIgnoresRoles(logger.type);
  const initial = logger.ignored_ids ?? [];
  const [ ids, setIds ] = useState<Array<string>>(initial);
  const [ value, setValue ] = useState('');

  const trimmed = value.trim();
  const full = MAX_LOGGER_IGNORED <= ids.length;
  const error = (!trimmed) ? null
    : (!isSnowflake(trimmed)) ? t('rules.bad_id')
    : (roles && trimmed === guildId) ? t('loggers.ignore_everyone')
    : (ids.includes(trimmed)) ? t('loggers.ignore_exists')
    : null;
  const add = () => {
    if (trimmed && !error && !full) {
      setIds([...ids, trimmed]);
      setValue('');
    }
  };
  const unchanged = ids.length === initial.length && ids.every((id, i) => initial[i] === id);
  const label = (roles) ? t('loggers.ignore_role_label') : t('loggers.ignore_channel_label');

  return (
    <div className='mt-2 space-y-2 rounded-md border border-line bg-surface-2 p-3'>
      <p className='text-xs text-subtle'>{(roles) ? t('loggers.ignore_roles_help') : t('loggers.ignore_channels_help')}</p>
      <div className='flex flex-wrap items-center gap-1.5'>
        {ids.map((id) => (
          <span key={id} className='inline-flex min-w-0 items-center gap-1 rounded-md border border-line bg-surface-3 py-0.5 pr-0.5 pl-2'>
            <EntryMention type={(roles) ? 'role' : 'channel'} id={id} guildId={guildId}/>
            <button
              type='button'
              aria-label={t('loggers.ignore_remove', {id})}
              title={t('loggers.ignore_remove', {id})}
              className='flex size-6 cursor-pointer items-center justify-center rounded text-subtle hover:bg-surface-2 hover:text-danger-text disabled:cursor-not-allowed'
              disabled={busy}
              onClick={() => setIds(ids.filter((other) => other !== id))}
            >
              <X aria-hidden className='size-3.5'/>
            </button>
          </span>
        ))}
        <input
          className='input h-8 w-60 py-0 font-mono text-sm'
          inputMode='numeric'
          aria-label={label}
          aria-invalid={!!error}
          placeholder={label}
          value={value}
          disabled={full || busy}
          onChange={(event) => setValue(event.target.value.replace(/[<>#@&!\s]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
          }}
          autoComplete='off'
          autoFocus
        />
        <button type='button' className='btn btn-sm btn-secondary' disabled={!trimmed || !!error || full || busy} onClick={add}>
          <Plus aria-hidden className='size-4'/>
          {t('loggers.ignore_add')}
        </button>
      </div>
      {(error) ? <p className='text-xs text-danger-text'>{error}</p> : (full) ? <p className='text-xs text-subtle'>{t('loggers.ignore_full', {max: MAX_LOGGER_IGNORED})}</p> : null}
      <div className='flex items-center gap-2'>
        <button type='button' className='btn btn-sm btn-secondary' disabled={disabled || unchanged} onClick={() => onSave(ids)}>
          {(busy) ? <Spinner className='size-3.5'/> : null}
          {t('common.save')}
        </button>
        <button type='button' className='btn btn-sm btn-ghost' disabled={busy} onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
