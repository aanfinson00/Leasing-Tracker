-- ───────────────────────────────────────────────────────────────────
-- Metadata jsonb escape hatch on every entity table.
--
-- Applied 2026-05-30 ~18:00 UTC via the Supabase MCP.
--
-- Rationale: when iterating on data models, new fields often start as
-- "I'm not sure if this belongs on the schema yet." Rather than ship
-- a migration for every speculative field, drop it in `metadata` as
-- a JSONB key first. Graduate to a real column once the field has
-- earned it (you query against it, validate it, surface it in the
-- UI). Reduces churn during exploratory phases.
--
-- Convention: `metadata` is always a JSON object (never null), defaults
-- to `{}`. Keys are camelCase to match the rest of the app's API.
--
-- Junction tables (xxx_contacts, xxx_notes, activities, onboarding,
-- mcp_tokens) skipped on purpose — they're glue, not entities.
-- ───────────────────────────────────────────────────────────────────

alter table public.deals
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.rent_roll
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.buildings
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.development_projects
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.property_tax_appeals
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.lease_comps
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.sales_comps
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.acquisition_targets
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.disposition_listings
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.contacts
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.am_pending_items
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.scenarios
  add column if not exists metadata jsonb not null default '{}'::jsonb;
