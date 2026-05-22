// Flattens the buildings table into a list of (project, building, space)
// tuples for use in drawer dropdowns. Honors per-bay overrides in
// `baySpaceIds`; falls back to the autoSpaceId convention for null
// entries so brand-new buildings still pick up a sensible label.

import type { Building } from '../types';
import { autoSpaceId } from '../types';

export interface SpaceOption {
  /** Composite key — the value used in the picker. */
  key: string;
  /** Building UUID (matches rent_roll.building_id). */
  buildingId: string;
  /** Human-readable building label (matches rent_roll.building). */
  buildingName: string;
  /** The space identifier itself (matches rent_roll.space_id). */
  spaceId: string;
  /** Project ID, useful when grouping. */
  projectId: string;
  /** 1-indexed bay number within the building. */
  bayIndex: number;
}

export function listSpaceOptions(buildings: Building[]): SpaceOption[] {
  const out: SpaceOption[] = [];
  for (const b of buildings) {
    const count = b.bayCount ?? 1;
    for (let i = 0; i < count; i++) {
      const override = b.baySpaceIds[i];
      const spaceId =
        override && override.trim() !== ''
          ? override
          : autoSpaceId(b.projectId, b.buildingOrdinal, i);
      out.push({
        key: `${b.id}::${i}`,
        buildingId: b.id,
        buildingName: b.name,
        spaceId,
        projectId: b.projectId,
        bayIndex: i + 1,
      });
    }
  }
  // Sort by project then building name then bay so the dropdown reads
  // top-to-bottom in a sane order.
  out.sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    if (a.buildingName !== b.buildingName)
      return a.buildingName.localeCompare(b.buildingName);
    return a.bayIndex - b.bayIndex;
  });
  return out;
}

/** Find the option matching an existing rent-roll row, if any. */
export function findSpaceOption(
  options: SpaceOption[],
  buildingId: string | null,
  spaceId: string | null
): SpaceOption | null {
  if (!buildingId && !spaceId) return null;
  return (
    options.find(
      (o) =>
        (buildingId == null || o.buildingId === buildingId) &&
        (spaceId == null || o.spaceId === spaceId)
    ) ?? null
  );
}
