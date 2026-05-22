// ───────────────────────────────────────────────────────────────────
// Ground-level visual props for buildings — purely cosmetic
// extras that make the 3D view read as a real industrial site
// rather than a bare extrusion:
//
//   - Truck court — concrete pad in front of the frontage edge.
//     One per parametric building, flat (zero/near-zero height).
//   - Trailers — small rectangles representing parked tractor-
//     trailers backed up to a subset of the dock doors. We use
//     real-world dims (53ft trailer x 8.5ft wide) and put one at
//     every Nth dock-door position so the lot doesn't look 100%
//     occupied.
//
// All geometry is derived from RectangleParams + frontageSide; no
// new DB columns needed.
// ───────────────────────────────────────────────────────────────────

import type { Polygon } from 'geojson';
import type { FrontageSide } from './demising';
import type { RectangleParams } from './parametric';
import type { DockDoorSpec } from './dockDoors';
import { DEFAULT_DOCK_SPEC } from './dockDoors';

const FT_TO_M = 0.3048;
const METERS_PER_DEG_LAT = 111_320;

export interface TruckCourtSpec {
  /** Depth of the court extending outward from the frontage, in feet. */
  depthFt: number;
  /** Extra width past either end of the building, in feet. Avoids the
   *  court looking exactly inscribed when there's trailer overhang. */
  overhangFt: number;
}

export const DEFAULT_TRUCK_COURT_SPEC: TruckCourtSpec = {
  depthFt: 130,
  overhangFt: 25,
};

export interface TrailerSpec {
  /** Length of the trailer along the perpendicular-to-frontage axis. */
  lengthFt: number;
  /** Trailer width parallel to the frontage. */
  widthFt: number;
  /** Gap between the back of the trailer and the dock face, in feet. */
  gapFt: number;
  /** Fraction of dock doors that have a trailer (e.g. 0.4 = 40%). */
  occupancy: number;
}

export const DEFAULT_TRAILER_SPEC: TrailerSpec = {
  lengthFt: 53,
  widthFt: 8.5,
  gapFt: 1.5,
  occupancy: 0.45,
};

// ── shared rotation/projection helpers ────────────────────────────

function projectLocal(
  p: RectangleParams,
  cos: number,
  sin: number,
  cosLat: number
) {
  return (local: Array<[number, number]>): Array<[number, number]> => {
    return local.map(([x, y]) => [
      p.centerLng + (x * cos - y * sin) / (METERS_PER_DEG_LAT * cosLat),
      p.centerLat + (x * sin + y * cos) / METERS_PER_DEG_LAT,
    ]);
  };
}

// ── Truck court ───────────────────────────────────────────────────

