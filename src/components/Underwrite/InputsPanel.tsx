// Inputs panel for the underwriting workspace. Slim, prop-driven —
// no Zustand. The parent owns the scenario; we lift each field edit
// up through onChange so the parent can debounce a save + recompute.
//
// Field groupings mirror Lease-Calculator: SF, Rent, Concessions,
// Leasing Commissions, Term, Globals. Globals live on the scenario
// too (snapshotted per-scenario so editing a default doesn't
// retroactively shift saved scenarios).

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  Globals,
  LCCalculation,
  LCStructure,
  ScenarioInputs,
} from '../../lib/lease-math/types';

interface Props {
  inputs: ScenarioInputs;
  globals: Globals;
  onInputsChange: (next: ScenarioInputs) => void;
  onGlobalsChange: (next: Globals) => void;
}

export function InputsPanel({ inputs, globals, onInputsChange, onGlobalsChange }: Props) {
  const setInput = <K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) =>
    onInputsChange({ ...inputs, [key]: value });
  const setGlobal = <K extends keyof Globals>(key: K, value: Globals[K]) =>
    onGlobalsChange({ ...globals, [key]: value });

  return (
    <div className="flex flex-col gap-3">
      <Group title="Scenario" defaultOpen>
        <TextField label="Name" value={inputs.name} onChange={(v) => setInput('name', v)} />
        <TextField
          label="Deal code"
          value={inputs.dealCode ?? ''}
          onChange={(v) => setInput('dealCode', v)}
          placeholder="optional"
        />
        <TextAreaField
          label="Notes"
          value={inputs.notes ?? ''}
          onChange={(v) => setInput('notes', v)}
          placeholder="Assumptions, status, deal context"
        />
      </Group>

      <Group title="Square Footage">
        <NumField label="Project SF" value={inputs.projectSF} onChange={(v) => setInput('projectSF', v)} />
        <NumField label="Building SF" value={inputs.buildingSF} onChange={(v) => setInput('buildingSF', v)} />
        <NumField label="Lease SF" value={inputs.proposedLeaseSF} onChange={(v) => setInput('proposedLeaseSF', v)} />
      </Group>

      <Group title="Rent" defaultOpen>
        <NumField
          label="Base rate $/SF (Yr 1)"
          value={inputs.baseRatePSF}
          onChange={(v) => setInput('baseRatePSF', v)}
          step={0.05}
        />
        <PercentField
          label="Annual escalation"
          value={inputs.escalation}
          onChange={(v) => setInput('escalation', v)}
        />
      </Group>

      <Group title="Concessions">
        <NumField
          label="TI allowance $/SF"
          value={inputs.tiAllowancePSF}
          onChange={(v) => setInput('tiAllowancePSF', v)}
          step={0.5}
        />
        <NumField
          label="Additional TI $/SF (amortized)"
          value={inputs.additionalTIPSF}
          onChange={(v) => setInput('additionalTIPSF', v)}
          step={0.5}
        />
        <NumField
          label="TI duration (months)"
          value={inputs.tiDurationMonths}
          onChange={(v) => setInput('tiDurationMonths', v)}
          step={1}
        />
        <NumField
          label="Free rent (months)"
          value={inputs.freeRentMonths}
          onChange={(v) => setInput('freeRentMonths', v)}
          step={1}
        />
      </Group>

      <Group title="Leasing Commissions">
        <PercentField
          label="Landlord rep %"
          value={inputs.lcLLRepPercent}
          onChange={(v) => setInput('lcLLRepPercent', v)}
        />
        <PercentField
          label="Tenant rep %"
          value={inputs.lcTenantRepPercent}
          onChange={(v) => setInput('lcTenantRepPercent', v)}
        />
        <SelectField
          label="Calculation"
          value={inputs.lcCalculation}
          onChange={(v) => setInput('lcCalculation', v as LCCalculation)}
          options={[
            { value: 'tiered', label: 'Tiered (full % yrs 1-5, half thereafter)' },
            { value: 'flat', label: 'Flat (full % all years)' },
          ]}
        />
        <SelectField
          label="Payment structure"
          value={inputs.lcStructure}
          onChange={(v) => setInput('lcStructure', v as LCStructure)}
          options={[
            { value: 'split50', label: '50% execution / 50% commencement' },
            { value: 'upfront', label: 'Full at execution' },
          ]}
        />
      </Group>

      <Group title="Term" defaultOpen>
        <NumField
          label="Lease term (months, incl. free rent)"
          value={inputs.leaseTermMonths}
          onChange={(v) => setInput('leaseTermMonths', v)}
          step={1}
        />
        <DateField
          label="Execution date"
          value={inputs.leaseExecutionDate}
          onChange={(v) => setInput('leaseExecutionDate', v)}
        />
        <DateField
          label="Commencement date"
          value={inputs.leaseCommencement}
          onChange={(v) => setInput('leaseCommencement', v)}
        />
      </Group>

      <Group title="Globals (per scenario)">
        <PercentField
          label="Discount rate"
          value={globals.discountRate}
          onChange={(v) => setGlobal('discountRate', v)}
        />
        <NumField
          label="Project basis $/SF"
          value={globals.projectBasisPSF}
          onChange={(v) => setGlobal('projectBasisPSF', v)}
          step={1}
        />
        <NumField
          label="Horizon (months)"
          value={globals.horizonMonths}
          onChange={(v) => setGlobal('horizonMonths', v)}
          step={1}
        />
        <PercentField
          label="Amortization rate"
          value={globals.amortizationRate}
          onChange={(v) => setGlobal('amortizationRate', v)}
        />
        <PercentField
          label="Cap rate"
          value={globals.capRate}
          onChange={(v) => setGlobal('capRate', v)}
        />
      </Group>
    </div>
  );
}

// ── Field primitives ──────────────────────────────────────────────

interface GroupProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Group({ title, defaultOpen = false, children }: GroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-bg-hover/50 transition-colors"
      >
        {open ? <ChevronDown size={15} strokeWidth={2} /> : <ChevronRight size={15} strokeWidth={2} />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          {title}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

const FIELD_INPUT =
  'w-full px-3 py-2 bg-bg rounded-lg text-sm text-fg placeholder:text-fg-subtle ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/50 border border-border ' +
  'transition-colors tabular-nums';

const FIELD_LABEL = 'text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle';

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}

function NumField({ label, value, onChange, step = 0.01 }: NumFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        onChange={(e) => {
          const v = e.target.value === '' ? 0 : Number(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        className={FIELD_INPUT}
      />
    </label>
  );
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  // Stored as decimal (0.03), shown as percent (3).
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label} (%)</span>
      <input
        type="number"
        value={Number.isFinite(value) ? +(value * 100).toFixed(4) : ''}
        step={0.05}
        onChange={(e) => {
          const v = e.target.value === '' ? 0 : Number(e.target.value) / 100;
          onChange(Number.isFinite(v) ? v : 0);
        }}
        className={FIELD_INPUT}
      />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_INPUT}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_INPUT + ' resize-y'}
      />
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_INPUT}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_INPUT}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
