import { useState } from 'react';
import type { AMPendingItem, PropertyTaxAppeal } from '../../types';
import { TaxAppealsSection } from './TaxAppealsSection';
import { TaxAppealDrawer } from './TaxAppealDrawer';
import { AMPendingSection } from './AMPendingSection';
import { AMPendingItemDrawer } from './AMPendingItemDrawer';

interface AssetMgmtViewProps {
  appeals: PropertyTaxAppeal[];
  onSaveAppeal: (a: PropertyTaxAppeal) => void;
  onDeleteAppeal: (id: string) => void;
  amItems: AMPendingItem[];
  onSaveAMItem: (i: AMPendingItem) => void;
  onDeleteAMItem: (id: string) => void;
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
        />
      )}
    </div>
  );
}
