-- ───────────────────────────────────────────────────────────────────
-- SharePoint folder URL per deal + per tenant (rent_roll row).
-- Free-text TEXT, nullable, no length cap. Surfaced as an input on the
-- DealDrawer + RentRollDrawer and as a clickable link icon on table rows.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS sharepoint_url TEXT;

ALTER TABLE rent_roll
  ADD COLUMN IF NOT EXISTS sharepoint_url TEXT;
