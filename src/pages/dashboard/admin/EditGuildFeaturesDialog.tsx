import { useId, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { GuildFeatures, type AdminGuild, type GuildFeature } from '@/lib/api';
import { errorMessage, usePatchAdminGuildMutation } from '@/lib/api/dashboardQueries';

import { GuildIcon } from '../servers/GuildIcon';
import { Toggle } from '../ui';


// what each server feature turns on, as the bot reads them
export const GUILD_FEATURE_INFO: Record<GuildFeature, {label: string, description: string}> = {
  [GuildFeatures.AI_ACCESS]: {
    label: 'AI access',
    description: 'The AI commands work for everyone in this server, like a premium server.',
  },
  [GuildFeatures.FREE_CUSTOM_COMMANDS]: {
    label: 'Free custom commands',
    description: 'Tags can run as custom commands here without a member giving it their premium.',
  },
  [GuildFeatures.MUSIC_ACCESS]: {
    label: 'Music access',
    description: 'The music commands work for everyone in this server, like a premium server.',
  },
};

const FEATURES = Object.values(GuildFeatures);


// Owner only: turns a server's features on or off, what the bot's `owner guild features add/remove` commands do
export function EditGuildFeaturesDialog({ guild, onClose }: {guild: AdminGuild, onClose: () => void}) {
  const titleId = useId();
  const featuresId = useId();
  const toast = useToast();
  const mutation = usePatchAdminGuildMutation(guild.id);
  // features the dashboard doesn't know yet are kept as they are
  const [ features, setFeatures ] = useState<Array<string>>(guild.features);
  const name = guild.name || guild.id;

  const changed = features.length !== guild.features.length || features.some((feature) => !guild.features.includes(feature));

  const submit = () => {
    mutation.mutate({features: features as Array<GuildFeature>}, {
      onSuccess: () => {
        toast(`Updated ${name}’s features`);
        onClose();
      },
    });
  };

  return (
    <Modal labelledBy={titleId} onClose={() => !mutation.isPending && onClose()} className='max-w-lg'>
      <form
        className='p-5 sm:p-6'
        onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending && changed) {
            submit();
          }
        }}
      >
        <h2 id={titleId} className='pr-10 text-lg font-semibold break-words text-white'>Edit {name}’s features</h2>
        <p className='mt-2 text-sm text-muted'>They change for the bot as soon as this is saved.</p>

        <div className='mt-3 flex items-center gap-2.5 rounded-md border border-line bg-deep p-3'>
          <GuildIcon guild={guild} size={32} className='size-8 rounded-lg text-[10px]'/>
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium text-white'>{name}</p>
            <p className='truncate font-mono text-xs text-subtle'>{guild.id}</p>
          </div>
        </div>

        <h3 id={featuresId} className='mt-4 mb-1.5 text-sm text-muted'>Features</h3>
        <div role='group' aria-labelledby={featuresId} className='space-y-3 rounded-md border border-line p-3 text-sm'>
          {FEATURES.map((feature) => (
            <Toggle
              key={feature}
              label={GUILD_FEATURE_INFO[feature].label}
              description={GUILD_FEATURE_INFO[feature].description}
              checked={features.includes(feature)}
              disabled={mutation.isPending}
              onChange={(value) => setFeatures((current) => (value) ? [...current, feature] : current.filter((item) => item !== feature))}
            />
          ))}
        </div>

        {(mutation.isError) ? (
          <p role='alert' className='mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg'>
            {errorMessage(mutation.error, 'Couldn’t update the server’s features.')}
          </p>
        ) : null}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button type='button' className='btn btn-secondary' onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button type='submit' className='btn btn-primary' disabled={mutation.isPending || !changed}>
            {(mutation.isPending) ? <Spinner className='size-4 border-white/40 border-t-white'/> : null}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
