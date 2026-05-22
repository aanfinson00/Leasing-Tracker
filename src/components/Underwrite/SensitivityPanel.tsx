// Sensitivity sliders + Hold-NER mode. Adapted from
// Lease-Calculator/components/sensitivity/sensitivity-panel.tsx on
// 2026-05-22 — uses native <input type="range"> instead of Radix
// Slider, and works against a single scenario (chosen via picker) by
// calling the same per-cell update handler the InputsPanel uses.
//
// Scenario picker selects which scenario the sliders mutate. Default
// is B (the counter-offer side in A/B mode).
//
// Hold-NER mode: when enabled, dragging any non-locked slider triggers
// solveFor() on the chosen free variable to keep the chosen NER metric
// pinned at the target. The locked slider becomes a read-only output
// indicator (dashed border + OUTPUT badge).

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Sliders } from 'lucide-react';
import type { Scenario } from '../../types';
import type { Globals, ScenarioInputs } from '../../lib/lease-math/types';
import { runScenario } from '../../lib/lease-math/calc';
import { fmtPSF, fmtPercent } from '../../lib/lease-math/format';
import {
  defaultBounds,
  solveFor,
  type FreeVariable,
  type NERKind,
} from '../../lib/lease-math/solver';

interface Props {
  scenarios: Scenario[];
  /** A/B IDs from UnderwriteView — used to seed the active scenario picker. */
  aId: string | null;
  bId: string | null;
  onUpdateInput: <K extends keyof ScenarioInputs>(
    scenarioId: string,
    field: K,
    value: ScenarioInputs[K]
  ) => void;
  onUpdateGlobals: (patch: Partial<Globals>) => void;
}

const FREE_VARS: { value: FreeVariable; label: string }[] = [
  { value: 'baseRatePSF', label: 'Base Rate' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'freeRentMonths', label: 'Free Rent' },
  { value: 'tiAllowancePSF', label: 'TI Allowance' },
  { value: 'discountRate', label: 'Discount Rate' },
];

// Discount rate doesn't affect undiscounted NER, so it's not a valid free
// variable when holding the undiscounted metric.
const FREE_VARS_FOR_UNDISCOUNTED = FREE_VARS.filter((v) => v.value !== 'discountRate');

interface HoldState {
  enabled: boolean;
  targetNER: number;
  freeVar: FreeVariable;
  scenarioId: string;
  nerKind: NERKind;
}

