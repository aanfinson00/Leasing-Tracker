-- ───────────────────────────────────────────────────────────────────
-- Initial Leasing-Tracker schema.
-- Applied 2026-05-22 03:05 UTC via the Supabase MCP — this file is
-- a snapshot for source-control visibility, not a re-runnable script
-- against the live project. Re-apply locally with:
--   supabase db push
--
-- Conventions:
--   - snake_case columns map 1:1 to camelCase fields in src/types.ts
--   - RLS is enabled but policies are open for `anon` — the passcode
--     gate in src/components/LoginGate.tsx is the only access control
--   - Realtime publication on all 4 tables so live editing across
--     tabs/clients just works
-- ───────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── deals ──────────────────────────────────────────────────────────
create table public.deals (
  id uuid primary key,
  deal_name text not null,
  space_id text,
  building text,
  deal_id text,
  min_sf integer,
  max_sf integer,
  prospect_tenant text,
  broker_rep text,
  transaction text,
  status text not null check (status in (
    'New Prospect','RFP Requested','Drafting Unsolicited',
    'Proposal Pending Approval','Proposal Sent','LOI Negotiations',
    'Lease Negotiations','Executed','On Hold','Lost'
  )),
  last_reval_uw_rent numeric,
  target_rent numeric,
  proposed_term_months integer,
  free_rent_months integer,
  ti_per_sf numeric,
  ti_note text,
  probability_pct numeric check (probability_pct is null or (probability_pct >= 0 and probability_pct <= 100)),
  expected_start text,
  last_updated text,
  priority text not null check (priority in ('High','Medium','Low')),
  current_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ── rent_roll ──────────────────────────────────────────────────────
create table public.rent_roll (
  id uuid primary key,
  deal_id text,
  deal_name text,
  building_id text,
  space_id text,
  building text,
  market text,
  property_type text,
  building_type text,
  tenant_name text,
  tenant_rating numeric check (tenant_rating is null or (tenant_rating >= 0 and tenant_rating <= 5)),
  occupied boolean not null default false,
  uw_basis text check (uw_basis is null or uw_basis in ('Actual','Prospective UW')),
  leasable_sf numeric,
  lease_start text,
  lease_term_months numeric,
  lease_end text,
  free_rent_months numeric,
  annual_rent_bumps_pct numeric,
  ti_per_sf numeric,
  ti_note text,
  uw_ti_per_sf numeric,
  spec_office boolean not null default false,
  spec_ti_per_sf numeric,
  commission_structure_pct numeric,
  commission_dollar numeric,
  last_reval_uw_rent numeric,
  starting_annual_rent_psf numeric,
  in_place_rent numeric,
  current_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_rent_roll_updated_at
  before update on public.rent_roll
  for each row execute function public.set_updated_at();

-- ── activities ─────────────────────────────────────────────────────
create table public.activities (
  id uuid primary key,
  parent_type text not null check (parent_type in ('deal','rentroll')),
  parent_id text not null,
  date text not null,
  type text not null check (type in ('note','email-out','email-in','call','meeting','status-change')),
  summary text not null,
  link text,
  author text,
  created_at timestamptz not null default now()
);
create index idx_activities_parent on public.activities (parent_type, parent_id);

-- ── onboarding_checklists ──────────────────────────────────────────
create table public.onboarding_checklists (
  id uuid primary key,
  rent_roll_id text not null,
  template_version integer not null default 1,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_onboarding_updated_at
  before update on public.onboarding_checklists
  for each row execute function public.set_updated_at();
create index idx_onboarding_rent_roll on public.onboarding_checklists (rent_roll_id);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.deals enable row level security;
alter table public.rent_roll enable row level security;
alter table public.activities enable row level security;
alter table public.onboarding_checklists enable row level security;

create policy "anon full access" on public.deals
  for all to anon using (true) with check (true);
create policy "anon full access" on public.rent_roll
  for all to anon using (true) with check (true);
create policy "anon full access" on public.activities
  for all to anon using (true) with check (true);
create policy "anon full access" on public.onboarding_checklists
  for all to anon using (true) with check (true);

-- ── Realtime ───────────────────────────────────────────────────────
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.rent_roll;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.onboarding_checklists;
