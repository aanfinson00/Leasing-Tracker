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
