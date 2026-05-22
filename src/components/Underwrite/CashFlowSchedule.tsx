// Dual-scenario cash flow schedule. One sub-table per scenario,
// dates left → right. Sticky first column = row labels.

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ScenarioInputs, ScenarioResults } from '../../lib/lease-math/types';
import { fmtCurrency } from '../../lib/lease-math/format';

interface ScenarioPair {
  name: string;
  inputs: ScenarioInputs;
  results: ScenarioResults;
}

interface Props {
  a: ScenarioPair;
  b: ScenarioPair;
}

export function CashFlowSchedule({ a, b }: Props) {
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
          Cash Flow Schedule
        </span>
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-6">
          <ScheduleTable pair={a} />
          <ScheduleTable pair={b} />
        </div>
      )}
    </div>
  );
}

function ScheduleTable({ pair }: { pair: ScenarioPair }) {
  const { name, inputs, results } = pair;
  const exec = new Date(inputs.leaseExecutionDate);
  const comm = new Date(inputs.leaseCommencement);
  const commencementOffset = Math.max(
    0,
    (comm.getUTCFullYear() - exec.getUTCFullYear()) * 12 +
      (comm.getUTCMonth() - exec.getUTCMonth())
  );
  const free = Math.max(0, Math.min(Math.round(inputs.freeRentMonths), inputs.leaseTermMonths));
  const rcMonth = commencementOffset + free + 1;
  const span = commencementOffset + inputs.leaseTermMonths;
  const rows = results.grid.slice(0, span);

  const totals = rows.reduce(
    (acc, r) => {
      acc.base += r.baseRentPSF;
      acc.free += r.freeRentPSF;
      acc.ti += r.tiPSF;
      acc.lc += r.lcPSF;
      return acc;
    },
    { base: 0, free: 0, ti: 0, lc: 0 }
  );
  const totalNet = totals.base + totals.free + totals.ti + totals.lc;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-fg">{name}</span>
        <span className="text-fg-muted text-xs">
          Execution {inputs.leaseExecutionDate} · Commencement {inputs.leaseCommencement}
          {free > 0 && ` · Rent comm. M${rcMonth}`}
          {' · all values $/SF'}
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="text-xs tabular-nums">
          <thead className="bg-bg-subtle">
            <tr>
              <th className="sticky left-0 z-10 w-[120px] min-w-[120px] border-r border-border/60 bg-bg-subtle px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                Row
              </th>
              {rows.map((r, i) => {
                const m = i + 1;
                const inAbatement = free > 0 && m > commencementOffset && m <= commencementOffset + free;
                return (
                  <th
                    key={i}
                    className={`min-w-[64px] px-2 py-1 text-right font-medium ${
                      inAbatement ? 'bg-warning/5 text-warning' : 'text-fg-muted'
                    }`}
                    title={r.date}
                  >
                    M{r.month}
                  </th>
                );
              })}
              <th className="min-w-[72px] px-2 py-1 text-right font-semibold text-fg border-l border-border/60 bg-bg-subtle">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <CashRow label="Base Rent" rows={rows} pick={(r) => r.baseRentPSF} total={totals.base} />
            <CashRow label="Free Rent" rows={rows} pick={(r) => r.freeRentPSF} total={totals.free} />
            <CashRow label="TI" rows={rows} pick={(r) => r.tiPSF} total={totals.ti} />
            <CashRow label="LC" rows={rows} pick={(r) => r.lcPSF} total={totals.lc} />
            <tr className="bg-bg-subtle/50">
              <td className="sticky left-0 z-10 bg-bg-subtle/50 border-r border-border/60 px-2 py-1.5 text-left font-semibold text-fg">
                Net CF
              </td>
              {rows.map((r, i) => (
                <td
                  key={i}
                  className={`px-2 py-1 text-right tabular-nums font-medium ${
                    r.netCFPSF < 0 ? 'text-danger' : 'text-fg'
                  }`}
                >
                  {r.netCFPSF === 0 ? '–' : fmtCurrency(r.netCFPSF, 2)}
                </td>
              ))}
              <td className="border-l border-border/60 px-2 py-1.5 text-right tabular-nums font-bold bg-bg-subtle text-fg">
                {fmtCurrency(totalNet, 2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CashRowProps {
  label: string;
  rows: ScenarioResults['grid'];
  pick: (r: ScenarioResults['grid'][number]) => number;
  total: number;
}

function CashRow({ label, rows, pick, total }: CashRowProps) {
  return (
    <tr className="border-t border-border/40">
      <td className="sticky left-0 z-10 bg-bg-elevated border-r border-border/60 px-2 py-1.5 text-left text-fg-muted">
        {label}
      </td>
      {rows.map((r, i) => {
        const v = pick(r);
        return (
          <td
            key={i}
            className={`px-2 py-1 text-right tabular-nums ${
              v < 0 ? 'text-danger' : v === 0 ? 'text-fg-subtle' : 'text-fg-muted'
            }`}
          >
            {v === 0 ? '–' : fmtCurrency(v, 2)}
          </td>
        );
      })}
      <td className="border-l border-border/60 px-2 py-1.5 text-right tabular-nums font-medium bg-bg-subtle/50 text-fg">
        {fmtCurrency(total, 2)}
      </td>
    </tr>
  );
}
