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

interface UWvsActualTIChartProps {
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
}

export function UWvsActualTIChart({ rows }: UWvsActualTIChartProps) {
  const c = useChartColors();

  const { points, byMarket, stats, axisMax } = useMemo(() => {
    const all: Point[] = [];
    rows.forEach((r) => {
      if (r.uwTiPerSF == null || r.tiPerSF == null) return;
      all.push({
        uw: r.uwTiPerSF,
        actual: r.tiPerSF,
        sf: r.leasableSF ?? 0,
        market: r.market ?? 'Unknown',
        tenant: r.tenantName ?? '–',
        deal: r.dealName ?? '–',
        spread: r.tiPerSF - r.uwTiPerSF,
      });
    });
    const byMarketMap = new Map<string, Point[]>();
    all.forEach((p) => {
      const arr = byMarketMap.get(p.market) ?? [];
      arr.push(p);
      byMarketMap.set(p.market, arr);
    });
    const underBudget = all.filter((p) => p.actual <= p.uw).length;
    const max = all.reduce((m, p) => Math.max(m, p.uw, p.actual), 0);
    return {
      points: all,
      byMarket: Array.from(byMarketMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      stats: { total: all.length, underBudget },
      axisMax: Math.ceil(max * 1.1),
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
          <span style={{ color: c.fgMuted }}>UW TI</span>
          <span className="text-right">${p.uw.toFixed(2)}/SF</span>
          <span style={{ color: c.fgMuted }}>Actual TI</span>
          <span className="text-right">${p.actual.toFixed(2)}/SF</span>
          <span style={{ color: c.fgMuted }}>Spread</span>
          <span
            className="text-right"
            style={{ color: p.spread <= 0 ? c.success : c.danger }}
          >
            {p.spread >= 0 ? '+' : ''}${p.spread.toFixed(2)}/SF
          </span>
        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title="UW vs Actual TI"
      subtitle="Lower-than-UW is good — under budget"
    >
      {points.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center text-center px-6 gap-2">
          <p className="text-sm font-medium text-fg">No data yet</p>
          <p className="text-xs text-fg-subtle max-w-xs">
            Open a rent roll row and set <span className="font-mono">UW TI ($/SF)</span> next to{' '}
            <span className="font-mono">TI ($/SF)</span> — this chart populates as the column fills.
          </p>
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
                  name="UW TI"
                  domain={[0, axisMax]}
                  stroke={c.fgSubtle}
                  tick={{ fill: c.fgMuted, fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  label={{
                    value: 'UW TI ($/SF)',
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
            <span className="font-medium text-fg">{stats.underBudget}</span> of{' '}
            <span className="font-medium text-fg">{stats.total}</span> spaces at or under UW TI.
          </div>
        </>
      )}
    </ChartCard>
  );
}
