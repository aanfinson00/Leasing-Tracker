-- ───────────────────────────────────────────────────────────────────
-- Demising — let each building be sliced into N bays.
-- Applied 2026-05-22 ~06:00 UTC via the Supabase MCP.
--
-- bay_count: number of demising bays. Default 1 (no demising — the
--   building renders as a single 3D block as before).
-- frontage_side: 'N' | 'S' | 'E' | 'W' — which side faces the truck
--   court. Demising lines run perpendicular to it. NULL = auto-detect
--   from the AABB aspect ratio (long side = frontage).
-- ───────────────────────────────────────────────────────────────────

alter table public.buildings
  add column if not exists bay_count integer not null default 1
    check (bay_count > 0 and bay_count <= 50),
  add column if not exists frontage_side text
    check (frontage_side is null or frontage_side in ('N','S','E','W'));
