# Leasing-Tracker

A leasing pipeline + rent roll tracker for industrial CRE. Live-editable
Excel-style data, backed by Supabase, with realtime sync across tabs and
users.

**Stack:** React 19 + TypeScript + Vite + Tailwind v4. Supabase (Postgres
+ Realtime + anon key). Recharts, react-hook-form + zod, @tanstack/react-table,
xlsx. Deployed on Vercel.

## What it does

- **Prospects** — pipeline of in-flight deals (status, target rent, term,
  free rent, TI, probability, expected start) with per-deal activity log.
- **Rent Roll** — current tenants & spaces, occupancy, lease terms, TI,
  commissions, in-place vs UW rent.
- **Reports** — 6 cross-filtered charts: pipeline forecast, UW vs actual
  rent / TI, lease rollover, market breakdown, occupancy by deal.
- **Onboarding checklists** — auto-spawn on lease execution; per-tenant
  task list grouped by department.
- **Excel import / export** — load an existing workbook to bulk-seed
  Supabase, or export the current state to a fresh `.xlsx`.
- **Shareable URL snapshots** — `#data=…` fragment for showing a frozen
  view to someone without DB access.

## Architecture

- **Source of truth:** Supabase Postgres. Four tables — `deals`,
  `rent_roll`, `activities`, `onboarding_checklists`. RLS is enabled
  with permissive `anon` policies; the passcode gate at the app layer
  is the only access control.
- **Live sync:** every CRUD handler does an optimistic local update +
  fire-and-forget `upsert`/`delete` to Supabase. Realtime subscriptions
  merge other clients' changes into local state within ~1s.
- **Fallback:** if Supabase env vars are absent (e.g. local dev without
  config) the app falls back to a Dexie + File System Access flow,
  saving to a local `.xlsx` in place.

```
src/
├── App.tsx                # state owner, top-level routing
├── types.ts               # zod schemas + types for all 4 entities
├── lib/
│   ├── supabase.ts        # client singleton, SUPABASE_CONFIGURED flag
│   ├── repo/              # per-entity CRUD + realtime subscriptions
│   │   ├── mappers.ts     # camelCase ↔ snake_case + DB row shapes
│   │   ├── deals.ts
│   │   ├── rentRoll.ts
│   │   ├── activities.ts
│   │   └── onboardings.ts
│   ├── excel.ts           # workbook → entities + entities → workbook
│   ├── autosave.ts        # legacy Dexie snapshot (offline fallback)
│   ├── fileHandle.ts      # legacy File System Access reconnect
│   ├── share.ts           # URL-fragment snapshot encode/decode
│   ├── activity.ts        # activity entry constructors
│   └── onboarding.ts      # checklist template + reconcile
└── components/            # tables, drawers, filters, charts
```

## Setup

```bash
git clone https://github.com/aanfinson00/Leasing-Tracker.git
cd Leasing-Tracker
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

## Environment variables

| Variable                    | Required | Notes                                        |
| --------------------------- | -------- | -------------------------------------------- |
| `VITE_SUPABASE_URL`         | yes\*    | Project URL, `https://*.supabase.co`         |
| `VITE_SUPABASE_ANON_KEY`    | yes\*    | Publishable / anon key (safe in bundle)      |
| `VITE_PASSWORD_HASH`        | no       | SHA-256 hex of the passcode. Blank = dev mode |
| `VITE_MAPBOX_TOKEN`         | no\*\*   | Mapbox public token. Map tab shows a missing-token state without it; rest of app works. |

\* Both must be set for Supabase mode. Without them the app runs against
the legacy local-first flow.

Generate `VITE_PASSWORD_HASH`:

```bash
echo -n 'YourPassword' | shasum -a 256
```

## Seeding the database

After applying the migration (already done — see
`supabase/migrations/`), seed from an `.xlsx` workbook matching the
current schema (Prospects + Rent Roll + Activity + Onboarding sheets):

```bash
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
  npx tsx scripts/seed-supabase.ts --file=path/to/workbook.xlsx --reset
```

Flags:
- `--reset` — wipe existing rows before inserting (otherwise upserts in
  place by id; idempotent on re-run).
- `--file=X` — path to the workbook. Defaults to `./sample-leases.xlsx`.

## Security

The passcode gate (`VITE_PASSWORD_HASH`) is **app-layer only**. The
anon Supabase key is in the client bundle, so a determined user with
the bundle can call the API directly and bypass the gate. This is an
explicit trade-off for single-team use; if multi-tenant or external
sharing becomes a concern, swap to Supabase Auth + per-user RLS.

## Scripts

| Command            | What it does                            |
| ------------------ | --------------------------------------- |
| `npm run dev`      | Vite dev server                         |
| `npm run build`    | TypeScript build + Vite production build |
| `npm run preview`  | Preview the production build locally    |
| `npm run lint`     | ESLint                                  |
