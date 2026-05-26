import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck, Ghost, Ruler, ChevronDown, ChevronUp } from 'lucide-react';
import type { Building, RentRollRow } from '../types';
import {
  findPhantomSpaces,
  computeSFDrift,
  type PhantomSpace,
  type BuildingSFDrift,
} from '../lib/auditViews';

interface Props {
  rentRoll: RentRollRow[];
  buildings: Building[];
}

const fmtSF = (n: number) => `${Math.round(n).toLocaleString('en-US')} SF`;
const fmtPct = (frac: number) => `${(frac * 100).toFixed(1)}%`;

export function DataIntegrityAudits({ rentRoll, buildings }: Props) {
  const phantoms = useMemo(
    () => findPhantomSpaces(rentRoll, buildings),
    [rentRoll, buildings]
  );
  const drifts = useMemo(() => computeSFDrift(rentRoll, buildings), [rentRoll, buildings]);

  const allClean = phantoms.length === 0 && drifts.length === 0;

  // Both sections start collapsed when clean to keep the Reports tab quiet.
  const [showPhantoms, setShowPhantoms] = useState(false);
  const [showDrifts, setShowDrifts] = useState(false);

  return (
    <section className="rounded-2xl bg-bg-elevated shadow-soft overflow-hidden">
      <header className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg/60">
        <div className="flex items-center gap-2">
          {allClean ? (
            <ShieldCheck size={15} strokeWidth={2} className="text-success" />
          ) : (
            <AlertTriangle size={15} strokeWidth={2} className="text-warning" />
          )}
          <span className="text-sm font-medium text-fg">Data integrity</span>
          <span className="text-xs text-fg-muted">
            {allClean
              ? '· no issues'
              : `· ${phantoms.length} phantom space${phantoms.length === 1 ? '' : 's'}, ${drifts.length} building${drifts.length === 1 ? '' : 's'} with SF drift`}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <PhantomSpacesPanel
          phantoms={phantoms}
          expanded={showPhantoms}
          onToggle={() => setShowPhantoms((v) => !v)}
        />
        <SFDriftPanel
          drifts={drifts}
          expanded={showDrifts}
          onToggle={() => setShowDrifts((v) => !v)}
        />
      </div>
    </section>
  );
}

function PhantomSpacesPanel({
  phantoms,
  expanded,
  onToggle,
}: {
  phantoms: PhantomSpace[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const count = phantoms.length;
  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Ghost
            size={14}
            strokeWidth={2}
            className={count > 0 ? 'text-warning' : 'text-fg-subtle'}
          />
          <span className="text-sm font-medium text-fg">Phantom spaces</span>
          <span
            className={`text-xs tabular-nums ${count > 0 ? 'text-warning' : 'text-fg-muted'}`}
          >
            {count}
          </span>
        </div>
        {count > 0 && (expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>
      <p className="text-xs text-fg-muted mt-1.5">
        Rent-roll rows whose Space ID isn't drawn as a bay on any building.
      </p>
      {expanded && count > 0 && (
        <ul className="mt-3 divide-y divide-border/40">
          {phantoms.map(({ row, reason }) => (
            <li key={row.id} className="py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-fg truncate">
                    {row.tenantName ?? row.dealName ?? '(unnamed row)'}
                  </div>
                  <div className="text-fg-muted truncate">
                    {row.spaceId ?? '(no space ID)'} · {row.building ?? row.market ?? ''}
                  </div>
                </div>
                <span className="text-warning text-[10px] uppercase tracking-wider whitespace-nowrap">
                  {reason === 'no-space-id' ? 'missing ID' : 'orphan'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SFDriftPanel({
  drifts,
  expanded,
  onToggle,
}: {
  drifts: BuildingSFDrift[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const count = drifts.length;
  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Ruler
            size={14}
            strokeWidth={2}
            className={count > 0 ? 'text-warning' : 'text-fg-subtle'}
          />
          <span className="text-sm font-medium text-fg">SF drift</span>
          <span
            className={`text-xs tabular-nums ${count > 0 ? 'text-warning' : 'text-fg-muted'}`}
          >
            {count}
          </span>
        </div>
        {count > 0 && (expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>
      <p className="text-xs text-fg-muted mt-1.5">
        Buildings where rent-roll SF differs from drawn footprint by &gt; 1%.
      </p>
      {expanded && count > 0 && (
        <ul className="mt-3 divide-y divide-border/40">
          {drifts.map((d) => {
            const over = d.driftSF > 0;
            return (
              <li key={d.building.id} className="py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg truncate">
                      {d.building.name || `Project ${d.building.projectId}`}
                    </div>
                    <div className="text-fg-muted tabular-nums">
                      drawn {fmtSF(d.buildingSF)} · allocated {fmtSF(d.allocatedSF)} ({d.rowCount} row{d.rowCount === 1 ? '' : 's'})
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className={`tabular-nums font-medium ${over ? 'text-danger' : 'text-warning'}`}>
                      {over ? '+' : ''}
                      {fmtSF(d.driftSF)}
                    </div>
                    <div className="text-fg-subtle tabular-nums">{fmtPct(d.driftPct)}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
