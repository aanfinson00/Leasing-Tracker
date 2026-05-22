---
name: scenario-drift-watcher
description: Compare saved underwriting scenarios against the current state of their parent deal and flag scenarios where the cached results no longer reflect the deal's real inputs (deal targets moved, term changed, TI revised, etc.). Use when the user asks "any stale scenarios?", "scenarios out of sync", "underwrite drift", or as part of a portfolio health pulse.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
---

# /scenario-drift-watcher — Underwriting drift detector

Saved scenarios in `scenarios` snapshot `inputs` + `globals` + `results`
at the moment they were saved. The parent `deal` row can drift later
(target rent revised, term changed, TI bumped). This skill identifies
scenarios that no longer match their deal's current targets and
suggests refresh actions.

---

## How to run

### 1. Pull deals + their newest scenario

```sql
select
  d.id as deal_id,
  d.deal_name,
  d.prospect_tenant,
  d.status,
  d.target_rent,
  d.proposed_term_months,
  d.free_rent_months,
  d.ti_per_sf,
  d.max_sf,
  d.min_sf,
  s.id as scenario_id,
  s.name as scenario_name,
  s.inputs,
  s.updated_at as scenario_updated_at
from deals d
join lateral (
  select id, name, inputs, updated_at
  from scenarios
  where deal_id = d.id::text
  order by updated_at desc
  limit 1
) s on true
where d.status not in ('Executed', 'Lost', 'On Hold');
```

(If `join lateral` is unsupported by the SQL surface, fall back to a
separate per-deal query or a subquery — but lateral is supported on
Postgres and Supabase exposes it.)

### 2. Compare deal vs scenario

For each row, parse `inputs` (jsonb) and compare these fields:

| Deal field | Scenario field | Drift threshold |
| --- | --- | --- |
| `target_rent` | `inputs.baseRatePSF` | absolute diff > $0.25/SF |
| `proposed_term_months` | `inputs.leaseTermMonths` | not equal |
| `free_rent_months` | `inputs.freeRentMonths` | absolute diff > 1 month |
| `ti_per_sf` | `inputs.tiAllowancePSF` | absolute diff > $1/SF |
| `max_sf` (or `min_sf` if null) | `inputs.proposedLeaseSF` | absolute diff > 5% |

A scenario "drifts" if ≥1 field exceeds threshold.

### 3. Severity

Map drift count → severity:

- 1 field drift → 🟡 minor
- 2-3 fields drift → 🟠 moderate
- 4+ fields drift → 🔴 major

Special case: if the scenario hasn't been updated in >60 days AND any
drift exists, bump severity by one level.

### 4. Format the report

```
## 🔴 Major drift — refresh before sharing

| Deal | Scenario | Last Saved | Drift |
| --- | --- | --- | --- |
| Norfolk-04 — Acme | UW v1 | 89 days ago | rent $7.25 → $7.75 (+$0.50), term 60 → 72, TI $5 → $10 |

## 🟠 Moderate drift

| ... |
```

Skip the report entirely if nothing drifts — say:
*"All open scenarios in sync with their deals — last check {today}."*

### 5. Suggested refresh actions

For each drifted scenario, append a one-liner:
*"To refresh: open Underwrite tab → pick {deal_name} → duplicate `UW
v1` to `UW v2` and update the differing fields. Or run
`/prospect-intake` to update the deal back to match."*

### 6. Don't auto-rerun

The cached `results` on each scenario is intentionally a point-in-time
snapshot. Do **not** silently rerun the math and overwrite. Drift
implies a human decision (did the deal change because the prospect
moved, or because the underwriter revised assumptions?).

---

## Edge cases

- **Deal with no scenarios.** Skip — nothing to drift.
- **Multiple active scenarios per deal (A/B).** This skill checks the
  newest only. To compare A vs B drift, use the in-app diff highlight
  in the InputsPanel.
- **Recently-edited scenario (last 24h).** Skip — likely mid-edit.
- **Field is null on the deal.** Don't flag drift if the deal hasn't
  set the field yet — the scenario simply has more info than the deal.

---

## Composes with

- `/weekly-portfolio-digest` — one of the watchers feeding the digest.
- `/stale-prospect-flagger` — sister watcher on the activity side.
