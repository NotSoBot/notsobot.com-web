import { Server, X } from 'lucide-react';
import { Link } from 'react-router';

import { dashboardServerPath } from './guildMeta';
import { useI18n } from '@/i18n';


// "Only in <server>" over a list filtered to one server (`?server=<id>`, from a server page's shortcuts): the name opens
// the server again (`to`, the admin server modal on admin pages), the × shows everything again
export function ServerFilterChip({ guildId, name, to = dashboardServerPath(guildId), onClear }: {
  guildId: string,
  name: string | null | undefined,
  to?: string,
  onClear: () => void,
}) {
  const { t } = useI18n();
  return (
    <div className='mb-4 flex flex-wrap items-center gap-2 text-sm text-muted'>
      Only in
      <span className='inline-flex max-w-full min-w-0 items-center rounded-md border border-line-strong bg-surface-2 text-xs'>
        <Link to={to} className='inline-flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-2 font-medium text-fg hover:text-brand' title={t('server_chip.open')}>
          <Server aria-hidden className='size-3.5 shrink-0 text-muted'/>
          <span className='truncate'>{name ?? t('server_chip.server')}</span>
          {(name) ? null : <span className='font-mono text-subtle'>{guildId}</span>}
        </Link>
        <button type='button' aria-label={t('server_chip.show_all')} title={t('server_chip.show_all')} className='cursor-pointer rounded-r-md p-1.5 text-muted hover:bg-surface-3 hover:text-white' onClick={onClear}>
          <X aria-hidden className='size-3.5'/>
        </button>
      </span>
    </div>
  );
}
