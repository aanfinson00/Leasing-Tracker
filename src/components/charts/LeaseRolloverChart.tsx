import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

interface LeaseRolloverChartProps {
  rows: RentRollRow[];
  onYearBucketClick: (bucket: string) => void;
}

const BUCKET_ORDER = ['Past', '2028', '2029', '2030', '2031', '2032+', 'Unknown'];

const todayYear = new Date().getFullYear();

function categorize(r: RentRollRow): string {
  if (r.expiryYearBucket && BUCKET_ORDER.includes(r.expiryYearBucket)) {
    return r.expiryYearBucket;
  }
  if (r.leaseEnd) {
    const y = parseInt(r.leaseEnd.slice(0, 4), 10);
    if (!Number.isNaN(y)) {
      if (y < todayYear) return 'Past';
      if (y >= 2032) return '2032+';
      if (y >= 2028 && y <= 2031) return String(y);
    }
  }
  return 'Unknown';
}

export function LeaseRolloverChart({ rows, onYearBucketClick }: LeaseRolloverChartProps) {
  const c = useChartColors();
  const [metric, setMetric] = useState<'sf' | 'rent'>('sf');

  const { data, markets } = useMemo(() => {
    const marketSet = new Set<string>();
    rows.forEach((r) => r.market && marketSet.add(r.market));
    const marketList = Array.from(marketSet).sort();

    const byBucket: Record<string, Record<string, number>> = {};
    BUCKET_ORDER.forEach((b) => (byBucket[b] = {}));

    rows.forEach((r) => {
      const bucket = categorize(r);
      const market = r.market ?? 'Unknown';
      const value = metric === 'sf' ? r.leasableSF ?? 0 : r.annualRent ?? 0;
      byBucket[bucket][market] = (byBucket[bucket][market] ?? 0) + value;
    });

    const chartData = BUCKET_ORDER.map((bucket) => {
      const row: Record<string, number | string> = { bucket };
      marketList.forEach((m) => {
        row[m] = byBucket[bucket][m] ?? 0;
      });
      // Only include buckets with data
      const total = marketList.reduce((s, m) => s + (Number(row[m]) || 0), 0);
      return { ...row, total };
    }).filter((d) => (d.total as number) > 0);

    return { data: chartData, markets: marketList };
  }, [rows, metric]);

  const formatter = metric === 'sf' ? formatNumber : formatCurrencyShort;

  return (
    <ChartCard
      title="Lease Rollover"
      subtitle={metric === 'sf' ? 'Square feet expiring by year' : 'Annual rent at risk by year'}
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
        </div>
      }
    >
      <div className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-fg-subtle">
            No data in this view
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke={c.fgSubtle}
                tick={{ fill: c.fgMuted, fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke={c.fgSubtle}
                tick={{ fill: c.fgMuted, fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => (metric === 'sf' ? formatNumber(v) : formatCurrencyShort(v))}
              />
              <Tooltip
                cursor={{ fill: c.bgSubtle }}
                contentStyle={{
                  backgroundColor: c.bgElevated,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  fontSize: 12,
                  color: c.fg,
                }}
                formatter={((value: Any) => formatter(value as number)) as Any}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {markets.map((m) => (
                <Bar
                  key={m}
                  dataKey={m}
                  stackId="rollover"
                  fill={colorFor(m, c.palette)}
                  onClick={((d: Any) => d?.bucket && onYearBucketClick(d.bucket as string)) as Any}
                  cursor="pointer"
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
