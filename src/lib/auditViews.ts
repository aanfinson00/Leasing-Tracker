import type { Building, RentRollRow } from '../types';
import { bumpOutSF } from './map-utils/parametric';

// Total leasable SF of a building = rect footprint + each bump-out's area.
// Mirrors what ProjectDrawer displays per building card.
export function buildingTotalSF(b: Building): number | null {
  if (b.widthFt == null || b.depthFt == null) return null;
  const rectSF = b.widthFt * b.depthFt;
  const bumpsSF = (b.bumpOuts ?? []).reduce((s, bp) => s + bumpOutSF(bp), 0);
  return rectSF + bumpsSF;
}

export interface PhantomSpace {
  row: RentRollRow;
  reason: 'no-space-id' | 'space-id-not-in-any-building';
}

// Rent-roll rows whose spaceId doesn't appear in any building's
// baySpaceIds[]. These are units that exist in the portfolio table
// but have no corresponding bay on the map.
export function findPhantomSpaces(
  rentRoll: RentRollRow[],
  buildings: Building[]
): PhantomSpace[] {
  const knownSpaceIds = new Set<string>();
  for (const b of buildings) {
    for (const sid of b.baySpaceIds ?? []) {
      if (sid) knownSpaceIds.add(sid);
    }
  }
  const out: PhantomSpace[] = [];
  for (const r of rentRoll) {
    if (!r.spaceId) {
      // Vacant placeholder rows often have no spaceId — only flag
      // occupied rows so the audit doesn't drown in setup noise.
      if (r.occupied) out.push({ row: r, reason: 'no-space-id' });
      continue;
    }
    if (!knownSpaceIds.has(r.spaceId)) {
      out.push({ row: r, reason: 'space-id-not-in-any-building' });
    }
  }
  return out;
}

export interface BuildingSFDrift {
  building: Building;
  buildingSF: number;       // computed from geometry
  allocatedSF: number;       // sum of rent_roll.leasableSF linked to this building
  driftSF: number;           // allocatedSF - buildingSF (positive = over-allocated)
  driftPct: number;          // |drift| / buildingSF
  rowCount: number;
}

// Per-building: sum of leasableSF on rent_roll rows linked to that
// building (via buildingId OR spaceId match) compared to the building's
// computed geometry. Returns ONLY buildings with > 1% drift, per
// parce-dict integrity rule #1's tolerance.
export function computeSFDrift(
  rentRoll: RentRollRow[],
  buildings: Building[],
  tolerance = 0.01
): BuildingSFDrift[] {
  const out: BuildingSFDrift[] = [];
  for (const b of buildings) {
    const totalSF = buildingTotalSF(b);
    if (totalSF == null || totalSF <= 0) continue;
    const baySet = new Set((b.baySpaceIds ?? []).filter(Boolean) as string[]);
    const linkedRows = rentRoll.filter(
      (r) =>
        (r.buildingId && r.buildingId === b.id) ||
        (r.spaceId && baySet.has(r.spaceId))
    );
    const allocated = linkedRows.reduce((s, r) => s + (r.leasableSF ?? 0), 0);
    const drift = allocated - totalSF;
    const driftPct = Math.abs(drift) / totalSF;
    if (driftPct > tolerance) {
      out.push({
        building: b,
        buildingSF: totalSF,
        allocatedSF: allocated,
        driftSF: drift,
        driftPct,
        rowCount: linkedRows.length,
      });
    }
  }
  // Most drift first
  out.sort((a, b) => b.driftPct - a.driftPct);
  return out;
}
