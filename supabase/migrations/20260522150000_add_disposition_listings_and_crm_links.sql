-- ───────────────────────────────────────────────────────────────────
-- Disposition Tracking — sells the user is running. Considering →
-- Underwriting → Marketing → Under Contract → Closed / Pulled.
-- Same template as acquisition_targets from PR #25.
-- Applied 2026-05-22 ~15:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.disposition_listings (
  id uuid primary key,
  asset_name text not null,
  building_id text,
  market text,
  address text,
  property_type text,
  status text not null default 'Considering',
  total_sf numeric check (total_sf is null or total_sf > 0),
  acres numeric check (acres is null or acres > 0),
  occupancy_pct numeric check (occupancy_pct is null or (occupancy_pct >= 0 and occupancy_pct <= 1)),
  trailing_noi numeric,
  forward_noi numeric,
  list_price numeric check (list_price is null or list_price >= 0),
  list_cap_pct numeric,
  achieved_price numeric check (achieved_price is null or achieved_price >= 0),
  achieved_cap_pct numeric,
  net_proceeds numeric,
  broker_commission_pct numeric,
  list_date date,
  bids_due_date date,
  loi_executed_date date,
  psa_executed_date date,
  expected_closing_date date,
  actual_closing_date date,
  risk_level text default 'Medium',
  status_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dispo_status on public.disposition_listings (status);
create index idx_dispo_market on public.disposition_listings (market);
create index idx_dispo_closing on public.disposition_listings (expected_closing_date);
create trigger trg_dispo_updated_at
  before update on public.disposition_listings
  for each row execute function public.set_updated_at();
alter table public.disposition_listings enable row level security;
create policy "anon full access" on public.disposition_listings
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.disposition_listings;

create table public.disposition_listing_contacts (
  id uuid primary key,
  disposition_listing_id text not null,
  contact_id text not null,
  role_override text,
  is_primary boolean not null default false,
  link_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dlc_listing on public.disposition_listing_contacts (disposition_listing_id);
create index idx_dlc_contact on public.disposition_listing_contacts (contact_id);
create unique index idx_dlc_unique on public.disposition_listing_contacts (disposition_listing_id, contact_id);
create trigger trg_dlc_updated_at
  before update on public.disposition_listing_contacts
  for each row execute function public.set_updated_at();
alter table public.disposition_listing_contacts enable row level security;
create policy "anon full access" on public.disposition_listing_contacts
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.disposition_listing_contacts;

create table public.disposition_listing_notes (
  id uuid primary key,
  disposition_listing_id text not null,
  note_type text not null default 'General',
  event_date date,
  content text not null,
  author text,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dln_listing on public.disposition_listing_notes (disposition_listing_id);
create index idx_dln_event_date on public.disposition_listing_notes (event_date);
create trigger trg_dln_updated_at
  before update on public.disposition_listing_notes
  for each row execute function public.set_updated_at();
alter table public.disposition_listing_notes enable row level security;
create policy "anon full access" on public.disposition_listing_notes
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.disposition_listing_notes;
