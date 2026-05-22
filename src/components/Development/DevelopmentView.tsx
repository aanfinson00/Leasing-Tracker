import { useMemo, useState } from 'react';
import { Plus, HardHat, CalendarClock, AlertTriangle } from 'lucide-react';
import type {
  Contact,
  DevelopmentProject,
  DevPhase,
  DevProjectContact,
  DevProjectNote,
  RiskLevel,
} from '../../types';
import { DEV_PHASE_ORDER, DevPhaseEnum } from '../../types';
import { DevelopmentProjectDrawer } from './DevelopmentProjectDrawer';

interface DevelopmentViewProps {
  projects: DevelopmentProject[];
  onSave: (p: DevelopmentProject) => void;
  onDelete: (id: string) => void;
  // CRM v1
  contacts: Contact[];
  contactLinks: DevProjectContact[];
  notes: DevProjectNote[];
  onSaveContact: (c: Contact) => void;
  onLinkContact: (link: DevProjectContact) => void;
  onUnlinkContact: (linkId: string) => void;
  onSaveNote: (n: DevProjectNote) => void;
  onDeleteNote: (id: string) => void;
}

const SIDE_PHASES: DevPhase[] = ['On Hold', 'Cancelled'];

function newProjectTemplate(): DevelopmentProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectName: '',
    market: null,
    address: null,
    phase: 'Site Selection',
    totalSF: null,
    acres: null,
    buildingCount: null,
    startDate: null,
    expectedDeliveryDate: null,
    actualDeliveryDate: null,
    totalBudget: null,
    spentToDate: null,
    pmName: null,
    gcName: null,
    gcContact: null,
    architect: null,
    riskLevel: 'Medium',
    statusSummary: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

const fmtCurrency = (v: number | null) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(v);
const fmtSF = (v: number | null) =>
  v == null ? '—' : `${new Intl.NumberFormat('en-US').format(Math.round(v))} SF`;

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

function PhasePill({ phase }: { phase: DevPhase }) {
  const isSide = SIDE_PHASES.includes(phase);
  const cls = isSide
    ? 'bg-fg-subtle/10 text-fg-muted border-fg-subtle/20'
    : phase === 'Delivered'
      ? 'bg-success/10 text-success border-success/30'
      : 'bg-accent-tint text-accent border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {phase}
    </span>
  );
}

export function DevelopmentView({
  projects,
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
}: DevelopmentViewProps) {
  const [editing, setEditing] = useState<DevelopmentProject | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<DevPhase | 'all' | 'active'>('active');

  const filtered = useMemo(() => {
    if (phaseFilter === 'all') return projects;
    if (phaseFilter === 'active') {
      return projects.filter((p) => !SIDE_PHASES.includes(p.phase) && p.phase !== 'Delivered');
    }
    return projects.filter((p) => p.phase === phaseFilter);
  }, [projects, phaseFilter]);

  const byPhase = useMemo(() => {
    const m = new Map<DevPhase, DevelopmentProject[]>();
    DevPhaseEnum.options.forEach((p) => m.set(p, []));
    for (const p of filtered) {
      m.get(p.phase)!.push(p);
    }
    return m;
  }, [filtered]);

  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => !SIDE_PHASES.includes(p.phase) && p.phase !== 'Delivered'
    );
    const totalSF = active.reduce((sum, p) => sum + (p.totalSF ?? 0), 0);
    const totalBudget = active.reduce((sum, p) => sum + (p.totalBudget ?? 0), 0);
    const totalSpent = active.reduce((sum, p) => sum + (p.spentToDate ?? 0), 0);
    const upcomingDeliveries = active.filter(
      (p) =>
        p.expectedDeliveryDate &&
        (daysUntil(p.expectedDeliveryDate) ?? Infinity) <= 90 &&
        (daysUntil(p.expectedDeliveryDate) ?? -1) >= 0
    );
    const highRisk = active.filter((p) => p.riskLevel === 'High');
    return {
      activeCount: active.length,
      totalSF,
      totalBudget,
      totalSpent,
      upcomingDeliveries: upcomingDeliveries.length,
      highRiskCount: highRisk.length,
    };
  }, [projects]);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              <HardHat size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Development Pipeline
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {stats.activeCount} active · {fmtSF(stats.totalSF)} · budget{' '}
                {fmtCurrency(stats.totalBudget)} ({fmtCurrency(stats.totalSpent)} spent)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(newProjectTemplate())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
          >
            <Plus size={15} strokeWidth={2} />
            New project
          </button>
        </div>

        {/* Alert strip — flags before the user has to read the board. */}
        {(stats.upcomingDeliveries > 0 || stats.highRiskCount > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.upcomingDeliveries > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/10 text-warning border border-warning/30">
                <CalendarClock size={13} strokeWidth={1.75} />
                {stats.upcomingDeliveries} deliveries in next 90 days
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
            onClick={() => setPhaseFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              phaseFilter === 'active'
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setPhaseFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              phaseFilter === 'all'
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            All
          </button>
          <span className="text-fg-subtle mx-1">·</span>
          <select
            value={phaseFilter === 'active' || phaseFilter === 'all' ? '' : phaseFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setPhaseFilter('active');
              else setPhaseFilter(v as DevPhase);
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
          >
            <option value="">Phase…</option>
            {DevPhaseEnum.options.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            No development projects yet. Click <span className="font-medium text-fg">New project</span>{' '}
            to track one through site selection, entitlement, design, construction, and lease-up.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {DEV_PHASE_ORDER.map((phase) => {
            const rows = byPhase.get(phase) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={phase} className="rounded-2xl bg-bg-elevated shadow-soft overflow-hidden">
                <header className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg/60">
                  <div className="flex items-center gap-2">
                    <PhasePill phase={phase} />
                    <span className="text-xs text-fg-muted">
                      {rows.length} {rows.length === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                </header>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((p) => {
                      const days = daysUntil(p.expectedDeliveryDate);
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
                          key={p.id}
                          onClick={() => setEditing(p)}
                          className="border-b border-border/40 last:border-b-0 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-5">
                            <div className="font-medium text-fg">{p.projectName}</div>
                            {(p.market || p.address) && (
                              <div className="text-xs text-fg-muted mt-0.5">
                                {[p.market, p.address].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {p.statusSummary && (
                              <div className="text-xs text-fg-subtle mt-1 max-w-md truncate">
                                {p.statusSummary}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-right text-fg-muted whitespace-nowrap">
                            {fmtSF(p.totalSF)}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-right text-fg-muted whitespace-nowrap">
                            {fmtCurrency(p.totalBudget)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <RiskBadge level={p.riskLevel} />
                          </td>
                          <td className={`py-3 px-3 text-xs tabular-nums whitespace-nowrap ${dayClass}`}>
                            {p.expectedDeliveryDate ?? '—'}
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

          {/* Side phases (On Hold / Cancelled) — only show if there's anything */}
          {SIDE_PHASES.map((phase) => {
            const rows = byPhase.get(phase) ?? [];
            if (rows.length === 0) return null;
            return (
              <section
                key={phase}
                className="rounded-2xl bg-bg-elevated/60 shadow-soft overflow-hidden opacity-80"
              >
                <header className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <PhasePill phase={phase} />
                  <span className="text-xs text-fg-muted">{rows.length}</span>
                </header>
                <ul className="px-5 py-3 text-sm text-fg-muted space-y-1">
                  {rows.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => setEditing(p)}
                      className="cursor-pointer hover:text-fg"
                    >
                      {p.projectName}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <DevelopmentProjectDrawer
          project={editing}
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
