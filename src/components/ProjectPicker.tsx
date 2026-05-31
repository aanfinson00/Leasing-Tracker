import { useId, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { Project } from '../types';

interface ProjectPickerProps {
  projects: Project[];
  /** Currently selected project code (e.g. "50"). */
  value: string;
  onChange: (project: Project | null) => void;
  onRequestNew?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Datalist-backed picker for an existing Project. Selecting from the list
 * fires `onChange(project)`; clearing or typing a non-match fires
 * `onChange(null)`. The "+ New" button fires `onRequestNew`.
 *
 * Replaces DealPicker — Project is now the top of the hierarchy
 * (projects.project_code instead of deriving from deal_id).
 */
export function ProjectPicker({
  projects,
  value,
  onChange,
  onRequestNew,
  disabled,
  className,
  placeholder = 'Pick a project by name or code…',
}: ProjectPickerProps) {
  const listId = `project-dl-${useId()}`;

  const options = useMemo(() => {
    return projects
      .map((p) => ({ project: p, label: `${p.name} — ${p.projectCode}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const match = options.find((o) => o.project.projectCode === value);
    return match?.label ?? value;
  }, [value, options]);

  return (
    <div className={`flex items-stretch gap-1.5 ${className ?? ''}`}>
      <input
        list={listId}
        value={selectedLabel}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }
          const byLabel = options.find((o) => o.label === raw);
          if (byLabel) {
            onChange(byLabel.project);
            return;
          }
          const byCode = options.find((o) => o.project.projectCode === raw);
          if (byCode) {
            onChange(byCode.project);
            return;
          }
          onChange(null);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="flex-1 px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft disabled:opacity-50"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.project.id} value={o.label} />
        ))}
      </datalist>
      {onRequestNew && (
        <button
          type="button"
          onClick={onRequestNew}
          disabled={disabled}
          className="px-3 py-2.5 bg-bg rounded-xl text-sm text-fg-muted hover:text-fg hover:bg-bg-hover transition-all shadow-soft flex items-center gap-1 disabled:opacity-50"
          title="Create new project"
        >
          <Plus size={14} />
          New
        </button>
      )}
    </div>
  );
}
