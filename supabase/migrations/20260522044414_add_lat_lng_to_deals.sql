-- ───────────────────────────────────────────────────────────────────
-- Phase 1 Map tab — pin location per Deal.
-- Applied 2026-05-22 04:44 UTC.
--
-- Phase 2 will add building_outline geojson + height_ft columns for
-- the 3D extrusion drill-down. Deferred until users start dropping
-- pins routinely.
--
-- NOTE on the project model (set in src/components/Map/MapView.tsx):
-- projects = deals grouped by `deal_id`. A pin's lat/lng is
-- denormalized across all deals sharing that deal_id, so any deal-
-- level read returns the same location. Updates write to all deals
-- in the group at once.
-- ───────────────────────────────────────────────────────────────────

alter table public.deals
  add column if not exists lat numeric check (lat is null or (lat >= -90 and lat <= 90)),
  add column if not exists lng numeric check (lng is null or (lng >= -180 and lng <= 180));

create index if not exists idx_deals_geo on public.deals (lat, lng)
  where lat is not null and lng is not null;
