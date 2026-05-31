-- ───────────────────────────────────────────────────────────────────
-- GLCP-style UW assumption sets (e.g. "2H25 Reval UW").
--
-- One row per (assumption_set, code). Code is the natural key from the
-- GLCP CSV (e.g. "MiamiMidwa-3-01" = project + building + suite). We
-- store the project_uuid best-effort (matched by name when possible)
-- but keep the raw project_name + tenant_name so the row is meaningful
-- even when no Project record exists yet.
-- ───────────────────────────────────────────────────────────────────

create table if not exists public.uw_assumptions (
  id                            uuid primary key default gen_random_uuid(),
  assumption_set                text not null default '2H25 Reval UW',
  code                          text not null,
  project_uuid                  uuid references public.projects(id) on delete set null,
  project_name_raw              text,
  tenant_name                   text,
  building_code                 text,
  suite_code                    text,
  project_sf                    numeric,
  building_sf                   numeric,
  lease_sf                      numeric,
  trended_rent_psf              numeric,
  lease_term_months             integer,
  start_month_post_completion   integer,
  starting_month                integer,
  start_date                    date,
  free_rent_months              integer,
  tis_psf                       numeric,
  lcs_pct                       numeric,
  lc_override_pct               numeric,
  rent_escalations_pct          numeric,
  status                        text,
  metadata                      jsonb not null default '{}'::jsonb,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (assumption_set, code)
);

create index if not exists uw_assumptions_project_uuid_idx on public.uw_assumptions(project_uuid);
create index if not exists uw_assumptions_set_idx on public.uw_assumptions(assumption_set);

alter table public.uw_assumptions enable row level security;
drop policy if exists "uw_assumptions: anon all access" on public.uw_assumptions;
create policy "uw_assumptions: anon all access" on public.uw_assumptions
  for all to anon using (true) with check (true);
