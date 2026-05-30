import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Split } from 'lucide-react';
import type { Building } from '../types';
import { applySubdivision, generateChildSpaceIds } from '../lib/spaces';

interface SplitSpaceModalProps {
  open: boolean;
  building: Building | null;
  parentSpaceId: string;
  onClose: () => void;
  /** Called with the mutated building after the user confirms. */
  onConfirm: (updated: Building) => void;
}

export function SplitSpaceModal({
  open,
  building,
  parentSpaceId,
  onClose,
  onConfirm,
}: SplitSpaceModalProps) {
  const [n, setN] = useState(2);

  useEffect(() => {
    if (open) setN(2);
  }, [open]);

  if (!open || !building) return null;

  const childIds = generateChildSpaceIds(parentSpaceId, n);

  const handleConfirm = () => {
    const updated = applySubdivision(building, parentSpaceId, childIds);
    onConfirm(updated);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-fg">
            <Split size={18} />
            <h2 className="text-base font-semibold">Split space</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-fg-muted mb-3">
          Splitting <span className="font-mono text-fg">{parentSpaceId}</span> in{' '}
          <span className="font-mono text-fg">{building.name}</span>. The parent space
          disappears from the picker; child spaces take its place.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-fg-muted mb-1.5">
            Number of sub-spaces
          </label>
          <input
            type="number"
            min={2}
            max={26}
            value={n}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v)) setN(Math.max(2, Math.min(26, v)));
            }}
            className="w-24 px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft tabular-nums"
          />
        </div>

        <div className="mb-5">
          <div className="text-xs font-medium text-fg-muted mb-1.5">New child IDs</div>
          <div className="bg-bg rounded-xl p-3 font-mono text-xs text-fg space-y-0.5">
            {childIds.map((id) => (
              <div key={id}>{id}</div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-bg rounded-xl text-sm text-fg-muted hover:text-fg hover:bg-bg-hover transition-all shadow-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-accent rounded-xl text-sm text-accent-fg font-medium shadow-soft hover:opacity-90 transition-opacity"
          >
            Split into {n}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