export function truckCourtPolygon(
  p: RectangleParams,
  frontageSide: FrontageSide,
  spec: TruckCourtSpec = DEFAULT_TRUCK_COURT_SPEC
): Polygon {
  const widthM = p.widthFt * FT_TO_M;
  const depthM = p.depthFt * FT_TO_M;
  const halfW = widthM / 2;
  const halfD = depthM / 2;
  const courtDepth = spec.depthFt * FT_TO_M;
  const overhang = spec.overhangFt * FT_TO_M;

  let local: Array<[number, number]>;
  switch (frontageSide) {
    case 'S':
      local = [
        [-halfW - overhang, -halfD - courtDepth],
        [halfW + overhang, -halfD - courtDepth],
        [halfW + overhang, -halfD],
        [-halfW - overhang, -halfD],
      ];
      break;
    case 'N':
      local = [
        [-halfW - overhang, halfD],
        [halfW + overhang, halfD],
        [halfW + overhang, halfD + courtDepth],
        [-halfW - overhang, halfD + courtDepth],
      ];
      break;
    case 'E':
      local = [
        [halfW, -halfD - overhang],
        [halfW + courtDepth, -halfD - overhang],
        [halfW + courtDepth, halfD + overhang],
        [halfW, halfD + overhang],
      ];
      break;
    case 'W':
      local = [
        [-halfW - courtDepth, -halfD - overhang],
        [-halfW, -halfD - overhang],
        [-halfW, halfD + overhang],
        [-halfW - courtDepth, halfD + overhang],
      ];
      break;
  }

  const rad = (p.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cosLat = Math.cos((p.centerLat * Math.PI) / 180);
  const corners = projectLocal(p, cos, sin, cosLat)(local);
  corners.push([corners[0][0], corners[0][1]]);
  return { type: 'Polygon', coordinates: [corners] };
}

// ── Trailers at dock doors ────────────────────────────────────────

export interface TrailerFeature {
  geometry: Polygon;
  /** 1-indexed dock-door position the trailer is parked at. Useful
   *  for the feature properties / hover labels. */
  dockIndex: number;
}

/**
 * Distribute trailers along the frontage at a subset of the dock-door
 * positions. Each trailer is a rectangle whose short edge butts up to
 * the dock face (with `gapFt` clearance), extending outward by
 * `lengthFt`. We use the same spacing scheme as buildingDockDoors so
 * trailers visually line up with the doors.
 *
 * Deterministic given (building.id, doorCount, occupancy) — we pick
 * trailers at evenly-spaced indices rather than randomly so frames
 * don't flicker between renders.
 */
export function trailersAtDocks(
  p: RectangleParams,
  frontageSide: FrontageSide,
  doorSpec: DockDoorSpec = DEFAULT_DOCK_SPEC,
  trailerSpec: TrailerSpec = DEFAULT_TRAILER_SPEC
): TrailerFeature[] {
  const widthM = p.widthFt * FT_TO_M;
  const depthM = p.depthFt * FT_TO_M;
  const halfW = widthM / 2;
  const halfD = depthM / 2;
  const spacingM = doorSpec.spacingFt * FT_TO_M;
  const edgeLen =
    frontageSide === 'N' || frontageSide === 'S' ? widthM : depthM;
  const doorCount = Math.floor(edgeLen / spacingM);
  if (doorCount < 1) return [];

  const totalSpan = doorCount * spacingM;
  const startOffset = (edgeLen - totalSpan) / 2 + spacingM / 2;

  // Which dock-door indices get a trailer. Even spacing is more
  // pleasing than random and stable across re-renders.
  const occupied = Math.max(
    1,
    Math.round(doorCount * trailerSpec.occupancy)
  );
  const occupiedSet = new Set<number>();
  if (occupied >= doorCount) {
    for (let i = 0; i < doorCount; i++) occupiedSet.add(i);
  } else {
    const step = doorCount / occupied;
    for (let i = 0; i < occupied; i++) {
      occupiedSet.add(Math.floor(i * step));
    }
  }

  const trailerWM = trailerSpec.widthFt * FT_TO_M;
  const trailerLM = trailerSpec.lengthFt * FT_TO_M;
  const gapM = trailerSpec.gapFt * FT_TO_M;

  const rad = (p.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cosLat = Math.cos((p.centerLat * Math.PI) / 180);
  const toLngLat = projectLocal(p, cos, sin, cosLat);

  const out: TrailerFeature[] = [];
  for (let i = 0; i < doorCount; i++) {
    if (!occupiedSet.has(i)) continue;
    const along = startOffset + i * spacingM;

    let local: Array<[number, number]>;
    switch (frontageSide) {
      case 'S': {
        const cx = -halfW + along;
        const x0 = cx - trailerWM / 2;
        const x1 = cx + trailerWM / 2;
        const y0 = -halfD - gapM - trailerLM;
        const y1 = -halfD - gapM;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
      case 'N': {
        const cx = -halfW + along;
        const x0 = cx - trailerWM / 2;
        const x1 = cx + trailerWM / 2;
        const y0 = halfD + gapM;
        const y1 = halfD + gapM + trailerLM;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
      case 'E': {
        const cy = -halfD + along;
        const y0 = cy - trailerWM / 2;
        const y1 = cy + trailerWM / 2;
        const x0 = halfW + gapM;
        const x1 = halfW + gapM + trailerLM;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
      case 'W': {
        const cy = -halfD + along;
        const y0 = cy - trailerWM / 2;
        const y1 = cy + trailerWM / 2;
        const x0 = -halfW - gapM - trailerLM;
        const x1 = -halfW - gapM;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
    }

    const corners = toLngLat(local);
    corners.push([corners[0][0], corners[0][1]]);
    out.push({
      geometry: { type: 'Polygon', coordinates: [corners] },
      dockIndex: i + 1,
    });
  }

  return out;
}
