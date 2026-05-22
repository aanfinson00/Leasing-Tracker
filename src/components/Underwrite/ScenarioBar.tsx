// Scenario bar mirroring Lease-Calculator's pattern: one pill per
// saved scenario for this deal, each pill has an inline rename input
// plus A/B/Duplicate/Delete actions. The pill highlights when the
// scenario is selected as A or B.
//
// Editing flows: the parent maintains `activeEditingId` (independent
// of A/B selection) — clicking the pill body sets it so InputsPanel
// knows which scenario to edit. Most of the time you'll select one
// scenario as A and have it active for editing; setting B doesn't
// disturb editing focus.

import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Scenario } from '../../types';

interface Props {
  scenarios: Scenario[];
  aId: string | null;
  bId: string | null;
  activeEditingId: string | null;
  onSetA: (id: string) => void;
  onSetB: (id: string) => void;
  onSetEditing: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function ScenarioBar({
  scenarios,
  aId,
  bId,
  activeEditingId,
  onSetA,
  onSetB,
  onSetEditing,
  onRename,
  onDuplicate,
  onDelete,
  onAdd,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Scenarios
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-accent bg-accent-tint hover:bg-accent-soft transition-colors"
        >
          <Plus size={13} strokeWidth={2.25} />
          Add scenario
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {scenarios.map((sc) => {
          const isA = aId === sc.id;
          const isB = bId === sc.id;
          const isEditing = activeEditingId === sc.id;
          const active = isA || isB || isEditing;
          return (
            <div
              key={sc.id}
              onClick={() => onSetEditing(sc.id)}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition-colors cursor-pointer',
                active
                  ? 'border-accent bg-accent-tint'
                  : 'border-border bg-bg-elevated hover:bg-bg-hover',
              ].join(' ')}
              role="button"
              tabIndex={0}
              aria-label={`Edit ${sc.name}`}
            >
              <input
                type="text"
                value={sc.name}
                onChange={(e) => onRename(sc.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Scenario name: ${sc.name}`}
                className={[
                  'h-7 w-32 border-0 bg-transparent px-1 font-medium text-sm focus:outline-none',
                  isEditing ? 'text-fg' : 'text-fg-muted',
                ].join(' ')}
              />
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <PillButton onClick={() => onSetA(sc.id)} active={isA} label="A" title={`Use ${sc.name} as Scenario A`} />
                <PillButton onClick={() => onSetB(sc.id)} active={isB} label="B" title={`Use ${sc.name} as Scenario B`} />
                <IconButton onClick={() => onDuplicate(sc.id)} title="Duplicate">
                  <Copy size={12} strokeWidth={2} />
                </IconButton>
                <IconButton
                  onClick={() => {
                    if (window.confirm(`Delete scenario "${sc.name}"?`)) onDelete(sc.id);
                  }}
                  title="Delete"
                  disabled={scenarios.length <= 1}
                  variant="danger"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PillButton({ onClick, active, label, title }: { onClick: () => void; active: boolean; label: string; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        'inline-flex items-center justify-center h-7 px-2 rounded-md text-xs font-semibold transition-colors',
        active
          ? 'bg-accent text-accent-fg'
          : 'text-fg-muted hover:bg-bg-hover',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function IconButton({
  onClick,
  title,
  disabled = false,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
        disabled
          ? 'opacity-40 cursor-not-allowed text-fg-subtle'
          : variant === 'danger'
            ? 'text-danger hover:bg-danger/10'
            : 'text-fg-muted hover:text-fg hover:bg-bg-hover',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
