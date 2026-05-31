-- ───────────────────────────────────────────────────────────────────
-- Add lat/lng to comps so they can render on the master map.
--
-- Geocoded automatically from address via Mapbox on save (with manual
-- pin-drag override). Both columns nullable — most legacy comps don't
-- have coordinates yet.
-- ───────────────────────────────────────────────────────────────────

alter table public.lease_comps
  add column if not exists lat numeric check (lat is null or (lat >= -90 and lat <= 90)),
  add column if not exists lng numeric check (lng is null or (lng >= -180 and lng <= 180));

alter table public.sales_comps
  add column if not exists lat numeric check (lat is null or (lat >= -90 and lat <= 90)),
  add column if not exists lng numeric check (lng is null or (lng >= -180 and lng <= 180));
