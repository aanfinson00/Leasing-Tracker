-- ───────────────────────────────────────────────────────────────────
-- Acquisition Targets + Disposition Listings on the Map.
-- Same pattern as 20260524110000_add_lat_lng_to_development_projects.sql:
-- nullable numeric lat/lng + partial geo index for populated rows.
-- Pins are geocoded from `address` on first save (when lat/lng are null)
-- and drag-overridable on the map.
-- Applied via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

alter table public.acquisition_targets
  add column if not exists lat numeric check (lat is null or (lat >= -90 and lat <= 90)),
  add column if not exists lng numeric check (lng is null or (lng >= -180 and lng <= 180));

create index if not exists idx_acq_targets_geo on public.acquisition_targets (lat, lng)
  where lat is not null and lng is not null;

alter table public.disposition_listings
  add column if not exists lat numeric check (lat is null or (lat >= -90 and lat <= 90)),
  add column if not exists lng numeric check (lng is null or (lng >= -180 and lng <= 180));

create index if not exists idx_dispo_listings_geo on public.disposition_listings (lat, lng)
  where lat is not null and lng is not null;
