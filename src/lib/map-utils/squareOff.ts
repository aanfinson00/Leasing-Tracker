// ───────────────────────────────────────────────────────────────────
// Lifted from PortViz/lib/squareOff.ts on 2026-05-22. Pure utility —
// snaps near-90° corners on a 2D polygon to true right angles.
// Used by squareOffPolygonLngLat to clean up freehand satellite
// tracing of rectilinear industrial buildings.
// ───────────────────────────────────────────────────────────────────

export type Point = readonly [number, number];

const ANGLE_TOLERANCE_DEG = 15;

interface Options {
  /** Edge indices (i means the edge from points[i] -> points[i+1]) to
   * leave untouched. Use for chamfers or intentional diagonals. */
  diagonalEdges?: ReadonlySet<number>;
  /** Override the ±15° default tolerance. */
  toleranceDeg?: number;
}

export function squareOffPolygon(
  points: ReadonlyArray<Point>,
  opts: Options = {}
): Point[] {
  const n = points.length;
  if (n < 4) return points.slice();

  const diagonal = opts.diagonalEdges ?? new Set<number>();
  const tol = opts.toleranceDeg ?? ANGLE_TOLERANCE_DEG;

  const out: [number, number][] = points.map((p) => [p[0], p[1]]);

  for (let i = 0; i < n; i++) {
    const prevEdgeIdx = (i - 1 + n) % n;
    const nextEdgeIdx = i;

    if (diagonal.has(prevEdgeIdx) || diagonal.has(nextEdgeIdx)) continue;

    const prev = out[(i - 1 + n) % n]!;
    const here = out[i]!;
    const next = out[(i + 1) % n]!;

    const incoming = [here[0] - prev[0], here[1] - prev[1]] as const;
    const outgoing = [next[0] - here[0], next[1] - here[1]] as const;

    const angleBetween = angleDeg(incoming, outgoing);
    const target = Math.round(angleBetween / 90) * 90;
    if (Math.abs(angleBetween - target) > tol) continue;
    if (Math.abs(target) !== 90 && Math.abs(target) !== 0 && Math.abs(target) !== 180) {
      continue;
    }

    const dx = here[0] - prev[0];
    const dy = here[1] - prev[1];
    if (Math.abs(dx) > Math.abs(dy)) {
      out[i] = [here[0], prev[1]];
    } else {
      out[i] = [prev[0], here[1]];
    }
  }

  return out;
}

function angleDeg(a: readonly [number, number], b: readonly [number, number]): number {
  const cross = a[0] * b[1] - a[1] * b[0];
  const dot = a[0] * b[0] + a[1] * b[1];
  const rad = Math.atan2(cross, dot);
  return (rad * 180) / Math.PI;
}
