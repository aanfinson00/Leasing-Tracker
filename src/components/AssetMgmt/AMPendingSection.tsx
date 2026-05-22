import { useMemo, useState } from 'react';
import {
  Plus,
  ListChecks,
  CalendarClock,
  AlertTriangle,
  HardHat,
  Users,
  Building,
  Truck,
} from 'lucide-react';
import type {
  AMPendingItem,
  AMItemType,
  AMStatus,
  Priority,
} from '../../types';
import {
  AMItemTypeEnum,
  AM_OPEN_STATUSES,
} from '../../types';

interface AMPendingSectionProps {
  items: AMPendingItem[];
  onSelect: (item: AMPendingItem) => void;
  onNew: () => void;
}

type FilterMode = 'open' | 'all' | 'done';

const TYPE_ICON: Record<AMItemType, typeof ListChecks> = {
  Deliverable: ListChecks,
  'Construction Followup': HardHat,
  'Tenant Request': Users,
  'Building Monitoring': Building,
  'Capital Vendor': Truck,
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((t - Date.now()) / 86_400_000);
}

function PriorityDot({ priority }: { priority: Priority }) {
  const cls =
    priority === 'High'
      ? 'bg-danger'
      : priority === 'Medium'
        ? 'bg-warning'
        : 'bg-fg-subtle';
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`}
      title={`${priority} priority`}
    />
  );
}

function StatusPill({ status }: { status: AMStatus }) {
  const cls =
    status === 'Done'
      ? 'bg-success/10 text-success border-success/30'
      : status === 'Cancelled'
        ? 'bg-fg-subtle/10 text-fg-muted border-fg-subtle/20'
        : status === 'Waiting'
          ? 'bg-warning/10 text-warning border-warning/30'
          : status === 'In Progress'
            ? 'bg-accent-tint text-accent border-accent/30'
            : 'bg-bg border-border text-fg-muted';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {status}
    </span>
  );
}

export function AMPendingSection({
  items,
  onSelect,
  onNew,
}: AMPendingSectionProps) {
  const [filter, setFilter] = useState<FilterMode>('open');
  const [typeFilter, setTypeFilter] = useState<AMItemType | 'all'>('all');

  const filtered = useMemo(() => {
    let list = items;
    if (filter === 'open') {
      list = list.filter((i) => (AM_OPEN_STATUSES as readonly AMStatus[]).includes(i.status));
    } else if (filter === 'done') {
      list = list.filter((i) => i.status === 'Done');
    }
    if (typeFilter !== 'all') {
      list = list.filter((i) => i.itemType === typeFilter);
    }
    return [...list].sort((a, b) => {
      // Overdue first, then by due date, then high priority first
      const aDays = daysUntil(a.dueDate) ?? Infinity;
      const bDays = daysUntil(b.dueDate) ?? Infinity;
      if (aDays !== bDays) return aDays - bDays;
      const order: Priority[] = ['High', 'Medium', 'Low'];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    });
  }, [items, filter, typeFilter]);

  const grouped = useMemo(() => {
    const m = new Map<AMItemType, AMPendingItem[]>();
    AMItemTypeEnum.options.forEach((t) => m.set(t, []));
    for (const it of filtered) {
      m.get(it.itemType)!.push(it);
    }
    return m;
  }, [filtered]);

  const stats = useMemo(() => {
    const open = items.filter((i) =>
      (AM_OPEN_STATUSES as readonly AMStatus[]).includes(i.status)
    );
    const overdue = open.filter((i) => {
      const d = daysUntil(i.dueDate);
      return d != null && d < 0;
    });
    const dueSoon = open.filter((i) => {
      const d = daysUntil(i.dueDate);
      return d != null && d >= 0 && d <= 7;
    });
    return { openCount: open.length, overdue: overdue.length, dueSoon: dueSoon.length };
  }, [items]);

  return (
    <section className="rounded-2xl bg-bg-elevated shadow-soft p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
            <ListChecks size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg tracking-tight">
              Pending Items
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              {stats.openCount} open · {stats.overdue} overdue · {stats.dueSoon} due this week
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
        >
          <Plus size={15} strokeWidth={2} />
          New item
        </button>
      </div>

      {(stats.overdue > 0 || stats.dueSoon > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/10 text-danger border border-danger/30">
              <AlertTriangle size={13} strokeWidth={1.75} />
              {stats.overdue} overdue
            </span>
          )}
          {stats.dueSoon > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/10 text-warning border border-warning/30">
              <CalendarClock size={13} strokeWidth={1.75} />
              {stats.dueSoon} due this week
            </span>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        {(['open', 'all', 'done'] as const).map((f) => (
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
            {f === 'open' ? 'Open' : f === 'done' ? 'Done' : 'All'}
          </button>
        ))}
        <span className="text-fg-subtle mx-1">·</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AMItemType | 'all')}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
        >
          <option value="all">All types</option>
          {AMItemTypeEnum.options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 py-12 text-center border border-dashed border-border rounded-xl">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            {items.length === 0
              ? 'No pending items yet. Click "New item" to start tracking deliverables, follow-ups, tenant asks, building monitoring, or capital/vendor work.'
              : 'No items match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {AMItemTypeEnum.options.map((type) => {
            const rows = grouped.get(type) ?? [];
            if (rows.length === 0) return null;
            const Icon = TYPE_ICON[type] ?? ListChecks;
            return (
              <div key={type} className="rounded-xl bg-bg shadow-soft overflow-hidden">
                <header className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <Icon size={14} strokeWidth={1.75} className="text-accent" />
                  <span className="text-sm font-medium text-fg">{type}</span>
                  <span className="text-xs text-fg-muted">· {rows.length}</span>
                </header>
                <ul>
                  {rows.map((i) => {
                    const days = daysUntil(i.dueDate);
                    const dayClass =
                      days == null
                        ? 'text-fg-subtle'
                        : days < 0
                          ? 'text-danger'
                          : days <= 7
                            ? 'text-warning'
                            : 'text-fg-muted';
                    return (
                      <li
                        key={i.id}
                        onClick={() => onSelect(i)}
                        className="border-b border-border/40 last:border-b-0 px-4 py-3 hover:bg-bg-hover/60 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <div className="pt-1.5">
                          <PriorityDot priority={i.priority} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-fg">{i.title}</span>
                            <StatusPill status={i.status} />
                            {i.buildingName && (
                              <span className="text-xs text-fg-subtle">{i.buildingName}</span>
                            )}
                          </div>
                          {i.description && (
                            <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">
                              {i.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-fg-subtle mt-1 flex-wrap">
                            {i.owner && <span>Owner: {i.owner}</span>}
                            {i.source && <span>Source: {i.source}</span>}
                          </div>
                        </div>
                        <div className={`text-xs tabular-nums whitespace-nowrap pt-0.5 ${dayClass}`}>
                          {!i.dueDate ? (
                            '—'
                          ) : (
                            <>
                              {i.dueDate}
                              {days != null && (
                                <span className="ml-1 text-fg-subtle">
                                  ({days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
