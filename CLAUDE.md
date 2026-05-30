# CLAUDE.md — Leasing-Tracker

## Stack
React 19 + TypeScript + Vite + Tailwind v4. Supabase (Postgres + Realtime + anon key). Zod schemas. react-hook-form. @tanstack/react-table. Deployed on Vercel. MCP server at `api/mcp.ts` (Vercel serverless, bearer-token auth).

## Iteration principles — apply when adding any field, table, or feature

### 1. Append-only schema changes
Never rename or drop columns. Only add. Renames are 10× harder than additions once data exists. To "rename," deprecate (`-- DEPRECATED: use new_column`) and add the new column alongside.

### 2. `metadata jsonb` is the escape hatch
Every entity table has `metadata jsonb not null default '{}'::jsonb` (migration `20260530180000`). When you're not sure if a field belongs as a real column yet, put it in `metadata.someKey` and write code against it. Graduate to a proper column once:
- You query/filter against it
- You need indexing or constraints
- It's surfaced in the UI

Example: experimenting with a tenant "expansion intent" score? `deal.metadata.expansionIntent = 0.7` works today, zero migration. Once you actually filter the pipeline by it, `alter table deals add column expansion_intent numeric` + backfill from metadata.

### 3. Optional by default
Every new field starts as `.nullable().optional()` in Zod and `nullable` in Postgres. Old data parses, old code runs. Opt fields into `required` only after the field has earned it.

### 4. Save raw input alongside structured
When ingesting from external sources (voice memo, email, OM PDF), persist the raw form in addition to the structured extract. If extraction logic changes, you can re-parse without losing source. `metadata.sourceMemo`, `metadata.sourceEmailId`, `metadata.rawOcrText` are all reasonable.

### 5. Generate downstream from source-of-truth
Anything derivable should not be hand-maintained.
- Excel template — `scripts/generate-template.ts` derives from buildWorkbook (current).
- Form components — `react-hook-form` lets you wire fields one at a time without breaking existing rows.
- MCP tool input schemas — when refactored, derive from Zod (planned).

## Schema-change checklist
When adding a real column (not just metadata):
1. **Supabase migration** in `supabase/migrations/` — append-only, `add column if not exists` for safety.
2. **Update mapper** in `src/lib/repo/mappers.ts`: Row interface + `toRow()` + `fromRow()`.
3. **Update Zod schema** in `src/types.ts` — always `.nullable().optional()` first.
4. **Update form** if user-editable: drawer JSX + `FormValues` type + `useEffect` reset + `onSubmit`.
5. **Update MCP tool** if surfaced via API (`mcp/tools/*.ts`).
6. **Regenerate Excel template** — `npx tsx scripts/generate-template.ts`.

## Don't touch
- `src/types.ts` UWBasis types — kept for the future comparison tab (PR #47 stripped UI, types stay).
- Pre-existing lint errors (60+) — fix opportunistically, not as standalone work.
- `parce-data-dictionary.xlsx` — reference doc, not source of truth.

## Common tasks
- **Run dev**: `npm run dev` (Vite on default port).
- **Build**: `npm run build` (tsc + vite build).
- **Lint**: `npm run lint`.
- **Generate Excel template**: `npx tsx scripts/generate-template.ts` → drops at `~/Library/Mobile Documents/com~apple~CloudDocs/Claude/leasing-tracker-template.xlsx`.

## Architecture notes
- **Source of truth**: Supabase Postgres. Four primary tables — `deals`, `rent_roll`, `activities`, `onboarding_checklists`. Plus `buildings`, `lease_comps`, `sales_comps`, `development_projects`, `property_tax_appeals`, `acquisition_targets`, `disposition_listings`, `contacts`, `am_pending_items`, `scenarios`.
- **Live sync**: every CRUD handler does optimistic local update + fire-and-forget upsert + realtime sub for other clients' changes.
- **Fallback**: when Supabase env vars are absent, app falls back to Dexie + File System Access (`.xlsx` round-trip).
- **MCP**: hosted at `/api/mcp` on Vercel. 19 tools as of 2026-05-30 (deals, rent_roll, buildings, comps, contacts, tenants, dev projects, acquisitions, dispositions, portfolio summary, search).
