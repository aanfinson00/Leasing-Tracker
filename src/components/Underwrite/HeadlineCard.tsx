// Phase 1 single-scenario KPI tiles. A/B compare (with deltas vs.
// reference scenario) is Phase 2 — kept as a structural seam below.
//
// Tile order matches Lease-Calculator's headline layout so users
// trained on that tool see the same reading order: discounted NER,
// undiscounted NER, YoC Yr 1, YoC Term, Total Basis $/SF.

import type { ScenarioResults } from '../../lib/lease-math/types';
import { fmtCurrency, fmtPercent } from '../../lib/lease-math/format';

interface Props {
  name: string;
  results: ScenarioResults;
}

interface MetricDef {
  label: string;
  value: number;
  format: 'currency' | 'percent';
  /** Optional unit shown next to the label. */
  unit?: string;
}

export function HeadlineCard({ name, results }: Props) {
  const metrics: MetricDef[] = [
    { label: 'Discounted NER', unit: '$/SF', value: results.discountedNER, format: 'currency' },
    { label: 'Undiscounted NER', unit: '$/SF', value: results.undiscountedNER, format: 'currency' },
    { label: 'Yield on Cost · Yr 1', value: results.yocYr1, format: 'percent' },
    { label: 'Yield on Cost · Term', value: results.yocTerm, format: 'percent' },
    { label: 'Total Basis', unit: '$/SF', value: results.totalBasisPSF, format: 'currency' },
  ];

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Headline · {name}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-2 divide-x divide-border/0 lg:divide-border/40">
        {metrics.map((m) => (
          <Tile key={m.label} metric={m} />
        ))}
      </div>
    </div>
  );
}

function Tile({ metric }: { metric: MetricDef }) {
  const fmt = metric.format === 'percent' ? fmtPercent : fmtCurrency;
  return (
    <div className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <div className="flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        <span className="truncate">{metric.label}</span>
        {metric.unit && <span className="text-fg-subtle/70">{metric.unit}</span>}
      </div>
      <div className="text-xl font-semibold tabular-nums text-fg">{fmt(metric.value)}</div>
    </div>
  );
}
