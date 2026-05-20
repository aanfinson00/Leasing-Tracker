import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
import type { RentRollRow } from '../../types';
import { useChartColors } from '../../lib/chartTokens';
import { formatNumber } from '../../lib/format';
import { ChartCard } from './ChartCard';

interface OccupancyByDealChartProps {
  rows: RentRollRow[];
  onDealClick: (deal: string) => void;
}

interface DealAgg {
  deal: string;
  occupied: number;
  vacant: number;
  total: number;
  occupancyPct: number;
}

export function OccupancyByDealChart({ rows, onDealClick }: OccupancyByDealChartProps) {
  const c = useChartColors();

  const data = useMemo<DealAgg[]>(() => {
    const map = new Map<string, DealAgg>();
    rows.forEach((r) => {
      const key = r.dealName ?? 'Unknown';
      const cur = map.get(key) ?? { deal: key, occupied: 0, vacant: 0, total: 0, occupancyPct: 0 };
      const sf = r.leasableSF ?? 0;
      if (r.occupied) cur.occupied += sf;
      else cur.vacant += sf;
      cur.total += sf;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((d) => ({ ...d, occupancyPct: d.total > 0 ? (d.occupied / d.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  // Custom tooltip
  const CustomTooltip = (props: Any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload as DealAgg;
    return (
      <div
        style={{
          backgroundColor: c.bgElevated,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          color: c.fg,
          minWidth: 180,
        }}
      >
        <p className="font-semibold mb-1">{d.deal}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
          <span style={{ color: c.fgMuted }}>Occupied</span>
          <span className="text-right">{formatNumber(d.occupied)} SF</span>
          <span style={{ color: c.fgMuted }}>Vacant</span>
          <span className="text-right">{formatNumber(d.vacant)} SF</span>
          <span style={{ color: c.fgMuted }}>Total</span>
          <span className="text-right">{formatNumber(d.total)} SF</span>
          <span style={{ color: c.fgMuted }}>Occupancy</span>
          <span className="text-right" style={{ color: c.success }}>
            {d.occupancyPct.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const height = Math.max(180, data.length * 26 + 40);

  return (
    <ChartCard title="Occupancy by Deal" subtitle="Stacked SF — click a bar to filter">
      {data.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-fg-subtle">
          No data in this view
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
              <XAxis
                type="number"
                stroke={c.fgSubtle}
                tick={{ fill: c.fgMuted, fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
              <YAxis
                type="category"
                dataKey="deal"
                stroke={c.fgSubtle}
                tick={{ fill: c.fgMuted, fontSize: 11 }}
                tickLine={false}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: c.bgSubtle }} />
              <Bar
                dataKey="occupied"
                stackId="occ"
                fill={c.success}
                onClick={((d: Any) => d?.deal && onDealClick(d.deal as string)) as Any}
                cursor="pointer"
              />
              <Bar
                dataKey="vacant"
                stackId="occ"
                fill={c.danger}
                onClick={((d: Any) => d?.deal && onDealClick(d.deal as string)) as Any}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
