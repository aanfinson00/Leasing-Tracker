import { useState } from 'react';
import type { PropertyTaxAppeal } from '../../types';
import { TaxAppealsSection } from './TaxAppealsSection';
import { TaxAppealDrawer } from './TaxAppealDrawer';

interface AssetMgmtViewProps {
  appeals: PropertyTaxAppeal[];
  onSaveAppeal: (a: PropertyTaxAppeal) => void;
  onDeleteAppeal: (id: string) => void;
}

// Today's date as YYYY-MM-DD for date inputs.
function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function defaultAppeal(): PropertyTaxAppeal {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    buildingId: null,
    building: null,
    parcelNumber: null,
    jurisdiction: null,
    taxYear: new Date().getFullYear(),
    assessedValue: null,
    proposedValue: null,
    marketValue: null,
    status: 'Considering',
    filedDate: null,
    hearingDate: null,
    resolutionDate: null,
    initialAssessedValue: null,
    finalAssessedValue: null,
    estimatedSavings: null,
    consultantName: null,
    consultantFeePct: null,
    consultantFeeDollar: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Sections kept from the original placeholder so the operating playbook
// stays visible above the only "real" data block. As each section gets
// its own table-backed implementation, drop it from this list.
const PLAYBOOK_SECTIONS: Array<[string, string]> = [
  ['Outstanding deliverables', 'LOIs, lease drafts, estoppels, SNDAs, insurance certs — who owes what, due-by date, status.'],
  ['Construction follow-up', 'Punch list items, warranty work, TI completion, deferred scope from delivery.'],
  ['Tenant requests', 'Repairs, signage, parking, hours-of-use approvals — open inquiries with owners.'],
  ['Building monitoring', 'Roof age, HVAC service intervals, sprinkler inspections, expiring permits.'],
  ['Capital / vendor items', 'Open POs, vendor renewals, recurring service contracts, scheduled cap-ex.'],
];

export function AssetMgmtView({
  appeals,
  onSaveAppeal,
  onDeleteAppeal,
}: AssetMgmtViewProps) {
  const [editingAppeal, setEditingAppeal] = useState<PropertyTaxAppeal | null>(null);

  const openNew = () => {
    setEditingAppeal({ ...defaultAppeal(), filedDate: today() });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      {/* Real, data-backed section first — it's the part that does work. */}
      <TaxAppealsSection
        appeals={appeals}
        onSelect={setEditingAppeal}
        onNew={openNew}
      />

      {/* Playbook sections — still placeholders, retained so the operating
          checklist is visible. Each becomes a real section as its data
          model lands (see future tasks for construction-followup,
          tenant-requests, building-monitoring, capital-vendor). */}
      <section className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <h3 className="text-base font-semibold text-fg tracking-tight">
          Operating playbook (placeholders)
        </h3>
        <p className="text-xs text-fg-muted mt-1">
          These sections will each get a real table behind them. Tax appeals went first.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {PLAYBOOK_SECTIONS.map(([title, body]) => (
            <div
              key={title}
              className="rounded-xl border border-dashed border-border p-4 bg-bg/60"
            >
              <p className="text-sm font-medium text-fg">{title}</p>
              <p className="text-xs text-fg-muted mt-1.5">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {editingAppeal && (
        <TaxAppealDrawer
          appeal={editingAppeal}
          onClose={() => setEditingAppeal(null)}
          onSave={onSaveAppeal}
          onDelete={onDeleteAppeal}
        />
      )}
    </div>
  );
}
