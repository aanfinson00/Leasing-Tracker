-- ───────────────────────────────────────────────────────────────────
-- am_pending_items — operating to-do list backing the Asset
-- Management tab's "Pending Items" sections. Each row is one
-- outstanding item across the portfolio: a deliverable owed, a
-- construction follow-up, a tenant request, a building-monitoring
-- task, or a capital/vendor item.
--
-- Powers /construction-followup-watcher and (future) other AM-side
-- watcher skills.
-- Applied 2026-05-22 ~12:00 UTC via the Supabase MCP.
-- ───────────────────────────────────────────────────────────────────

create table public.am_pending_items (
  id uuid primary key,

  item_type text not null,

  title text not null,
  description text,

  building_id text,
  building_name text,
  deal_id text,
  deal_name text,

  owner text,
  status text not null default 'Open',
  priority text not null default 'Medium',
  due_date date,
  completed_date date,

  source text,
  link text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_am_pending_item_type on public.am_pending_items (item_type);
create index idx_am_pending_status on public.am_pending_items (status);
create index idx_am_pending_due_date on public.am_pending_items (due_date);
create index idx_am_pending_building on public.am_pending_items (building_id);

create trigger trg_am_pending_items_updated_at
  before update on public.am_pending_items
  for each row execute function public.set_updated_at();

alter table public.am_pending_items enable row level security;

create policy "anon full access" on public.am_pending_items
  for all to anon
  using (true) with check (true);

alter publication supabase_realtime add table public.am_pending_items;
