---
name: property-tax-appeal-watcher
description: Scan property_tax_appeals for items with upcoming hearings, stale "Considering" status, or missing valuation data. Use when the user asks "what tax appeals are coming up?", "tax hearing schedule", "any appeals slipping?", or as part of an Asset Management pulse.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
---

# /property-tax-appeal-watcher — Appeals pulse

Three things to surface from `property_tax_appeals`:

1. **Upcoming hearings** — anything with `hearing_date` in the next 60
   days
2. **Stalled "Considering"** — appeals in `Considering` status for >30
   days with no movement (decision deadline likely approaching by
   jurisdiction)
3. **Missing data** — open appeals (status in
   `Considering | Filed | Under Review | Hearing Scheduled`) that are
   missing `proposedValue`, `parcelNumber`, or `marketValue`

---

## How to run

### 1. Pull open appeals

```sql
select
  id,
  building,
  building_id,
  parcel_number,
  jurisdiction,
  tax_year,
  assessed_value,
  proposed_value,
  market_value,
  status,
  filed_date,
  hearing_date,
  resolution_date,
  consultant_name,
  consultant_fee_pct,
  notes,
  created_at,
  updated_at
from property_tax_appeals
where status in ('Considering', 'Filed', 'Under Review', 'Hearing Scheduled')
order by hearing_date asc nulls last;
```

### 2. Bucket the rows

For each row classify into ONE of these (priority order — first match
wins):

| Bucket | Rule |
| --- | --- |
| 🔴 **Hearing this week** | `hearing_date` ≤ today + 7 days |
| 🟠 **Hearing this month** | `hearing_date` ≤ today + 30 days |
| 🟡 **Hearing in 30-60 days** | `hearing_date` ≤ today + 60 days |
| 🚩 **Stalled "Considering"** | `status = 'Considering'` AND `updated_at` > 30 days ago |
| ⚠️ **Missing valuation data** | `proposed_value` null OR `market_value` null OR `parcel_number` null |
| ✅ **On track** | None of the above |

Skip the "On track" bucket in the report unless the user passes
`--show-all`.

### 3. Estimated savings preview

For rows with both `assessed_value` and `proposed_value`, compute a
rough savings preview:

```
delta = assessed_value - proposed_value
implied_savings_at_2pct = delta * 0.02   # placeholder; user can pass --mill-rate
```

Don't write this back to the DB — show it in the report column.
**Caveat**: 2% is a placeholder mill rate. If `jurisdiction` matches a
known one (when we have a table for that, future), use the real rate.
Note the assumption in the report header.

### 4. Format the report

```
## 🔴 Hearing this week

| Property | Year | Jurisdiction | Hearing | Proposed Δ | Est. Savings (@2%) |
| --- | --- | --- | --- | --- | --- |
| Norfolk Bldg 4 | 2026 | Norfolk County | Thu 5/29 | -$4.3M | ~$86k |

## 🟠 Hearing this month
...

## 🚩 Stalled "Considering" — chase a decision

| Property | Year | Days Idle | Filing Deadline (best guess) | Note |
...

## ⚠️ Missing data — fill before hearing

| Property | Year | Missing |
...
```

End with a one-line summary:
> Open appeals: **{count}**, est. portfolio savings if all granted at
> proposed: **${total_estimated_savings}**.

### 5. Don't write back

Read-only. To clear a flagged item, point the user at:
- Hearing details → run `/property-tax-appeal-intake` to update the
  existing record (or do it via the UI when it lands)
- Missing data → suggest specific fields they need to capture

---

## Edge cases

- **Past hearing date but status still "Hearing Scheduled".** Flag
  with 🚨 "Resolve status — hearing was {date}, what happened?"
- **`Settled` rows with no `finalAssessedValue`.** Worth nagging —
  add to ⚠️ missing-data bucket.
- **Appeals for past tax years still open.** Flag the tax year next to
  the property name so it's obvious.

---

## Composes with

- `/weekly-portfolio-digest` — appeals row can be added to the digest.
- `/property-tax-appeal-intake` — the natural follow-up.
