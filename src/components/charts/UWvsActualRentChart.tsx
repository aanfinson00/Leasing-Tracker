import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RentRollRow } from '../../types';
import { useChartColors } from '../../lib/chartTokens';
import { formatCurrencyShort } from '../../lib/format';
import { ChartCard } from './ChartCard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface UWvsActualRentChartProps {
  rows: RentRollRow[];
}

interface Point {
  label: string;
  tenant: string;
  deal: string;
  market: string;
  uw: number;
  actual: number;
  dollarDelta: number; // $/SF
  pctDelta: number;    // %
  sf: number;
  annualDollarDelta: number; // $ across the space (dollarDelta × SF)
}

type Metric = 'pct' | 'dollar';

export function UWvsActualRentChart({ rows }: UWvsActualRentChartProps) {
  const c = useChartColors();
  const [metric, setMetric] = useState<Metric>('pct');

  const { points, stats } = useMemo(() => {
    const all: Point[] = [];
    rows.forEach((r) => {
      if (!r.occupied) return;
      if (r.lastRevalUWRent == null || r.startingAnnualRentPSF == null) return;
      const uw = r.lastRevalUWRent;
      const actual = r.startingAnnualRentPSF;
      if (uw <= 0) return; // can't compute % from zero baseline
      const dollarDelta = actual - uw;
      const pctDelta = (actual / uw - 1) * 100;
      const sf = r.leasableSF ?? 0;
      const tenant = (r.tenantName ?? '–').trim();
      const deal = (r.dealName ?? '–').trim();
      all.push({
        label: `${tenant} · ${deal}`,
        tenant,
        deal,
        market: r.market ?? 'Unknown',
        uw,
        actual,
        dollarDelta,
        pctDelta,
        sf,
        annualDollarDelta: dollarDelta * sf,
      });
    });

    const sorted = [...all].sort((a, b) =>
      metric === 'pct' ? b.pctDelta - a.pctDelta : b.dollarDelta - a.dollarDelta
    );

    const above = all.filter((p) => p.dollarDelta > 0.005);
    const below = all.filter((p) => p.dollarDelta < -0.005);
    const atPar = all.length - above.length - below.length;
    const totalAnnualDelta = all.reduce((s, p) => s + p.annualDollarDelta, 0);
    const totalSF = all.reduce((s, p) => s + p.sf, 0);
    const weightedPct =
      totalSF > 0
        ? all.reduce((s, p) => s + p.pctDelta * p.sf, 0) / totalSF
        : 0;

    return {
      points: sorted,
      stats: {
        above: above.length,
        below: below.length,
        atPar,
        totalAnnualDelta,
        weightedPct,
      },
    };
  }, [rows, metric]);

  const CustomTooltip = (props: Any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload as Point;
    return (
      <div
        style={{
          backgroundColor: c.bgElevated,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          color: c.fg,
          minWidth: 220,
        }}
      >
        <p className="font-semibold mb-1">{p.tenant}</p>
        <p style={{ color: c.fgMuted, fontSize: 11 }} className="mb-2">
          {p.deal} · {p.market}
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
          <span style={{ color: c.fgMuted }}>UW</span>
          <span className="text-right">${p.uw.toFixed(2)}/SF</span>
          <span style={{ color: c.fgMuted }}>Actual</span>
          <span className="text-right">${p.actual.toFixed(2)}/SF</span>
          <span style={{ color: c.fgMuted }}>$ delta</span>
          <span
            className="text-right font-medium"
            style={{ color: p.dollarDelta >= 0 ? c.success : c.danger }}
          >
            {p.dollarDelta >= 0 ? '+' : ''}${p.dollarDelta.toFixed(2)}/SF
          </span>
          <span style={{ color: c.fgMuted }}>% delta</span>
          <span
            className="text-right font-medium"
            style={{ color: p.pctDelta >= 0 ? c.success : c.danger }}
          >
            {p.pctDelta >= 0 ? '+' : ''}{p.pctDelta.toFixed(1)}%
          </span>
          <span style={{ color: c.fgMuted }}>Annual $ impact</span>
          <span
            className="text-right tabular-nums"
            style={{ color: p.annualDollarDelta >= 0 ? c.success : c.danger }}
          >
            {p.annualDollarDelta >= 0 ? '+' : ''}${Math.round(p.annualDollarDelta).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  // Compute symmetric x-axis around 0 for visual fairness
  const dataValue = (p: Point) => (metric === 'pct' ? p.pctDelta : p.dollarDelta);
  const absMax = points.reduce((m, p) => Math.max(m, Math.abs(dataValue(p))), 0);
  const axisMax = absMax === 0 ? (metric === 'pct' ? 5 : 1) : Math.ceil(absMax * 1.15 * 10) / 10;

  // Truncate long labels so they fit
  const truncate = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  const chartData = points.map((p) => ({
    ...p,
    displayLabel: truncate(`${p.tenant} · ${p.deal}`),
    value: dataValue(p),
  }));

  const height = Math.max(220, points.length * 22 + 40);

  return (
    <ChartCard
      title="UW vs Actual Rent"
      subtitle={metric === 'pct' ? '% delta from underwritten rent per space' : '$ delta per SF from underwritten rent'}
      actions={
        <div className="flex bg-bg-subtle rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMetric('pct')}
            className={`px-2.5 py-1 rounded-md font-medium ${metric === 'pct' ? 'bg-bg-elevated text-fg shadow-soft' : 'text-fg-muted'}`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setMetric('dollar')}
            className={`px-2.5 py-1 rounded-md font-medium ${metric === 'dollar' ? 'bg-bg-elevated text-fg shadow-soft' : 'text-fg-muted'}`}
          >
            $/SF
          </button>
        </div>
      }
    >
      {points.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-fg-subtle text-center px-6">
          No occupied rows have both UW Rent and Starting Rent filled in.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-emerald-800 dark:text-emerald-300">
                <TrendingUp size={12} strokeWidth={2.5} />
                Above UW
              </div>
              <div className="text-2xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                {stats.above}
              </div>
              <div className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70">
                spaces leasing higher
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-stone-100 dark:bg-stone-800/40">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-700 dark:text-stone-300">
                <Minus size={12} strokeWidth={2.5} />
                At Par
              </div>
              <div className="text-2xl font-semibold tabular-nums text-stone-700 dark:text-stone-300">
                {stats.atPar}
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                within ±$0.01/SF
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-rose-800 dark:text-rose-300">
                <TrendingDown size={12} strokeWidth={2.5} />
                Below UW
              </div>
              <div className="text-2xl font-semibold tabular-nums text-rose-800 dark:text-rose-300">
                {stats.below}
              </div>
              <div className="text-[11px] text-rose-800/70 dark:text-rose-300/70">
                spaces leasing lower
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between mb-3 px-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                SF-weighted avg delta
              </p>
              <p
                className="text-lg font-semibold tabular-nums"
                style={{ color: stats.weightedPct >= 0 ? c.success : c.danger }}
              >
                {stats.weightedPct >= 0 ? '+' : ''}{stats.weightedPct.toFixed(2)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                Annual $ impact
              </p>
              <p
                className="text-lg font-semibold tabular-nums"
                style={{ color: stats.totalAnnualDelta >= 0 ? c.success : c.danger }}
              >
                {stats.totalAnnualDelta >= 0 ? '+' : ''}{formatCurrencyShort(stats.totalAnnualDelta)}
              </p>
            </div>
          </div>

          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                barCategoryGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-axisMax, axisMax]}
                  stroke={c.fgSubtle}
                  tick={{ fill: c.fgMuted, fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => (metric === 'pct' ? `${v > 0 ? '+' : ''}${v}%` : `${v > 0 ? '+' : ''}$${v}`)}
                />
                <YAxis
                  type="category"
                  dataKey="displayLabel"
                  stroke={c.fgSubtle}
                  tick={{ fill: c.fgMuted, fontSize: 10 }}
                  tickLine={false}
                  width={180}
                  interval={0}
                />
                <ReferenceLine x={0} stroke={c.fgSubtle} strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: c.bgSubtle }} />
                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                  {chartData.map((p, i) => (
                    <Cell
                      key={i}
                      fill={p.value > 0.005 ? c.success : p.value < -0.005 ? c.danger : c.fgSubtle}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartCard>
  );
}
