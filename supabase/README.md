# Supabase schema

Leasing-Tracker uses Supabase as its source of truth (project ID
`tzndcwjnjzjhcgrnnskj`, region us-east-1, free tier).

## Files

```
supabase/
├── README.md                  ← you are here
└── migrations/
    ├── 20260522030556_init_leasing_tracker_schema.sql
    ├── 20260522034939_add_scenarios_table.sql
    └── 20260522044414_add_lat_lng_to_deals.sql
```

These migrations match what's already applied to the live project.
They were originally applied via the Supabase MCP tool from inside
Claude Code; the SQL files in this folder are a source-control
snapshot so the schema is reviewable in the repo.

## Tables

| Table                   | Purpose                                          | RLS              | Realtime |
| ----------------------- | ------------------------------------------------ | ---------------- | -------- |
| `deals`                 | Prospects pipeline (one row per space, grouped by `deal_id` for the project-level Map view) | anon full access | yes      |
| `rent_roll`             | Current tenants & spaces with lease economics    | anon full access | yes      |
| `activities`            | Per-deal / per-rent-roll activity log entries    | anon full access | yes      |
| `onboarding_checklists` | Auto-spawned on lease execution; `items` is jsonb | anon full access | yes      |
| `scenarios`             | A vs B underwriting analyses attached to a deal (`inputs`/`globals`/`results` are jsonb mirroring `src/lib/lease-math/types.ts`) | anon full access | yes      |

## Security note

RLS is enabled but policies are intentionally `for all to anon using (true)`.
The publishable Supabase key is in the client bundle, so anyone with
the bundle can hit the API directly. App-level access control is the
SHA-256 passcode gate in `src/components/LoginGate.tsx`. If multi-
tenant or external sharing becomes a concern, swap to Supabase Auth
with per-user RLS.

## App reads / writes

Every CRUD path goes through the repo modules:

```
src/lib/supabase.ts            ← client singleton + SUPABASE_CONFIGURED flag
src/lib/repo/
├── mappers.ts                 ← camelCase ↔ snake_case + row types
├── deals.ts
├── rentRoll.ts
├── activities.ts
├── onboardings.ts
└── scenarios.ts
```

Each module exports `list*`, `upsert*`, `delete*`, and `subscribe*`
(realtime). App.tsx wires these into the React state with optimistic
local updates + fire-and-forget writes.

## Re-syncing locally

If you ever want to re-apply these from a fresh project:

```bash
# Install Supabase CLI: brew install supabase/tap/supabase
supabase link --project-ref tzndcwjnjzjhcgrnnskj
supabase db push
```
