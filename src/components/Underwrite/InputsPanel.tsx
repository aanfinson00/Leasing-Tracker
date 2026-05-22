// Faithful port of Lease-Calculator/components/inputs-panel.tsx
// (2026-05-22). Spreadsheet layout — Deal Assumptions (shared
// globals) at the top, then per-section grids where rows = scenarios
// (A, B) and columns = fields. Each cell shows a formatted number /
// date / radio. Cells get colored left borders when the value
// differs across scenarios (green = best for landlord, red = worst,
// neutral primary = differs without clear direction). Inline `!`
// icons surface zod-validation warnings per field.
//
// Editing pattern: every cell calls `onUpdateInput(scenarioId, field,
// value)` — the parent debounces saves to Supabase. Globals fire
// `onUpdateGlobals(patch)` and apply to BOTH scenarios since our
// model snapshots globals per-scenario (no shared globals object).

import { useEffect, useState } from 'react';
import { TriangleAlert, Info } from 'lucide-react';
import type { Globals, ScenarioInputs } from '../../lib/lease-math/types';
import { validateScenario, type Warning } from '../../lib/lease-math/validation';
import { FormattedNumberInput, type NumberFormat } from './FormattedNumberInput';
import { HelpTooltip } from './HelpTooltip';

interface FieldDef {
  field?: keyof ScenarioInputs;
  label: string;
  type?: 'number' | 'date' | 'text';
  percent?: boolean;
  optional?: boolean;
  format?: NumberFormat;
  compute?: (inputs: ScenarioInputs) => number;
  computeFormat?: 'percent' | 'currency' | 'number';
  radio?: { value: string; label: string }[];
  help?: React.ReactNode;
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Square Footage',
    fields: [
      { field: 'projectSF', label: 'Project SF', format: 'sf' },
      { field: 'buildingSF', label: 'Building SF', format: 'sf' },
      { field: 'proposedLeaseSF', label: 'Lease SF', format: 'sf' },
    ],
  },
  {
    title: 'Rent',
    fields: [
      {
        field: 'baseRatePSF',
        label: 'Base Rate ($/SF)',
        format: 'currency',
        help: 'Year-1 contracted base rent per SF (annual). Subsequent years escalate per the Escalation field.',
      },
      {
        field: 'escalation',
        label: 'Escalation (%)',
        percent: true,
        format: 'percent',
        help: 'Annual rent escalation, compounded yearly: rate(year) = Base × (1 + Esc)^(year − 1).',
      },
    ],
  },
  {
    title: 'Concessions',
    fields: [
      {
        field: 'tiAllowancePSF',
        label: 'TI Allowance ($/SF)',
        format: 'currency',
        help: 'Tenant improvement dollars per SF the landlord funds. Paid evenly across TI Duration starting at execution.',
      },
      {
        field: 'additionalTIPSF',
        label: "Add'l TI Amortized ($/SF)",
        format: 'currency',
        help: 'Extra TI above standard allowance. The landlord amortizes it into base rent at the Amortization Rate; raises base rent in paying months and total basis by this $/SF.',
      },
      {
        field: 'tiDurationMonths',
        label: 'TI Duration (mo)',
        format: 'integer',
        help: 'How many months the TI dollars are spread over, starting at execution. 1 = single lump-sum draw.',
      },
      {
        field: 'freeRentMonths',
        label: 'Free Rent (mo)',
        format: 'integer',
        help: 'Months of full base-rent abatement, always front-loaded (months 1..N from commencement). Does not extend the lease term.',
      },
    ],
  },
  {
    title: 'Leasing Commissions',
    fields: [
      {
        field: 'lcLLRepPercent',
        label: 'Landlord Rep (%)',
        percent: true,
        format: 'percent',
      },
      {
        field: 'lcTenantRepPercent',
        label: 'Tenant Rep (%)',
        percent: true,
        format: 'percent',
      },
      {
        label: 'Combined (%)',
        compute: (i) => (i.lcLLRepPercent + i.lcTenantRepPercent) * 100,
        computeFormat: 'percent',
        help: 'Sum of Landlord Rep + Tenant Rep. Applied to contracted rent under both Tiered and Flat calc methods.',
      },
      {
        field: 'lcCalculation',
        label: 'Calc',
        radio: [
          { value: 'tiered', label: 'Tiered' },
          { value: 'flat', label: 'Flat' },
        ],
        help: (
          <>
            <p className="mb-1 font-semibold">How the LC total is calculated against contracted rent.</p>
            <p className="mb-1">
              <span className="font-medium">Tiered:</span> full % on the first 60 PAYING months (free
              rent doesn't count), then half % on paying month 61 onward. Industrial standard.
            </p>
            <p>
              <span className="font-medium">Flat:</span> full % on every paying month, no tier break.
            </p>
          </>
        ),
      },
      {
        field: 'lcStructure',
        label: 'Payment',
        radio: [
          { value: 'split50', label: '50/50' },
          { value: 'upfront', label: 'Upfront' },
        ],
        help: (
          <>
            <p className="mb-1 font-semibold">When the LC dollars actually hit cash flow.</p>
            <p className="mb-1">
              <span className="font-medium">50/50:</span> half at execution, half at commencement (the
              rent-start date — the first paying month). Second half pays even during free rent.
            </p>
            <p>
              <span className="font-medium">Upfront:</span> 100% at execution. Larger early outflow.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Term',
    fields: [
      {
        field: 'leaseTermMonths',
        label: 'Term (mo)',
        format: 'integer',
        help: 'Total lease term in months, INCLUDING any free-rent period. A 130-mo lease with 6 mo free has 124 paying months.',
      },
      {
        field: 'leaseExecutionDate',
        label: 'Execution',
        type: 'date',
        help: (
          <>
            <p className="mb-1 font-semibold">Lease signing date.</p>
            <p>Triggers TI work and the first 50% of LC payment (when LC Payment = 50/50). Should be on or before commencement.</p>
          </>
        ),
      },
      {
        field: 'leaseCommencement',
        label: 'Commencement',
        type: 'date',
        help: (
          <>
            <p className="mb-1 font-semibold">Rent commencement date.</p>
            <p>Free rent (if any) starts here. The second 50% of LC under 50/50 pays here. Must be on or after execution.</p>
          </>
        ),
      },
    ],
  },
];

const BETTER_DIRECTION: Partial<Record<keyof ScenarioInputs, 'higher' | 'lower'>> = {
  baseRatePSF: 'higher',
  escalation: 'higher',
  leaseTermMonths: 'higher',
  tiAllowancePSF: 'lower',
  freeRentMonths: 'lower',
  lcLLRepPercent: 'lower',
  lcTenantRepPercent: 'lower',
};

type DiffStatus = 'best' | 'worst' | 'neutral';

interface Props {
  aId: string;
  aName: string;
  aInputs: ScenarioInputs;
  bId: string;
  bName: string;
  bInputs: ScenarioInputs;
  globals: Globals;
  onUpdateInput: <K extends keyof ScenarioInputs>(
    scenarioId: string,
    field: K,
    value: ScenarioInputs[K]
  ) => void;
  onUpdateGlobals: (patch: Partial<Globals>) => void;
}

export function InputsPanel({
  aId,
  aName,
  aInputs,
  bId,
  bName,
  bInputs,
  globals,
  onUpdateInput,
  onUpdateGlobals,
}: Props) {
  const scenarios = [
    { id: aId, name: aName, inputs: aInputs },
    { id: bId, name: bName, inputs: bInputs },
  ];

  const warningsByScenario: Record<string, Warning[]> = {
    [aId]: validateScenario(aInputs),
    [bId]: validateScenario(bInputs),
  };

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-soft">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Inputs
        </h3>
      </div>
      <div className="px-5 py-2 flex flex-col divide-y divide-border/40">
        <DealAssumptions globals={globals} onUpdate={onUpdateGlobals} />
        <NotesSection scenarios={scenarios} onUpdateInput={onUpdateInput} />
        {SECTIONS.map((section) => (
          <Section
            key={section.title}
            section={section}
            scenarios={scenarios}
            warningsByScenario={warningsByScenario}
            onUpdateInput={onUpdateInput}
          />
        ))}
        <WarningStrip scenarios={scenarios} warningsByScenario={warningsByScenario} />
      </div>
    </div>
  );
}

// ── Deal Assumptions (shared globals) ─────────────────────────────

function DealAssumptions({
  globals,
  onUpdate,
}: {
  globals: Globals;
  onUpdate: (patch: Partial<Globals>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3 first:pt-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        Deal Assumptions · shared
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stack
          label="Current Basis ($/SF)"
          help="Your current project basis per SF before this deal's TI and LC. Land + shell + soft costs rolled up."
        >
          <FormattedNumberInput
            value={globals.projectBasisPSF}
            onChange={(v) => onUpdate({ projectBasisPSF: v ?? 0 })}
            format="currency"
          />
        </Stack>
        <Stack
          label="Discount (%)"
          help="Annual discount rate for present-value calc. Compounded monthly in discounted NER."
        >
          <FormattedNumberInput
            value={globals.discountRate}
            onChange={(v) => onUpdate({ discountRate: v ?? 0 })}
            format="percent"
            percent
          />
        </Stack>
        <Stack
          label="Amortization Rate (%)"
          help="Landlord's annual cost of capital used to amortize Add'l TI into base rent. PMT formula, monthly rests. 0% = straight-line."
        >
          <FormattedNumberInput
            value={globals.amortizationRate}
            onChange={(v) => onUpdate({ amortizationRate: v ?? 0 })}
            format="percent"
            percent
          />
        </Stack>
        <Stack
          label="Cap Rate (%)"
          help="Market exit cap rate. Capitalizes the amortization rent uplift into the value-creation figure."
        >
          <FormattedNumberInput
            value={globals.capRate}
            onChange={(v) => onUpdate({ capRate: v ?? 0 })}
            format="percent"
            percent
          />
        </Stack>
      </div>
    </div>
  );
}

// ── Notes (one textarea per scenario) ─────────────────────────────

function NotesSection({
  scenarios,
  onUpdateInput,
}: {
  scenarios: Array<{ id: string; name: string; inputs: ScenarioInputs }>;
  onUpdateInput: <K extends keyof ScenarioInputs>(
    id: string,
    field: K,
    value: ScenarioInputs[K]
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        Notes
      </div>
      <div className="grid grid-cols-2 gap-2">
        {scenarios.map((sc) => (
          <NotesField
            key={sc.id}
            scenarioId={sc.id}
            name={sc.name}
            value={sc.inputs.notes ?? ''}
            onCommit={(v) => onUpdateInput(sc.id, 'notes', v)}
          />
        ))}
      </div>
    </div>
  );
}

function NotesField({
  scenarioId,
  name,
  value,
  onCommit,
}: {
  scenarioId: string;
  name: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  // Buffer keystrokes locally; commit on blur so the parent doesn't
  // run a calc on every character.
  const [buffer, setBuffer] = useState(value);
  useEffect(() => {
    setBuffer(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[11px] text-fg-muted"
        htmlFor={`notes-${scenarioId}`}
      >
        {name}
      </label>
      <textarea
        id={`notes-${scenarioId}`}
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onBlur={() => {
          if (buffer !== value) onCommit(buffer);
        }}
        placeholder="Assumptions, context, status. Free text — won't affect the math."
        rows={3}
        className="w-full resize-y rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm leading-snug text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
    </div>
  );
}

// ── Per-section grid (fields = columns, scenarios = rows) ─────────

function Section({
  section,
  scenarios,
  warningsByScenario,
  onUpdateInput,
}: {
  section: SectionDef;
  scenarios: Array<{ id: string; name: string; inputs: ScenarioInputs }>;
  warningsByScenario: Record<string, Warning[]>;
  onUpdateInput: <K extends keyof ScenarioInputs>(
    id: string,
    field: K,
    value: ScenarioInputs[K]
  ) => void;
}) {
  const cols = section.fields.length;
  const gridStyle = { gridTemplateColumns: `7.5rem repeat(${cols}, minmax(0, 1fr))` };

  // Compute diff status per (scenarioId, field).
  const diffByScenarioField = new Map<string, Map<keyof ScenarioInputs, DiffStatus>>();
  for (const sc of scenarios) {
    diffByScenarioField.set(sc.id, new Map());
  }
  for (const f of section.fields) {
    if (!f.field) continue;
    const key = f.field;
    const valuesByScenario = scenarios.map((sc) => ({ id: sc.id, value: sc.inputs[key] }));
    const uniqueRendered = new Set(valuesByScenario.map((v) => String(v.value ?? '')));
    if (uniqueRendered.size <= 1) continue;

    const direction = BETTER_DIRECTION[key];
    const numericValues = valuesByScenario
      .map((v) => (typeof v.value === 'number' ? v.value : Number.NaN))
      .filter((n) => Number.isFinite(n));

    if (!direction || numericValues.length !== valuesByScenario.length) {
      for (const v of valuesByScenario) {
        diffByScenarioField.get(v.id)!.set(key, 'neutral');
      }
      continue;
    }

    const bestValue =
      direction === 'higher' ? Math.max(...numericValues) : Math.min(...numericValues);
    const worstValue =
      direction === 'higher' ? Math.min(...numericValues) : Math.max(...numericValues);
    for (const v of valuesByScenario) {
      const n = v.value as number;
      const status: DiffStatus =
        n === bestValue && n !== worstValue
          ? 'best'
          : n === worstValue && n !== bestValue
            ? 'worst'
            : 'neutral';
      diffByScenarioField.get(v.id)!.set(key, status);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 py-3 last:pb-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        {section.title}
      </div>

      {/* Header row — field labels */}
      <div className="grid items-end gap-2" style={gridStyle}>
        <div />
        {section.fields.map((f, idx) => (
          <div
            key={fieldKey(f, idx)}
            className="flex items-center gap-1 text-[11px] text-fg-muted"
          >
            <span>{f.label}</span>
            {f.help && <HelpTooltip>{f.help}</HelpTooltip>}
          </div>
        ))}
      </div>

      {/* One row per scenario */}
      {scenarios.map((sc) => {
        const scenarioWarnings = warningsByScenario[sc.id] ?? [];
        const diffByField = diffByScenarioField.get(sc.id)!;
        return (
          <div key={sc.id} className="grid items-center gap-2" style={gridStyle}>
            <div className="truncate text-sm font-medium text-fg" title={sc.name}>
              {sc.name}
            </div>
            {section.fields.map((f, idx) => (
              <Cell
                key={fieldKey(f, idx)}
                field={f}
                scenarioId={sc.id}
                inputs={sc.inputs}
                warning={f.field ? scenarioWarnings.find((w) => w.field === f.field) : undefined}
                diffStatus={f.field ? diffByField.get(f.field) : undefined}
                onUpdateInput={onUpdateInput}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function fieldKey(f: FieldDef, idx: number): string {
  return f.field ? (f.field as string) : `derived-${idx}-${f.label}`;
}

function Cell({
  field,
  scenarioId,
  inputs,
  warning,
  diffStatus,
  onUpdateInput,
}: {
  field: FieldDef;
  scenarioId: string;
  inputs: ScenarioInputs;
  warning?: Warning;
  diffStatus?: DiffStatus;
  onUpdateInput: <K extends keyof ScenarioInputs>(
    id: string,
    field: K,
    value: ScenarioInputs[K]
  ) => void;
}) {
  // Derived/read-only cell
  if (field.compute) {
    const v = field.compute(inputs);
    let text: string;
    if (field.computeFormat === 'percent') {
      text = `${v.toFixed(2)}%`;
    } else if (field.computeFormat === 'currency') {
      text = `$${v.toFixed(2)}`;
    } else {
      text = String(v);
    }
    return (
      <div className="flex h-8 items-center px-2 text-sm tabular-nums text-fg-muted">
        {text}
      </div>
    );
  }

  // Radio group cell
  if (field.radio && field.field) {
    const key = field.field;
    const current = String(inputs[key] ?? '');
    return (
      <CellWrapper diffStatus={diffStatus}>
        <div className="flex h-8 items-center gap-3">
          {field.radio.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1 text-xs text-fg cursor-pointer">
              <input
                type="radio"
                name={`${scenarioId}-${key}`}
                value={opt.value}
                checked={current === opt.value}
                onChange={() => onUpdateInput(scenarioId, key, opt.value as ScenarioInputs[typeof key])}
                className="accent-accent cursor-pointer"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </CellWrapper>
    );
  }

  const key = field.field;
  if (!key) return null;

  // Date input
  if (field.type === 'date') {
    return (
      <CellWrapper warning={warning} diffStatus={diffStatus}>
        <input
          type="date"
          value={String(inputs[key] ?? '')}
          onChange={(e) => onUpdateInput(scenarioId, key, e.target.value as ScenarioInputs[typeof key])}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="h-8 w-full px-2 text-sm bg-accent/[0.06] border border-accent/30 rounded-md text-fg caret-accent hover:bg-accent/[0.10] hover:border-accent/50 focus:outline-none focus:bg-bg-elevated focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </CellWrapper>
    );
  }

  // Numeric input
  const raw = inputs[key];
  return (
    <CellWrapper warning={warning} diffStatus={diffStatus}>
      <FormattedNumberInput
        value={typeof raw === 'number' ? raw : undefined}
        onChange={(v) =>
          onUpdateInput(scenarioId, key, v as unknown as ScenarioInputs[typeof key])
        }
        format={field.format}
        percent={field.percent ?? false}
        optional={field.optional ?? false}
        placeholder={field.optional ? '—' : undefined}
      />
    </CellWrapper>
  );
}

function CellWrapper({
  warning,
  diffStatus,
  children,
}: {
  warning?: Warning;
  diffStatus?: DiffStatus;
  children: React.ReactNode;
}) {
  const accentColor =
    diffStatus === 'best'
      ? 'border-success'
      : diffStatus === 'worst'
        ? 'border-danger'
        : diffStatus === 'neutral'
          ? 'border-accent'
          : undefined;
  const accent = accentColor
    ? ['-ml-[3px] border-l-2 pl-[1px]', accentColor].join(' ')
    : undefined;

  const isWarn = warning?.severity === 'warn';
  const Icon = isWarn ? TriangleAlert : Info;
  const warnColorClass = isWarn ? 'text-danger' : 'text-fg-muted';

  return (
    <div className={['flex items-center gap-1', accent].filter(Boolean).join(' ')}>
      <div className="flex-1">{children}</div>
      {warning && (
        <span className="group/help relative inline-flex items-center">
          <button
            type="button"
            tabIndex={0}
            aria-label={warning.message}
            className={[
              'inline-flex size-4 items-center justify-center rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60',
              warnColorClass,
            ].join(' ')}
          >
            <Icon className="size-4" />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none invisible absolute right-0 top-full z-30 mt-1 w-64 rounded-md border border-border bg-bg-elevated p-2 text-[11px] leading-tight text-fg shadow-lift opacity-0 transition-opacity group-hover/help:visible group-hover/help:opacity-100 group-focus-within/help:visible group-focus-within/help:opacity-100"
          >
            {warning.message}
          </span>
        </span>
      )}
    </div>
  );
}

function WarningStrip({
  scenarios,
  warningsByScenario,
}: {
  scenarios: Array<{ id: string; name: string }>;
  warningsByScenario: Record<string, Warning[]>;
}) {
  const items = scenarios.flatMap((sc) =>
    (warningsByScenario[sc.id] ?? []).map((w) => ({ scenarioName: sc.name, w }))
  );
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 py-3 last:pb-3">
      <div className="flex flex-col gap-0.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Notices
        </div>
        <div className="text-[10px] text-fg-subtle/80">
          Hover the ! icons in the cells above for details.
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map(({ scenarioName, w }, i) => {
          const isWarn = w.severity === 'warn';
          return (
            <li
              key={`${scenarioName}-${w.field}-${i}`}
              className={[
                'flex items-start gap-1.5 text-xs',
                isWarn ? 'text-danger' : 'text-fg-muted',
              ].join(' ')}
            >
              {isWarn ? (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                <span className="font-medium">{scenarioName}:</span> {w.message}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stack({
  label,
  help,
  children,
}: {
  label: string;
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1 text-[11px] text-fg-muted">
        <span>{label}</span>
        {help && <HelpTooltip>{help}</HelpTooltip>}
      </label>
      {children}
    </div>
  );
}
