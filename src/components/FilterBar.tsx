import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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

  return (
    <div className="bg-bg-elevated rounded-lg border border-border p-4 space-y-3 shadow-card">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
        />
        <input
          type="text"
          value={query}
          placeholder="Search property, tenant, address…"
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-md text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DealStageEnum.options.map((stage) => (
          <StageChip
            key={stage}
            stage={stage}
            selected={selectedStages.has(stage)}
            onClick={() => toggleStage(stage)}
          />
        ))}
      </div>
    </div>
  );
}
