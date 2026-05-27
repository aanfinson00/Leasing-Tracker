-- ───────────────────────────────────────────────────────────────────
-- Finalize fields captured at promote time + cached monthly cashflow.
-- See src/lib/lease-math/cashflow.ts for the math; the JSON column is
-- a cached projection keyed by the source inputs above it.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE rent_roll
  ADD COLUMN IF NOT EXISTS security_deposit       NUMERIC,
  ADD COLUMN IF NOT EXISTS rent_commencement_date DATE,
  ADD COLUMN IF NOT EXISTS cashflow_json          JSONB;
