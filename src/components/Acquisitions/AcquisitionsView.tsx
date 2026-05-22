import { useMemo, useState } from 'react';
import { Plus, Crosshair, CalendarClock, AlertTriangle } from 'lucide-react';
import type {
  AcquisitionStatus,
  AcquisitionTarget,
  AcquisitionTargetContact,
  AcquisitionTargetNote,
  Contact,
  RiskLevel,
} from '../../types';
import { ACQ_PIPELINE_ORDER, AcquisitionStatusEnum } from '../../types';
import { AcquisitionTargetDrawer } from './AcquisitionTargetDrawer';

interface AcquisitionsViewProps {
  targets: AcquisitionTarget[];
  onSave: (a: AcquisitionTarget) => void;
  onDelete: (id: string) => void;
  // CRM
  contacts: Contact[];
  contactLinks: AcquisitionTargetContact[];
  notes: AcquisitionTargetNote[];
  onSaveContact: (c: Contact) => void;
  onLinkContact: (link: AcquisitionTargetContact) => void;
  onUnlinkContact: (linkId: string) => void;
  onSaveNote: (n: AcquisitionTargetNote) => void;
  onDeleteNote: (id: string) => void;
}

const SIDE_STATUSES: AcquisitionStatus[] = ['On Hold', 'Lost'];

function newTargetTemplate(): AcquisitionTarget {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    targetName: '',
    market: null,
    address: null,
    propertyType: null,
    status: 'Sourcing',
    acres: null,
    buildingCount: null,
    totalSF: null,
    askingPrice: null,
    ourOffer: null,
    earnestMoney: null,
    closingCostsEstimate: null,
    rehabBudget: null,
    underwrittenIRR: null,
    underwrittenEquityMultiple: null,
    firstContactedDate: now.slice(0, 10),
    loiDate: null,
    psaDate: null,
    expectedClosingDate: null,
    actualClosingDate: null,
    diligenceStatus: {},
    riskLevel: 'Medium',
    statusSummary: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

const fmtMoney = (v: number | null) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(v);

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((t - Date.now()) / 86_400_000);
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const cls =
    level === 'High'
      ? 'bg-danger/10 text-danger border-danger/30'
      : level === 'Medium'
        ? 'bg-warning/10 text-warning border-warning/30'
        : 'bg-success/10 text-success border-success/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {level}
    </span>
  );
}

function StatusPill({ status }: { status: AcquisitionStatus }) {
  const isSide = SIDE_STATUSES.includes(status);
  const cls = isSide
    ? 'bg-fg-subtle/10 text-fg-muted border-fg-subtle/20'
    : status === 'Closed'
      ? 'bg-success/10 text-success border-success/30'
      : 'bg-accent-tint text-accent border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {status}
    </span>
  );
}

