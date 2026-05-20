import { Briefcase, Maximize2, DollarSign, TrendingUp } from 'lucide-react';
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
    <div className="relative flex flex-col gap-2 p-5 sm:p-6 bg-bg-elevated rounded-2xl shadow-soft min-w-0">
      <div className="flex items-center justify-between text-fg-subtle">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
        <Icon size={16} strokeWidth={1.75} className={highlight ? 'text-accent' : 'text-fg-subtle'} />
      </div>
      <p className={`text-[28px] sm:text-[32px] leading-none tracking-[-0.02em] font-semibold tabular-nums truncate ${highlight ? 'text-accent' : 'text-fg'}`}>
        {value}
      </p>
      {caption && <p className="text-xs text-fg-subtle truncate">{caption}</p>}
    </div>
  );
}

const formatCurrencyShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export function SummaryStrip({ deals }: SummaryStripProps) {
  const totalDeals = deals.length;
  const totalMaxSF = deals.reduce((sum, d) => sum + (d.maxSF ?? 0), 0);
  const grossRent = deals.reduce(
    (sum, d) => sum + (d.maxSF ?? 0) * (d.targetRent ?? 0),
    0
  );
  const weightedRent = deals.reduce((sum, d) => {
    const sf = d.maxSF ?? 0;
    const rent = d.targetRent ?? 0;
    const prob = (d.probabilityPct ?? 0) / 100;
    return sum + sf * rent * prob;
  }, 0);

  // Status breakdown for the Deals tile caption (top 2 statuses by count, abbreviated)
  const statusCounts = deals.reduce(
    (acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );
  const topStatuses = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([s, n]) => `${n} ${s}`)
    .join(' · ');

  // Buildings touched by the pipeline (distinct count) for the SF tile caption
  const distinctBuildings = new Set(
    deals.map((d) => d.building).filter((b): b is string => !!b)
  ).size;

  // Probability-weighted as % of gross (a useful conversion signal)
  const weightedPct = grossRent > 0 ? Math.round((weightedRent / grossRent) * 100) : 0;

  // Weighted average target rent
  const totalWeightedSF = deals.reduce((s, d) => s + (d.maxSF ?? 0), 0);
  const weightedAvgRent =
    totalWeightedSF > 0
      ? deals.reduce((s, d) => s + (d.maxSF ?? 0) * (d.targetRent ?? 0), 0) / totalWeightedSF
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Tile
        icon={Briefcase}
        label="Pipeline Deals"
        value={totalDeals.toLocaleString()}
        caption={topStatuses || 'across the pipeline'}
      />
      <Tile
        icon={Maximize2}
        label="Pipeline SF"
        value={totalMaxSF.toLocaleString()}
        caption={distinctBuildings > 0 ? `${distinctBuildings} building${distinctBuildings === 1 ? '' : 's'}` : 'max if range'}
      />
      <Tile
        icon={DollarSign}
        label="Gross at Target"
        value={formatCurrencyShort(grossRent)}
        caption={weightedAvgRent > 0 ? `avg $${weightedAvgRent.toFixed(2)}/SF` : undefined}
      />
      <Tile
        icon={TrendingUp}
        label="Prob-Weighted"
        value={formatCurrencyShort(weightedRent)}
        caption={`${weightedPct}% of gross target`}
        highlight
      />
    </div>
  );
}
