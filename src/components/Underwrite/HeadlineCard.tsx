// A/B-aware headline metrics — 5 KPI tiles showing B's value as the
// headline, the delta (B - A) inline with color, and A's value as a
// sub-line. Direct port of Lease-Calculator's HeadlineCard with
// Leasing-Tracker color tokens swapped in.

import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ScenarioResults } from '../../lib/lease-math/types';
import {
  fmtCurrency,
  fmtPercent,
  fmtSignedCurrency,
  fmtSignedPercent,
} from '../../lib/lease-math/format';

interface Props {
  aName: string;
  aResults: ScenarioResults;
  bName: string;
  bResults: ScenarioResults;
}

type Format = 'currency' | 'percent';

interface MetricDef {
  label: string;
  unit?: string;
  a: number;
  b: number;
  format: Format;
  /** Direction that's "better for the landlord" — drives delta color. */
  betterIs: 'higher' | 'lower';
}

export function HeadlineCard({ aName, aResults, bName, bResults }: Props) {
  const metrics: MetricDef[] = [
    {
      label: 'Discounted NER',
      unit: '$/SF',
      a: aResults.discountedNER,
      b: bResults.discountedNER,
      format: 'currency',
      betterIs: 'higher',
    },
    {
      label: 'Undiscounted NER',
      unit: '$/SF',
      a: aResults.undiscountedNER,
      b: bResults.undiscountedNER,
      format: 'currency',
      betterIs: 'higher',
    },
    {
      label: 'Yield on Cost · Yr 1',
      a: aResults.yocYr1,
      b: bResults.yocYr1,
      format: 'percent',
      betterIs: 'higher',
    },
    {
      label: 'Yield on Cost · Term',
      a: aResults.yocTerm,
      b: bResults.yocTerm,
      format: 'percent',
      betterIs: 'higher',
    },
    {
      label: 'Total Basis',
      unit: '$/SF',
      a: aResults.totalBasisPSF,
      b: bResults.totalBasisPSF,
      format: 'currency',
      betterIs: 'lower',
    },
  ];

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Headline · {bName} vs {aName}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-2 divide-x divide-border/0 lg:divide-border/40">
        {metrics.map((m) => (
          <Tile key={m.label} metric={m} aName={aName} bName={bName} />
        ))}
      </div>
    </div>
  );
}

interface TileProps {
  metric: MetricDef;
  aName: string;
  bName: string;
}

function Tile({ metric, aName, bName }: TileProps) {
  const fmt = metric.format === 'percent' ? fmtPercent : fmtCurrency;
  const fmtSigned = metric.format === 'percent' ? fmtSignedPercent : fmtSignedCurrency;
  const delta = metric.b - metric.a;
  const isBetter =
    delta !== 0 &&
    ((metric.betterIs === 'higher' && delta > 0) ||
      (metric.betterIs === 'lower' && delta < 0));
  const isWorse = delta !== 0 && !isBetter;
  const DirectionIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : null;

  return (
    <div className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <div className="flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        <span className="truncate">{metric.label}</span>
        {metric.unit && <span className="text-fg-subtle/70">{metric.unit}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums text-fg">{fmt(metric.b)}</span>
        <span
          className={[
            'inline-flex items-center gap-0.5 text-xs tabular-nums',
            isBetter ? 'text-success' : isWorse ? 'text-danger' : 'text-fg-muted',
          ].join(' ')}
          title={`${bName} − ${aName}`}
        >
          {DirectionIcon && <DirectionIcon size={11} strokeWidth={2.25} aria-hidden />}
          {fmtSigned(delta)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums text-fg-muted">
        <span className="truncate" title={aName}>{aName}</span>
        <span>{fmt(metric.a)}</span>
      </div>
    </div>
  );
}