export function AcquisitionsView({
  targets,
  onSave,
  onDelete,
  contacts,
  contactLinks,
  notes,
  onSaveContact,
  onLinkContact,
  onUnlinkContact,
  onSaveNote,
  onDeleteNote,
}: AcquisitionsViewProps) {
  const [editing, setEditing] = useState<AcquisitionTarget | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    AcquisitionStatus | 'all' | 'active'
  >('active');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return targets;
    if (statusFilter === 'active') {
      return targets.filter(
        (t) => !SIDE_STATUSES.includes(t.status) && t.status !== 'Closed'
      );
    }
    return targets.filter((t) => t.status === statusFilter);
  }, [targets, statusFilter]);

  const byStatus = useMemo(() => {
    const m = new Map<AcquisitionStatus, AcquisitionTarget[]>();
    AcquisitionStatusEnum.options.forEach((s) => m.set(s, []));
    for (const t of filtered) m.get(t.status)!.push(t);
    return m;
  }, [filtered]);

  const stats = useMemo(() => {
    const active = targets.filter(
      (t) => !SIDE_STATUSES.includes(t.status) && t.status !== 'Closed'
    );
    const totalAsking = active.reduce((sum, t) => sum + (t.askingPrice ?? 0), 0);
    const totalOffered = active.reduce((sum, t) => sum + (t.ourOffer ?? 0), 0);
    const closingSoon = active.filter((t) => {
      const d = daysUntil(t.expectedClosingDate);
      return d != null && d <= 60 && d >= 0;
    });
    const highRisk = active.filter((t) => t.riskLevel === 'High');
    return {
      activeCount: active.length,
      totalAsking,
      totalOffered,
      closingSoonCount: closingSoon.length,
      highRiskCount: highRisk.length,
    };
  }, [targets]);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              <Crosshair size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Acquisitions Pipeline
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {stats.activeCount} active · {fmtMoney(stats.totalAsking)} asking ·
                {' '}
                {fmtMoney(stats.totalOffered)} offered
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(newTargetTemplate())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
          >
            <Plus size={15} strokeWidth={2} />
            New target
          </button>
        </div>

        {(stats.closingSoonCount > 0 || stats.highRiskCount > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.closingSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/10 text-warning border border-warning/30">
                <CalendarClock size={13} strokeWidth={1.75} />
                {stats.closingSoonCount} closing in next 60 days
              </span>
            )}
            {stats.highRiskCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/10 text-danger border border-danger/30">
                <AlertTriangle size={13} strokeWidth={1.75} />
                {stats.highRiskCount} high-risk
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            All
          </button>
          <span className="text-fg-subtle mx-1">·</span>
          <select
            value={statusFilter === 'active' || statusFilter === 'all' ? '' : statusFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setStatusFilter('active');
              else setStatusFilter(v as AcquisitionStatus);
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
          >
            <option value="">Status…</option>
            {AcquisitionStatusEnum.options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      {targets.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            No acquisition targets yet. Click <span className="font-medium text-fg">New target</span>{' '}
            to track an opportunity from Sourcing through Closing.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ACQ_PIPELINE_ORDER.map((status) => {
            const rows = byStatus.get(status) ?? [];
            if (rows.length === 0) return null;
            return (
              <section
                key={status}
                className="rounded-2xl bg-bg-elevated shadow-soft overflow-hidden"
              >
                <header className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg/60">
                  <div className="flex items-center gap-2">
                    <StatusPill status={status} />
                    <span className="text-xs text-fg-muted">
                      {rows.length} {rows.length === 1 ? 'target' : 'targets'}
                    </span>
                  </div>
                </header>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((t) => {
                      const days = daysUntil(t.expectedClosingDate);
                      const dayClass =
                        days == null
                          ? 'text-fg-subtle'
                          : days < 0
                            ? 'text-danger'
                            : days <= 30
                              ? 'text-warning'
                              : 'text-fg-muted';
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setEditing(t)}
                          className="border-b border-border/40 last:border-b-0 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-5">
                            <div className="font-medium text-fg">{t.targetName}</div>
                            {(t.market || t.address) && (
                              <div className="text-xs text-fg-muted mt-0.5">
                                {[t.market, t.address].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {t.statusSummary && (
                              <div className="text-xs text-fg-subtle mt-1 max-w-md truncate">
                                {t.statusSummary}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-right text-fg-muted whitespace-nowrap">
                            {fmtMoney(t.ourOffer ?? t.askingPrice)}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-right text-fg-muted whitespace-nowrap">
                            {t.acres != null ? `${t.acres.toFixed(1)} ac` : '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <RiskBadge level={t.riskLevel} />
                          </td>
                          <td className={`py-3 px-3 text-xs tabular-nums whitespace-nowrap ${dayClass}`}>
                            {t.expectedClosingDate ?? '—'}
                            {days != null && (
                              <span className="ml-1 text-fg-subtle">
                                ({days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}

          {SIDE_STATUSES.map((status) => {
            const rows = byStatus.get(status) ?? [];
            if (rows.length === 0) return null;
            return (
              <section
                key={status}
                className="rounded-2xl bg-bg-elevated/60 shadow-soft overflow-hidden opacity-80"
              >
                <header className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <StatusPill status={status} />
                  <span className="text-xs text-fg-muted">{rows.length}</span>
                </header>
                <ul className="px-5 py-3 text-sm text-fg-muted space-y-1">
                  {rows.map((t) => (
                    <li
                      key={t.id}
                      onClick={() => setEditing(t)}
                      className="cursor-pointer hover:text-fg"
                    >
                      {t.targetName}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <AcquisitionTargetDrawer
          target={editing}
          onClose={() => setEditing(null)}
          onSave={onSave}
          onDelete={onDelete}
          allContacts={contacts}
          contactLinks={contactLinks}
          notes={notes}
          onSaveContact={onSaveContact}
          onLinkContact={onLinkContact}
          onUnlinkContact={onUnlinkContact}
          onSaveNote={onSaveNote}
          onDeleteNote={onDeleteNote}
        />
      )}
    </div>
  );
}
