-- ───────────────────────────────────────────────────────────────────
-- lease_comps — historical lease comp data the user banks to inform
-- ongoing underwriting. One row per signed deal observed in the market.
-- Used in the Lease Calculator tab as a comp reference panel.
-- Applied 2026-05-22 ~10:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.lease_comps (
  id uuid primary key,

  -- What the comp is for
  property_name text,
  building_address text,
  market text,
  property_type text,
  building_type text,

  -- The deal
  tenant_name text,
  tenant_industry text,
  transaction_type text,
  signed_date date,
  delivery_date date,

  -- Economics
  lease_sf numeric check (lease_sf is null or lease_sf > 0),
  building_sf numeric check (building_sf is null or building_sf > 0),
  base_rent_psf numeric check (base_rent_psf is null or base_rent_psf >= 0),
  effective_rent_psf numeric check (effective_rent_psf is null or effective_rent_psf >= 0),
  rent_type text,
  term_months integer check (term_months is null or term_months > 0),
  free_rent_months numeric check (free_rent_months is null or free_rent_months >= 0),
  ti_psf numeric check (ti_psf is null or ti_psf >= 0),
  escalation_pct numeric,
  options text,

  -- Source / provenance
  source text,
  source_url text,
  confidence text default 'Medium',
  confidential boolean not null default false,

  -- Meta
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lease_comps_market on public.lease_comps (market);
create index idx_lease_comps_signed_date on public.lease_comps (signed_date);
create index idx_lease_comps_property_type on public.lease_comps (property_type);

create trigger trg_lease_comps_updated_at
  before update on public.lease_comps
  for each row execute function public.set_updated_at();

alter table public.lease_comps enable row level security;

create policy "anon full access" on public.lease_comps
  for all to anon
  using (true) with check (true);

alter publication supabase_realtime add table public.lease_comps;
