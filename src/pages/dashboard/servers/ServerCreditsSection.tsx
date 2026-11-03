import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { useI18n } from '@/i18n';
import { CreditTransactionTypes, type CreditBalance, type GuildCredits, type UserGuild } from '@/lib/api';
import { errorMessage, useGuildCreditsQuery } from '@/lib/api/dashboardQueries';
import { CREDITS_WEEKLY_SERVER_AI_SLOT, CREDITS_WEEKLY_SERVER_TTS_SLOT } from '@/lib/credits';
import { cn, formatDate, formatExactDateTime, formatNumber } from '@/lib/utils';

import { StatTile } from '../admin/adminUi';
import { EmptyState, Panel, Skeleton } from '../ui';
import { Owner } from './GuildTagsSection';


// The server's NotSoCredits, like the bot's `credits` shows them to anyone there: this week's (from its premium server
// slots) and what people gave it, how much of each it's used, and who gave it some. Read only, giving is the bot's
// `/settings credits give` and buying is Discord's store
export function ServerCreditsSection({ guild }: {guild: UserGuild}) {
  const { t, rich } = useI18n();
  const { data, isPending, error } = useGuildCreditsQuery(guild.id);
  const code = (chunk: ReactNode) => <code className='text-fg'>{chunk}</code>;

  return (
    <Panel title={t('scredits.title')} accent='#faa81a' description={rich('scredits.description', {code})}>
      {(isPending) ? (
        <div aria-hidden className='grid gap-3 sm:grid-cols-2'>
          <Skeleton className='h-28 w-full bg-surface-2'/>
          <Skeleton className='h-28 w-full bg-surface-2'/>
        </div>
      ) : (error) ? (
        <p role='alert' className='text-sm text-danger-text'>{errorMessage(error, t('scredits.load_error'))}</p>
      ) : (
        <CreditsDetails credits={data}/>
      )}
    </Panel>
  );
}


function CreditsDetails({ credits }: {credits: GuildCredits}) {
  const { t, rich } = useI18n();
  const { balance, free, slots } = credits;
  // a chargeback can leave it below zero, and before anything was given there's nothing to have used
  const boughtUsed = Math.max(0, balance.refill_given - balance.refill_left);

  return (
    <div className='space-y-4'>
      {(free.ai || free.voices) ? (
        <p role='status' className='rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-fg'>
          {t((free.ai && free.voices) ? 'scredits.free_both' : (free.ai) ? 'scredits.free_ai' : 'scredits.free_voices')}
        </p>
      ) : null}

      <div className='grid gap-3 sm:grid-cols-3'>
        <WeekTile label={t('scredits.ai_week')} week={balance} empty='scredits.no_ai_weekly'/>
        <WeekTile label={t('scredits.voices_week')} week={credits.voices} empty='scredits.no_voices_weekly'/>
        <div className='rounded-md border border-line bg-deep p-4'>
          <div className='text-sm text-muted'>{t('scredits.given')}</div>
          <div className='mt-1 text-xl font-bold text-white tabular-nums'>{t('scredits.given_left', {left: formatNumber(balance.refill_left)})}</div>
          <div className='mt-2 text-xs text-subtle'>
            {t('scredits.given_used', {given: formatNumber(Math.max(0, balance.refill_given)), used: formatNumber(boughtUsed)})}
          </div>
          <div className='mt-1 text-xs text-subtle'>{t('scredits.given_hint')}</div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <StatTile
          label={t('scredits.ai_slots')}
          value={formatNumber(slots.ai)}
          title={t('scredits.ai_slots_title', {amount: formatNumber(CREDITS_WEEKLY_SERVER_AI_SLOT)})}
        />
        <StatTile
          label={t('scredits.plus_slots')}
          value={formatNumber(slots.plus)}
          title={t('scredits.plus_slots_title', {amount: formatNumber(CREDITS_WEEKLY_SERVER_TTS_SLOT)})}
        />
      </div>

      <p className='text-xs text-subtle'>{t('dcredits.costs', {ai: formatNumber(credits.ai_message), tts: formatNumber(credits.tts_byte)})}</p>

      <div>
        <h3 className='section-label mb-2'>{t('scredits.gifts')}</h3>
        {(credits.transactions.length) ? (
          <ul className='divide-y divide-line rounded-md border border-line'>
            {credits.transactions.map((transaction) => {
              const revoked = transaction.type === CreditTransactionTypes.REVOKE;
              return (
                <li key={transaction.id} className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm'>
                  <span className='flex min-w-0 items-center gap-1.5'>
                    <Owner user={transaction.user}/>
                    <span className={(revoked) ? 'text-[#ff8a8c]' : 'text-fg'}>
                      {t((revoked) ? 'scredits.revoked' : 'scredits.gave', {amount: formatNumber(Math.abs(transaction.amount))})}
                    </span>
                  </span>
                  <span className='shrink-0 text-xs text-subtle' title={formatExactDateTime(transaction.created)}>{formatDate(transaction.created)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title={t('scredits.gifts_empty')}>{rich('scredits.gifts_empty_description', {code: (chunk) => <code className='text-fg'>{chunk}</code>})}</EmptyState>
        )}
      </div>
    </div>
  );
}


// one of the server's weeks: what's left with a bar, what's been used and when it resets. `empty` when its slots give
// it none
function WeekTile({ label, week, empty }: {
  label: string,
  week: Pick<CreditBalance, 'resets_at' | 'weekly' | 'weekly_left'>,
  empty: 'scredits.no_ai_weekly' | 'scredits.no_voices_weekly',
}) {
  const { t, rich } = useI18n();
  const used = week.weekly - week.weekly_left;
  const usedPercent = (week.weekly) ? Math.min(100, Math.round((used / week.weekly) * 100)) : 0;
  const premiumLink = (chunk: ReactNode) => <Link to={Routes.DASHBOARD_PREMIUM} className='text-code hover:underline'>{chunk}</Link>;
  return (
    <div className='rounded-md border border-line bg-deep p-4'>
      <div className='text-sm text-muted'>{label}</div>
      {(week.weekly) ? (
        <>
          <div className='mt-1 text-xl font-bold text-white tabular-nums'>
            {t('dcredits.weekly_value', {left: formatNumber(week.weekly_left), weekly: formatNumber(week.weekly)})}
          </div>
          <div
            className='mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3'
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100 - usedPercent}
            aria-label={label}
          >
            <div className={cn('h-full rounded-full', (80 <= usedPercent) ? 'bg-warning' : 'bg-brand')} style={{width: `${100 - usedPercent}%`}}/>
          </div>
          <div className='mt-2 text-xs text-subtle'>
            {t('scredits.used', {used: formatNumber(used)})} • <span title={formatExactDateTime(week.resets_at)}>{t('dcredits.resets')} {formatDate(week.resets_at)}</span>
          </div>
        </>
      ) : (
        <p className='mt-1 text-sm text-muted'>{rich(empty, {link: premiumLink})}</p>
      )}
    </div>
  );
}
