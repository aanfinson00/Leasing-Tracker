import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
import type { RentRollRow } from '../../types';
import { useChartColors, colorFor } from '../../lib/chartTokens';
import { formatCurrencyShort, formatNumber } from '../../lib/format';
import { ChartCard } from './ChartCard';

type Metric = 'sf' | 'rent' | 'vacant';

interface MarketBreakdownChartProps {
  rows: RentRollRow[];
  onMarketClick: (market: string) => void;
}

export function MarketBreakdownChart({ rows, onMarketClick }: MarketBreakdownChartProps) {
  const c = useChartColors();
  const [metric, setMetric] = useState<Metric>('sf');

  const { data, total } = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = r.market ?? 'Unknown';
      let v = 0;
      if (metric === 'sf') v = r.leasableSF ?? 0;
      else if (metric === 'rent') v = (r.leasableSF ?? 0) * (r.inPlaceRent ?? r.startingAnnualRentPSF ?? 0);
      else if (metric === 'vacant') v = !r.occupied ? (r.leasableSF ?? 0) : 0;
      map.set(key, (map.get(key) ?? 0) + v);
    });
    const items = Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: colorFor(name, c.palette) }))
      .sort((a, b) => b.value - a.value);
    const totalVal = items.reduce((s, i) => s + i.value, 0);
    return { data: items, total: totalVal };
  }, [rows, metric, c.palette]);

  const fmt = metric === 'rent' ? formatCurrencyShort : formatNumber;
  const totalLabel = metric === 'rent' ? formatCurrencyShort(total) : formatNumber(total);

  const CustomTooltip = (props: Any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0];
    const pct = total > 0 ? (((d.value as number) / total) * 100).toFixed(1) : '0.0';
    return (
      <div
        style={{
          backgroundColor: c.bgElevated,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: 10,
          fontSize: 12,
          color: c.fg,
        }}
      >
        <p className="font-semibold">{d.name}</p>
        <p className="tabular-nums" style={{ color: c.fgMuted }}>
          {fmt(d.value as number)} · {pct}%
        </p>
      </div>
    );
  };

  return (
    <ChartCard
      title="Market Breakdown"
      subtitle="Click a slice to filter"
      actions={
        <div className="flex bg-bg-subtle rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMetric('sf')}
            className={`px-2.5 py-1 rounded-md font-medium ${metric === 'sf' ? 'bg-bg-elevated text-fg shadow-soft' : 'text-fg-muted'}`}
          >
            SF
          </button>
          <button
            type="button"
            onClick={() => setMetric('rent')}
            className={`px-2.5 py-1 rounded-md font-medium ${metric === 'rent' ? 'bg-bg-elevated text-fg shadow-soft' : 'text-fg-muted'}`}
          >
            $
          </button>
          <button
            type="button"
            onClick={() => setMetric('vacant')}
            className={`px-2.5 py-1 rounded-md font-medium ${metric === 'vacant' ? 'bg-bg-elevated text-fg shadow-soft' : 'text-fg-muted'}`}
          >
            Vacant
          </button>
        </div>
      }
    >
      <div className="h-72 relative">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-fg-subtle">
            No data in this view
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={1}
                  stroke={c.bgElevated}
                  strokeWidth={2}
                  onClick={((d: Any) => d?.name && onMarketClick(d.name as string)) as Any}
                  cursor="pointer"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-30px' }}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                {metric === 'rent' ? 'Annual' : metric === 'vacant' ? 'Vacant' : 'Total'}
              </p>
              <p className="text-lg font-semibold text-fg tabular-nums">{totalLabel}</p>
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
}
