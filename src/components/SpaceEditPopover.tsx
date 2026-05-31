import { useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Space, SpacePosition } from '../types';
import { SpacePositionEnum } from '../types';

interface SpaceEditPopoverProps {
  /** The selected Space being edited. null = disable trigger. */
  space: Space | null;
  /** Disabled if the parent context says so. */
  disabled?: boolean;
  /** Save callback — caller persists. */
  onSave: (updated: Space) => void;
}

/**
 * Tiny inline editor for a Space's position / area_sf / metadata.
 * Triggered by a ✏️ button. The native SpacePicker (datalist) can't host
 * per-option buttons, so this lives next to the picker and edits whatever
 * the picker currently has selected.
 *
 * Metadata is edited as raw JSON (textarea) for simplicity. Most users
 * won't touch it; advanced users can stash arbitrary keys.
 */
export function SpaceEditPopover({ space, disabled, onSave }: SpaceEditPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<SpacePosition | ''>('');
  const [areaSF, setAreaSF] = useState<string>('');
  const [metadataText, setMetadataText] = useState<string>('{}');
  const [metaError, setMetaError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Reset form whenever a different space is selected or popover (re)opens.
  useEffect(() => {
    if (!space || !open) return;
    setPosition(space.position ?? '');
    setAreaSF(space.areaSF == null ? '' : String(space.areaSF));
    setMetadataText(JSON.stringify(space.metadata ?? {}, null, 2));
    setMetaError(null);
  }, [space, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = () => {
    if (!space) return;
    let parsedMetadata: Record<string, unknown> = {};
    try {
      const obj = JSON.parse(metadataText.trim() || '{}');
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        setMetaError('Metadata must be a JSON object');
        return;
      }
      parsedMetadata = obj as Record<string, unknown>;
    } catch {
      setMetaError('Invalid JSON');
      return;
    }
    const areaParsed = areaSF.trim() === '' ? null : Number(areaSF);
    if (areaParsed != null && (!Number.isFinite(areaParsed) || areaParsed <= 0)) {
      setMetaError('Area must be a positive number');
      return;
    }
    onSave({
      ...space,
      position: position === '' ? null : position,
      areaSF: areaParsed,
      metadata: parsedMetadata,
      updatedAt: new Date().toISOString(),
    });
    setOpen(false);
  };

  const triggerDisabled = disabled || !space;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={triggerDisabled}
        title={!space ? 'Pick a space first' : 'Edit space details'}
        className="px-3 py-2.5 bg-bg rounded-xl text-sm text-fg-muted hover:text-fg hover:bg-bg-hover transition-all shadow-soft flex items-center gap-1 disabled:opacity-30"
      >
        <Pencil size={14} />
      </button>
      {open && space && (
        <div
          ref={popoverRef}
          className="absolute right-0 z-40 mt-2 w-80 rounded-2xl bg-bg-elevated shadow-xl p-4 border border-border"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-fg">
              Edit space — <span className="font-mono">{space.code ?? space.id.slice(0, 8)}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-fg-muted hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-medium text-fg-muted mb-1">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as SpacePosition | '')}
                className="w-full px-3 py-2 bg-bg rounded-lg text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">—</option>
                {SpacePositionEnum.options.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-fg-muted mb-1">Area (SF)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={areaSF}
                onChange={(e) => setAreaSF(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full px-3 py-2 bg-bg rounded-lg text-xs text-fg tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-fg-muted mb-1">
                Metadata (JSON)
              </label>
              <textarea
                value={metadataText}
                onChange={(e) => setMetadataText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-bg rounded-lg text-[11px] text-fg font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                spellCheck={false}
              />
              {metaError && (
                <p className="text-danger text-[10px] mt-1">{metaError}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 bg-bg rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-bg-hover transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 bg-accent rounded-lg text-xs text-accent-fg font-medium hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
