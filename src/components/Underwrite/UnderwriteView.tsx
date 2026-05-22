// A/B underwriting workspace. Mirrors Lease-Calculator's layout:
// header toolbar with property + exports, ScenarioBar with A/B
// pickers, two-column main grid (inputs left for the actively
// edited scenario, results right with side-by-side waterfalls),
// then full-width annual and cashflow schedules.
//
// Editing is single-scenario: the user clicks a scenario pill to
// edit it (or A/B to use it as a comparison). Inputs flush to
// Supabase debounced (300ms). Results recompute synchronously on
// every keystroke for snappy feedback.

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const editing = useMemo(
    () => scenarios.find((s) => s.id === editingId) ?? null,
    [scenarios, editingId]
  );

  // Local working copy of the scenario currently being edited.
  // Re-syncs when editingId or upstream updatedAt changes (e.g. via
  // a realtime event from another tab).
  const [draft, setDraft] = useState<Scenario | null>(editing);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(editing);
  }, [editingId, editing?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup pending save when unmounting.
  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const flushSave = (next: Scenario) => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const withResults: Scenario = {
        ...next,
        results: runScenario(next.inputs as ScenarioInputs, next.globals as Globals),
        updatedAt: new Date().toISOString(),
      };
      onSaveScenario(withResults);
    }, SAVE_DEBOUNCE_MS);
  };

  const handleInputsChange = (next: ScenarioInputs) => {
    if (!draft) return;
    const updated: Scenario = { ...draft, inputs: next };
    setDraft(updated);
    flushSave(updated);
  };
  const handleGlobalsChange = (next: Globals) => {
    if (!draft) return;
    const updated: Scenario = { ...draft, globals: next };
    setDraft(updated);
    flushSave(updated);
  };
  const handleRename = (id: string, name: string) => {
    const target = scenarios.find((s) => s.id === id);
    if (!target) return;
    const updated: Scenario = {
      ...target,
      name,
      updatedAt: new Date().toISOString(),
    };
    if (id === editingId) setDraft(updated);
    onSaveScenario(updated);
  };

  // Results — recomputed synchronously on every render. Live for the
  // draft (so typing feels instant); cached `results` on A and B for
  // their separate waterfalls and the comparison.
  const liveDraftResults = useMemo(() => {
    if (!draft) return null;
    try {
      return runScenario(draft.inputs as ScenarioInputs, draft.globals as Globals);
    } catch {
      return null;
    }
  }, [draft]);

  // For A and B, prefer the live draft result when it's the one being
  // edited (so the comparison reflects unsaved keystrokes); otherwise
  // fall back to cached `results` or a recompute.
  const computeFor = (s: Scenario | null): ScenarioResults | null => {
    if (!s) return null;
    if (s.id === draft?.id && liveDraftResults) return liveDraftResults;
    try {
      return runScenario(s.inputs as ScenarioInputs, s.globals as Globals);
    } catch {
      return null;
    }
  };
  const aResults = useMemo(() => computeFor(a), [a, liveDraftResults]); // eslint-disable-line react-hooks/exhaustive-deps
  const bResults = useMemo(() => computeFor(b), [b, liveDraftResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const canExport = a !== null && b !== null && aResults !== null && bResults !== null;

  return (
    <div className="flex flex-col gap-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* LEFT — inputs for the actively-edited scenario */}
            {draft ? (
              <InputsPanel
                inputs={draft.inputs as ScenarioInputs}
                globals={draft.globals as Globals}
                onInputsChange={handleInputsChange}
                onGlobalsChange={handleGlobalsChange}
              />
            ) : (
              <div className="bg-bg-elevated rounded-2xl shadow-soft p-6 text-sm text-fg-muted">
                Click a scenario above to edit its inputs.
              </div>
            )}

            {/* RIGHT — results */}
            <div className="flex flex-col gap-4 min-w-0">
              {a && b && aResults && bResults ? (
                <>
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
                </>
              ) : (
                <SelectABHint />
              )}
            </div>
          </div>

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
