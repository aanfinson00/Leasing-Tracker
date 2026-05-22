-- ───────────────────────────────────────────────────────────────────
-- Acquisitions Pipeline data model + CRM links.
--
-- acquisition_targets — opportunities being chased. Sourcing →
-- Pursuing → LOI → PSA → Closing → Closed / Lost / On Hold.
-- Mirrors development_projects shape so the patterns generalize.
--
-- acquisition_target_contacts / _notes — same shape as
-- dev_project_contacts / dev_project_notes from PR #23, just a
-- different parent type.
--
-- Applied 2026-05-22 ~14:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.acquisition_targets (
  id uuid primary key,
  target_name text not null,
  market text,
  address text,
  property_type text,
  status text not null default 'Sourcing',
  acres numeric check (acres is null or acres > 0),
  building_count integer check (building_count is null or building_count > 0),
  total_sf numeric check (total_sf is null or total_sf > 0),
  asking_price numeric check (asking_price is null or asking_price >= 0),
  our_offer numeric check (our_offer is null or our_offer >= 0),
  earnest_money numeric check (earnest_money is null or earnest_money >= 0),
  closing_costs_estimate numeric,
  rehab_budget numeric,
  underwritten_irr numeric,
  underwritten_eqty_multiple numeric,
  first_contacted_date date,
  loi_date date,
  psa_date date,
  expected_closing_date date,
  actual_closing_date date,
  diligence_status jsonb not null default '{}'::jsonb,
  risk_level text default 'Medium',
  status_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_acq_status on public.acquisition_targets (status);
create index idx_acq_market on public.acquisition_targets (market);
create index idx_acq_expected_closing on public.acquisition_targets (expected_closing_date);
create trigger trg_acq_updated_at
  before update on public.acquisition_targets
  for each row execute function public.set_updated_at();
alter table public.acquisition_targets enable row level security;
create policy "anon full access" on public.acquisition_targets
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.acquisition_targets;

create table public.acquisition_target_contacts (
  id uuid primary key,
  acquisition_target_id text not null,
  contact_id text not null,
  role_override text,
  is_primary boolean not null default false,
  link_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_atc_target on public.acquisition_target_contacts (acquisition_target_id);
create index idx_atc_contact on public.acquisition_target_contacts (contact_id);
create unique index idx_atc_unique on public.acquisition_target_contacts (acquisition_target_id, contact_id);
create trigger trg_atc_updated_at
  before update on public.acquisition_target_contacts
  for each row execute function public.set_updated_at();
alter table public.acquisition_target_contacts enable row level security;
create policy "anon full access" on public.acquisition_target_contacts
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.acquisition_target_contacts;

create table public.acquisition_target_notes (
  id uuid primary key,
  acquisition_target_id text not null,
  note_type text not null default 'General',
  event_date date,
  content text not null,
  author text,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_atn_target on public.acquisition_target_notes (acquisition_target_id);
create index idx_atn_event_date on public.acquisition_target_notes (event_date);
create trigger trg_atn_updated_at
  before update on public.acquisition_target_notes
  for each row execute function public.set_updated_at();
alter table public.acquisition_target_notes enable row level security;
create policy "anon full access" on public.acquisition_target_notes
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.acquisition_target_notes;
