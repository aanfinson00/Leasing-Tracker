-- ───────────────────────────────────────────────────────────────────
-- Scenarios — underwriting analyses per Deal.
-- Applied 2026-05-22 03:49 UTC. Snapshot of the migration applied via
-- the Supabase MCP.
--
-- inputs / globals / results are jsonb whose shape is defined in
-- src/lib/lease-math/types.ts (ScenarioInputs / Globals /
-- ScenarioResults). Loose typing here keeps math-engine changes
-- from forcing zod-or-DDL migrations.
-- ───────────────────────────────────────────────────────────────────

create table public.scenarios (
  id uuid primary key,
  deal_id text not null,
  name text not null default 'UW',
  inputs jsonb not null,
  globals jsonb not null,
  results jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scenarios_deal_id on public.scenarios (deal_id);

create trigger trg_scenarios_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();

alter table public.scenarios enable row level security;
create policy "anon full access" on public.scenarios
  for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.scenarios;
