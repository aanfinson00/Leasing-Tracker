-- ───────────────────────────────────────────────────────────────────
-- Buildings — drawn polygon footprints attached to a project (the
-- dealId grouping). Rendered as Mapbox fill-extrusion when the user
-- zooms into a project pin in the Map tab.
--
-- Applied 2026-05-22 ~05:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.buildings (
  id uuid primary key,
  project_id text not null,            -- soft link to deals.deal_id
  name text not null default 'Building',
  footprint jsonb not null,            -- GeoJSON Polygon (WGS84)
  height_ft numeric not null default 30 check (height_ft > 0),
  color text,                          -- optional fill override (#hex)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_buildings_project_id on public.buildings (project_id);

create trigger trg_buildings_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();

alter table public.buildings enable row level security;
create policy "anon full access" on public.buildings
  for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.buildings;
