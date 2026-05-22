// A/B underwriting workspace. Lease-Calculator-faithful spreadsheet
// layout: InputsPanel shows BOTH A and B in one panel (fields as
// columns, scenarios as rows), with diff highlighting + per-cell
// warnings. Every edit fires onUpdateInput(scenarioId, field,
// value); per-scenario debounced save (300ms) flushes to Supabase.
// Globals are 'shared assumptions' applied to BOTH scenarios on
// each update since our model snapshots globals per-scenario.

import { useEffect, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import type { Deal, Scenario } from '../../types';
import type {
  Globals,
  ScenarioInputs,
  ScenarioResults,
} from '../../lib/lease-math/types';
import { runScenario } from '../../lib/lease-math/calc';
import { DealPicker } from './DealPicker';
import { ScenarioBar } from './ScenarioBar';
import { InputsPanel } from './InputsPanel';
import { HeadlineCard } from './HeadlineCard';
import { WaterfallChart } from './WaterfallChart';
import { AnnualSchedule } from './AnnualSchedule';
import { CashFlowSchedule } from './CashFlowSchedule';
import { ExportExcelButton, ExportPdfButton } from './ExportButtons';

interface Props {
  deals: Deal[];
  scenarios: Scenario[];
  selectedDealId: string | null;
  // A/B/edit selection state lives at the App level so realtime
  // updates can preserve it across reloads.
  aId: string | null;
  bId: string | null;
  editingId: string | null;
  onSelectDeal: (deal: Deal | null) => void;
  onSetA: (id: string) => void;
  onSetB: (id: string) => void;
  onSetEditing: (id: string) => void;
  onNewScenario: (deal: Deal) => void;
  onDuplicateScenario: (id: string) => void;
  onSaveScenario: (s: Scenario) => void;
  onDeleteScenario: (id: string) => void;
  onToast: (msg: string) => void;
}

const SAVE_DEBOUNCE_MS = 300;

export function UnderwriteView({
  deals,
  scenarios,
  selectedDealId,
  aId,
  bId,
  editingId,
  onSelectDeal,
  onSetA,
  onSetB,
  onSetEditing,
  onNewScenario,
  onDuplicateScenario,
  onSaveScenario,
  onDeleteScenario,
  onToast,
}: Props) {
  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedDealId) ?? null,
    [deals, selectedDealId]
  );
  const a = useMemo(() => scenarios.find((s) => s.id === aId) ?? null, [scenarios, aId]);
  const b = useMemo(() => scenarios.find((s) => s.id === bId) ?? null, [scenarios, bId]);

  // Per-scenario debounced save. Each cell edit cancels the prior
  // timer for THAT scenario only — typing in A doesn't blow away
  // B's pending save and vice versa.
  const saveTimers = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    return () => {
      saveTimers.current.forEach((t) => window.clearTimeout(t));
      saveTimers.current.clear();
    };
  }, []);

  const scheduleSave = (scenario: Scenario) => {
    const existing = saveTimers.current.get(scenario.id);
    if (existing !== undefined) window.clearTimeout(existing);
    const t = window.setTimeout(() => {
      const withResults: Scenario = {
        ...scenario,
        results: runScenario(
          scenario.inputs as ScenarioInputs,
          scenario.globals as Globals
        ),
        updatedAt: new Date().toISOString(),
      };
      onSaveScenario(withResults);
      saveTimers.current.delete(scenario.id);
    }, SAVE_DEBOUNCE_MS);
    saveTimers.current.set(scenario.id, t);
  };

  const handleUpdateInput = <K extends keyof ScenarioInputs>(
    scenarioId: string,
    field: K,
    value: ScenarioInputs[K]
  ) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;
    const nextInputs = { ...(target.inputs as ScenarioInputs), [field]: value };
    const updated: Scenario = { ...target, inputs: nextInputs };
    // Optimistic local: rely on parent's setScenarios via onSaveScenario.
    // The debounce delays the actual write; the calc-rerun for results
    // happens at flush time. Live display in HeadlineCard/Waterfall
    // recomputes from `a`/`b` props each render below.
    scheduleSave(updated);
  };

  const handleUpdateGlobals = (patch: Partial<Globals>) => {
    // Globals are 'shared' in Lease-Calc; here they're snapshotted
    // per-scenario, so apply to BOTH A and B. Each gets its own
    // debounced save.
    [a, b].forEach((s) => {
      if (!s) return;
      const nextGlobals = { ...(s.globals as Globals), ...patch };
      const updated: Scenario = { ...s, globals: nextGlobals };
      scheduleSave(updated);
    });
  };

  const handleRename = (id: string, name: string) => {
    const target = scenarios.find((s) => s.id === id);
    if (!target) return;
    const updated: Scenario = {
      ...target,
      name,
      updatedAt: new Date().toISOString(),
    };
    onSaveScenario(updated);
  };

  // Results — recompute each render from current props. Since edits
  // schedule debounced saves but don't mutate local state here, the
  // visible result lags the keystroke by ~300ms. (Earlier 'draft'
  // approach made it live but added cross-scenario fight conditions
  // when both A and B were being edited from the same panel.)
  const aResults = useMemo<ScenarioResults | null>(() => {
    if (!a) return null;
    try {
      return runScenario(a.inputs as ScenarioInputs, a.globals as Globals);
    } catch {
      return null;
    }
  }, [a]);
  const bResults = useMemo<ScenarioResults | null>(() => {
    if (!b) return null;
    try {
      return runScenario(b.inputs as ScenarioInputs, b.globals as Globals);
    } catch {
      return null;
    }
  }, [b]);

  const canExport = a !== null && b !== null && aResults !== null && bResults !== null;

  return (
    // Cap the underwrite view at 1400px on ultrawide monitors — the
    // spreadsheet panel + side-by-side waterfalls become uncomfortably
    // spread out past that width. Map/Prospects tabs stay edge-to-edge
    // because they benefit from the extra room. mx-auto centers the
    // capped column within the wider main.
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      {/* Toolbar — deal picker + export actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <DealPicker deals={deals} selectedId={selectedDealId} onSelect={onSelectDeal} />
        {canExport && a && b && (
          <div className="flex items-center gap-2">
            <ExportExcelButton
              propertyName={selectedDeal?.dealName ?? ''}
              aName={a.name}
              aInputs={a.inputs as ScenarioInputs}
              bName={b.name}
              bInputs={b.inputs as ScenarioInputs}
              globals={(a.globals ?? b.globals) as Globals}
              onToast={onToast}
            />
            <ExportPdfButton
              propertyName={selectedDeal?.dealName ?? ''}
              aName={a.name}
              aInputs={a.inputs as ScenarioInputs}
              bName={b.name}
              bInputs={b.inputs as ScenarioInputs}
              globals={(a.globals ?? b.globals) as Globals}
              onToast={onToast}
            />
          </div>
        )}
      </div>

      {!selectedDeal ? (
        <EmptyDealState />
      ) : scenarios.length === 0 ? (
        <EmptyScenarioState dealName={selectedDeal.dealName} onNew={() => onNewScenario(selectedDeal)} />
      ) : (
        <>
          <ScenarioBar
            scenarios={scenarios}
            aId={aId}
            bId={bId}
            activeEditingId={editingId}
            onSetA={onSetA}
            onSetB={onSetB}
            onSetEditing={onSetEditing}
            onRename={handleRename}
            onDuplicate={onDuplicateScenario}
            onDelete={onDeleteScenario}
            onAdd={() => onNewScenario(selectedDeal)}
          />

          {/* Spreadsheet InputsPanel — both A and B together in one
              wide grid. Globals (shared assumptions) live at the top
              of the panel; per-section field grids below. */}
          {a && b ? (
            <InputsPanel
              aId={a.id}
              aName={a.name}
              aInputs={a.inputs as ScenarioInputs}
              bId={b.id}
              bName={b.name}
              bInputs={b.inputs as ScenarioInputs}
              globals={(a.globals ?? b.globals) as Globals}
              onUpdateInput={handleUpdateInput}
              onUpdateGlobals={handleUpdateGlobals}
            />
          ) : (
            <SelectABHint />
          )}

          {/* Results — headline + side-by-side waterfalls. */}
          {a && b && aResults && bResults && (
            <div className="flex flex-col gap-4 min-w-0">
              <HeadlineCard
                aName={a.name}
                aResults={aResults}
                bName={b.name}
                bResults={bResults}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WaterfallChart title={a.name} waterfall={aResults.waterfall} />
                <WaterfallChart title={b.name} waterfall={bResults.waterfall} />
              </div>
            </div>
          )}

          {/* Full-width schedules below */}
          {a && b && aResults && bResults && (
            <>
              <AnnualSchedule
                aName={a.name}
                aResults={aResults}
                bName={b.name}
                bResults={bResults}
              />
              <CashFlowSchedule
                a={{ name: a.name, inputs: a.inputs as ScenarioInputs, results: aResults }}
                b={{ name: b.name, inputs: b.inputs as ScenarioInputs, results: bResults }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function EmptyDealState() {
  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-tint text-accent mb-5">
        <Sparkles size={22} strokeWidth={1.75} />
      </div>
      <h3 className="text-xl font-semibold text-fg tracking-[-0.02em]">Pick a deal to underwrite</h3>
      <p className="text-sm text-fg-muted mt-2 max-w-md">
        Choose a prospect or executed deal from the dropdown above. Scenarios save to Supabase
        and stay attached to that deal.
      </p>
    </div>
  );
}

function EmptyScenarioState({ dealName, onNew }: { dealName: string; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 bg-bg-elevated rounded-2xl shadow-soft">
      <p className="text-base font-semibold text-fg">No scenarios yet for {dealName}</p>
      <p className="text-sm text-fg-muted mt-1 max-w-md">
        Add your first scenario — it'll auto-fill from the deal's target rent, term, TI, and free rent.
      </p>
      <button
        onClick={onNew}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
      >
        Add first scenario
      </button>
    </div>
  );
}

function SelectABHint() {
  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft p-6 text-sm text-fg-muted">
      Select two scenarios (A and B) above to see the comparison.
    </div>
  );
}
