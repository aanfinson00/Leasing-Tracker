-- ───────────────────────────────────────────────────────────────────
-- Parametric building dimensions. Buildings are always rectangles
-- defined by:
--   width_ft   — long-axis dimension in feet
--   depth_ft   — short-axis dimension in feet
--   rotation_deg — rotation around center, 0–360
--   center_lat / center_lng — anchor point (where the user clicked)
--
-- footprint jsonb stays as the rendered Polygon, re-derived from
-- (center, W, D, rotation) whenever those change so reads can use a
-- single source of truth.
--
-- All nullable so any legacy traced polygons keep working — those
-- rows just don't have parametric values set.
-- Applied 2026-05-22 ~07:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

alter table public.buildings
  add column if not exists width_ft numeric check (width_ft is null or width_ft > 0),
  add column if not exists depth_ft numeric check (depth_ft is null or depth_ft > 0),
  add column if not exists rotation_deg numeric not null default 0
    check (rotation_deg >= -360 and rotation_deg <= 360),
  add column if not exists center_lat numeric
    check (center_lat is null or (center_lat >= -90 and center_lat <= 90)),
  add column if not exists center_lng numeric
    check (center_lng is null or (center_lng >= -180 and center_lng <= 180));
