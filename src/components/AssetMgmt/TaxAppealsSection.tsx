import { useMemo, useState } from 'react';
import { Plus, Receipt, AlertTriangle, CalendarClock } from 'lucide-react';
import type { PropertyTaxAppeal, PropertyTaxAppealStatus } from '../../types';
import { APPEAL_OPEN_STATUSES, PropertyTaxAppealStatusEnum } from '../../types';

interface TaxAppealsSectionProps {
  appeals: PropertyTaxAppeal[];
  onSelect: (appeal: PropertyTaxAppeal) => void;
  onNew: () => void;
}

type FilterMode = 'open' | 'all' | 'closed';

// Days until hearing date for the badge color. Mirrors
// /property-tax-appeal-watcher's bucketing so the UI feels consistent
// with what the skill reports.
function hearingSeverity(
  hearingDate: string | null
): { label: string; tone: 'critical' | 'warning' | 'ok' | 'past' } | null {
  if (!hearingDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(hearingDate);
  if (!Number.isFinite(target.getTime())) return null;
  const days = Math.floor((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: `${Math.abs(days)}d ago`, tone: 'past' };
  if (days <= 7) return { label: `in ${days}d`, tone: 'critical' };
  if (days <= 30) return { label: `in ${days}d`, tone: 'warning' };
  return { label: `in ${days}d`, tone: 'ok' };
}

function formatCurrency(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function StatusPill({ status }: { status: PropertyTaxAppealStatus }) {
  // Tones map roughly to the deal StatusBadge palette but stay
  // intentionally muted — appeals run in parallel to deal work, not
  // competing with the pipeline tab for attention.
  const tone =
    status === 'Settled' || status === 'Withdrawn' || status === 'Lost'
      ? 'closed'
      : status === 'Hearing Scheduled'
        ? 'urgent'
        : 'open';
  const classes =
    tone === 'closed'
      ? 'bg-fg-subtle/10 text-fg-muted border-fg-subtle/20'
      : tone === 'urgent'
        ? 'bg-warning/10 text-warning border-warning/30'
        : 'bg-accent-tint text-accent border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${classes}`}
    >
      {status}
    </span>
  );
}

export function TaxAppealsSection({
  appeals,
  onSelect,
  onNew,
}: TaxAppealsSectionProps) {
  const [filter, setFilter] = useState<FilterMode>('open');
  const [statusFilter, setStatusFilter] = useState<PropertyTaxAppealStatus | 'all'>('all');

  const filtered = useMemo(() => {
    let list = appeals;
    if (filter === 'open') {
      list = list.filter((a) => (APPEAL_OPEN_STATUSES as readonly PropertyTaxAppealStatus[]).includes(a.status));
    } else if (filter === 'closed') {
      list = list.filter((a) => !(APPEAL_OPEN_STATUSES as readonly PropertyTaxAppealStatus[]).includes(a.status));
    }
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    // Sort: hearings soonest first, then no-hearing rows by tax year desc
    return [...list].sort((a, b) => {
      const ha = a.hearingDate ? new Date(a.hearingDate).getTime() : Infinity;
      const hb = b.hearingDate ? new Date(b.hearingDate).getTime() : Infinity;
      if (ha !== hb) return ha - hb;
      return b.taxYear - a.taxYear;
    });
  }, [appeals, filter, statusFilter]);

  const stats = useMemo(() => {
    const open = appeals.filter((a) =>
      (APPEAL_OPEN_STATUSES as readonly PropertyTaxAppealStatus[]).includes(a.status)
    );
    const upcomingHearings = open.filter((a) => {
      const s = hearingSeverity(a.hearingDate);
      return s && s.tone !== 'past';
    });
    const totalProposedDelta = open.reduce((sum, a) => {
      if (a.assessedValue == null || a.proposedValue == null) return sum;
      return sum + (a.assessedValue - a.proposedValue);
    }, 0);
    return { openCount: open.length, upcomingHearings: upcomingHearings.length, totalProposedDelta };
  }, [appeals]);

  return (
    <section className="rounded-2xl bg-bg-elevated shadow-soft p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
            <Receipt size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg tracking-tight">
              Property Tax Appeals
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              {stats.openCount} open · {stats.upcomingHearings} with upcoming hearings
              {stats.totalProposedDelta > 0 && (
                <> · {formatCurrency(stats.totalProposedDelta)} in proposed assessment reductions</>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
        >
          <Plus size={15} strokeWidth={2} />
          Log appeal
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        {(['open', 'all', 'closed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            {f === 'open' ? 'Open' : f === 'closed' ? 'Closed' : 'All'}
          </button>
        ))}
        <span className="text-fg-subtle mx-1">·</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PropertyTaxAppealStatus | 'all')}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
        >
          <option value="all">Any status</option>
          {PropertyTaxAppealStatusEnum.options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 py-12 text-center border border-dashed border-border rounded-xl">
          <p className="text-sm text-fg-muted">
            {appeals.length === 0
              ? 'No appeals logged yet. Hit "Log appeal" to capture one — or run /property-tax-appeal-intake from Claude Code.'
              : 'No appeals match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="mt-5 -mx-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-fg-subtle border-b border-border">
                <th className="py-2.5 px-6 font-medium">Property</th>
                <th className="py-2.5 px-3 font-medium tabular-nums">Year</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium tabular-nums text-right">Assessed</th>
                <th className="py-2.5 px-3 font-medium tabular-nums text-right">Proposed</th>
                <th className="py-2.5 px-3 font-medium">Hearing</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const sev = hearingSeverity(a.hearingDate);
                return (
                  <tr
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="border-b border-border/60 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-6">
                      <div className="font-medium text-fg">{a.building ?? '—'}</div>
                      {a.jurisdiction && (
                        <div className="text-xs text-fg-muted mt-0.5">{a.jurisdiction}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-fg-muted">{a.taxYear}</td>
                    <td className="py-3 px-3">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="py-3 px-3 tabular-nums text-right text-fg">
                      {formatCurrency(a.assessedValue)}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-right text-fg">
                      {formatCurrency(a.proposedValue)}
                    </td>
                    <td className="py-3 px-3">
                      {!a.hearingDate ? (
                        <span className="text-fg-subtle text-xs">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            sev?.tone === 'critical'
                              ? 'text-danger'
                              : sev?.tone === 'warning'
                                ? 'text-warning'
                                : sev?.tone === 'past'
                                  ? 'text-fg-subtle'
                                  : 'text-fg-muted'
                          }`}
                        >
                          {sev?.tone === 'critical' ? (
                            <AlertTriangle size={12} strokeWidth={1.75} />
                          ) : (
                            <CalendarClock size={12} strokeWidth={1.75} />
                          )}
                          {a.hearingDate} {sev && <span>({sev.label})</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
