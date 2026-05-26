import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AMPendingItem, PropertyTaxAppeal } from '../../types';
import type { View } from '../Sidebar';
import { TaxAppealsSection } from './TaxAppealsSection';
import { TaxAppealDrawer } from './TaxAppealDrawer';
import { AMPendingSection } from './AMPendingSection';
import { AMPendingItemDrawer } from './AMPendingItemDrawer';
import { ExcelToolbar } from '../ExcelToolbar';

interface AssetMgmtViewProps {
  appeals: PropertyTaxAppeal[];
  onSaveAppeal: (a: PropertyTaxAppeal) => void;
  onDeleteAppeal: (id: string) => void;
  amItems: AMPendingItem[];
  onSaveAMItem: (i: AMPendingItem) => void;
  onDeleteAMItem: (id: string) => void;
  onSendTo?: (item: AMPendingItem, targetView: View) => void;
  onExcelExport?: () => void;
  onExcelImport?: (file: File) => void;
}

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

function defaultAMItem(): AMPendingItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    itemType: 'Deliverable',
    title: '',
    description: null,
    cadence: 'One-Time',
    buildingId: null,
    buildingName: null,
    dealId: null,
    dealName: null,
    owner: null,
    status: 'Open',
    priority: 'Medium',
    dueDate: null,
    completedDate: null,
    source: null,
    link: null,
    sentToTab: null,
    sentToId: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function AssetMgmtView({
  appeals,
  onSaveAppeal,
  onDeleteAppeal,
  amItems,
  onSaveAMItem,
  onDeleteAMItem,
  onSendTo,
  onExcelExport,
  onExcelImport,
}: AssetMgmtViewProps) {
  const [editingAppeal, setEditingAppeal] = useState<PropertyTaxAppeal | null>(null);
  const [editingItem, setEditingItem] = useState<AMPendingItem | null>(null);

  const openNewAppeal = () => {
    setEditingAppeal({ ...defaultAppeal(), filedDate: today() });
  };
  const openNewItem = () => {
    setEditingItem(defaultAMItem());
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              <ShieldCheck size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Asset Management
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {amItems.length} pending items · {appeals.length} tax appeals
              </p>
            </div>
          </div>
          {onExcelExport && onExcelImport && (
            <ExcelToolbar onExport={onExcelExport} onImport={onExcelImport} itemCount={appeals.length + amItems.length} />
          )}
        </div>
      </header>

      <AMPendingSection
        items={amItems}
        onSelect={setEditingItem}
        onNew={openNewItem}
      />

      <TaxAppealsSection
        appeals={appeals}
        onSelect={setEditingAppeal}
        onNew={openNewAppeal}
      />

      {editingAppeal && (
        <TaxAppealDrawer
          appeal={editingAppeal}
          onClose={() => setEditingAppeal(null)}
          onSave={onSaveAppeal}
          onDelete={onDeleteAppeal}
        />
      )}

      {editingItem && (
        <AMPendingItemDrawer
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={onSaveAMItem}
          onDelete={onDeleteAMItem}
          onSendTo={onSendTo ? (item, view) => {
            setEditingItem(null);
            onSendTo(item, view);
          } : undefined}
        />
      )}
    </div>
  );
}
