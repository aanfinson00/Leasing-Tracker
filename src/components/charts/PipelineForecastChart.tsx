import { useMemo } from 'react';
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
import type { Deal, DealStatus } from '../../types';
import { useChartColors } from '../../lib/chartTokens';
import { formatCurrencyShort } from '../../lib/format';
import { ChartCard } from './ChartCard';

interface PipelineForecastChartProps {
  deals: Deal[];
}

const STATUS_ORDER: DealStatus[] = [
  'Prospect',
  'RFP Out',
  'RFP for Approval',
  'On Hold',
  'Executed',
  'Lost',
];

interface Datum {
  status: DealStatus;
  count: number;
  gross: number;
  weighted: number;
}

export function PipelineForecastChart({ deals }: PipelineForecastChartProps) {
  const c = useChartColors();

  const data = useMemo<Datum[]>(() => {
    const acc: Record<string, Datum> = {};
    STATUS_ORDER.forEach((s) => (acc[s] = { status: s, count: 0, gross: 0, weighted: 0 }));
    deals.forEach((d) => {
      const sf = d.maxSF ?? d.minSF ?? 0;
      const rent = d.targetRent ?? 0;
      const prob = (d.probabilityPct ?? 0) / 100;
      const gross = sf * rent;
      const weighted = gross * prob;
      if (acc[d.status]) {
        acc[d.status].count += 1;
        acc[d.status].gross += gross;
        acc[d.status].weighted += weighted;
      }
    });
    return STATUS_ORDER.map((s) => acc[s]).filter((d) => d.count > 0);
  }, [deals]);

  const CustomTooltip = (props: Any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload as Datum;
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
        <p className="font-semibold mb-1">{d.status}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
          <span style={{ color: c.fgMuted }}>Deals</span>
          <span className="text-right">{d.count}</span>
          <span style={{ color: c.fgMuted }}>Gross @ target</span>
          <span className="text-right">{formatCurrencyShort(d.gross)}</span>
          <span style={{ color: c.fgMuted }}>Prob-weighted</span>
          <span className="text-right" style={{ color: c.accent }}>
            {formatCurrencyShort(d.weighted)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title="Pipeline Forecast"
      subtitle="Gross at target vs probability-weighted annual rent"
    >
      <div className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-fg-subtle">
            No prospects loaded
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis
                dataKey="status"
                stroke={c.fgSubtle}
                tick={{ fill: c.fgMuted, fontSize: 10 }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                stroke={c.fgSubtle}
                tick={{ fill: c.fgMuted, fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => formatCurrencyShort(v)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: c.bgSubtle }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="gross" name="Gross @ target" fill={c.accentSoft} stroke={c.accent} strokeWidth={1} />
              <Bar dataKey="weighted" name="Prob-weighted" fill={c.accent} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
