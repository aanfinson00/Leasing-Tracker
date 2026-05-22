-- ───────────────────────────────────────────────────────────────────
-- development_projects — capital projects from site selection through
-- delivery. Replaces the Development Pipeline placeholder tab.
-- Applied 2026-05-22 ~11:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.development_projects (
  id uuid primary key,

  project_name text not null,
  market text,
  address text,

  phase text not null default 'Site Selection',

  total_sf numeric check (total_sf is null or total_sf > 0),
  acres numeric check (acres is null or acres > 0),
  building_count integer check (building_count is null or building_count > 0),

  start_date date,
  expected_delivery_date date,
  actual_delivery_date date,

  total_budget numeric check (total_budget is null or total_budget >= 0),
  spent_to_date numeric check (spent_to_date is null or spent_to_date >= 0),

  pm_name text,
  gc_name text,
  gc_contact text,
  architect text,

  risk_level text default 'Medium',
  status_summary text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dev_projects_phase on public.development_projects (phase);
create index idx_dev_projects_market on public.development_projects (market);
create index idx_dev_projects_expected_delivery on public.development_projects (expected_delivery_date);

create trigger trg_dev_projects_updated_at
  before update on public.development_projects
  for each row execute function public.set_updated_at();

alter table public.development_projects enable row level security;

create policy "anon full access" on public.development_projects
  for all to anon
  using (true) with check (true);

alter publication supabase_realtime add table public.development_projects;
