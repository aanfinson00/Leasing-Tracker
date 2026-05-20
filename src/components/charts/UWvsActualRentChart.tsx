import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
import type { RentRollRow } from '../../types';
import { useChartColors, colorFor } from '../../lib/chartTokens';
import { ChartCard } from './ChartCard';

interface UWvsActualRentChartProps {
  rows: RentRollRow[];
}

interface Point {
  uw: number;
  actual: number;
  sf: number;
  market: string;
  tenant: string;
  deal: string;
  spread: number;
  pctOfUw: number;
}

export function UWvsActualRentChart({ rows }: UWvsActualRentChartProps) {
  const c = useChartColors();

  const { points, byMarket, stats, axisMax } = useMemo(() => {
    const all: Point[] = [];
    rows.forEach((r) => {
      if (!r.occupied) return;
      if (r.lastRevalUWRent == null || r.startingAnnualRentPSF == null) return;
      const uw = r.lastRevalUWRent;
      const actual = r.startingAnnualRentPSF;
      const pctOfUw = uw > 0 ? (actual / uw) * 100 : 0;
      all.push({
        uw,
        actual,
        sf: r.leasableSF ?? 0,
        market: r.market ?? 'Unknown',
        tenant: r.tenantName ?? '–',
        deal: r.dealName ?? '–',
        spread: actual - uw,
        pctOfUw,
      });
    });

    const byMarketMap = new Map<string, Point[]>();
    all.forEach((p) => {
      const arr = byMarketMap.get(p.market) ?? [];
      arr.push(p);
      byMarketMap.set(p.market, arr);
    });
    const above = all.filter((p) => p.actual >= p.uw);
    const totalSf = all.reduce((s, p) => s + p.sf, 0);
    const aboveSf = above.reduce((s, p) => s + p.sf, 0);
    const aboveSfPct = totalSf > 0 ? (aboveSf / totalSf) * 100 : 0;
    const max = all.reduce((m, p) => Math.max(m, p.uw, p.actual), 0);
    return {
      points: all,
      byMarket: Array.from(byMarketMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      stats: {
        total: all.length,
        above: above.length,
        aboveSfPct,
      },
      axisMax: Math.ceil(max * 1.05),
    };
  }, [rows]);

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
          minWidth: 200,
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
          <span style={{ color: c.fgMuted }}>Spread</span>
          <span
            className="text-right"
            style={{ color: p.spread >= 0 ? c.success : c.danger }}
          >
            {p.spread >= 0 ? '+' : ''}${p.spread.toFixed(2)}/SF
          </span>
          <span style={{ color: c.fgMuted }}>% of UW</span>
          <span className="text-right">{p.pctOfUw.toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title="UW vs Actual Rent"
      subtitle="Each point is an occupied space"
    >
      {points.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-fg-subtle text-center px-6">
          No occupied rows have both UW Rent and Starting Rent filled in.
        </div>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                <XAxis
                  type="number"
                  dataKey="uw"
                  name="UW Rent"
                  domain={[0, axisMax]}
                  stroke={c.fgSubtle}
                  tick={{ fill: c.fgMuted, fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  label={{
                    value: 'UW Rent ($/SF)',
                    position: 'insideBottom',
                    offset: -2,
                    fill: c.fgMuted,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="actual"
                  name="Actual"
                  domain={[0, axisMax]}
                  stroke={c.fgSubtle}
                  tick={{ fill: c.fgMuted, fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  label={{
                    value: 'Actual ($/SF)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: c.fgMuted,
                    fontSize: 11,
                  }}
                />
                <ZAxis type="number" dataKey="sf" range={[40, 400]} />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: axisMax, y: axisMax },
                  ]}
                  stroke={c.fgSubtle}
                  strokeDasharray="4 4"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                {byMarket.map(([market, pts]) => (
                  <Scatter
                    key={market}
                    name={market}
                    data={pts}
                    fill={colorFor(market, c.palette)}
                    fillOpacity={0.7}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-border text-xs text-fg-muted">
            <span className="font-medium text-fg">{stats.above}</span> of{' '}
            <span className="font-medium text-fg">{stats.total}</span> spaces leasing at or above UW
            ({stats.aboveSfPct.toFixed(0)}% of occupied SF).
          </div>
        </>
      )}
    </ChartCard>
  );
}
