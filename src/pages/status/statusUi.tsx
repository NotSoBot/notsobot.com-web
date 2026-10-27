import { useMatch, useNavigate } from 'react-router';

import { Segmented } from '@/components/ui/Segmented';
import { Routes } from '@/config';
import { useI18n, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';


type StatusView = 'shards' | 'voice';

const VIEW_OPTIONS: Array<{value: StatusView, label: TranslationKey}> = [
  {value: 'shards', label: 'status.shards'},
  {value: 'voice', label: 'status.voice_nodes'},
];

const VIEW_PATHS: Readonly<Record<StatusView, string>> = {
  shards: Routes.STATUS,
  voice: Routes.STATUS_VOICE,
};


// the status pages' switcher, like the docs' TagScript/MediaScript one
export function StatusSwitcher() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const view: StatusView = (useMatch(Routes.STATUS_VOICE)) ? 'voice' : 'shards';
  return (
    <div className='mb-6 flex justify-center'>
      <Segmented
        label={t('status.label')}
        value={view}
        options={VIEW_OPTIONS.map((option) => ({value: option.value, label: t(option.label)}))}
        onChange={(value) => {
          navigate(VIEW_PATHS[value as StatusView], {replace: true});
          window.scrollTo({top: 0});
        }}
      />
    </div>
  );
}


export function StatTile({ label, value, className = 'text-brand' }: {label: string, value: string | null, className?: string}) {
  return (
    <div className='rounded-lg bg-deep p-4 text-center'>
      {(value !== null) ? (
        <div className={cn('mb-1 text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl lg:text-3xl', className)}>{value}</div>
      ) : (
        <div className='mx-auto mb-2 h-8 w-24 animate-pulse rounded bg-surface-3'/>
      )}
      <div className='text-sm text-muted'>{label}</div>
    </div>
  );
}
