import { useId, useMemo } from 'react';
import type { Building } from '../types';
import { listBuildingOptions, type BuildingOption } from '../lib/spaces';

interface BuildingPickerProps {
  buildings: Building[];
  /** Selected dealId — filters the list. */
  dealId: string;
  /** Selected buildingId (UUID). */
  value: string;
  onChange: (b: BuildingOption | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Datalist-backed picker for a Building, filtered by `dealId`. Disabled
 * when no deal is picked or the deal has no buildings.
 */
export function BuildingPicker({
  buildings,
  dealId,
  value,
  onChange,
  disabled,
  className,
}: BuildingPickerProps) {
  const listId = `bldg-dl-${useId()}`;

  const options = useMemo(() => {
    if (!dealId) return [];
    return listBuildingOptions(buildings, { projectId: dealId });
  }, [buildings, dealId]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const match = options.find((o) => o.id === value);
    return match?.name ?? value;
  }, [value, options]);

  const effectiveDisabled = disabled || !dealId || options.length === 0;
  const placeholder = !dealId
    ? 'Pick a deal first…'
    : options.length === 0
      ? 'No buildings on this deal yet'
      : 'Pick a building…';

  return (
    <div className={className}>
      <input
        list={listId}
        value={selectedLabel}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }
          const match = options.find((o) => o.name === raw);
          onChange(match ?? null);
        }}
        placeholder={placeholder}
        disabled={effectiveDisabled}
        autoComplete="off"
        className="w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft disabled:opacity-50"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.id} value={o.name} />
        ))}
      </datalist>
    </div>
  );
}
