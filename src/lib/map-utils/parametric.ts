// ───────────────────────────────────────────────────────────────────
// Parametric building geometry. Given a center lat/lng, dimensions in
// feet, and rotation in degrees, build the GeoJSON Polygon for a
// rotated rectangle. Uses an equirectangular projection at the center
// latitude so a 1ft-wide step on the ground is 1ft regardless of where
// on the globe the building sits.
//
// "Width" is the dimension along the building's local X axis (which
// becomes east-west when rotation = 0). "Depth" is along local Y
// (north-south at rotation 0). Positive rotation rotates the building
// counter-clockwise on screen.
// ───────────────────────────────────────────────────────────────────

import type { Polygon } from 'geojson';

const FT_TO_M = 0.3048;
const METERS_PER_DEG_LAT = 111_320; // standard WGS84 average

export interface RectangleParams {
  centerLat: number;
  centerLng: number;
  widthFt: number;
  depthFt: number;
  rotationDeg: number;
}

export function rectangleFromCenter(p: RectangleParams): Polygon {
  const widthM = p.widthFt * FT_TO_M;
  const depthM = p.depthFt * FT_TO_M;
  const halfW = widthM / 2;
  const halfD = depthM / 2;

  // Local-frame corners (CCW starting bottom-left when rotation = 0).
  const local: Array<[number, number]> = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];

  const rad = (p.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotated = local.map(([x, y]) => [
    x * cos - y * sin,
    x * sin + y * cos,
  ] as [number, number]);

  const cosLat = Math.cos((p.centerLat * Math.PI) / 180);
  const corners: Array<[number, number]> = rotated.map(([dx, dy]) => [
    p.centerLng + dx / (METERS_PER_DEG_LAT * cosLat),
    p.centerLat + dy / METERS_PER_DEG_LAT,
  ]);
  // Close the ring per GeoJSON spec.
  corners.push([corners[0][0], corners[0][1]]);

  return { type: 'Polygon', coordinates: [corners] };
}

/**
 * Slice a parametric rectangle into N bays along its long (width)
 * axis. Returns N rotated Polygons whose union equals the parent.
 *
 * Used by the renderer to draw demising — each bay extrudes as its
 * own colored block so the demising walls read as real edges between
 * them rather than a single building with painted lines.
 */
