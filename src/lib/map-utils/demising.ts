// ───────────────────────────────────────────────────────────────────
// Demising — slice a building footprint into N bays perpendicular to
// the long axis. Slimmer port of PortViz/lib/geometry.ts. We slice
// the axis-aligned bounding box rather than the true polygon edges;
// industrial footprints are rectangular enough that this matches
// real demising-wall positions well enough for visualization.
// ───────────────────────────────────────────────────────────────────

import type { Polygon } from 'geojson';

export type FrontageSide = 'N' | 'S' | 'E' | 'W';

export interface Bbox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function footprintBbox(polygon: Polygon): Bbox {
  const ring = polygon.coordinates[0] ?? [];
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, maxLng, minLat, maxLat };
}

/**
 * If the caller doesn't specify a frontage side, treat the LONG axis
 * of the AABB as the frontage (truck-court) side. Demising lines then
 * run perpendicular to the long axis — i.e. each bay has frontage on
 * the long side and a narrow width along it.
 *
 * Equirectangular projection (scale lng by cos(midLat)) so the choice
 * isn't biased by latitude.
 */
export function detectFrontageSide(polygon: Polygon): FrontageSide {
  const bb = footprintBbox(polygon);
  const midLat = (bb.minLat + bb.maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const widthMeters = (bb.maxLng - bb.minLng) * cosLat;
  const heightMeters = bb.maxLat - bb.minLat;
  // Long axis E-W → frontage is N or S (default S, arbitrary).
  // Long axis N-S → frontage is E or W (default E, arbitrary).
  return widthMeters >= heightMeters ? 'S' : 'E';
}

/**
 * Split a footprint into `bayCount` bays. Returns N polygons in
 * order along the frontage axis (ordinal 0 = leftmost / topmost).
 *
 * When bayCount <= 1 the original polygon is returned unchanged.
 */
export function splitFootprintIntoBays(
  footprint: Polygon,
  bayCount: number,
  frontageSide?: FrontageSide | null
): Polygon[] {
  if (bayCount <= 1) return [footprint];

  const { minLng, maxLng, minLat, maxLat } = footprintBbox(footprint);
  const widthLng = maxLng - minLng;
  const heightLat = maxLat - minLat;
  if (widthLng <= 0 || heightLat <= 0) return [footprint];

  const side: FrontageSide = frontageSide ?? detectFrontageSide(footprint);
  const out: Polygon[] = [];

  for (let i = 0; i < bayCount; i++) {
    const start = i / bayCount;
    const end = (i + 1) / bayCount;
    let ring: [number, number][];
    if (side === 'N' || side === 'S') {
      // Long axis is E-W; demising runs N-S; bays arranged left → right.
      const lng0 = minLng + widthLng * start;
      const lng1 = minLng + widthLng * end;
      ring = [
        [lng0, minLat],
        [lng1, minLat],
        [lng1, maxLat],
        [lng0, maxLat],
        [lng0, minLat],
      ];
    } else {
      // Long axis is N-S; demising runs E-W; bays arranged bottom → top.
      const lat0 = minLat + heightLat * start;
      const lat1 = minLat + heightLat * end;
      ring = [
        [minLng, lat0],
        [maxLng, lat0],
        [maxLng, lat1],
        [minLng, lat1],
        [minLng, lat0],
      ];
    }
    out.push({ type: 'Polygon', coordinates: [ring] });
  }
  return out;
}

/**
 * Distinct color palette for adjacent bays so demising reads clearly
 * in the 3D extrusion. Aligned with Leasing-Tracker accent tokens.
 */
export const BAY_COLORS: readonly string[] = [
  '#c96442', // accent
  '#4f8a4d', // success
  '#c98a42', // warning
  '#5b7eb0',
  '#9e6cb2',
  '#5a9c9c',
  '#b06a8a',
];

export function bayColor(ordinal: number): string {
  return BAY_COLORS[ordinal % BAY_COLORS.length]!;
}
