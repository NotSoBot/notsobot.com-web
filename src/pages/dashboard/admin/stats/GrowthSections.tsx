// Who's using the bot and who's paying: users and servers over the page's window, and premium (active entitlements by
// tier, users' premium, subscriptions that started or ended).

import { Routes } from '@/config';
import type { AdminGrowthStats, AdminPremiumStats } from '@/lib/api';
import { useAdminStatsQuery } from '@/lib/api/dashboardQueries';
import { formatNumber } from '@/lib/utils';

import { premiumLabel } from '../../premium';
import { compact, DailyBars, dayLabel, Metric, MetricGrid, plural, RankedList, STAT_COLORS, StatsSection, SubHeading } from './statsUi';


function signed(value: number): string {
  return (0 < value) ? `+${formatNumber(value)}` : formatNumber(value);
}


export function GrowthSection({ days }: {days: number}) {
  const query = useAdminStatsQuery<AdminGrowthStats>('growth', days);
  return (
    <StatsSection id='growth' title='Growth' accent={STAT_COLORS.secondary} query={query}>
      {({ users, servers, days: windowDays }) => {
        const net = servers.joins - servers.leaves;
        return (
          <>
            <MetricGrid>
              <Metric
                label='Users'
                value={compact(users.total)}
                detail={`${compact(users.active_ever)} ever ran a command`}
                title='Everyone the API has a record of (bots aside), and how many of them have run a command'
              />
              <Metric
                label='New users'
                value={formatNumber(users.new)}
                detail={`first command in ${plural(windowDays, 'day')}`}
                color={STAT_COLORS.primary}
              />
              <Metric label='Servers' value={compact(servers.current)} detail='the bot is in now'/>
              <Metric
                label='Server growth'
                value={signed(net)}
                detail={`${formatNumber(servers.joins)} joined • ${formatNumber(servers.leaves)} left`}
                tone={(net < 0) ? 'danger' : undefined}
                title='Joins and leaves the bot saw while it was up, outages aren’t counted'
              />
            </MetricGrid>

            <div className='mt-4 grid gap-4 lg:grid-cols-2'>
              <section>
                <SubHeading>New users</SubHeading>
                <DailyBars
                  items={users.series}
                  series={[{label: 'New users', color: STAT_COLORS.primary, value: (item) => item.count}]}
                  describe={(item) => `${dayLabel(item.date)}: ${plural(item.count, 'new user')}`}
                />
              </section>
              <section>
                <SubHeading>Servers joined and left</SubHeading>
                <DailyBars
                  items={servers.series}
                  series={[{label: 'Joined', color: STAT_COLORS.secondary, value: (item) => item.joins}]}
                  below={{label: 'Left', color: STAT_COLORS.bad, value: (item) => item.leaves}}
                  describe={(item) => `${dayLabel(item.date)}: joined ${formatNumber(item.joins)}, left ${formatNumber(item.leaves)}, net ${signed(item.joins - item.leaves)}`}
                />
              </section>
            </div>

            {/* servers the bot already left that discord still lists in READY and removes again on every identify, so they
                track reconnects.
                an api from before they were counted has no `ghosts`, the section is left out then */}
            {(servers.ghosts !== undefined) ? <section className='mt-4'>
              <SubHeading>Ghost leaves</SubHeading>
              <p className='mb-2 text-sm text-muted'>
                {plural(servers.ghosts, 'ghost leave')} not counted as leaves: servers the bot already left that Discord
                still lists when a shard identifies, then removes again. Spikes mean shards reconnected.
              </p>
              <DailyBars
                items={servers.series}
                series={[{label: 'Ghost leaves', color: STAT_COLORS.neutral, value: (item) => item.ghosts ?? 0}]}
                describe={(item) => `${dayLabel(item.date)}: ${plural(item.ghosts ?? 0, 'ghost leave')}`}
              />
            </section> : null}
            {(users.blocked) ? <p className='mt-3 text-xs text-subtle'>{plural(users.blocked, 'user')} blocked.</p> : null}
          </>
        );
      }}
    </StatsSection>
  );
}


export function PremiumSection({ days }: {days: number}) {
  const query = useAdminStatsQuery<AdminPremiumStats>('premium', days);
  return (
    <StatsSection id='premium' title='Premium' accent='#f0b232' query={query}>
      {(data) => (
        <>
          <MetricGrid>
            <Metric
              label='Active entitlements'
              value={formatNumber(data.active.count)}
              detail={plural(data.active.users, 'user')}
              to={`${Routes.DASHBOARD_OWNER_ENTITLEMENTS}?active=true`}
            />
            <Metric label='Started' value={formatNumber(data.started)} detail={`in ${plural(data.days, 'day')}`} color={STAT_COLORS.secondary}/>
            <Metric label='Ended' value={formatNumber(data.ended)} detail={`in ${plural(data.days, 'day')}`} color={STAT_COLORS.bad}/>
            <Metric label='Premium servers' value={formatNumber(data.premium_servers)} detail='given perks by Premium+ users'/>
          </MetricGrid>

          <div className='mt-4'>
            <DailyBars
              items={data.series}
              series={[{label: 'Started', color: STAT_COLORS.secondary, value: (item) => item.started}]}
              below={{label: 'Ended', color: STAT_COLORS.bad, value: (item) => item.ended}}
              describe={(item) => `${dayLabel(item.date)}: ${formatNumber(item.started)} started, ${formatNumber(item.ended)} ended`}
            />
          </div>

          <div className='mt-6 grid gap-6 lg:grid-cols-2'>
            <section>
              <SubHeading>Active by tier</SubHeading>
              <RankedList
                empty='No active entitlements.'
                items={data.active.tiers.map((tier) => ({
                  key: String(tier.premium_type),
                  label: (tier.premium_type === null) ? 'Unknown SKU' : premiumLabel(tier.premium_type),
                  value: tier.count,
                  display: formatNumber(tier.count),
                  detail: `${formatNumber(tier.discord)} Discord • ${formatNumber(tier.manual)} given by owners`,
                }))}
              />
            </section>
            <section>
              <SubHeading>Users by premium</SubHeading>
              <RankedList
                empty='Nobody has premium.'
                items={data.users.map((row) => ({
                  key: String(row.premium_type),
                  label: premiumLabel(row.premium_type),
                  value: row.count,
                  display: formatNumber(row.count),
                }))}
              />
            </section>
          </div>
        </>
      )}
    </StatsSection>
  );
}
