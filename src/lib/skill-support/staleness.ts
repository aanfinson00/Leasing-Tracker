// Single source of truth for "stale prospect" rules. Used by:
//   1. .claude/skills/stale-prospect-flagger (watcher skill)
//   2. (future) DealsTable badge rendering
//
// Why isolate this from the skill prompt: the thresholds are the kind
// of thing we'll tune over time, and we want the in-app badge + the
// watcher report to agree. If you change the days, change them here.

import type { DealStatus } from '../../types';

// Days-since-last-activity that flips a deal from 'ok' → 'stale'.
// Tuned for industrial leasing pacing: faster cycles where we're
// waiting on internal/proposal steps, slower where the ball is in
// the prospect's court.
export const STALENESS_DAYS: Record<DealStatus, number | null> = {
  'New Prospect': 7,
  'RFP Requested': 5,
  'Drafting Unsolicited': 10,
  'Proposal Pending Approval': 3,
  'Proposal Sent': 7,
  'LOI Negotiations': 5,
  'Lease Negotiations': 7,
  Executed: null, // post-execution lives on Rent Roll, not Pipeline
  'On Hold': null, // intentionally parked
  Lost: null, // closed
};

// What the watcher tells you to do when a deal trips its threshold.
// Plain-English so the report reads like an actionable to-do list.
export const SUGGESTED_NEXT_ACTION: Record<DealStatus, string> = {
  'New Prospect': 'Send intro email or schedule a tour.',
  'RFP Requested': 'Follow up with broker on RFP timeline.',
  'Drafting Unsolicited': 'Send the unsolicited proposal or close the draft.',
  'Proposal Pending Approval': 'Chase internal approval — this is the most urgent bucket.',
  'Proposal Sent': "Check in with prospect on proposal review.",
  'LOI Negotiations': 'Send revised LOI or schedule a call.',
  'Lease Negotiations': 'Follow up with counsel on red-line status.',
  Executed: '',
  'On Hold': '',
  Lost: '',
};

export type StaleSeverity = 'ok' | 'due' | 'overdue' | 'critical';

// Bucket the deal by how far past threshold it is. 'due' = right at
// threshold, 'overdue' = 1-2x threshold, 'critical' = >2x threshold.
export function classifyStaleness(
  daysSinceActivity: number,
  status: DealStatus,
): StaleSeverity {
  const threshold = STALENESS_DAYS[status];
  if (threshold == null) return 'ok';
  if (daysSinceActivity < threshold) return 'ok';
  if (daysSinceActivity < threshold * 2) return 'due';
  if (daysSinceActivity < threshold * 3) return 'overdue';
  return 'critical';
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}
