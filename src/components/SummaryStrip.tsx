import { Building2, Maximize2, DollarSign, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Deal } from '../types';

interface SummaryStripProps {
  deals: Deal[];
}

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: 'default' | 'success';
}

function Tile({ icon: Icon, label, value, accent = 'default' }: TileProps) {
  const iconColor = accent === 'success' ? 'text-success' : 'text-fg-muted';
  return (
    <div className="flex flex-col gap-2 p-4 bg-bg-elevated rounded-lg border border-border">
      <div className="flex items-center gap-2 text-fg-muted">
        <Icon size={14} strokeWidth={2} className={iconColor} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-fg tracking-tight tabular-nums">{value}</p>
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile icon={Building2} label="Total Deals" value={totalDeals.toLocaleString()} />
      <Tile icon={Maximize2} label="Total Square Feet" value={totalSquareFeet.toLocaleString()} />
      <Tile
        icon={DollarSign}
        label="Total Annual Rent"
        value={`$${totalAnnualRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      />
      <Tile
        icon={CheckCircle2}
        label="Active Leases"
        value={activeLeases.toLocaleString()}
        accent="success"
      />
    </div>
  );
}
