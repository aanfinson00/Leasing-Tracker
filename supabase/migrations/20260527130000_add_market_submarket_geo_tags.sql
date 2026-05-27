-- ───────────────────────────────────────────────────────────────────
-- Market / submarket / county / city geo-tag columns.
--
-- Auto-populated at write time by src/lib/geo-tagger.ts on every save
-- that includes lat/lng. Nullable so existing rows aren't broken; a
-- one-shot backfill (scripts/backfill-geo-tags.ts) fills them in.
--
-- `market` already exists on `deals` (free-text, enum-dropdown'd in
-- PR #29). We add submarket/county/city as siblings AND ensure the
-- same four columns exist on dev_projects / acq_targets / dispo_listings
-- so filter logic is identical across all four entities.
--
-- Indexed on (market, submarket) for the filter chips' COUNT lookups.
-- ───────────────────────────────────────────────────────────────────

-- development_projects ---------------------------------------------
ALTER TABLE development_projects
  ADD COLUMN IF NOT EXISTS market    TEXT,
  ADD COLUMN IF NOT EXISTS submarket TEXT,
  ADD COLUMN IF NOT EXISTS county    TEXT,
  ADD COLUMN IF NOT EXISTS city      TEXT;

CREATE INDEX IF NOT EXISTS idx_dev_projects_market    ON development_projects(market);
CREATE INDEX IF NOT EXISTS idx_dev_projects_submarket ON development_projects(submarket);

-- deals — intentionally not tagged in Phase 1 (leasing deals aren't
-- "development opportunities" in the user's vocabulary). Easy to add
-- later: the geo-tagger is entity-agnostic.

-- acquisition_targets ----------------------------------------------
ALTER TABLE acquisition_targets
  ADD COLUMN IF NOT EXISTS market    TEXT,
  ADD COLUMN IF NOT EXISTS submarket TEXT,
  ADD COLUMN IF NOT EXISTS county    TEXT,
  ADD COLUMN IF NOT EXISTS city      TEXT;

CREATE INDEX IF NOT EXISTS idx_acq_targets_market    ON acquisition_targets(market);
CREATE INDEX IF NOT EXISTS idx_acq_targets_submarket ON acquisition_targets(submarket);

-- disposition_listings ---------------------------------------------
ALTER TABLE disposition_listings
  ADD COLUMN IF NOT EXISTS market    TEXT,
  ADD COLUMN IF NOT EXISTS submarket TEXT,
  ADD COLUMN IF NOT EXISTS county    TEXT,
  ADD COLUMN IF NOT EXISTS city      TEXT;

CREATE INDEX IF NOT EXISTS idx_dispo_listings_market    ON disposition_listings(market);
CREATE INDEX IF NOT EXISTS idx_dispo_listings_submarket ON disposition_listings(submarket);
