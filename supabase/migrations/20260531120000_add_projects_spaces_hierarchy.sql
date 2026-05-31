-- ───────────────────────────────────────────────────────────────────
-- Phase 1: Projects + Spaces hierarchy (additive only).
--
-- Promotes "project" (deal_id text) and "space" (space_id text) into
-- first-class tables with uuid FKs. Existing text columns stay for
-- backwards compatibility (indefinite deprecation per agreed plan).
--
-- Net additions:
--   - projects table (project_code unique globally)
--   - spaces table (FK to buildings, self-FK for subdivisions,
--     position enum, parent_space_uuid for split spaces)
--   - project_uuid uuid FKs on: deals, buildings, rent_roll,
--     scenarios, am_pending_items
--   - space_uuid on rent_roll (lease-to-space link)
--   - target_space_uuid on deals (deal-targets-space link)
--   - metadata jsonb escape hatch on entity tables that lacked it
--   - activities.parent_type expanded to allow project / building /
--     space / dev_project / acq_target / dispo_listing / contact
--
-- Backfills projects from distinct (deal_id, deal_name) and links
-- deals.project_uuid back to them. Buildings + rent_roll have 0
-- rows today so no backfill is required there.
-- ───────────────────────────────────────────────────────────────────

-- ── 1. metadata jsonb escape hatch (idempotent) ──────────────────
alter table public.deals      add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.rent_roll  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.buildings  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.activities add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ── 2. projects table ────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  project_code  text not null unique,
  name          text not null,
  address       text,
  market        text,
  submarket     text,
  city          text,
  county        text,
  lat           numeric check (lat is null or (lat >= -90 and lat <= 90)),
  lng           numeric check (lng is null or (lng >= -180 and lng <= 180)),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects: anon all access" on public.projects;
create policy "projects: anon all access" on public.projects
  for all to anon using (true) with check (true);

-- ── 3. spaces table ──────────────────────────────────────────────
create table if not exists public.spaces (
  id                 uuid primary key default gen_random_uuid(),
  building_uuid      uuid not null references public.buildings(id) on delete cascade,
  code               text,
  area_sf            numeric check (area_sf is null or area_sf > 0),
  position           text check (position is null or position in (
                       'Whole Building', 'Center',
                       'N End', 'N Middle',
                       'S End', 'S Middle',
                       'E End', 'E Middle',
                       'W End', 'W Middle',
                       'NE End', 'NE Middle',
                       'NW End', 'NW Middle',
                       'SE End', 'SE Middle',
                       'SW End', 'SW Middle'
                     )),
  bay_index          integer check (bay_index is null or bay_index > 0),
  parent_space_uuid  uuid references public.spaces(id) on delete set null,
  occupied           boolean not null default false,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists spaces_building_uuid_idx       on public.spaces(building_uuid);
create index if not exists spaces_parent_space_uuid_idx   on public.spaces(parent_space_uuid);

alter table public.spaces enable row level security;

drop policy if exists "spaces: anon all access" on public.spaces;
create policy "spaces: anon all access" on public.spaces
  for all to anon using (true) with check (true);

-- ── 4. New uuid FK columns on existing tables ────────────────────
alter table public.deals
  add column if not exists project_uuid       uuid references public.projects(id) on delete set null,
  add column if not exists target_space_uuid  uuid references public.spaces(id)   on delete set null;

alter table public.buildings
  add column if not exists project_uuid uuid references public.projects(id) on delete set null;

alter table public.rent_roll
  add column if not exists project_uuid uuid references public.projects(id) on delete set null,
  add column if not exists space_uuid   uuid references public.spaces(id)   on delete set null;

alter table public.scenarios
  add column if not exists project_uuid uuid references public.projects(id) on delete set null;

alter table public.am_pending_items
  add column if not exists project_uuid uuid references public.projects(id) on delete set null;

create index if not exists deals_project_uuid_idx           on public.deals(project_uuid);
create index if not exists deals_target_space_uuid_idx      on public.deals(target_space_uuid);
create index if not exists buildings_project_uuid_idx       on public.buildings(project_uuid);
create index if not exists rent_roll_project_uuid_idx       on public.rent_roll(project_uuid);
create index if not exists rent_roll_space_uuid_idx         on public.rent_roll(space_uuid);
create index if not exists scenarios_project_uuid_idx       on public.scenarios(project_uuid);
create index if not exists am_pending_items_project_uuid_idx on public.am_pending_items(project_uuid);

-- ── 5. activities.parent_type — polymorphic expansion ────────────
alter table public.activities
  drop constraint if exists activities_parent_type_check;

alter table public.activities
  add constraint activities_parent_type_check
  check (parent_type in (
    'deal', 'rentroll', 'project', 'building', 'space',
    'dev_project', 'acq_target', 'dispo_listing', 'contact'
  ));

-- ── 6. Backfill projects from distinct (deal_id, deal_name) ──────
-- For each unique deal_id, take the most-recent deal_name as the project name.
insert into public.projects (project_code, name)
select
  d.deal_id as project_code,
  (
    select dd.deal_name from public.deals dd
    where dd.deal_id = d.deal_id
    order by dd.created_at desc
    limit 1
  ) as name
from public.deals d
where d.deal_id is not null
group by d.deal_id
on conflict (project_code) do nothing;

-- ── 7. Link deals.project_uuid to the newly-backfilled projects ──
update public.deals d
   set project_uuid = p.id
  from public.projects p
 where d.deal_id = p.project_code
   and d.project_uuid is null;

-- ── 8. Helpful comment for future-readers ────────────────────────
comment on column public.deals.deal_id is
  'DEPRECATED — legacy text project code. New code uses project_uuid (FK to projects.id). Kept indefinitely; safe to read, prefer not to write.';
comment on column public.buildings.project_id is
  'DEPRECATED — legacy text project code. New code uses project_uuid (FK to projects.id). Kept indefinitely; safe to read, prefer not to write.';
comment on column public.deals.space_id is
  'DEPRECATED — legacy text space id. New code uses target_space_uuid (FK to spaces.id). Kept indefinitely.';
comment on column public.rent_roll.space_id is
  'DEPRECATED — legacy text space id. New code uses space_uuid (FK to spaces.id). Kept indefinitely.';
