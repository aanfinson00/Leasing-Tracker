// Flattens the buildings table into a list of (project, building, space)
// tuples for use in drawer dropdowns. Honors per-bay overrides in
// `baySpaceIds`; falls back to the autoSpaceId convention for null
// entries so brand-new buildings still pick up a sensible label.
//
// Subdivisions: when a bay's space appears as `parentSpaceId` in the
// building's `spaceSubdivisions`, that parent is dropped from the
// leasable list and replaced with its `childSpaceIds`.

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
  /** True when this option is a subdivision child of a bay's parent space. */
  isSubdivision: boolean;
  /** If subdivision, the parent space ID we descended from. */
  parentSpaceId: string | null;
}

export function listSpaceOptions(
  buildings: Building[],
  filter?: { projectId?: string; buildingId?: string }
): SpaceOption[] {
  const out: SpaceOption[] = [];
  for (const b of buildings) {
    if (filter?.projectId && b.projectId !== filter.projectId) continue;
    if (filter?.buildingId && b.id !== filter.buildingId) continue;
    const subdivisionMap = new Map(
      (b.spaceSubdivisions ?? []).map((s) => [s.parentSpaceId, s.childSpaceIds])
    );
    const count = b.bayCount ?? 1;
    for (let i = 0; i < count; i++) {
      const override = b.baySpaceIds[i];
      const parentSpaceId =
        override && override.trim() !== ''
          ? override
          : autoSpaceId(b.projectId, b.buildingOrdinal, i);

      const children = subdivisionMap.get(parentSpaceId);
      if (children && children.length > 0) {
        for (const child of children) {
          out.push({
            key: `${b.id}::${i}::${child}`,
            buildingId: b.id,
            buildingName: b.name,
            spaceId: child,
            projectId: b.projectId,
            bayIndex: i + 1,
            isSubdivision: true,
            parentSpaceId,
          });
        }
      } else {
        out.push({
          key: `${b.id}::${i}`,
          buildingId: b.id,
          buildingName: b.name,
          spaceId: parentSpaceId,
          projectId: b.projectId,
          bayIndex: i + 1,
          isSubdivision: false,
          parentSpaceId: null,
        });
      }
    }
  }
  out.sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    if (a.buildingName !== b.buildingName)
      return a.buildingName.localeCompare(b.buildingName);
    if (a.bayIndex !== b.bayIndex) return a.bayIndex - b.bayIndex;
    return a.spaceId.localeCompare(b.spaceId);
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

/** Distinct buildings within the buildings array, optionally filtered by project. */
export interface BuildingOption {
  id: string;
  name: string;
  projectId: string;
  buildingOrdinal: number | null;
}

export function listBuildingOptions(
  buildings: Building[],
  filter?: { projectId?: string }
): BuildingOption[] {
  const out: BuildingOption[] = buildings
    .filter((b) => !filter?.projectId || b.projectId === filter.projectId)
    .map((b) => ({
      id: b.id,
      name: b.name,
      projectId: b.projectId,
      buildingOrdinal: b.buildingOrdinal ?? null,
    }));
  out.sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    return (a.buildingOrdinal ?? 0) - (b.buildingOrdinal ?? 0) || a.name.localeCompare(b.name);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Subdivision helpers
// ─────────────────────────────────────────────────────────────────────

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate child space IDs from a parent. Convention: append alpha
 * suffix to the parent ID (e.g. `5001-B01-S03` → `5001-B01-S03A`,
 * `5001-B01-S03B`). Max 26 children.
 */
export function generateChildSpaceIds(parentSpaceId: string, n: number): string[] {
  if (n < 2 || n > 26) {
    throw new Error(`generateChildSpaceIds: n must be in [2, 26], got ${n}`);
  }
  return Array.from({ length: n }, (_, i) => `${parentSpaceId}${ALPHA[i]}`);
}

/**
 * Add a new subdivision to a building (immutable copy). If the parent
 * was already split, the new subdivision replaces the old one.
 */
export function applySubdivision(
  b: Building,
  parentSpaceId: string,
  childSpaceIds: string[]
): Building {
  const filtered = (b.spaceSubdivisions ?? []).filter(
    (s) => s.parentSpaceId !== parentSpaceId
  );
  return {
    ...b,
    spaceSubdivisions: [...filtered, { parentSpaceId, childSpaceIds }],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove a subdivision (un-split a parent space).
 */
export function removeSubdivision(b: Building, parentSpaceId: string): Building {
  return {
    ...b,
    spaceSubdivisions: (b.spaceSubdivisions ?? []).filter(
      (s) => s.parentSpaceId !== parentSpaceId
    ),
    updatedAt: new Date().toISOString(),
  };
}
