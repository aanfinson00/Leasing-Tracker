import { Building2, Maximize2, DollarSign, CircleCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Deal } from '../types';

interface SummaryStripProps {
  deals: Deal[];
}

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: string;
  highlight?: boolean;
}

function Tile({ icon: Icon, label, value, caption, highlight }: TileProps) {
  return (
    <div className="relative flex flex-col gap-3 p-5 sm:p-6 bg-bg-elevated rounded-2xl shadow-soft overflow-hidden">
      {highlight && (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />
      )}
      <div className="flex items-center justify-between text-fg-subtle">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
        <Icon size={16} strokeWidth={1.75} className={highlight ? 'text-accent' : 'text-fg-subtle'} />
      </div>
      <p className="text-[28px] sm:text-[32px] leading-none tracking-[-0.02em] text-fg font-semibold tabular-nums">
        {value}
      </p>
      {caption && <p className="text-xs text-fg-subtle">{caption}</p>}
    </div>
  );
}

export function SummaryStrip({ deals }: SummaryStripProps) {
  const totalDeals = deals.length;
  const totalSquareFeet = deals.reduce((sum, d) => sum + (d.squareFeet || 0), 0);
  const totalAnnualRent = deals.reduce(
    (sum, d) => sum + (d.squareFeet || 0) * (d.baseRentPSF || 0),
    0
  );
  const activeLeases = deals.filter((d) => d.stage === 'Active').length;

  const formatCurrency = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Tile icon={Building2} label="Total Deals" value={totalDeals.toLocaleString()} />
      <Tile
        icon={Maximize2}
        label="Total Sq Ft"
        value={totalSquareFeet.toLocaleString()}
        caption="across portfolio"
      />
      <Tile
        icon={DollarSign}
        label="Annual Rent"
        value={formatCurrency(totalAnnualRent)}
        caption={`$${totalAnnualRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      />
      <Tile
        icon={CircleCheck}
        label="Active Leases"
        value={activeLeases.toLocaleString()}
        highlight
      />
    </div>
  );
}
