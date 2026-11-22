import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast, type ToastAction } from '@/components/ui/Toast';
import { translate, useI18n } from '@/i18n';
import type { GuildLLMKnowledge, UserGuild } from '@/lib/api';
import {
  errorMessage,
  useGuildLLMKnowledgeMutation,
  useGuildLLMKnowledgeQuery,
  type GuildLLMKnowledgeAction,
} from '@/lib/api/dashboardQueries';
import { formatNumber } from '@/lib/utils';

import { Field, InlineError, Panel, Skeleton } from '../ui';
import { useReadOnlyMessage } from './guildMeta';
import { EditButton, RemoveButton } from './ServerSections';


// the api's limits, until the list has loaded
const DEFAULT_LIMITS = {amount: 10, total_length: 1000};


// What the server's admins told NotSoAI about it (rules, roles, an faq). Every one is in each NotSoAI prompt here, so
// any member can read them; changing them needs Manage Server, the same as the server's ai personality.
export function AIKnowledgeSection({ guild }: {guild: UserGuild}) {
  const { t } = useI18n();
  const editable = guild.editable.settings;
  const readOnlyMessage = useReadOnlyMessage();
  const toast = useToast();
  const { data, isPending, error, refetch, isRefetching } = useGuildLLMKnowledgeQuery(guild.id);
  const mutation = useGuildLLMKnowledgeMutation(guild.id);
  const [ busyKey, setBusyKey ] = useState<string | null>(null);
  const [ editingId, setEditingId ] = useState<string | null>(null);
  const [ content, setContent ] = useState('');

  const limits = data?.limits ?? DEFAULT_LIMITS;
  const items = data?.items ?? [];
  // every entry's characters together have a limit, a new one gets whatever is left
  const used = items.reduce((total, item) => total + item.content.length, 0);
  const remaining = Math.max(limits.total_length - used, 0);
  const fullAmount = limits.amount <= items.length;
  const full = !remaining || fullAmount;
  const trimmed = content.trim();

  // `undo` is a button on the success toast, removing doesn't ask first
  const run = async (key: string, action: GuildLLMKnowledgeAction, success: string, undo?: ToastAction): Promise<boolean> => {
    setBusyKey(key);
    try {
      await mutation.mutateAsync(action);
      toast(success, 'success', undo);
      return true;
    } catch (error) {
      toast(errorMessage(error, translate('knowledge.save_error')), 'error');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Panel
      title={t('knowledge.title')}
      accent='#a855f7'
      description={t('knowledge.description')}
      readOnly={(editable) ? undefined : readOnlyMessage('settings')}
    >
      {(isPending) ? (
        <div aria-hidden className='space-y-2'>
          <Skeleton className='h-9 w-full bg-surface-2'/>
          <Skeleton className='h-9 w-full bg-surface-2'/>
        </div>
      ) : (error) ? (
        <InlineError onRetry={() => void refetch()} retrying={isRefetching}>{errorMessage(error, t('knowledge.load_error'))}</InlineError>
      ) : (items.length) ? (
        <ol className='space-y-2'>
          {items.map((item, index) => (
            <li key={item.id} className='flex items-start gap-2 rounded-md border border-line bg-deep py-2 pr-1 pl-3'>
              <span className='mt-px w-5 shrink-0 text-sm text-subtle tabular-nums'>{index + 1}.</span>
              {(editingId === item.id) ? (
                <KnowledgeEditor
                  item={item}
                  maxLength={remaining + item.content.length}
                  busy={busyKey === item.id}
                  disabled={mutation.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={async (value) => {
                    if (await run(item.id, {kind: 'edit', knowledgeId: item.id, content: value}, t('knowledge.saved'))) {
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <>
                  <p className='min-w-0 flex-1 text-sm break-words whitespace-pre-wrap text-fg'>{item.content}</p>
                  {(editable) ? (
                    <div className='flex shrink-0 gap-1'>
                      <EditButton label={t('knowledge.edit', {number: index + 1})} disabled={mutation.isPending} onClick={() => setEditingId(item.id)}/>
                      <RemoveButton
                        label={t('knowledge.remove', {number: index + 1})}
                        busy={busyKey === item.id}
                        disabled={mutation.isPending}
                        // undo adds it again (as the last entry)
                        onClick={() => void run(item.id, {kind: 'remove', knowledgeId: item.id}, t('knowledge.removed'), {
                          label: t('sections.undo'),
                          onClick: () => void run('\u0000restore', {kind: 'add', content: item.content}, t('knowledge.restored')),
                        })}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className='text-sm text-muted'>{t('knowledge.empty')}</p>
      )}

      {(editable && !isPending && !error) ? (
        <form
          className='mt-4 flex flex-col gap-3 border-t border-line pt-4'
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            if (!trimmed || full || mutation.isPending) {
              return;
            }
            if (await run('\u0000add', {kind: 'add', content: trimmed}, t('knowledge.added'))) {
              // only if nothing else was typed while it was adding
              setContent((current) => (current === content) ? '' : current);
            }
          }}
        >
          <Field
            label={t('knowledge.field')}
            counter={`${formatNumber(used + content.length)}/${formatNumber(limits.total_length)}`}
            hint={(fullAmount) ? t('knowledge.full_amount', {max: limits.amount}) : (full) ? t('knowledge.full') : t('knowledge.hint', {count: items.length, max: limits.amount})}
          >
            {(props) => (
              <textarea
                {...props}
                rows={2}
                maxLength={remaining}
                className='input resize-y leading-relaxed'
                placeholder={t('knowledge.placeholder')}
                value={content}
                disabled={full}
                onChange={(event) => setContent(event.target.value)}
              />
            )}
          </Field>
          <button type='submit' className='btn btn-secondary self-start' disabled={!trimmed || full || mutation.isPending}>
            {(busyKey === '\u0000add') ? <Spinner className='size-4'/> : <Plus aria-hidden className='size-4'/>}
            {t('common.add')}
          </button>
        </form>
      ) : null}
    </Panel>
  );
}


// one fact edited in place, Escape cancels
function KnowledgeEditor({ item, maxLength, busy, disabled, onSave, onCancel }: {
  item: GuildLLMKnowledge,
  maxLength: number,
  busy: boolean,
  disabled: boolean,
  onSave: (content: string) => void,
  onCancel: () => void,
}) {
  const { t } = useI18n();
  const [ value, setValue ] = useState(item.content);
  const trimmed = value.trim();
  return (
    <form
      className='flex min-w-0 flex-1 flex-col gap-2 pr-2'
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (disabled || !trimmed) {
          return;
        }
        if (trimmed === item.content) {
          onCancel();
        } else {
          onSave(trimmed);
        }
      }}
    >
      <textarea
        aria-label={t('knowledge.edit_label')}
        rows={2}
        maxLength={maxLength}
        className='input resize-y text-sm leading-relaxed'
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        autoFocus
      />
      <div className='flex items-center gap-2'>
        <button type='submit' className='btn btn-sm btn-secondary' disabled={disabled || !trimmed}>
          {(busy) ? <Spinner className='size-3.5'/> : null}
          {t('common.save')}
        </button>
        <button type='button' className='btn btn-sm btn-ghost' disabled={busy} onClick={onCancel}>{t('common.cancel')}</button>
        <span className='ml-auto text-xs text-subtle tabular-nums'>{value.length}/{maxLength}</span>
      </div>
    </form>
  );
}
