-- ───────────────────────────────────────────────────────────────────
-- Space subdivisions — split a single bay's space into multiple
-- leasable sub-spaces (vacant bay → 2 tenants on opposite halves).
--
-- Applied 2026-05-30 ~12:00 UTC via the Supabase MCP.
--
-- space_subdivisions: array of subdivision records. Each entry says
-- "this parent space ID has been split into these child space IDs".
-- The parent disappears from the leasable-space list once split.
--
-- Shape:
--   [
--     { parent_space_id: '5001-B01-S03',
--       child_space_ids: ['5001-B01-S03A', '5001-B01-S03B'] },
--     ...
--   ]
--
-- The bay footprint and building geometry are unaffected — splits
-- are a leasing-identity construct, not a physical subdivision.
-- ───────────────────────────────────────────────────────────────────

alter table public.buildings
  add column if not exists space_subdivisions jsonb not null default '[]'::jsonb;
