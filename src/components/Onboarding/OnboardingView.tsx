import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { OnboardingChecklist, OnboardingItem, RentRollRow } from '../../types';
import { OnboardingTable } from './OnboardingTable';
import { OnboardingDrawer } from './OnboardingDrawer';

interface OnboardingViewProps {
  onboardings: OnboardingChecklist[];
  rentRoll: RentRollRow[];
  onUpdateItem: (checklistId: string, itemId: string, patch: Partial<OnboardingItem>) => void;
  onDelete: (id: string) => void;
}

export function OnboardingView({
  onboardings,
  rentRoll,
  onUpdateItem,
  onDelete,
}: OnboardingViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(
    () => (editingId ? onboardings.find((o) => o.id === editingId) ?? null : null),
    [editingId, onboardings]
  );

  const editingRR = useMemo(
    () => (editing ? rentRoll.find((r) => r.id === editing.rentRollId) ?? null : null),
    [editing, rentRoll]
  );

  if (onboardings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-tint text-accent mb-6">
          <ClipboardCheck size={24} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl sm:text-3xl text-fg font-semibold tracking-[-0.02em]">
          No onboardings yet
        </h2>
        <p className="text-base text-fg-muted mt-3 max-w-md leading-relaxed">
          When you promote a prospect to the Rent Roll, we'll automatically
          start a new customer checklist. You can also start one manually from
          any executed Rent Roll row.
        </p>
      </div>
    );
  }

  return (
    <>
      <OnboardingTable
        onboardings={onboardings}
        rentRoll={rentRoll}
        onSelect={setEditingId}
      />
      <OnboardingDrawer
        checklist={editing}
        rentRoll={editingRR}
        onClose={() => setEditingId(null)}
        onUpdateItem={onUpdateItem}
        onDelete={(id) => {
          onDelete(id);
          setEditingId(null);
        }}
      />
    </>
  );
}