export function parametricBays(
  p: RectangleParams,
  bayCount: number
): Polygon[] {
  if (bayCount <= 1) return [rectangleFromCenter(p)];

  const widthM = p.widthFt * FT_TO_M;
  const depthM = p.depthFt * FT_TO_M;
  const halfD = depthM / 2;
  const bayWidthM = widthM / bayCount;

  const rad = (p.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cosLat = Math.cos((p.centerLat * Math.PI) / 180);

  const toLngLat = ([dx, dy]: [number, number]): [number, number] => [
    p.centerLng + dx / (METERS_PER_DEG_LAT * cosLat),
    p.centerLat + dy / METERS_PER_DEG_LAT,
  ];

  const out: Polygon[] = [];
  for (let i = 0; i < bayCount; i++) {
    // Local-frame edges of this bay along the X (width) axis.
    const x0 = -widthM / 2 + i * bayWidthM;
    const x1 = x0 + bayWidthM;
    const local: Array<[number, number]> = [
      [x0, -halfD],
      [x1, -halfD],
      [x1, halfD],
      [x0, halfD],
    ];
    const rotated = local.map(([x, y]) => [
      x * cos - y * sin,
      x * sin + y * cos,
    ] as [number, number]);
    const corners = rotated.map(toLngLat);
    corners.push([corners[0][0], corners[0][1]]);
    out.push({ type: 'Polygon', coordinates: [corners] });
  }
  return out;
}

export const DEFAULT_BUILDING_PARAMS = {
  widthFt: 400,
  depthFt: 200,
  rotationDeg: 0,
  bayCount: 1,
} as const;

// ── Bump-outs ────────────────────────────────────────────────────
// A bump-out is a rectangle attached to one side of the parent
// building, extending OUTWARD (away from the building). It's defined
// in the building's local frame:
//   - building local X axis = width (long axis)
//   - building local Y axis = depth (short axis)
//   - building center = (0, 0)
//   - North side = +Y edge, South = -Y, East = +X, West = -X
//
// Each bump-out gets its own polygon (the union with the main
// building is implicit — the renderer emits both as separate
// features so each can have its own color / Space ID label).

export type BumpOutSide = 'N' | 'S' | 'E' | 'W';

export interface BumpOut {
  id: string;
  side: BumpOutSide;
  /** Distance from the side's "left" corner along the side, in feet.
   *  "Left" is the corner you'd see first looking AT that side from
   *  outside the building. For S side, left = W corner; for N, left
   *  = E corner; for E, left = S corner; for W, left = N corner. */
  offsetFt: number;
  /** Dimension along the side. */
  widthFt: number;
  /** Dimension perpendicular to the side, extending OUTWARD. */
  depthFt: number;
  name?: string | null;
  /** Optional override; falls back to the building's auto-format. */
  spaceId?: string | null;
}

/**
 * Convert a bump-out into a rotated Polygon in lng/lat coords.
 * Building params describe the parent — bump-out positions are
 * resolved relative to that frame and then rotated together.
 */
export function bumpOutPolygon(
  building: RectangleParams,
  bump: Pick<BumpOut, 'side' | 'offsetFt' | 'widthFt' | 'depthFt'>
): Polygon {
  const wM = building.widthFt * FT_TO_M;
  const dM = building.depthFt * FT_TO_M;
  const halfW = wM / 2;
  const halfD = dM / 2;
  const offM = bump.offsetFt * FT_TO_M;
  const bwM = bump.widthFt * FT_TO_M;
  const bdM = bump.depthFt * FT_TO_M;

  // Local-frame rectangle for the bump-out. Coordinates are in
  // building meters before rotation.
  let local: Array<[number, number]>;
  switch (bump.side) {
    case 'N': {
      // North side runs along the +Y edge; "left" (from outside) = +X corner.
      const x1 = halfW - offM;
      const x0 = x1 - bwM;
      const y0 = halfD;
      const y1 = halfD + bdM;
      local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      break;
    }
    case 'S': {
      // South edge -Y; left (from outside) = -X corner.
      const x0 = -halfW + offM;
      const x1 = x0 + bwM;
      const y1 = -halfD;
      const y0 = -halfD - bdM;
      local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      break;
    }
    case 'E': {
      // East edge +X; left (from outside) = -Y corner.
      const y0 = -halfD + offM;
      const y1 = y0 + bwM;
      const x0 = halfW;
      const x1 = halfW + bdM;
      local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      break;
    }
    case 'W': {
      // West edge -X; left (from outside) = +Y corner.
      const y1 = halfD - offM;
      const y0 = y1 - bwM;
      const x1 = -halfW;
      const x0 = -halfW - bdM;
      local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      break;
    }
  }

  const rad = (building.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotated = local.map(([x, y]) => [
    x * cos - y * sin,
    x * sin + y * cos,
  ] as [number, number]);

  const cosLat = Math.cos((building.centerLat * Math.PI) / 180);
  const corners: Array<[number, number]> = rotated.map(([dx, dy]) => [
    building.centerLng + dx / (METERS_PER_DEG_LAT * cosLat),
    building.centerLat + dy / METERS_PER_DEG_LAT,
  ]);
  corners.push([corners[0][0], corners[0][1]]);
  return { type: 'Polygon', coordinates: [corners] };
}

/** Convenience — area of a single bump-out in SF. */
export function bumpOutSF(bump: Pick<BumpOut, 'widthFt' | 'depthFt'>): number {
  return bump.widthFt * bump.depthFt;
}
