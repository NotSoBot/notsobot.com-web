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
  online: {dot: 'bg-success', text: 'text-success-text'},
  draining: {dot: 'bg-warning', text: 'text-warning'},
  offline: {dot: 'bg-danger', text: 'text-danger-text'},
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
    effects_paused: total.effects_paused + (node.stats?.effects_paused ?? 0),
    effects_playing: total.effects_playing + (node.stats?.effects_playing ?? 0),
    online: total.online + ((node.stats) ? 1 : 0),
    paused: total.paused + (node.stats?.paused ?? 0),
    players: total.players + (node.stats?.players ?? 0),
    playing: total.playing + (node.stats?.playing ?? 0),
  }), {effects_paused: 0, effects_playing: 0, online: 0, paused: 0, players: 0, playing: 0}) : null;

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
        <div className='grid gap-4 sm:grid-cols-2'>
          <StatTile
            label={t('voice_status.nodes_online')}
            className={(totals && totals.online < nodes.length) ? 'text-warning' : 'text-success-text'}
            value={(totals) ? `${formatNumber(totals.online)}/${formatNumber(nodes.length)}` : null}
          />
          <PlayerCounts counts={totals} large/>
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
          <PlayerCounts className='mt-4' counts={stats}/>

          <div className='mt-4'>
            <div className='mb-1 flex justify-between text-xs text-muted tabular-nums'>
              <span>CPU</span>
              <span className={cn(100 <= load ? 'text-danger-text' : 75 <= load ? 'text-warning' : null)}>{load}%</span>
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


type Counts = Pick<NonNullable<InfoVoiceNode['stats']>, 'effects_paused' | 'effects_playing' | 'paused' | 'players' | 'playing'>;

// the total players and what they're doing under it, `large` for the page's totals (null while they load)
function PlayerCounts({ counts, large = false, className }: {counts: Counts | null, large?: boolean, className?: string}) {
  const { t } = useI18n();
  return (
    <div className={cn('text-center', (large) ? 'rounded-lg bg-deep px-4 pt-4 pb-3' : 'rounded-md bg-surface px-2 pt-2.5 pb-2', className)}>
      <dl className='flex flex-col-reverse items-center'>
        <dt className={cn('text-muted', (large) ? 'text-sm' : 'text-xs')}>{t('voice_status.players')}</dt>
        {(counts) ? (
          <dd className={cn('font-semibold tabular-nums', (large) ? 'mb-1 text-xl font-bold text-brand-text sm:text-2xl lg:text-3xl' : 'text-2xl text-white')}>
            {formatNumber(counts.players)}
          </dd>
        ) : (
          <dd className='mb-2 h-8 w-24 animate-pulse rounded bg-surface-3'/>
        )}
      </dl>
      <dl className={cn('grid grid-cols-3 divide-x divide-line-strong border-t border-line-strong', (large) ? 'mt-3 pt-1.5' : 'mt-2.5 pt-1')}>
        <Count large={large} label={t('voice_status.playing')} value={counts?.playing} effects={counts?.effects_playing} highlight/>
        <Count large={large} label={t('voice_status.paused')} value={counts?.paused} effects={counts?.effects_paused}/>
        {/* in a voice channel with nothing playing or paused */}
        <Count large={large} label={t('voice_status.idle')} value={(counts) ? counts.players - counts.playing - counts.paused : undefined}/>
      </dl>
    </div>
  );
}


function Count({ label, value, effects = 0, highlight = false, large }: {
  label: string,
  value: number | undefined,
  effects?: number,
  highlight?: boolean,
  large: boolean,
}) {
  const { t } = useI18n();
  return (
    // top to bottom: how many of them have live effects (right aligned on a line of its own that's always there, so it
    // can't run into a long number and showing up never moves anything), the number and its label
    <div className='flex flex-col-reverse items-center px-1'>
      <dt className={cn('text-muted', (large) ? 'text-xs' : 'text-[11px]')}>{label}</dt>
      {(value !== undefined) ? (
        <dd className={cn('font-semibold tabular-nums', (large) && 'text-lg', (highlight) ? 'text-brand-text' : 'text-white')}>{formatNumber(value)}</dd>
      ) : (
        <dd className='mb-1 h-5 w-8 animate-pulse rounded bg-surface-3'/>
      )}
      <dd
        className={cn('self-end truncate text-subtle tabular-nums', (large) ? 'h-4 pr-1 text-xs leading-4 sm:pr-2' : 'h-3.5 pr-0.5 text-[11px] leading-3.5')}
        title={(effects) ? t('voice_status.effects_count', {count: formatNumber(effects)}) : undefined}
        aria-hidden={(!effects) || undefined}
      >
        {(effects) ? (
          <>
            <span aria-hidden>{t('voice_status.effects_short', {count: formatNumber(effects)})}</span>
            <span className='sr-only'>{t('voice_status.effects_count', {count: formatNumber(effects)})}</span>
          </>
        ) : null}
      </dd>
    </div>
  );
}
