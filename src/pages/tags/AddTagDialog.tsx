import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { translate, useI18n } from '@/i18n';
import { ApiErrorCodes, ApiRequestError, TagDirectoryVerificationStates, type Tag } from '@/lib/api';
import { errorMessage, isDiscordGrantError, isScopeMismatch, useAddMeTagMutation, useMeGuildsQuery } from '@/lib/api/dashboardQueries';
import { CharCounter } from '@/pages/dashboard/ui';


const DM_DESTINATION = 'dm';
const NAME_MAX = 64;


// the api's own message is more specific than the dashboard's generic one for these
function addErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.body?.message) {
    if (error.code === ApiErrorCodes.TAG_NAME_TAKEN || (error.code === ApiErrorCodes.MISSING_ACCESS && error.status === 400)) {
      return error.body.message;
    }
  }
  return errorMessage(error, translate('tags.add.error'));
}


// Adds a directory tag to one of your servers or your DMs with NotSoBot, as an alias (same as the bot's `tag get`).
// `verified` is the listing's `TagDirectoryVerificationStates`, anything short of verified gets a warning first.
export function AddTagDialog({ tag, verified, onClose }: {tag: Pick<Tag, 'id' | 'name'>, verified: number, onClose: () => void}) {
  const { t, rich } = useI18n();
  const titleId = useId();
  const destinationId = useId();
  const nameId = useId();

  const guilds = useMeGuildsQuery();
  const add = useAddMeTagMutation(tag.id);
  const [ destination, setDestination ] = useState(DM_DESTINATION);
  const [ name, setName ] = useState(tag.name);
  const [ added, setAdded ] = useState<{tag: Tag, where: string} | null>(null);

  const trimmedName = name.trim();
  const guildsError = (guilds.isError) ? (
    (isScopeMismatch(guilds.error) || isDiscordGrantError(guilds.error)) ?
      t('tags.add.relogin') :
      errorMessage(guilds.error, t('tags.add.servers_error'))
  ) : null;

  const submit = () => {
    const guild = guilds.data?.find((item) => item.id === destination);
    add.mutate({
      guild_id: (destination === DM_DESTINATION) ? undefined : destination,
      name: (trimmedName && trimmedName.toLowerCase() !== tag.name) ? trimmedName : undefined,
    }, {
      onSuccess: (created) => setAdded({tag: created, where: (guild) ? guild.name : t('tags.add.your_dms')}),
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !add.isPending && onClose()} className='max-w-md'>
      {(added) ? (
        <div className='p-5 sm:p-6'>
          <h2 id={titleId} className='flex items-center gap-2 pr-10 text-lg font-semibold text-white'>
            <CheckCircle2 aria-hidden className='size-5 text-success'/>
            {t('tags.add.added')}
          </h2>
          <p className='mt-2 text-sm text-muted'>
            {rich('tags.add.added_description', {
              name: (chunk) => <span className='font-mono text-white'>{chunk}</span>,
              where: (chunk) => <span className='text-white'>{chunk}</span>,
              code: (chunk) => <span className='font-mono text-white'>{chunk}</span>,
            }, {name: added.tag.name, where: added.where})}
          </p>
          <div className='mt-6 flex justify-end'>
            <button type='button' className='btn btn-primary' onClick={onClose}>{t('tags.add.done')}</button>
          </div>
        </div>
      ) : (
        <form
          className='p-5 sm:p-6'
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedName && !add.isPending) {
              submit();
            }
          }}
        >
          <h2 id={titleId} className='pr-10 text-lg font-semibold text-white'>{t('tags.add.title', {name: tag.name})}</h2>
          <p className='mt-2 text-sm text-muted'>{t('tags.add.description')}</p>

          {(verified !== TagDirectoryVerificationStates.VERIFIED) ? (
            <p role='alert' className='mt-4 flex gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg'>
              <TriangleAlert aria-hidden className='mt-0.5 size-4 shrink-0 text-warning'/>
              <span>
                <span className='font-medium text-white'>
                  {t((verified === TagDirectoryVerificationStates.PENDING_VERIFICATION) ? 'tags.add.pending_warning' : 'tags.add.unverified_warning')}
                </span>{' '}
                {t('tags.add.trust_warning')}
              </span>
            </p>
          ) : null}

          <div className='mt-5 space-y-4'>
            <div>
              <div className='mb-1.5 flex items-center justify-between gap-3'>
                <label htmlFor={destinationId} className='text-sm text-muted'>{t('tags.add.add_to')}</label>
                {(guilds.isPending) ? (
                  <span className='flex shrink-0 items-center gap-2 text-xs text-subtle'><Spinner className='size-3'/> {t('tags.add.loading_servers')}</span>
                ) : null}
              </div>
              <select
                id={destinationId}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                disabled={add.isPending}
                className='input'
              >
                <option value={DM_DESTINATION}>{t('tags.add.dms')}</option>
                {(guilds.isPending) ? (
                  <optgroup label={t('tags.add.servers')}>
                    <option disabled>{t('tags.add.loading')}</option>
                  </optgroup>
                ) : (guilds.data?.length) ? (
                  <optgroup label={t('tags.add.servers')}>
                    {guilds.data.map((guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
                  </optgroup>
                ) : null}
              </select>
              {(guilds.isPending) ? null : (guildsError) ? (
                <p className='mt-1.5 text-xs text-warning'>{guildsError}</p>
              ) : (!guilds.data?.length) ? (
                <p className='mt-1.5 text-xs text-subtle'>{t('tags.add.no_servers')}</p>
              ) : null}
            </div>

            <div>
              <div className='mb-1.5 flex items-baseline justify-between gap-3'>
                <label htmlFor={nameId} className='text-sm text-muted'>{t('tags.add.name')}</label>
                <span className='shrink-0 text-xs text-subtle tabular-nums'><CharCounter length={name.length} max={NAME_MAX}/></span>
              </div>
              <input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value.replace(/[\r\n]/g, ''))}
                maxLength={NAME_MAX}
                disabled={add.isPending}
                autoComplete='off'
                spellCheck={false}
                className='input font-mono'
              />
              <p className='mt-1.5 text-xs text-subtle'>{t('tags.add.name_hint')}</p>
            </div>
          </div>

          {(add.isError) ? (
            <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>{addErrorMessage(add.error)}</p>
          ) : null}

          <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className='btn btn-secondary' onClick={onClose} disabled={add.isPending}>{t('common.cancel')}</button>
            <button type='submit' className='btn btn-primary' disabled={!trimmedName || add.isPending}>
              {(add.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
              {t('tags.add.submit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
