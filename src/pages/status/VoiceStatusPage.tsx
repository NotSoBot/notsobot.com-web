// The voice nodes (notsobot.voice) that play music, from `GET /info/voice`: enabled ones, and disabled ones while they
// still have players. Their urls and why one couldn't be reached stay on the owner page

import { useI18n } from '@/i18n';
import type { InfoVoiceNode } from '@/lib/api';
import { useInfoVoiceQuery } from '@/lib/api/queries';
import { cn, formatMemory, formatNumber, formatUptime } from '@/lib/utils';

import { StatTile, StatusSwitcher } from './statusUi';


type NodeStatus = 'online' | 'draining' | 'offline';

// labels are `voice_status.<status>`, hints `voice_status.<status>_hint`
const NODE_STATUS_STYLES: Record<NodeStatus, {dot: string, text: string}> = {
  online: {dot: 'bg-success', text: 'text-success'},
  draining: {dot: 'bg-warning', text: 'text-warning'},
  offline: {dot: 'bg-danger', text: 'text-danger'},
};

const LEGEND_ORDER: Array<NodeStatus> = ['online', 'draining', 'offline'];


function nodeStatus(node: InfoVoiceNode): NodeStatus {
  return (!node.stats) ? 'offline' : (node.enabled) ? 'online' : 'draining';
}


export function VoiceStatusPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useInfoVoiceQuery();
  const nodes = data?.nodes ?? [];

  const totals = (data) ? nodes.reduce((total, node) => ({
    effects: total.effects + (node.stats?.effects ?? 0),
    online: total.online + ((node.stats) ? 1 : 0),
    players: total.players + (node.stats?.players ?? 0),
    playing: total.playing + (node.stats?.playing ?? 0),
  }), {effects: 0, online: 0, players: 0, playing: 0}) : null;

  return (
    <div className='container-page py-8'>
      <h1 className='sr-only'>{t('voice_status.title')}</h1>
      <StatusSwitcher/>

      {(isError && data) ? (
        <div className='mb-6 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning'>
          {t('status.stale')}
        </div>
      ) : null}

      <section aria-labelledby='voice-stats-heading' className='card mb-8 p-6'>
        <h2 id='voice-stats-heading' className='mb-6 text-center text-2xl text-white'>{t('voice_status.music_stats')}</h2>
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <StatTile
            label={t('voice_status.nodes_online')}
            className={(totals && totals.online < nodes.length) ? 'text-warning' : 'text-success'}
            value={(totals) ? `${formatNumber(totals.online)}/${formatNumber(nodes.length)}` : null}
          />
          <StatTile label={t('voice_status.playing')} value={(totals) ? formatNumber(totals.playing) : null}/>
          <StatTile label={t('voice_status.players')} value={(totals) ? formatNumber(totals.players) : null}/>
          <StatTile label={t('voice_status.with_effects')} value={(totals) ? formatNumber(totals.effects) : null}/>
        </div>
      </section>

      <section aria-labelledby='voice-nodes-heading' className='card p-6'>
        <h2 id='voice-nodes-heading' className='mb-2 text-center text-2xl text-white'>{t('status.voice_nodes')}</h2>
        <ul aria-label={t('status.colors')} className='mb-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-subtle'>
          {LEGEND_ORDER.map((key) => (
            <li key={key} className='flex items-center gap-1.5'>
              <span className={cn('size-2 rounded-full opacity-90', NODE_STATUS_STYLES[key].dot)}/>
              {t(`voice_status.${key}`)}
            </li>
          ))}
        </ul>
        {(nodes.length) ? (
          <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {nodes.map((node) => <NodeCard key={node.id} node={node}/>)}
          </ul>
        ) : (data) ? (
          <p className='py-6 text-center text-muted'>{t('voice_status.none')}</p>
        ) : (isPending) ? (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3' aria-hidden>
            {Array.from({length: 3}, (_, i) => <div key={i} className='h-44 animate-pulse rounded-lg bg-deep'/>)}
          </div>
        ) : (
          <p className='py-6 text-center text-muted'>{t('voice_status.unavailable')}</p>
        )}
      </section>
    </div>
  );
}


function NodeCard({ node }: {node: InfoVoiceNode}) {
  const { t } = useI18n();
  const { stats } = node;
  const status = nodeStatus(node);
  const style = NODE_STATUS_STYLES[status];
  // the load average over its cores, past 1 it's queueing work
  const load = (stats) ? Math.round(stats.cpu * 100) : 0;

  return (
    <li className={cn('flex flex-col rounded-lg bg-deep p-4', (status === 'offline') && 'ring-1 ring-danger')}>
      <div className='flex items-center justify-between gap-3'>
        <span className='flex min-w-0 items-center gap-2'>
          <span className={cn('size-2.5 shrink-0 rounded-full', style.dot)}/>
          <span className='truncate font-semibold text-white'>{node.name}</span>
        </span>
        <span className={cn('shrink-0 text-xs font-medium', style.text)}>{t(`voice_status.${status}`)}</span>
      </div>
      <p className='mt-0.5 pl-4.5 text-xs text-subtle'>{t(`voice_status.${status}_hint`)}</p>

      {(stats) ? (
        <>
          <dl className='mt-4 grid grid-cols-3 gap-2 text-center'>
            <NodeCount label={t('voice_status.playing')} value={stats.playing} highlight/>
            <NodeCount label={t('voice_status.paused')} value={stats.paused}/>
            <NodeCount label={t('voice_status.effects')} value={stats.effects}/>
          </dl>

          <div className='mt-4'>
            <div className='mb-1 flex justify-between text-xs text-muted tabular-nums'>
              <span>CPU</span>
              <span className={cn(100 <= load ? 'text-danger' : 75 <= load ? 'text-warning' : null)}>{load}%</span>
            </div>
            <div className='h-1.5 overflow-hidden rounded-full bg-surface-3'>
              <div
                className={cn('h-full rounded-full', 100 <= load ? 'bg-danger' : 75 <= load ? 'bg-warning' : 'bg-success')}
                style={{width: `${Math.min(load, 100)}%`}}
              />
            </div>
          </div>

          <p className='mt-auto truncate pt-3 text-xs text-subtle tabular-nums' title={t('voice_status.version', {version: stats.version})}>
            {formatMemory(stats.memory)}
            {(node.latency !== null) ? <>{' • '}{formatNumber(node.latency)} ms</> : null}
            {' • '}{t('voice_status.up', {uptime: formatUptime(stats.uptime)})}
            {' • '}v{stats.version}
          </p>
        </>
      ) : (
        <p className='mt-4 text-sm text-muted'>{t('voice_status.not_responding')}</p>
      )}
    </li>
  );
}


function NodeCount({ label, value, highlight = false }: {label: string, value: number, highlight?: boolean}) {
  return (
    // the number shows above its label
    <div className='flex flex-col-reverse rounded-md bg-surface px-2 py-2'>
      <dt className='text-xs text-muted'>{label}</dt>
      <dd className={cn('text-lg font-semibold tabular-nums', (highlight) ? 'text-brand' : 'text-white')}>{formatNumber(value)}</dd>
    </div>
  );
}
