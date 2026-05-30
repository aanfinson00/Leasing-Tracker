import { useId, useMemo } from 'react';
import { Split } from 'lucide-react';
import type { Building } from '../types';
import { listSpaceOptions, type SpaceOption } from '../lib/spaces';

interface SpacePickerProps {
  buildings: Building[];
  /** Filter the list to this building. */
  buildingId: string;
  /** Selected spaceId. */
  value: string;
  onChange: (opt: SpaceOption | null) => void;
  /** If provided, shows a "Split…" button that fires with the currently-selected spaceId. */
  onRequestSplit?: (parentSpaceId: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Datalist-backed picker for a Space, filtered by `buildingId`. The
 * "Split…" button (when wired) lets the user subdivide the currently
 * selected space into multiple child spaces.
 */
export function SpacePicker({
  buildings,
  buildingId,
  value,
  onChange,
  onRequestSplit,
  disabled,
  className,
}: SpacePickerProps) {
  const listId = `space-dl-${useId()}`;

  const options = useMemo(() => {
    if (!buildingId) return [];
    return listSpaceOptions(buildings, { buildingId });
  }, [buildings, buildingId]);

  const selectedOpt = useMemo(() => {
    if (!value) return null;
    return options.find((o) => o.spaceId === value) ?? null;
  }, [value, options]);

  const effectiveDisabled = disabled || !buildingId || options.length === 0;
  const placeholder = !buildingId
    ? 'Pick a building first…'
    : options.length === 0
      ? 'No spaces in this building'
      : 'Pick a space…';

  // Splitting a subdivision child is disallowed — only split parent (un-split) spaces
  const canSplit =
    !!onRequestSplit && !!selectedOpt && !selectedOpt.isSubdivision;

  return (
    <div className={`flex items-stretch gap-1.5 ${className ?? ''}`}>
      <input
        list={listId}
        value={value}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }
          const match = options.find((o) => o.spaceId === raw);
          onChange(match ?? null);
        }}
        placeholder={placeholder}
        disabled={effectiveDisabled}
        autoComplete="off"
        className="flex-1 px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft tabular-nums disabled:opacity-50"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.key} value={o.spaceId} />
        ))}
      </datalist>
      {onRequestSplit && (
        <button
          type="button"
          onClick={() => selectedOpt && onRequestSplit(selectedOpt.spaceId)}
          disabled={!canSplit}
          className="px-3 py-2.5 bg-bg rounded-xl text-sm text-fg-muted hover:text-fg hover:bg-bg-hover transition-all shadow-soft flex items-center gap-1 disabled:opacity-30"
          title={
            !selectedOpt
              ? 'Pick a space first'
              : selectedOpt.isSubdivision
                ? 'This space is already a subdivision'
                : 'Split this space into multiple sub-spaces'
          }
        >
          <Split size={14} />
          Split
        </button>
      )}
    </div>
  );
}
