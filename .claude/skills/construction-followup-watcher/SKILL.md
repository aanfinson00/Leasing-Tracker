---
name: construction-followup-watcher
description: Scan am_pending_items for Construction Followup type items that are overdue, due this week, or stalled. Use when the user asks "what construction items are open?", "punch list status", "any construction follow-ups slipping?", "GC chase list", or as part of an Asset Management pulse.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
---

# /construction-followup-watcher — Construction punch-list watcher

Reads `am_pending_items` filtered to `item_type = 'Construction Followup'`
and reports items needing action. Covers post-delivery punch lists,
warranty work, TI completion, and deferred scope.

---

## How to run

### 1. Pull open construction items

```sql
select
  id,
  title,
  description,
  building_name,
  building_id,
  deal_name,
  owner,
  status,
  priority,
  due_date,
  completed_date,
  source,
  notes,
  created_at,
  updated_at
from am_pending_items
where item_type = 'Construction Followup'
  and status in ('Open', 'In Progress', 'Waiting')
order by due_date asc nulls last;
```

### 2. Bucket the items

| Bucket | Rule |
| --- | --- |
| 🚨 **Overdue** | `due_date < today` |
| 🔴 **Due this week** | `due_date <= today + 7 days` |
| 🟠 **Due this month** | `due_date <= today + 30 days` |
| 🚩 **Stalled** | `status = 'Waiting'` for >14 days OR `updated_at` >30 days ago |
| ⚠️ **No due date** | `due_date is null` AND priority High |
| ✅ **On track** | None of the above |

Skip "On track" unless `--show-all`. Within each bucket, sort by:
1. Priority (High → Medium → Low)
2. Days overdue / until due (most urgent first)
3. Building name

### 3. Format the report

```
## 🚨 Overdue — chase the GC today

| Item | Building | Owner | Due | Days | Source |
| --- | --- | --- | --- | --- | --- |
| Replace damaged dock seal #4 | Norfolk Bldg 4 | GC | 2026-05-15 | 7d ago | Punch list 2026-04 |
| ... |

## 🔴 Due this week

...

## 🚩 Stalled — waiting on GC for {n} days

...

## ⚠️ No due date set (high priority)

...
```

End with a one-line summary:
> Construction open: **{N}** items across **{M}** buildings. **{overdue}** overdue, **{this_week}** due this week. Top building by item count: **{building}** ({n} items).

### 4. Per-building rollup (optional)

If the user passes `--by-building`, group by `building_name` instead of
by bucket. Each building gets a sub-section showing all its open items
sorted by due date.

### 5. Don't write back

Read-only. To clear an item, the user opens it in the Asset Management
tab and updates status to Done (or runs `/am-item-update`, future
skill).

---

## Edge cases

- **Items with no `due_date`.** Surface only if priority=High (or
  `--show-all` is passed). Otherwise skip — low/medium-priority items
  without a date are someone's "eventually" list.
- **Items linked to a Development Project that's still in
  Construction phase.** Note that — they're expected punch list,
  not negligence.
- **Items linked to a deleted building.** `building_id` will still
  match but the building name in the row should be preserved.
  Flag with: *"⚠️ Linked building was removed from the system."*
- **Past completed_date.** Filter out — those are done even if status
  wasn't updated. Suggest the user fix the status.

---

## Composes with

- `/weekly-portfolio-digest` — add construction followup to the
  Monday brief once items accumulate.
- `/lease-expiration-watcher` — separate but related (also AM-side).
- `/property-tax-appeal-watcher` — separate but same shape.

---

## Future composition

When the user wires per-building monitoring (HVAC, roof, sprinkler
intervals — see `Building Monitoring` item_type), a sister watcher
should follow this same shape. The "due_date" field generalizes
cleanly to any maintenance interval.
