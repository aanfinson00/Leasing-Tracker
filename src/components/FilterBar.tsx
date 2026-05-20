import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Deal, DealStage } from '../types';
import { DealStageEnum } from '../types';
import { StageChip } from './StageBadge';

interface FilterBarProps {
  deals: Deal[];
  onFilterChange: (filtered: Deal[]) => void;
}

export function FilterBar({ deals, onFilterChange }: FilterBarProps) {
  const [query, setQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<Set<DealStage>>(new Set());

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const filtered = deals.filter((deal) => {
      const matchesQuery =
        q === '' ||
        deal.propertyName.toLowerCase().includes(q) ||
        deal.tenantName.toLowerCase().includes(q) ||
        deal.address.toLowerCase().includes(q) ||
        deal.city.toLowerCase().includes(q);
      const matchesStage = selectedStages.size === 0 || selectedStages.has(deal.stage);
      return matchesQuery && matchesStage;
    });
    onFilterChange(filtered);
  }, [query, selectedStages, deals, onFilterChange]);

  const toggleStage = (stage: DealStage) => {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  const clearAll = () => {
    setQuery('');
    setSelectedStages(new Set());
  };

  const hasActiveFilters = query !== '' || selectedStages.size > 0;

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
          placeholder="Search by property, tenant, address, or city…"
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
        {DealStageEnum.options.map((stage) => (
          <StageChip
            key={stage}
            stage={stage}
            selected={selectedStages.has(stage)}
            onClick={() => toggleStage(stage)}
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
