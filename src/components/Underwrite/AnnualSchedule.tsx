// Dual-scenario annual rent schedule. Pads to the longer term so both
// scenarios show every year; missing rows show "—".

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ScenarioResults } from '../../lib/lease-math/types';
import { fmtCurrency, fmtNumber } from '../../lib/lease-math/format';

interface Props {
  aName: string;
  aResults: ScenarioResults;
  bName: string;
  bResults: ScenarioResults;
}

export function AnnualSchedule({ aName, aResults, bName, bResults }: Props) {
  const [open, setOpen] = useState(false);
  const maxYears = Math.max(aResults.schedule.length, bResults.schedule.length);

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
                <th className="py-2 pr-4 text-right">{aName} Rate</th>
                <th className="py-2 pr-4 text-right">{aName} Mo</th>
                <th className="py-2 pr-4 text-right">{bName} Rate</th>
                <th className="py-2 pr-4 text-right">{bName} Mo</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxYears }).map((_, i) => {
                const aRow = aResults.schedule[i];
                const bRow = bResults.schedule[i];
                return (
                  <tr key={i} className="border-b border-border/40 last:border-b-0">
                    <td className="py-1.5 pr-4 text-fg">Year {(aRow ?? bRow)?.year}</td>
                    <td className="py-1.5 pr-4 text-right text-fg">
                      {aRow ? fmtCurrency(aRow.annualRatePSF, 2) : '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-fg-muted">
                      {aRow ? fmtNumber(aRow.monthsActive, 0) : '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-fg">
                      {bRow ? fmtCurrency(bRow.annualRatePSF, 2) : '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-fg-muted">
                      {bRow ? fmtNumber(bRow.monthsActive, 0) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
