import { ChevronDown } from 'lucide-react';
import type { Deal } from '../../types';

interface Props {
  deals: Deal[];
  selectedId: string | null;
  onSelect: (deal: Deal | null) => void;
}

export function DealPicker({ deals, selectedId, onSelect }: Props) {
  // Filter to in-flight deals: drop Lost (still-open prospects + executed
  // deals are worth underwriting; lost deals are dead and clutter the list).
  const eligible = deals.filter((d) => d.status !== 'Lost');

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle shrink-0">
        Deal
      </span>
      <div className="relative">
        <select
          value={selectedId ?? ''}
          onChange={(e) => {
            const id = e.target.value;
            onSelect(id === '' ? null : eligible.find((d) => d.id === id) ?? null);
          }}
          className="appearance-none pl-3 pr-9 py-2 bg-bg-elevated rounded-xl text-sm font-medium text-fg shadow-soft border border-border focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[260px]"
        >
          <option value="">— Pick a deal —</option>
          {eligible.map((d) => (
            <option key={d.id} value={d.id}>
              {d.dealName}
              {d.prospectTenant ? ` · ${d.prospectTenant}` : ''}
              {d.status ? ` · ${d.status}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-fg-subtle"
        />
      </div>
    </div>
  );
}
