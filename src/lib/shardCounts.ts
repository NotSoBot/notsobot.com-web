import type { InfoDiscordShard } from '@/lib/api';


export type ShardCounts = InfoDiscordShard['counts'];
export type ShardCountKey = keyof ShardCounts;

export type CounterGroup = 'server' | 'activity';

// the label is `counter.<key>`, and `counter.<key>.note` (shown on hover) explains what the number actually measures
export interface Counter {
  key: ShardCountKey,
  group: CounterGroup,
  // part of the short list (hover card, collapsed lookup)
  featured?: boolean,
}


// Every counter the bot reports per shard. Labels are deliberately precise: most of these are
// sizes of the bot's in-memory caches, and summing caches across shards double-counts anything
// that lives on more than one shard (a user in servers on several shards is counted once per shard).
export const COUNTERS: Array<Counter> = [
  {key: 'guilds', group: 'server', featured: true},
  {key: 'member_count', group: 'server', featured: true},
  {key: 'users', group: 'server', featured: true},
  {key: 'members', group: 'server'},
  {key: 'channels', group: 'server', featured: true},
  {key: 'channel_threads', group: 'server'},
  {key: 'roles', group: 'server', featured: true},
  {key: 'emojis', group: 'server'},
  {key: 'permission_overwrites', group: 'server'},
  {key: 'stage_instances', group: 'server'},
  {key: 'guild_scheduled_events', group: 'server'},
  {key: 'applications', group: 'server'},

  {key: 'presences', group: 'activity'},
  {key: 'presence_activities', group: 'activity'},
  {key: 'voice_states', group: 'activity', featured: true},
  {key: 'typings', group: 'activity'},
  {key: 'messages', group: 'activity'},
  {key: 'events', group: 'activity'},
];

// labels are `counter_group.<group>`
export const COUNTER_GROUPS: Array<CounterGroup> = ['server', 'activity'];

export const FEATURED_COUNTERS = COUNTERS.filter((counter) => counter.featured);


export function sumCounts(shards: Array<InfoDiscordShard>): ShardCounts {
  const totals = Object.fromEntries(COUNTERS.map((counter) => [counter.key, 0])) as ShardCounts;
  for (const shard of shards) {
    for (const counter of COUNTERS) {
      totals[counter.key] += shard.counts[counter.key] || 0;
    }
  }
  return totals;
}


export { formatCompact } from '@/lib/utils';
