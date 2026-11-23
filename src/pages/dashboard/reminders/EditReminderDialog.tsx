import type { UseMutationResult } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DialogError } from '@/components/ui/DialogError';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ExactDate } from '@/components/ui/Tooltip';
import { useI18n } from '@/i18n';
import type { Reminder } from '@/lib/api';
import { errorMessage, type ReminderEdit } from '@/lib/api/dashboardQueries';
import { formatDate, formatDateTime } from '@/lib/utils';

import { CharCounter, Field, Toggle } from '../ui';


export const REMINDER_CONTENT_MAX_LENGTH = 512;


// Changes a reminder's text and/or moves a server reminder to the user's dms (the time is still changed with the bot)
export function EditReminderDialog({ reminder, where, mutation, onClose }: {
  reminder: Reminder,
  // "Cool Gamers Club", shown on the move-to-dms toggle
  where: string,
  mutation: UseMutationResult<Reminder, Error, ReminderEdit>,
  onClose: () => void,
}) {
  const { t } = useI18n();
  const titleId = useId();
  const toast = useToast();
  // asked when the dialog is closed from outside (Escape, a click on the dimming, the X) with the text edited. Cancel
  // is a deliberate no and closes right away
  const [ confirmingDiscard, setConfirmingDiscard ] = useState(false);
  const [ content, setContent ] = useState(reminder.content);
  const [ moveToDms, setMoveToDms ] = useState(false);

  // the mutation belongs to the page, so drop an error left over from the last reminder edited
  useEffect(() => {
    mutation.reset();
    // only when the dialog opens
  }, []);

  const tooLong = REMINDER_CONTENT_MAX_LENGTH < content.length;
  const contentChanged = content !== reminder.content;
  const changed = contentChanged || moveToDms;

  const submit = () => {
    const edit: ReminderEdit = {reminderId: reminder.id};
    if (contentChanged) {
      edit.content = content;
    }
    if (moveToDms) {
      edit.move_to_dms = true;
    }
    mutation.mutate(edit, {
      onSuccess: () => {
        toast(t((moveToDms) ? 'reminders.saved_moved' : 'reminders.saved'));
        onClose();
      },
    });
  };

  return (
    <Modal
      labelledBy={titleId}
      className='max-w-lg'
      onClose={() => {
        if (mutation.isPending) {
          return;
        }
        if (contentChanged) {
          setConfirmingDiscard(true);
        } else {
          onClose();
        }
      }}
    >
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending && !tooLong && changed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('reminders.edit_title', {position: reminder.position})}</h2>
        <p className='mt-2 text-sm text-muted'>{t('reminders.edit_description')}</p>

        <div className='mt-3 rounded-md border border-line bg-deep p-3 text-sm'>
          <div className='font-medium text-white'>
            <ExactDate value={reminder.timestamp_start} format={(reminder.is_all_day) ? formatDate : formatDateTime}/>
            {(reminder.timestamp_end) ? (
              <span className='text-muted'> – {(reminder.is_all_day) ? formatDate(reminder.timestamp_end) : formatDateTime(reminder.timestamp_end)}</span>
            ) : null}
          </div>
          <div className='mt-0.5 text-muted'>{t('reminders.sent_in', {where})}</div>
        </div>

        <Field
          className='mt-4'
          label={t('reminders.message')}
          hint={t('reminders.message_hint')}
          error={(tooLong) ? t('reminders.too_long', {max: REMINDER_CONTENT_MAX_LENGTH}) : undefined}
          counter={<CharCounter length={content.length} max={REMINDER_CONTENT_MAX_LENGTH}/>}
        >
          {(props) => (
            <textarea
              {...props}
              className='input min-h-28 resize-y'
              value={content}
              data-autofocus
              disabled={mutation.isPending}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </Field>

        {(reminder.guild_id) ? (
          <div className='mt-3 rounded-md border border-line p-3 text-sm'>
            <Toggle
              checked={moveToDms}
              onChange={setMoveToDms}
              disabled={mutation.isPending}
              label={t('reminders.move')}
              description={t('reminders.move_description', {where})}
            />
          </div>
        ) : null}

        {(mutation.isError) ? (
          <DialogError className='mt-4'>
            {errorMessage(mutation.error, t('reminders.save_error'))}
          </DialogError>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>{t('common.cancel')}</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || tooLong || !changed}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            {t('common.save')}
          </button>
        </div>
      </form>
      {/* next to the form, not inside it: its own form's submit would bubble up to this one and save */}
      {(confirmingDiscard) ? (
        <ConfirmDialog
          title={t('dash.discard_title')}
          description={t('dash.discard_description')}
          confirmLabel={t('common.discard')}
          onConfirm={onClose}
          onClose={() => setConfirmingDiscard(false)}
        />
      ) : null}
    </Modal>
  );
}
