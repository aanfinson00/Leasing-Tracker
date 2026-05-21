import { Check, Pause, X } from 'lucide-react';
import type { DealStatus } from '../types';
import { PIPELINE_ORDER } from '../types';

interface PipelineStepperProps {
  status: DealStatus;
  onChange: (next: DealStatus) => void;
}

// Visual step slots — slot 2 holds two alternatives that share one position.
const STEP_SLOTS: { label: string; statuses: DealStatus[] }[] = [
  { label: 'New Prospect', statuses: ['New Prospect'] },
  { label: 'RFP / Drafting', statuses: ['RFP Requested', 'Drafting Unsolicited'] },
  { label: 'Pending Approval', statuses: ['Proposal Pending Approval'] },
  { label: 'Proposal Sent', statuses: ['Proposal Sent'] },
  { label: 'LOI Negotiations', statuses: ['LOI Negotiations'] },
  { label: 'Lease Negotiations', statuses: ['Lease Negotiations'] },
  { label: 'Executed', statuses: ['Executed'] },
];

const pipelineIndex = (s: DealStatus): number => PIPELINE_ORDER.indexOf(s);

const slotIndexForStatus = (s: DealStatus): number =>
  STEP_SLOTS.findIndex((slot) => slot.statuses.includes(s));

export function PipelineStepper({ status, onChange }: PipelineStepperProps) {
  const isSideState = status === 'On Hold' || status === 'Lost';
  const currentSlot = isSideState ? -1 : slotIndexForStatus(status);

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
        {STEP_SLOTS.map((slot, idx) => {
          const isCompleted = !isSideState && idx < currentSlot;
          const isCurrent = !isSideState && idx === currentSlot;
          const stateCls = isCompleted
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
            : isCurrent
              ? 'bg-accent text-accent-fg border-accent shadow-soft'
              : 'bg-bg-elevated text-fg-muted border-border hover:text-fg hover:border-border-strong';

          // Two-button slot (RFP / Drafting) renders side-by-side mini buttons.
          if (slot.statuses.length > 1) {
            return (
              <div key={slot.label} className="flex flex-col gap-1 min-w-[112px] flex-1">
                <div className="text-[10px] uppercase tracking-wide text-fg-subtle font-medium px-1">
                  {idx + 1} · {slot.label}
                </div>
                <div className="flex gap-1">
                  {slot.statuses.map((s) => {
                    const active = status === s;
                    const completedSub = !isSideState && pipelineIndex(s) < pipelineIndex(status);
                    const subCls = active
                      ? 'bg-accent text-accent-fg border-accent shadow-soft'
                      : completedSub
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-bg-elevated text-fg-muted border-border hover:text-fg hover:border-border-strong';
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onChange(s)}
                        className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium rounded-lg border transition-colors ${subCls}`}
                      >
                        {active || completedSub ? (
                          <Check size={11} strokeWidth={2.5} />
                        ) : null}
                        <span className="truncate">{s.replace('RFP ', '').replace('Drafting ', '')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          const s = slot.statuses[0];
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`flex-1 min-w-[112px] flex flex-col items-start gap-1 px-3 py-2.5 text-left text-[11px] rounded-lg border transition-colors ${stateCls}`}
            >
              <span className="text-[10px] uppercase tracking-wide font-medium opacity-80">
                Step {idx + 1}
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold leading-tight">
                {isCompleted && <Check size={11} strokeWidth={2.5} />}
                {slot.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-fg-subtle uppercase tracking-wide">
          Off-flow
        </span>
        <button
          type="button"
          onClick={() => onChange('On Hold')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            status === 'On Hold'
              ? 'bg-warning/15 text-warning border-warning/40'
              : 'bg-bg-elevated text-fg-muted border-border hover:text-fg hover:border-border-strong'
          }`}
        >
          <Pause size={11} strokeWidth={2.25} />
          On Hold
        </button>
        <button
          type="button"
          onClick={() => onChange('Lost')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            status === 'Lost'
              ? 'bg-danger/15 text-danger border-danger/40'
              : 'bg-bg-elevated text-fg-muted border-border hover:text-fg hover:border-border-strong'
          }`}
        >
          <X size={11} strokeWidth={2.25} />
          Lost
        </button>
      </div>
    </div>
  );
}
