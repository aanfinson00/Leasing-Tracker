import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Deal, DealStatus } from '../types';
import { StatusChip, STATUSES } from './StatusBadge';

interface FilterBarProps {
  deals: Deal[];
  onFilterChange: (filtered: Deal[]) => void;
}

export function FilterBar({ deals, onFilterChange }: FilterBarProps) {
  const [query, setQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<DealStatus>>(new Set());

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const filtered = deals.filter((deal) => {
      const matchesQuery =
        q === '' ||
        deal.dealName.toLowerCase().includes(q) ||
        (deal.prospectTenant ?? '').toLowerCase().includes(q) ||
        (deal.brokerRep ?? '').toLowerCase().includes(q) ||
        (deal.building ?? '').toLowerCase().includes(q) ||
        (deal.spaceId ?? '').toLowerCase().includes(q) ||
        (deal.notes ?? '').toLowerCase().includes(q);
      const matchesStatus = selectedStatuses.size === 0 || selectedStatuses.has(deal.status);
      return matchesQuery && matchesStatus;
    });
    onFilterChange(filtered);
  }, [query, selectedStatuses, deals, onFilterChange]);

  const toggleStatus = (status: DealStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const clearAll = () => {
    setQuery('');
    setSelectedStatuses(new Set());
  };

  const hasActiveFilters = query !== '' || selectedStatuses.size > 0;

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
          placeholder="Search deal, tenant, broker, building, notes…"
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
        {STATUSES.map((status) => (
          <StatusChip
            key={status}
            status={status}
            selected={selectedStatuses.has(status)}
            onClick={() => toggleStatus(status)}
          />
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
          >
            <X size={12} strokeWidth={2} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