export function SensitivityPanel({
  scenarios,
  aId,
  bId,
  onUpdateInput,
  onUpdateGlobals,
}: Props) {
  // Default to B, fall back to A, fall back to first scenario.
  const [activeId, setActiveId] = useState<string>(() => bId ?? aId ?? scenarios[0]?.id ?? '');

  // If the selected scenario disappears, retarget.
  useEffect(() => {
    if (!scenarios.find((s) => s.id === activeId)) {
      setActiveId(bId ?? aId ?? scenarios[0]?.id ?? '');
    }
  }, [scenarios, activeId, aId, bId]);

  const active = scenarios.find((s) => s.id === activeId);

  // Snapshot baseline baseRate so slider bounds stay stable while dragging
  // (otherwise the ±30% window shifts under your finger).
  const [baselineBaseRate, setBaselineBaseRate] = useState<number>(
    (active?.inputs as ScenarioInputs | undefined)?.baseRatePSF ?? 0,
  );
  useEffect(() => {
    if (active) setBaselineBaseRate((active.inputs as ScenarioInputs).baseRatePSF);
    // Intentional — only re-snapshot on scenario switch, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const [hold, setHold] = useState<HoldState | null>(null);
  const [solverError, setSolverError] = useState<string | null>(null);
  const [nerKind, setNerKind] = useState<NERKind>('discounted');

  if (!active) {
    return null;
  }

  const inputs = active.inputs as ScenarioInputs;
  const globals = active.globals as Globals;

  const bounds = (freeVar: FreeVariable): [number, number] => {
    if (freeVar === 'baseRatePSF') {
      return [Math.max(0.01, baselineBaseRate * 0.7), baselineBaseRate * 1.3];
    }
    return defaultBounds(freeVar, inputs);
  };

  const currentValue = (freeVar: FreeVariable): number => {
    if (freeVar === 'discountRate') return globals.discountRate;
    return inputs[freeVar] as number;
  };

  const applyValue = (freeVar: FreeVariable, value: number) => {
    if (freeVar === 'discountRate') {
      onUpdateGlobals({ discountRate: value });
    } else {
      onUpdateInput(active.id, freeVar, value as never);
    }
  };

  const isHolding = hold?.enabled === true && hold.scenarioId === active.id;
  const lockedVar = isHolding ? hold!.freeVar : null;

  const liveResults = useMemo(() => runScenario(inputs, globals), [inputs, globals]);

  const onSlide = (freeVar: FreeVariable) => (raw: number) => {
    applyValue(freeVar, raw);

    if (hold?.enabled && hold.scenarioId === active.id && hold.freeVar !== freeVar) {
      const updatedInputs =
        freeVar === 'discountRate' ? inputs : { ...inputs, [freeVar]: raw };
      const updatedGlobals =
        freeVar === 'discountRate' ? { ...globals, discountRate: raw } : globals;
      const result = solveFor(
        updatedInputs,
        updatedGlobals,
        hold.targetNER,
        hold.freeVar,
        hold.nerKind,
      );
      if (!result.converged) {
        setSolverError(
          `Target ${hold.nerKind} NER of ${fmtPSF(hold.targetNER)} can't be reached by adjusting ${
            labelOf(hold.freeVar)
          } within its slider range.`,
        );
      } else {
        setSolverError(null);
        applyValue(hold.freeVar, result.value);
      }
    }
  };

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-accent" strokeWidth={2} />
          <h3 className="text-sm font-semibold text-fg tracking-tight">Sensitivity</h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="text-fg-muted">Adjust:</label>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="h-8 rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hold-NER controls */}
      <div className="flex flex-wrap items-center gap-3 py-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isHolding}
            onChange={(e) => {
              if (e.target.checked) {
                setHold({
                  enabled: true,
                  targetNER:
                    nerKind === 'undiscounted'
                      ? liveResults.undiscountedNER
                      : liveResults.discountedNER,
                  freeVar: hold?.freeVar ?? 'baseRatePSF',
                  scenarioId: active.id,
                  nerKind,
                });
                setSolverError(null);
              } else {
                setHold(null);
                setSolverError(null);
              }
            }}
            className="accent-accent cursor-pointer"
          />
          <span className="font-medium text-fg">Hold NER</span>
        </label>

        <div className="flex items-center gap-2 text-xs">
          <label className="text-fg-muted">Metric:</label>
          <select
            value={nerKind}
            onChange={(e) => {
              const next = e.target.value as NERKind;
              setNerKind(next);
              if (isHolding && hold) {
                const seed =
                  next === 'undiscounted'
                    ? liveResults.undiscountedNER
                    : liveResults.discountedNER;
                // Discount rate doesn't move undiscounted NER, so bump
                // off it if user switches metric while it's locked.
                const freeVar =
                  next === 'undiscounted' && hold.freeVar === 'discountRate'
                    ? 'baseRatePSF'
                    : hold.freeVar;
                setHold({ ...hold, nerKind: next, targetNER: seed, freeVar });
              }
            }}
            className="h-8 rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="discounted">Discounted NER</option>
            <option value="undiscounted">Undiscounted NER</option>
          </select>
        </div>

        {isHolding && hold && (
          <>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-fg-muted">
                Target ({hold.nerKind === 'undiscounted' ? 'undisc.' : 'disc.'} NER, $/SF):
              </label>
              <input
                type="number"
                step={0.05}
                value={hold.targetNER.toFixed(2)}
                onChange={(e) => setHold({ ...hold, targetNER: Number(e.target.value) })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="h-8 w-24 rounded-md border border-accent/30 bg-accent/[0.06] px-2 text-sm tabular-nums text-fg caret-accent focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-fg-muted">Solve for:</label>
              <select
                value={hold.freeVar}
                onChange={(e) => setHold({ ...hold, freeVar: e.target.value as FreeVariable })}
                className="h-8 rounded-md border border-border bg-bg-elevated px-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {(hold.nerKind === 'undiscounted' ? FREE_VARS_FOR_UNDISCOUNTED : FREE_VARS).map(
                  (v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </>
        )}
      </div>

      {solverError && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
          <span>{solverError}</span>
        </div>
      )}

      {/* Sliders */}
      <div className="flex flex-col gap-3">
        {FREE_VARS.map(({ value: fv, label }) => {
          const [lo, hi] = bounds(fv);
          const v = currentValue(fv);
          const locked = lockedVar === fv;
          return (
            <SliderRow
              key={fv}
              label={label}
              displayValue={displayFor(fv, v)}
              value={v}
              min={lo}
              max={hi}
              step={stepFor(fv)}
              locked={locked}
              onChange={onSlide(fv)}
            />
          );
        })}
      </div>

      {/* Live readouts */}
      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <NERReadout
          label="Live undiscounted NER"
          value={liveResults.undiscountedNER}
          held={isHolding && hold!.nerKind === 'undiscounted'}
        />
        <NERReadout
          label="Live discounted NER"
          value={liveResults.discountedNER}
          held={isHolding && hold!.nerKind === 'discounted'}
        />
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  displayValue: string;
  value: number;
  min: number;
  max: number;
  step: number;
  locked: boolean;
  onChange: (v: number) => void;
}

function SliderRow({
  label,
  displayValue,
  value,
  min,
  max,
  step,
  locked,
  onChange,
}: SliderRowProps) {
  const clamped = Math.max(min, Math.min(max, value));
  return (
    <div className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-fg">{label}</label>
        {locked && (
          <span className="rounded border border-dashed border-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Output
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={locked}
        onChange={(e) => onChange(Number(e.target.value))}
        className={[
          'w-full accent-accent cursor-pointer',
          locked && 'opacity-60 cursor-not-allowed',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <div
        className={[
          'text-right text-sm tabular-nums',
          locked ? 'text-fg-muted' : 'text-fg',
        ].join(' ')}
      >
        {displayValue}
      </div>
    </div>
  );
}

function NERReadout({
  label,
  value,
  held,
}: {
  label: string;
  value: number;
  held: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-fg-muted">{label}:</span>
      <span
        className={[
          'font-semibold tabular-nums',
          held ? 'text-accent' : 'text-fg',
        ].join(' ')}
      >
        {fmtPSF(value)}
      </span>
      {held && (
        <span className="rounded border border-accent px-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Held
        </span>
      )}
    </div>
  );
}

function labelOf(fv: FreeVariable): string {
  return FREE_VARS.find((v) => v.value === fv)?.label ?? fv;
}

function stepFor(fv: FreeVariable): number {
  switch (fv) {
    case 'baseRatePSF':
      return 0.05;
    case 'escalation':
      return 0.0025; // 0.25%
    case 'freeRentMonths':
      return 1;
    case 'tiAllowancePSF':
      return 0.5;
    case 'discountRate':
      return 0.0025;
  }
}

function displayFor(fv: FreeVariable, v: number): string {
  switch (fv) {
    case 'baseRatePSF':
    case 'tiAllowancePSF':
      return fmtPSF(v);
    case 'escalation':
    case 'discountRate':
      return fmtPercent(v);
    case 'freeRentMonths':
      return `${Math.round(v)} mo`;
  }
}
