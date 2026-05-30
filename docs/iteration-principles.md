# Iteration Principles — Leasing-Tracker

Reference doc for keeping the schema and code flexible as the product evolves. Mirrored summary lives in `CLAUDE.md` for auto-loading; full version here.

## 1. Append-only schema changes

**Never rename or drop columns. Only add.** Once a column has data, renaming requires a backfill migration, code updates everywhere it's referenced, and coordination across all running app instances. Adding a new column is one DDL statement + lazy adoption.

When you want to "rename":
1. Add the new column alongside.
2. Backfill via SQL (one migration).
3. Update reads to prefer the new column, fall back to the old.
4. Mark the old column `-- DEPRECATED: use new_column` in a migration comment.
5. Wait several deploys to verify no caller still reads the old column.
6. Then (optionally) drop in a separate migration.

## 2. `metadata jsonb` escape hatch

Every entity table has `metadata jsonb not null default '{}'::jsonb` (migration `20260530180000`). Use this whenever you're not sure if a field belongs as a real column.

**Workflow:**
- Drop the field in `entity.metadata.someKey` with a JSON value.
- Read it via `entity.metadata?.someKey ?? default`.
- No migration needed.
- Use freely while exploring.

**Graduate to a real column when:**
- You query/filter against it server-side.
- You need an index, constraint, or NOT NULL.
- You surface it in the UI with form validation.
- Multiple entities accumulate the same key in metadata.

Don't sprawl. Metadata is a staging area, not a permanent home. Quarterly review of what's in metadata vs what should be promoted is healthy.

## 3. Optional by default

Every new column is `nullable` in Postgres and `.nullable().optional()` in Zod. Every new pydantic field is `Optional[T] = Field(default=None)`. Every new form field is unrequired.

Only opt into "required" after the field has earned it — you have real data, you've used it in production, removing it would actually break something.

## 4. Save raw input alongside structured

When ingesting from external sources, persist the raw form alongside the structured extract:

| External source | Raw stored as | Structured extract |
|---|---|---|
| Voice memo (.m4a) | iCloud Claude folder, `.txt` sibling | Activity log entry, deal notes |
| Email | `metadata.sourceEmail = { id, body, received }` | Activity entry, contact update |
| OM PDF | `metadata.sourcePdfUrl` | Deal + buildings + comps |
| Excel import | The original workbook saved | Parsed rows |
| Lease scan | `metadata.scanUrl` | RentRollRow fields |

If you change the extraction logic later, you can re-parse without losing source.

## 5. Generate downstream from source-of-truth

If you can compute it, don't hand-maintain it.

- **Excel template** — `scripts/generate-template.ts` derives from `buildWorkbook`. Re-run after any schema change.
- **Form components** — react-hook-form lets new fields ship without re-architecting the form. Add to FormValues + drawer JSX in two places.
- **MCP tool input schemas** — currently hand-coded; planned refactor to derive from Zod.
- **Data dictionary** — `parce-data-dictionary.xlsx` exists for reference but is hand-maintained. Plausible candidate to auto-generate from migrations + Zod.

## Schema-change checklist

When adding a real column (graduating from metadata, or starting fresh as a column):

```
☐ 1. Supabase migration in supabase/migrations/
     - timestamp prefix: 20260530HHMMSS
     - add column IF NOT EXISTS — safe to re-run
     - never DROP, never RENAME

☐ 2. Mapper update — src/lib/repo/mappers.ts
     - Add to <Entity>Row interface
     - Add to <entity>ToRow() (camelCase → snake_case)
     - Add to rowTo<Entity>() (snake_case → camelCase)

☐ 3. Zod schema update — src/types.ts
     - Add to <Entity>Schema
     - Always .nullable().optional() first; tighten later if appropriate

☐ 4. Form update (if user-editable) — relevant Drawer.tsx
     - Add to FormValues type
     - Add to useEffect reset block (default '' or whatever)
     - Add input/select in JSX
     - Add to onSubmit parser

☐ 5. MCP tool update (if surfaced) — mcp/tools/<related>.ts
     - Update .select() to include the column
     - Update inputSchema if the field is an input

☐ 6. Regenerate Excel template — npx tsx scripts/generate-template.ts
     - Verify the new column appears in the right sheet
     - Re-drop to iCloud folder
```

## Anti-patterns to avoid

| Anti-pattern | Why it bites you | Do instead |
|---|---|---|
| Renaming a column in-place | Old code crashes on read; ongoing sessions break | Add new, deprecate old |
| Removing a Zod field "just to clean up" | Data may still be in DB; round-trip loses it | Mark optional, leave it |
| Required field added mid-flight | Existing rows fail validation on next read | Always optional first |
| Hardcoding column lists in MCP tools | New columns invisible to Claude | SELECT * (planned refactor) |
| Schema in 3 places (DB + mapper + Zod) | Easy to update only 2 | Document checklist above, follow it |
| Storing computed fields | Drift when source changes | Compute on read |
| Multiple tables for similar things | Premature normalization | Wait until you actually feel pain |

## Quarterly review

Once a quarter, audit:
- What's in `metadata` across all tables? (`SELECT id, metadata FROM deals WHERE metadata != '{}'`)
- Should anything be promoted to a column?
- Anything you stopped using? (Don't delete, just stop writing to it; it'll fade.)
- Any pre-existing lint errors worth fixing in a batch?
