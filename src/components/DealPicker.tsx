import { useId, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { Deal } from '../types';

interface DealPickerProps {
  deals: Deal[];
  /** Currently selected dealId. */
  value: string;
  onChange: (deal: Deal | null) => void;
  onRequestNew?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Datalist-backed picker for an existing Deal. Selecting from the list
 * fires `onChange(deal)`; clearing or typing a non-match fires
 * `onChange(null)`. The "+ New project" button fires `onRequestNew`.
 *
 * Note: deals without a `dealId` are filtered out (you can't link to
 * what has no project code).
 */
export function DealPicker({
  deals,
  value,
  onChange,
  onRequestNew,
  disabled,
  className,
  placeholder = 'Pick a deal by name or ID…',
}: DealPickerProps) {
  const listId = `deal-dl-${useId()}`;

  const options = useMemo(() => {
    return deals
      .filter((d) => d.dealId && d.dealId.trim() !== '')
      .map((d) => ({
        deal: d,
        label: `${d.dealName} — ${d.dealId}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [deals]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const match = options.find((o) => o.deal.dealId === value);
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
          // Try to match either by label or by raw dealId (4-digit code)
          const byLabel = options.find((o) => o.label === raw);
          if (byLabel) {
            onChange(byLabel.deal);
            return;
          }
          const byId = options.find((o) => o.deal.dealId === raw);
          if (byId) {
            onChange(byId.deal);
            return;
          }
          // Free-typed but no match — leave it pending; parent decides whether to flag
          onChange(null);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="flex-1 px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft disabled:opacity-50"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.deal.id} value={o.label} />
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
