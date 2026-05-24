-- ───────────────────────────────────────────────────────────────────
-- Dev-project pins on the Map tab + Dev Pipeline embed.
-- Mirrors the existing 20260522044414_add_lat_lng_to_deals.sql:
-- nullable numeric lat/lng + a partial index for the populated rows.
--
-- Pins for a dev project are populated by Mapbox geocoding from
-- `address` on first save (when lat/lng are null) and can be
-- drag-overridden on the map.
-- Applied via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

alter table public.development_projects
  add column if not exists lat numeric check (lat is null or (lat >= -90 and lat <= 90)),
  add column if not exists lng numeric check (lng is null or (lng >= -180 and lng <= 180));

create index if not exists idx_dev_projects_geo on public.development_projects (lat, lng)
  where lat is not null and lng is not null;
