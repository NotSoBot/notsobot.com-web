// labels for report types and statuses, shared by the user's reports page and the admin one

import { ReportStatuses, ReportTypes } from '@/lib/api';


// staff are only ever this to the reporter
export const REPORT_STAFF_NAME = 'NotSoAdmin';

export type ReportTone = 'warning' | 'danger' | 'neutral' | 'brand' | 'success';

// a tone as a solid fill, for the bars down the left edge of the report lists
export const REPORT_TONE_FILLS: Record<ReportTone, string> = {
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-subtle',
  brand: 'bg-brand',
  success: 'bg-success',
};

// the full-height bar down a list row's left edge (its `li` is `group/row relative`); the first and last rows round it
// into the card's corners (its 8px radius less the 1px border)
export const ROW_EDGE_BAR = 'pointer-events-none absolute inset-y-0 left-0 w-1 group-first/row:rounded-tl-[7px] group-last/row:rounded-bl-[7px]';

export const REPORT_STATUSES: Array<{value: number, label: string, tone: ReportTone}> = [
  {value: ReportStatuses.OPEN, label: 'Open', tone: 'warning'},
  {value: ReportStatuses.RESOLVED, label: 'Resolved', tone: 'success'},
  {value: ReportStatuses.DISMISSED, label: 'Dismissed', tone: 'neutral'},
];

export const REPORT_TYPES: Array<{value: number, label: string, tone: ReportTone}> = [
  {value: ReportTypes.BUG, label: 'Bug', tone: 'brand'},
  {value: ReportTypes.USER, label: 'User', tone: 'danger'},
  {value: ReportTypes.SERVER, label: 'Server', tone: 'warning'},
  {value: ReportTypes.MESSAGE, label: 'Message', tone: 'danger'},
  {value: ReportTypes.TAG, label: 'Tag', tone: 'warning'},
];

// what `target_id` is, by type. Message reports are only for the bot's own responses, they target whoever used the command
export const REPORT_TARGET_LABELS: Record<number, string> = {
  [ReportTypes.USER]: 'user',
  [ReportTypes.SERVER]: 'server',
  [ReportTypes.MESSAGE]: 'command user',
  [ReportTypes.TAG]: 'tag',
};

export function reportStatusInfo(status: number) {
  return REPORT_STATUSES.find((item) => item.value === status) ?? {value: status, label: `Status ${status}`, tone: 'neutral' as ReportTone};
}

export function reportTypeInfo(type: number) {
  return REPORT_TYPES.find((item) => item.value === type) ?? {value: type, label: `Type ${type}`, tone: 'neutral' as ReportTone};
}

// message reports have the reported message here, other reports have where the report command was used
export function reportJumpUrl(report: {channel_id: string | null, guild_id: string | null, message_id: string | null}): string | null {
  return (report.channel_id && report.message_id)
    ? `https://discord.com/channels/${report.guild_id ?? '@me'}/${report.channel_id}/${report.message_id}`
    : null;
}
