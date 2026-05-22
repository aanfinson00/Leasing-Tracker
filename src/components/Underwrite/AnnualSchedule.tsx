import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ScenarioResults } from '../../lib/lease-math/types';
import { fmtCurrency, fmtNumber } from '../../lib/lease-math/format';

interface Props {
  results: ScenarioResults;
}

export function AnnualSchedule({ results }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 -mx-1 -my-1 px-1 py-1 rounded-lg text-fg hover:bg-bg-hover/50 transition-colors"
      >
        {open ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Annual Rent Schedule
        </span>
      </button>
      {open && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                <th className="py-2 pr-4">Year</th>
                <th className="py-2 pr-4 text-right">Rate $/SF</th>
                <th className="py-2 pr-4 text-right">Months Active</th>
              </tr>
            </thead>
            <tbody>
              {results.schedule.map((row) => (
                <tr key={row.year} className="border-b border-border/40 last:border-b-0">
                  <td className="py-1.5 pr-4 text-fg">Year {row.year}</td>
                  <td className="py-1.5 pr-4 text-right text-fg">{fmtCurrency(row.annualRatePSF, 2)}</td>
                  <td className="py-1.5 pr-4 text-right text-fg-muted">{fmtNumber(row.monthsActive, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
