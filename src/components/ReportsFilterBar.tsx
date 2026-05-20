import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { RentRollRow } from '../types';
import {
  type ReportFilters,
  hasActiveFilters,
  toggleInSet,
} from '../lib/reportFilters';

interface ReportsFilterBarProps {
  rows: RentRollRow[];
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
}

const Pill = ({
  label,
  selected,
  onClick,
  tone = 'default',
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  tone?: 'default' | 'success' | 'danger';
}) => {
  const selectedCls =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
        : 'bg-accent-soft text-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer select-none whitespace-nowrap',
        selected ? selectedCls : 'bg-bg-elevated text-fg-muted hover:text-fg hover:bg-bg-hover shadow-soft',
      ].join(' ')}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
};

export function ReportsFilterBar({ rows, filters, onChange }: ReportsFilterBarProps) {
  const markets = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.market && s.add(r.market));
    return Array.from(s).sort();
  }, [rows]);

  const deals = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.dealName && s.add(r.dealName));
    return Array.from(s).sort();
  }, [rows]);

  const buildingTypes = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.buildingType && s.add(r.buildingType));
    return Array.from(s).sort();
  }, [rows]);

  const clearAll = () =>
    onChange({
      query: '',
      deals: new Set(),
      markets: new Set(),
      propertyTypes: new Set(),
      buildingTypes: new Set(),
      yearBuckets: new Set(),
      occupancy: 'all',
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.75}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
        />
        <input
          type="text"
          value={filters.query}
          placeholder="Search deal, tenant, space, market…"
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="w-full pl-11 pr-10 py-3 bg-bg-elevated rounded-2xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, query: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-fg-subtle hover:text-fg hover:bg-bg-hover transition-colors"
            aria-label="Clear search"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle mr-1">
          Occupancy
        </span>
        <Pill
          label="All"
          selected={filters.occupancy === 'all'}
          onClick={() => onChange({ ...filters, occupancy: 'all' })}
        />
        <Pill
          label="Occupied"
          selected={filters.occupancy === 'occupied'}
          onClick={() => onChange({ ...filters, occupancy: 'occupied' })}
          tone="success"
        />
        <Pill
          label="Vacant"
          selected={filters.occupancy === 'vacant'}
          onClick={() => onChange({ ...filters, occupancy: 'vacant' })}
          tone="danger"
        />
      </div>

      {markets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle mr-1">
            Market
          </span>
          {markets.map((m) => (
            <Pill
              key={m}
              label={m}
              selected={filters.markets.has(m)}
              onClick={() => onChange({ ...filters, markets: toggleInSet(filters.markets, m) })}
            />
          ))}
        </div>
      )}

      {buildingTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle mr-1">
            Building Type
          </span>
          {buildingTypes.map((t) => (
            <Pill
              key={t}
              label={t}
              selected={filters.buildingTypes.has(t)}
              onClick={() => onChange({ ...filters, buildingTypes: toggleInSet(filters.buildingTypes, t) })}
            />
          ))}
        </div>
      )}

      {deals.length > 0 && deals.length <= 12 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle mr-1">
            Deal
          </span>
          {deals.map((d) => (
            <Pill
              key={d}
              label={d}
              selected={filters.deals.has(d)}
              onClick={() => onChange({ ...filters, deals: toggleInSet(filters.deals, d) })}
            />
          ))}
        </div>
      )}

      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
        >
          <X size={12} strokeWidth={2} />
          Clear filters
        </button>
      )}
    </div>
  );
}
