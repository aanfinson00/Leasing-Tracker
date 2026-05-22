-- ───────────────────────────────────────────────────────────────────
-- Bump-outs + space IDs.
-- Applied 2026-05-22 ~08:00 UTC via the Supabase MCP.
--
-- bump_outs: array of { id, side, offsetFt, widthFt, depthFt, name,
--   spaceId } records. Each bump-out is a rectangle attached to one
--   side of the parent building, extending OUTWARD. Rendered as its
--   own fill-extrusion feature alongside the main building bays.
--
-- bay_space_ids: parallel array to the bay slicing. Element i is the
--   Space ID assigned to bay i (null = use the auto-format
--   {projectId}-B{buildingOrdinal}-S{i+1}).
--
-- building_ordinal: 1-indexed position of this building within its
--   project. Assigned at creation by the app.
-- ───────────────────────────────────────────────────────────────────

alter table public.buildings
  add column if not exists bump_outs jsonb not null default '[]'::jsonb,
  add column if not exists bay_space_ids jsonb not null default '[]'::jsonb,
  add column if not exists building_ordinal integer;

create index if not exists idx_buildings_project_ordinal
  on public.buildings (project_id, building_ordinal);
