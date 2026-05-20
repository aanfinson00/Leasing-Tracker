import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { RentRollRow } from '../types';

type OccupiedFilter = 'all' | 'occupied' | 'vacant';

interface RentRollFilterBarProps {
  rows: RentRollRow[];
  onFilterChange: (filtered: RentRollRow[]) => void;
}

const FilterPill = ({
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
  const selectedClasses =
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
        'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer select-none whitespace-nowrap',
        selected ? selectedClasses : 'bg-bg-elevated text-fg-muted hover:text-fg hover:bg-bg-hover shadow-soft',
      ].join(' ')}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
};

export function RentRollFilterBar({ rows, onFilterChange }: RentRollFilterBarProps) {
  const [query, setQuery] = useState('');
  const [occupied, setOccupied] = useState<OccupiedFilter>('all');
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const markets = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.market && set.add(r.market));
    return Array.from(set).sort();
  }, [rows]);

  const buildingTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.buildingType && set.add(r.buildingType));
    return Array.from(set).sort();
  }, [rows]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      const matchesQuery =
        q === '' ||
        (r.dealName ?? '').toLowerCase().includes(q) ||
        (r.tenantName ?? '').toLowerCase().includes(q) ||
        (r.spaceId ?? '').toLowerCase().includes(q) ||
        (r.market ?? '').toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q);
      const matchesOccupied =
        occupied === 'all' || (occupied === 'occupied' ? r.occupied : !r.occupied);
      const matchesMarket =
        selectedMarkets.size === 0 || (r.market !== null && selectedMarkets.has(r.market));
      const matchesType =
        selectedTypes.size === 0 || (r.buildingType !== null && selectedTypes.has(r.buildingType));
      return matchesQuery && matchesOccupied && matchesMarket && matchesType;
    });
    onFilterChange(filtered);
  }, [query, occupied, selectedMarkets, selectedTypes, rows, onFilterChange]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const clearAll = () => {
    setQuery('');
    setOccupied('all');
    setSelectedMarkets(new Set());
    setSelectedTypes(new Set());
  };

  const hasActiveFilters =
    query !== '' ||
    occupied !== 'all' ||
    selectedMarkets.size > 0 ||
    selectedTypes.size > 0;

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
          value={query}
          placeholder="Search deal, tenant, space, market, notes…"
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-bg-elevated rounded-2xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
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
        <FilterPill label="All" selected={occupied === 'all'} onClick={() => setOccupied('all')} />
        <FilterPill
          label="Occupied"
          selected={occupied === 'occupied'}
          onClick={() => setOccupied('occupied')}
          tone="success"
        />
        <FilterPill
          label="Vacant"
          selected={occupied === 'vacant'}
          onClick={() => setOccupied('vacant')}
          tone="danger"
        />
      </div>

      {markets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle mr-1">
            Market
          </span>
          {markets.map((m) => (
            <FilterPill
              key={m}
              label={m}
              selected={selectedMarkets.has(m)}
              onClick={() => toggle(selectedMarkets, setSelectedMarkets, m)}
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
            <FilterPill
              key={t}
              label={t}
              selected={selectedTypes.has(t)}
              onClick={() => toggle(selectedTypes, setSelectedTypes, t)}
            />
          ))}
        </div>
      )}

      {hasActiveFilters && (
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
