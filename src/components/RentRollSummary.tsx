import { Maximize2, CheckCircle2, AlertCircle, PercentCircle, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RentRollRow } from '../types';

interface RentRollSummaryProps {
  rows: RentRollRow[];
}

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: string;
  highlight?: boolean;
  tone?: 'default' | 'success' | 'danger';
}

function Tile({ icon: Icon, label, value, caption, highlight, tone = 'default' }: TileProps) {
  const iconColor =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : highlight
          ? 'text-accent'
          : 'text-fg-subtle';
  return (
    <div className="relative flex flex-col gap-3 p-5 sm:p-6 bg-bg-elevated rounded-2xl shadow-soft overflow-hidden">
      {highlight && <div className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />}
      <div className="flex items-center justify-between text-fg-subtle">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
        <Icon size={16} strokeWidth={1.75} className={iconColor} />
      </div>
      <p className="text-[28px] sm:text-[32px] leading-none tracking-[-0.02em] text-fg font-semibold tabular-nums">
        {value}
      </p>
      {caption && <p className="text-xs text-fg-subtle">{caption}</p>}
    </div>
  );
}

const formatCurrencyShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export function RentRollSummary({ rows }: RentRollSummaryProps) {
  const totalSF = rows.reduce((sum, r) => sum + (r.leasableSF ?? 0), 0);
  const occupiedSF = rows
    .filter((r) => r.occupied)
    .reduce((sum, r) => sum + (r.leasableSF ?? 0), 0);
  const vacantSF = totalSF - occupiedSF;
  const occupancyPct = totalSF > 0 ? Math.round((occupiedSF / totalSF) * 1000) / 10 : 0;

  // Expected vacant rent at UW
  const vacantUWRent = rows
    .filter((r) => !r.occupied)
    .reduce((sum, r) => sum + (r.leasableSF ?? 0) * (r.lastRevalUWRent ?? 0), 0);

  // Total in-place annual rent (occupied)
  const inPlaceAnnual = rows
    .filter((r) => r.occupied)
    .reduce((sum, r) => sum + (r.annualRent ?? 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <Tile
        icon={Maximize2}
        label="Total SF"
        value={totalSF.toLocaleString()}
        caption={`${rows.length} spaces`}
      />
      <Tile
        icon={CheckCircle2}
        label="Occupied SF"
        value={occupiedSF.toLocaleString()}
        tone="success"
      />
      <Tile
        icon={AlertCircle}
        label="Vacant SF"
        value={vacantSF.toLocaleString()}
        tone="danger"
      />
      <Tile
        icon={PercentCircle}
        label="Occupancy"
        value={`${occupancyPct}%`}
        caption={`In-place: ${formatCurrencyShort(inPlaceAnnual)}`}
        highlight
      />
      <Tile
        icon={TrendingUp}
        label="Vacant @ UW"
        value={formatCurrencyShort(vacantUWRent)}
        caption="if leased at UW rent"
      />
    </div>
  );
}
