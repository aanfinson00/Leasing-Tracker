import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import { DEAL_ID_REGEX, DEAL_ID_FORMAT_HINT } from '../types';

interface NewProjectModalProps {
  open: boolean;
  /** Existing deal IDs — used to prevent duplicates. */
  existingDealIds: string[];
  onClose: () => void;
  /** Fires on confirm with the new project's fields. Parent creates the Deal. */
  onConfirm: (project: { dealId: string; dealName: string; market: string }) => void;
}

export function NewProjectModal({
  open,
  existingDealIds,
  onClose,
  onConfirm,
}: NewProjectModalProps) {
  const [dealId, setDealId] = useState('');
  const [dealName, setDealName] = useState('');
  const [market, setMarket] = useState('');

  useEffect(() => {
    if (open) {
      setDealId('');
      setDealName('');
      setMarket('');
    }
  }, [open]);

  if (!open) return null;

  const dealIdOk = DEAL_ID_REGEX.test(dealId);
  const dealIdDup = dealIdOk && existingDealIds.includes(dealId);
  const dealNameOk = dealName.trim().length > 0;
  const formOk = dealIdOk && !dealIdDup && dealNameOk;

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
            <Plus size={18} />
            <h2 className="text-base font-semibold">New project</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-fg-muted mb-4">
          Spawn a new project so subsequent deals, buildings, and rent-roll lines
          can be linked to it.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Deal ID *
            </label>
            <input
              value={dealId}
              onChange={(e) => setDealId(e.target.value.trim())}
              placeholder={DEAL_ID_FORMAT_HINT}
              className="w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft tabular-nums"
            />
            {dealId && !dealIdOk && (
              <p className="text-danger text-xs mt-1">Must be 4 digits (e.g. 5042)</p>
            )}
            {dealIdDup && (
              <p className="text-danger text-xs mt-1">This deal ID already exists</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Project name *
            </label>
            <input
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder="e.g. Lakeshore Industrial Park"
              className="w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Market
            </label>
            <input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="optional"
              className="w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft"
            />
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
            disabled={!formOk}
            onClick={() =>
              onConfirm({ dealId, dealName: dealName.trim(), market: market.trim() })
            }
            className="px-4 py-2 bg-accent rounded-xl text-sm text-accent-fg font-medium shadow-soft hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
