-- ───────────────────────────────────────────────────────────────────
-- CRM v1: Contacts + Notes wired into Dev Pipeline.
--
-- First slice of ParceCRM integration. Adopts the Contact + Note
-- shape from ParceCRM's Prisma schema, adapted to Leasing-Tracker's
-- existing soft-link convention. Backs the new ContactsPanel +
-- ActivityLog sections in DevelopmentProjectDrawer.
--
-- Applied 2026-05-22 ~13:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.contacts (
  id uuid primary key,
  contact_type text not null,
  first_name text,
  last_name text,
  company_name text,
  title text,
  phones jsonb not null default '[]'::jsonb,
  emails jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contacts_type on public.contacts (contact_type);
create index idx_contacts_company on public.contacts (company_name);
create index idx_contacts_last_name on public.contacts (last_name);
create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();
alter table public.contacts enable row level security;
create policy "anon full access" on public.contacts
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.contacts;

create table public.dev_project_contacts (
  id uuid primary key,
  dev_project_id text not null,
  contact_id text not null,
  role_override text,
  is_primary boolean not null default false,
  link_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dpc_project on public.dev_project_contacts (dev_project_id);
create index idx_dpc_contact on public.dev_project_contacts (contact_id);
create unique index idx_dpc_unique on public.dev_project_contacts (dev_project_id, contact_id);
create trigger trg_dpc_updated_at
  before update on public.dev_project_contacts
  for each row execute function public.set_updated_at();
alter table public.dev_project_contacts enable row level security;
create policy "anon full access" on public.dev_project_contacts
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.dev_project_contacts;

create table public.dev_project_notes (
  id uuid primary key,
  dev_project_id text not null,
  note_type text not null default 'General',
  event_date date,
  content text not null,
  author text,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dpn_project on public.dev_project_notes (dev_project_id);
create index idx_dpn_event_date on public.dev_project_notes (event_date);
create trigger trg_dpn_updated_at
  before update on public.dev_project_notes
  for each row execute function public.set_updated_at();
alter table public.dev_project_notes enable row level security;
create policy "anon full access" on public.dev_project_notes
  for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.dev_project_notes;
