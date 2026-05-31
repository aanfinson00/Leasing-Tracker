// ───────────────────────────────────────────────────────────────────
// Relative time formatting — "2 days ago" / "in 3 hours" / "just now".
//
// Used in drawer headers + table columns to flag staleness without
// dragging in a date-fns dependency. Stable across timezones because
// we always work in millis-since-epoch.
// ───────────────────────────────────────────────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Returns a compact relative-time string for an ISO timestamp.
 *   "just now" — less than 60 seconds
 *   "5m ago" / "in 5m"
 *   "3h ago" / "in 3h"
 *   "2d ago" / "in 2d"
 *   "3w ago"
 *   "5mo ago"
 *   "2y ago"
 * Returns '' when iso is null/empty/invalid.
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = now.getTime() - t;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? ' ago' : '';
  const prefix = diff < 0 ? 'in ' : '';

  if (abs < MINUTE) return 'just now';
  if (abs < HOUR) return `${prefix}${Math.round(abs / MINUTE)}m${suffix}`;
  if (abs < DAY) return `${prefix}${Math.round(abs / HOUR)}h${suffix}`;
  if (abs < WEEK) return `${prefix}${Math.round(abs / DAY)}d${suffix}`;
  if (abs < MONTH) return `${prefix}${Math.round(abs / WEEK)}w${suffix}`;
  if (abs < YEAR) return `${prefix}${Math.round(abs / MONTH)}mo${suffix}`;
  return `${prefix}${Math.round(abs / YEAR)}y${suffix}`;
}

/**
 * Threshold-based "is this stale?" predicate. Defaults to 30 days.
 * Useful for color-coding rows / chips.
 */
export function isStale(iso: string | null | undefined, daysThreshold = 30): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > daysThreshold * DAY;
}
