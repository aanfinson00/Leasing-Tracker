// ───────────────────────────────────────────────────────────────────
// Lifted from PortViz/lib/squareOffLngLat.ts on 2026-05-22.
// Right-angle snap for GeoJSON Polygons in WGS84 lng/lat. Wraps
// squareOffPolygon with an equirectangular projection so a "right
// angle on the map" lands at 90° in physical space, not in raw
// lng/lat (which would be skewed away from the equator).
// ───────────────────────────────────────────────────────────────────

import type { Polygon } from 'geojson';
import { squareOffPolygon, type Point } from './squareOff';

export function squareOffPolygonLngLat(
  polygon: Polygon,
  toleranceDeg = 10
): Polygon {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 5) return polygon;

  // Drop the closing duplicate. squareOffPolygon expects an open ring.
  const open = ring
    .slice(0, -1)
    .map(([lng, lat]) => [lng, lat] as readonly [number, number]);

  // Project to a local equirectangular grid: scale longitude by
  // cos(midLat) so a 90° turn on the map is a 90° turn in our
  // projected space.
  const midLat = open.reduce((sum, [, lat]) => sum + lat, 0) / open.length;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const projected: Point[] = open.map(([lng, lat]) => [lng * cosLat, lat]);

  const snapped = squareOffPolygon(projected, { toleranceDeg });

  // Un-project and re-close.
  const lngLat: Array<[number, number]> = snapped.map(([x, y]) => [
    x / cosLat,
    y,
  ]);
  lngLat.push([lngLat[0]![0], lngLat[0]![1]]);

  return {
    type: 'Polygon',
    coordinates: [lngLat],
  };
}
