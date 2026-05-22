// Two-pane underwriting workspace. Picks a deal, lists scenarios for
// that deal, edits one at a time. Inputs are debounced (300ms) before
// flushing to Supabase so typing in a number field doesn't write on
// every keystroke. The result block re-renders on every input change
// (synchronously, in-process) so the user sees NER move as they type.

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
import { ScenarioTabs } from './ScenarioTabs';
import { InputsPanel } from './InputsPanel';
import { HeadlineCard } from './HeadlineCard';
import { WaterfallChart } from './WaterfallChart';
import { AnnualSchedule } from './AnnualSchedule';
import { CashFlowSchedule } from './CashFlowSchedule';

interface Props {
  deals: Deal[];
  scenarios: Scenario[];
  selectedDealId: string | null;
  activeScenarioId: string | null;
  onSelectDeal: (deal: Deal | null) => void;
  onSelectScenario: (id: string) => void;
  onNewScenario: (deal: Deal) => void;
  onSaveScenario: (s: Scenario) => void;
  onDeleteScenario: (id: string) => void;
}

const SAVE_DEBOUNCE_MS = 300;

export function UnderwriteView({
  deals,
  scenarios,
  selectedDealId,
  activeScenarioId,
  onSelectDeal,
  onSelectScenario,
  onNewScenario,
  onSaveScenario,
  onDeleteScenario,
}: Props) {
  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedDealId) ?? null,
    [deals, selectedDealId]
  );
  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId]
  );

  // Local working copy of the active scenario, so input edits don't
  // re-render every consumer of `scenarios` on each keystroke. Re-syncs
  // when activeScenarioId changes or when the upstream scenario differs
  // (e.g. a realtime event arrives while not actively editing).
  const [draft, setDraft] = useState<Scenario | null>(activeScenario);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(activeScenario);
  }, [activeScenarioId, activeScenario?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute live results from the draft (synchronous, every render).
  const liveResults: ScenarioResults | null = useMemo(() => {
    if (!draft) return null;
    try {
      return runScenario(draft.inputs as ScenarioInputs, draft.globals as Globals);
    } catch (err) {
      console.error('runScenario failed:', err);
      return null;
    }
  }, [draft]);

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

  // Cleanup pending save when unmounting / switching scenarios.
  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, []);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DealPicker deals={deals} selectedId={selectedDealId} onSelect={onSelectDeal} />
      </div>

      {!selectedDeal ? (
        <EmptyDealState />
      ) : (
        <>
          <ScenarioTabs
            scenarios={scenarios}
            activeId={activeScenarioId}
            onSelect={onSelectScenario}
            onNew={() => onNewScenario(selectedDeal)}
            onDelete={onDeleteScenario}
          />

          {!draft ? (
            <EmptyScenarioState dealName={selectedDeal.dealName} onNew={() => onNewScenario(selectedDeal)} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
              <InputsPanel
                inputs={draft.inputs as ScenarioInputs}
                globals={draft.globals as Globals}
                onInputsChange={handleInputsChange}
                onGlobalsChange={handleGlobalsChange}
              />
              <div className="flex flex-col gap-4 min-w-0">
                {liveResults && (
                  <>
                    <HeadlineCard name={draft.name} results={liveResults} />
                    <WaterfallChart waterfall={liveResults.waterfall} />
                    <AnnualSchedule results={liveResults} />
                    <CashFlowSchedule
                      inputs={draft.inputs as ScenarioInputs}
                      results={liveResults}
                    />
                  </>
                )}
              </div>
            </div>
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
        Choose a prospect or executed deal from the dropdown above. The scenarios you save here
        sync to Supabase and stay attached to that deal.
      </p>
    </div>
  );
}

function EmptyScenarioState({ dealName, onNew }: { dealName: string; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 bg-bg-elevated rounded-2xl shadow-soft">
      <p className="text-base font-semibold text-fg">No scenarios yet for {dealName}</p>
      <p className="text-sm text-fg-muted mt-1 max-w-md">
        Create your first scenario — it'll auto-fill from the deal's target rent, term, TI, and free rent.
      </p>
      <button
        onClick={onNew}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
      >
        New scenario
      </button>
    </div>
  );
}
