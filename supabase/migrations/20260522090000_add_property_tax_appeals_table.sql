-- ───────────────────────────────────────────────────────────────────
-- property_tax_appeals — one row per filed/considered appeal for a
-- given property and tax year. Used by:
--   - .claude/skills/property-tax-appeal-intake  (log a new appeal)
--   - .claude/skills/property-tax-appeal-watcher (find upcoming
--     hearings, missing data, stalled appeals)
--   - future Asset Management UI tab
--
-- Multiple appeals per building are possible (one per tax year).
-- Soft link to buildings.id (text to match the existing convention).
-- Applied 2026-05-22 ~09:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.property_tax_appeals (
  id uuid primary key,

  -- Property reference (soft links — both nullable so an appeal can
  -- be drafted before a building/space is created in the system)
  building_id text,
  building text,
  parcel_number text,
  jurisdiction text,

  -- Which tax year is being challenged. Required because the same
  -- property can have multiple appeals open across years.
  tax_year integer not null check (tax_year >= 2000 and tax_year <= 2100),

  -- Valuation triangle: assessor's number vs our proposed vs our
  -- independent market estimate
  assessed_value numeric check (assessed_value is null or assessed_value >= 0),
  proposed_value numeric check (proposed_value is null or proposed_value >= 0),
  market_value numeric check (market_value is null or market_value >= 0),

  -- Status enum (held as text for flexibility — zod schema in
  -- src/types.ts is the canonical list)
  status text not null default 'Considering',

  -- Key dates
  filed_date date,
  hearing_date date,
  resolution_date date,

  -- Settlement outcome
  initial_assessed_value numeric check (initial_assessed_value is null or initial_assessed_value >= 0),
  final_assessed_value numeric check (final_assessed_value is null or final_assessed_value >= 0),
  estimated_savings numeric,

  -- Consultant / attorney
  consultant_name text,
  consultant_fee_pct numeric check (consultant_fee_pct is null or (consultant_fee_pct >= 0 and consultant_fee_pct <= 1)),
  consultant_fee_dollar numeric check (consultant_fee_dollar is null or consultant_fee_dollar >= 0),

  -- Meta
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_property_tax_appeals_building on public.property_tax_appeals (building_id);
create index idx_property_tax_appeals_tax_year on public.property_tax_appeals (tax_year);
create index idx_property_tax_appeals_status on public.property_tax_appeals (status);
create index idx_property_tax_appeals_hearing_date on public.property_tax_appeals (hearing_date);

create trigger trg_property_tax_appeals_updated_at
  before update on public.property_tax_appeals
  for each row execute function public.set_updated_at();

alter table public.property_tax_appeals enable row level security;

create policy "anon full access" on public.property_tax_appeals
  for all to anon
  using (true) with check (true);

alter publication supabase_realtime add table public.property_tax_appeals;
