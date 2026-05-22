// ───────────────────────────────────────────────────────────────────
// Parametric dock doors. Given a parametric building's RectangleParams
// + frontage side, emit one Polygon per dock door along the frontage
// edge. Each door is a small rectangle extending OUTWARD from the
// building (like a thin bump-out) so it reads as a separate visual
// element rather than a painted line.
//
// Industrial convention: doors on ~30ft centers, 9ft wide, ~3ft deep.
// Building edges are rarely an exact multiple — we center the run of
// doors along the frontage and leave end clearance.
// ───────────────────────────────────────────────────────────────────

import type { Polygon } from 'geojson';
import type { FrontageSide } from './demising';
import type { RectangleParams } from './parametric';

const FT_TO_M = 0.3048;
const METERS_PER_DEG_LAT = 111_320;

export interface DockDoorSpec {
  spacingFt: number;
  widthFt: number;
  depthFt: number;
}

export const DEFAULT_DOCK_SPEC: DockDoorSpec = {
  spacingFt: 60,
  widthFt: 10,
  depthFt: 3,
};

/**
 * Distribute dock doors along the chosen frontage side of a
 * parametric building. Returns N Polygons, each a small rectangle.
 *
 * No bay awareness — doors run across the whole frontage. Callers
 * that want a count per bay can derive it from the bay's frontage
 * length.
 */
export function buildingDockDoors(
  p: RectangleParams,
  frontageSide: FrontageSide,
  spec: DockDoorSpec = DEFAULT_DOCK_SPEC
): Polygon[] {
  const widthM = p.widthFt * FT_TO_M;
  const depthM = p.depthFt * FT_TO_M;
  const halfW = widthM / 2;
  const halfD = depthM / 2;
  const spacingM = spec.spacingFt * FT_TO_M;
  const doorWM = spec.widthFt * FT_TO_M;
  const doorDM = spec.depthFt * FT_TO_M;

  // Resolve which edge the docks ride on, in building-local frame.
  // edgeLen is the length of that frontage edge.
  const edgeLen = frontageSide === 'N' || frontageSide === 'S' ? widthM : depthM;
  // Fewer than 2 doors looks wrong; bump spacing tighter if the edge is short.
  const rawCount = Math.floor(edgeLen / spacingM);
  if (rawCount < 1) return [];

  // Center the run with even end clearance.
  const totalSpan = rawCount * spacingM;
  const startOffset = (edgeLen - totalSpan) / 2 + spacingM / 2;

  const rad = (p.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cosLat = Math.cos((p.centerLat * Math.PI) / 180);

  const toLngLat = ([dx, dy]: [number, number]): [number, number] => [
    p.centerLng + dx / (METERS_PER_DEG_LAT * cosLat),
    p.centerLat + dy / METERS_PER_DEG_LAT,
  ];

  const out: Polygon[] = [];
  for (let i = 0; i < rawCount; i++) {
    // Position along the edge, measured from the edge's local-frame
    // "start" corner.
    const along = startOffset + i * spacingM;

    let local: Array<[number, number]>;
    switch (frontageSide) {
      case 'S': {
        // South edge (y = -halfD), runs along +X axis from -halfW.
        const cx = -halfW + along;
        const x0 = cx - doorWM / 2;
        const x1 = cx + doorWM / 2;
        const y0 = -halfD - doorDM;
        const y1 = -halfD;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
      case 'N': {
        // North edge (y = +halfD), runs along +X axis from -halfW.
        const cx = -halfW + along;
        const x0 = cx - doorWM / 2;
        const x1 = cx + doorWM / 2;
        const y0 = halfD;
        const y1 = halfD + doorDM;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
      case 'E': {
        // East edge (x = +halfW), runs along +Y axis from -halfD.
        const cy = -halfD + along;
        const y0 = cy - doorWM / 2;
        const y1 = cy + doorWM / 2;
        const x0 = halfW;
        const x1 = halfW + doorDM;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
      case 'W': {
        // West edge (x = -halfW), runs along +Y axis from -halfD.
        const cy = -halfD + along;
        const y0 = cy - doorWM / 2;
        const y1 = cy + doorWM / 2;
        const x0 = -halfW - doorDM;
        const x1 = -halfW;
        local = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        break;
      }
    }

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
