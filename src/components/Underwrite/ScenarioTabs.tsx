import { Plus, X } from 'lucide-react';
import type { Scenario } from '../../types';

interface Props {
  scenarios: Scenario[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ScenarioTabs({ scenarios, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {scenarios.map((s) => {
        const active = s.id === activeId;
        return (
          <div
            key={s.id}
            className={[
              'group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-lg text-sm border transition-colors',
              active
                ? 'bg-accent text-accent-fg border-accent shadow-soft'
                : 'bg-bg-elevated text-fg border-border hover:bg-bg-hover/60',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className="font-medium"
            >
              {s.name}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete scenario "${s.name}"?`)) onDelete(s.id);
              }}
              className={[
                'inline-flex items-center justify-center w-5 h-5 rounded-md transition-opacity',
                active
                  ? 'text-accent-fg/70 hover:text-accent-fg hover:bg-white/15'
                  : 'text-fg-subtle hover:text-fg hover:bg-bg-hover opacity-0 group-hover:opacity-100',
              ].join(' ')}
              aria-label={`Delete ${s.name}`}
            >
              <X size={12} strokeWidth={2.25} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-accent bg-accent-tint hover:bg-accent-soft transition-colors"
      >
        <Plus size={14} strokeWidth={2.25} />
        New scenario
      </button>
    </div>
  );
}
