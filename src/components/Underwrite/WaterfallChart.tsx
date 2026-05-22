// Phase 1 single-scenario NER waterfall. Recharts doesn't have a
// native waterfall, so we stack an invisible "base" bar under a
// visible "value" bar — same trick as Lease-Calculator's chart.

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WaterfallComponents } from '../../lib/lease-math/types';
import { fmtCurrency } from '../../lib/lease-math/format';

interface Props {
  waterfall: WaterfallComponents;
}

export function WaterfallChart({ waterfall }: Props) {
  const data = [
    {
      name: 'Base Rent',
      base: 0,
      value: waterfall.baseRent,
      color: 'var(--accent)',
    },
    {
      name: 'Free Rent',
      base: waterfall.baseRent + waterfall.freeRent,
      value: -waterfall.freeRent,
      color: 'var(--danger)',
    },
    {
      name: 'TI',
      base: waterfall.baseRent + waterfall.freeRent + waterfall.ti,
      value: -waterfall.ti,
      color: 'var(--danger)',
    },
    {
      name: 'LC',
      base: waterfall.baseRent + waterfall.freeRent + waterfall.ti + waterfall.lc,
      value: -waterfall.lc,
      color: 'var(--danger)',
    },
    {
      name: 'Net CF',
      base: 0,
      value: waterfall.netCashFlow,
      color: 'var(--success)',
    },
  ];

  const max = Math.max(...data.map((d) => d.base + d.value));

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft p-5 sm:p-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle mb-3">
        Waterfall · $/SF over term
      </h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
              domain={[0, Math.ceil(max * 1.1)]}
            />
            <Tooltip
              cursor={{ fill: 'var(--bg-subtle)' }}
              formatter={(v) => fmtCurrency(typeof v === 'number' ? v : Number(v), 2)}
              labelStyle={{ color: 'var(--text)' }}
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="base" stackId="w" fill="transparent" />
            <Bar dataKey="value" stackId="w" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1 border-t border-border/50 pt-3 text-xs tabular-nums text-fg-muted">
        {data.map((d) => (
          <div key={d.name} className="text-center">
            <div className="font-medium">{d.name}</div>
            <div>{fmtCurrency(d.value, 2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
